import { tooMany } from './errors';

/**
 * Fixed-window counter in D1. Atomic via UPSERT … RETURNING.
 * Returns the count after increment; throws 429 when over the limit.
 */
export async function hit(db: D1Database, key: string, limit: number, windowSeconds: number, message: string): Promise<number> {
  const n = Math.floor(Date.now() / 1000 / windowSeconds);
  const window = `${windowSeconds}:${n}`;
  const expiresAt = (n + 1) * windowSeconds;
  const row = await db
    .prepare(
      `INSERT INTO rate_limits (key, window, count, expires_at) VALUES (?, ?, 1, ?)
       ON CONFLICT(key, window) DO UPDATE SET count = count + 1
       RETURNING count`,
    )
    .bind(key, window, expiresAt)
    .first<{ count: number }>();
  const count = row?.count ?? 1;
  if (count > limit) throw tooMany(message);
  return count;
}

export async function peek(db: D1Database, key: string, windowSeconds: number): Promise<number> {
  const window = `${windowSeconds}:${Math.floor(Date.now() / 1000 / windowSeconds)}`;
  const row = await db.prepare('SELECT count FROM rate_limits WHERE key = ? AND window = ?').bind(key, window).first<{ count: number }>();
  return row?.count ?? 0;
}

/** Opportunistic cleanup of stale windows (called occasionally, not on every request). */
export async function sweep(db: D1Database) {
  await db.prepare('DELETE FROM rate_limits WHERE expires_at < ?').bind(Math.floor(Date.now() / 1000)).run();
  await db.prepare('DELETE FROM sessions WHERE expires_at < ?').bind(new Date().toISOString()).run();
}
