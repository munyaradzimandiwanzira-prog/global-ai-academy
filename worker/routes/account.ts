import { createRouter, body, requireUser, type Ctx } from '../app';
import { deleteAccountSchema, mfaCodeSchema, mfaDisableSchema, mfaSetupSchema } from '@shared/schemas';
import type { AccountSession, MfaStatus } from '@shared/api-types';
import { audit, nowIso, toPublicUser, type UserRow } from '../lib/db';
import { verifyPassword, sha256Hex } from '../lib/crypto';
import { destroyAllSessions, destroySession } from '../lib/session';
import { badRequest, conflict, forbidden, notFound, unavailable } from '../lib/errors';
import { hit } from '../lib/ratelimit';
import { seal, unseal } from '../lib/secretbox';
import { base32Encode, newTotpSecret, otpauthUrl, verifyTotp } from '../lib/totp';
import { limitCodeAttempts, mfaAvailable, newRecoveryCodes, recoveryCodesLeft, storeRecoveryCodes, verifySecondFactor } from '../lib/mfa';

/**
 * The signed-in person's own security and privacy controls:
 * two-step login, signed-in devices, "download my data" and "delete my account".
 */
const account = createRouter();

/** The real database row (sessionMiddleware may hand routes a downgraded copy for un-enrolled admins). */
async function freshUser(c: Ctx): Promise<UserRow> {
  const user = requireUser(c);
  const row = await c.env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(user.id).first<UserRow>();
  if (!row) throw notFound();
  return row;
}

async function requirePassword(c: Ctx, user: UserRow, password: string) {
  await hit(c.env.DB, `reauth:${user.id}`, 8, 900, 'Too many attempts. Wait 15 minutes and try again.');
  if (!(await verifyPassword(password, user.password_hash))) throw badRequest('Your password is not correct.', { password: 'Incorrect password' });
}

// ── Two-step login ─────────────────────────────────────────────────────────

account.get('/mfa', async (c) => {
  const user = await freshUser(c);
  const status: MfaStatus = {
    available: mfaAvailable(c.env),
    enabled: !!user.mfa_enabled_at,
    enabledAt: user.mfa_enabled_at,
    required: user.role === 'admin',
    recoveryCodesLeft: user.mfa_enabled_at ? await recoveryCodesLeft(c.env.DB, user.id) : 0,
  };
  return c.json(status);
});

/** Step 1: confirm the password, get a fresh secret to scan. Nothing changes until step 2 succeeds. */
account.post('/mfa/setup', async (c) => {
  if (!mfaAvailable(c.env)) throw unavailable('Two-step login is not switched on for this site yet.');
  const user = await freshUser(c);
  if (user.mfa_enabled_at) throw conflict('Two-step login is already on.');
  const { password } = await body(c, mfaSetupSchema);
  await requirePassword(c, user, password);
  const secret = newTotpSecret();
  await c.env.DB.prepare('UPDATE users SET mfa_pending_secret = ? WHERE id = ?').bind(await seal(c.env, secret, user.id), user.id).run();
  const b32 = base32Encode(secret);
  return c.json({ secret: b32.replace(/(.{4})/g, '$1 ').trim(), otpauthUrl: otpauthUrl(b32, user.email, c.env.APP_NAME) });
});

/** Step 2: prove the app is set up by typing its current code. Returns recovery codes exactly once. */
account.post('/mfa/enable', async (c) => {
  const user = await freshUser(c);
  if (user.mfa_enabled_at) throw conflict('Two-step login is already on.');
  if (!user.mfa_pending_secret) throw badRequest('Start the setup again.');
  const { code } = await body(c, mfaCodeSchema);
  await limitCodeAttempts(c, user.id);
  const secret = await unseal(c.env, user.mfa_pending_secret, user.id);
  const step = await verifyTotp(secret, code);
  if (step === null) throw badRequest('That code is not right. Check the time on your phone is set automatically.', { code: 'Incorrect code' });
  const codes = newRecoveryCodes();
  await c.env.DB.prepare('UPDATE users SET mfa_secret = mfa_pending_secret, mfa_pending_secret = NULL, mfa_enabled_at = ?, mfa_last_step = ?, updated_at = ? WHERE id = ?')
    .bind(nowIso(), step, nowIso(), user.id).run();
  await storeRecoveryCodes(c.env.DB, user.id, codes);
  // Anyone who signed in with the password alone (perhaps not you) is signed out now.
  await destroyAllSessions(c.env.DB, user.id, c.get('sessionId'));
  await audit(c.env.DB, user.id, 'mfa.enabled', user.id);
  const fresh = await c.env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(user.id).first<UserRow>();
  return c.json({ recoveryCodes: codes, user: toPublicUser(fresh!) });
});

account.post('/mfa/recovery-codes', async (c) => {
  const user = await freshUser(c);
  if (!user.mfa_enabled_at) throw badRequest('Turn on two-step login first.');
  const { code } = await body(c, mfaCodeSchema);
  await limitCodeAttempts(c, user.id);
  if (!(await verifySecondFactor(c.env, user, code))) throw badRequest('That code is not right.', { code: 'Incorrect code' });
  const codes = newRecoveryCodes();
  await storeRecoveryCodes(c.env.DB, user.id, codes);
  await audit(c.env.DB, user.id, 'mfa.recovery_regenerated', user.id);
  return c.json({ recoveryCodes: codes });
});

account.post('/mfa/disable', async (c) => {
  const user = await freshUser(c);
  if (!user.mfa_enabled_at) return c.json({ ok: true });
  if (user.role === 'admin') throw forbidden('Admin accounts must keep two-step login on.');
  const input = await body(c, mfaDisableSchema);
  await requirePassword(c, user, input.password);
  await limitCodeAttempts(c, user.id);
  if (!(await verifySecondFactor(c.env, user, input.code))) throw badRequest('That code is not right.', { code: 'Incorrect code' });
  await c.env.DB.batch([
    c.env.DB.prepare('UPDATE users SET mfa_secret = NULL, mfa_pending_secret = NULL, mfa_enabled_at = NULL, mfa_last_step = NULL, updated_at = ? WHERE id = ?').bind(nowIso(), user.id),
    c.env.DB.prepare('DELETE FROM mfa_recovery_codes WHERE user_id = ?').bind(user.id),
  ]);
  await audit(c.env.DB, user.id, 'mfa.disabled', user.id);
  const fresh = await c.env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(user.id).first<UserRow>();
  return c.json({ ok: true, user: toPublicUser(fresh!) });
});

// ── Signed-in devices ──────────────────────────────────────────────────────

/** A stable public handle for a session that reveals nothing about the cookie or its hash. */
const handleFor = (sessionId: string) => sha256Hex(`handle:${sessionId}`).then((h) => h.slice(0, 16));

account.get('/sessions', async (c) => {
  const user = requireUser(c);
  const rows = await c.env.DB.prepare('SELECT id, created_at, expires_at, user_agent FROM sessions WHERE user_id = ? AND expires_at > ? ORDER BY created_at DESC LIMIT 50')
    .bind(user.id, nowIso()).all<{ id: string; created_at: string; expires_at: string; user_agent: string | null }>();
  const current = c.get('sessionId');
  const sessions: AccountSession[] = await Promise.all(
    rows.results.map(async (r) => ({ id: await handleFor(r.id), createdAt: r.created_at, userAgent: r.user_agent ?? '', current: r.id === current })),
  );
  return c.json({ sessions });
});

account.delete('/sessions/:handle', async (c) => {
  const user = requireUser(c);
  const rows = await c.env.DB.prepare('SELECT id FROM sessions WHERE user_id = ?').bind(user.id).all<{ id: string }>();
  for (const r of rows.results) {
    if ((await handleFor(r.id)) === c.req.param('handle')) {
      if (r.id === c.get('sessionId')) await destroySession(c);
      else await c.env.DB.prepare('DELETE FROM sessions WHERE id = ? AND user_id = ?').bind(r.id, user.id).run();
      return c.json({ ok: true });
    }
  }
  throw notFound('That device is already signed out.');
});

account.post('/sessions/sign-out-others', async (c) => {
  const user = requireUser(c);
  await destroyAllSessions(c.env.DB, user.id, c.get('sessionId'));
  await audit(c.env.DB, user.id, 'sessions.revoked_others', user.id);
  return c.json({ ok: true });
});

// ── Your data ──────────────────────────────────────────────────────────────

/** Everything we hold about you, as one JSON file (right of access / portability). */
account.get('/export', async (c) => {
  const user = await freshUser(c);
  await hit(c.env.DB, `export:${user.id}`, 5, 3600, 'You can download your data 5 times an hour.');
  const q = (sql: string) => c.env.DB.prepare(sql).bind(user.id).all().then((r) => r.results);
  const [esl, eslAttempts, eslSkills, eslSessions, eslNotes, maths, mathsAttempts, mathsSkills, mathsProgress] = await Promise.all([
    q('SELECT band, accent, age, week, voice, support, created_at, updated_at FROM esl_learners WHERE user_id = ?'),
    q('SELECT week, band, kind, skill, item, correct, score, ms, tries, hints, input, heard, created_at FROM esl_attempts WHERE user_id = ? ORDER BY id'),
    q('SELECT skill, mastery, attempts, correct, avg_ms, last_at FROM esl_skills WHERE user_id = ?'),
    q('SELECT week, band, started_at, ended_at, summary FROM esl_sessions WHERE user_id = ?'),
    c.env.DB.prepare('SELECT course, area, note, suggestion, created_at FROM esl_teacher_notes WHERE student_id = ?').bind(user.id).all().then((r) => r.results),
    q('SELECT stage, age, support, voice, created_at, updated_at FROM maths_learners WHERE user_id = ?'),
    q('SELECT week AS stage, band AS unit, kind, skill, item, correct, ms, tries, hints, support_used, created_at FROM maths_attempts WHERE user_id = ? ORDER BY id'),
    q('SELECT skill, mastery, attempts, correct, avg_ms, last_at FROM maths_skills WHERE user_id = ?'),
    q('SELECT unit_id, done, stars, completed_at FROM maths_progress WHERE user_id = ?'),
  ]);
  const by = (sql: string) => c.env.DB.prepare(sql).bind(user.id).all().then((r) => r.results);
  const [testAttempts, guardians, announcements, courseProgress] = await Promise.all([
    by('SELECT t.title, a.status, a.answers, a.score, a.max_score, a.late, a.teacher_comment, a.started_at, a.submitted_at FROM test_attempts a JOIN teacher_tests t ON t.id = a.test_id WHERE a.student_id = ?'),
    by('SELECT name, email, relation, unsubscribed_at, created_at FROM guardians WHERE student_id = ?'),
    by('SELECT a.title, a.body, a.created_at, t.read_at FROM teacher_message_targets t JOIN teacher_messages a ON a.id = t.message_id WHERE t.student_id = ?'),
    by('SELECT c.title AS course, l.title AS lesson, p.score, p.max_score, p.answers, p.done_at FROM teacher_lesson_progress p JOIN teacher_lessons l ON l.id = p.lesson_id JOIN teacher_courses c ON c.id = p.course_id WHERE p.student_id = ?'),
  ]);
  const [progress, activity, xp, goals, projects, capstones, submissions, certificates, exams, classes, messages, payments, teacherRequests, zuvaProfile, zuvaMemories, zuvaChats] = await Promise.all([
    q('SELECT track_id, lesson_slug, status, completed_at, updated_at FROM progress WHERE user_id = ?'),
    q('SELECT kind, ref_id, track_id, passed, score, attempts, last_code, updated_at FROM activity WHERE user_id = ?'),
    q('SELECT source, source_id, amount, created_at FROM xp_events WHERE user_id = ?'),
    q('SELECT title, kind, target, track_id, deadline, created_at, completed_at FROM goals WHERE user_id = ?'),
    q('SELECT title, language, code, share_slug, created_at, updated_at FROM projects WHERE user_id = ?'),
    q('SELECT career_id, title, summary, stack, repo_url, demo_url, status, feedback, grade, created_at, updated_at FROM capstones WHERE user_id = ?'),
    q('SELECT assignment_id, code, text, status, score, teacher_feedback, ai_feedback, submitted_at, graded_at FROM submissions WHERE user_id = ?'),
    q('SELECT id, track_id, name, score, issued_at FROM certificates WHERE user_id = ?'),
    q('SELECT track_id, score, passed, started_at, submitted_at FROM exam_attempts WHERE user_id = ?'),
    q('SELECT k.name, m.joined_at FROM classroom_members m JOIN classrooms k ON k.id = m.classroom_id WHERE m.user_id = ?'),
    q('SELECT classroom_id, body, created_at FROM messages WHERE user_id = ?'),
    q('SELECT reference, plan, period, amount_cents, currency, status, created_at FROM payments WHERE user_id = ?'),
    q('SELECT message, status, created_at FROM teacher_requests WHERE user_id = ?'),
    q('SELECT interests, goals, learning_style, memory_enabled, updated_at FROM zuva_profiles WHERE user_id = ?'),
    q('SELECT kind, content, source, created_at, last_used_at FROM zuva_memories WHERE user_id = ?'),
    q('SELECT t.title, t.mode, t.summary, m.role, m.content, m.created_at FROM zuva_threads t JOIN zuva_messages m ON m.thread_id = t.id WHERE t.user_id = ? ORDER BY t.created_at, m.id'),
  ]);
  const data = {
    exportedAt: nowIso(),
    site: c.env.APP_NAME,
    englishCourse: { settings: esl[0] ?? null, answers: eslAttempts, skills: eslSkills, sessions: eslSessions, notesToTeachers: eslNotes },
    mathsCourse: { settings: maths[0] ?? null, answers: mathsAttempts, skills: mathsSkills, progress: mathsProgress },
    account: {
      ...toPublicUser(user),
      termsAcceptedAt: user.terms_accepted_at,
      lastActiveDay: user.last_active_day,
      lastLesson: user.last_lesson,
    },
    progress, activity, xp, goals, projects, capstones, submissions, certificates, exams, classes, messages, payments, teacherRequests,
    zuva: { profile: zuvaProfile[0] ?? null, memories: zuvaMemories, conversations: zuvaChats },
    teacherWork: { tests: testAttempts, courseLessons: courseProgress, announcements },
    parentContacts: guardians,
  };
  await audit(c.env.DB, user.id, 'account.exported', user.id);
  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'content-disposition': `attachment; filename="global-ai-academy-data-${nowIso().slice(0, 10)}.json"`,
      'cache-control': 'no-store',
    },
  });
});

/**
 * Right to erasure. Personal data and learning history are deleted; the user row stays as an
 * anonymous tombstone so payment records (which the law requires us to keep) still add up.
 */
account.post('/delete', async (c) => {
  const user = await freshUser(c);
  const input = await body(c, deleteAccountSchema);
  if (user.role === 'admin') throw forbidden('Admin accounts cannot be deleted here. Ask another admin to remove admin access first.');
  await requirePassword(c, user, input.password);
  if (user.mfa_enabled_at) {
    await limitCodeAttempts(c, user.id);
    if (!input.code || !(await verifySecondFactor(c.env, user, input.code))) throw badRequest('Enter a current code from your authenticator app.', { code: 'Incorrect code' });
  }
  const teaching = await c.env.DB.prepare('SELECT COUNT(*) AS n FROM classrooms WHERE teacher_id = ? AND archived_at IS NULL').bind(user.id).first<{ n: number }>();
  if ((teaching?.n ?? 0) > 0) throw conflict('You still teach active classrooms. Archive them (or hand them to another teacher) first.');

  const db = c.env.DB;
  const id = user.id;
  const now = nowIso();
  const del = (table: string) => db.prepare(`DELETE FROM ${table} WHERE user_id = ?`).bind(id);
  await db.batch([
    ...['sessions', 'email_tokens', 'progress', 'activity', 'xp_events', 'goals', 'projects', 'capstones', 'submissions',
      'certificates', 'exam_attempts', 'classroom_members', 'messages', 'learner_reports', 'teacher_requests', 'waitlist',
      'mfa_recovery_codes', 'mfa_challenges', 'zuva_threads', 'zuva_memories', 'zuva_profiles',
      'esl_learners', 'esl_attempts', 'esl_skills', 'esl_items', 'esl_engagement', 'esl_sessions', 'esl_progress', 'esl_generated',
      'maths_learners', 'maths_attempts', 'maths_skills', 'maths_items', 'maths_engagement', 'maths_progress'].map(del),
    db.prepare('DELETE FROM esl_teacher_notes WHERE student_id = ?').bind(id),
    db.prepare('DELETE FROM test_attempts WHERE student_id = ?').bind(id),
    db.prepare('DELETE FROM teacher_test_targets WHERE student_id = ?').bind(id),
    ...['guardians', 'teacher_message_targets', 'teacher_lesson_progress', 'teacher_course_learners', 'parent_reports'].map((t) => db.prepare(`DELETE FROM ${t} WHERE student_id = ?`).bind(id)),
    // What they made as a teacher goes too (classes were already archived or handed over).
    ...['teacher_courses', 'teacher_messages', 'parent_reports'].map((t) => db.prepare(`DELETE FROM ${t} WHERE teacher_id = ?`).bind(id)),
    db.prepare('DELETE FROM contact_messages WHERE email = ?').bind(user.email),
    db.prepare(
      `UPDATE users SET email = ?, name = 'Deleted account', password_hash = '!', city = NULL, school = NULL, bio = NULL,
         xp = 0, streak = 0, last_lesson = NULL, last_active_day = NULL, email_verified_at = NULL,
         mfa_secret = NULL, mfa_pending_secret = NULL, mfa_enabled_at = NULL, mfa_last_step = NULL,
         disabled_at = ?, deleted_at = ?, updated_at = ? WHERE id = ?`,
    ).bind(`deleted+${id}@deleted.invalid`, now, now, now, id),
  ]);
  await audit(db, id, 'account.deleted', id);
  await destroySession(c);
  return c.json({ ok: true });
});

export default account;
