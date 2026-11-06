import { describe, expect, it } from 'vitest';
import { splitCents, inviteProblem, newInviteCode, type InviteRow } from '../worker/lib/teaching';
import { normalizePath, sourceOf, deviceOf } from '../worker/routes/traffic';
import { validatePlan } from '../worker/zuva/teaching';
import { resourceProblem, workHref } from '../worker/lib/assignments';
import { systemPrompt } from '../worker/zuva/persona';
import { addTeacherSchema, assignmentSchema, signupSchema, platformSettingsSchema, walletEntrySchema } from '../shared/schemas';
import { KID_LEVELS } from '../shared/kids-curriculum';

describe('commission split', () => {
  it('splits a pool exactly, giving leftover cents to the first teachers', () => {
    expect(splitCents(100, 3)).toEqual([34, 33, 33]);
    expect(splitCents(50, 1)).toEqual([50]);
    expect(splitCents(7, 2)).toEqual([4, 3]);
    for (const [pool, n] of [[999, 7], [1, 3], [12345, 4]] as const) {
      const parts = splitCents(pool, n);
      expect(parts.reduce((a, b) => a + b, 0)).toBe(pool);
      expect(Math.max(...parts) - Math.min(...parts)).toBeLessThanOrEqual(1);
    }
  });
  it('pays nothing for an empty pool or no teachers', () => {
    expect(splitCents(0, 3)).toEqual([]);
    expect(splitCents(100, 0)).toEqual([]);
    expect(splitCents(-5, 2)).toEqual([]);
  });
});

describe('teacher invites', () => {
  const base: InviteRow = { id: 'i', teacher_id: 't', classroom_id: null, code: 'T-ABC123', label: '', max_uses: null, used: 0, expires_at: null, revoked_at: null, created_at: '2026-01-01T00:00:00Z' };
  it('makes short, readable, unambiguous codes', () => {
    const codes = new Set(Array.from({ length: 200 }, () => newInviteCode()));
    expect(codes.size).toBeGreaterThan(195);
    for (const c of codes) expect(c).toMatch(/^T-[A-HJ-NP-Z2-9]{6}$/);
  });
  it('accepts a live invite and explains every dead one', () => {
    expect(inviteProblem(base)).toBeNull();
    expect(inviteProblem(null)).toMatch(/isn’t active/);
    expect(inviteProblem({ ...base, revoked_at: '2026-01-02T00:00:00Z' })).toMatch(/isn’t active/);
    expect(inviteProblem({ ...base, expires_at: '2020-01-01T00:00:00Z' })).toMatch(/expired/);
    expect(inviteProblem({ ...base, max_uses: 2, used: 2 })).toMatch(/maximum/);
    expect(inviteProblem({ ...base, max_uses: 2, used: 1 })).toBeNull();
  });
  it('signup and add-teacher validate codes and cap chosen teachers', () => {
    expect(signupSchema.safeParse({ name: 'Rudo', email: 'r@example.com', password: 'Passw0rd1', acceptTerms: true, inviteCode: 'T-ABC123' }).success).toBe(true);
    expect(signupSchema.safeParse({ name: 'Rudo', email: 'r@example.com', password: 'Passw0rd1', acceptTerms: true, inviteCode: 'bad code!' }).success).toBe(false);
    expect(signupSchema.safeParse({ name: 'Rudo', email: 'r@example.com', password: 'Passw0rd1', acceptTerms: true, teacherIds: ['a', 'b', 'c', 'd'] }).success).toBe(false);
    expect(addTeacherSchema.safeParse({ code: 'T-ABC123' }).success).toBe(true);
    expect(addTeacherSchema.safeParse({ teacherId: 'x' }).success).toBe(true);
    expect(addTeacherSchema.safeParse({}).success).toBe(false);
  });
});

describe('admin money inputs', () => {
  it('caps the commission rate and requires notes on wallet entries', () => {
    expect(platformSettingsSchema.safeParse({ commissionRatePercent: 10 }).success).toBe(true);
    expect(platformSettingsSchema.safeParse({ commissionRatePercent: 80 }).success).toBe(false);
    expect(walletEntrySchema.safeParse({ teacherId: 't', kind: 'payout', amountCents: 500, note: 'EcoCash' }).success).toBe(true);
    expect(walletEntrySchema.safeParse({ teacherId: 't', kind: 'payout', amountCents: 0, note: 'EcoCash' }).success).toBe(false);
    expect(walletEntrySchema.safeParse({ teacherId: 't', kind: 'commission', amountCents: 500, note: 'sneaky' }).success).toBe(false);
  });
});

describe('assignments', () => {
  const level = KID_LEVELS[0]!.key;
  it('accepts real lessons and Kids levels and rejects anything else', () => {
    expect(resourceProblem('lesson', 'python/intro')).toBeNull();
    expect(resourceProblem('lesson', 'python/not-a-lesson')).toBeTruthy();
    expect(resourceProblem('kids', level)).toBeNull();
    expect(resourceProblem('kids', 'nope:1')).toBeTruthy();
    expect(resourceProblem('code', '')).toBeNull();
  });
  it('sends learners to where the work lives', () => {
    expect(workHref({ id: 'a1', kind: 'lesson', resource: 'python/intro' })).toBe('/learn/python/intro?assignment=a1');
    expect(workHref({ id: 'a1', kind: 'code', resource: '' })).toBe('/assignments/a1');
    expect(workHref({ id: 'a1', kind: 'kids', resource: level })).toMatch(/^\/kids\//);
  });
  it('lesson work needs no written instructions beyond a few words', () => {
    expect(assignmentSchema.safeParse({ title: 'Loops', instructions: 'Do it', kind: 'lesson', resource: 'python/intro', studentIds: [] }).success).toBe(true);
  });
});

describe('lesson plan validation', () => {
  const raw = {
    title: 'Loops', overview: 'Learners meet for-loops.', objectives: ['Write a for-loop'], priorKnowledge: ['print'], materials: ['Laptops'],
    timeline: [{ minutes: 10, phase: 'Starter', teacher: 'Ask', learners: 'Answer' }, { minutes: 25, phase: 'Main', teacher: 'Model', learners: 'Code' }, { minutes: 10, phase: 'Plenary', teacher: 'Quiz', learners: 'Reflect' }],
    differentiation: { support: ['Pairs'], stretch: ['Nested loops'] }, assessment: ['Exit ticket'], homework: 'Lesson 3',
    resources: [{ title: 'Real lesson', path: '/learn/python/intro' }, { title: 'Evil', path: 'https://evil.example' }],
  };
  it('rescales the timeline to the exact session length', () => {
    for (const m of [30, 40, 45, 60, 90, 120]) {
      const plan = validatePlan(raw, m);
      expect(plan.timeline.reduce((n, t) => n + t.minutes, 0)).toBe(m);
      expect(plan.timeline.every((t) => t.minutes >= 1)).toBe(true);
    }
  });
  it('drops links that are not real Academy pages', () => {
    const plan = validatePlan(raw, 45);
    expect(plan.resources.map((r) => r.path)).toEqual(['/learn/python/intro']);
  });
  it('refuses an empty plan', () => {
    expect(() => validatePlan({ title: 'x' }, 40)).toThrow();
  });
});

describe('traffic', () => {
  it('groups pages by shape and never counts the API', () => {
    expect(normalizePath('/classes/abc123?tab=x')).toBe('/classes/:id');
    expect(normalizePath('/teach/students/u1')).toBe('/teach/students/:id');
    expect(normalizePath('/join/T-ABC123')).toBe('/join/:code');
    expect(normalizePath('/learn/python/')).toBe('/learn/python');
    expect(normalizePath('/')).toBe('/');
    expect(normalizePath('/api/me')).toBeNull();
    expect(normalizePath('https://evil.example/x')).toBeNull();
    expect(normalizePath('//evil.example')).toBeNull();
  });
  it('names sources and devices', () => {
    expect(sourceOf('', 'skurulearning.com')).toBe('direct');
    expect(sourceOf('https://l.facebook.com/x', 'skurulearning.com')).toBe('facebook.com');
    expect(sourceOf('https://www.skurulearning.com/a', 'skurulearning.com')).toBe('internal');
    expect(sourceOf('not a url', 'x')).toBe('direct');
    expect(deviceOf('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)')).toBe('mobile');
    expect(deviceOf('Mozilla/5.0 (iPad; CPU OS 17_0)')).toBe('tablet');
    expect(deviceOf('Mozilla/5.0 (Windows NT 10.0; Win64; x64)')).toBe('desktop');
  });
});

describe('Zuva teacher agent prompt', () => {
  const p = systemPrompt('teacher', null, [], '', { firstName: 'Rudo', school: 'Gweru High', classes: [{ name: 'Form 2', learners: 30, level: 'beginner' }], students: 30 });
  it('is a colleague for the teacher, scoped to their own learners', () => {
    expect(p).toMatch(/teacher/i);
    expect(p).toMatch(/own (learners|students)/i);
    expect(p).toMatch(/draft/i);
    expect(p).toMatch(/safeguarding/i);
    expect(p).not.toMatch(/You are talking to a child/i);
  });
});
