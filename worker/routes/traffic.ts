/**
 * First-party page counts for the admin traffic dashboard.
 *
 * Privacy by design: no IP addresses, user ids or cookies are stored. The browser sends a random
 * id that lives only for its tab session; we store it hashed together with the day, so the same
 * person can't be followed from one day to the next. Bots and previews are ignored.
 */
import { createRouter, body, clientKey } from '../app';
import { trafficSchema } from '@shared/schemas';
import { todayUtc } from '../lib/db';
import { sha256Hex } from '../lib/crypto';
import { hit } from '../lib/ratelimit';

const traffic = createRouter();

const BOT = /bot|crawl|spider|slurp|preview|facebookexternalhit|whatsapp|headless|lighthouse|pingdom|uptime/i;

/** Groups pages that differ only by an id, so "/classes/abc" and "/classes/xyz" count together. */
export function normalizePath(p: string): string | null {
  const path = p.split(/[?#]/)[0]!.slice(0, 200);
  if (!path.startsWith('/') || path.startsWith('/api') || path.startsWith('//')) return null;
  return path
    .replace(/^\/(classes|assignments|admin\/users|teach\/students|teach\/plans|certificates|capstones|projects|p)\/[^/]+/, '/$1/:id')
    .replace(/^\/(join|verify|reset)\/[^/]+/, '/$1/:code')
    .replace(/\/+$/, '') || '/';
}

export function sourceOf(referrer: string, host: string): string {
  if (!referrer) return 'direct';
  try {
    const h = new URL(referrer).hostname.replace(/^www\./, '').replace(/^(l|m|lm)\.facebook\.com$/, 'facebook.com');
    if (!h || h === host.replace(/^www\./, '')) return 'internal';
    return h.slice(0, 60);
  } catch {
    return 'direct';
  }
}

export function deviceOf(ua: string): string {
  if (/iPad|Tablet|PlayBook|Silk/i.test(ua)) return 'tablet';
  if (/Mobi|Android|iPhone|iPod/i.test(ua)) return 'mobile';
  return 'desktop';
}

traffic.post('/', async (c) => {
  const ua = c.req.header('user-agent') ?? '';
  if (!ua || BOT.test(ua)) return c.body(null, 204);
  await hit(c.env.DB, `traffic:${clientKey(c)}`, 600, 3600, 'slow down');
  const input = await body(c, trafficSchema);
  const path = normalizePath(input.p);
  if (!path) return c.body(null, 204);
  const day = todayUtc();
  const db = c.env.DB;
  const vid = (await sha256Hex(`${day}:${input.v}`)).slice(0, 20);
  const country = String((c.req.raw as Request & { cf?: { country?: string } }).cf?.country ?? 'XX').slice(0, 2).toUpperCase();
  const source = sourceOf(input.r, new URL(c.req.url).hostname);
  const dims: [string, string][] = [['country', country], ['device', deviceOf(ua)], ['auth', c.get('user') ? 'signed-in' : 'guest']];
  if (source !== 'internal') dims.push(['source', source]);
  await db.batch([
    db.prepare('INSERT INTO traffic_daily (day, path, views) VALUES (?, ?, 1) ON CONFLICT(day, path) DO UPDATE SET views = views + 1').bind(day, path),
    db.prepare('INSERT OR IGNORE INTO traffic_visitors (day, vid) VALUES (?, ?)').bind(day, vid),
    ...dims.map(([dim, value]) => db.prepare('INSERT INTO traffic_dims (day, dim, value, views) VALUES (?, ?, ?, 1) ON CONFLICT(day, dim, value) DO UPDATE SET views = views + 1').bind(day, dim, value)),
  ]);
  return c.body(null, 204);
});

export default traffic;
