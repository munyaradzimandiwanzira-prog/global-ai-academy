/**
 * Single place for business configuration: contact details, plans and pricing.
 * Edit this file to change what the site shows — no other code changes needed.
 */

export const SITE = {
  name: 'Global AI Academy',
  tagline: 'Learn to code. Build AI. Ship it from Zimbabwe to the world.',
  contact: {
    email: 'munyaradzimandiwanzira@gmail.com',
    phone: '+263 77 977 9062',
    whatsapp: '+263779779062',
    address: '7 Kenilworth Avenue, Highlands, Harare, Zimbabwe',
    addressShort: 'Highlands, Harare',
    mapsUrl: 'https://www.google.com/maps/search/?api=1&query=7+Kenilworth+Avenue+Highlands+Harare',
    hours: 'Mon–Fri, 08:00–17:00 CAT',
  },
  social: {
    linkedin: '',
    x: '',
    facebook: '',
    youtube: '',
  },
} as const;

/** Plans a learner can hold today. Stored in `users.plan`. */
export type PlanId = 'free' | 'plus' | 'academy';
/** Every plan shown on the pricing page, including ones not on sale yet. */
export type CatalogPlanId = PlanId | 'premium';
export type BillingPeriod = 'monthly' | 'yearly';

/**
 * Paying for a full year costs 10 months: two months free (≈17% off).
 * Change this one number to change every yearly price on the site.
 */
export const YEARLY_MONTHS_CHARGED = 10;

export interface Plan {
  id: CatalogPlanId;
  name: string;
  priceUsdMonthly: number;
  blurb: string;
  features: string[];
  /** AI requests per day (hints, tutor, grading). */
  aiDailyLimit: number;
  /** Not purchasable yet: shown with a waitlist instead of checkout. */
  comingSoon?: boolean;
  highlight?: boolean;
}

export const yearlyPrice = (p: Pick<Plan, 'priceUsdMonthly'>) => p.priceUsdMonthly * YEARLY_MONTHS_CHARGED;
export const yearlySaving = (p: Pick<Plan, 'priceUsdMonthly'>) => p.priceUsdMonthly * 12 - yearlyPrice(p);
export const yearlyDiscountPercent = Math.round((1 - YEARLY_MONTHS_CHARGED / 12) * 100);
export const priceFor = (p: Pick<Plan, 'priceUsdMonthly'>, period: BillingPeriod) => (period === 'yearly' ? yearlyPrice(p) : p.priceUsdMonthly);
export const usd = (n: number) => `$${n.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;

const FREE: Plan = {
  id: 'free',
  name: 'Free',
  priceUsdMonthly: 0,
  blurb: 'Every tutorial, every editor, forever free.',
  features: [
    'All tutorials, references, examples and exercises',
    'Run Python, JavaScript, HTML, CSS and SQL in the browser',
    'Coding challenges with automatic tests',
    'Quizzes for every track',
    'Kids Zone games',
    'Progress saved to your account',
    '15 AI coach hints a day',
  ],
  aiDailyLimit: 15,
};

const PLUS: Plan = {
  id: 'plus',
  name: 'Plus',
  priceUsdMonthly: 35,
  blurb: 'For self-driven learners who want structure and proof.',
  features: [
    'Everything in Free',
    'Professor Zuva, the AI tutor, on every lesson',
    'Personal goals and weekly study plans',
    'Certification exams and verifiable certificates',
    'Saved projects you can share by link',
    'Learning analytics and streak protection',
    '150 AI requests a day',
  ],
  aiDailyLimit: 150,
  highlight: true,
};

const ACADEMY: Plan = {
  id: 'academy',
  name: 'Academy',
  priceUsdMonthly: 55,
  blurb: 'Teacher-led classes for serious engineers.',
  features: [
    'Everything in Plus',
    'Join teacher-led classrooms and live sessions',
    'Graded assignments with AI and teacher feedback',
    'Capstone project reviewed by a mentor',
    'Class announcements and discussions',
    'Career paths from entry level to lead engineer',
    '400 AI requests a day',
  ],
  aiDailyLimit: 400,
};

const PREMIUM: Plan = {
  id: 'premium',
  name: 'Premium',
  priceUsdMonthly: 400,
  blurb: 'Mentored like a staff engineer. Opening soon.',
  features: [
    'Everything in Academy',
    'Weekly 1:1 mentorship with a senior engineer',
    'Small live cohort with a dedicated lead instructor',
    'Cloud GPU lab credits for real model training',
    'Portfolio, CV and interview preparation',
    'Industry capstone and placement introductions',
    'Unlimited AI tutor and priority support',
  ],
  aiDailyLimit: 1000,
  comingSoon: true,
};

/** Purchasable plans, keyed by the id stored on the user. */
export const PLANS: Record<PlanId, Plan> = { free: FREE, plus: PLUS, academy: ACADEMY };

/** Everything the pricing page shows, in order. */
export const PLAN_CATALOG: Plan[] = [FREE, PLUS, ACADEMY, PREMIUM];

export const isPurchasable = (id: string): id is Exclude<PlanId, 'free'> => id === 'plus' || id === 'academy';

/** Requests a day for visitors who are not signed in (tracked per IP). */
export const GUEST_AI_DAILY_LIMIT = 5;

export const PLAN_RANK: Record<PlanId, number> = { free: 0, plus: 1, academy: 2 };

export const planAtLeast = (plan: PlanId, min: PlanId) => PLAN_RANK[plan] >= PLAN_RANK[min];

export const XP = {
  lesson: 10,
  exercise: 5,
  challenge: 25,
  quiz: 15,
  exam: 100,
  assignment: 50,
  kids: 5,
  capstone: 300,
} as const;

export function levelForXp(xp: number) {
  // Gentle curve: level n needs 50 * n^1.5 cumulative XP.
  let level = 1;
  while (50 * Math.pow(level, 1.5) <= xp) level++;
  const floor = level === 1 ? 0 : 50 * Math.pow(level - 1, 1.5);
  const ceil = 50 * Math.pow(level, 1.5);
  return { level, progress: (xp - floor) / (ceil - floor), nextAt: Math.ceil(ceil) };
}

export function rankForXp(xp: number) {
  if (xp >= 5000) return { name: 'Great Zimbabwe', color: '#D4A64A' };
  if (xp >= 2500) return { name: 'Baobab', color: '#6B3A1E' };
  if (xp >= 1000) return { name: 'Msasa', color: '#B4472A' };
  if (xp >= 300) return { name: 'Mopane', color: '#23807F' };
  return { name: 'Seedling', color: '#5B8C3A' };
}

/** Saved projects per account: Free keeps a few, paid plans keep a portfolio. */
export const PROJECT_LIMITS: Record<PlanId, number> = { free: 3, plus: 100, academy: 200 };

export const TRIAL = { plan: 'plus' as const, days: 7 };

export const EXAM = { questionCount: 15, passPercent: 70, cooldownHours: 12 } as const;
