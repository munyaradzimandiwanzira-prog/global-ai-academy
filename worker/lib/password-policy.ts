/**
 * Rejects passwords that already appear in public breach corpora, using Have I Been Pwned's
 * k-anonymity range API: only the first 5 hex characters of the SHA-1 leave the Worker, never
 * the password or its full hash. (NIST SP 800-63B §5.1.1.2 recommends exactly this check.)
 *
 * Fails open: if the service is slow or down, sign-up still works — availability over a
 * defence-in-depth control. Results are cached at Cloudflare's edge for a day.
 */
import { badRequest } from './errors';

const RANGE_API = 'https://api.pwnedpasswords.com/range/';
const TIMEOUT_MS = 2500;

async function sha1HexUpper(input: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(input));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('').toUpperCase();
}

/** Number of times the password appears in known breaches; 0 when unseen or the check is unavailable. */
export async function breachCount(password: string, fetcher: typeof fetch = fetch): Promise<number> {
  try {
    const hash = await sha1HexUpper(password);
    const prefix = hash.slice(0, 5);
    const suffix = hash.slice(5);
    const res = await fetcher(RANGE_API + prefix, {
      headers: { 'Add-Padding': 'true', 'User-Agent': 'GlobalAIAcademy-password-check' },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cf: { cacheTtl: 86400, cacheEverything: true },
    } as RequestInit);
    if (!res.ok) return 0;
    for (const line of (await res.text()).split('\n')) {
      const [s, count] = line.trim().split(':');
      if (s === suffix) return Number(count) || 0;
    }
    return 0;
  } catch (err) {
    console.warn('[password-policy] breach check unavailable', (err as Error).message);
    return 0;
  }
}

/** Throws a field error (under `field`) when the password is known to attackers. */
export async function assertPasswordNotBreached(password: string, field = 'password'): Promise<void> {
  if ((await breachCount(password)) > 0) {
    const message = 'This password has appeared in a data breach, so attackers try it first. Choose a different one — a short phrase of 3–4 random words works well.';
    throw badRequest(message, { [field]: message });
  }
}
