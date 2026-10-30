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

/** Games that report their own levels and completions. The original games get generic ones (see KidsGame). */
export const SELF_REPORTING = new Set(['sorting', 'pcbuilder', 'terminal', 'functions', 'launch', 'bridge', 'packets', 'linebot', 'gamemaker', 'teachai']);

/** Goal and hints for the original games, which don't describe each level to the coach. */
export const GENERIC_COACHING: Record<string, { goal: string; hints: string[] }> = {
  maze: { goal: 'Snap code blocks together so Zuva walks to the mango without hitting rocks.', hints: ['Trace the path with your finger first. Count the squares.', 'Turn left and turn right spin Zuva on the spot; they don’t move forward.', 'If the same blocks repeat, a loop (repeat) block can do them for you.'] },
  bugs: { goal: 'Find the one line of code with a bug, then choose the fix.', hints: ['Read each line slowly and ask: what would the computer do here?', 'Look carefully at spelling, quotes and brackets.', 'Compare what the program should print with what it does print.'] },
  turtle: { goal: 'Type turtle commands to draw the shape shown.', hints: ['A square has 4 equal sides and 4 turns of 90 degrees.', 'The turns in any closed shape add up to 360 degrees.', 'Try repeat: draw one side and turn, then repeat it.'] },
  pixels: { goal: 'Copy the picture by colouring the right squares on the grid.', hints: ['Work one row at a time from the top.', 'Count the squares before you colour them.', 'Whole rows of one colour can be filled quickly, like a loop!'] },
  binary: { goal: 'Switch bulbs on so their values add up to the target number.', hints: ['Start with the biggest bulb that fits in the number.', 'Take that value away, then find the next bulb that fits.', 'Each bulb is double the one on its right: 1, 2, 4, 8, 16…'] },
  circuit: { goal: 'Build circuits: light the bulb, test materials and use solar power.', hints: ['Electricity needs a full loop to flow, with no gaps.', 'Metals let electricity through; plastic and wood don’t.', 'Solar panels need strong light: move the sun higher.'] },
  math: { goal: 'Answer as many sums as you can in 60 seconds.', hints: ['Do the easy ones fast and don’t worry about mistakes.', 'For adding 9, add 10 then take 1 away.', 'Times tables: 5 × anything ends in 0 or 5.'] },
  safari: { goal: 'Answer science, maths, tech and world questions.', hints: ['Read all the answers before choosing.', 'Cross out answers you know are wrong first.', 'Think about what you have seen in real life.'] },
};
