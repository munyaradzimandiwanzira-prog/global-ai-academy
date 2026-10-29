/**
 * Time-based one-time passwords (RFC 6238, HMAC-SHA1, 6 digits, 30 s) — the scheme every
 * authenticator app (Google Authenticator, Microsoft Authenticator, Authy, 1Password …) speaks.
 * Pure WebCrypto, so it runs unchanged in Workers, Node and the browser.
 */
import { timingSafeEqual } from './crypto';

const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
export const TOTP_PERIOD = 30;
export const TOTP_DIGITS = 6;

export function base32Encode(bytes: Uint8Array): string {
  let bits = 0;
  let value = 0;
  let out = '';
  for (const b of bytes) {
    value = (value << 8) | b;
    bits += 8;
    while (bits >= 5) {
      out += B32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31];
  return out;
}

export function base32Decode(input: string): Uint8Array {
  const clean = input.toUpperCase().replace(/[\s=-]/g, '');
  const out: number[] = [];
  let bits = 0;
  let value = 0;
  for (const ch of clean) {
    const idx = B32.indexOf(ch);
    if (idx < 0) throw new Error('Invalid base32 character');
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return new Uint8Array(out);
}

/** 160-bit secret, the size RFC 4226 recommends for HMAC-SHA1. */
export function newTotpSecret(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(20));
}

export async function hotp(secret: Uint8Array, counter: number, digits = TOTP_DIGITS): Promise<string> {
  const key = await crypto.subtle.importKey('raw', secret, { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']);
  const msg = new DataView(new ArrayBuffer(8));
  msg.setUint32(0, Math.floor(counter / 2 ** 32));
  msg.setUint32(4, counter >>> 0);
  const mac = new Uint8Array(await crypto.subtle.sign('HMAC', key, msg.buffer));
  const offset = mac[mac.length - 1] & 0x0f;
  const binary = ((mac[offset] & 0x7f) << 24) | (mac[offset + 1] << 16) | (mac[offset + 2] << 8) | mac[offset + 3];
  return String(binary % 10 ** digits).padStart(digits, '0');
}

export const timeStep = (nowMs = Date.now()) => Math.floor(nowMs / 1000 / TOTP_PERIOD);

/**
 * Checks a code against the current step and one step either side (clock drift).
 * Returns the matched step so the caller can store it and refuse any code at or before it (no replay).
 */
export async function verifyTotp(secret: Uint8Array, code: string, opts: { nowMs?: number; lastStep?: number | null } = {}): Promise<number | null> {
  const digits = code.replace(/\s/g, '');
  if (!/^\d{6}$/.test(digits)) return null;
  const step = timeStep(opts.nowMs);
  let matched: number | null = null;
  // Check every candidate (no early exit) so timing does not reveal which window matched.
  for (const s of [step - 1, step, step + 1]) {
    const ok = timingSafeEqual(await hotp(secret, s), digits);
    if (ok && (opts.lastStep == null || s > opts.lastStep) && matched === null) matched = s;
  }
  return matched;
}

export function otpauthUrl(secretB32: string, account: string, issuer: string): string {
  const label = encodeURIComponent(`${issuer}:${account}`);
  const params = new URLSearchParams({ secret: secretB32, issuer, algorithm: 'SHA1', digits: String(TOTP_DIGITS), period: String(TOTP_PERIOD) });
  return `otpauth://totp/${label}?${params}`;
}
