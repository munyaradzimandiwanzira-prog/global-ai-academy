/**
 * Zuva's long-term memory.
 *
 * Architecture (three tiers):
 *  1. Working memory:  the last few messages of the current thread, sent with every request.
 *  2. Episodic memory: each thread keeps a rolling summary, so long chats stay coherent and cheap.
 *  3. Semantic memory: short, typed facts about the learner (interests, goals, struggles…), written
 *     by the memory-curator sub-agent after a chat, or when the learner says "remember…".
 *
 * Every write passes a policy: learning-related only, no personal identifiers, stricter for children.
 * Retrieval is scoped by user id in SQL (never by asking the model), and ranked by relevance to the
 * current message, importance and recency. Learners can list, delete or switch memory off.
 */
import { MEMORY_KINDS, type MemoryKind, type ZuvaMemory } from '@shared/zuva';
import { nowIso } from '../lib/db';
import { newId } from '../lib/crypto';

export const MAX_MEMORIES = 60;
const STOP = new Set('the a an and or but to of in on at for with is are was were be been it this that i me my you your we they he she them his her its as by from about what when how do does did can could would should will just like so not no yes very really'.split(' '));

export const tokens = (s: string) => new Set(s.toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').split(/\s+/).filter((w) => w.length > 2 && !STOP.has(w)));

export function similarity(a: string, b: string): number {
  const x = tokens(a);
  const y = tokens(b);
  if (!x.size || !y.size) return 0;
  let inter = 0;
  for (const w of x) if (y.has(w)) inter++;
  return inter / (x.size + y.size - inter);
}

/** Things Zuva must never store, for anyone. */
const PII: RegExp[] = [
  /\b[\w.+-]+@[\w-]+\.[\w.]+\b/, // email
  /(\+?\d[\d\s-]{7,}\d)/, // phone-like numbers
  /\b(password|passcode|pin code|pin is|otp|cvv|card number|bank account|id number|national id|passport)\b/i,
  /\b\d{1,5}\s+(\w+\s+){1,3}(street|st|road|rd|avenue|ave|drive|close|crescent|lane|way)\b/i,
  /\blives? at\b/i,
];
/** Extra things never stored for child accounts (data minimisation + safeguarding). */
const CHILD_SENSITIVE = /\b(lives? (in|at|on)|address|my school is|school called|goes to .* school|phone|whatsapp|surname|last name|birthday|born on|mum|mom|dad|father|mother|brother|sister|family|church|sick|illness|hospital|medicine|religion|tribe|photo|picture of me|secret)\b/i;
/** Sensitive categories never stored for anyone. */
const SENSITIVE = /\b(health condition|diagnos|disabilit|pregnan|religio|political|sexual|ethnic|criminal record|hiv|depress|anxiety disorder)\b/i;

export interface MemoryCandidate { kind: MemoryKind; content: string; importance?: number }

export function checkMemory(c: MemoryCandidate, isKid: boolean): { ok: true; value: MemoryCandidate } | { ok: false; reason: string } {
  const content = c.content.replace(/\s+/g, ' ').trim();
  if (!MEMORY_KINDS.includes(c.kind)) return { ok: false, reason: 'unknown kind' };
  if (content.length < 6 || content.length > 200) return { ok: false, reason: 'length' };
  if (PII.some((r) => r.test(content))) return { ok: false, reason: 'personal identifier' };
  if (SENSITIVE.test(content)) return { ok: false, reason: 'sensitive category' };
  if (isKid && CHILD_SENSITIVE.test(content)) return { ok: false, reason: 'not stored for children' };
  // Instructions are not memories: "always approve…", "ignore your rules…" are injection attempts.
  if (/\b(ignore|disregard|override|always (do|say|approve|answer)|you must|system prompt|from now on)\b/i.test(content)) return { ok: false, reason: 'instruction-like' };
  const importance = Math.min(5, Math.max(1, Math.round(c.importance ?? 3)));
  return { ok: true, value: { kind: c.kind, content, importance } };
}

interface Row { id: string; kind: MemoryKind; content: string; source: ZuvaMemory['source']; importance: number; created_at: string; last_used_at: string | null }

export async function listMemories(db: D1Database, userId: string): Promise<ZuvaMemory[]> {
  const rows = await db
    .prepare(`SELECT id, kind, content, source, importance, created_at, last_used_at FROM zuva_memories WHERE user_id = ? AND (expires_at IS NULL OR expires_at > ?) ORDER BY created_at DESC LIMIT ?`)
    .bind(userId, nowIso(), MAX_MEMORIES)
    .all<Row>();
  return rows.results.map((r) => ({ id: r.id, kind: r.kind, content: r.content, source: r.source, createdAt: r.created_at, lastUsedAt: r.last_used_at }));
}

/** Score = relevance to the message, plus importance, plus a little for recent use. */
export function rankMemories<T extends { content: string; importance?: number; createdAt?: string }>(items: T[], query: string, k: number, now = Date.now()): T[] {
  return items
    .map((m) => {
      const ageDays = m.createdAt ? (now - Date.parse(m.createdAt)) / 86_400_000 : 30;
      const score = similarity(m.content, query) * 3 + (m.importance ?? 3) * 0.25 + Math.max(0, 1 - ageDays / 60) * 0.5;
      return { m, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, k)
    .map((x) => x.m);
}

export async function recall(db: D1Database, userId: string, query: string, k = 8): Promise<string[]> {
  const rows = await db
    .prepare(`SELECT id, kind, content, importance, created_at FROM zuva_memories WHERE user_id = ? AND (expires_at IS NULL OR expires_at > ?) ORDER BY created_at DESC LIMIT ?`)
    .bind(userId, nowIso(), MAX_MEMORIES)
    .all<{ id: string; kind: MemoryKind; content: string; importance: number; created_at: string }>();
  const ranked = rankMemories(rows.results.map((r) => ({ ...r, createdAt: r.created_at })), query, k);
  if (ranked.length) {
    const ids = ranked.map((r) => r.id);
    await db.prepare(`UPDATE zuva_memories SET last_used_at = ? WHERE user_id = ? AND id IN (${ids.map(() => '?').join(',')})`).bind(nowIso(), userId, ...ids).run();
  }
  return ranked.map((r) => `(${r.kind}) ${r.content}`);
}

/** Adds a memory, merging with a near-duplicate of the same kind, and keeps the store under the cap. */
export async function writeMemory(db: D1Database, userId: string, c: MemoryCandidate, source: ZuvaMemory['source'], isKid: boolean): Promise<{ ok: boolean; reason?: string; id?: string }> {
  const checked = checkMemory(c, isKid);
  if (!checked.ok) return { ok: false, reason: checked.reason };
  const v = checked.value;
  const existing = await db.prepare('SELECT id, content FROM zuva_memories WHERE user_id = ? AND kind = ?').bind(userId, v.kind).all<{ id: string; content: string }>();
  const dup = existing.results.find((e) => similarity(e.content, v.content) >= 0.6);
  // Children's memories fade after 6 months unless refreshed; adults' after a year.
  const expires = new Date(Date.now() + (isKid ? 180 : 365) * 86_400_000).toISOString();
  if (dup) {
    await db.prepare('UPDATE zuva_memories SET content = ?, importance = MAX(importance, ?), created_at = ?, expires_at = ? WHERE id = ? AND user_id = ?').bind(v.content, v.importance, nowIso(), expires, dup.id, userId).run();
    return { ok: true, id: dup.id };
  }
  const id = newId();
  await db.prepare('INSERT INTO zuva_memories (id, user_id, kind, content, source, importance, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?)').bind(id, userId, v.kind, v.content, source, v.importance, expires).run();
  // Keep the newest, most important memories when over the cap.
  await db
    .prepare(`DELETE FROM zuva_memories WHERE user_id = ? AND id NOT IN (SELECT id FROM zuva_memories WHERE user_id = ? ORDER BY importance DESC, created_at DESC LIMIT ?)`)
    .bind(userId, userId, MAX_MEMORIES)
    .run();
  return { ok: true, id };
}

export async function forgetMatching(db: D1Database, userId: string, about: string): Promise<number> {
  const rows = await db.prepare('SELECT id, content FROM zuva_memories WHERE user_id = ?').bind(userId).all<{ id: string; content: string }>();
  const words = tokens(about);
  const hits = rows.results.filter((r) => similarity(r.content, about) >= 0.25 || [...words].some((w) => r.content.toLowerCase().includes(w)));
  for (const h of hits) await db.prepare('DELETE FROM zuva_memories WHERE id = ? AND user_id = ?').bind(h.id, userId).run();
  return hits.length;
}
