import { createRouter, body, requireUser, requirePermission } from '../app';
import { profileSchema, progressSchema, activitySchema, goalSchema, KIDS_ACTIVITY_KEY } from '@shared/schemas';
import { XP, TRIAL, PLANS } from '@shared/config';
import type { ActivityRow, Goal, ProgressRow } from '@shared/api-types';
import { audit, effectivePlan, nowIso, toPublicUser, todayUtc, type UserRow } from '../lib/db';
import { emailConfigured } from '../lib/email';
import { awardXp } from '../lib/xp';
import { badRequest, notFound, conflict, forbidden } from '../lib/errors';
import { getTrack, lessonExists, lessonMinutes } from '../lib/catalog';
import { newId } from '../lib/crypto';
import { hit } from '../lib/ratelimit';
import activityIds from 'virtual:activity-ids';

const me = createRouter();

me.get('/', async (c) => {
  const user = c.get('user');
  if (!user) return c.json({ user: null });
  const pending = await c.env.DB.prepare("SELECT 1 FROM teacher_requests WHERE user_id = ? AND status = 'pending'").bind(user.id).first();
  const setup = c.get('mfaSetupRequired');
  return c.json({ user: { ...toPublicUser(user), pendingTeacherRequest: !!pending, ...(setup ? { mfaSetupRequired: true, trialAvailable: false } : {}) } });
});

/** One free 7-day Plus trial per account (Base44 "trial" feature, without the abuse holes). */
me.post('/trial', async (c) => {
  const user = requireUser(c);
  if (user.trial_used_at) throw conflict('You have already used your free trial.');
  if (user.role !== 'student' || effectivePlan(user) !== 'free') throw badRequest('Trials are for learners on the Free plan.');
  // When email works, require a confirmed address so one person cannot farm trials with throwaway accounts.
  if (emailConfigured(c.env) && !user.email_verified_at) throw forbidden('Confirm your email first, then start your trial.');
  const expires = new Date(Date.now() + TRIAL.days * 86400_000).toISOString();
  const res = await c.env.DB.prepare("UPDATE users SET plan = ?, plan_expires_at = ?, trial_used_at = ?, updated_at = ? WHERE id = ? AND trial_used_at IS NULL")
    .bind(TRIAL.plan, expires, nowIso(), nowIso(), user.id).run();
  if (!res.meta.changes) throw conflict('You have already used your free trial.');
  await audit(c.env.DB, user.id, 'trial.start', user.id, { plan: TRIAL.plan, expires });
  const fresh = await c.env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(user.id).first<UserRow>();
  return c.json({ user: toPublicUser(fresh!), message: `Your ${PLANS[TRIAL.plan].name} trial is on until ${expires.slice(0, 10)}.` });
});

/** Upcoming and recent live classes across every class the user is in or teaches. */
me.get('/sessions', async (c) => {
  const user = requireUser(c);
  const since = new Date(Date.now() - 7 * 86400_000).toISOString();
  const rows = await c.env.DB.prepare(
    `SELECT s.id, s.classroom_id, s.title, s.starts_at, s.minutes, s.meeting_url, s.recording_url, s.summary IS NOT NULL AS has_summary, k.name AS class_name
     FROM live_sessions s JOIN classrooms k ON k.id = s.classroom_id
     WHERE s.starts_at >= ? AND (k.teacher_id = ? OR s.classroom_id IN (SELECT classroom_id FROM classroom_members WHERE user_id = ?))
     ORDER BY s.starts_at ASC LIMIT 20`,
  ).bind(since, user.id, user.id).all<{ id: string; classroom_id: string; title: string; starts_at: string; minutes: number; meeting_url: string; recording_url: string; has_summary: number; class_name: string }>();
  return c.json({
    sessions: rows.results.map((r) => ({
      id: r.id, classroomId: r.classroom_id, className: r.class_name, title: r.title, startsAt: r.starts_at, minutes: r.minutes,
      meetingUrl: r.meeting_url, recordingUrl: r.recording_url, hasSummary: !!r.has_summary,
    })),
  });
});

me.patch('/profile', async (c) => {
  const user = requireUser(c);
  const input = await body(c, profileSchema);
  await c.env.DB.prepare('UPDATE users SET name = ?, city = ?, school = ?, bio = ?, level = ?, updated_at = ? WHERE id = ?')
    .bind(input.name, input.city ?? null, input.school ?? null, input.bio ?? null, input.level, nowIso(), user.id)
    .run();
  const fresh = await c.env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(user.id).first<UserRow>();
  return c.json({ user: toPublicUser(fresh!) });
});

me.post('/teacher-request', async (c) => {
  const user = requireUser(c);
  if (user.role !== 'student') throw badRequest('You already have teaching access.');
  const { message } = await c.req.json<{ message?: string }>().catch(() => ({ message: '' }));
  const existing = await c.env.DB.prepare("SELECT 1 FROM teacher_requests WHERE user_id = ? AND status = 'pending'").bind(user.id).first();
  if (existing) throw conflict('Your request is already waiting for review.');
  await c.env.DB.prepare('INSERT INTO teacher_requests (id, user_id, message) VALUES (?, ?, ?)')
    .bind(newId(), user.id, String(message ?? '').slice(0, 1000))
    .run();
  return c.json({ ok: true }, 201);
});

// ── Progress ────────────────────────────────────────────────────────────────

me.get('/progress', async (c) => {
  const user = requireUser(c);
  const [progress, activity] = await Promise.all([
    c.env.DB.prepare('SELECT track_id, lesson_slug, status, updated_at FROM progress WHERE user_id = ?').bind(user.id).all<{ track_id: string; lesson_slug: string; status: ProgressRow['status']; updated_at: string }>(),
    c.env.DB.prepare('SELECT kind, ref_id, track_id, passed, score, attempts, updated_at FROM activity WHERE user_id = ?').bind(user.id).all<{ kind: ActivityRow['kind']; ref_id: string; track_id: string | null; passed: number; score: number | null; attempts: number; updated_at: string }>(),
  ]);
  return c.json({
    progress: progress.results.map<ProgressRow>((r) => ({ trackId: r.track_id, lessonSlug: r.lesson_slug, status: r.status, updatedAt: r.updated_at })),
    activity: activity.results.map<ActivityRow>((r) => ({ kind: r.kind, refId: r.ref_id, trackId: r.track_id, passed: !!r.passed, score: r.score, attempts: r.attempts, updatedAt: r.updated_at })),
  });
});

me.post('/progress', async (c) => {
  const user = requireUser(c);
  const input = await body(c, progressSchema);
  if (!lessonExists(input.trackId, input.lessonSlug)) throw notFound('That lesson does not exist.');
  const now = nowIso();
  // Never downgrade a completed lesson back to "started".
  await c.env.DB.prepare(
    `INSERT INTO progress (user_id, track_id, lesson_slug, status, completed_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(user_id, track_id, lesson_slug) DO UPDATE SET
       status = CASE WHEN progress.status = 'completed' THEN 'completed' ELSE excluded.status END,
       completed_at = COALESCE(progress.completed_at, excluded.completed_at),
       updated_at = excluded.updated_at`,
  )
    .bind(user.id, input.trackId, input.lessonSlug, input.status, input.status === 'completed' ? now : null, now)
    .run();
  await c.env.DB.prepare('UPDATE users SET last_lesson = ? WHERE id = ?').bind(`${input.trackId}/${input.lessonSlug}`, user.id).run();
  const xp = input.status === 'completed' ? await awardXp(c.env.DB, user.id, 'lesson', `${input.trackId}/${input.lessonSlug}`, XP.lesson) : 0;
  return c.json({ ok: true, xpAwarded: xp });
});

me.post('/activity', async (c) => {
  const user = requireUser(c);
  const input = await body(c, activitySchema);
  // XP feeds the public leaderboard, so only real activities count. Content ids come from the build;
  // Kids Zone level keys are shaped like "maze:3" and capped per day instead.
  if (input.kind === 'kids') {
    if (!KIDS_ACTIVITY_KEY.test(input.refId)) throw notFound('Unknown game level.');
    input.trackId = 'kids';
    await hit(c.env.DB, `kids-activity:${user.id}`, 60, 86400, 'That is plenty of play for today. Come back tomorrow for more stars.');
  } else {
    const known = activityIds[input.refId];
    if (!known || known.kind !== input.kind) throw notFound('Unknown activity.');
    input.trackId = known.trackId;
  }
  await hit(c.env.DB, `activity:${user.id}`, 600, 3600, 'Too many attempts this hour. Take a short break and try again.');
  await c.env.DB.prepare(
    `INSERT INTO activity (user_id, kind, ref_id, track_id, passed, score, attempts, last_code, updated_at) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)
     ON CONFLICT(user_id, kind, ref_id) DO UPDATE SET
       passed = MAX(activity.passed, excluded.passed),
       score = MAX(COALESCE(activity.score, 0), COALESCE(excluded.score, 0)),
       attempts = activity.attempts + 1,
       last_code = COALESCE(excluded.last_code, activity.last_code),
       updated_at = excluded.updated_at`,
  )
    .bind(user.id, input.kind, input.refId, input.trackId ?? null, input.passed ? 1 : 0, input.score ?? null, input.code ?? null, nowIso())
    .run();
  const xp = input.passed ? await awardXp(c.env.DB, user.id, input.kind, input.refId, XP[input.kind]) : 0;
  return c.json({ ok: true, xpAwarded: xp });
});

// ── Dashboard summary ───────────────────────────────────────────────────────

me.get('/dashboard', async (c) => {
  const user = requireUser(c);
  const weekAgo = new Date(Date.now() - 7 * 86400_000).toISOString();
  const [recent, weekXp, completedWeek, classes, certs, announcements] = await Promise.all([
    c.env.DB.prepare('SELECT track_id, lesson_slug, status, updated_at FROM progress WHERE user_id = ? ORDER BY updated_at DESC LIMIT 8').bind(user.id).all(),
    c.env.DB.prepare('SELECT COALESCE(SUM(amount),0) AS xp FROM xp_events WHERE user_id = ? AND created_at >= ?').bind(user.id, weekAgo).first<{ xp: number }>(),
    c.env.DB.prepare("SELECT date(completed_at) AS day, COUNT(*) AS n FROM progress WHERE user_id = ? AND completed_at >= ? GROUP BY day").bind(user.id, weekAgo).all<{ day: string; n: number }>(),
    c.env.DB.prepare(
      `SELECT c.id, c.name, u.name AS teacher_name,
        (SELECT COUNT(*) FROM assignments a WHERE a.classroom_id = c.id AND NOT EXISTS (SELECT 1 FROM submissions s WHERE s.assignment_id = a.id AND s.user_id = ?)) AS open_assignments
       FROM classroom_members m JOIN classrooms c ON c.id = m.classroom_id JOIN users u ON u.id = c.teacher_id
       WHERE m.user_id = ? AND c.archived_at IS NULL ORDER BY m.joined_at DESC`,
    ).bind(user.id, user.id).all(),
    c.env.DB.prepare('SELECT COUNT(*) AS n FROM certificates WHERE user_id = ?').bind(user.id).first<{ n: number }>(),
    c.env.DB.prepare(
      `SELECT a.id, a.title, a.body, a.created_at, a.classroom_id, u.name AS author_name FROM announcements a JOIN users u ON u.id = a.author_id
       WHERE a.classroom_id IS NULL OR a.classroom_id IN (SELECT classroom_id FROM classroom_members WHERE user_id = ?)
       ORDER BY a.created_at DESC LIMIT 5`,
    ).bind(user.id).all(),
  ]);
  return c.json({
    lastLesson: user.last_lesson,
    recent: recent.results,
    weekXp: weekXp?.xp ?? 0,
    week: completedWeek.results,
    classes: classes.results,
    certificateCount: certs?.n ?? 0,
    announcements: announcements.results,
  });
});

// ── Goals (Plus) ────────────────────────────────────────────────────────────

async function goalCurrent(db: D1Database, userId: string, g: { kind: Goal['kind']; track_id: string | null }): Promise<number> {
  if (g.kind === 'lessons_per_week') {
    const since = new Date(Date.now() - 7 * 86400_000).toISOString();
    const r = await db.prepare("SELECT COUNT(*) AS n FROM progress WHERE user_id = ? AND status = 'completed' AND completed_at >= ?").bind(userId, since).first<{ n: number }>();
    return r?.n ?? 0;
  }
  if (g.kind === 'finish_track' && g.track_id) {
    const r = await db.prepare("SELECT COUNT(*) AS n FROM progress WHERE user_id = ? AND track_id = ? AND status = 'completed'").bind(userId, g.track_id).first<{ n: number }>();
    return r?.n ?? 0;
  }
  const rows = await db.prepare("SELECT track_id, lesson_slug FROM progress WHERE user_id = ? AND date(completed_at) = ?").bind(userId, todayUtc()).all<{ track_id: string; lesson_slug: string }>();
  return rows.results.reduce((n, r) => n + lessonMinutes(r.track_id, r.lesson_slug), 0);
}

me.get('/goals', async (c) => {
  const user = requirePermission(c, 'goals.manage', 'Goals are part of Plus. Upgrade to set goals.');
  const rows = await c.env.DB.prepare('SELECT * FROM goals WHERE user_id = ? ORDER BY created_at DESC').bind(user.id).all<{ id: string; title: string; kind: Goal['kind']; target: number; track_id: string | null; deadline: string | null; created_at: string; completed_at: string | null }>();
  const goals: Goal[] = await Promise.all(
    rows.results.map(async (g) => ({
      id: g.id, title: g.title, kind: g.kind, target: g.target, trackId: g.track_id, deadline: g.deadline,
      createdAt: g.created_at, completedAt: g.completed_at, current: await goalCurrent(c.env.DB, user.id, g),
    })),
  );
  return c.json({ goals });
});

me.post('/goals', async (c) => {
  const user = requirePermission(c, 'goals.manage', 'Goals are part of Plus. Upgrade to set goals.');
  const input = await body(c, goalSchema);
  if (input.kind === 'finish_track') {
    const t = input.trackId ? getTrack(input.trackId) : undefined;
    if (!t) throw badRequest('Choose a track for this goal.', { trackId: 'Choose a track' });
    input.target = t.lessons.length;
  }
  const count = await c.env.DB.prepare('SELECT COUNT(*) AS n FROM goals WHERE user_id = ? AND completed_at IS NULL').bind(user.id).first<{ n: number }>();
  if ((count?.n ?? 0) >= 10) throw badRequest('You can have up to 10 active goals.');
  const id = newId();
  await c.env.DB.prepare('INSERT INTO goals (id, user_id, title, kind, target, track_id, deadline) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .bind(id, user.id, input.title, input.kind, input.target, input.trackId ?? null, input.deadline ?? null)
    .run();
  return c.json({ id }, 201);
});

me.post('/goals/:id/complete', async (c) => {
  const user = requirePermission(c, 'goals.manage');
  await c.env.DB.prepare('UPDATE goals SET completed_at = ? WHERE id = ? AND user_id = ?').bind(nowIso(), c.req.param('id'), user.id).run();
  return c.json({ ok: true });
});

me.delete('/goals/:id', async (c) => {
  const user = requirePermission(c, 'goals.manage');
  await c.env.DB.prepare('DELETE FROM goals WHERE id = ? AND user_id = ?').bind(c.req.param('id'), user.id).run();
  return c.json({ ok: true });
});

// ── Payments history ───────────────────────────────────────────────────────

me.get('/payments', async (c) => {
  const user = requireUser(c);
  const rows = await c.env.DB.prepare('SELECT id, reference, plan, period, amount_cents, currency, status, created_at FROM payments WHERE user_id = ? ORDER BY created_at DESC LIMIT 50').bind(user.id).all();
  return c.json({ payments: rows.results });
});

export default me;
