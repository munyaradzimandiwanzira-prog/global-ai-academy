import { createRouter, requireUser } from '../app';
import type { NotificationItem } from '@shared/teaching';
import { nowIso } from '../lib/db';

/** In-app notifications for the signed-in user (assignments, grades, teacher news). */
const notifications = createRouter();

notifications.get('/', async (c) => {
  const user = requireUser(c);
  const [rows, unread] = await Promise.all([
    c.env.DB.prepare('SELECT id, kind, title, body, link, read_at, created_at FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 30').bind(user.id).all<{ id: string; kind: string; title: string; body: string; link: string; read_at: string | null; created_at: string }>(),
    c.env.DB.prepare('SELECT COUNT(*) AS n FROM notifications WHERE user_id = ? AND read_at IS NULL').bind(user.id).first<{ n: number }>(),
  ]);
  const items: NotificationItem[] = rows.results.map((r) => ({ id: r.id, kind: r.kind, title: r.title, body: r.body, link: r.link, read: !!r.read_at, createdAt: r.created_at }));
  return c.json({ notifications: items, unread: unread?.n ?? 0 });
});

notifications.post('/:id/read', async (c) => {
  const user = requireUser(c);
  await c.env.DB.prepare('UPDATE notifications SET read_at = ? WHERE id = ? AND user_id = ? AND read_at IS NULL').bind(nowIso(), c.req.param('id'), user.id).run();
  return c.json({ ok: true });
});

notifications.post('/read-all', async (c) => {
  const user = requireUser(c);
  await c.env.DB.prepare('UPDATE notifications SET read_at = ? WHERE user_id = ? AND read_at IS NULL').bind(nowIso(), user.id).run();
  // Keep the table small: anything read and older than 90 days goes.
  await c.env.DB.prepare('DELETE FROM notifications WHERE user_id = ? AND read_at IS NOT NULL AND created_at < ?').bind(user.id, new Date(Date.now() - 90 * 86_400_000).toISOString()).run();
  return c.json({ ok: true });
});

export default notifications;
