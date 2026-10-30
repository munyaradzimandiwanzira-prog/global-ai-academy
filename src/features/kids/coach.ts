import { useMemo } from 'react';

/**
 * The coach bus: games describe what the child is doing, and Zuva (the patient-teacher coach)
 * listens and decides whether to say anything. Games never call the AI directly.
 *
 * Nothing here leaves the device on its own. A short summary is sent to Zuva only when the
 * child (or the coach, on the child's tap) asks for help.
 */
export type CoachEventType = 'level' | 'attempt' | 'complete' | 'hint';

export interface CoachEvent {
  game: string;
  type: CoachEventType;
  level?: string;
  /** What the child is trying to do on this level, in kid-friendly words. */
  goal?: string;
  /** Scripted hints for this level, gentlest first. Zuva uses them before asking the AI. */
  hints?: string[];
  ok?: boolean;
  /** Short description of what happened, e.g. "missed: too short by 8 m". */
  detail?: string;
  stars?: number;
  at: number;
}

export interface CoachSnapshot {
  game?: string;
  level?: string;
  goal?: string;
  hints: string[];
  attempts: number;
  fails: number;
  failStreak: number;
  lastDetail?: string;
  levelStartedAt?: number;
  lastEventAt?: number;
  completed: boolean;
}

type Listener = (e: CoachEvent, snap: CoachSnapshot) => void;
const listeners = new Set<Listener>();
let snap: CoachSnapshot = { hints: [], attempts: 0, fails: 0, failStreak: 0, completed: false };

export function emitCoach(e: Omit<CoachEvent, 'at'>) {
  const event: CoachEvent = { ...e, at: Date.now() };
  if (event.type === 'level') {
    snap = { game: event.game, level: event.level, goal: event.goal, hints: event.hints ?? [], attempts: 0, fails: 0, failStreak: 0, levelStartedAt: event.at, lastEventAt: event.at, completed: false };
  } else {
    if (snap.game !== event.game) snap = { game: event.game, hints: [], attempts: 0, fails: 0, failStreak: 0, levelStartedAt: event.at, completed: false };
    snap = { ...snap, lastEventAt: event.at };
    if (event.type === 'attempt') {
      snap.attempts += 1;
      if (event.ok) snap.failStreak = 0;
      else { snap.fails += 1; snap.failStreak += 1; }
      if (event.detail) snap.lastDetail = event.detail;
    }
    if (event.type === 'complete') snap.completed = true;
  }
  for (const l of listeners) l(event, snap);
}

export function subscribeCoach(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export const coachSnapshot = (): CoachSnapshot => snap;

/** Clears the snapshot when the child leaves a game, so stale hints never follow them around. */
export function resetCoach() {
  snap = { hints: [], attempts: 0, fails: 0, failStreak: 0, completed: false };
}

/** Per-game helpers so each game reads naturally: coach.level(...), coach.attempt(...), coach.complete(...). */
export function useCoach(game: string) {
  return useMemo(
    () => ({
      level: (level: string | number, goal: string, hints: string[] = []) => emitCoach({ game, type: 'level', level: String(level), goal, hints }),
      attempt: (ok: boolean, detail?: string) => emitCoach({ game, type: 'attempt', ok, detail }),
      complete: (stars: number) => emitCoach({ game, type: 'complete', stars }),
      hint: (detail: string) => emitCoach({ game, type: 'hint', detail }),
    }),
    [game],
  );
}
