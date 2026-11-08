/**
 * Cambridge Maths with Zuva (Stages 1–6).
 *
 *   GET  /course                 stages and units (public)
 *   GET  /me, PUT /me            the learner's stage, age and Portuguese help
 *   GET  /unit/:id               the games for a unit (?round=N for fresh practice); 402 for Plus units
 *   POST /attempts               answers and engagement → the shared learner model (course = maths)
 *   POST /gloss                  Portuguese for a question or instruction, found by position (cached)
 */
import { z } from 'zod';
import { createRouter, body, requireUser, clientKey } from '../app';
import { MATHS_KINDS, MATHS_STAGES, MATHS_UNITS, MATHS_KIND_INFO, STRAND_NAMES, buildMathsUnit, mathsUnit, mathsUnitOpen, type MathsActivity, type MathsUnit } from '@shared/maths';
import { badRequest, notFound, upgradeRequired } from '../lib/errors';
import { hit } from '../lib/ratelimit';
import { nowIso } from '../lib/db';
import { patterns, recordAttempts, recordEngagement } from '../esl/model';
import { gloss } from '../esl/gloss';
import { hasPro } from './esl';
import { loadMathsLearner, MATHS_NAMES } from '../maths/context';

const maths = createRouter();
const unitId = z.string().regex(/^s[1-6]-[a-z0-9]+$/);
const support = z.enum(['off', 'pt-MZ']);

maths.get('/course', (c) => {
  c.header('cache-control', 'public, max-age=300');
  return c.json({
    stages: MATHS_STAGES,
    strands: STRAND_NAMES,
    units: MATHS_UNITS.map((u) => ({ id: u.id, stage: u.stage, order: u.order, strand: u.strand, title: u.title, pt: u.pt, objectives: u.objectives, words: u.words, games: u.games.map((g) => ({ kind: g.kind, title: MATHS_KIND_INFO[g.kind].title })), free: mathsUnitOpen(u, false) })),
  });
});

maths.get('/me', async (c) => {
  const user = requireUser(c);
  const db = c.env.DB;
  const [settings, progress, p] = await Promise.all([
    loadMathsLearner(db, user.id),
    db.prepare('SELECT unit_id, done, stars, completed_at FROM maths_progress WHERE user_id = ?').bind(user.id).all<{ unit_id: string; done: string; stars: number; completed_at: string | null }>(),
    patterns(db, user.id, 'maths', MATHS_NAMES),
  ]);
  return c.json({ settings, progress: progress.results.map((r) => ({ unitId: r.unit_id, done: JSON.parse(r.done) as string[], stars: r.stars, completed: !!r.completed_at })), patterns: p });
});

maths.put('/me', async (c) => {
  const user = requireUser(c);
  const s = await body(c, z.object({ stage: z.number().int().min(1).max(6), age: z.number().int().min(3).max(99).nullable().optional(), support: support.optional(), voice: z.boolean().optional() }));
  await c.env.DB.prepare(`INSERT INTO maths_learners (user_id, stage, age, support, voice) VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET stage = excluded.stage, age = COALESCE(excluded.age, age), support = COALESCE(?, support), voice = COALESCE(?, voice), updated_at = ?`)
    .bind(user.id, s.stage, s.age ?? null, s.support ?? 'off', s.voice === false ? 0 : 1, s.support ?? null, s.voice === undefined ? null : s.voice ? 1 : 0, nowIso()).run();
  return c.json({ settings: await loadMathsLearner(c.env.DB, user.id) });
});

function openUnit(u: MathsUnit | undefined, user: Parameters<typeof hasPro>[0]): MathsUnit {
  if (!u) throw notFound('No such unit.');
  if (!mathsUnitOpen(u, hasPro(user))) throw upgradeRequired(user ? 'This unit is part of Plus. Start your free 7-day trial or upgrade to keep learning with Zuva.' : 'This unit is part of Plus. Make a free account to start your free trial.');
  return u;
}
const roundOf = (activityId: string) => Number(/-r(\d+)$/.exec(activityId)?.[1] ?? 0);
/** The real activity behind an id (course set or a practice round); null when it doesn't exist. */
const activityFor = (u: MathsUnit, activityId: string): MathsActivity | null => buildMathsUnit(u, roundOf(activityId)).find((a) => a.id === activityId) ?? null;

maths.get('/unit/:id', async (c) => {
  const u = openUnit(mathsUnit(c.req.param('id')), c.get('user'));
  const round = Math.min(Math.max(0, Number(c.req.query('round')) || 0), 9999);
  const user = c.get('user');
  const row = user ? await c.env.DB.prepare('SELECT done, stars FROM maths_progress WHERE user_id = ? AND unit_id = ?').bind(user.id, u.id).first<{ done: string; stars: number }>() : null;
  return c.json({ unit: { id: u.id, stage: u.stage, strand: u.strand, title: u.title, pt: u.pt, objectives: u.objectives, words: u.words }, round, activities: buildMathsUnit(u, round), done: row ? JSON.parse(row.done) as string[] : [], stars: row?.stars ?? 0 });
});

const attemptsSchema = z.object({
  unitId,
  attempts: z.array(z.object({
    activityId: z.string().min(1).max(80), item: z.string().trim().min(1).max(200), correct: z.boolean(),
    ms: z.number().int().min(0).max(600_000).nullable().optional(), tries: z.number().int().min(1).max(20).optional(), hints: z.number().int().min(0).max(20).optional(),
    support: z.boolean().optional(), input: z.enum(['tap', 'type', 'voice']).optional(),
  })).max(60).default([]),
  events: z.array(z.object({ kind: z.enum(MATHS_KINDS), event: z.enum(['start', 'finish', 'replay', 'quit', 'like', 'dislike']), ms: z.number().int().min(0).max(3_600_000).optional() })).max(20).default([]),
  completed: z.object({ activityId: z.string().max(80), stars: z.number().int().min(0).max(3) }).optional(),
});

maths.post('/attempts', async (c) => {
  const user = requireUser(c);
  const b = await body(c, attemptsSchema);
  const u = openUnit(mathsUnit(b.unitId), user);
  await hit(c.env.DB, `maths:att:${user.id}`, 600, 3600, 'Slow down a little!');
  const db = c.env.DB;
  const list = [];
  let ignored = 0;
  for (const a of b.attempts) {
    const act = activityFor(u, a.activityId);
    if (!act) { ignored++; continue; }
    list.push({ week: u.stage, band: u.id, activityId: act.id, kind: act.kind as never, skill: act.skill, item: a.item, correct: a.correct, ms: a.ms ?? null, tries: a.tries, hints: a.hints, input: a.input ?? 'tap', support: a.support });
  }
  if (list.length) await recordAttempts(db, user.id, null, list, 'maths');
  for (const e of b.events) await recordEngagement(db, user.id, e.kind, e.event, e.ms ?? 0, 'maths');
  let unitDone = false;
  if (b.completed && activityFor(u, b.completed.activityId)) {
    const row = await db.prepare('SELECT done, stars FROM maths_progress WHERE user_id = ? AND unit_id = ?').bind(user.id, u.id).first<{ done: string; stars: number }>();
    const done = new Set(row ? (JSON.parse(row.done) as string[]) : []);
    const isNew = !done.has(b.completed.activityId);
    done.add(b.completed.activityId);
    const core = buildMathsUnit(u, 0).map((a) => a.id);
    unitDone = core.every((id) => done.has(id));
    await db.prepare(`INSERT INTO maths_progress (user_id, unit_id, done, stars, completed_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id, unit_id) DO UPDATE SET done = excluded.done, stars = stars + ?, completed_at = COALESCE(completed_at, excluded.completed_at), updated_at = excluded.updated_at`)
      .bind(user.id, u.id, JSON.stringify([...done]), isNew ? b.completed.stars : 0, unitDone ? nowIso() : null, nowIso(), isNew ? b.completed.stars : 0).run();
  }
  return c.json({ recorded: list.length, ignored, unitDone });
});

maths.post('/gloss', async (c) => {
  const g = await body(c, z.object({ unitId, activityId: z.string().min(1).max(80), field: z.enum(['intro', 'item', 'prompt']), index: z.number().int().min(0).max(40).default(0) }));
  const user = c.get('user');
  await hit(c.env.DB, `maths:gloss:${user?.id ?? clientKey(c)}`, user ? 600 : 120, 3600, 'Slow down a little!');
  const u = openUnit(mathsUnit(g.unitId), user);
  const a = activityFor(u, g.activityId);
  if (!a) throw notFound('No such game.');
  const items = 'items' in a ? (a.items as { q?: string }[]) : [];
  const english = g.field === 'intro' ? a.intro : g.field === 'prompt' && a.kind === 'convince' ? a.prompt : items[g.index]?.q;
  if (!english) throw badRequest('Nothing there to translate.');
  const out = await gloss(c.env, english);
  c.header('cache-control', 'private, max-age=86400');
  return c.json({ en: english, ...out, reviewed: false });
});

export default maths;
