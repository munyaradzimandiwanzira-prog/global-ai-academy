import { PLANS, priceFor, type BillingPeriod } from '@shared/config';
import { badRequest } from './errors';
import { promoProblem, type PromoRow } from '@shared/promo';
export type { PromoRow };
import { parseJson } from './db';

export interface Quote {
  plan: 'plus' | 'academy';
  period: BillingPeriod;
  listCents: number;
  amountCents: number;
  percentOff: number;
  promoCode: string | null;
}

/** Server-side price: the browser never decides what a learner pays. */
export async function quote(db: D1Database, plan: 'plus' | 'academy', period: BillingPeriod, code?: string | null): Promise<Quote> {
  const listCents = Math.round(priceFor(PLANS[plan], period) * 100);
  if (!code) return { plan, period, listCents, amountCents: listCents, percentOff: 0, promoCode: null };
  const promo = await db.prepare('SELECT * FROM promo_codes WHERE code = ?').bind(code).first<PromoRow>();
  const problem = promoProblem(promo, plan, period);
  if (problem) throw badRequest(problem, { promoCode: problem });
  const percentOff = promo!.percent_off;
  // Round to whole cents; a 100% code still charges nothing, which Paynow rejects, so callers handle 0.
  const amountCents = Math.max(0, Math.round(listCents * (1 - percentOff / 100)));
  return { plan, period, listCents, amountCents, percentOff, promoCode: promo!.code };
}

export const toPromoDto = (p: PromoRow) => ({
  code: p.code,
  percentOff: p.percent_off,
  plans: parseJson<string[]>(p.plans, []),
  periods: parseJson<string[]>(p.periods, []),
  maxUses: p.max_uses,
  used: p.used,
  expiresAt: p.expires_at,
  active: !!p.active,
  description: p.description,
  createdAt: p.created_at,
});
