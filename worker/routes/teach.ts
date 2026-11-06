/**
 * Teacher portal API: invites, roster, learner detail, Zuva reports, lesson plans, wallet, settings.
 *
 * Every learner read goes through assertCanSeeStudent / rosterFor, so a teacher only ever sees
 * learners linked to them or in their classes. Admins may add ?teacher=<id> to see exactly what
 * that teacher sees (and may open any learner).
 */
import { createRouter, body, clientKey, requireUser, type Ctx } from '../app';
import { inviteCreateSchema, lessonPlanRequestSchema, lessonPlanUpdateSchema, teacherSettingsSchema } from '@shared/schemas';
import type { InvitePreview, LessonPlan, LessonPlanContent, ListedTeacher, StudentReport, StudentReportContent, TeacherInvite, Wallet, WalletEntry } from '@shared/teaching';
import { audit, nowIso, parseJson } from '../lib/db';
import { newId } from '../lib/crypto';
import { badRequest, forbidden, notFound, conflict } from '../lib/errors';
import { hit } from '../lib/ratelimit';
import { appBase } from '../lib/urls';
import { consumeAiQuota } from '../lib/ai-quota';
import { getTrack } from '../lib/catalog';
import { assertCanSeeStudent, commissionRateBp, findInvite, inviteProblem, isAdmin, isTeacher, newInviteCode, walletBalance, type InviteRow } from '../lib/teaching';
import { rosterFor, studentDetail } from '../lib/students';
import { catalogHintsFor, writeLessonPlan, writeStudentReport } from '../zuva/teaching';

const teach = createRouter();

// ── Public: what a student sees before joining ─────────────────────────────

teach.get('/public/invites/:code', async (c) => {
  await hit(c.env.DB, `invite-peek:${clientKey(c)}`, 60, 3600, 'Too many tries. Wait a little and try again.');
  const inv = await findInvite(c.env.DB, c.req.param('code'));
  const problem = inviteProblem(inv);
  if (problem) throw notFound(problem);
  const t = await c.env.DB.prepare(
    `SELECT u.name, u.school, c.name AS classroom_name FROM users u LEFT JOIN classrooms c ON c.id = ? AND c.archived_at IS NULL
     WHERE u.id = ? AND u.role IN ('teacher','admin') AND u.disabled_at IS NULL AND u.deleted_at IS NULL`,
  ).bind(inv!.classroom_id, inv!.teacher_id).first<{ name: string; school: string | null; classroom_name: string | null }>();
  if (!t) throw notFound('That teacher’s account is not active.');
  return c.json({ invite: { code: inv!.code, teacherName: t.name, school: t.school, classroomName: t.classroom_name } satisfies InvitePreview });
});

/** Teachers who chose to be findable at sign-up. Name, school and city only. */
teach.get('/public/teachers', async (c) => {
  await hit(c.env.DB, `teacher-search:${clientKey(c)}`, 120, 3600, 'Too many searches. Wait a little and try again.');
  const q = (c.req.query('q') ?? '').trim().slice(0, 60);
  if (q.length < 2) return c.json({ teachers: [] });
  const like = `%${q.replace(/[%_\\]/g, (m) => `\\${m}`)}%`;
  const rows = await c.env.DB.prepare(
    `SELECT id, name, school, city FROM users WHERE role = 'teacher' AND teacher_listed = 1 AND disabled_at IS NULL AND deleted_at IS NULL
     AND (name LIKE ?1 ESCAPE '\\' OR school LIKE ?1 ESCAPE '\\') ORDER BY name LIMIT 10`,
  ).bind(like).all<ListedTeacher>();
  return c.json({ teachers: rows.results });
});

// ── Teacher scope ─────────────────────────────────────────────────────────

/** The teacher whose portal this is: yourself, or (admins only) ?teacher=<id>. */
async function scope(c: Ctx) {
  const user = requireUser(c);
  if (!isTeacher(user)) throw forbidden('This is for teachers. Ask to teach from your settings.');
  const as = c.req.query('teacher');
  if (as && as !== user.id) {
    if (!isAdmin(user)) throw forbidden();
    const t = await c.env.DB.prepare("SELECT id FROM users WHERE id = ? AND role IN ('teacher','admin')").bind(as).first<{ id: string }>();
    if (!t) throw notFound('Teacher not found.');
    return { user, teacherId: t.id, viewingAs: true };
  }
  return { user, teacherId: user.id, viewingAs: false };
}

/** Writes are always the teacher's own (admins use the admin console to change others' data). */
function own(s: { viewingAs: boolean }) {
  if (s.viewingAs) throw forbidden('You are viewing another teacher’s portal. Make changes from the admin console.');
}

// ── Overview ─────────────────────────────────────────────────────────────

teach.get('/overview', async (c) => {
  const s = await scope(c);
  const db = c.env.DB;
  const roster = await rosterFor(db, s.teacherId);
  const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString().slice(0, 10);
  const [classes, toGrade, invites, plans] = await Promise.all([
    db.prepare('SELECT COUNT(*) AS n FROM classrooms WHERE teacher_id = ? AND archived_at IS NULL').bind(s.teacherId).first<{ n: number }>(),
    db.prepare("SELECT COUNT(*) AS n FROM submissions su JOIN assignments a ON a.id = su.assignment_id JOIN classrooms c ON c.id = a.classroom_id WHERE c.teacher_id = ? AND su.status = 'submitted'").bind(s.teacherId).first<{ n: number }>(),
    db.prepare('SELECT COUNT(*) AS n FROM teacher_invites WHERE teacher_id = ? AND revoked_at IS NULL').bind(s.teacherId).first<{ n: number }>(),
    db.prepare('SELECT COUNT(*) AS n FROM lesson_plans WHERE teacher_id = ?').bind(s.teacherId).first<{ n: number }>(),
  ]);
  const wallet = await walletBalance(db, s.teacherId);
  return c.json({
    students: roster.length,
    paying: roster.filter((r) => r.paid).length,
    inactive: roster.filter((r) => !r.lastActiveDay || r.lastActiveDay < weekAgo).length,
    openWork: roster.reduce((n, r) => n + r.assignmentsOpen, 0),
    classes: classes?.n ?? 0,
    toGrade: toGrade?.n ?? 0,
    invites: invites?.n ?? 0,
    lessonPlans: plans?.n ?? 0,
    walletCents: wallet.balanceCents,
    needsAttention: roster
      .filter((r) => r.assignmentsOpen >= 2 || !r.lastActiveDay || r.lastActiveDay < weekAgo)
      .slice(0, 8)
      .map((r) => ({ id: r.id, name: r.name, reason: !r.lastActiveDay || r.lastActiveDay < weekAgo ? `Not active since ${r.lastActiveDay ?? 'joining'}` : `${r.assignmentsOpen} assignments open` })),
  });
});

// ── Invites ─────────────────────────────────────────────────────────────

const toInvite = (r: InviteRow & { classroom_name: string | null }, base: string): TeacherInvite => ({
  id: r.id, code: r.code, label: r.label, classroomId: r.classroom_id, classroomName: r.classroom_name, maxUses: r.max_uses, used: r.used,
  expiresAt: r.expires_at, revoked: !!r.revoked_at, createdAt: r.created_at, url: `${base}/join/${r.code}`,
});

teach.get('/invites', async (c) => {
  const s = await scope(c);
  const rows = await c.env.DB.prepare('SELECT i.*, c.name AS classroom_name FROM teacher_invites i LEFT JOIN classrooms c ON c.id = i.classroom_id WHERE i.teacher_id = ? ORDER BY i.revoked_at IS NOT NULL, i.created_at DESC LIMIT 100')
    .bind(s.teacherId).all<InviteRow & { classroom_name: string | null }>();
  const base = appBase(c.req.url, c.env.APP_URL);
  return c.json({ invites: rows.results.map((r) => toInvite(r, base)) });
});

teach.post('/invites', async (c) => {
  const s = await scope(c);
  own(s);
  const input = await body(c, inviteCreateSchema);
  await hit(c.env.DB, `invite-create:${s.teacherId}`, 30, 3600, 'That’s a lot of invites this hour. Try again later.');
  if (input.classroomId) {
    const room = await c.env.DB.prepare('SELECT id FROM classrooms WHERE id = ? AND teacher_id = ? AND archived_at IS NULL').bind(input.classroomId, s.teacherId).first();
    if (!room) throw badRequest('Choose one of your active classes.', { classroomId: 'Not your class' });
  }
  const id = newId();
  const expires = input.expiresInDays ? new Date(Date.now() + input.expiresInDays * 86_400_000).toISOString() : null;
  for (let i = 0; i < 5; i++) {
    try {
      await c.env.DB.prepare('INSERT INTO teacher_invites (id, teacher_id, classroom_id, code, label, max_uses, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .bind(id, s.teacherId, input.classroomId ?? null, newInviteCode(), input.label, input.maxUses ?? null, expires).run();
      const row = await c.env.DB.prepare('SELECT i.*, c.name AS classroom_name FROM teacher_invites i LEFT JOIN classrooms c ON c.id = i.classroom_id WHERE i.id = ?').bind(id).first<InviteRow & { classroom_name: string | null }>();
      await audit(c.env.DB, s.user.id, 'invite.create', id);
      return c.json({ invite: toInvite(row!, appBase(c.req.url, c.env.APP_URL)) }, 201);
    } catch (e) {
      if (!String(e).includes('UNIQUE')) throw e;
    }
  }
  throw conflict('Could not make a unique code. Try again.');
});

teach.post('/invites/:id/revoke', async (c) => {
  const s = await scope(c);
  own(s);
  const r = await c.env.DB.prepare('UPDATE teacher_invites SET revoked_at = ? WHERE id = ? AND teacher_id = ? AND revoked_at IS NULL').bind(nowIso(), c.req.param('id'), s.teacherId).run();
  if (!r.meta.changes) throw notFound('Invite not found.');
  return c.json({ ok: true });
});

// ── Students ────────────────────────────────────────────────────────────

teach.get('/students', async (c) => {
  const s = await scope(c);
  return c.json({ students: await rosterFor(c.env.DB, s.teacherId) });
});

teach.get('/students/:id', async (c) => {
  const s = await scope(c);
  const sid = c.req.param('id');
  await assertCanSeeStudent(c.env.DB, isAdmin(s.user) ? s.user : { id: s.teacherId, role: 'teacher' }, sid);
  const detail = await studentDetail(c.env.DB, s.teacherId, sid, isAdmin(s.user));
  if (!detail) throw notFound('Learner not found.');
  return c.json(detail);
});

/** Stop teaching a learner: unlink and remove them from this teacher's classes. */
teach.delete('/students/:id', async (c) => {
  const s = await scope(c);
  own(s);
  const sid = c.req.param('id');
  await assertCanSeeStudent(c.env.DB, s.user, sid);
  await c.env.DB.batch([
    c.env.DB.prepare('DELETE FROM teacher_students WHERE teacher_id = ? AND student_id = ?').bind(s.teacherId, sid),
    c.env.DB.prepare('DELETE FROM classroom_members WHERE user_id = ? AND classroom_id IN (SELECT id FROM classrooms WHERE teacher_id = ?)').bind(sid, s.teacherId),
  ]);
  await audit(c.env.DB, s.user.id, 'teacher.unlink_student', sid);
  return c.json({ ok: true });
});

// ── Zuva reports ────────────────────────────────────────────────────────

async function listReports(db: D1Database, studentId: string, authorId: string | null): Promise<StudentReport[]> {
  const rows = await db.prepare(
    `SELECT r.id, r.content, r.created_at, u.name AS author_name FROM student_reports r JOIN users u ON u.id = r.author_id
     WHERE r.student_id = ? ${authorId ? 'AND r.author_id = ?' : ''} ORDER BY r.created_at DESC LIMIT 10`,
  ).bind(...(authorId ? [studentId, authorId] : [studentId])).all<{ id: string; content: string; created_at: string; author_name: string }>();
  return rows.results.map((r) => ({ id: r.id, createdAt: r.created_at, authorName: r.author_name, content: parseJson<StudentReportContent>(r.content, null as never) })).filter((r) => r.content);
}

teach.get('/students/:id/reports', async (c) => {
  const s = await scope(c);
  const sid = c.req.param('id');
  await assertCanSeeStudent(c.env.DB, isAdmin(s.user) ? s.user : { id: s.teacherId, role: 'teacher' }, sid);
  // A teacher sees their own reports; an admin sees every report on the learner.
  return c.json({ reports: await listReports(c.env.DB, sid, isAdmin(s.user) && !s.viewingAs ? null : s.teacherId) });
});

/** Shared by the route and Zuva's teacher tool. */
export async function makeStudentReport(env: Env, authorId: string, teacherScopeId: string, studentId: string, asAdmin: boolean): Promise<StudentReport> {
  const detail = await studentDetail(env.DB, teacherScopeId, studentId, asAdmin);
  if (!detail) throw notFound('Learner not found.');
  const content = await writeStudentReport(env, detail, catalogHintsFor(detail));
  const id = newId();
  await env.DB.prepare('INSERT INTO student_reports (id, student_id, author_id, content) VALUES (?, ?, ?, ?)').bind(id, studentId, authorId, JSON.stringify(content)).run();
  const author = await env.DB.prepare('SELECT name FROM users WHERE id = ?').bind(authorId).first<{ name: string }>();
  return { id, createdAt: nowIso(), authorName: author?.name ?? '', content };
}

teach.post('/students/:id/reports', async (c) => {
  const s = await scope(c);
  own(s);
  const sid = c.req.param('id');
  await assertCanSeeStudent(c.env.DB, s.user, sid);
  await consumeAiQuota(c);
  return c.json({ report: await makeStudentReport(c.env, s.user.id, s.teacherId, sid, isAdmin(s.user)) }, 201);
});

// ── Lesson plans ────────────────────────────────────────────────────────

interface PlanRow { id: string; teacher_id: string; classroom_id: string | null; track_id: string; title: string; content: string; created_at: string; updated_at: string }
const toPlan = (r: PlanRow): LessonPlan => ({
  id: r.id, trackId: r.track_id, trackTitle: getTrack(r.track_id)?.title ?? r.track_id, classroomId: r.classroom_id, title: r.title,
  content: parseJson<LessonPlanContent>(r.content, null as never), createdAt: r.created_at, updatedAt: r.updated_at,
});

teach.get('/lesson-plans', async (c) => {
  const s = await scope(c);
  const rows = await c.env.DB.prepare('SELECT * FROM lesson_plans WHERE teacher_id = ? ORDER BY updated_at DESC LIMIT 100').bind(s.teacherId).all<PlanRow>();
  return c.json({ plans: rows.results.map(toPlan).filter((p) => p.content) });
});

/** Shared by the route and Zuva's teacher tool. */
export async function makeLessonPlan(env: Env, teacherId: string, input: { trackId: string; lessonSlugs: string[]; classroomId?: string | null; minutes: number; focus: string }): Promise<LessonPlan> {
  const track = getTrack(input.trackId);
  if (!track) throw badRequest('Choose a course.', { trackId: 'Unknown course' });
  const bad = input.lessonSlugs.find((sl) => !track.lessons.some((l) => l.slug === sl));
  if (bad) throw badRequest('One of those lessons is not in this course.', { lessonSlugs: bad });
  let room: { id: string; name: string; level: string; n: number } | null = null;
  if (input.classroomId) {
    room = await env.DB.prepare('SELECT c.id, c.name, c.level, (SELECT COUNT(*) FROM classroom_members m WHERE m.classroom_id = c.id) AS n FROM classrooms c WHERE c.id = ? AND c.teacher_id = ?')
      .bind(input.classroomId, teacherId).first();
    if (!room) throw badRequest('Choose one of your classes.', { classroomId: 'Not your class' });
  }
  const content = await writeLessonPlan(env, { trackId: track.id, lessonSlugs: input.lessonSlugs, minutes: input.minutes, focus: input.focus, className: room?.name, level: room?.level, learners: room?.n });
  const id = newId();
  await env.DB.prepare('INSERT INTO lesson_plans (id, teacher_id, classroom_id, track_id, title, content) VALUES (?, ?, ?, ?, ?, ?)').bind(id, teacherId, room?.id ?? null, track.id, content.title, JSON.stringify(content)).run();
  const row = await env.DB.prepare('SELECT * FROM lesson_plans WHERE id = ?').bind(id).first<PlanRow>();
  return toPlan(row!);
}

teach.post('/lesson-plans', async (c) => {
  const s = await scope(c);
  own(s);
  const input = await body(c, lessonPlanRequestSchema);
  await consumeAiQuota(c);
  return c.json({ plan: await makeLessonPlan(c.env, s.teacherId, input) }, 201);
});

async function ownPlan(c: Ctx, teacherId: string, admin: boolean) {
  const row = await c.env.DB.prepare('SELECT * FROM lesson_plans WHERE id = ?').bind(c.req.param('id')).first<PlanRow>();
  if (!row || (row.teacher_id !== teacherId && !admin)) throw notFound('Lesson plan not found.');
  return row;
}

teach.get('/lesson-plans/:id', async (c) => {
  const s = await scope(c);
  return c.json({ plan: toPlan(await ownPlan(c, s.teacherId, isAdmin(s.user))) });
});

teach.put('/lesson-plans/:id', async (c) => {
  const s = await scope(c);
  own(s);
  const row = await ownPlan(c, s.teacherId, false);
  const { content } = await body(c, lessonPlanUpdateSchema);
  await c.env.DB.prepare('UPDATE lesson_plans SET title = ?, content = ?, updated_at = ? WHERE id = ?').bind(content.title, JSON.stringify(content), nowIso(), row.id).run();
  return c.json({ ok: true });
});

teach.delete('/lesson-plans/:id', async (c) => {
  const s = await scope(c);
  own(s);
  const row = await ownPlan(c, s.teacherId, false);
  await c.env.DB.prepare('DELETE FROM lesson_plans WHERE id = ?').bind(row.id).run();
  return c.json({ ok: true });
});

// ── Wallet & settings ───────────────────────────────────────────────────

teach.get('/wallet', async (c) => {
  const s = await scope(c);
  const db = c.env.DB;
  const [totals, rows, paying, rate] = await Promise.all([
    walletBalance(db, s.teacherId),
    db.prepare(
      `SELECT w.id, w.kind, w.amount_cents, w.note, w.created_at, u.name AS student_name, p.reference FROM wallet_entries w
       LEFT JOIN users u ON u.id = w.student_id LEFT JOIN payments p ON p.id = w.payment_id WHERE w.teacher_id = ? ORDER BY w.created_at DESC LIMIT 200`,
    ).bind(s.teacherId).all<{ id: string; kind: WalletEntry['kind']; amount_cents: number; note: string; created_at: string; student_name: string | null; reference: string | null }>(),
    db.prepare("SELECT COUNT(DISTINCT student_id) AS n FROM wallet_entries WHERE teacher_id = ? AND kind = 'commission' AND created_at >= ?").bind(s.teacherId, new Date(Date.now() - 31 * 86_400_000).toISOString()).first<{ n: number }>(),
    commissionRateBp(db),
  ]);
  const wallet: Wallet = {
    ...totals, ratePercent: rate / 100, payingStudents: paying?.n ?? 0,
    entries: rows.results.map((r) => ({ id: r.id, kind: r.kind, amountCents: r.amount_cents, note: r.note, studentName: r.student_name, paymentRef: r.reference, createdAt: r.created_at })),
  };
  return c.json({ wallet });
});

teach.get('/settings', async (c) => {
  const s = await scope(c);
  const u = await c.env.DB.prepare('SELECT teacher_listed FROM users WHERE id = ?').bind(s.teacherId).first<{ teacher_listed: number }>();
  return c.json({ listed: !!u?.teacher_listed });
});

teach.put('/settings', async (c) => {
  const s = await scope(c);
  own(s);
  const { listed } = await body(c, teacherSettingsSchema);
  await c.env.DB.prepare('UPDATE users SET teacher_listed = ? WHERE id = ?').bind(listed ? 1 : 0, s.teacherId).run();
  return c.json({ ok: true });
});

export default teach;
