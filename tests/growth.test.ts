import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PLANS, PLAN_CATALOG, priceFor, yearlyPrice, yearlySaving, yearlyDiscountPercent, isPurchasable, PROJECT_LIMITS } from '../shared/config';
import { can } from '../shared/rbac';
import { promoProblem, type PromoRow } from '../shared/promo';
import { recommend } from '../src/features/start/recommend';
import { BUG_LEVELS } from '../src/features/kids/games/bug-levels';
import { PICTURES } from '../src/features/kids/games/pixel-pictures';
import { REFERENCES } from '../src/data/references';
import { CAREERS } from '../src/data/careers';
import { checkoutSchema, liveSessionSchema, capstoneSchema, promoCreateSchema } from '../shared/schemas';

const trackIds = new Set(
  readdirSync(join(__dirname, '../content/tracks'))
    .filter((f) => f.endsWith('.md'))
    .map((f) => /^id:\s*(\S+)/m.exec(readFileSync(join(__dirname, '../content/tracks', f), 'utf8'))![1]),
);

describe('pricing', () => {
  it('matches the owner’s prices: Plus $35, Academy $55, Premium $400 a month', () => {
    expect(PLANS.plus.priceUsdMonthly).toBe(35);
    expect(PLANS.academy.priceUsdMonthly).toBe(55);
    const premium = PLAN_CATALOG.find((p) => p.id === 'premium')!;
    expect(premium.priceUsdMonthly).toBe(400);
    expect(premium.comingSoon).toBe(true);
  });

  it('charges 10 months for a year (two months free, 17%)', () => {
    expect(yearlyPrice(PLANS.plus)).toBe(350);
    expect(yearlyPrice(PLANS.academy)).toBe(550);
    expect(yearlySaving(PLANS.academy)).toBe(110);
    expect(yearlyDiscountPercent).toBe(17);
    expect(priceFor(PLANS.plus, 'monthly')).toBe(35);
  });

  it('never sells Premium or Free through checkout', () => {
    expect(isPurchasable('premium')).toBe(false);
    expect(isPurchasable('free')).toBe(false);
    expect(checkoutSchema.safeParse({ plan: 'premium', period: 'monthly' }).success).toBe(false);
  });
});

describe('promo codes', () => {
  const base: PromoRow = { code: 'X', percent_off: 20, plans: '["plus"]', periods: '["yearly"]', max_uses: 2, used: 0, expires_at: null, active: 1, description: '', created_at: '' };
  it('accepts a valid code', () => expect(promoProblem(base, 'plus', 'yearly')).toBeNull());
  it('rejects inactive, expired, used-up and out-of-scope codes', () => {
    expect(promoProblem({ ...base, active: 0 }, 'plus', 'yearly')).toMatch(/not exist|no longer/);
    expect(promoProblem({ ...base, expires_at: '2000-01-01' }, 'plus', 'yearly')).toMatch(/expired/);
    expect(promoProblem({ ...base, used: 2 }, 'plus', 'yearly')).toMatch(/fully used/);
    expect(promoProblem(base, 'academy', 'yearly')).toMatch(/does not apply/);
    expect(promoProblem(base, 'plus', 'monthly')).toMatch(/only applies/);
    expect(promoProblem(null, 'plus', 'yearly')).toBeTruthy();
  });
  it('validates admin input', () => {
    expect(promoCreateSchema.safeParse({ code: 'ok-1', percentOff: 101 }).success).toBe(false);
    expect(promoCreateSchema.parse({ code: 'school-2026', percentOff: 25 }).code).toBe('SCHOOL-2026');
  });
});

describe('RBAC for new features', () => {
  it('gates sharing, capstones and reviews by plan and role', () => {
    expect(can({ role: 'student', plan: 'free' }, 'projects.share')).toBe(false);
    expect(can({ role: 'student', plan: 'plus' }, 'projects.share')).toBe(true);
    expect(can({ role: 'student', plan: 'plus' }, 'capstone.submit')).toBe(false);
    expect(can({ role: 'student', plan: 'academy' }, 'capstone.submit')).toBe(true);
    expect(can({ role: 'student', plan: 'academy' }, 'capstone.review')).toBe(false);
    expect(can({ role: 'teacher', plan: 'free' }, 'capstone.review')).toBe(true);
    expect(can({ role: 'teacher', plan: 'free' }, 'billing.manage')).toBe(false);
    expect(can({ role: 'admin', plan: 'free' }, 'billing.manage')).toBe(true);
    expect(PROJECT_LIMITS.free).toBeLessThan(PROJECT_LIMITS.plus);
  });
});

describe('input safety', () => {
  it('rejects non-http links for meetings and capstones', () => {
    const start = new Date().toISOString();
    expect(liveSessionSchema.safeParse({ title: 'Loops', startsAt: start, meetingUrl: 'javascript:alert(1)' }).success).toBe(false);
    expect(liveSessionSchema.safeParse({ title: 'Loops', startsAt: start, meetingUrl: 'https://meet.google.com/x' }).success).toBe(true);
    expect(capstoneSchema.safeParse({ title: 'App', demoUrl: 'data:text/html,hi' }).success).toBe(false);
  });
});

describe('where to start', () => {
  it('recommends tracks and careers that exist, for every combination of answers', () => {
    const careerIds = new Set(CAREERS.map((c) => c.id));
    for (const age of ['child', 'teen', 'adult'] as const)
      for (const goal of ['fun', 'web', 'data', 'ai', 'mobile', 'hardware', 'job'] as const)
        for (const experience of ['none', 'some', 'working'] as const)
          for (const time of ['light', 'steady', 'serious'] as const) {
            const r = recommend({ age, goal, experience, time });
            for (const id of r.first) expect(trackIds.has(id), `track ${id}`).toBe(true);
            if (r.career) expect(careerIds.has(r.career), `career ${r.career}`).toBe(true);
          }
  });
});

describe('kids games', () => {
  it('every Bug Hunt level has its bug and answer in range', () => {
    for (const l of BUG_LEVELS) {
      expect(l.bug).toBeLessThan(l.lines.length);
      expect(l.answer).toBeLessThan(l.fixes.length);
      expect(l.fixes[l.answer]).not.toBe(l.lines[l.bug]);
    }
  });

  it('every Pixel Painter 3-star target is achievable', () => {
    for (const p of PICTURES) {
      // Best possible: per row, fill with one colour then fix the odd squares one by one.
      const best = p.rows.reduce((n, row) => {
        const colours = [...new Set(row)];
        return n + Math.min(...colours.map((c) => 1 + [...row].filter((x) => x !== c).length));
      }, 0);
      expect(best, p.title).toBeLessThanOrEqual(p.par);
      expect(p.rows.every((r) => r.length === 8)).toBe(true);
      expect(p.rows).toHaveLength(7);
    }
  });
});

describe('references', () => {
  it('link to real tutorials and have unique entry names within each section (they become anchors)', () => {
    for (const r of REFERENCES) {
      expect(trackIds.has(r.trackId), r.trackId).toBe(true);
      for (const s of r.sections) {
        const names = s.entries.map((e) => e[0]);
        expect(new Set(names).size, `${r.id} / ${s.title}`).toBe(names.length);
      }
    }
  });
});
