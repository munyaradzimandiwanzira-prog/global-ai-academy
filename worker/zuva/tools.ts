/**
 * Zuva's tools. Each tool declares who may use it (kids/learner, signed-in only), validates its own
 * arguments, runs scoped to the current learner, and may emit UI events (buttons, cards).
 *
 * Knowledge tools go through the Academy MCP server (callAcademyTool); personal tools read and
 * write this learner's own data directly, always filtered by their user id.
 */
import type { ToolSpec } from '../lib/openai';
import type { UserRow } from '../lib/db';
import { getTrack } from '../lib/catalog';
import { isSafeZuvaPath, MEMORY_KINDS, type MemoryKind, type ZuvaActivity, type ZuvaEvent, type ZuvaMode } from '@shared/zuva';
import { KID_GAMES, kidGame } from '@shared/kids-games';
import type { LearnerContext } from './profile';
import { callAcademyTool } from './mcp';
import { forgetMatching, writeMemory } from './memory';
import { makeQuiz, planExperiment } from './subagents';
import { getExperiment, type Experiment } from './experiments';

export interface ToolCtx {
  env: Env;
  user: UserRow | null;
  learner: LearnerContext | null;
  mode: ZuvaMode;
  activity?: ZuvaActivity;
  memoryEnabled: boolean;
  emit: (e: ZuvaEvent) => void;
}

interface ZuvaTool {
  spec: ToolSpec;
  /** Status line shown while the tool runs. */
  label: string;
  modes: ZuvaMode[];
  signedIn?: boolean;
  needsMemory?: boolean;
  run: (ctx: ToolCtx, args: Record<string, unknown>) => Promise<string>;
}

const str = (v: unknown, max = 300) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const obj = (properties: Record<string, unknown>, required: string[] = []) => ({ type: 'object', properties, required, additionalProperties: false });

function pageExists(path: string): boolean {
  const [, a, b, c] = path.split('/');
  if (a === 'kids') return !b || !!kidGame(b);
  if (a === 'learn') {
    const t = getTrack(b ?? '');
    return !!t && (!c || t.lessons.some((l) => l.slug === c));
  }
  return true;
}

const TOOLS: ZuvaTool[] = [
  {
    label: 'Looking at your progress',
    modes: ['kids', 'learner'],
    signedIn: true,
    spec: { name: 'get_my_progress', description: 'Get this learner’s progress: Kids Zone stars per game, recent courses with lessons done, streak, goals and recent struggles.', parameters: obj({}) },
    run: async ({ learner }) => {
      if (!learner) return 'Not signed in.';
      const games = Object.entries(learner.kidsGames).map(([id, stars]) => `${kidGame(id)?.title ?? id}: ${stars}/${(kidGame(id)?.levels ?? 3) * 3} stars`);
      return JSON.stringify({ name: learner.firstName, streak: learner.streak, xp: learner.xp, kidsGames: games, courses: learner.tracks, lastLesson: learner.lastLesson, goals: learner.goals, struggles: learner.struggles });
    },
  },
  {
    label: 'Choosing what to try next',
    modes: ['kids', 'learner'],
    spec: { name: 'recommend_next', description: 'Suggest what to do next: games or lessons that fit the learner’s progress and interests. Optionally focus on a topic.', parameters: obj({ topic: { type: 'string', description: 'Optional topic, e.g. "robots" or "web"' } }) },
    run: async ({ learner, mode }, args) => {
      const topic = str(args.topic, 60).toLowerCase();
      if (mode === 'kids') {
        const interests = (learner?.profile.interests ?? []).join(' ').toLowerCase();
        const ranked = KID_GAMES.map((g) => {
          const stars = learner?.kidsGames[g.id] ?? 0;
          const room = g.levels * 3 - stars;
          const match = (topic && g.topics.some((t) => topic.includes(t) || t.includes(topic)) ? 5 : 0) + (g.topics.some((t) => interests.includes(t)) ? 2 : 0);
          return { g, score: match + (room > 0 ? 1 : -5) + (stars > 0 && room > 0 ? 1 : 0), stars };
        }).sort((a, b) => b.score - a.score).slice(0, 3);
        return JSON.stringify(ranked.map(({ g, stars }) => ({ game: g.title, path: `/kids/${g.id}`, skill: g.skill, starsSoFar: stars, maxStars: g.levels * 3 })));
      }
      if (topic) return callAcademyTool('search_lessons', { query: topic, limit: 4 }).text;
      const t = learner?.tracks[0];
      if (!t) return 'No course started yet. Suggest the Start here track (/learn/start-here) or ask what they want to build.';
      const track = getTrack(t.id)!;
      const next = track.lessons[Math.min(t.done, track.lessons.length - 1)]!;
      return JSON.stringify({ course: track.title, done: t.done, total: t.total, suggestedLesson: next.title, path: `/learn/${track.id}/${next.slug}` });
    },
  },
  {
    label: 'Getting a button ready',
    modes: ['kids', 'learner'],
    spec: { name: 'open_page', description: 'Show the learner a button that opens a page in the Academy (a Kids Zone game like /kids/bridge, a lesson like /learn/python/lists, /tutorials, /playground). They choose whether to tap it.', parameters: obj({ path: { type: 'string' }, label: { type: 'string', description: 'Short button text, e.g. "Play Bridge Builder"' } }, ['path', 'label']) },
    run: async ({ emit }, args) => {
      const path = str(args.path, 120);
      if (!isSafeZuvaPath(path) || !pageExists(path)) return `Cannot open "${path}": not a known Academy page. Use search_lessons or list_kids_games to find real paths.`;
      emit({ t: 'action', action: { kind: 'open', to: path, label: str(args.label, 40) || 'Open' } });
      return 'Button shown to the learner.';
    },
  },
  {
    label: 'Searching the lessons',
    modes: ['kids', 'learner'],
    spec: { name: 'search_lessons', description: 'Search Academy lessons by topic. Returns titles and paths.', parameters: obj({ query: { type: 'string' } }, ['query']) },
    run: async (_c, args) => callAcademyTool('search_lessons', { query: str(args.query, 120), limit: 5 }).text,
  },
  {
    label: 'Looking through the games',
    modes: ['kids', 'learner'],
    spec: { name: 'list_kids_games', description: 'List Kids Zone games and what they teach, optionally by topic.', parameters: obj({ topic: { type: 'string' } }) },
    run: async (_c, args) => callAcademyTool('list_kids_games', { topic: str(args.topic, 60) }).text,
  },
  {
    label: 'Finding the next clue',
    modes: ['kids'],
    spec: { name: 'give_hint', description: 'Get the next scripted hint for the game level the child is playing right now (gentlest first). Use before writing your own hint.', parameters: obj({}) },
    run: async ({ activity }) => {
      if (!activity?.game) return 'The child is not in a game right now.';
      const hints = activity.hints ?? [];
      if (!hints.length) return `No scripted hints for ${activity.game}. Ask a guiding question about: ${activity.goal ?? 'the level'}.`;
      const i = Math.min(activity.hintsShown ?? 0, hints.length - 1);
      return JSON.stringify({ game: kidGame(activity.game)?.title ?? activity.game, level: activity.level, goal: activity.goal, hint: hints[i], hintNumber: i + 1, of: hints.length, lastTry: activity.lastDetail });
    },
  },
  {
    label: 'Planning your experiment',
    modes: ['kids', 'learner'],
    spec: {
      name: 'plan_experiment',
      description: 'Plan a safe hands-on experiment or build (circuits, rockets, bridges, robots, solar, sound, magnets, plants…). Shows a card with a materials shopping list (where to find each item, rough cost, cheaper swaps), safety rules and steps. Use when the learner wants to make or test something in real life.',
      parameters: obj({ request: { type: 'string', description: 'What they want to make or find out' }, have_at_home: { type: 'string', description: 'Optional: things they already have' } }, ['request']),
    },
    run: async ({ env, emit, learner, mode }, args) => {
      const request = str(args.request, 300);
      const found = callAcademyTool('find_experiments', { topic: request, limit: 3 });
      const ids = ((found.data as { id: string }[] | undefined) ?? []).map((x) => x.id);
      const candidates = ids.map((id) => getExperiment(id)).filter((e): e is Experiment => !!e);
      if (!candidates.length) return `No vetted experiment matches "${request}". Suggest a related safe idea from: ${found.text}. Do not invent experiments with heat, chemicals or electricity.`;
      const card = await planExperiment(env, { request, isKid: mode === 'kids' || !!learner?.isKid, haveAtHome: str(args.have_at_home, 300), candidates });
      emit({ t: 'card', card });
      const cost = card.materials.reduce((s, m) => s + (m.approxUsd ?? 0), 0);
      return `Card shown: "${card.title}". Safety: ${card.safety.level}. ${card.materials.length} materials, about $${cost.toFixed(2)} if bought new. ${card.game ? `Related game: /kids/${card.game}.` : ''} Now encourage them in one or two sentences and offer to guide them step by step.`;
    },
  },
  {
    label: 'Writing a quick quiz',
    modes: ['kids', 'learner'],
    spec: { name: 'make_quiz', description: 'Create a short interactive practice quiz (shown as a card) on a topic.', parameters: obj({ topic: { type: 'string' }, count: { type: 'integer', minimum: 1, maximum: 5 } }, ['topic']) },
    run: async ({ env, emit, mode, learner }, args) => {
      const quiz = await makeQuiz(env, { topic: str(args.topic, 200), count: Number.isInteger(args.count) ? (args.count as number) : 3, isKid: mode === 'kids', level: learner?.level ?? 'beginner' });
      if (!quiz) return 'Could not make a quiz right now. Ask one question yourself instead.';
      emit({ t: 'card', card: quiz });
      return `Quiz card shown with ${quiz.questions.length} questions. Say one short encouraging line; don't repeat the questions.`;
    },
  },
  {
    label: 'Saving that to memory',
    modes: ['kids', 'learner'],
    signedIn: true,
    needsMemory: true,
    spec: { name: 'remember', description: 'Save one lasting, learning-related fact the learner asked you to remember (an interest, goal, preference or struggle). Never personal details.', parameters: obj({ kind: { type: 'string', enum: MEMORY_KINDS }, content: { type: 'string', description: 'One short sentence, e.g. "Wants to build a weather station"' } }, ['kind', 'content']) },
    run: async ({ env, user, learner }, args) => {
      const kind = (MEMORY_KINDS.includes(args.kind as MemoryKind) ? args.kind : 'fact') as MemoryKind;
      const r = await writeMemory(env.DB, user!.id, { kind, content: str(args.content, 200), importance: 4 }, 'user', !!learner?.isKid);
      return r.ok ? 'Saved. Tell the learner they can see or delete memories in Settings.' : `Not saved (${r.reason}). Explain kindly that you only remember learning things, not personal details.`;
    },
  },
  {
    label: 'Forgetting that',
    modes: ['kids', 'learner'],
    signedIn: true,
    spec: { name: 'forget', description: 'Delete memories about something when the learner asks you to forget it.', parameters: obj({ about: { type: 'string' } }, ['about']) },
    run: async ({ env, user }, args) => {
      const n = await forgetMatching(env.DB, user!.id, str(args.about, 200));
      return n ? `Deleted ${n} memory item(s).` : 'Nothing matching was remembered.';
    },
  },
];

export function toolsFor(ctx: Pick<ToolCtx, 'mode' | 'user' | 'memoryEnabled'>): ZuvaTool[] {
  return TOOLS.filter((t) => t.modes.includes(ctx.mode) && (!t.signedIn || ctx.user) && (!t.needsMemory || ctx.memoryEnabled));
}

export async function runTool(ctx: ToolCtx, tools: ZuvaTool[], name: string, rawArgs: string): Promise<string> {
  const tool = tools.find((t) => t.spec.name === name);
  if (!tool) return `Unknown tool ${name}.`;
  let args: Record<string, unknown> = {};
  try {
    args = rawArgs ? (JSON.parse(rawArgs) as Record<string, unknown>) : {};
  } catch {
    return 'Arguments were not valid JSON.';
  }
  ctx.emit({ t: 'tool', name, label: tool.label });
  try {
    // Tool output goes back to the model as data, tagged so it is never mistaken for instructions.
    return `<tool_result>${(await tool.run(ctx, args)).slice(0, 4000)}</tool_result>`;
  } catch (e) {
    console.error('[zuva:tool]', name, e);
    return `<tool_result>The ${name} tool failed. Carry on without it.</tool_result>`;
  }
}
