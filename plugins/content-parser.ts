import { parse as parseYaml } from 'yaml';
import { parseSketch } from '../shared/sketch';
import { isLockedLesson } from '../shared/content';
import type { Block, CatalogTrack, Challenge, Lesson, QuizQuestion, RunLanguage, Track, TrackMeta } from '../shared/content';

/**
 * Track Markdown format
 * ---------------------
 *   ---               YAML front-matter → TrackMeta
 *   # Lesson title {#slug}
 *   markdown …
 *   ```python run      → runnable "Try it Yourself" example (optional title="…")
 *   ```exercise        → YAML: prompt, lang, code (with ___ blanks), answers[], hint
 *   ```challenge       → YAML: id, title, prompt, lang, starter, tests, expectedOutput, difficulty
 *   ```quiz            → YAML list: q, options[], answer (index), explain
 *   ```sketch          → YAML pencil-sketch diagram (see shared/sketch.ts)
 *   ```lang            → static code sample (no run button)
 */

const FENCE_RE = /^(`{3,})([^\n`]*)\n([\s\S]*?)\n\1[ \t]*$/gm;
const LESSON_RE = /^# (.+?)\s*\{#([a-z0-9-]+)\}\s*$/gm;
const WORDS_PER_MINUTE = 180;
/** Separator for alternative accepted answers (answers: [print, [len, size]]). */
export const ALT = '\u0001';

export class ContentError extends Error {
  constructor(file: string, message: string) {
    super(`[content] ${file}: ${message}`);
  }
}

/**
 * Authors write prose in YAML fields (questions, prompts, explanations) and constantly hit YAML's
 * "colon-space starts a mapping" rule. Quote those single-line scalars automatically.
 */
const PROSE_KEYS = ['q', 'explain', 'prompt', 'hint', 'title'];
export function quoteProse(yamlText: string): string {
  let blockIndent = -1; // indent of the key that opened a | or > block scalar
  return yamlText
    .split('\n')
    .map((line) => {
      const indent = line.length - line.trimStart().length;
      if (blockIndent >= 0) {
        if (!line.trim() || indent > blockIndent) return line; // inside a block scalar: leave untouched
        blockIndent = -1;
      }
      const m = /^(\s*(?:- )?)([a-zA-Z]+): (.+)$/.exec(line);
      if (!m) return line;
      const value = m[3]!.trim();
      if (/^[|>][-+]?$/.test(value)) {
        blockIndent = m[1]!.length;
        return line;
      }
      if (!PROSE_KEYS.includes(m[2]!) || /^["'|>[{]/.test(value)) return line;
      return `${m[1]}${m[2]}: ${JSON.stringify(value)}`;
    })
    .join('\n');
}

function splitFrontMatter(source: string, file: string): { meta: Record<string, unknown>; body: string } {
  const normalized = source.replace(/\r\n/g, '\n');
  if (!normalized.startsWith('---\n')) throw new ContentError(file, 'missing front-matter');
  const end = normalized.indexOf('\n---', 4);
  if (end === -1) throw new ContentError(file, 'unterminated front-matter');
  const meta = parseYaml(normalized.slice(4, end)) as Record<string, unknown>;
  return { meta, body: normalized.slice(end + 4).replace(/^\n+/, '') };
}

function requireString(obj: Record<string, unknown>, key: string, file: string): string {
  const v = obj[key];
  if (typeof v !== 'string' || !v.trim()) throw new ContentError(file, `"${key}" must be a non-empty string`);
  return v;
}

function parseMeta(raw: Record<string, unknown>, file: string): TrackMeta {
  return {
    id: requireString(raw, 'id', file),
    title: requireString(raw, 'title', file),
    short: (raw.short as string) ?? requireString(raw, 'title', file).toUpperCase(),
    category: requireString(raw, 'category', file) as TrackMeta['category'],
    level: (raw.level as TrackMeta['level']) ?? 'beginner',
    language: ((raw.language as RunLanguage) ?? 'text') as RunLanguage,
    color: (raw.color as string) ?? '#1f3a6b',
    icon: (raw.icon as string) ?? '📘',
    summary: requireString(raw, 'summary', file),
    tags: Array.isArray(raw.tags) ? (raw.tags as string[]) : [],
    order: typeof raw.order === 'number' ? raw.order : 100,
    premium: raw.premium === true,
    ...(typeof raw.preview === 'number' ? { preview: raw.preview } : {}),
  };
}

function estimateMinutes(blocks: Block[]): number {
  let words = 0;
  let extra = 0;
  for (const b of blocks) {
    if (b.type === 'md') words += b.md.split(/\s+/).length;
    else if (b.type === 'run' || b.type === 'code') words += b.code.split(/\s+/).length / 2;
    else if (b.type === 'exercise') extra += 1;
    else if (b.type === 'challenge') extra += 5;
    else if (b.type === 'quiz') extra += b.questions.length * 0.5;
  }
  return Math.max(2, Math.round(words / WORDS_PER_MINUTE + extra));
}

function parseBlocks(body: string, ctx: { file: string; trackId: string; lessonSlug: string; defaultLang: RunLanguage }): Block[] {
  const blocks: Block[] = [];
  let cursor = 0;
  let runCount = 0;
  let exCount = 0;
  let quizCount = 0;
  const pushMd = (md: string) => {
    const trimmed = md.trim();
    if (trimmed) blocks.push({ type: 'md', md: trimmed });
  };

  for (const m of body.matchAll(FENCE_RE)) {
    pushMd(body.slice(cursor, m.index));
    cursor = (m.index ?? 0) + m[0].length;
    const info = m[2].trim();
    const content = m[3];
    const [kind, ...rest] = info.split(/\s+/);
    const flags = rest.join(' ');
    const where = `${ctx.trackId}/${ctx.lessonSlug}`;

    try {
      if (kind === 'output') {
        // ```output directly after a runnable example = its expected output (shown when it can't run)
        const prev = blocks[blocks.length - 1];
        if (prev?.type !== 'run') throw new Error('an output block must directly follow a runnable example');
        prev.output = content.replace(/\n$/, '');
      } else if (kind === 'sketch') {
        blocks.push({ type: 'sketch', sketch: parseSketch(parseYaml(content)) });
      } else if (kind === 'exercise') {
        const y = parseYaml(quoteProse(content)) as Record<string, unknown>;
        const answers = (y.answers as unknown[] | undefined)?.map((a) => (Array.isArray(a) ? a.map(String).join(ALT) : String(a))) ?? [];
        const code = String(y.code ?? '');
        const blanks = (code.match(/___/g) ?? []).length;
        if (!answers.length || blanks !== answers.length) {
          throw new Error(`exercise needs one answer per ___ blank (blanks=${blanks}, answers=${answers.length})`);
        }
        blocks.push({
          type: 'exercise',
          id: `${ctx.trackId}:${ctx.lessonSlug}:ex${++exCount}`,
          prompt: String(y.prompt ?? 'Fill in the blanks.'),
          lang: (y.lang as RunLanguage) ?? ctx.defaultLang,
          code: code.replace(/\n$/, ''),
          answers,
          hint: y.hint ? String(y.hint) : undefined,
        });
      } else if (kind === 'challenge') {
        const y = parseYaml(quoteProse(content)) as Record<string, unknown>;
        const challenge: Challenge = {
          id: String(y.id ?? `${ctx.trackId}:${ctx.lessonSlug}:ch`),
          title: String(y.title ?? 'Coding challenge'),
          prompt: String(y.prompt ?? ''),
          lang: (y.lang as RunLanguage) ?? ctx.defaultLang,
          starter: String(y.starter ?? '').replace(/\n$/, ''),
          tests: String(y.tests ?? '').replace(/\n$/, ''),
          expectedOutput: y.expectedOutput != null ? String(y.expectedOutput).replace(/\n$/, '') : undefined,
          difficulty: (y.difficulty as Challenge['difficulty']) ?? 'easy',
        };
        if (!challenge.tests && challenge.expectedOutput == null) throw new Error('challenge needs tests or expectedOutput');
        blocks.push({ type: 'challenge', challenge });
      } else if (kind === 'quiz' || kind === 'exam') {
        const y = parseYaml(quoteProse(content)) as QuizQuestion[];
        if (!Array.isArray(y) || !y.length) throw new Error('quiz must be a YAML list');
        for (const q of y) {
          if (!q.q || !Array.isArray(q.options) || typeof q.answer !== 'number' || q.answer < 0 || q.answer >= q.options.length) {
            throw new Error(`invalid quiz question: ${JSON.stringify(q).slice(0, 80)}`);
          }
          q.options = q.options.map(String);
        }
        blocks.push({
          type: 'quiz',
          id: `${ctx.trackId}:${ctx.lessonSlug}:${kind}${++quizCount}`,
          questions: y,
          ...(kind === 'exam' ? { examOnly: true } : {}),
        });
      } else if (/\brun\b/.test(flags)) {
        const title = /title="([^"]+)"/.exec(flags)?.[1];
        const output = /output="([^"]+)"/.exec(flags)?.[1];
        blocks.push({
          type: 'run',
          id: `${ctx.trackId}:${ctx.lessonSlug}:run${++runCount}`,
          lang: (kind || ctx.defaultLang) as RunLanguage,
          code: content,
          title,
          output: output?.replace(/\\n/g, '\n'),
        });
      } else {
        blocks.push({ type: 'code', lang: kind || 'text', code: content });
      }
    } catch (err) {
      throw new ContentError(ctx.file, `${where}: ${(err as Error).message}`);
    }
  }
  pushMd(body.slice(cursor));
  return blocks;
}

export function parseTrack(source: string, file = 'track.md'): Track {
  const { meta: rawMeta, body } = splitFrontMatter(source, file);
  const meta = parseMeta(rawMeta, file);
  const headings = [...body.matchAll(LESSON_RE)];
  if (!headings.length) throw new ContentError(file, 'no lessons found (expected "# Title {#slug}")');

  const seen = new Set<string>();
  const lessons: Lesson[] = headings.map((h, i) => {
    const slug = h[2];
    if (seen.has(slug)) throw new ContentError(file, `duplicate lesson slug "${slug}"`);
    seen.add(slug);
    const start = (h.index ?? 0) + h[0].length;
    const end = i + 1 < headings.length ? headings[i + 1].index : body.length;
    const blocks = parseBlocks(body.slice(start, end), { file, trackId: meta.id, lessonSlug: slug, defaultLang: meta.language });
    return { slug, title: h[1].trim(), blocks, minutes: estimateMinutes(blocks) };
  });

  return { meta, lessons };
}

export function toCatalogEntry(track: Track): CatalogTrack {
  let challengeCount = 0;
  let exerciseCount = 0;
  let quizCount = 0;
  const lessons = track.lessons.map((l, index) => {
    const hasChallenge = l.blocks.some((b) => b.type === 'challenge');
    const hasExercise = l.blocks.some((b) => b.type === 'exercise');
    challengeCount += l.blocks.filter((b) => b.type === 'challenge').length;
    exerciseCount += l.blocks.filter((b) => b.type === 'exercise').length;
    quizCount += l.blocks.filter((b) => b.type === 'quiz').reduce((n, b) => n + (b.type === 'quiz' ? b.questions.length : 0), 0);
    const challenge = l.blocks.find((b) => b.type === 'challenge');
    return {
      slug: l.slug, title: l.title, minutes: l.minutes, hasChallenge, hasExercise,
      ...(isLockedLesson(track.meta, index) ? { locked: true } : {}),
      ...(challenge && challenge.type === 'challenge' ? { challengeId: challenge.challenge.id, challengeTitle: challenge.challenge.title, difficulty: challenge.challenge.difficulty } : {}),
    };
  });
  return {
    ...track.meta,
    lessons,
    totalMinutes: lessons.reduce((n, l) => n + l.minutes, 0),
    challengeCount,
    exerciseCount,
    quizCount,
  };
}

/** First prose paragraph of a lesson, for the teaser above a paywall. */
export function teaserOf(blocks: Block[]): string {
  const md = blocks.find((b) => b.type === 'md');
  if (!md || md.type !== 'md') return '';
  const para = md.md.split(/\n\s*\n/).find((p) => !p.trim().startsWith('#') && !p.trim().startsWith('|') && !p.trim().startsWith('>')) ?? '';
  return para.length > 420 ? `${para.slice(0, 417).replace(/\s+\S*$/, '')}…` : para;
}

/** The browser copy of a track: exam answers removed, paywalled lessons reduced to a teaser. */
export function publicTrack(track: Track): Track {
  return {
    ...track,
    lessons: track.lessons.map((l, i) => {
      if (isLockedLesson(track.meta, i)) return { slug: l.slug, title: l.title, minutes: l.minutes, blocks: [], locked: true, teaser: teaserOf(l.blocks) };
      return { ...l, blocks: l.blocks.filter((b) => !(b.type === 'quiz' && b.examOnly)) };
    }),
  };
}

/** Paywalled lesson bodies, keyed "trackId/slug", for the Worker to serve to entitled users. */
export function proLessons(tracks: Track[]): Record<string, Block[]> {
  const out: Record<string, Block[]> = {};
  for (const t of tracks) {
    t.lessons.forEach((l, i) => {
      if (isLockedLesson(t.meta, i)) out[`${t.meta.id}/${l.slug}`] = l.blocks.filter((b) => !(b.type === 'quiz' && b.examOnly));
    });
  }
  return out;
}

export type ActivityKind = 'exercise' | 'challenge' | 'quiz';

/**
 * Every exercise, challenge and practice quiz that can earn XP, keyed by the id the browser reports,
 * mapped to its kind and track. Server-only: lets the Worker reject invented ids, so XP (and the
 * public leaderboard) can only grow from activities that actually exist.
 */
export function activityIds(tracks: Track[]): Record<string, { kind: ActivityKind; trackId: string }> {
  const out: Record<string, { kind: ActivityKind; trackId: string }> = {};
  for (const t of tracks) {
    const trackId = t.meta.id;
    out[`track-quiz:${trackId}`] = { kind: 'quiz', trackId };
    for (const l of t.lessons) {
      for (const b of l.blocks) {
        if (b.type === 'exercise') out[b.id] = { kind: 'exercise', trackId };
        else if (b.type === 'challenge') out[b.challenge.id] = { kind: 'challenge', trackId };
        else if (b.type === 'quiz' && !b.examOnly) out[b.id] = { kind: 'quiz', trackId };
      }
    }
  }
  return out;
}
