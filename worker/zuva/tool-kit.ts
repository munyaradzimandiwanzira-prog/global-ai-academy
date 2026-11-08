/** Shared types and helpers for Zuva's tools (kept apart so tool files can import them without cycles). */
import type { ToolSpec } from '../lib/openai';
import type { UserRow } from '../lib/db';
import type { ZuvaActivity, ZuvaEvent, ZuvaMode } from '@shared/zuva';
import type { StageId } from '@shared/kids-curriculum';
import type { LearnerContext } from './profile';
import type { EslSession } from '../esl/mcp';
import type { MathsSession } from '../maths/tools';

export interface ToolCtx {
  /** Kids Zone stage the child picked, if any. */
  stage?: StageId;
  env: Env;
  user: UserRow | null;
  learner: LearnerContext | null;
  mode: ZuvaMode;
  activity?: ZuvaActivity;
  memoryEnabled: boolean;
  emit: (e: ZuvaEvent) => void;
  /** English course session (identity, level, taint flag), when mode is 'esl'. */
  esl?: EslSession;
  /** Maths course session, when mode is 'maths'. */
  maths?: MathsSession;
}

export interface ZuvaTool {
  spec: ToolSpec;
  /** Status line shown while the tool runs. */
  label: string;
  modes: ZuvaMode[];
  signedIn?: boolean;
  needsMemory?: boolean;
  run: (ctx: ToolCtx, args: Record<string, unknown>) => Promise<string>;
}

export const str = (v: unknown, max = 300) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
export const obj = (properties: Record<string, unknown>, required: string[] = []) => ({ type: 'object', properties, required, additionalProperties: false });

