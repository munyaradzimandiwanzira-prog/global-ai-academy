/**
 * /api/esl — the English as a Second Language course.
 *   GET  /course                 bands and the 36 units (public)
 *   GET  /me                     my settings, progress, patterns and notes Zuva sent my teacher
 *   PUT  /me                     band, accent, age, week, voice
 *   GET  /unit/:week             the games for a week (?band=&accent=), plus games Zuva made me
 *   POST /sessions               start a sitting; POST /sessions/:id/end summarises it
 *   POST /attempts               record answers and engagement (learner model)
 *   POST /speak                  Zuva's voice for a short text (cached)
 *   GET  /image/:word            the picture card for a word (cached)
 *   POST /hear                   what the learner said, checked against the target (audio never stored)
 */
import { z } from 'zod';
import { createRouter, body, requireUser, clientKey } from '../app';
import { ACTIVITY_INFO, ACTIVITY_KINDS, ESL_BANDS, ESL_WEEKS, buildUnit, spokenMatch, type Activity, type EslBandId, type EslTier } from '@shared/esl';
import { badRequest, notFound, upgradeRequired } from '../lib/errors';
import { can } from '@shared/rbac';
import { effectivePlan, type UserRow } from '../lib/db';
import { hit } from '../lib/ratelimit';
import { nowIso } from '../lib/db';
import { eslWeekOpen } from '@shared/esl';

export const hasPro = (user: UserRow | null | undefined) => !!user && can({ role: user.role, plan: effectivePlan(user) }, 'content.pro');
import { newId } from '../lib/crypto';
import { transcribe } from '../lib/openai';
import { notify } from '../lib/teaching';
import { image, tts, COURSE_WORDS } from '../esl/media';
import { patterns, recordAttempts, recordEngagement } from '../esl/model';
import { loadEslLearner } from '../esl/context';

const esl = createRouter();
const BANDS = ESL_BANDS.map((b) => b.id) as [EslBandId, ...EslBandId[]];
const band = z.enum(BANDS);
const accent = z.enum(['gb', 'us']);
const kind = z.enum(ACTIVITY_KINDS);

esl.get('/course', (c) => {
  c.header('cache-control', 'public, max-age=300');
  return c.json({
    bands: ESL_BANDS,
    weeks: ESL_WEEKS.map((w) => ({ week: w.week, term: w.term, title: w.title, theme: w.theme, grammar: w.grammar, review: !!w.review, cover: w.words[0], words: w.words.slice(0, 4) })),
  });
});

const settingsSchema = z.object({ band, accent, age: z.number().int().min(2).max(99).nullable().optional(), week: z.number().int().min(1).max(36).optional(), voice: z.boolean().optional() });

esl.get('/me', async (c) => {
  const user = requireUser(c);
  const db = c.env.DB;
  const [settings, progress, p, notes, made] = await Promise.all([
    loadEslLearner(db, user.id),
    db.prepare('SELECT week, band, done, stars, completed_at FROM esl_progress WHERE user_id = ?').bind(user.id).all<{ week: number; band: string; done: string; stars: number; completed_at: string | null }>(),
    patterns(db, user.id),
    db.prepare('SELECT area, note, suggestion, created_at FROM esl_teacher_notes WHERE student_id = ? ORDER BY created_at DESC LIMIT 5').bind(user.id).all(),
    db.prepare('SELECT COUNT(*) AS n FROM esl_generated WHERE user_id = ?').bind(user.id).first<{ n: number }>(),
  ]);
  return c.json({
    settings,
    progress: progress.results.map((r) => ({ week: r.week, band: r.band, done: JSON.parse(r.done) as string[], stars: r.stars, completed: !!r.completed_at })),
    patterns: p,
    notesToTeacher: notes.results,
    zuvaGames: made?.n ?? 0,
  });
});

esl.put('/me', async (c) => {
  const user = requireUser(c);
  const s = await body(c, settingsSchema);
  await c.env.DB.prepare(`INSERT INTO esl_learners (user_id, band, accent, age, week, voice) VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET band = excluded.band, accent = excluded.accent, age = COALESCE(excluded.age, age), week = COALESCE(?, week), voice = COALESCE(?, voice), updated_at = ?`)
    .bind(user.id, s.band, s.accent, s.age ?? null, s.week ?? 1, s.voice === false ? 0 : 1, s.week ?? null, s.voice === undefined ? null : s.voice ? 1 : 0, nowIso()).run();
  return c.json({ settings: await loadEslLearner(c.env.DB, user.id) });
});

esl.get('/unit/:week', async (c) => {
  const week = Number(c.req.param('week'));
  if (!ESL_WEEKS.some((w) => w.week === week)) throw notFound('No such week.');
  if (!eslWeekOpen(week, hasPro(c.get('user')))) {
    throw upgradeRequired(c.get('user')
      ? 'Weeks 5 to 36 are part of Plus. Start your free 7-day trial or upgrade to keep learning with Zuva.'
      : 'Weeks 1 to 4 are free to try. Create a free account, then start your 7-day trial for the rest of the course.');
  }
  const b = band.safeParse(c.req.query('band'));
  const a = accent.safeParse(c.req.query('accent'));
  const user = c.get('user');
  const name = user?.name.split(/\s+/)[0] ?? (c.req.query('name') ?? '').replace(/[^A-Za-z' -]/g, '').slice(0, 20);
  const settings = user ? await loadEslLearner(c.env.DB, user.id) : null;
  const bandId = b.success ? b.data : settings?.band ?? 'starters';
  const acc = a.success ? a.data : settings?.accent ?? 'gb';
  const activities = buildUnit(week, bandId, acc, { name: name || undefined, age: settings?.age ?? undefined });
  let done: string[] = [];
  let zuvaGames: Activity[] = [];
  if (user) {
    const [row, made] = await Promise.all([
      c.env.DB.prepare('SELECT done FROM esl_progress WHERE user_id = ? AND week = ? AND band = ?').bind(user.id, week, bandId).first<{ done: string }>(),
      c.env.DB.prepare('SELECT spec FROM esl_generated WHERE user_id = ? AND week = ? ORDER BY created_at DESC LIMIT 8').bind(user.id, week).all<{ spec: string }>(),
    ]);
    done = row ? (JSON.parse(row.done) as string[]) : [];
    zuvaGames = made.results.map((r) => JSON.parse(r.spec) as Activity);
  }
  return c.json({ week, band: bandId, accent: acc, activities, done, zuvaGames });
});

esl.post('/sessions', async (c) => {
  const user = requireUser(c);
  const s = await body(c, z.object({ week: z.number().int().min(1).max(36), band }));
  await hit(c.env.DB, `esl:sess:${user.id}`, 60, 86_400, 'That’s a lot of sessions today.');
  const id = newId();
  await c.env.DB.prepare('INSERT INTO esl_sessions (id, user_id, week, band) VALUES (?, ?, ?, ?)').bind(id, user.id, s.week, s.band).run();
  return c.json({ id }, 201);
});

const attemptSchema = z.object({
  week: z.number().int().min(1).max(36), band, activityId: z.string().min(1).max(80), kind, item: z.string().trim().min(1).max(200),
  correct: z.boolean(), score: z.number().min(0).max(1).nullable().optional(), ms: z.number().int().min(0).max(600_000).nullable().optional(),
  tries: z.number().int().min(1).max(20).optional(), hints: z.number().int().min(0).max(20).optional(),
  input: z.enum(['voice', 'tap', 'type', 'grown-up']).optional(), heard: z.string().max(120).nullable().optional(),
});
const attemptsSchema = z.object({
  sessionId: z.string().max(40).nullable().optional(),
  attempts: z.array(attemptSchema).max(60).default([]),
  events: z.array(z.object({ kind, event: z.enum(['start', 'finish', 'replay', 'quit', 'like', 'dislike']), ms: z.number().int().min(0).max(3_600_000).optional() })).max(20).default([]),
  completed: z.object({ week: z.number().int().min(1).max(36), band, activityId: z.string().max(80), stars: z.number().int().min(0).max(3) }).optional(),
});

/**
 * An answer is only accepted for a real game: one in the course, or one Zuva made for this learner.
 * The skill it counts towards comes from the game itself, never from the browser.
 */
async function activitySkill(db: D1Database, userId: string, week: number, bandId: EslBandId, activityId: string): Promise<string | null> {
  if (activityId.startsWith('z-')) {
    const row = await db.prepare('SELECT spec FROM esl_generated WHERE id = ? AND user_id = ?').bind(activityId, userId).first<{ spec: string }>();
    return row ? (JSON.parse(row.spec) as Activity).skill : null;
  }
  return buildUnit(week, bandId, 'gb').find((a) => a.id === activityId)?.skill ?? null;
}
const knownActivity = async (db: D1Database, userId: string, week: number, bandId: EslBandId, activityId: string) => !!(await activitySkill(db, userId, week, bandId, activityId));

esl.post('/attempts', async (c) => {
  const user = requireUser(c);
  const s = await body(c, attemptsSchema);
  await hit(c.env.DB, `esl:att:${user.id}`, 600, 3600, 'Slow down a little!');
  const db = c.env.DB;
  const checked = new Map<string, string | null>();
  const valid = [];
  for (const a of s.attempts) {
    const k = `${a.week}|${a.band}|${a.activityId}`;
    if (!checked.has(k)) checked.set(k, await activitySkill(db, user.id, a.week, a.band, a.activityId));
    const skill = checked.get(k);
    if (skill && eslWeekOpen(a.week, hasPro(user))) valid.push({ ...a, skill });
  }
  let sessionId: string | null = null;
  if (s.sessionId) sessionId = (await db.prepare('SELECT id FROM esl_sessions WHERE id = ? AND user_id = ?').bind(s.sessionId, user.id).first<{ id: string }>())?.id ?? null;
  await recordAttempts(db, user.id, sessionId, valid);
  for (const e of s.events) await recordEngagement(db, user.id, e.kind, e.event, e.ms ?? 0);
  let unitComplete = false;
  if (s.completed && eslWeekOpen(s.completed.week, hasPro(user)) && (await knownActivity(db, user.id, s.completed.week, s.completed.band, s.completed.activityId))) {
    const { week, band: b, activityId, stars } = s.completed;
    const row = await db.prepare('SELECT done, stars FROM esl_progress WHERE user_id = ? AND week = ? AND band = ?').bind(user.id, week, b).first<{ done: string; stars: number }>();
    const done = new Set<string>(row ? JSON.parse(row.done) : []);
    const isCourse = !activityId.startsWith('z-');
    if (isCourse) done.add(activityId);
    const unit = buildUnit(week, b, 'gb');
    unitComplete = unit.every((a) => done.has(a.id));
    await db.prepare(`INSERT INTO esl_progress (user_id, week, band, done, stars, completed_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id, week, band) DO UPDATE SET done = excluded.done, stars = esl_progress.stars + ?, completed_at = COALESCE(esl_progress.completed_at, excluded.completed_at), updated_at = excluded.updated_at`)
      .bind(user.id, week, b, JSON.stringify([...done]), stars, unitComplete ? nowIso() : null, nowIso(), stars).run();
    if (activityId.startsWith('z-')) await db.prepare('UPDATE esl_generated SET played = played + 1 WHERE id = ? AND user_id = ?').bind(activityId, user.id).run();
    // Move the learner on to the next week once a unit is complete.
    if (unitComplete) await db.prepare('UPDATE esl_learners SET week = MAX(week, ?), updated_at = ? WHERE user_id = ?').bind(Math.min(36, week + 1), nowIso(), user.id).run();
  }
  return c.json({ recorded: valid.length, ignored: s.attempts.length - valid.length, unitComplete });
});

/** A plain summary of a sitting (episodic memory), written from the answers without an AI call. */
export function summariseSession(rows: { kind: string; item: string; correct: number; ms: number | null }[], titles: Record<string, string>): string {
  if (!rows.length) return 'Opened the unit but did not answer anything.';
  const right = rows.filter((r) => r.correct).length;
  const kinds = [...new Set(rows.map((r) => r.kind))].map((k) => titles[k] ?? k);
  const missed = [...new Set(rows.filter((r) => !r.correct).map((r) => r.item))].slice(0, 4);
  const byKind = new Map<string, number[]>();
  for (const r of rows) if (r.ms) byKind.set(r.kind, [...(byKind.get(r.kind) ?? []), r.ms]);
  const avg = [...byKind].map(([k, ms]) => [k, ms.reduce((a, b) => a + b, 0) / ms.length] as const).sort((a, b) => b[1] - a[1]);
  const slowest = avg.length > 1 ? `took longest on ${titles[avg[0]![0]] ?? avg[0]![0]}` : '';
  return [`Played ${kinds.join(', ')}.`, `${right} of ${rows.length} answers right (${Math.round((right / rows.length) * 100)}%).`, missed.length ? `Missed: ${missed.join(', ')}.` : 'No misses.', slowest ? `${slowest[0]!.toUpperCase()}${slowest.slice(1)}.` : ''].filter(Boolean).join(' ');
}

esl.post('/sessions/:id/end', async (c) => {
  const user = requireUser(c);
  const db = c.env.DB;
  const sess = await db.prepare('SELECT id, week, band FROM esl_sessions WHERE id = ? AND user_id = ?').bind(c.req.param('id'), user.id).first<{ id: string; week: number; band: EslBandId }>();
  if (!sess) throw notFound('No such session.');
  const rows = (await db.prepare('SELECT kind, item, correct, ms FROM esl_attempts WHERE session_id = ? AND user_id = ? ORDER BY id').bind(sess.id, user.id).all<{ kind: string; item: string; correct: number; ms: number | null }>()).results;
  const titles = Object.fromEntries(ACTIVITY_KINDS.map((k) => [k, ACTIVITY_INFO[k].title]));
  const summary = summariseSession(rows, titles);
  await db.prepare('UPDATE esl_sessions SET ended_at = ?, summary = ?, stats = ? WHERE id = ?').bind(nowIso(), summary, JSON.stringify({ answers: rows.length, right: rows.filter((r) => r.correct).length }), sess.id).run();
  c.executionCtx.waitUntil(weeklyTeacherNote(c.env, user.id, user.name).catch((e) => console.error('[esl:weekly]', e)));
  return c.json({ summary });
});

/**
 * Once a week, after enough practice, Zuva sends each of the learner's teachers a short note built
 * from the learner model (no AI call, so nothing invented): progress, struggles, pace and enjoyment.
 */
export async function weeklyTeacherNote(env: Env, studentId: string, studentName: string): Promise<boolean> {
  const db = env.DB;
  const last = await db.prepare("SELECT created_at FROM esl_teacher_notes WHERE student_id = ? AND source = 'weekly' ORDER BY created_at DESC LIMIT 1").bind(studentId).first<{ created_at: string }>();
  if (last && Date.now() - Date.parse(last.created_at) < 7 * 86_400_000) return false;
  const teachers = (await db.prepare('SELECT teacher_id FROM teacher_students WHERE student_id = ?').bind(studentId).all<{ teacher_id: string }>()).results.map((r) => r.teacher_id);
  if (!teachers.length) return false;
  const since = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const n = (await db.prepare('SELECT COUNT(*) AS n FROM esl_attempts WHERE user_id = ? AND created_at > ?').bind(studentId, since).first<{ n: number }>())?.n ?? 0;
  if (n < 15) return false;
  const p = await patterns(db, studentId);
  const first = studentName.split(/\s+/)[0];
  const note = [
    `${n} answers this week${p.overall.accuracy != null ? `, ${Math.round(p.overall.accuracy * 100)}% right overall` : ''}${p.overall.trend === 'up' ? ', improving' : p.overall.trend === 'down' ? ', slipping a little' : ''}.`,
    p.strengths.length ? `Strong: ${p.strengths.map((s) => s.what).join(', ')}.` : '',
    p.struggles.length ? `Finding hard: ${p.struggles.map((s) => s.what).slice(0, 3).join('; ')}.` : '',
    p.slow.length ? `Takes longer on ${p.slow.map((s) => s.title).join(', ')}.` : '',
    p.enjoys.length ? `Enjoys ${p.enjoys.map((s) => s.title).join(', ')}.` : '',
  ].filter(Boolean).join(' ');
  const suggestion = p.struggles.length
    ? `Practise ${p.struggles[0]!.what} with ${first}${p.enjoys[0] ? ` through ${p.enjoys[0].title}, which ${first} enjoys` : ''}.${p.trickyWords.length ? ` Tricky words: ${p.trickyWords.slice(0, 5).join(', ')}.` : ''}`
    : `Keep going; ${first} is ready for harder games.`;
  await db.prepare("INSERT INTO esl_teacher_notes (id, student_id, area, note, suggestion, source) VALUES (?, ?, 'progress', ?, ?, 'weekly')").bind(newId(), studentId, note.slice(0, 600), suggestion.slice(0, 400)).run();
  await notify(env, teachers, { kind: 'esl_weekly', title: `Zuva’s weekly English note: ${first}`, body: note.slice(0, 280), link: `/teach/students/${studentId}` });
  return true;
}

// ── Voice, pictures, listening ──────────────────────────────────────────────

const speakSchema = z.object({ text: z.string().trim().min(1).max(300), accent, pace: z.enum(['word', 'early', 'primary', 'secondary']) });

esl.post('/speak', async (c) => {
  const s = await body(c, speakSchema);
  const user = c.get('user');
  await hit(c.env.DB, `esl:speak:${user?.id ?? clientKey(c)}`, user ? 400 : 80, 3600, 'Zuva needs a little rest. Your device will read it instead.');
  const out = await tts(c.env, s.text, s.accent, s.pace);
  return new Response(out.bytes, { headers: { 'content-type': out.mime, 'cache-control': 'private, max-age=86400', 'x-cache': out.cached ? 'hit' : 'miss' } });
});

esl.get('/image/:word', async (c) => {
  const user = c.get('user');
  const word = decodeURIComponent(c.req.param('word')).toLowerCase();
  if (!COURSE_WORDS.has(word)) {
    if (!user) throw notFound('No picture.');
    await hit(c.env.DB, `esl:imgreq:${user.id}`, 300, 3600, 'Slow down a little!');
  } else {
    await hit(c.env.DB, `esl:imgreq:${user?.id ?? clientKey(c)}`, 600, 3600, 'Slow down a little!');
  }
  const out = await image(c.env, word, user?.id);
  // Course pictures never change once made, so browsers and Cloudflare may keep them.
  return new Response(out.bytes, { headers: { 'content-type': out.mime, 'cache-control': COURSE_WORDS.has(word) ? 'public, max-age=2592000, immutable' : 'private, max-age=86400', 'x-cache': out.cached ? 'hit' : 'miss' } });
});

const AUDIO = /^audio\/(webm|ogg|mp4|mpeg|mp3|wav|x-wav|m4a|x-m4a|aac)(;.*)?$/;

esl.post('/hear', async (c) => {
  const user = c.get('user');
  await hit(c.env.DB, `esl:hear:${user?.id ?? clientKey(c)}`, user ? 400 : 60, 3600, 'Lots of talking! Have a little rest, or tap instead.');
  const form = await c.req.formData().catch(() => null);
  const file = form?.get('audio');
  const target = String(form?.get('target') ?? '').trim().slice(0, 200);
  const tier = (['early', 'primary', 'secondary'].includes(String(form?.get('tier'))) ? String(form?.get('tier')) : 'primary') as EslTier;
  // Other words in the game help the recogniser without giving it the answer alone.
  const context = String(form?.get('context') ?? '').replace(/[^A-Za-z ,'-]/g, '').slice(0, 300);
  if (!(file instanceof File)) throw badRequest('Send the recording as "audio".');
  if (!target) throw badRequest('What should the learner say?');
  if (file.size > 1_500_000) throw badRequest('That recording is too long.');
  if (file.size < 600) throw badRequest('I didn’t hear anything. Hold the button and speak.');
  if (!AUDIO.test(file.type)) throw badRequest('Unsupported audio format.');
  const ext = file.type.includes('mp4') || file.type.includes('m4a') ? 'm4a' : file.type.includes('ogg') ? 'ogg' : file.type.includes('wav') ? 'wav' : file.type.includes('mpeg') || file.type.includes('mp3') ? 'mp3' : 'webm';
  const heard = (await transcribe(c.env, file, `speech.${ext}`, context ? `English words: ${context}.` : undefined)).slice(0, 200);
  const m = spokenMatch(target, heard, tier);
  return c.json({ heard, ...m });
});

export default esl;
