import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import type { MiddlewareHandler } from 'hono';
import type { AppEnv, Ctx } from '../app';
import { randomToken, sha256Hex } from './crypto';
import { nowIso, todayUtc, type UserRow } from './db';
import { mfaSetupRequired } from './mfa';

export const SESSION_COOKIE = 'gaa_session';
const SESSION_DAYS = 30;
const RENEW_WHEN_DAYS_LEFT = 15;
/** Admin sessions end 12 hours after sign-in, however active they are. */
const ADMIN_SESSION_HOURS = 12;

const isSecure = (c: Ctx) => new URL(c.req.url).protocol === 'https:';

export async function createSession(c: Ctx, userId: string): Promise<void> {
  const token = randomToken(32);
  const id = await sha256Hex(token);
  const expires = new Date(Date.now() + SESSION_DAYS * 86400_000);
  await c.env.DB.prepare('INSERT INTO sessions (id, user_id, expires_at, user_agent) VALUES (?, ?, ?, ?)')
    .bind(id, userId, expires.toISOString(), (c.req.header('user-agent') ?? '').slice(0, 200))
    .run();
  setCookie(c, SESSION_COOKIE, token, {
    httpOnly: true,
    secure: isSecure(c),
    sameSite: 'Lax',
    path: '/',
    expires,
  });
}

export async function destroySession(c: Ctx): Promise<void> {
  const id = c.get('sessionId');
  if (id) await c.env.DB.prepare('DELETE FROM sessions WHERE id = ?').bind(id).run();
  deleteCookie(c, SESSION_COOKIE, { path: '/', secure: isSecure(c) });
}

export async function destroyAllSessions(db: D1Database, userId: string, exceptId?: string | null) {
  if (exceptId) await db.prepare('DELETE FROM sessions WHERE user_id = ? AND id != ?').bind(userId, exceptId).run();
  else await db.prepare('DELETE FROM sessions WHERE user_id = ?').bind(userId).run();
}

/** Loads the signed-in user (if any) and keeps streaks + sliding expiry up to date. */
export const sessionMiddleware: MiddlewareHandler<AppEnv> = async (c, next) => {
  c.set('user', null);
  c.set('sessionId', null);
  c.set('mfaSetupRequired', false);
  const token = getCookie(c, SESSION_COOKIE);
  if (token && token.length >= 40 && token.length <= 64) {
    const id = await sha256Hex(token);
    const row = await c.env.DB.prepare(
      `SELECT s.expires_at AS s_expires, s.created_at AS s_created, u.* FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.id = ?`,
    )
      .bind(id)
      .first<UserRow & { s_expires: string; s_created: string }>();

    const adminExpired = row?.role === 'admin' && Date.parse(row.s_created) < Date.now() - ADMIN_SESSION_HOURS * 3600_000;
    if (row && row.s_expires > nowIso() && !row.disabled_at && !adminExpired) {
      const { s_expires, s_created: _created, ...user } = row;
      if (mfaSetupRequired(c.env, user)) {
        // Admin without two-step login: act as a learner until they enrol (Settings → Two-step login).
        c.set('mfaSetupRequired', true);
        c.set('user', { ...user, role: 'student' });
      } else {
        c.set('user', user);
      }
      c.set('sessionId', id);

      const daysLeft = (Date.parse(s_expires) - Date.now()) / 86400_000;
      const tasks: Promise<unknown>[] = [];
      if (daysLeft < RENEW_WHEN_DAYS_LEFT) {
        const expires = new Date(Date.now() + SESSION_DAYS * 86400_000);
        tasks.push(c.env.DB.prepare('UPDATE sessions SET expires_at = ? WHERE id = ?').bind(expires.toISOString(), id).run());
        setCookie(c, SESSION_COOKIE, token, { httpOnly: true, secure: isSecure(c), sameSite: 'Lax', path: '/', expires });
      }
      const today = todayUtc();
      if (user.last_active_day !== today) {
        const yesterday = new Date(Date.now() - 86400_000).toISOString().slice(0, 10);
        const streak = user.last_active_day === yesterday ? user.streak + 1 : 1;
        user.streak = streak;
        user.last_active_day = today;
        tasks.push(c.env.DB.prepare('UPDATE users SET streak = ?, last_active_day = ? WHERE id = ?').bind(streak, today, user.id).run());
      }
      if (tasks.length) c.executionCtx.waitUntil(Promise.all(tasks));
    } else if (row) {
      if (adminExpired) c.executionCtx.waitUntil(c.env.DB.prepare('DELETE FROM sessions WHERE id = ?').bind(id).run());
      deleteCookie(c, SESSION_COOKIE, { path: '/', secure: isSecure(c) });
    }
  }
  await next();
};

/**
 * CSRF defence for cookie-authenticated mutations: require same-origin Origin/Referer
 * (SameSite=Lax already blocks most cross-site POSTs; this closes the gap for older browsers).
 * The Paynow webhook is exempt because it is authenticated by its SHA-512 hash instead.
 */
function refererOrigin(referer: string | undefined): string | null {
  if (!referer) return null;
  try {
    return new URL(referer).origin;
  } catch {
    return null;
  }
}

export const csrfMiddleware: MiddlewareHandler<AppEnv> = async (c, next) => {
  const method = c.req.method;
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return next();
  if (c.req.path === '/api/payments/paynow/result') return next();
  // The MCP endpoint is public, read-only and cookie-free; it does its own Origin check (DNS-rebinding defence).
  if (c.req.path === '/api/mcp') return next();
  const self = new URL(c.req.url).origin;
  const origin = c.req.header('origin') ?? refererOrigin(c.req.header('referer'));
  const allowed = new Set([self, new URL(c.env.APP_URL).origin]);
  if (!origin || !allowed.has(origin)) {
    return c.json({ error: { code: 'csrf', message: 'Cross-site request blocked.' } }, 403);
  }
  return next();
};
