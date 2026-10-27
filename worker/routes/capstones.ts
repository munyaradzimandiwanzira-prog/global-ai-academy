import { createRouter, body, requireUser, requirePermission } from '../app';
import { capstoneSchema, capstoneReviewSchema } from '@shared/schemas';
import type { Capstone } from '@shared/api-types';
import { XP } from '@shared/config';
import { can } from '@shared/rbac';
import { audit, effectivePlan, nowIso } from '../lib/db';
import { newId } from '../lib/crypto';
import { forbidden, notFound, upgradeRequired, badRequest } from '../lib/errors';
import { awardXp } from '../lib/xp';

/**
 * Capstone projects: the portfolio piece that closes a career path.
 * Academy learners submit; their class teachers (or any admin) review and grade.
 */
const capstones = createRouter();

interface CapstoneRow {
  id: string; user_id: string; career_id: string | null; title: string; summary: string; stack: string; repo_url: string;
  demo_url: string; status: Capstone['status']; mentor_id: string | null; feedback: string | null; grade: number | null;
  created_at: string; updated_at: string; learner_name?: string; mentor_name?: string | null;
}

const toCapstone = (r: CapstoneRow): Capstone => ({
  id: r.id, careerId: r.career_id, title: r.title, summary: r.summary, stack: r.stack, repoUrl: r.repo_url, demoUrl: r.demo_url,
  status: r.status, feedback: r.feedback, grade: r.grade, createdAt: r.created_at, updatedAt: r.updated_at,
  learnerName: r.learner_name, mentorName: r.mentor_name ?? null,
});

const SELECT = `SELECT p.*, u.name AS learner_name, m.name AS mentor_name FROM capstones p
  JOIN users u ON u.id = p.user_id LEFT JOIN users m ON m.id = p.mentor_id`;

capstones.get('/mine', async (c) => {
  const user = requireUser(c);
  const rows = await c.env.DB.prepare(`${SELECT} WHERE p.user_id = ? ORDER BY p.updated_at DESC`).bind(user.id).all<CapstoneRow>();
  return c.json({ capstones: rows.results.map(toCapstone), canSubmit: can({ role: user.role, plan: effectivePlan(user) }, 'capstone.submit') });
});

capstones.post('/', async (c) => {
  const user = requireUser(c);
  if (!can({ role: user.role, plan: effectivePlan(user) }, 'capstone.submit')) {
    throw upgradeRequired('Mentor-reviewed capstone projects are part of the Academy plan.');
  }
  const input = await body(c, capstoneSchema);
  const count = await c.env.DB.prepare('SELECT COUNT(*) AS n FROM capstones WHERE user_id = ?').bind(user.id).first<{ n: number }>();
  if ((count?.n ?? 0) >= 20) throw badRequest('You can keep up to 20 capstone projects.');
  const id = newId();
  await c.env.DB.prepare('INSERT INTO capstones (id, user_id, career_id, title, summary, stack, repo_url, demo_url, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .bind(id, user.id, input.careerId ?? null, input.title, input.summary, input.stack, input.repoUrl, input.demoUrl, input.status === 'completed' ? 'review' : input.status)
    .run();
  const row = await c.env.DB.prepare(`${SELECT} WHERE p.id = ?`).bind(id).first<CapstoneRow>();
  return c.json({ capstone: toCapstone(row!) }, 201);
});

capstones.put('/:id', async (c) => {
  const user = requireUser(c);
  const input = await body(c, capstoneSchema);
  const row = await c.env.DB.prepare('SELECT * FROM capstones WHERE id = ? AND user_id = ?').bind(c.req.param('id'), user.id).first<CapstoneRow>();
  if (!row) throw notFound('Capstone not found.');
  if (row.status === 'completed') throw badRequest('This capstone has been signed off. Start a new one to keep building.');
  // Learners can move a project to review, never mark it completed themselves.
  const status = input.status === 'completed' ? 'review' : input.status;
  await c.env.DB.prepare('UPDATE capstones SET career_id = ?, title = ?, summary = ?, stack = ?, repo_url = ?, demo_url = ?, status = ?, updated_at = ? WHERE id = ?')
    .bind(input.careerId ?? null, input.title, input.summary, input.stack, input.repoUrl, input.demoUrl, status, nowIso(), row.id)
    .run();
  const fresh = await c.env.DB.prepare(`${SELECT} WHERE p.id = ?`).bind(row.id).first<CapstoneRow>();
  return c.json({ capstone: toCapstone(fresh!) });
});

capstones.delete('/:id', async (c) => {
  const user = requireUser(c);
  const res = await c.env.DB.prepare("DELETE FROM capstones WHERE id = ? AND user_id = ? AND status != 'completed'").bind(c.req.param('id'), user.id).run();
  if (!res.meta.changes) throw notFound('Capstone not found, or it has already been signed off.');
  return c.json({ ok: true });
});

/** Review queue: admins see every capstone in review; teachers see learners from their own classes. */
capstones.get('/review', async (c) => {
  const user = requirePermission(c, 'capstone.review');
  const all = user.role === 'admin';
  const rows = all
    ? await c.env.DB.prepare(`${SELECT} WHERE p.status IN ('review','building') ORDER BY p.status = 'review' DESC, p.updated_at DESC LIMIT 200`).all<CapstoneRow>()
    : await c.env.DB.prepare(
        `${SELECT} WHERE p.status IN ('review','building') AND p.user_id IN (
           SELECT m.user_id FROM classroom_members m JOIN classrooms k ON k.id = m.classroom_id WHERE k.teacher_id = ?)
         ORDER BY p.status = 'review' DESC, p.updated_at DESC LIMIT 200`,
      ).bind(user.id).all<CapstoneRow>();
  return c.json({ capstones: rows.results.map(toCapstone) });
});

capstones.post('/:id/review', async (c) => {
  const user = requirePermission(c, 'capstone.review');
  // Authorise against the specific capstone before reading the body.
  const row = await c.env.DB.prepare('SELECT * FROM capstones WHERE id = ?').bind(c.req.param('id')).first<CapstoneRow>();
  if (!row) throw notFound('Capstone not found.');
  if (user.role !== 'admin') {
    const teaches = await c.env.DB.prepare(
      'SELECT 1 FROM classroom_members m JOIN classrooms k ON k.id = m.classroom_id WHERE m.user_id = ? AND k.teacher_id = ?',
    ).bind(row.user_id, user.id).first();
    if (!teaches) throw forbidden('You can only review capstones from learners in your classes.');
  }
  const input = await body(c, capstoneReviewSchema);
  await c.env.DB.prepare('UPDATE capstones SET feedback = ?, grade = ?, status = ?, mentor_id = ?, updated_at = ? WHERE id = ?')
    .bind(input.feedback, input.grade ?? null, input.status, user.id, nowIso(), row.id)
    .run();
  if (input.status === 'completed' && row.status !== 'completed') {
    await awardXp(c.env.DB, row.user_id, 'capstone', row.id, XP.capstone);
  }
  await audit(c.env.DB, user.id, 'capstone.review', row.id, { status: input.status, grade: input.grade });
  return c.json({ ok: true });
});

export default capstones;
