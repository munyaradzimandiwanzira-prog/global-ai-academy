import type { PublicUser } from '@shared/api-types';
import type { PlanId } from '@shared/config';
import type { Role } from '@shared/rbac';
import type { Level } from '@shared/content';

export const nowIso = () => new Date().toISOString();
export const todayUtc = () => new Date().toISOString().slice(0, 10);

export interface UserRow {
  id: string;
  email: string;
  email_verified_at: string | null;
  password_hash: string;
  name: string;
  role: Role;
  plan: PlanId;
  plan_expires_at: string | null;
  level: Level;
  city: string | null;
  school: string | null;
  bio: string | null;
  avatar_color: string;
  xp: number;
  streak: number;
  last_active_day: string | null;
  last_lesson: string | null;
  disabled_at: string | null;
  trial_used_at: string | null;
  mfa_secret: string | null;
  mfa_pending_secret: string | null;
  mfa_enabled_at: string | null;
  mfa_last_step: number | null;
  terms_accepted_at: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

/** Effective plan: a lapsed subscription falls back to free without a cron job. */
export function effectivePlan(u: Pick<UserRow, 'plan' | 'plan_expires_at'>): PlanId {
  if (u.plan === 'free') return 'free';
  if (u.plan_expires_at && u.plan_expires_at < nowIso()) return 'free';
  return u.plan;
}

export function toPublicUser(u: UserRow): PublicUser {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    emailVerified: !!u.email_verified_at,
    role: u.role,
    plan: effectivePlan(u),
    planExpiresAt: u.plan_expires_at,
    level: u.level,
    city: u.city,
    school: u.school,
    bio: u.bio,
    xp: u.xp,
    streak: u.streak,
    avatarColor: u.avatar_color,
    createdAt: u.created_at,
    trialAvailable: !u.trial_used_at && u.role === 'student' && effectivePlan(u) === 'free',
    mfaEnabled: !!u.mfa_enabled_at,
  };
}

export function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export async function audit(db: D1Database, actorId: string | null, action: string, target?: string, meta?: unknown) {
  await db
    .prepare('INSERT INTO audit_log (actor_id, action, target, meta) VALUES (?, ?, ?, ?)')
    .bind(actorId, action, target ?? null, meta === undefined ? null : JSON.stringify(meta))
    .run();
}
