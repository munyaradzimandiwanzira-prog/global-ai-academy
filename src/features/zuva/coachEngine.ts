/**
 * The patient-teacher policy: decides WHEN Zuva should speak up in a game, and how much to say.
 *
 * Principles (from how good teachers handle "productive struggle"):
 *  - Stay quiet while the child is making progress, even slowly. Mistakes are part of learning.
 *  - Offer, never force: Zuva asks "Want a clue?" and the child decides.
 *  - Smallest useful help first: hints escalate one level at a time, and only after another try.
 *  - Back off when told: "I'll keep trying" doubles the waiting time before the next offer.
 *  - Notice guessing (fast repeated misses) and suggest slowing down, rather than giving answers.
 *  - Notice wandering (hopping between games) and offer to pick one, kindly.
 *  - Praise effort and strategy, specifically, when a level is finished.
 */
import type { CoachSnapshot } from '@/features/kids/coach';

export interface CoachPrefs { quiet: boolean }
export interface CoachState {
  lastOfferAt: number;
  cooldownMs: number;
  hintsShown: number;
  declined: number;
  /** Attempt count when the last hint was shown, so the next hint waits for a new try. */
  attemptsAtLastHint: number;
  recentFails: number[];
  visits: { game: string; at: number }[];
  lastWanderAt: number;
}

export type CoachMove =
  | { kind: 'none' }
  | { kind: 'offer-hint'; text: string }
  | { kind: 'check-in'; text: string }
  | { kind: 'slow-down'; text: string }
  | { kind: 'praise'; text: string }
  | { kind: 'encourage'; text: string }
  | { kind: 'wander'; text: string };

export const BASE_COOLDOWN = 45_000;
export const initialCoachState = (): CoachState => ({ lastOfferAt: 0, cooldownMs: BASE_COOLDOWN, hintsShown: 0, declined: 0, attemptsAtLastHint: -1, recentFails: [], visits: [], lastWanderAt: 0 });

const pick = <T,>(xs: T[], seed: number) => xs[Math.abs(seed) % xs.length]!;

/** React to a game event. Returns the move and the next state. */
export function onEvent(
  ev: { type: 'attempt' | 'complete' | 'level'; ok?: boolean; stars?: number },
  snap: CoachSnapshot,
  st: CoachState,
  prefs: CoachPrefs,
  now: number,
): { move: CoachMove; state: CoachState } {
  let s = { ...st };
  if (ev.type === 'level') return { move: { kind: 'none' }, state: { ...s, hintsShown: 0, attemptsAtLastHint: -1, recentFails: [], cooldownMs: BASE_COOLDOWN, declined: 0 } };
  if (ev.type === 'complete') {
    const stars = ev.stars ?? 0;
    const text =
      snap.fails >= 3 ? pick(['You kept going even when it was tricky. That’s how real engineers work!', 'Lots of tries, and you never gave up. Brilliant!'], now)
        : stars === 3 ? pick(['Three stars! You worked that out fast.', 'Wow, perfect! You made it look easy.'], now)
          : pick(['You did it! Want to try for more stars?', 'Level done! Each try taught you something.'], now);
    return { move: { kind: 'praise', text }, state: { ...s, hintsShown: 0, recentFails: [] } };
  }
  if (ev.ok) {
    const recovered = snap.fails >= 2 && s.hintsShown > 0;
    return { move: recovered ? { kind: 'encourage', text: 'You figured it out! See how one small change made the difference?' } : { kind: 'none' }, state: { ...s, recentFails: [] } };
  }
  // A miss.
  s.recentFails = [...s.recentFails.filter((t) => now - t < 20_000), now];
  if (prefs.quiet) return { move: { kind: 'none' }, state: s };
  const canOffer = now - s.lastOfferAt >= s.cooldownMs;
  if (s.recentFails.length >= 4 && canOffer) {
    s = { ...s, lastOfferAt: now, recentFails: [] };
    return { move: { kind: 'slow-down', text: 'Whoa, lots of fast tries! Let’s slow down. Look closely at what happened last time, then change just one thing.' }, state: s };
  }
  const freshTry = snap.attempts > s.attemptsAtLastHint;
  if (snap.failStreak >= 3 && canOffer && freshTry && s.hintsShown < Math.max(1, snap.hints.length)) {
    s = { ...s, lastOfferAt: now };
    return { move: { kind: 'offer-hint', text: s.hintsShown === 0 ? 'That one’s tricky! Would you like a little clue?' : 'Want another clue?' }, state: s };
  }
  return { move: { kind: 'none' }, state: s };
}

/** Called every few seconds: notices long silences (the child may be stuck or distracted). */
export function onTick(snap: CoachSnapshot, st: CoachState, prefs: CoachPrefs, now: number): { move: CoachMove; state: CoachState } {
  if (prefs.quiet || !snap.game || snap.completed || !snap.lastEventAt) return { move: { kind: 'none' }, state: st };
  const idle = now - snap.lastEventAt;
  const threshold = snap.attempts > 0 ? 75_000 : 120_000;
  if (idle >= threshold && now - st.lastOfferAt >= Math.max(st.cooldownMs, threshold)) {
    return { move: { kind: 'check-in', text: snap.attempts > 0 ? 'Still thinking? That’s OK, thinking is part of it. Tap me if you’d like a clue.' : 'Not sure where to start? Tap me and I’ll explain this level.' }, state: { ...st, lastOfferAt: now } };
  }
  return { move: { kind: 'none' }, state: st };
}

/** Route changes inside the Kids Zone. Hopping between many games quickly can mean "nothing feels right". */
export function onVisit(game: string, st: CoachState, prefs: CoachPrefs, now: number): { move: CoachMove; state: CoachState } {
  const visits = [...st.visits.filter((v) => now - v.at < 120_000), { game, at: now }];
  const distinct = new Set(visits.map((v) => v.game)).size;
  const s = { ...st, visits };
  if (!prefs.quiet && distinct >= 4 && now - st.lastWanderAt > 300_000) {
    return { move: { kind: 'wander', text: 'Looking for the right game? Tell me what you like, robots, space, building or puzzles, and I’ll pick one for you!' }, state: { ...s, lastWanderAt: now } };
  }
  return { move: { kind: 'none' }, state: s };
}

/** The child accepted or declined an offer. */
export function answerOffer(accepted: boolean, snap: CoachSnapshot, st: CoachState): { hint?: string; state: CoachState } {
  if (!accepted) return { state: { ...st, declined: st.declined + 1, cooldownMs: Math.min(st.cooldownMs * 2, 8 * 60_000) } };
  const hint = snap.hints[Math.min(st.hintsShown, snap.hints.length - 1)];
  return { hint, state: { ...st, hintsShown: st.hintsShown + 1, attemptsAtLastHint: snap.attempts, cooldownMs: BASE_COOLDOWN } };
}
