import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword, randomCode, sha512HexUpper, timingSafeEqual } from '../worker/lib/crypto';
import { paynowHash, verifyPaynowHash, parseFormEncoded } from '../worker/lib/paynow';
import { can, permissionsFor } from '../shared/rbac';
import { levelForXp } from '../shared/config';
import { safeNext } from '../src/lib/utils';
import { signupSchema } from '../shared/schemas';

describe('password hashing', () => {
  it('verifies the right password and rejects the wrong one', async () => {
    const h = await hashPassword('Harare2026!');
    expect(h.startsWith('pbkdf2$100000$')).toBe(true);
    expect(await verifyPassword('Harare2026!', h)).toBe(true);
    expect(await verifyPassword('harare2026!', h)).toBe(false);
    expect(await verifyPassword('x', 'garbage')).toBe(false);
  });

  it('salts every hash', async () => {
    expect(await hashPassword('same-password1')).not.toBe(await hashPassword('same-password1'));
  });

  it('join codes avoid confusing characters', () => {
    for (let i = 0; i < 200; i++) expect(randomCode(6)).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
  });

  it('timing-safe compare', () => {
    expect(timingSafeEqual('abc', 'abc')).toBe(true);
    expect(timingSafeEqual('abc', 'abd')).toBe(false);
    expect(timingSafeEqual('abc', 'abcd')).toBe(false);
  });
});

describe('Paynow hashing', () => {
  it('hashes values in order plus the key, SHA-512 upper-case hex', async () => {
    const fields = { id: '1201', reference: 'TEST REF', amount: '99.99', status: 'Message' };
    expect(await paynowHash(fields, 'key')).toBe(await sha512HexUpper('1201TEST REF99.99Messagekey'));
  });

  it('verifies a round-tripped result notification and rejects tampering', async () => {
    const fields: Record<string, string> = { reference: 'GAA-ABCD', amount: '5.00', paynowreference: '123', status: 'Paid', pollurl: 'https://x' };
    fields.hash = await paynowHash(fields, 'secret');
    const body = new URLSearchParams(fields).toString();
    expect(await verifyPaynowHash(parseFormEncoded(body), 'secret')).toBe(true);
    expect(await verifyPaynowHash(parseFormEncoded(body.replace('5.00', '0.01')), 'secret')).toBe(false);
  });
});

describe('RBAC', () => {
  it('free students get learning and hints only', () => {
    const p = permissionsFor({ role: 'student', plan: 'free' });
    expect(p.has('learn')).toBe(true);
    expect(p.has('ai.tutor')).toBe(false);
    expect(p.has('classroom.join')).toBe(false);
  });
  it('plans unlock features', () => {
    expect(can({ role: 'student', plan: 'plus' }, 'ai.tutor')).toBe(true);
    expect(can({ role: 'student', plan: 'plus' }, 'classroom.join')).toBe(false);
    expect(can({ role: 'student', plan: 'academy' }, 'classroom.join')).toBe(true);
  });
  it('only admins manage users', () => {
    expect(can({ role: 'teacher', plan: 'academy' }, 'users.manage')).toBe(false);
    expect(can({ role: 'admin', plan: 'free' }, 'users.manage')).toBe(true);
  });
  it('guests can learn and get hints', () => {
    expect(can(null, 'learn')).toBe(true);
    expect(can(null, 'ai.tutor')).toBe(false);
  });
});

describe('misc', () => {
  it('prevents open redirects', () => {
    expect(safeNext('/dashboard')).toBe('/dashboard');
    expect(safeNext('//evil.com')).toBe('/');
    expect(safeNext('https://evil.com')).toBe('/');
    expect(safeNext('/\\evil.com')).toBe('/');
  });
  it('levels grow with XP', () => {
    expect(levelForXp(0).level).toBe(1);
    expect(levelForXp(1000).level).toBeGreaterThan(levelForXp(100).level);
  });
  it('validates sign-up input', () => {
    expect(signupSchema.safeParse({ name: 'Tari', email: 'T@Example.com', password: 'short' }).success).toBe(false);
    const ok = signupSchema.safeParse({ name: 'Tari', email: ' T@Example.com ', password: 'longenough1' });
    expect(ok.success && ok.data.email).toBe('t@example.com');
  });
});
