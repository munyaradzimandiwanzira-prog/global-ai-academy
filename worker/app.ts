import { Hono } from 'hono';
import type { Context } from 'hono';
import type { z } from 'zod';
import type { UserRow } from './lib/db';
import { effectivePlan } from './lib/db';
import { fromZod, forbidden, unauthorized, badRequest } from './lib/errors';
import { can, type Permission } from '@shared/rbac';

export type AppEnv = {
  Bindings: Env;
  Variables: {
    user: UserRow | null;
    sessionId: string | null;
    /** Signed-in admin who has not enrolled in two-step login (acting with learner permissions). */
    mfaSetupRequired: boolean;
  };
};

export type Ctx = Context<AppEnv>;

export const createRouter = () => new Hono<AppEnv>();

export function requireUser(c: Ctx): UserRow {
  const user = c.get('user');
  if (!user) throw unauthorized();
  return user;
}

export function requirePermission(c: Ctx, perm: Permission, message?: string): UserRow {
  const user = requireUser(c);
  if (!can({ role: user.role, plan: effectivePlan(user) }, perm)) throw forbidden(message);
  return user;
}

export async function body<S extends z.ZodTypeAny>(c: Ctx, schema: S): Promise<z.infer<S>> {
  let raw: unknown;
  try {
    raw = await c.req.json();
  } catch {
    throw badRequest('Request body must be JSON.');
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) throw fromZod(parsed.error);
  return parsed.data;
}

/** Hash of the client IP — used as a rate-limit key without storing raw IPs. */
export function clientKey(c: Ctx): string {
  return c.req.header('cf-connecting-ip') ?? c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ?? 'local';
}

