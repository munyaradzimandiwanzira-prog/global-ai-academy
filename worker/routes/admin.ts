import { createRouter, body, requirePermission } from '../app';
import { adminUserUpdateSchema, announcementSchema, promoCreateSchema, scholarshipSchema } from '@shared/schemas';
import type { Scholarship, WaitlistEntry } from '@shared/api-types';
import { toPromoDto, type PromoRow } from '../lib/pricing';
import { audit, nowIso, toPublicUser, type UserRow } from '../lib/db';
import { badRequest, notFound, conflict } from '../lib/errors';
import { newId } from '../lib/crypto';
import { destroyAllSessions } from '../lib/session';

const admin = createRouter();

admin.get('/stats', async (c) => {
  requirePermission(c, 'users.manage');
  const weekAgo = new Date(Date.now() - 7 * 86400_000).toISOString();
  const today = nowIso().slice(0, 10);
  const q = (sql: string, ...binds: unknown[]) => c.env.DB.prepare(sql).bind(...binds).first<{ n: number }>().then((r) => r?.n ?? 0);
  const [users, newUsers, active, teachers, paid, classes, lessonsWeek, revenueCents, pendingTeachers, contacts] = await Promise.all([
    q('SELECT COUNT(*) AS n FROM users'),
    q('SELECT COUNT(*) AS n FROM users WHERE created_at >= ?', weekAgo),
    q('SELECT COUNT(*) AS n FROM users WHERE last_active_day = ?', today),
    q("SELECT COUNT(*) AS n FROM users WHERE role = 'teacher'"),
    q("SELECT COUNT(*) AS n FROM users WHERE plan != 'free' AND (plan_expires_at IS NULL OR plan_expires_at > ?)", nowIso()),
    q('SELECT COUNT(*) AS n FROM classrooms WHERE archived_at IS NULL'),
    q("SELECT COUNT(*) AS n FROM progress WHERE status = 'completed' AND completed_at >= ?", weekAgo),
    q("SELECT COALESCE(SUM(amount_cents),0) AS n FROM payments WHERE status = 'paid'"),
    q("SELECT COUNT(*) AS n FROM teacher_requests WHERE status = 'pending'"),
    q('SELECT COUNT(*) AS n FROM contact_messages WHERE handled_at IS NULL'),
  ]);
  const signups = await c.env.DB.prepare("SELECT date(created_at) AS day, COUNT(*) AS n FROM users WHERE created_at >= date('now','-29 days') GROUP BY day ORDER BY day").all<{ day: string; n: number }>();
  const popular = await c.env.DB.prepare("SELECT track_id, COUNT(DISTINCT user_id) AS learners FROM progress GROUP BY track_id ORDER BY learners DESC LIMIT 8").all<{ track_id: string; learners: number }>();
  return c.json({ users, newUsers, active, teachers, paid, classes, lessonsWeek, revenueCents, pendingTeachers, contacts, signups: signups.results, popular: popular.results });
});

admin.get('/users', async (c) => {
  requirePermission(c, 'users.manage');
  const search = (c.req.query('q') ?? '').trim().slice(0, 80);
  const role = c.req.query('role');
  const page = Math.max(0, Number(c.req.query('page') ?? 0) || 0);
  const where: string[] = [];
  const binds: unknown[] = [];
  if (search) {
    where.push('(email LIKE ? OR name LIKE ?)');
    binds.push(`%${search}%`, `%${search}%`);
  }
  if (role === 'student' || role === 'teacher' || role === 'admin') {
    where.push('role = ?');
    binds.push(role);
  }
  const sql = `SELECT * FROM users ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY created_at DESC LIMIT 50 OFFSET ?`;
  const rows = await c.env.DB.prepare(sql).bind(...binds, page * 50).all<UserRow>();
  const total = await c.env.DB.prepare(`SELECT COUNT(*) AS n FROM users ${where.length ? 'WHERE ' + where.join(' AND ') : ''}`).bind(...binds).first<{ n: number }>();
  return c.json({ users: rows.results.map((u) => ({ ...toPublicUser(u), disabled: !!u.disabled_at, lastActiveDay: u.last_active_day })), total: total?.n ?? 0 });
});

admin.patch('/users/:id', async (c) => {
  const actor = requirePermission(c, 'users.manage');
  const input = await body(c, adminUserUpdateSchema);
  const target = await c.env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(c.req.param('id')).first<UserRow>();
  if (!target) throw notFound('User not found.');
  if (target.id === actor.id && (input.role && input.role !== 'admin' || input.disabled)) {
    throw badRequest('You cannot remove your own admin access or disable yourself.');
  }
  const sets: string[] = [];
  const binds: unknown[] = [];
  if (input.role) { sets.push('role = ?'); binds.push(input.role); }
  if (input.plan) {
    sets.push('plan = ?', 'plan_expires_at = ?');
    binds.push(input.plan, input.plan === 'free' ? null : new Date(Date.now() + (input.planMonths ?? 12) * 30 * 86400_000).toISOString());
  }
  if (input.disabled !== undefined) { sets.push('disabled_at = ?'); binds.push(input.disabled ? nowIso() : null); }
  if (!sets.length) throw badRequest('Nothing to update.');
  sets.push('updated_at = ?'); binds.push(nowIso());
  await c.env.DB.prepare(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`).bind(...binds, target.id).run();
  if (input.disabled) await destroyAllSessions(c.env.DB, target.id);
  if (input.role === 'teacher') {
    await c.env.DB.prepare("UPDATE teacher_requests SET status = 'approved', reviewed_by = ?, reviewed_at = ? WHERE user_id = ? AND status = 'pending'").bind(actor.id, nowIso(), target.id).run();
  }
  await audit(c.env.DB, actor.id, 'admin.user_update', target.id, input);
  return c.json({ ok: true });
});

/** Clears two-step login for someone who lost their phone and recovery codes (after you have verified who they are). */
admin.post('/users/:id/reset-mfa', async (c) => {
  const actor = requirePermission(c, 'users.manage');
  if (c.req.param('id') === actor.id) throw badRequest('Ask another admin to reset your own two-step login.');
  const res = await c.env.DB.prepare('UPDATE users SET mfa_secret = NULL, mfa_pending_secret = NULL, mfa_enabled_at = NULL, mfa_last_step = NULL, updated_at = ? WHERE id = ?')
    .bind(nowIso(), c.req.param('id')).run();
  if (!res.meta.changes) throw notFound('User not found.');
  await c.env.DB.prepare('DELETE FROM mfa_recovery_codes WHERE user_id = ?').bind(c.req.param('id')).run();
  await destroyAllSessions(c.env.DB, c.req.param('id'));
  await audit(c.env.DB, actor.id, 'admin.mfa_reset', c.req.param('id'));
  return c.json({ ok: true });
});

admin.get('/teacher-requests', async (c) => {
  requirePermission(c, 'users.manage');
  const rows = await c.env.DB.prepare(
    `SELECT r.id, r.message, r.status, r.created_at, u.id AS user_id, u.name, u.email, u.city, u.school FROM teacher_requests r JOIN users u ON u.id = r.user_id
     ORDER BY r.status = 'pending' DESC, r.created_at DESC LIMIT 100`,
  ).all();
  return c.json({ requests: rows.results });
});

admin.post('/teacher-requests/:id/:decision', async (c) => {
  const actor = requirePermission(c, 'users.manage');
  const decision = c.req.param('decision');
  if (decision !== 'approve' && decision !== 'reject') throw badRequest('Decision must be approve or reject.');
  const req = await c.env.DB.prepare("SELECT user_id FROM teacher_requests WHERE id = ? AND status = 'pending'").bind(c.req.param('id')).first<{ user_id: string }>();
  if (!req) throw notFound('Request not found or already reviewed.');
  const stmts = [
    c.env.DB.prepare('UPDATE teacher_requests SET status = ?, reviewed_by = ?, reviewed_at = ? WHERE id = ?').bind(decision === 'approve' ? 'approved' : 'rejected', actor.id, nowIso(), c.req.param('id')),
  ];
  if (decision === 'approve') stmts.push(c.env.DB.prepare("UPDATE users SET role = 'teacher' WHERE id = ? AND role = 'student'").bind(req.user_id));
  await c.env.DB.batch(stmts);
  await audit(c.env.DB, actor.id, `teacher_request.${decision}`, req.user_id);
  return c.json({ ok: true });
});

admin.get('/classrooms', async (c) => {
  requirePermission(c, 'classroom.manage_any');
  const rows = await c.env.DB.prepare(
    `SELECT c.id, c.name, c.level, c.join_code, c.archived_at, c.created_at, u.name AS teacher_name,
      (SELECT COUNT(*) FROM classroom_members m WHERE m.classroom_id = c.id) AS members,
      (SELECT COUNT(*) FROM assignments a WHERE a.classroom_id = c.id) AS assignments
     FROM classrooms c JOIN users u ON u.id = c.teacher_id ORDER BY c.created_at DESC LIMIT 200`,
  ).all();
  return c.json({ classrooms: rows.results });
});

admin.get('/payments', async (c) => {
  requirePermission(c, 'payments.view');
  const rows = await c.env.DB.prepare(
    'SELECT p.*, u.name, u.email FROM payments p JOIN users u ON u.id = p.user_id ORDER BY p.created_at DESC LIMIT 200',
  ).all();
  return c.json({ payments: rows.results });
});

admin.get('/announcements', async (c) => {
  requirePermission(c, 'announcement.global');
  const rows = await c.env.DB.prepare('SELECT a.*, u.name AS author_name FROM announcements a JOIN users u ON u.id = a.author_id WHERE a.classroom_id IS NULL ORDER BY a.created_at DESC LIMIT 50').all();
  return c.json({ announcements: rows.results });
});

admin.post('/announcements', async (c) => {
  const actor = requirePermission(c, 'announcement.global');
  const input = await body(c, announcementSchema);
  await c.env.DB.prepare('INSERT INTO announcements (id, classroom_id, author_id, title, body) VALUES (?, NULL, ?, ?, ?)').bind(newId(), actor.id, input.title, input.body).run();
  return c.json({ ok: true }, 201);
});

admin.delete('/announcements/:id', async (c) => {
  requirePermission(c, 'announcement.global');
  await c.env.DB.prepare('DELETE FROM announcements WHERE id = ?').bind(c.req.param('id')).run();
  return c.json({ ok: true });
});

admin.get('/contacts', async (c) => {
  requirePermission(c, 'users.manage');
  const rows = await c.env.DB.prepare('SELECT * FROM contact_messages ORDER BY handled_at IS NOT NULL, created_at DESC LIMIT 100').all();
  return c.json({ messages: rows.results });
});

admin.post('/contacts/:id/handled', async (c) => {
  requirePermission(c, 'users.manage');
  await c.env.DB.prepare('UPDATE contact_messages SET handled_at = ? WHERE id = ?').bind(nowIso(), c.req.param('id')).run();
  return c.json({ ok: true });
});

admin.get('/audit', async (c) => {
  requirePermission(c, 'audit.view');
  const rows = await c.env.DB.prepare('SELECT l.*, u.name AS actor_name FROM audit_log l LEFT JOIN users u ON u.id = l.actor_id ORDER BY l.id DESC LIMIT 200').all();
  return c.json({ entries: rows.results });
});

// ── Promo codes ─────────────────────────────────────────────────────────────

admin.get('/promos', async (c) => {
  requirePermission(c, 'billing.manage');
  const rows = await c.env.DB.prepare('SELECT * FROM promo_codes ORDER BY active DESC, created_at DESC LIMIT 200').all<PromoRow>();
  return c.json({ promos: rows.results.map(toPromoDto) });
});

admin.post('/promos', async (c) => {
  const actor = requirePermission(c, 'billing.manage');
  const input = await body(c, promoCreateSchema);
  const exists = await c.env.DB.prepare('SELECT 1 FROM promo_codes WHERE code = ?').bind(input.code).first();
  if (exists) throw conflict('A promo code with that name already exists.');
  await c.env.DB.prepare('INSERT INTO promo_codes (code, percent_off, plans, periods, max_uses, expires_at, description, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    .bind(input.code, input.percentOff, JSON.stringify(input.plans), JSON.stringify(input.periods), input.maxUses ?? null, input.expiresAt ?? null, input.description, actor.id)
    .run();
  await audit(c.env.DB, actor.id, 'promo.create', input.code, input);
  return c.json({ ok: true }, 201);
});

admin.post('/promos/:code/:state', async (c) => {
  const actor = requirePermission(c, 'billing.manage');
  const state = c.req.param('state');
  if (state !== 'enable' && state !== 'disable') throw badRequest('State must be enable or disable.');
  const res = await c.env.DB.prepare('UPDATE promo_codes SET active = ? WHERE code = ?').bind(state === 'enable' ? 1 : 0, c.req.param('code')).run();
  if (!res.meta.changes) throw notFound('Promo code not found.');
  await audit(c.env.DB, actor.id, `promo.${state}`, c.req.param('code'));
  return c.json({ ok: true });
});

// ── Scholarships ────────────────────────────────────────────────────────────

admin.get('/scholarships', async (c) => {
  requirePermission(c, 'billing.manage');
  const rows = await c.env.DB.prepare(
    `SELECT s.*, u.name AS user_name, u.email AS user_email, g.name AS granted_by_name FROM scholarships s
     JOIN users u ON u.id = s.user_id JOIN users g ON g.id = s.granted_by ORDER BY s.created_at DESC LIMIT 200`,
  ).all<{ id: string; user_name: string; user_email: string; plan: 'plus' | 'academy'; label: string; reason: string; months: number; starts_at: string; expires_at: string; granted_by_name: string; revoked_at: string | null }>();
  const scholarships: Scholarship[] = rows.results.map((r) => ({
    id: r.id, userName: r.user_name, userEmail: r.user_email, plan: r.plan, label: r.label, reason: r.reason, months: r.months,
    startsAt: r.starts_at, expiresAt: r.expires_at, grantedBy: r.granted_by_name, revoked: !!r.revoked_at,
  }));
  return c.json({ scholarships });
});

admin.post('/scholarships', async (c) => {
  const actor = requirePermission(c, 'billing.manage');
  const input = await body(c, scholarshipSchema);
  const target = await c.env.DB.prepare('SELECT * FROM users WHERE email = ?').bind(input.email).first<UserRow>();
  if (!target) throw notFound('No account uses that email. Ask the learner to sign up first.', );
  const starts = nowIso();
  const expires = new Date(Date.now() + input.months * 30 * 86400_000).toISOString();
  await c.env.DB.batch([
    c.env.DB.prepare('INSERT INTO scholarships (id, user_id, plan, label, reason, months, starts_at, expires_at, granted_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .bind(newId(), target.id, input.plan, input.label, input.reason, input.months, starts, expires, actor.id),
    c.env.DB.prepare('UPDATE users SET plan = ?, plan_expires_at = ?, updated_at = ? WHERE id = ?').bind(input.plan, expires, starts, target.id),
  ]);
  await audit(c.env.DB, actor.id, 'scholarship.grant', target.id, input);
  return c.json({ ok: true }, 201);
});

admin.post('/scholarships/:id/revoke', async (c) => {
  const actor = requirePermission(c, 'billing.manage');
  const row = await c.env.DB.prepare('SELECT user_id, expires_at FROM scholarships WHERE id = ? AND revoked_at IS NULL').bind(c.req.param('id')).first<{ user_id: string; expires_at: string }>();
  if (!row) throw notFound('Scholarship not found or already revoked.');
  await c.env.DB.batch([
    c.env.DB.prepare('UPDATE scholarships SET revoked_at = ? WHERE id = ?').bind(nowIso(), c.req.param('id')),
    // Only end the plan if it is still the one this scholarship granted (a later payment is left alone).
    c.env.DB.prepare("UPDATE users SET plan = 'free', plan_expires_at = NULL, updated_at = ? WHERE id = ? AND plan_expires_at = ?").bind(nowIso(), row.user_id, row.expires_at),
  ]);
  await audit(c.env.DB, actor.id, 'scholarship.revoke', row.user_id);
  return c.json({ ok: true });
});

// ── Waitlist ────────────────────────────────────────────────────────────────

admin.get('/waitlist', async (c) => {
  requirePermission(c, 'users.manage');
  const rows = await c.env.DB.prepare('SELECT * FROM waitlist ORDER BY created_at DESC LIMIT 500').all<{ id: string; name: string; email: string; plan: string; note: string; created_at: string }>();
  const entries: WaitlistEntry[] = rows.results.map((r) => ({ id: r.id, name: r.name, email: r.email, plan: r.plan, note: r.note, createdAt: r.created_at }));
  return c.json({ entries });
});

export default admin;
