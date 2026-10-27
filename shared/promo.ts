import { PLANS } from './config';

/** A promo code row as stored in D1 (shared so the rules are unit-testable without Workers types). */
export interface PromoRow {
  code: string;
  percent_off: number;
  plans: string;
  periods: string;
  max_uses: number | null;
  used: number;
  expires_at: string | null;
  active: number;
  description: string;
  created_at: string;
}

/** Explains why a code cannot be used, or returns null when it can. */
export function promoProblem(p: PromoRow | null, plan: string, period: string): string | null {
  if (!p || !p.active) return 'That promo code does not exist or is no longer active.';
  if (p.expires_at && p.expires_at.slice(0, 10) < new Date().toISOString().slice(0, 10)) return 'That promo code has expired.';
  if (p.max_uses !== null && p.used >= p.max_uses) return 'That promo code has been fully used.';
  if (!safeList(p.plans).includes(plan)) return `That promo code does not apply to ${PLANS[plan as 'plus'].name}.`;
  if (!safeList(p.periods).includes(period)) return `That promo code only applies to ${period === 'yearly' ? 'monthly' : 'yearly'} billing.`;
  return null;
}


function safeList(json: string): string[] {
  try {
    const v = JSON.parse(json) as unknown;
    return Array.isArray(v) ? v.map(String) : [];
  } catch {
    return [];
  }
}
