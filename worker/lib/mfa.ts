/**
 * Two-step login (TOTP + one-use recovery codes).
 *
 * Policy:
 *  - Any account may switch it on in Settings.
 *  - Admin accounts must. Until an admin enrols, their session carries learner permissions only
 *    (see sessionMiddleware), so a phished admin password cannot reach the admin tools.
 *  - With it on, a correct password yields a 5-minute challenge ticket, not a session. The session
 *    is only created once a valid code arrives (5 tries per ticket, 10 per account per 15 min).
 */
import type { Ctx } from '../app';
import { randomCode, sha256Hex, randomToken } from './crypto';
import { nowIso, type UserRow } from './db';
import { secretboxConfigured, unseal } from './secretbox';
import { verifyTotp } from './totp';
import { hit } from './ratelimit';

export const MFA_CHALLENGE_MINUTES = 5;
export const MFA_CHALLENGE_ATTEMPTS = 5;
export const RECOVERY_CODE_COUNT = 10;

/** Two-step login can only be offered once the encryption key exists. */
export const mfaAvailable = (env: Env) => secretboxConfigured(env);

/** True for an admin who still has to enrol (only enforced once MFA is available). */
export const mfaSetupRequired = (env: Env, u: Pick<UserRow, 'role' | 'mfa_enabled_at'>) =>
  mfaAvailable(env) && u.role === 'admin' && !u.mfa_enabled_at;

/** "ABCD-EF23" style: 40 bits each, no look-alike characters, easy to type from paper. */
export function newRecoveryCodes(n = RECOVERY_CODE_COUNT): string[] {
  return Array.from({ length: n }, () => {
    const raw = randomCode(8);
    return `${raw.slice(0, 4)}-${raw.slice(4)}`;
  });
}

export const normaliseRecoveryCode = (code: string) => code.toUpperCase().replace(/[^A-Z0-9]/g, '');

export async function storeRecoveryCodes(db: D1Database, userId: string, codes: string[]) {
  const hashes = await Promise.all(codes.map((c) => sha256Hex(`${userId}:${normaliseRecoveryCode(c)}`)));
  await db.batch([
    db.prepare('DELETE FROM mfa_recovery_codes WHERE user_id = ?').bind(userId),
    ...hashes.map((h) => db.prepare('INSERT INTO mfa_recovery_codes (user_id, code_hash) VALUES (?, ?)').bind(userId, h)),
  ]);
}

export async function recoveryCodesLeft(db: D1Database, userId: string): Promise<number> {
  const r = await db.prepare('SELECT COUNT(*) AS n FROM mfa_recovery_codes WHERE user_id = ? AND used_at IS NULL').bind(userId).first<{ n: number }>();
  return r?.n ?? 0;
}

/**
 * Verifies a 6-digit app code (with replay protection) or a recovery code (burned on use).
 * Returns how the user proved themselves, or null.
 */
export async function verifySecondFactor(env: Env, user: UserRow, code: string): Promise<'totp' | 'recovery' | null> {
  const trimmed = code.trim();
  if (/^\d{3}\s?\d{3}$/.test(trimmed)) {
    if (!user.mfa_secret) return null;
    const secret = await unseal(env, user.mfa_secret, user.id);
    const step = await verifyTotp(secret, trimmed, { lastStep: user.mfa_last_step });
    if (step === null) return null;
    // Conditional update makes the step check atomic: two parallel requests with one code can't both pass.
    const res = await env.DB.prepare('UPDATE users SET mfa_last_step = ? WHERE id = ? AND (mfa_last_step IS NULL OR mfa_last_step < ?)')
      .bind(step, user.id, step).run();
    return res.meta.changes ? 'totp' : null;
  }
  const norm = normaliseRecoveryCode(trimmed);
  if (norm.length !== 8) return null;
  const hash = await sha256Hex(`${user.id}:${norm}`);
  const res = await env.DB.prepare('UPDATE mfa_recovery_codes SET used_at = ? WHERE user_id = ? AND code_hash = ? AND used_at IS NULL')
    .bind(nowIso(), user.id, hash).run();
  return res.meta.changes ? 'recovery' : null;
}

/** Per-account brake on code guessing, independent of which ticket or session is used. */
export const limitCodeAttempts = (c: Ctx, userId: string) =>
  hit(c.env.DB, `mfa:${userId}`, 10, 900, 'Too many code attempts. Wait 15 minutes and try again.');

export async function createChallenge(db: D1Database, userId: string): Promise<string> {
  const ticket = randomToken(32);
  const expires = new Date(Date.now() + MFA_CHALLENGE_MINUTES * 60_000).toISOString();
  await db.batch([
    db.prepare('DELETE FROM mfa_challenges WHERE user_id = ? OR expires_at < ?').bind(userId, nowIso()),
    db.prepare('INSERT INTO mfa_challenges (id, user_id, expires_at) VALUES (?, ?, ?)').bind(await sha256Hex(ticket), userId, expires),
  ]);
  return ticket;
}
