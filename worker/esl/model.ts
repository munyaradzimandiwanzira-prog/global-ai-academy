/**
 * Zuva's learner model for English. Every answer updates three things:
 *
 *   skills      a mastery estimate per skill (speaking, listening, phonics, spelling, grammar,
 *               reading, writing, per week). A simple knowledge-tracing update: move towards 1 on a
 *               clean correct answer, less with hints or retries, towards 0 on a miss.
 *   items       spaced review per word or sentence (Leitner boxes: review again in 0, 1, 3, 7, 16
 *               or 35 days), so Zuva knows which words are due today.
 *   engagement  per game kind: started, finished, replayed, quit, liked; and time spent.
 *
 * From these, `patterns` derives what a teacher (and Zuva) want to know: what the learner
 * struggles with, what takes them long and what is quick, what they enjoy, and what is due.
 */
import { ACTIVITY_INFO, ESL_WEEKS, type ActivityKind, type Patterns } from '@shared/esl';

export type { Patterns };
import { nowIso } from '../lib/db';

export const BOX_DAYS = [0, 1, 3, 7, 16, 35];
const DAY = 86_400_000;

export interface AttemptInput {
  week: number;
  band: string;
  activityId: string;
  kind: ActivityKind;
  skill: string;
  item: string;
  correct: boolean;
  score?: number | null;
  ms?: number | null;
  tries?: number;
  hints?: number;
  input?: 'voice' | 'tap' | 'type' | 'grown-up';
  heard?: string | null;
}

/** How much one answer is worth as evidence of mastery (0–1). */
export function evidence(a: Pick<AttemptInput, 'correct' | 'tries' | 'hints' | 'score'>): number {
  if (!a.correct) return 0;
  const tries = Math.max(1, a.tries ?? 1), hints = Math.max(0, a.hints ?? 0);
  const base = typeof a.score === 'number' ? Math.max(0.5, Math.min(1, a.score)) : 1;
  return Math.max(0.35, base - 0.2 * (tries - 1) - 0.15 * hints);
}

/** New mastery after one answer: big steps early, smaller as evidence builds up. */
export function nextMastery(mastery: number, attempts: number, e: number): number {
  const rate = Math.max(0.08, 0.35 / Math.sqrt(attempts + 1));
  return Math.round(Math.min(1, Math.max(0, mastery + rate * (e - mastery))) * 1000) / 1000;
}

/** Leitner step: a clean correct answer moves the item up a box; a miss sends it back to box 0. */
export function nextBox(box: number, e: number): number {
  if (e === 0) return 0;
  if (e < 0.6) return Math.max(1, box);
  return Math.min(BOX_DAYS.length - 1, box + 1);
}

export async function recordAttempts(db: D1Database, userId: string, sessionId: string | null, list: AttemptInput[]): Promise<void> {
  if (!list.length) return;
  const now = nowIso();
  const stmts: D1PreparedStatement[] = [];
  // Group by skill and item so several answers in one batch update in order.
  const skills = new Map<string, AttemptInput[]>();
  const items = new Map<string, AttemptInput[]>();
  for (const a of list) {
    stmts.push(db.prepare('INSERT INTO esl_attempts (user_id, session_id, week, band, activity_id, kind, skill, item, correct, score, ms, tries, hints, input, heard) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
      .bind(userId, sessionId, a.week, a.band, a.activityId, a.kind, a.skill, a.item.slice(0, 200), a.correct ? 1 : 0, a.score ?? null, a.ms ?? null, a.tries ?? 1, a.hints ?? 0, a.input ?? 'tap', a.heard?.slice(0, 120) ?? null));
    const s = skills.get(a.skill) ?? []; s.push(a); skills.set(a.skill, s);
    const k = `${a.kind}:${a.item.toLowerCase().slice(0, 120)}`; const i = items.get(k) ?? []; i.push(a); items.set(k, i);
  }
  const keys = [...skills.keys()];
  const existing = keys.length
    ? (await db.prepare(`SELECT skill, mastery, attempts, correct, avg_ms, streak FROM esl_skills WHERE user_id = ? AND skill IN (${keys.map(() => '?').join(',')})`).bind(userId, ...keys).all<{ skill: string; mastery: number; attempts: number; correct: number; avg_ms: number | null; streak: number }>()).results
    : [];
  const bySkill = new Map(existing.map((r) => [r.skill, r]));
  for (const [skill, as] of skills) {
    let s = bySkill.get(skill) ?? { skill, mastery: 0.3, attempts: 0, correct: 0, avg_ms: null, streak: 0 };
    for (const a of as) {
      const e = evidence(a);
      const ms = a.ms && a.ms > 0 && a.ms < 600_000 ? a.ms : null;
      s = {
        skill,
        mastery: nextMastery(s.mastery, s.attempts, e),
        attempts: s.attempts + 1,
        correct: s.correct + (a.correct ? 1 : 0),
        avg_ms: ms == null ? s.avg_ms : s.avg_ms == null ? ms : Math.round(s.avg_ms * 0.8 + ms * 0.2),
        streak: a.correct ? s.streak + 1 : 0,
      };
    }
    stmts.push(db.prepare(`INSERT INTO esl_skills (user_id, skill, mastery, attempts, correct, avg_ms, streak, last_at) VALUES (?,?,?,?,?,?,?,?)
      ON CONFLICT(user_id, skill) DO UPDATE SET mastery = excluded.mastery, attempts = excluded.attempts, correct = excluded.correct, avg_ms = excluded.avg_ms, streak = excluded.streak, last_at = excluded.last_at`)
      .bind(userId, skill, s.mastery, s.attempts, s.correct, s.avg_ms, s.streak, now));
  }
  const itemKeys = [...items.keys()];
  const prevItems = itemKeys.length
    ? (await db.prepare(`SELECT item, box, seen, misses FROM esl_items WHERE user_id = ? AND item IN (${itemKeys.map(() => '?').join(',')})`).bind(userId, ...itemKeys).all<{ item: string; box: number; seen: number; misses: number }>()).results
    : [];
  const byItem = new Map(prevItems.map((r) => [r.item, r]));
  for (const [key, as] of items) {
    let it = byItem.get(key) ?? { item: key, box: 0, seen: 0, misses: 0 };
    for (const a of as) { const e = evidence(a); it = { item: key, box: nextBox(it.box, e), seen: it.seen + 1, misses: it.misses + (a.correct ? 0 : 1) }; }
    const due = new Date(Date.now() + BOX_DAYS[it.box]! * DAY).toISOString();
    stmts.push(db.prepare(`INSERT INTO esl_items (user_id, item, skill, box, seen, misses, last_at, due_at) VALUES (?,?,?,?,?,?,?,?)
      ON CONFLICT(user_id, item) DO UPDATE SET box = excluded.box, seen = excluded.seen, misses = excluded.misses, last_at = excluded.last_at, due_at = excluded.due_at`)
      .bind(userId, key, as[0]!.skill, it.box, it.seen, it.misses, now, due));
  }
  await db.batch(stmts);
}

export type EngagementEvent = 'start' | 'finish' | 'replay' | 'quit' | 'like' | 'dislike';
export async function recordEngagement(db: D1Database, userId: string, kind: ActivityKind, event: EngagementEvent, ms = 0): Promise<void> {
  const col = { start: 'started', finish: 'finished', replay: 'replays', quit: 'quits', like: 'likes', dislike: 'dislikes' }[event];
  await db.prepare(`INSERT INTO esl_engagement (user_id, kind, ${col}, total_ms) VALUES (?, ?, 1, ?)
    ON CONFLICT(user_id, kind) DO UPDATE SET ${col} = ${col} + 1, total_ms = total_ms + excluded.total_ms`).bind(userId, kind, Math.max(0, Math.min(ms, 3_600_000))).run();
}

// ── Patterns ───────────────────────────────────────────────────────────────

export interface SkillRow { skill: string; mastery: number; attempts: number; correct: number; avg_ms: number | null; streak: number; last_at: string | null }
export interface EngagementRow { kind: string; started: number; finished: number; replays: number; quits: number; likes: number; dislikes: number; total_ms: number }
export interface ItemRow { item: string; skill: string; box: number; seen: number; misses: number; due_at: string | null }
export interface KindTiming { kind: string; avgMs: number; n: number }


const SKILL_NAMES: Record<string, string> = { speaking: 'speaking', listening: 'listening', phonics: 'phonics (sounds)', spelling: 'spelling', grammar: 'grammar and sentences', reading: 'reading and understanding stories', writing: 'writing' };
const titleOf = (kind: string) => ACTIVITY_INFO[kind as ActivityKind]?.title ?? kind;
const weekTitle = (skill: string) => { const n = Number(skill.split(':w')[1]); return ESL_WEEKS.find((w) => w.week === n)?.title; };
const itemLabel = (key: string) => key.split(':').slice(1).join(':');

/** Pure: turns raw learner-model rows into patterns (kept pure so it is easy to test). */
export function derivePatterns(skills: SkillRow[], engagement: EngagementRow[], items: ItemRow[], timing: KindTiming[], recent: { correct: number; at: string }[], now = Date.now()): Patterns {
  const attempts = skills.reduce((n, s) => n + s.attempts, 0);
  const correct = skills.reduce((n, s) => n + s.correct, 0);
  const week = 7 * DAY;
  const thisWeek = recent.filter((r) => now - Date.parse(r.at) < week);
  const lastWeek = recent.filter((r) => now - Date.parse(r.at) >= week && now - Date.parse(r.at) < 2 * week);
  const acc = (rs: { correct: number }[]) => (rs.length ? rs.reduce((n, r) => n + r.correct, 0) / rs.length : null);
  const a1 = acc(thisWeek), a0 = acc(lastWeek);
  const trend = a1 == null || a0 == null || thisWeek.length < 5 || lastWeek.length < 5 ? (attempts < 10 ? 'new' : 'steady') : a1 - a0 > 0.08 ? 'up' : a0 - a1 > 0.08 ? 'down' : 'steady';

  // Per area (speaking, spelling, …): attempt-weighted mastery across weeks.
  const areas = new Map<string, { m: number; n: number }>();
  for (const s of skills) { const area = s.skill.split(':')[0]!; const x = areas.get(area) ?? { m: 0, n: 0 }; x.m += s.mastery * s.attempts; x.n += s.attempts; areas.set(area, x); }
  const areaList = [...areas].filter(([, x]) => x.n > 0).map(([area, x]) => ({ area: SKILL_NAMES[area] ?? area, mastery: Math.round((x.m / x.n) * 100) / 100, attempts: x.n })).sort((a, b) => a.mastery - b.mastery);

  const struggles: Patterns['struggles'] = [];
  const strengths: Patterns['strengths'] = [];
  for (const a of areaList) {
    if (a.attempts >= 4 && a.mastery < 0.45) struggles.push({ what: a.area, why: `about ${Math.round(a.mastery * 100)}% secure after ${a.attempts} tries` });
    if (a.attempts >= 6 && a.mastery >= 0.75) strengths.push({ what: a.area, why: `about ${Math.round(a.mastery * 100)}% secure after ${a.attempts} tries` });
  }
  for (const s of skills.filter((x) => x.attempts >= 4 && x.mastery < 0.4).sort((a, b) => a.mastery - b.mastery).slice(0, 3)) {
    const t = weekTitle(s.skill);
    if (t) struggles.push({ what: `${SKILL_NAMES[s.skill.split(':')[0]!] ?? s.skill} in "${t}"`, why: `${s.correct} of ${s.attempts} right` });
  }

  // Speed: compare each game kind with this learner's own typical speed, not with other children.
  const enough = timing.filter((t) => t.n >= 4 && t.avgMs > 0);
  const median = enough.length ? [...enough].sort((a, b) => a.avgMs - b.avgMs)[Math.floor(enough.length / 2)]!.avgMs : 0;
  const slow = median ? enough.filter((t) => t.avgMs > median * 1.5).map((t) => ({ kind: t.kind, title: titleOf(t.kind), avgSeconds: Math.round(t.avgMs / 100) / 10 })) : [];
  const fast = median ? enough.filter((t) => t.avgMs < median * 0.65).map((t) => ({ kind: t.kind, title: titleOf(t.kind), avgSeconds: Math.round(t.avgMs / 100) / 10 })) : [];

  // Enjoyment: finishing, replaying and saying so count; quitting and "I don't like this" count against.
  const scored = engagement.filter((e) => e.started >= 2 || e.likes || e.dislikes).map((e) => {
    const finishRate = e.started ? e.finished / e.started : 0;
    const score = finishRate + 0.5 * (e.replays / Math.max(1, e.started)) + 0.8 * e.likes - 0.8 * e.dislikes - 0.6 * (e.quits / Math.max(1, e.started));
    return { e, score, finishRate };
  });
  const enjoys = scored.filter((x) => x.score >= 1 || x.e.likes > x.e.dislikes).sort((a, b) => b.score - a.score).slice(0, 3)
    .map(({ e, finishRate }) => ({ kind: e.kind, title: titleOf(e.kind), why: [e.likes ? `said they liked it ${e.likes}×` : '', e.replays ? `replayed ${e.replays}×` : '', `finishes ${Math.round(finishRate * 100)}%`].filter(Boolean).join(', ') }));
  const avoids = scored.filter((x) => x.score < 0.4 && x.e.started >= 3).sort((a, b) => a.score - b.score).slice(0, 2)
    .map(({ e }) => ({ kind: e.kind, title: titleOf(e.kind), why: `left ${e.quits} of ${e.started} times${e.dislikes ? `, said they didn’t like it ${e.dislikes}×` : ''}` }));

  const dueWords = items.filter((i) => i.due_at && Date.parse(i.due_at) <= now).sort((a, b) => a.box - b.box || b.misses - a.misses).slice(0, 12).map((i) => itemLabel(i.item));
  const trickyWords = items.filter((i) => i.misses >= 2 && i.misses / Math.max(1, i.seen) >= 0.4).sort((a, b) => b.misses - a.misses).slice(0, 10).map((i) => itemLabel(i.item));
  const lastActive = skills.map((s) => s.last_at).filter(Boolean).sort().pop() ?? null;
  return { overall: { attempts, accuracy: attempts ? Math.round((correct / attempts) * 100) / 100 : null, lastActive, trend }, skills: areaList, struggles: struggles.slice(0, 5), strengths: strengths.slice(0, 4), slow, fast, enjoys, avoids, dueWords, trickyWords };
}

export async function patterns(db: D1Database, userId: string): Promise<Patterns> {
  const [skills, engagement, items, timing, recent] = await Promise.all([
    db.prepare('SELECT skill, mastery, attempts, correct, avg_ms, streak, last_at FROM esl_skills WHERE user_id = ?').bind(userId).all<SkillRow>(),
    db.prepare('SELECT kind, started, finished, replays, quits, likes, dislikes, total_ms FROM esl_engagement WHERE user_id = ?').bind(userId).all<EngagementRow>(),
    db.prepare('SELECT item, skill, box, seen, misses, due_at FROM esl_items WHERE user_id = ? ORDER BY due_at LIMIT 400').bind(userId).all<ItemRow>(),
    db.prepare(`SELECT kind, AVG(ms) AS avgMs, COUNT(*) AS n FROM (SELECT kind, ms FROM esl_attempts WHERE user_id = ? AND ms IS NOT NULL AND ms BETWEEN 300 AND 600000 ORDER BY id DESC LIMIT 600) GROUP BY kind`).bind(userId).all<KindTiming>(),
    db.prepare('SELECT correct, created_at AS at FROM esl_attempts WHERE user_id = ? AND created_at > ? ORDER BY id DESC LIMIT 800').bind(userId, new Date(Date.now() - 14 * DAY).toISOString()).all<{ correct: number; at: string }>(),
  ]);
  return derivePatterns(skills.results, engagement.results, items.results, timing.results, recent.results);
}

/** The game kinds that train a skill area. */
const TRAINS: Record<string, ActivityKind[]> = {
  speaking: ['say', 'echo', 'talk'], listening: ['pick', 'story'], phonics: ['sound', 'rhyme'], spelling: ['spell'],
  grammar: ['order', 'gap'], reading: ['story'], writing: ['write'],
};

/**
 * What to play next: work on the weakest area, in a game kind the learner enjoys if one trains it,
 * and bring back words that are due for review.
 */
export function recommend(p: Patterns, available: ActivityKind[]): { kind: ActivityKind; reason: string; reviewWords: string[] } | null {
  if (!available.length) return null;
  const weakest = p.skills.find((s) => s.attempts >= 3 && s.mastery < 0.6);
  const area = weakest ? Object.keys(SKILL_NAMES).find((k) => SKILL_NAMES[k] === weakest.area) : undefined;
  const options = (area ? TRAINS[area] ?? [] : []).filter((k) => available.includes(k));
  const liked = p.enjoys.map((e) => e.kind as ActivityKind).filter((k) => available.includes(k));
  const kind = options.find((k) => liked.includes(k)) ?? options[0] ?? liked[0] ?? available[0]!;
  const reason = weakest ? `practise ${weakest.area}${liked.includes(kind) ? ' in a game they enjoy' : ''}` : liked.includes(kind) ? 'a favourite game' : 'the next game in the unit';
  return { kind, reason, reviewWords: p.dueWords.slice(0, 6) };
}
