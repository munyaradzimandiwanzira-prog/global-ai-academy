import type { Ctx } from '../app';
import { clientKey } from '../app';
import { GUEST_AI_DAILY_LIMIT, PLANS } from '@shared/config';
import { effectivePlan } from './db';
import { hit, peek } from './ratelimit';

const DAY = 86400;
/** ~$5–15/day at current small-model prices; override with the AI_GLOBAL_DAILY_LIMIT var. */
const DEFAULT_GLOBAL_DAILY_LIMIT = 4000;

function quotaKey(c: Ctx): { key: string; limit: number } {
  const user = c.get('user');
  if (!user) return { key: `ai:guest:${clientKey(c)}`, limit: GUEST_AI_DAILY_LIMIT };
  const limit = user.role === 'student' ? PLANS[effectivePlan(user)].aiDailyLimit : 600;
  return { key: `ai:user:${user.id}`, limit };
}

export async function consumeAiQuota(c: Ctx): Promise<{ used: number; limit: number }> {
  const { key, limit } = quotaKey(c);
  const message = c.get('user')
    ? `You have used today's ${limit} AI requests. They reset at midnight UTC — or upgrade for more.`
    : `Guests get ${limit} AI hints a day. Create a free account for more.`;
  const used = await hit(c.env.DB, key, limit, DAY, message);
  // Site-wide circuit breaker: however many accounts someone creates, AI spend per day is bounded.
  const globalLimit = Number(c.env.AI_GLOBAL_DAILY_LIMIT) || DEFAULT_GLOBAL_DAILY_LIMIT;
  await hit(c.env.DB, 'ai:global', globalLimit, DAY, 'Our AI helpers are very busy today. Please try again tomorrow.');
  return { used, limit };
}

export async function aiQuotaStatus(c: Ctx): Promise<{ used: number; limit: number }> {
  const { key, limit } = quotaKey(c);
  return { used: await peek(c.env.DB, key, DAY), limit };
}
