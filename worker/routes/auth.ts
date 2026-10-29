import { createRouter, body, clientKey, requireUser } from '../app';
import { appBase, isLocalRequest } from '../lib/urls';
import { signupSchema, loginSchema, forgotSchema, resetSchema, verifySchema, changePasswordSchema, mfaVerifySchema } from '@shared/schemas';
import { hashPassword, verifyPassword, DUMMY_HASH, newId, randomToken, sha256Hex } from '../lib/crypto';
import { createSession, destroySession, destroyAllSessions } from '../lib/session';
import { audit, nowIso, toPublicUser, type UserRow } from '../lib/db';
import { conflict, unauthorized, badRequest, forbidden } from '../lib/errors';
import { hit } from '../lib/ratelimit';
import { sendEmail, actionEmail, emailConfigured } from '../lib/email';
import { assertPasswordNotBreached } from '../lib/password-policy';
import { assertHuman, turnstileEnabled } from '../lib/turnstile';
import { createChallenge, limitCodeAttempts, MFA_CHALLENGE_ATTEMPTS, verifySecondFactor } from '../lib/mfa';

const AVATAR_COLORS = ['#23807F', '#142B52', '#6B3A1E', '#B88A2E', '#5B8C3A', '#8C3A5B', '#3A5B8C'];

const auth = createRouter();

/** Promotes a verified account whose email is listed in the ADMIN_EMAILS secret. Idempotent. */
async function promoteIfAdmin(env: Env, user: Pick<UserRow, 'id' | 'email' | 'role'> & { email_verified_at: string | null }) {
  if (!user.email_verified_at || user.role === 'admin') return false;
  const admins = (env.ADMIN_EMAILS ?? '').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
  if (!admins.includes(user.email.toLowerCase())) return false;
  await env.DB.prepare("UPDATE users SET role = 'admin', updated_at = ? WHERE id = ?").bind(nowIso(), user.id).run();
  await audit(env.DB, user.id, 'user.promoted_admin', user.id, { via: 'ADMIN_EMAILS' });
  return true;
}

async function issueEmailToken(c: Parameters<typeof requireUser>[0], user: Pick<UserRow, 'id' | 'name' | 'email'>, purpose: 'verify' | 'reset') {
  const token = randomToken(32);
  const ttlHours = purpose === 'verify' ? 72 : 1;
  await c.env.DB.prepare('INSERT INTO email_tokens (id, user_id, purpose, expires_at) VALUES (?, ?, ?, ?)')
    .bind(await sha256Hex(token), user.id, purpose, new Date(Date.now() + ttlHours * 3600_000).toISOString())
    .run();
  const url = `${appBase(c.req.url, c.env.APP_URL)}/${purpose === 'verify' ? 'verify-email' : 'reset-password'}?token=${encodeURIComponent(token)}`;
  const content =
    purpose === 'verify'
      ? actionEmail({
          appName: c.env.APP_NAME, name: user.name, heading: 'Confirm your email',
          intro: 'Welcome to Global AI Academy! Confirm your email so we can save your progress and send you certificates.',
          cta: 'Confirm email', url, outro: 'This link expires in 72 hours.',
        })
      : actionEmail({
          appName: c.env.APP_NAME, name: user.name, heading: 'Reset your password',
          intro: 'Someone asked to reset the password for your account. If that was you, choose a new password below.',
          cta: 'Choose a new password', url, outro: 'This link expires in 1 hour. If you did not ask for this, ignore this email.',
        });
  const sent = await sendEmail(c.env, { to: user.email, toName: user.name, subject: purpose === 'verify' ? 'Confirm your Global AI Academy email' : 'Reset your Global AI Academy password', ...content });
  // Local development only (no email provider): hand the link back so the flow stays testable.
  // Gated on the *request* host — never on config — so a deployed site can't leak reset links.
  return !sent && !emailConfigured(c.env) && isLocalRequest(c.req.url) ? url : undefined;
}

/** What the sign-in forms need to know before rendering (bot check on or off). */
auth.get('/config', (c) => c.json({ turnstileSiteKey: turnstileEnabled(c.env) ? c.env.TURNSTILE_SITE_KEY : null }));

/** Invalidates every outstanding password-reset link for a user (after any password change). */
const burnResetTokens = (db: D1Database, userId: string) =>
  db.prepare("UPDATE email_tokens SET used_at = ? WHERE user_id = ? AND purpose = 'reset' AND used_at IS NULL").bind(nowIso(), userId);

auth.post('/signup', async (c) => {
  await hit(c.env.DB, `signup:${clientKey(c)}`, 10, 3600, 'Too many sign-ups from this network. Try again in an hour.');
  const input = await body(c, signupSchema);
  await assertHuman(c, input.turnstileToken, 'signup');
  const existing = await c.env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(input.email).first();
  if (existing) throw conflict('An account with this email already exists. Sign in instead.');
  await assertPasswordNotBreached(input.password);

  // Everyone starts as a student. Admin is granted only once the address is proven (see promoteIfAdmin),
  // so nobody can claim admin by signing up first with an owner's email they do not control.
  const role = 'student';
  const id = newId();
  const color = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
  await c.env.DB.prepare(
    'INSERT INTO users (id, email, password_hash, name, role, level, city, avatar_color, terms_accepted_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
  )
    .bind(id, input.email, await hashPassword(input.password), input.name, role, input.level, input.city ?? null, color, nowIso())
    .run();

  if (input.wantsToTeach && role === 'student') {
    await c.env.DB.prepare('INSERT INTO teacher_requests (id, user_id, message) VALUES (?, ?, ?)').bind(newId(), id, 'Requested at sign-up').run();
  }
  await audit(c.env.DB, id, 'user.signup', id, { role });
  await createSession(c, id);
  const user = await c.env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(id).first<UserRow>();
  const devVerifyUrl = await issueEmailToken(c, user!, 'verify');
  return c.json({ user: toPublicUser(user!), devVerifyUrl }, 201);
});

auth.post('/login', async (c) => {
  const input = await body(c, loginSchema);
  await hit(c.env.DB, `login:${clientKey(c)}`, 30, 900, 'Too many sign-in attempts. Wait 15 minutes and try again.');
  await hit(c.env.DB, `login-email:${input.email}`, 10, 900, 'Too many attempts for this account. Wait 15 minutes or reset your password.');
  await assertHuman(c, input.turnstileToken, 'login');
  const user = await c.env.DB.prepare('SELECT * FROM users WHERE email = ?').bind(input.email).first<UserRow>();
  const ok = await verifyPassword(input.password, user?.password_hash ?? DUMMY_HASH);
  if (!user || !ok) {
    if (user) await audit(c.env.DB, user.id, 'auth.login_failed', user.id);
    throw unauthorized('That email and password do not match.');
  }
  if (user.disabled_at) throw forbidden('This account has been disabled. Contact support.');
  if (await promoteIfAdmin(c.env, user)) user.role = 'admin';
  if (user.mfa_enabled_at) {
    // Password is right, but no session until the second step passes.
    return c.json({ mfaRequired: true, challenge: await createChallenge(c.env.DB, user.id) });
  }
  await createSession(c, user.id);
  await audit(c.env.DB, user.id, 'auth.login', user.id);
  return c.json({ user: toPublicUser(user) });
});

/** Second step of sign-in: a code from the authenticator app, or a one-use recovery code. */
auth.post('/mfa/verify', async (c) => {
  const input = await body(c, mfaVerifySchema);
  const id = await sha256Hex(input.challenge);
  const expired = () => unauthorized('This sign-in has expired. Enter your email and password again.');
  const ch = await c.env.DB.prepare('UPDATE mfa_challenges SET attempts = attempts + 1 WHERE id = ? RETURNING user_id, expires_at, attempts')
    .bind(id).first<{ user_id: string; expires_at: string; attempts: number }>();
  if (!ch || ch.expires_at < nowIso() || ch.attempts > MFA_CHALLENGE_ATTEMPTS) throw expired();
  await limitCodeAttempts(c, ch.user_id);
  const user = await c.env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(ch.user_id).first<UserRow>();
  if (!user || user.disabled_at || !user.mfa_enabled_at) throw expired();
  const method = await verifySecondFactor(c.env, user, input.code);
  if (!method) {
    await audit(c.env.DB, user.id, 'auth.mfa_failed', user.id);
    throw badRequest('That code is not right. Check the time on your phone, or use a recovery code.', { code: 'Incorrect code' });
  }
  await c.env.DB.prepare('DELETE FROM mfa_challenges WHERE id = ?').bind(id).run();
  await createSession(c, user.id);
  await audit(c.env.DB, user.id, 'auth.login', user.id, { mfa: method });
  return c.json({ user: toPublicUser(user), usedRecoveryCode: method === 'recovery' });
});

auth.post('/logout', async (c) => {
  await destroySession(c);
  return c.json({ ok: true });
});

auth.post('/verify-email', async (c) => {
  const { token } = await body(c, verifySchema);
  const id = await sha256Hex(token);
  const row = await c.env.DB.prepare("SELECT * FROM email_tokens WHERE id = ? AND purpose = 'verify'").bind(id).first<{ user_id: string; expires_at: string; used_at: string | null }>();
  if (!row || row.used_at || row.expires_at < nowIso()) throw badRequest('This confirmation link is invalid or has expired. Request a new one from your profile.');
  await c.env.DB.batch([
    c.env.DB.prepare('UPDATE email_tokens SET used_at = ? WHERE id = ?').bind(nowIso(), id),
    c.env.DB.prepare('UPDATE users SET email_verified_at = COALESCE(email_verified_at, ?) WHERE id = ?').bind(nowIso(), row.user_id),
  ]);
  const verified = await c.env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(row.user_id).first<UserRow>();
  if (verified) await promoteIfAdmin(c.env, verified);
  return c.json({ ok: true });
});

auth.post('/resend-verification', async (c) => {
  const user = requireUser(c);
  if (user.email_verified_at) return c.json({ ok: true, alreadyVerified: true });
  await hit(c.env.DB, `verify-resend:${user.id}`, 3, 3600, 'You can request 3 confirmation emails an hour.');
  const devVerifyUrl = await issueEmailToken(c, user, 'verify');
  return c.json({ ok: true, devVerifyUrl });
});

auth.post('/forgot', async (c) => {
  const { email, turnstileToken } = await body(c, forgotSchema);
  await hit(c.env.DB, `forgot:${clientKey(c)}`, 5, 3600, 'Too many reset requests. Try again in an hour.');
  await assertHuman(c, turnstileToken, 'forgot');
  // Per-address brake too, so nobody can flood one inbox from many networks.
  await hit(c.env.DB, `forgot-email:${email}`, 3, 3600, 'Too many reset requests. Try again in an hour.');
  const user = await c.env.DB.prepare('SELECT id, name, email FROM users WHERE email = ? AND disabled_at IS NULL').bind(email).first<UserRow>();
  let devResetUrl: string | undefined;
  if (user) devResetUrl = await issueEmailToken(c, user, 'reset');
  // Same response whether or not the account exists (no account enumeration).
  return c.json({ ok: true, devResetUrl });
});

auth.post('/reset', async (c) => {
  const input = await body(c, resetSchema);
  const id = await sha256Hex(input.token);
  const row = await c.env.DB.prepare("SELECT * FROM email_tokens WHERE id = ? AND purpose = 'reset'").bind(id).first<{ user_id: string; expires_at: string; used_at: string | null }>();
  if (!row || row.used_at || row.expires_at < nowIso()) throw badRequest('This reset link is invalid or has expired. Request a new one.');
  await assertPasswordNotBreached(input.password);
  await c.env.DB.batch([
    burnResetTokens(c.env.DB, row.user_id),
    c.env.DB.prepare('UPDATE users SET password_hash = ?, email_verified_at = COALESCE(email_verified_at, ?), updated_at = ? WHERE id = ?')
      .bind(await hashPassword(input.password), nowIso(), nowIso(), row.user_id),
  ]);
  await destroyAllSessions(c.env.DB, row.user_id);
  await audit(c.env.DB, row.user_id, 'user.password_reset', row.user_id);
  return c.json({ ok: true });
});

auth.post('/change-password', async (c) => {
  const user = requireUser(c);
  const input = await body(c, changePasswordSchema);
  await hit(c.env.DB, `change-password:${user.id}`, 5, 900, 'Too many attempts. Wait 15 minutes and try again.');
  if (!(await verifyPassword(input.current, user.password_hash))) throw badRequest('Your current password is not correct.', { current: 'Incorrect password' });
  await assertPasswordNotBreached(input.next, 'next');
  await c.env.DB.batch([
    c.env.DB.prepare('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?').bind(await hashPassword(input.next), nowIso(), user.id),
    burnResetTokens(c.env.DB, user.id),
  ]);
  await destroyAllSessions(c.env.DB, user.id, c.get('sessionId'));
  await audit(c.env.DB, user.id, 'user.password_changed', user.id);
  return c.json({ ok: true });
});

export default auth;
