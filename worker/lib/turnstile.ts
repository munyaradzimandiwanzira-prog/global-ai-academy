/**
 * Cloudflare Turnstile (privacy-friendly CAPTCHA alternative) on sign-up, sign-in and password reset.
 * Off until both TURNSTILE_SITE_KEY (var) and TURNSTILE_SECRET_KEY (secret) are set, so local
 * development and tests are unaffected.
 */
import type { Ctx } from '../app';
import { clientKey } from '../app';
import { badRequest } from './errors';

const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

export const turnstileEnabled = (env: Env) => !!(env.TURNSTILE_SITE_KEY && env.TURNSTILE_SECRET_KEY);

export async function assertHuman(c: Ctx, token: string | undefined, action: string): Promise<void> {
  if (!turnstileEnabled(c.env)) return;
  const fail = () => badRequest('Please complete the “I am human” check and try again.', { turnstile: 'Required' });
  if (!token) throw fail();
  const form = new FormData();
  form.append('secret', c.env.TURNSTILE_SECRET_KEY!);
  form.append('response', token);
  form.append('remoteip', clientKey(c));
  form.append('idempotency_key', crypto.randomUUID());
  let outcome: { success: boolean; action?: string; hostname?: string; 'error-codes'?: string[] };
  try {
    const res = await fetch(VERIFY_URL, { method: 'POST', body: form, signal: AbortSignal.timeout(5000) });
    outcome = (await res.json()) as typeof outcome;
  } catch (err) {
    // Turnstile itself is down: don't lock everyone out. Rate limits still apply.
    console.warn('[turnstile] verify unavailable', (err as Error).message);
    return;
  }
  if (!outcome.success || (outcome.action && outcome.action !== action)) {
    console.warn('[turnstile] rejected', action, outcome['error-codes']);
    throw fail();
  }
}
