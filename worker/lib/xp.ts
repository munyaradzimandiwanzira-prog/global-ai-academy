/**
 * Idempotent XP awarding: the UNIQUE(user_id, source, source_id) constraint guarantees
 * that replaying the same event (double-click, retry, refresh) never awards twice.
 */
export async function awardXp(db: D1Database, userId: string, source: string, sourceId: string, amount: number): Promise<number> {
  const inserted = await db
    .prepare('INSERT OR IGNORE INTO xp_events (user_id, source, source_id, amount) VALUES (?, ?, ?, ?)')
    .bind(userId, source, sourceId, amount)
    .run();
  if (!inserted.meta.changes) return 0;
  await db.prepare('UPDATE users SET xp = xp + ? WHERE id = ?').bind(amount, userId).run();
  return amount;
}
