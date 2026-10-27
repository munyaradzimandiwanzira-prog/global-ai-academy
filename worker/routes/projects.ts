import { createRouter, body, requireUser } from '../app';
import { projectSchema } from '@shared/schemas';
import { PROJECT_LIMITS, PLANS } from '@shared/config';
import { can } from '@shared/rbac';
import type { Project } from '@shared/api-types';
import { effectivePlan, nowIso, type UserRow } from '../lib/db';
import { newId, randomToken } from '../lib/crypto';
import { notFound, upgradeRequired } from '../lib/errors';
import { hit } from '../lib/ratelimit';

/**
 * Saved code ("Spaces"-style): every signed-in learner can keep a few projects,
 * paid plans keep a portfolio and can share any project by an unguessable link.
 */
const projects = createRouter();

interface ProjectRow {
  id: string; user_id: string; title: string; language: string; code: string; share_slug: string | null;
  created_at: string; updated_at: string; author_name?: string;
}

const toProject = (r: ProjectRow, includeCode = true): Project => ({
  id: r.id,
  title: r.title,
  language: r.language,
  code: includeCode ? r.code : '',
  shareSlug: r.share_slug,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
  authorName: r.author_name,
});

const canShare = (u: UserRow) => can({ role: u.role, plan: effectivePlan(u) }, 'projects.share');
const limitFor = (u: UserRow) => (u.role === 'student' ? PROJECT_LIMITS[effectivePlan(u)] : 500);

projects.get('/', async (c) => {
  const user = requireUser(c);
  const rows = await c.env.DB.prepare('SELECT * FROM projects WHERE user_id = ? ORDER BY updated_at DESC LIMIT 500').bind(user.id).all<ProjectRow>();
  return c.json({ projects: rows.results.map((r) => toProject(r, false)), limit: limitFor(user), canShare: canShare(user) });
});

projects.get('/:id', async (c) => {
  const user = requireUser(c);
  const row = await c.env.DB.prepare('SELECT * FROM projects WHERE id = ? AND user_id = ?').bind(c.req.param('id'), user.id).first<ProjectRow>();
  if (!row) throw notFound('Project not found.');
  return c.json({ project: toProject(row) });
});

projects.post('/', async (c) => {
  const user = requireUser(c);
  const input = await body(c, projectSchema);
  await hit(c.env.DB, `project-save:${user.id}`, 120, 3600, 'You have saved a lot this hour. Try again shortly.');
  const count = await c.env.DB.prepare('SELECT COUNT(*) AS n FROM projects WHERE user_id = ?').bind(user.id).first<{ n: number }>();
  const limit = limitFor(user);
  if ((count?.n ?? 0) >= limit) {
    throw upgradeRequired(`The ${PLANS[effectivePlan(user)].name} plan keeps ${limit} projects. Delete one, or upgrade to Plus to keep up to ${PROJECT_LIMITS.plus}.`);
  }
  const id = newId();
  const slug = input.shared && canShare(user) ? randomToken(9) : null;
  await c.env.DB.prepare('INSERT INTO projects (id, user_id, title, language, code, share_slug) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(id, user.id, input.title, input.language, input.code, slug)
    .run();
  const row = await c.env.DB.prepare('SELECT * FROM projects WHERE id = ?').bind(id).first<ProjectRow>();
  return c.json({ project: toProject(row!) }, 201);
});

projects.put('/:id', async (c) => {
  const user = requireUser(c);
  const input = await body(c, projectSchema);
  const row = await c.env.DB.prepare('SELECT * FROM projects WHERE id = ? AND user_id = ?').bind(c.req.param('id'), user.id).first<ProjectRow>();
  if (!row) throw notFound('Project not found.');
  let slug = row.share_slug;
  if (input.shared === true && !slug) {
    if (!canShare(user)) throw upgradeRequired('Sharing projects by link is part of Plus.');
    slug = randomToken(9);
  }
  if (input.shared === false) slug = null;
  await c.env.DB.prepare('UPDATE projects SET title = ?, language = ?, code = ?, share_slug = ?, updated_at = ? WHERE id = ?')
    .bind(input.title, input.language, input.code, slug, nowIso(), row.id)
    .run();
  const fresh = await c.env.DB.prepare('SELECT * FROM projects WHERE id = ?').bind(row.id).first<ProjectRow>();
  return c.json({ project: toProject(fresh!) });
});

projects.delete('/:id', async (c) => {
  const user = requireUser(c);
  const res = await c.env.DB.prepare('DELETE FROM projects WHERE id = ? AND user_id = ?').bind(c.req.param('id'), user.id).run();
  if (!res.meta.changes) throw notFound('Project not found.');
  return c.json({ ok: true });
});

/** Public read of a shared project. The slug is the capability; private projects are never returned. */
projects.get('/shared/:slug', async (c) => {
  const slug = c.req.param('slug');
  if (!/^[A-Za-z0-9_-]{8,20}$/.test(slug)) throw notFound('This shared project does not exist.');
  const row = await c.env.DB.prepare(
    'SELECT p.*, u.name AS author_name FROM projects p JOIN users u ON u.id = p.user_id WHERE p.share_slug = ? AND u.disabled_at IS NULL',
  ).bind(slug).first<ProjectRow>();
  if (!row) throw notFound('This shared project does not exist or is no longer shared.');
  const first = (row.author_name ?? '').trim().split(/\s+/)[0] ?? '';
  return c.json({ project: { ...toProject(row), shareSlug: row.share_slug, authorName: first } });
});

export default projects;
