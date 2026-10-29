/**
 * Authenticated encryption for small secrets at rest (TOTP seeds), using AES-256-GCM and the
 * MFA_KEY Worker secret (32 random bytes, base64). A stolen database copy alone is useless.
 *
 * Each value is bound to its owner via GCM "additional data", so an attacker with write access
 * to the table cannot copy their own sealed secret onto someone else's row.
 * Format: v1.<iv b64url>.<ciphertext b64url>
 */
import { fromB64Url, toB64Url } from './crypto';

const enc = new TextEncoder();
const cache = new Map<string, Promise<CryptoKey>>();

export function secretboxConfigured(env: Pick<Env, 'MFA_KEY'>): boolean {
  return !!env.MFA_KEY;
}

function keyFor(env: Pick<Env, 'MFA_KEY'>): Promise<CryptoKey> {
  const raw = env.MFA_KEY;
  if (!raw) throw new Error('MFA_KEY is not configured');
  let key = cache.get(raw);
  if (!key) {
    const bytes = fromB64Url(raw.trim().replace(/=+$/, ''));
    if (bytes.length !== 32) throw new Error('MFA_KEY must be 32 bytes (base64)');
    key = crypto.subtle.importKey('raw', bytes, 'AES-GCM', false, ['encrypt', 'decrypt']);
    cache.set(raw, key);
  }
  return key;
}

export async function seal(env: Pick<Env, 'MFA_KEY'>, plaintext: Uint8Array, owner: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: enc.encode(owner) }, await keyFor(env), plaintext);
  return `v1.${toB64Url(iv)}.${toB64Url(new Uint8Array(ct))}`;
}

export async function unseal(env: Pick<Env, 'MFA_KEY'>, sealed: string, owner: string): Promise<Uint8Array> {
  const [version, ivB64, ctB64] = sealed.split('.');
  if (version !== 'v1' || !ivB64 || !ctB64) throw new Error('Unknown secretbox format');
  const pt = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: fromB64Url(ivB64), additionalData: enc.encode(owner) },
    await keyFor(env),
    fromB64Url(ctB64),
  );
  return new Uint8Array(pt);
}
