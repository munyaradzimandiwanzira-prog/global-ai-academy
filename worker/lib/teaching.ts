/**
 * Teaching platform core: who teaches whom, invite codes, notifications and the commission ledger.
 *
 * Access rule used everywhere a teacher reads a learner's data: an admin may see anyone; a
 * teacher may see a learner only if the learner is linked to them (invite, choice, class, admin)
 * or is in one of their classrooms. Every query is scoped by that rule.
 */
import { audit, nowIso, type UserRow } from './db';
import { newId, randomCode } from './crypto';
import { sendEmail, actionEmail, emailConfigured } from './email';
import { badRequest, forbidden, notFound } from './errors';

export type LinkSource = 'invite' | 'chosen' | 'class' | 'admin';

export const isAdmin = (u: Pick<UserRow, 'role'>) => u.role === 'admin';
export const isTeacher = (u: Pick<UserRow, 'role'>) => u.role === 'teacher' || u.role === 'admin';

export async function linkStudent(db: D1Database, teacherId: string, studentId: string, source: LinkSource, inviteId: string | null = null) {
  if (teacherId === studentId) return false;
  const r = await db.prepare('INSERT OR IGNORE INTO teacher_students (teacher_id, student_id, source, invite_id) VALUES (?, ?, ?, ?)').bind(teacherId, studentId, source, inviteId).run();
  return r.meta.changes > 0;
}

/** True if this teacher (or admin) may read the learner's data. */
export async function canSeeStudent(db: D1Database, viewer: Pick<UserRow, 'id' | 'role'>, studentId: string): Promise<boolean> {
  if (isAdmin(viewer)) return true;
  if (!isTeacher(viewer)) return viewer.id === studentId;
  const row = await db.prepare(
    `SELECT 1 FROM teacher_students WHERE teacher_id = ?1 AND student_id = ?2
     UNION SELECT 1 FROM classroom_members m JOIN classrooms c ON c.id = m.classroom_id WHERE c.teacher_id = ?1 AND m.user_id = ?2 LIMIT 1`,
  ).bind(viewer.id, studentId).first();
  return !!row;
}

export async function assertCanSeeStudent(db: D1Database, viewer: Pick<UserRow, 'id' | 'role'>, studentId: string) {
  if (!(await canSeeStudent(db, viewer, studentId))) throw forbidden('That learner is not one of your students.');
}

// ── Invites ─────────────────────────────────────────────────────────────────

export interface InviteRow {
  id: string; teacher_id: string; classroom_id: string | null; code: string; label: string;
  max_uses: number | null; used: number; expires_at: string | null; revoked_at: string | null; created_at: string;
}

/** Short codes like "T-7KQ2XD" are easy to read out in class or write on a board. */
export const newInviteCode = () => `T-${randomCode(6)}`;

export function inviteProblem(inv: InviteRow | null): string | null {
  if (!inv || inv.revoked_at) return 'That invite code isn’t active. Ask your teacher for a new one.';
  if (inv.expires_at && inv.expires_at < nowIso()) return 'That invite code has expired. Ask your teacher for a new one.';
  if (inv.max_uses !== null && inv.used >= inv.max_uses) return 'That invite code has been used the maximum number of times.';
  return null;
}

export async function findInvite(db: D1Database, code: string) {
  return db.prepare('SELECT * FROM teacher_invites WHERE code = ?').bind(code.trim()).first<InviteRow>();
}

/**
 * Links a student to the inviting teacher (and their class, if the invite names one).
 * Free: joining a teacher never needs a paid plan.
 */
export async function redeemInvite(db: D1Database, code: string, student: Pick<UserRow, 'id'>) {
  const inv = await findInvite(db, code);
  const problem = inviteProblem(inv);
  if (problem) throw badRequest(problem, { inviteCode: problem });
  if (inv!.teacher_id === student.id) throw badRequest('That is your own invite code.');
  const teacher = await db.prepare("SELECT id, name, role FROM users WHERE id = ? AND role IN ('teacher','admin') AND disabled_at IS NULL AND deleted_at IS NULL").bind(inv!.teacher_id).first<{ id: string; name: string }>();
  if (!teacher) throw badRequest('That teacher’s account is not active.');
  const linked = await linkStudent(db, teacher.id, student.id, 'invite', inv!.id);
  let classroomId: string | null = null;
  if (inv!.classroom_id) {
    const room = await db.prepare('SELECT id, archived_at FROM classrooms WHERE id = ? AND teacher_id = ?').bind(inv!.classroom_id, teacher.id).first<{ id: string; archived_at: string | null }>();
    if (room && !room.archived_at) {
      await db.prepare('INSERT OR IGNORE INTO classroom_members (classroom_id, user_id) VALUES (?, ?)').bind(room.id, student.id).run();
      classroomId = room.id;
    }
  }
  if (linked) await db.prepare('UPDATE teacher_invites SET used = used + 1 WHERE id = ?').bind(inv!.id).run();
  return { teacherId: teacher.id, teacherName: teacher.name, classroomId, linked };
}

/** Links to teachers a student picked from the public list at sign-up. Only listed, active teachers. */
export async function linkChosenTeachers(db: D1Database, studentId: string, teacherIds: string[]) {
  const ids = [...new Set(teacherIds)].slice(0, 3);
  const linked: string[] = [];
  for (const id of ids) {
    const t = await db.prepare("SELECT id FROM users WHERE id = ? AND role = 'teacher' AND teacher_listed = 1 AND disabled_at IS NULL AND deleted_at IS NULL").bind(id).first<{ id: string }>();
    if (t && (await linkStudent(db, t.id, studentId, 'chosen'))) linked.push(t.id);
  }
  return linked;
}

// ── Notifications ───────────────────────────────────────────────────────────

export interface Notice { kind: string; title: string; body?: string; link?: string }

/**
 * In-app notification for each user, plus an email when `email` is set and email is configured.
 * Emails go out in the background (waitUntil) so the teacher isn't kept waiting.
 */
export async function notify(env: Env, userIds: string[], n: Notice, opts: { email?: { base: string; cta: string; outro?: string }; wait?: (p: Promise<unknown>) => void } = {}) {
  const ids = [...new Set(userIds)];
  if (!ids.length) return;
  const db = env.DB;
  for (let i = 0; i < ids.length; i += 50) {
    await db.batch(ids.slice(i, i + 50).map((uid) => db.prepare('INSERT INTO notifications (id, user_id, kind, title, body, link) VALUES (?, ?, ?, ?, ?, ?)').bind(newId(), uid, n.kind, n.title.slice(0, 200), (n.body ?? '').slice(0, 1000), n.link ?? '')));
  }
  if (!opts.email || !emailConfigured(env)) return;
  const send = async () => {
    for (let i = 0; i < ids.length; i += 50) {
      const chunk = ids.slice(i, i + 50);
      const users = await db.prepare(`SELECT id, email, name FROM users WHERE id IN (${chunk.map(() => '?').join(',')}) AND disabled_at IS NULL AND deleted_at IS NULL AND email_verified_at IS NOT NULL`).bind(...chunk).all<{ id: string; email: string; name: string }>();
      for (const u of users.results) {
        const mail = actionEmail({ appName: env.APP_NAME, name: u.name.split(/\s+/)[0] ?? u.name, heading: n.title, intro: n.body ?? '', cta: opts.email!.cta, url: `${opts.email!.base}${n.link ?? ''}`, outro: opts.email!.outro ?? 'You can see everything in your notifications on the Academy.' });
        await sendEmail(env, { to: u.email, toName: u.name, subject: n.title, html: mail.html, text: mail.text }).catch((e) => console.error('[notify:email]', e));
      }
    }
  };
  if (opts.wait) opts.wait(send()); else await send();
}

/** A new teacher request: tell every admin in the app and by email, so approvals don't wait. */
export async function tellAdminsAboutTeacherRequest(env: Env, base: string, name: string, email: string) {
  const admins = await env.DB.prepare("SELECT id FROM users WHERE role = 'admin' AND disabled_at IS NULL AND deleted_at IS NULL").all<{ id: string }>();
  await notify(env, admins.results.map((a) => a.id), { kind: 'teacher_request', title: `${name} wants to teach`, body: `${name} (${email}) asked for a teacher account. Approve or decline it in the admin console.`, link: '/admin/teachers' }, { email: { base, cta: 'Review the request', outro: 'You get this email because you are an administrator of the Academy.' } });
}

/** Tell every admin about something waiting for them (in the app and by email). */
export async function tellAdmins(env: Env, base: string, n: Notice, wait?: (p: Promise<unknown>) => void) {
  const admins = await env.DB.prepare("SELECT id FROM users WHERE role = 'admin' AND disabled_at IS NULL AND deleted_at IS NULL").all<{ id: string }>();
  await notify(env, admins.results.map((a) => a.id), n, { email: { base, cta: 'Open the admin console', outro: 'You get this email because you are an administrator of the Academy.' }, wait });
}

// ── Commission ledger ───────────────────────────────────────────────────────

export async function commissionRateBp(db: D1Database): Promise<number> {
  const row = await db.prepare("SELECT value FROM settings WHERE key = 'commission_rate_bp'").first<{ value: string }>();
  const n = Number(row?.value ?? 1000);
  return Number.isFinite(n) && n >= 0 && n <= 5000 ? n : 1000;
}

/** Splits `pool` cents across n teachers; the first teachers get the leftover cent(s). */
export function splitCents(pool: number, n: number): number[] {
  if (n <= 0 || pool <= 0) return [];
  const base = Math.floor(pool / n);
  return Array.from({ length: n }, (_, i) => base + (i < pool - base * n ? 1 : 0));
}

/**
 * Credits commission for a settled payment to the student's teachers (split equally).
 * Idempotent: does nothing if the payment already has commission entries.
 */
export async function creditCommission(db: D1Database, payment: { id: string; user_id: string; amount_cents: number; reference: string }, teacherIds?: string[], actorId: string | null = null, note = '') {
  if (payment.amount_cents <= 0) return 0;
  // Net commission still standing on this payment (commission minus reversals). Non-zero = done.
  const standing = await db.prepare("SELECT COALESCE(SUM(amount_cents),0) AS cents FROM wallet_entries WHERE payment_id = ? AND kind IN ('commission','reversal')").bind(payment.id).first<{ cents: number }>();
  if ((standing?.cents ?? 0) !== 0) return 0;
  const teachers = teacherIds ?? (await db.prepare(
    `SELECT ts.teacher_id FROM teacher_students ts JOIN users u ON u.id = ts.teacher_id
     WHERE ts.student_id = ? AND u.role IN ('teacher','admin') AND u.disabled_at IS NULL AND u.deleted_at IS NULL ORDER BY ts.created_at`,
  ).bind(payment.user_id).all<{ teacher_id: string }>()).results.map((r) => r.teacher_id);
  if (!teachers.length) return 0;
  const pool = Math.round((payment.amount_cents * (await commissionRateBp(db))) / 10_000);
  const parts = splitCents(pool, teachers.length);
  if (!parts.length) return 0;
  await db.batch([
    ...teachers.map((t, i) => db.prepare("INSERT INTO wallet_entries (id, teacher_id, kind, amount_cents, payment_id, student_id, note, created_by) VALUES (?, ?, 'commission', ?, ?, ?, ?, ?)")
      .bind(newId(), t, parts[i], payment.id, payment.user_id, note || `${teachers.length > 1 ? `Shared commission (${teachers.length} teachers)` : 'Commission'} on ${payment.reference}`, actorId)),
    db.prepare('UPDATE payments SET commission_cents = ? WHERE id = ?').bind(pool, payment.id),
  ]);
  return pool;
}

/** Admin override: reverse this payment's commission and credit it to other teachers instead. */
export async function reassignCommission(db: D1Database, paymentId: string, teacherIds: string[], actor: Pick<UserRow, 'id'>, note: string) {
  const p = await db.prepare('SELECT id, user_id, amount_cents, reference, status FROM payments WHERE id = ?').bind(paymentId).first<{ id: string; user_id: string; amount_cents: number; reference: string; status: string }>();
  if (!p) throw notFound('Payment not found.');
  if (p.status !== 'paid') throw badRequest('Only paid payments earn commission.');
  const current = await db.prepare("SELECT teacher_id, SUM(amount_cents) AS cents FROM wallet_entries WHERE payment_id = ? AND kind IN ('commission','reversal') GROUP BY teacher_id HAVING cents != 0").bind(p.id).all<{ teacher_id: string; cents: number }>();
  const stmts = current.results.map((r) => db.prepare("INSERT INTO wallet_entries (id, teacher_id, kind, amount_cents, payment_id, student_id, note, created_by) VALUES (?, ?, 'reversal', ?, ?, ?, ?, ?)").bind(newId(), r.teacher_id, -r.cents, p.id, p.user_id, `Reversed by admin: ${note}`, actor.id));
  stmts.push(db.prepare('UPDATE payments SET commission_cents = 0 WHERE id = ?').bind(p.id));
  if (stmts.length) await db.batch(stmts);
  const valid: string[] = [];
  for (const t of [...new Set(teacherIds)]) {
    const ok = await db.prepare("SELECT id FROM users WHERE id = ? AND role IN ('teacher','admin')").bind(t).first();
    if (ok) valid.push(t);
  }
  const pool = valid.length ? await creditCommission(db, p, valid, actor.id, `Commission on ${p.reference} (set by admin: ${note})`) : 0;
  await audit(db, actor.id, 'commission.reassign', p.id, { teachers: valid, note, pool });
  return pool;
}

export async function walletBalance(db: D1Database, teacherId: string) {
  const r = await db.prepare(
    `SELECT COALESCE(SUM(amount_cents),0) AS balance,
            COALESCE(SUM(CASE WHEN kind IN ('commission','reversal') THEN amount_cents END),0) AS earned,
            COALESCE(-SUM(CASE WHEN kind = 'payout' THEN amount_cents END),0) AS paid_out
     FROM wallet_entries WHERE teacher_id = ?`,
  ).bind(teacherId).first<{ balance: number; earned: number; paid_out: number }>();
  return { balanceCents: r?.balance ?? 0, earnedCents: r?.earned ?? 0, paidOutCents: r?.paid_out ?? 0 };
}

