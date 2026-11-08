import { describe, expect, it } from 'vitest';
import { MATHS_UNITS, MATHS_STAGES, buildMathsUnit, mathsActivitySchema, answerMatches, parseNumber, unitsForStage, mathsUnitOpen, GENERATORS, rng } from '../shared/maths';

/** Evaluate a sprint question we generate ("a + b", "a × b", "a ÷ b", "n/d of w", "p% of w"). */
function evalQ(q: string): number | null {
  let m = /^(-?[\d.]+) ([+−×÷]) ([\d.]+)$/.exec(q);
  if (m) { const a = Number(m[1]), b = Number(m[3]); return m[2] === '+' ? a + b : m[2] === '−' ? a - b : m[2] === '×' ? a * b : a / b; }
  m = /^(\d+)\/(\d+) of (\d+)$/.exec(q); if (m) return (Number(m[1]) / Number(m[2])) * Number(m[3]);
  m = /^(\d+)% of (\d+)$/.exec(q); if (m) return (Number(m[1]) / 100) * Number(m[2]);
  m = /^(\d+) \+ \? = (\d+)$/.exec(q); if (m) return Number(m[2]) - Number(m[1]);
  m = /^(\d+)\/(\d+) \+ (\d+)\/(\d+)$/.exec(q); if (m) return Number(m[1]) / Number(m[2]) + Number(m[3]) / Number(m[4]);
  return null;
}

describe('Cambridge Maths units', () => {
  it('covers every stage with all three strands and free starter units', () => {
    for (const { stage } of MATHS_STAGES) {
      const units = unitsForStage(stage);
      expect(units.length).toBeGreaterThanOrEqual(5);
      expect(new Set(units.map((u) => u.strand)).size).toBe(3);
      expect(units.filter((u) => mathsUnitOpen(u, false)).length).toBe(2);
    }
    expect(new Set(MATHS_UNITS.map((u) => u.id)).size).toBe(MATHS_UNITS.length);
  });

  it('builds valid games for every unit and practice round, with correct answers', () => {
    for (const u of MATHS_UNITS) for (const round of [0, 1, 7]) {
      const games = buildMathsUnit(u, round);
      expect(games.length).toBe(u.games.length);
      for (const a of games) {
        const parsed = mathsActivitySchema.safeParse(a);
        expect(parsed.success, `${a.id}: ${JSON.stringify(parsed.error?.issues?.[0])}`).toBe(true);
        if (a.kind === 'sprint') for (const it of a.items) { const v = evalQ(it.q); if (v != null) expect(answerMatches(it.answer, String(v)), `${it.q} = ${it.answer}`).toBe(true); }
        if (a.kind === 'choice') for (const it of a.items) { expect(it.options).toContain(it.answer); expect(new Set(it.options).size).toBe(it.options.length); }
        if (a.kind === 'numberline') for (const it of a.items) { expect(it.target).toBeGreaterThan(it.min); expect(it.target).toBeLessThan(it.max); }
        if (a.kind === 'choice') for (const it of a.items) if (it.visual?.type === 'bars') { const mx = Math.max(...it.visual.data.map((d) => d.value)); if (mx > 12) expect(it.visual.data.every((d) => d.value % 2 === 0)).toBe(true); }
        if (a.kind === 'fraction') for (const it of a.items) expect(it.num).toBeLessThan(it.den);
      }
    }
  });

  it('is deterministic for the course round and different for practice', () => {
    const u = MATHS_UNITS[1]!;
    expect(buildMathsUnit(u, 0)).toEqual(buildMathsUnit(u, 0));
    expect(JSON.stringify(buildMathsUnit(u, 1))).not.toEqual(JSON.stringify(buildMathsUnit(u, 0)));
  });

  it('checks answers like a teacher would', () => {
    expect(answerMatches('0.75', '0,75')).toBe(true);
    expect(answerMatches('3/4', '0.75')).toBe(true);
    expect(answerMatches('1/2', '2/4')).toBe(true);
    expect(answerMatches('12', ' 12 ')).toBe(true);
    expect(answerMatches('12', '13')).toBe(false);
    expect(answerMatches('certain', 'Certain')).toBe(true);
    expect(parseNumber('$4.50')).toBe(4.5);
    expect(parseNumber('−3')).toBe(-3);
  });

  it('money change and triangle angles are right', () => {
    const r = rng('t');
    const m = GENERATORS.money!(r, 20, { cents: 1 });
    if (m.kind === 'word') for (const it of m.items) { const price = Number(/\$(\d+\.\d\d)/.exec(it.q)![1]); expect(Number(it.answer)).toBeCloseTo(10 - price, 5); }
    const t = GENERATORS.triangle!(r, 20, {});
    if (t.kind === 'sprint') for (const it of t.items) { const [a, b] = [...it.q.matchAll(/(\d+)°/g)].map((x) => Number(x[1])); expect(a! + b! + Number(it.answer)).toBe(180); expect(Number(it.answer)).toBeGreaterThan(0); }
  });
});
