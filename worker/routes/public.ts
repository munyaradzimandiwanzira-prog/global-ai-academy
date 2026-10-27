import { createRouter, body, clientKey } from '../app';
import { contactSchema, waitlistSchema } from '@shared/schemas';
import { newId } from '../lib/crypto';
import { hit } from '../lib/ratelimit';
import { sendEmail } from '../lib/email';
import { SITE } from '@shared/config';

const pub = createRouter();

pub.get('/health', async (c) => {
  const db = await c.env.DB.prepare('SELECT 1 AS ok').first<{ ok: number }>().catch(() => null);
  return c.json({
    ok: true,
    db: db?.ok === 1,
    ai: !!c.env.OPENAI_API_KEY,
    email: !!c.env.BREVO_API_KEY,
    payments: !!c.env.PAYNOW_INTEGRATION_KEY,
    remoteRunner: !!c.env.JUDGE0_URL,
  });
});

pub.get('/announcements', async (c) => {
  const rows = await c.env.DB.prepare('SELECT a.id, a.title, a.body, a.created_at, u.name AS author_name FROM announcements a JOIN users u ON u.id = a.author_id WHERE a.classroom_id IS NULL ORDER BY a.created_at DESC LIMIT 10').all();
  return c.json({ announcements: rows.results });
});

/** Leaderboard — names shortened to first name + initial for privacy. */
pub.get('/leaderboard', async (c) => {
  const scope = c.req.query('scope') === 'week' ? 'week' : 'all';
  const shorten = (name: string) => {
    const [first, ...rest] = name.trim().split(/\s+/);
    return rest.length ? `${first} ${rest[rest.length - 1][0]}.` : first;
  };
  const rows =
    scope === 'week'
      ? await c.env.DB.prepare(
          `SELECT u.id, u.name, u.city, u.avatar_color, SUM(e.amount) AS xp FROM xp_events e JOIN users u ON u.id = e.user_id
           WHERE e.created_at >= ? AND u.disabled_at IS NULL GROUP BY u.id ORDER BY xp DESC LIMIT 25`,
        ).bind(new Date(Date.now() - 7 * 86400_000).toISOString()).all<{ id: string; name: string; city: string | null; avatar_color: string; xp: number }>()
      : await c.env.DB.prepare('SELECT id, name, city, avatar_color, xp FROM users WHERE disabled_at IS NULL AND xp > 0 ORDER BY xp DESC LIMIT 25').all<{ id: string; name: string; city: string | null; avatar_color: string; xp: number }>();
  const me = c.get('user');
  return c.json({ scope, leaders: rows.results.map((r) => ({ name: shorten(r.name), city: r.city, avatarColor: r.avatar_color, xp: r.xp, isMe: me?.id === r.id })) });
});

pub.post('/contact', async (c) => {
  await hit(c.env.DB, `contact:${clientKey(c)}`, 5, 3600, 'You have sent several messages. We will get back to you soon.');
  const input = await body(c, contactSchema);
  await c.env.DB.prepare('INSERT INTO contact_messages (id, name, email, subject, body) VALUES (?, ?, ?, ?, ?)').bind(newId(), input.name, input.email, input.subject, input.body).run();
  c.executionCtx.waitUntil(
    sendEmail(c.env, {
      to: SITE.contact.email,
      subject: `[Contact] ${input.subject}`,
      text: `From: ${input.name} <${input.email}>\n\n${input.body}`,
      html: `<p><strong>From:</strong> ${input.name.replace(/</g, '&lt;')} &lt;${input.email}&gt;</p><pre style="white-space:pre-wrap;font-family:inherit">${input.body.replace(/</g, '&lt;')}</pre>`,
    }),
  );
  return c.json({ ok: true }, 201);
});

/** Premium (coming soon) waitlist. Idempotent per email + plan, so repeat sign-ups are harmless. */
pub.post('/waitlist', async (c) => {
  await hit(c.env.DB, `waitlist:${clientKey(c)}`, 10, 3600, 'Too many requests. Try again in an hour.');
  const input = await body(c, waitlistSchema);
  const user = c.get('user');
  const res = await c.env.DB.prepare('INSERT OR IGNORE INTO waitlist (id, email, name, plan, note, user_id) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(newId(), input.email, input.name || user?.name || '', input.plan, input.note, user?.id ?? null)
    .run();
  if (res.meta.changes) {
    c.executionCtx.waitUntil(
      sendEmail(c.env, {
        to: SITE.contact.email,
        subject: `[Waitlist] ${input.plan} — ${input.email}`,
        text: `${input.name || '(no name)'} <${input.email}> joined the ${input.plan} waitlist.\n\n${input.note}`,
        html: `<p><strong>${(input.name || '(no name)').replace(/</g, '&lt;')}</strong> &lt;${input.email}&gt; joined the <strong>${input.plan}</strong> waitlist.</p><p>${input.note.replace(/</g, '&lt;')}</p>`,
      }),
    );
  }
  return c.json({ ok: true, alreadyJoined: !res.meta.changes }, res.meta.changes ? 201 : 200);
});

export default pub;
