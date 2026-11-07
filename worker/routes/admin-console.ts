/**
 * Admin console, part two: money, teachers, learners, traffic and full data control.
 *
 * Every route needs the admin role (which itself needs two-step login). Every change is written
 * to the audit log with what changed. Secrets (password hashes, two-step secrets, sessions,
 * tokens) are never readable or editable here, and the audit log itself is read-only.
 */
import { createRouter, body, requirePermission, type Ctx } from '../app';
import { commissionOverrideSchema, payoutDecisionSchema, dataRowSchema, linkSchema, platformSettingsSchema, walletEntrySchema } from '@shared/schemas';
import { z } from 'zod';
import { PLANS, isPurchasable } from '@shared/config';
import { audit, nowIso, parseJson } from '../lib/db';
import { newId, randomCode } from '../lib/crypto';
import { badRequest, notFound, forbidden } from '../lib/errors';
import { commissionRateBp, linkStudent, notify, reassignCommission, walletBalance } from '../lib/teaching';
import { toPayout, usd, type PayoutRow } from '../lib/payouts';
import { PAYOUT_METHODS } from '@shared/teaching';
import { appBase } from '../lib/urls';
import { studentDetail } from '../lib/students';
import { settle, type PaymentRow } from './payments';

const console_ = createRouter();
const adminOnly = (c: Ctx) => requirePermission(c, 'users.manage');
const days = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();

// ── Finance ───────────────────────────────────────────────────────────────

console_.get('/finance', async (c) => {
  adminOnly(c);
  const db = c.env.DB;
  const monthStart = `${nowIso().slice(0, 7)}-01`;
  const [totals, byMonth, byPlan, active, ledger, teachers, recent] = await Promise.all([
    db.prepare(
      `SELECT COALESCE(SUM(amount_cents),0) AS all_time,
              COALESCE(SUM(CASE WHEN updated_at >= ? THEN amount_cents END),0) AS last30,
              COALESCE(SUM(CASE WHEN updated_at >= ? THEN amount_cents END),0) AS this_month,
              COUNT(*) AS payments, COALESCE(SUM(commission_cents),0) AS commission
       FROM payments WHERE status = 'paid'`,
    ).bind(days(30), monthStart).first<{ all_time: number; last30: number; this_month: number; payments: number; commission: number }>(),
    db.prepare("SELECT substr(updated_at, 1, 7) AS month, SUM(amount_cents) AS cents, SUM(commission_cents) AS commission, COUNT(*) AS n FROM payments WHERE status = 'paid' AND updated_at >= ? GROUP BY month ORDER BY month").bind(days(365)).all<{ month: string; cents: number; commission: number; n: number }>(),
    db.prepare("SELECT plan, period, COUNT(*) AS n, SUM(amount_cents) AS cents FROM payments WHERE status = 'paid' GROUP BY plan, period").all<{ plan: string; period: string; n: number; cents: number }>(),
    // Monthly recurring revenue: every active paid plan at its latest monthly-equivalent price.
    db.prepare(
      `SELECT u.plan, (SELECT p.period FROM payments p WHERE p.user_id = u.id AND p.status = 'paid' ORDER BY p.updated_at DESC LIMIT 1) AS period,
              (SELECT p.amount_cents FROM payments p WHERE p.user_id = u.id AND p.status = 'paid' ORDER BY p.updated_at DESC LIMIT 1) AS cents
       FROM users u WHERE u.plan != 'free' AND u.plan_expires_at > ? AND u.deleted_at IS NULL`,
    ).bind(nowIso()).all<{ plan: string; period: string | null; cents: number | null }>(),
    db.prepare(
      `SELECT COALESCE(SUM(CASE WHEN kind IN ('commission','reversal') THEN amount_cents END),0) AS earned,
              COALESCE(-SUM(CASE WHEN kind = 'payout' THEN amount_cents END),0) AS paid_out,
              COALESCE(SUM(CASE WHEN kind = 'adjustment' THEN amount_cents END),0) AS adjustments,
              COALESCE(SUM(amount_cents),0) AS owed FROM wallet_entries`,
    ).first<{ earned: number; paid_out: number; adjustments: number; owed: number }>(),
    db.prepare(
      `SELECT u.id, u.name, u.email,
         (SELECT COUNT(*) FROM teacher_students ts WHERE ts.teacher_id = u.id) AS students,
         (SELECT COUNT(DISTINCT w.student_id) FROM wallet_entries w WHERE w.teacher_id = u.id AND w.kind = 'commission') AS paying,
         (SELECT COALESCE(SUM(amount_cents),0) FROM wallet_entries w WHERE w.teacher_id = u.id AND w.kind IN ('commission','reversal')) AS earned,
         (SELECT COALESCE(-SUM(amount_cents),0) FROM wallet_entries w WHERE w.teacher_id = u.id AND w.kind = 'payout') AS paid_out,
         (SELECT COALESCE(SUM(amount_cents),0) FROM wallet_entries w WHERE w.teacher_id = u.id) AS balance
       FROM users u WHERE u.deleted_at IS NULL AND (u.role = 'teacher' OR EXISTS (SELECT 1 FROM wallet_entries w WHERE w.teacher_id = u.id)) ORDER BY balance DESC, earned DESC LIMIT 200`,
    ).all<{ id: string; name: string; email: string; students: number; paying: number; earned: number; paid_out: number; balance: number }>(),
    db.prepare(
      `SELECT p.id, p.reference, p.provider, p.plan, p.period, p.amount_cents, p.commission_cents, p.status, p.updated_at, u.name, u.email,
         (SELECT GROUP_CONCAT(x.name, ', ') FROM (SELECT t.name FROM wallet_entries w JOIN users t ON t.id = w.teacher_id WHERE w.payment_id = p.id AND w.kind IN ('commission','reversal') GROUP BY w.teacher_id HAVING SUM(w.amount_cents) > 0) x) AS teachers,
         (SELECT GROUP_CONCAT(x.teacher_id, ',') FROM (SELECT w.teacher_id FROM wallet_entries w WHERE w.payment_id = p.id AND w.kind IN ('commission','reversal') GROUP BY w.teacher_id HAVING SUM(w.amount_cents) > 0) x) AS teacher_ids
       FROM payments p JOIN users u ON u.id = p.user_id ORDER BY p.created_at DESC LIMIT 100`,
    ).all(),
  ]);
  const mrr = active.results.reduce((n, r) => {
    const price = r.cents ?? (PLANS[r.plan as keyof typeof PLANS]?.priceUsdMonthly ?? 0) * 100;
    return n + (r.period === 'yearly' ? price / 12 : price);
  }, 0);
  return c.json({
    totals: { ...totals, mrr: Math.round(mrr), activeSubscribers: active.results.length, ratePercent: (await commissionRateBp(db)) / 100 },
    byMonth: byMonth.results, byPlan: byPlan.results, ledger, teachers: teachers.results, payments: recent.results,
  });
});

/** Record money received outside Paynow (bank transfer, cash, EcoCash direct). Extends the plan and pays commission. */
const manualPaymentSchema = z.object({
  email: z.string().email(),
  plan: z.enum(['plus', 'academy']),
  period: z.enum(['monthly', 'yearly']),
  amountCents: z.number().int().min(0).max(10_000_000),
  note: z.string().trim().min(3).max(300),
});

console_.post('/payments/manual', async (c) => {
  const actor = adminOnly(c);
  const input = await body(c, manualPaymentSchema);
  if (!isPurchasable(input.plan)) throw badRequest('Unknown plan.');
  const u = await c.env.DB.prepare('SELECT id FROM users WHERE email = ? AND deleted_at IS NULL').bind(input.email).first<{ id: string }>();
  if (!u) throw notFound('No account uses that email.');
  const id = newId();
  const reference = `MAN-${randomCode(8)}`;
  await c.env.DB.prepare("INSERT INTO payments (id, user_id, provider, reference, plan, period, amount_cents, list_price_cents) VALUES (?, ?, 'manual', ?, ?, ?, ?, ?)")
    .bind(id, u.id, reference, input.plan, input.period, input.amountCents, input.amountCents).run();
  const row: PaymentRow = { id, user_id: u.id, reference, plan: input.plan, period: input.period, amount_cents: input.amountCents, status: 'pending', poll_url: null, promo_code: null };
  await settle(c.env.DB, row, `manual:${actor.id}`, c.env);
  await audit(c.env.DB, actor.id, 'payment.manual', id, input);
  return c.json({ reference }, 201);
});

console_.post('/payments/:id/commission', async (c) => {
  const actor = adminOnly(c);
  const input = await body(c, commissionOverrideSchema);
  const pool = await reassignCommission(c.env.DB, c.req.param('id'), input.teacherIds, actor, input.note);
  return c.json({ ok: true, commissionCents: pool });
});

console_.post('/wallets/entries', async (c) => {
  const actor = adminOnly(c);
  const input = await body(c, walletEntrySchema);
  const t = await c.env.DB.prepare("SELECT id FROM users WHERE id = ? AND role IN ('teacher','admin')").bind(input.teacherId).first();
  if (!t) throw notFound('Teacher not found.');
  // A payout is money sent to the teacher: always recorded as a negative amount, never above the balance.
  const amount = input.kind === 'payout' ? -Math.abs(input.amountCents) : input.amountCents;
  if (input.kind === 'payout' && Math.abs(amount) > (await walletBalance(c.env.DB, input.teacherId)).balanceCents) throw badRequest('That payout is more than the teacher’s balance.', { amountCents: 'More than the balance' });
  const id = newId();
  await c.env.DB.prepare('INSERT INTO wallet_entries (id, teacher_id, kind, amount_cents, note, created_by) VALUES (?, ?, ?, ?, ?, ?)').bind(id, input.teacherId, input.kind, amount, input.note, actor.id).run();
  await audit(c.env.DB, actor.id, `wallet.${input.kind}`, input.teacherId, { amount, note: input.note });
  return c.json({ id, balanceCents: (await walletBalance(c.env.DB, input.teacherId)).balanceCents }, 201);
});

// ── Payout requests ───────────────────────────────────────────────────────

console_.get('/payouts', async (c) => {
  adminOnly(c);
  const status = c.req.query('status');
  const rows = await c.env.DB.prepare(
    `SELECT r.*, u.name AS teacher_name, u.email AS teacher_email,
       (SELECT COALESCE(SUM(amount_cents),0) FROM wallet_entries w WHERE w.teacher_id = r.teacher_id) AS balance
     FROM payout_requests r JOIN users u ON u.id = r.teacher_id
     ${status ? 'WHERE r.status = ?' : ''} ORDER BY r.status = 'pending' DESC, r.created_at DESC LIMIT 100`,
  ).bind(...(status ? [status] : [])).all<PayoutRow>();
  return c.json({ requests: rows.results.map((r) => toPayout(r, true)) });
});

async function pendingPayout(db: D1Database, id: string) {
  const r = await db.prepare("SELECT * FROM payout_requests WHERE id = ? AND status = 'pending'").bind(id).first<PayoutRow>();
  if (!r) throw notFound('That request is not waiting any more.');
  return r;
}

/** The admin has sent the money: record the payout in the wallet ledger and tell the teacher. */
console_.post('/payouts/:id/pay', async (c) => {
  const actor = adminOnly(c);
  const input = await body(c, payoutDecisionSchema);
  const db = c.env.DB;
  const r = await pendingPayout(db, c.req.param('id'));
  const { balanceCents } = await walletBalance(db, r.teacher_id);
  if (r.amount_cents > balanceCents) throw badRequest(`This is more than the teacher’s balance (${usd(balanceCents)}). Reject it, or adjust the wallet first.`);
  const entryId = newId();
  const method = PAYOUT_METHODS.find((m) => m.id === r.method)?.label ?? r.method;
  const note = [`Payout by ${method}`, input.reference && `ref ${input.reference}`, input.note].filter(Boolean).join(' · ').slice(0, 300);
  // Only the request that is still pending is paid, so a double click can't pay twice.
  const [done] = await db.batch([
    db.prepare("UPDATE payout_requests SET status = 'paid', reference = ?, admin_note = ?, wallet_entry_id = ?, reviewed_by = ?, reviewed_at = ? WHERE id = ? AND status = 'pending'")
      .bind(input.reference, input.note, entryId, actor.id, nowIso(), r.id),
    db.prepare("INSERT INTO wallet_entries (id, teacher_id, kind, amount_cents, note, created_by) SELECT ?, ?, 'payout', ?, ?, ? WHERE changes() = 1")
      .bind(entryId, r.teacher_id, -r.amount_cents, note, actor.id),
  ]);
  if (!done!.meta.changes) throw notFound('That request is not waiting any more.');
  await audit(db, actor.id, 'payout.pay', r.id, { teacherId: r.teacher_id, amountCents: r.amount_cents, reference: input.reference });
  await notify(c.env, [r.teacher_id], { kind: 'payout_paid', title: `${usd(r.amount_cents)} is on its way`, body: `We sent your payout by ${method}${input.reference ? ` (reference ${input.reference})` : ''}.${input.note ? ` ${input.note}` : ''}`, link: '/teach/wallet' },
    { email: { base: appBase(c.req.url, c.env.APP_URL), cta: 'Open your wallet', outro: 'You get this email because you teach on the Academy.' }, wait: (p) => c.executionCtx.waitUntil(p.catch((e) => console.error('[payout:email]', e))) });
  return c.json({ ok: true, balanceCents: (await walletBalance(db, r.teacher_id)).balanceCents });
});

console_.post('/payouts/:id/reject', async (c) => {
  const actor = adminOnly(c);
  const input = await body(c, payoutDecisionSchema);
  if (input.note.length < 3) throw badRequest('Tell the teacher why.', { note: 'Tell the teacher why' });
  const db = c.env.DB;
  const r = await pendingPayout(db, c.req.param('id'));
  await db.prepare("UPDATE payout_requests SET status = 'rejected', admin_note = ?, reviewed_by = ?, reviewed_at = ? WHERE id = ? AND status = 'pending'").bind(input.note, actor.id, nowIso(), r.id).run();
  await audit(db, actor.id, 'payout.reject', r.id, { note: input.note });
  await notify(c.env, [r.teacher_id], { kind: 'payout_rejected', title: `Your ${usd(r.amount_cents)} payout request needs a change`, body: input.note, link: '/teach/wallet' },
    { email: { base: appBase(c.req.url, c.env.APP_URL), cta: 'Open your wallet', outro: 'You get this email because you teach on the Academy.' }, wait: (p) => c.executionCtx.waitUntil(p.catch((e) => console.error('[payout:email]', e))) });
  return c.json({ ok: true });
});

console_.get('/settings', async (c) => {
  adminOnly(c);
  return c.json({ commissionRatePercent: (await commissionRateBp(c.env.DB)) / 100 });
});

console_.put('/settings', async (c) => {
  const actor = adminOnly(c);
  const input = await body(c, platformSettingsSchema);
  const bp = Math.round(input.commissionRatePercent * 100);
  await c.env.DB.prepare("INSERT INTO settings (key, value, updated_by, updated_at) VALUES ('commission_rate_bp', ?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_by = excluded.updated_by, updated_at = excluded.updated_at")
    .bind(String(bp), actor.id, nowIso()).run();
  await audit(c.env.DB, actor.id, 'settings.commission_rate', 'commission_rate_bp', { percent: input.commissionRatePercent });
  return c.json({ ok: true });
});

// ── Teachers and learners ─────────────────────────────────────────────────

console_.get('/teachers', async (c) => {
  adminOnly(c);
  const rows = await c.env.DB.prepare(
    `SELECT u.id, u.name, u.email, u.school, u.city, u.last_active_day, u.created_at, u.teacher_listed,
       (SELECT COUNT(*) FROM teacher_students ts WHERE ts.teacher_id = u.id) AS students,
       (SELECT COUNT(*) FROM classrooms c WHERE c.teacher_id = u.id AND c.archived_at IS NULL) AS classes,
       (SELECT COUNT(*) FROM assignments a JOIN classrooms c ON c.id = a.classroom_id WHERE c.teacher_id = u.id) AS assignments,
       (SELECT COUNT(*) FROM lesson_plans lp WHERE lp.teacher_id = u.id) AS plans,
       (SELECT COUNT(*) FROM student_reports r WHERE r.author_id = u.id) AS reports,
       (SELECT COUNT(*) FROM teacher_invites i WHERE i.teacher_id = u.id AND i.revoked_at IS NULL) AS invites,
       (SELECT COALESCE(SUM(amount_cents),0) FROM wallet_entries w WHERE w.teacher_id = u.id) AS balance
     FROM users u WHERE u.role = 'teacher' AND u.deleted_at IS NULL ORDER BY students DESC, u.name LIMIT 300`,
  ).all();
  return c.json({ teachers: rows.results });
});

/** Everything about one learner: account, plan, payments, teachers, classes and learning detail. */
console_.get('/learners/:id', async (c) => {
  const actor = adminOnly(c);
  const id = c.req.param('id');
  const db = c.env.DB;
  const u = await db.prepare('SELECT id, email, email_verified_at, name, role, plan, plan_expires_at, level, city, school, bio, xp, streak, last_active_day, last_lesson, disabled_at, trial_used_at, mfa_enabled_at, terms_accepted_at, created_at FROM users WHERE id = ?').bind(id).first();
  if (!u) throw notFound('User not found.');
  const [teachers, classes, payments, detail, reports, zuva] = await Promise.all([
    db.prepare('SELECT u.id, u.name, u.email, ts.source, ts.created_at FROM teacher_students ts JOIN users u ON u.id = ts.teacher_id WHERE ts.student_id = ?').bind(id).all(),
    db.prepare('SELECT c.id, c.name, t.name AS teacher_name, m.joined_at FROM classroom_members m JOIN classrooms c ON c.id = m.classroom_id JOIN users t ON t.id = c.teacher_id WHERE m.user_id = ?').bind(id).all(),
    db.prepare('SELECT id, reference, provider, plan, period, amount_cents, commission_cents, status, created_at FROM payments WHERE user_id = ? ORDER BY created_at DESC').bind(id).all(),
    studentDetail(db, actor.id, id, true),
    db.prepare('SELECT r.id, r.content, r.created_at, a.name AS author_name FROM student_reports r JOIN users a ON a.id = r.author_id WHERE r.student_id = ? ORDER BY r.created_at DESC LIMIT 10').bind(id).all<{ id: string; content: string; created_at: string; author_name: string }>(),
    db.prepare('SELECT (SELECT COUNT(*) FROM zuva_memories WHERE user_id = ?1) AS memories, (SELECT COUNT(*) FROM zuva_threads WHERE user_id = ?1) AS threads').bind(id).first(),
  ]);
  await audit(db, actor.id, 'admin.view_learner', id);
  return c.json({ user: u, teachers: teachers.results, classes: classes.results, payments: payments.results, detail, zuva, reports: reports.results.map((r) => ({ id: r.id, createdAt: r.created_at, authorName: r.author_name, content: parseJson(r.content, null) })) });
});

console_.post('/links', async (c) => {
  const actor = adminOnly(c);
  const input = await body(c, linkSchema);
  const t = await c.env.DB.prepare("SELECT id FROM users WHERE id = ? AND role IN ('teacher','admin')").bind(input.teacherId).first();
  const s = await c.env.DB.prepare('SELECT id FROM users WHERE id = ?').bind(input.studentId).first();
  if (!t || !s) throw notFound('Teacher or learner not found.');
  await linkStudent(c.env.DB, input.teacherId, input.studentId, 'admin');
  await audit(c.env.DB, actor.id, 'link.add', input.studentId, input);
  return c.json({ ok: true }, 201);
});

console_.delete('/links/:teacherId/:studentId', async (c) => {
  const actor = adminOnly(c);
  await c.env.DB.prepare('DELETE FROM teacher_students WHERE teacher_id = ? AND student_id = ?').bind(c.req.param('teacherId'), c.req.param('studentId')).run();
  await audit(c.env.DB, actor.id, 'link.remove', c.req.param('studentId'), { teacherId: c.req.param('teacherId') });
  return c.json({ ok: true });
});

// ── Traffic ───────────────────────────────────────────────────────────────

console_.get('/traffic', async (c) => {
  adminOnly(c);
  const n = Math.min(365, Math.max(7, Number(c.req.query('days')) || 30));
  const since = days(n - 1).slice(0, 10);
  const db = c.env.DB;
  const [daily, visitors, pages, dims] = await Promise.all([
    db.prepare('SELECT day, SUM(views) AS views FROM traffic_daily WHERE day >= ? GROUP BY day ORDER BY day').bind(since).all<{ day: string; views: number }>(),
    db.prepare('SELECT day, COUNT(*) AS visitors FROM traffic_visitors WHERE day >= ? GROUP BY day ORDER BY day').bind(since).all<{ day: string; visitors: number }>(),
    db.prepare('SELECT path, SUM(views) AS views FROM traffic_daily WHERE day >= ? GROUP BY path ORDER BY views DESC LIMIT 25').bind(since).all<{ path: string; views: number }>(),
    db.prepare('SELECT dim, value, SUM(views) AS views FROM traffic_dims WHERE day >= ? GROUP BY dim, value ORDER BY views DESC').bind(since).all<{ dim: string; value: string; views: number }>(),
  ]);
  const vis = new Map(visitors.results.map((v) => [v.day, v.visitors]));
  const series = Array.from({ length: n }, (_, i) => {
    const day = days(n - 1 - i).slice(0, 10);
    return { day, views: daily.results.find((d) => d.day === day)?.views ?? 0, visitors: vis.get(day) ?? 0 };
  });
  const group = (d: string) => dims.results.filter((x) => x.dim === d).slice(0, 12).map(({ value, views }) => ({ value, views }));
  const signups = await db.prepare('SELECT COUNT(*) AS n FROM users WHERE created_at >= ?').bind(since).first<{ n: number }>();
  return c.json({
    days: n, series, pages: pages.results, sources: group('source'), countries: group('country'), devices: group('device'), auth: group('auth'),
    totals: { views: series.reduce((a, s) => a + s.views, 0), visitors: series.reduce((a, s) => a + s.visitors, 0), signups: signups?.n ?? 0 },
  });
});

// ── Data explorer (create, read, update, delete) ─────────────────────────

/** Never shown or editable: credentials, sessions, tokens and internal tables. */
const HIDDEN_TABLES = /^(sessions|email_tokens|mfa_recovery_codes|mfa_challenges|rate_limits|media_cache|d1_migrations|_cf_.*|sqlite_.*)$/;
const READ_ONLY_TABLES = new Set(['audit_log']);
const SECRET_COLUMNS: Record<string, Set<string>> = { users: new Set(['password_hash', 'mfa_secret', 'mfa_pending_secret', 'mfa_last_step']) };

interface ColumnInfo { name: string; type: string; notnull: number; dflt_value: string | null; pk: number }

async function tableInfo(db: D1Database, table: string) {
  if (!/^[a-z_][a-z0-9_]*$/i.test(table) || HIDDEN_TABLES.test(table)) throw notFound('Unknown table.');
  const exists = await db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?").bind(table).first();
  if (!exists) throw notFound('Unknown table.');
  const cols = (await db.prepare(`PRAGMA table_info("${table}")`).all<ColumnInfo>()).results;
  const secret = SECRET_COLUMNS[table] ?? new Set<string>();
  const visible = cols.filter((c) => !secret.has(c.name));
  const pk = cols.filter((c) => c.pk > 0).sort((a, b) => a.pk - b.pk).map((c) => c.name);
  return { cols: visible, pk: pk.length ? pk : ['rowid'], readOnly: READ_ONLY_TABLES.has(table), secret };
}

const q = (n: string) => `"${n.replace(/"/g, '')}"`;

console_.get('/data', async (c) => {
  adminOnly(c);
  const tables = (await c.env.DB.prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name").all<{ name: string }>()).results.map((t) => t.name).filter((t) => !HIDDEN_TABLES.test(t));
  const counts = await c.env.DB.batch(tables.map((t) => c.env.DB.prepare(`SELECT COUNT(*) AS n FROM ${q(t)}`)));
  return c.json({ tables: tables.map((t, i) => ({ name: t, rows: (counts[i]!.results[0] as { n: number }).n, readOnly: READ_ONLY_TABLES.has(t) })) });
});

console_.get('/data/:table', async (c) => {
  adminOnly(c);
  const table = c.req.param('table');
  const info = await tableInfo(c.env.DB, table);
  const limit = Math.min(200, Math.max(1, Number(c.req.query('limit')) || 50));
  const offset = Math.max(0, Number(c.req.query('offset')) || 0);
  const search = (c.req.query('q') ?? '').trim().slice(0, 100);
  const textCols = info.cols.filter((x) => /CHAR|TEXT|CLOB|^$/i.test(x.type)).map((x) => x.name);
  const where = search && textCols.length ? `WHERE ${textCols.map((x) => `${q(x)} LIKE ?`).join(' OR ')}` : '';
  const binds = where ? textCols.map(() => `%${search}%`) : [];
  const order = info.cols.some((x) => x.name === 'created_at') ? 'ORDER BY created_at DESC' : info.cols.some((x) => x.name === 'day') ? 'ORDER BY day DESC' : '';
  const select = [...(info.pk[0] === 'rowid' ? ['rowid'] : []), ...info.cols.map((x) => x.name)].map(q).join(', ');
  const [rows, total] = await Promise.all([
    c.env.DB.prepare(`SELECT ${select} FROM ${q(table)} ${where} ${order} LIMIT ? OFFSET ?`).bind(...binds, limit, offset).all(),
    c.env.DB.prepare(`SELECT COUNT(*) AS n FROM ${q(table)} ${where}`).bind(...binds).first<{ n: number }>(),
  ]);
  return c.json({ table, columns: info.cols.map((x) => ({ name: x.name, type: x.type, required: !!x.notnull && x.dflt_value === null && !x.pk, pk: info.pk.includes(x.name) })), pk: info.pk, readOnly: info.readOnly, rows: rows.results, total: total?.n ?? 0 });
});

function pkWhere(info: { pk: string[] }, keyJson: string | undefined) {
  const key = parseJson<Record<string, string | number>>(keyJson ?? '', {});
  if (!info.pk.every((k) => key[k] !== undefined && key[k] !== null)) throw badRequest('Missing the row key.');
  return { sql: info.pk.map((k) => `${q(k)} = ?`).join(' AND '), binds: info.pk.map((k) => key[k]!) };
}

function cleanValues(info: { cols: ColumnInfo[]; secret: Set<string> }, values: Record<string, string | number | null>) {
  const allowed = new Set(info.cols.map((x) => x.name));
  const entries = Object.entries(values).filter(([k]) => allowed.has(k) && !info.secret.has(k));
  if (!entries.length) throw badRequest('Nothing to save.');
  return entries;
}

console_.put('/data/:table/row', async (c) => {
  const actor = adminOnly(c);
  const table = c.req.param('table');
  const info = await tableInfo(c.env.DB, table);
  if (info.readOnly) throw forbidden('This table is read-only.');
  const where = pkWhere(info, c.req.query('key'));
  const { values } = await body(c, dataRowSchema);
  const entries = cleanValues(info, values).filter(([k]) => !info.pk.includes(k));
  if (!entries.length) throw badRequest('Nothing to save.');
  const before = await c.env.DB.prepare(`SELECT * FROM ${q(table)} WHERE ${where.sql}`).bind(...where.binds).first();
  if (!before) throw notFound('Row not found.');
  if (table === 'users' && where.binds[0] === actor.id && entries.some(([k, v]) => (k === 'role' && v !== 'admin') || (k === 'disabled_at' && v))) throw badRequest('You cannot remove your own admin access here.');
  await c.env.DB.prepare(`UPDATE ${q(table)} SET ${entries.map(([k]) => `${q(k)} = ?`).join(', ')} WHERE ${where.sql}`).bind(...entries.map(([, v]) => v), ...where.binds).run();
  const changed = Object.fromEntries(entries.map(([k, v]) => [k, { from: (before as Record<string, unknown>)[k] ?? null, to: v }]));
  await audit(c.env.DB, actor.id, 'data.update', `${table}:${JSON.stringify(where.binds)}`, changed);
  return c.json({ ok: true });
});

console_.post('/data/:table', async (c) => {
  const actor = adminOnly(c);
  const table = c.req.param('table');
  const info = await tableInfo(c.env.DB, table);
  if (info.readOnly) throw forbidden('This table is read-only.');
  const { values } = await body(c, dataRowSchema);
  const entries = cleanValues(info, values);
  // Text primary keys called "id" get a fresh id when left empty.
  if (info.pk.length === 1 && info.pk[0] === 'id' && !entries.some(([k]) => k === 'id')) entries.unshift(['id', newId()]);
  if (table === 'users') throw badRequest('Create accounts through sign-up, then edit them here (passwords are never set by hand).');
  await c.env.DB.prepare(`INSERT INTO ${q(table)} (${entries.map(([k]) => q(k)).join(', ')}) VALUES (${entries.map(() => '?').join(', ')})`).bind(...entries.map(([, v]) => v)).run();
  await audit(c.env.DB, actor.id, 'data.insert', table, Object.fromEntries(entries));
  return c.json({ ok: true }, 201);
});

console_.delete('/data/:table/row', async (c) => {
  const actor = adminOnly(c);
  const table = c.req.param('table');
  const info = await tableInfo(c.env.DB, table);
  if (info.readOnly) throw forbidden('This table is read-only.');
  const where = pkWhere(info, c.req.query('key'));
  if (table === 'users' && where.binds[0] === actor.id) throw badRequest('You cannot delete your own account here.');
  const before = await c.env.DB.prepare(`SELECT * FROM ${q(table)} WHERE ${where.sql}`).bind(...where.binds).first<Record<string, unknown>>();
  if (!before) throw notFound('Row not found.');
  await c.env.DB.prepare(`DELETE FROM ${q(table)} WHERE ${where.sql}`).bind(...where.binds).run();
  for (const k of info.secret) delete before[k];
  await audit(c.env.DB, actor.id, 'data.delete', `${table}:${JSON.stringify(where.binds)}`, before);
  return c.json({ ok: true });
});

export default console_;
