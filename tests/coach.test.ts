import { describe, expect, it } from 'vitest';
import { answerOffer, initialCoachState, onEvent, onTick, onVisit, BASE_COOLDOWN } from '../src/features/zuva/coachEngine';
import type { CoachSnapshot } from '../src/features/kids/coach';

const snap = (o: Partial<CoachSnapshot> = {}): CoachSnapshot => ({ game: 'bridge', level: '1', goal: 'cross', hints: ['h1', 'h2', 'h3'], attempts: 0, fails: 0, failStreak: 0, completed: false, lastEventAt: 0, levelStartedAt: 0, ...o });
const prefs = { quiet: false };

describe('patient-teacher coach', () => {
  it('stays quiet for the first two misses, offers a clue on the third', () => {
    let st = initialCoachState();
    const t0 = 1_000_000;
    for (let i = 1; i <= 2; i++) {
      const r = onEvent({ type: 'attempt', ok: false }, snap({ attempts: i, fails: i, failStreak: i }), st, prefs, t0 + i * 10_000);
      expect(r.move.kind).toBe('none');
      st = r.state;
    }
    const r3 = onEvent({ type: 'attempt', ok: false }, snap({ attempts: 3, fails: 3, failStreak: 3 }), st, prefs, t0 + 30_000);
    expect(r3.move.kind).toBe('offer-hint');
  });
  it('gives hints one at a time, only after a fresh try, and backs off when declined', () => {
    let st = initialCoachState();
    const s3 = snap({ attempts: 3, fails: 3, failStreak: 3 });
    const a = answerOffer(true, s3, st);
    expect(a.hint).toBe('h1');
    st = a.state;
    // Same attempt count: no new offer even after cooldown.
    expect(onEvent({ type: 'attempt', ok: false }, s3, st, prefs, 10_000_000).move.kind).toBe('none');
    // A new try after the cooldown: next clue offered, and it is h2.
    const s4 = snap({ attempts: 4, fails: 4, failStreak: 4 });
    const r = onEvent({ type: 'attempt', ok: false }, s4, { ...st, lastOfferAt: 0 }, prefs, 10_000_000);
    expect(r.move.kind).toBe('offer-hint');
    expect(answerOffer(true, s4, r.state).hint).toBe('h2');
    const d = answerOffer(false, s4, r.state);
    expect(d.state.cooldownMs).toBe(BASE_COOLDOWN * 2);
  });
  it('quiet mode means no proactive help', () => {
    const r = onEvent({ type: 'attempt', ok: false }, snap({ attempts: 9, fails: 9, failStreak: 9 }), initialCoachState(), { quiet: true }, 5_000_000);
    expect(r.move.kind).toBe('none');
    expect(onTick(snap({ attempts: 1, lastEventAt: 0 }), initialCoachState(), { quiet: true }, 9_999_999).move.kind).toBe('none');
  });
  it('notices fast guessing', () => {
    let st = initialCoachState();
    let move = 'none';
    for (let i = 1; i <= 4; i++) {
      const r = onEvent({ type: 'attempt', ok: false }, snap({ attempts: i, fails: i, failStreak: Math.min(i, 2) }), st, prefs, 2_000_000 + i * 2000);
      st = r.state; move = r.move.kind;
    }
    expect(move).toBe('slow-down');
  });
  it('checks in after a long silence, not before', () => {
    const s = snap({ attempts: 2, lastEventAt: 1_000_000 });
    expect(onTick(s, initialCoachState(), prefs, 1_000_000 + 30_000).move.kind).toBe('none');
    expect(onTick(s, initialCoachState(), prefs, 1_000_000 + 80_000).move.kind).toBe('check-in');
  });
  it('praises effort specifically, and spots game-hopping', () => {
    expect((onEvent({ type: 'complete', stars: 1 }, snap({ fails: 5 }), initialCoachState(), prefs, 1).move as { text: string }).text).toMatch(/never gave up|kept going/);
    let st = initialCoachState();
    let kind = 'none';
    ['maze', 'bugs', 'turtle', 'launch'].forEach((g, i) => { const r = onVisit(g, st, prefs, 1_000_000 + i * 15_000); st = r.state; kind = r.move.kind; });
    expect(kind).toBe('wander');
  });
});
