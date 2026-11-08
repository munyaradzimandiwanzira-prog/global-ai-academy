/**
 * Cambridge Maths with Zuva: Stages 1–6 (about ages 5–11), mapped to the three strands of
 * Cambridge Primary Mathematics (Number; Geometry and Measure; Statistics and Probability) with
 * Thinking and Working Mathematically woven through. Our own units and wording; not endorsed by
 * Cambridge.
 *
 * Questions are made by generators from a seed, never by a language model, so every answer is
 * correct by construction and the same unit always gives the same first set (new seeds for practice).
 *
 * Game kinds:
 *   sprint      quick mental questions, typed on a keypad          fluency
 *   choice      pick the answer, often with a picture (clock, chart, shape, fraction, array)
 *   numberline  tap where a number belongs on a number line         place value, estimation
 *   blocks      build a number from thousands, hundreds, tens, ones place value
 *   fraction    shade part of a bar to show a fraction             fractions
 *   word        a short word problem, with a bar-model hint         problem solving
 *   convince    explain your reasoning; Zuva gives feedback        thinking and working mathematically
 */
import { z } from 'zod';

export type MathsStage = 1 | 2 | 3 | 4 | 5 | 6;
export type Strand = 'number' | 'geometry' | 'statistics';
export const STRAND_NAMES: Record<Strand, { en: string; pt: string }> = {
  number: { en: 'Number', pt: 'Números' },
  geometry: { en: 'Geometry and measure', pt: 'Geometria e medida' },
  statistics: { en: 'Statistics and probability', pt: 'Estatística e probabilidade' },
};
export const MATHS_STAGES: { stage: MathsStage; ages: string; pt: string }[] = [
  { stage: 1, ages: '5–6', pt: '1.ª etapa' }, { stage: 2, ages: '6–7', pt: '2.ª etapa' }, { stage: 3, ages: '7–8', pt: '3.ª etapa' },
  { stage: 4, ages: '8–9', pt: '4.ª etapa' }, { stage: 5, ages: '9–10', pt: '5.ª etapa' }, { stage: 6, ages: '10–11', pt: '6.ª etapa' },
];
export const stageForAge = (age: number): MathsStage => (Math.min(6, Math.max(1, age - 4)) as MathsStage);

export const MATHS_KINDS = ['sprint', 'choice', 'numberline', 'blocks', 'fraction', 'word', 'convince'] as const;
export type MathsKind = (typeof MATHS_KINDS)[number];
export const MATHS_KIND_INFO: Record<MathsKind, { title: string; pt: string; skill: string }> = {
  sprint: { title: 'Quick Maths', pt: 'Cálculo rápido', skill: 'fluency' },
  choice: { title: 'Pick It', pt: 'Escolhe', skill: 'understanding' },
  numberline: { title: 'Number Line', pt: 'Recta numérica', skill: 'place value' },
  blocks: { title: 'Build the Number', pt: 'Constrói o número', skill: 'place value' },
  fraction: { title: 'Fraction Bars', pt: 'Barras de fracções', skill: 'fractions' },
  word: { title: 'Story Problems', pt: 'Problemas', skill: 'problem solving' },
  convince: { title: 'Convince Me', pt: 'Convence-me', skill: 'reasoning' },
};

// ── Activity schema ─────────────────────────────────────────────────────────

const q = z.string().min(1).max(220);
const ans = z.string().min(1).max(40);
export const visualSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('clock'), h: z.number().int().min(1).max(12), m: z.number().int().min(0).max(59) }),
  z.object({ type: z.literal('shape'), name: z.enum(['circle', 'triangle', 'square', 'rectangle', 'pentagon', 'hexagon', 'octagon', 'cube', 'cuboid', 'sphere', 'cylinder', 'cone', 'pyramid']) }),
  z.object({ type: z.literal('bars'), title: z.string().max(80), data: z.array(z.object({ label: z.string().max(20), value: z.number().int().min(0).max(100) })).min(2).max(6) }),
  z.object({ type: z.literal('fraction'), num: z.number().int().min(0).max(12), den: z.number().int().min(1).max(12) }),
  z.object({ type: z.literal('array'), rows: z.number().int().min(1).max(10), cols: z.number().int().min(1).max(10) }),
  z.object({ type: z.literal('dots'), n: z.number().int().min(0).max(20) }),
]);
export type Visual = z.infer<typeof visualSchema>;

export const mathsActivitySchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('sprint'), items: z.array(z.object({ q, answer: ans })).min(1).max(20) }),
  z.object({ kind: z.literal('choice'), items: z.array(z.object({ q, options: z.array(ans).min(2).max(4), answer: ans, visual: visualSchema.optional() })).min(1).max(12) }),
  z.object({ kind: z.literal('numberline'), items: z.array(z.object({ min: z.number(), max: z.number(), step: z.number().positive(), target: z.number() })).min(1).max(10) }),
  z.object({ kind: z.literal('blocks'), items: z.array(z.object({ target: z.number().int().min(1).max(9999) })).min(1).max(8) }),
  z.object({ kind: z.literal('fraction'), items: z.array(z.object({ num: z.number().int().min(1).max(12), den: z.number().int().min(2).max(12) })).min(1).max(8) }),
  z.object({ kind: z.literal('word'), items: z.array(z.object({ q: z.string().min(1).max(400), answer: ans, unit: z.string().max(12).optional(), model: z.array(z.number()).max(6).optional() })).min(1).max(8) }),
  z.object({ kind: z.literal('convince'), prompt: z.string().min(1).max(400), hint: z.string().max(200).optional() }),
]);
export type MathsBody = z.infer<typeof mathsActivitySchema>;
export type MathsActivity = MathsBody & { id: string; title: string; intro: string; skill: string };

// ── Seeded randomness ───────────────────────────────────────────────────────

function hash(s: string): number { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
export function rng(seed: string) {
  let a = hash(seed);
  const next = () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const int = (lo: number, hi: number) => lo + Math.floor(next() * (hi - lo + 1));
  const pick = <T,>(xs: readonly T[]) => xs[Math.floor(next() * xs.length)]!;
  const shuffle = <T,>(xs: readonly T[]) => { const c = [...xs]; for (let i = c.length - 1; i > 0; i--) { const j = Math.floor(next() * (i + 1)); [c[i], c[j]] = [c[j]!, c[i]!]; } return c; };
  return { next, int, pick, shuffle };
}
type R = ReturnType<typeof rng>;

const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : Math.abs(a));
const frac = (n: number, d: number) => { const g = gcd(n, d) || 1; return d / g === 1 ? String(n / g) : `${n / g}/${d / g}`; };
const fmt = (x: number) => String(Math.round(x * 1000) / 1000);
const NAMES = ['Tendai', 'Rudo', 'Chipo', 'Tino', 'Amina', 'Joaquim', 'Nyasha', 'Lúcia', 'Farai', 'Sipho'];
const THINGS = ['mangoes', 'oranges', 'pencils', 'marbles', 'stickers', 'books', 'eggs', 'bananas'];

/** Distinct wrong options near the answer. */
function near(r: R, answer: number, n: number, spread = 3, min = 0): string[] {
  const out = new Set<number>();
  let guard = 0;
  while (out.size < n && guard++ < 60) { const d = r.int(-spread, spread); const v = answer + (d === 0 ? spread + 1 : d); if (v >= min && v !== answer) out.add(v); }
  return [...out].map(String);
}
const options = (r: R, answer: string, wrong: string[]) => r.shuffle([answer, ...[...new Set(wrong)].filter((w) => w !== answer).slice(0, 3)]);

// ── Generators (each returns one activity body) ─────────────────────────────

type Gen = (r: R, n: number, p: Record<string, number>) => MathsBody;
const time12 = (h: number, m: number) => `${h}:${String(m).padStart(2, '0')}`;
const SHAPES2D = [['triangle', 3], ['square', 4], ['rectangle', 4], ['pentagon', 5], ['hexagon', 6], ['octagon', 8]] as const;
const SHAPES3D = [['cube', 6], ['cuboid', 6], ['sphere', 1], ['cylinder', 3], ['cone', 2], ['pyramid', 5]] as const;

export const GENERATORS: Record<string, Gen> = {
  count: (r, n, p) => ({ kind: 'choice', items: Array.from({ length: n }, () => { const k = r.int(1, p.max ?? 10); return { q: 'How many dots?', visual: { type: 'dots' as const, n: k }, answer: String(k), options: options(r, String(k), near(r, k, 3, 2, 1)) }; }) }),
  addsub: (r, n, p) => ({ kind: 'sprint', items: Array.from({ length: n }, () => {
    const max = p.max ?? 20; const sub = p.sub ? r.next() < 0.5 : false;
    if (sub) { const a = r.int(Math.ceil(max / 4), max), b = r.int(1, a); return { q: `${a} − ${b}`, answer: String(a - b) }; }
    const a = r.int(1, max - 1), b = r.int(1, max - a); return { q: `${a} + ${b}`, answer: String(a + b) };
  }) }),
  bonds: (r, n, p) => ({ kind: 'sprint', items: Array.from({ length: n }, () => { const to = p.to ?? 10; const a = r.int(0, to); return { q: `${a} + ? = ${to}`, answer: String(to - a) }; }) }),
  times: (r, n, p) => ({ kind: 'sprint', items: Array.from({ length: n }, () => { const tables = [p.t1 ?? 2, p.t2 ?? 5, p.t3 ?? 10].filter(Boolean); const a = r.pick(tables), b = r.int(1, p.upTo ?? 10); return r.next() < 0.5 ? { q: `${a} × ${b}`, answer: String(a * b) } : { q: `${b} × ${a}`, answer: String(a * b) }; }) }),
  divide: (r, n, p) => ({ kind: 'sprint', items: Array.from({ length: n }, () => { const tables = [p.t1 ?? 2, p.t2 ?? 5, p.t3 ?? 10]; const a = r.pick(tables), b = r.int(1, p.upTo ?? 10); return { q: `${a * b} ÷ ${a}`, answer: String(b) }; }) }),
  remainders: (r, n) => ({ kind: 'sprint', items: Array.from({ length: n }, () => { const d = r.int(3, 9), qn = r.int(2, 9), rem = r.int(1, d - 1); return { q: `${d * qn + rem} ÷ ${d} = ? remainder ${rem}`, answer: String(qn) }; }) }),
  mulBig: (r, n, p) => ({ kind: 'sprint', items: Array.from({ length: n }, () => { const a = r.int(12, p.max ?? 99), b = r.int(3, 9); return { q: `${a} × ${b}`, answer: String(a * b) }; }) }),
  place: (r, n, p) => ({ kind: 'blocks', items: Array.from({ length: n }, () => ({ target: r.int(p.min ?? 11, p.max ?? 99) })) }),
  line: (r, n, p) => ({ kind: 'numberline', items: Array.from({ length: n }, () => { const step = p.step ?? 1; const min = p.min ?? 0, max = p.max ?? 10; const k = r.int(1, Math.round((max - min) / step) - 1); return { min, max, step, target: Math.round((min + k * step) * 1000) / 1000 }; }) }),
  round: (r, n, p) => ({ kind: 'sprint', items: Array.from({ length: n }, () => { const to = p.to ?? 10; const x = r.int(to + 1, (p.max ?? 999)); return { q: `Round ${x} to the nearest ${to}`, answer: String(Math.round(x / to) * to) }; }) }),
  compare: (r, n, p) => ({ kind: 'choice', items: Array.from({ length: n }, () => { const a = r.int(1, p.max ?? 100); let b = r.int(1, p.max ?? 100); if (r.next() < 0.15) b = a; const s = a > b ? '>' : a < b ? '<' : '='; return { q: `${a} ? ${b}`, answer: s, options: ['<', '=', '>'] }; }) }),
  sequence: (r, n, p) => ({ kind: 'sprint', items: Array.from({ length: n }, () => { const step = r.int(p.minStep ?? 2, p.maxStep ?? 10) * (p.down && r.next() < 0.4 ? -1 : 1); const start = r.int(step < 0 ? 40 : 0, step < 0 ? 90 : 30); const xs = Array.from({ length: 5 }, (_, i) => start + i * step); return { q: `${xs.slice(0, 4).join(', ')}, ?`, answer: String(xs[4]) }; }) }),
  negative: (r, n) => ({ kind: 'sprint', items: Array.from({ length: n }, () => { const a = r.int(-10, 5), b = r.int(1, 12); return { q: `The temperature is ${a} °C. It rises by ${b} °C. What is it now?`, answer: String(a + b) }; }) }),
  fracShade: (r, n, p) => ({ kind: 'fraction', items: Array.from({ length: n }, () => { const den = r.pick([2, 3, 4, ...(p.big ? [5, 6, 8, 10] : [])]); return { num: r.int(1, den - 1), den }; }) }),
  fracOf: (r, n, p) => ({ kind: 'sprint', items: Array.from({ length: n }, () => { const den = r.pick([2, 3, 4, 5, 10].slice(0, p.dens ?? 3)); const num = p.unit ? 1 : r.int(1, den - 1); const whole = den * r.int(2, p.mult ?? 6); return { q: `${num}/${den} of ${whole}`, answer: String((whole / den) * num) }; }) }),
  fracCompare: (r, n) => ({ kind: 'choice', items: Array.from({ length: n }, () => {
    const val = (x: [number, number]) => x[0] / x[1];
    const mk = (): [number, number] => { const d = r.pick([2, 3, 4, 5, 6, 8]); return [r.int(1, d - 1), d]; };
    const a = mk(); let b = mk(); let guard = 0;
    while (val(a) === val(b) && guard++ < 20) b = mk();
    if (val(a) === val(b)) b = [1, a[1] === 2 ? 4 : 2];
    const sa = `${a[0]}/${a[1]}`, sb = `${b[0]}/${b[1]}`;
    return { q: 'Which is larger?', answer: val(a) > val(b) ? sa : sb, options: r.shuffle([sa, sb]) };
  }) }),
  fracAdd: (r, n, p) => ({ kind: 'sprint', items: Array.from({ length: n }, () => {
    if (!p.mixed) { const d = r.pick([4, 5, 6, 8, 10]); const a = r.int(1, d - 2), b = r.int(1, d - 1 - a); return { q: `${a}/${d} + ${b}/${d}`, answer: frac(a + b, d) }; }
    const d1 = r.pick([2, 3, 4]), d2 = r.pick([4, 6, 8, 12].filter((x) => x % d1 === 0)); const a = r.int(1, d1 - 1), b = r.int(1, d2 - 1); return { q: `${a}/${d1} + ${b}/${d2}`, answer: frac(a * (d2 / d1) + b, d2) };
  }) }),
  decimals: (r, n, p) => ({ kind: 'sprint', items: Array.from({ length: n }, () => { const dp = p.dp ?? 1; const s = 10 ** dp; const a = r.int(1, 9 * s) / s, b = r.int(1, 9 * s) / s; return r.next() < 0.5 || a < b ? { q: `${fmt(a)} + ${fmt(b)}`, answer: fmt(a + b) } : { q: `${fmt(a)} − ${fmt(b)}`, answer: fmt(a - b) }; }) }),
  percent: (r, n) => ({ kind: 'sprint', items: Array.from({ length: n }, () => { const pc = r.pick([10, 20, 25, 50, 75]); const whole = r.pick([20, 40, 60, 80, 100, 200, 120]); return { q: `${pc}% of ${whole}`, answer: fmt((pc / 100) * whole) }; }) }),
  time: (r, n, p) => ({ kind: 'choice', items: Array.from({ length: n }, () => { const step = p.step ?? 30; const h = r.int(1, 12), m = r.int(0, 60 / step - 1) * step; const a = time12(h, m); const wrong = [time12(h === 12 ? 1 : h + 1, m), time12(h, (m + (step === 60 ? 30 : step)) % 60), time12((m / 5) || 12, h * 5 % 60)].filter((x) => x !== a); return { q: 'What time does the clock show?', visual: { type: 'clock' as const, h, m }, answer: a, options: options(r, a, [...new Set(wrong)]) }; }) }),
  shapes2d: (r, n) => ({ kind: 'choice', items: Array.from({ length: n }, () => { const [name, sides] = r.pick(SHAPES2D); return r.next() < 0.5 ? { q: 'What is this shape called?', visual: { type: 'shape' as const, name }, answer: name, options: options(r, name, r.shuffle(SHAPES2D.map(([x]) => x).filter((x) => x !== name && !(name === 'square' && x === 'rectangle') && !(name === 'rectangle' && x === 'square')))) } : { q: 'How many sides does this shape have?', visual: { type: 'shape' as const, name }, answer: String(sides), options: options(r, String(sides), near(r, sides, 3, 2, 3)) }; }) }),
  shapes3d: (r, n) => ({ kind: 'choice', items: Array.from({ length: n }, () => { const [name] = r.pick(SHAPES3D); return { q: 'What is this solid called?', visual: { type: 'shape' as const, name }, answer: name, options: options(r, name, r.shuffle(SHAPES3D.map(([x]) => x).filter((x) => x !== name))) }; }) }),
  perimeter: (r, n, p) => ({ kind: 'sprint', items: Array.from({ length: n }, () => { const a = r.int(2, p.max ?? 12), b = r.int(2, p.max ?? 12); return p.area ? { q: `A rectangle is ${a} cm by ${b} cm. Area in cm²?`, answer: String(a * b) } : { q: `A rectangle is ${a} cm by ${b} cm. Perimeter in cm?`, answer: String(2 * (a + b)) }; }) }),
  triangle: (r, n) => ({ kind: 'sprint', items: Array.from({ length: n }, () => { const a = r.int(20, 100), b = r.int(20, 160 - a); return { q: `Two angles of a triangle are ${a}° and ${b}°. What is the third angle?`, answer: String(180 - a - b) }; }) }),
  angles: (r, n) => ({ kind: 'choice', items: Array.from({ length: n }, () => { const d = r.pick([30, 45, 60, 90, 120, 135, 150, 180]); const t = d < 90 ? 'acute' : d === 90 ? 'right angle' : d < 180 ? 'obtuse' : 'straight line'; return { q: `An angle of ${d}° is…`, answer: t, options: ['acute', 'right angle', 'obtuse', 'straight line'] }; }) }),
  bars: (r, n, p) => ({ kind: 'choice', items: Array.from({ length: n }, () => {
    const labels = r.shuffle(['mango', 'banana', 'orange', 'apple', 'guava']).slice(0, 4); // Values must be readable from the gridlines: every value up to 12, even values above that.
    const big = (p.max ?? 10) > 12; const data = labels.map((label) => ({ label, value: big ? r.int(1, Math.floor((p.max ?? 10) / 2)) * 2 : r.int(1, p.max ?? 10) }));
    const top = [...data].sort((a, b) => b.value - a.value); if (top[0]!.value === top[1]!.value) top[1]!.value -= big ? 2 : 1; // break ties downwards so values stay readable
    if (r.next() < 0.5) return { q: 'Which fruit is the most popular?', visual: { type: 'bars' as const, title: 'Favourite fruit', data }, answer: top[0]!.label, options: labels };
    const pickd = r.pick(data); return { q: `How many children chose ${pickd.label}?`, visual: { type: 'bars' as const, title: 'Favourite fruit', data }, answer: String(pickd.value), options: options(r, String(pickd.value), near(r, pickd.value, 3, 2, 0)) };
  }) }),
  chance: (r, n) => {
    const SCALE = ['impossible', 'unlikely', 'even chance', 'likely', 'certain'];
    const CASES = [
      { q: 'The sun will rise tomorrow.', answer: 'certain' }, { q: 'You roll a 7 on an ordinary dice (1 to 6).', answer: 'impossible' },
      { q: 'A coin lands on heads.', answer: 'even chance' }, { q: 'You pick a red sweet from a bag of 9 red and 1 green.', answer: 'likely' },
      { q: 'You pick the one green sweet from a bag of 9 red and 1 green.', answer: 'unlikely' }, { q: 'A goat will teach your maths lesson.', answer: 'impossible' },
      { q: 'You roll an even number on a dice.', answer: 'even chance' }, { q: 'Tomorrow will come after today.', answer: 'certain' },
    ];
    return { kind: 'choice', items: r.shuffle(CASES).slice(0, n).map((c) => {
      const opts = [c.answer, ...r.shuffle(SCALE.filter((x) => x !== c.answer)).slice(0, 3)].sort((x, y) => SCALE.indexOf(x) - SCALE.indexOf(y));
      return { q: `How likely is it? ${c.q}`, answer: c.answer, options: opts };
    }) };
  },
  mean: (r, n) => ({ kind: 'sprint', items: Array.from({ length: n }, () => { const k = r.int(3, 5); const m = r.int(3, 12); const xs = Array.from({ length: k - 1 }, () => r.int(1, 2 * m)); const last = m * k - xs.reduce((a, b) => a + b, 0); if (last < 0) return { q: 'Mean of 2, 4, 6', answer: '4' }; return { q: `Mean of ${r.shuffle([...xs, last]).join(', ')}`, answer: String(m) }; }) }),
  arrays: (r, n) => ({ kind: 'choice', items: Array.from({ length: n }, () => { const a = r.int(2, 5), b = r.int(2, 6); return { q: 'How many altogether? (rows × columns)', visual: { type: 'array' as const, rows: a, cols: b }, answer: String(a * b), options: options(r, String(a * b), [String(a + b), String(a * b + a), String(a * b - b)]) }; }) }),
  storyAdd: (r, n, p) => ({ kind: 'word', items: Array.from({ length: n }, () => {
    const name = r.pick(NAMES), thing = r.pick(THINGS); const max = p.max ?? 20; const a = r.int(2, Math.floor(max / 2)), b = r.int(1, Math.floor(max / 2));
    return r.next() < 0.5 ? { q: `${name} has ${a} ${thing}. A friend gives ${name} ${b} more. How many ${thing} does ${name} have now?`, answer: String(a + b), model: [a, b] }
      : { q: `${name} had ${a + b} ${thing} and gave ${b} away. How many are left?`, answer: String(a), model: [a + b, -b] };
  }) }),
  storyMul: (r, n, p) => ({ kind: 'word', items: Array.from({ length: n }, () => {
    const name = r.pick(NAMES); const a = r.int(2, p.groups ?? 9), b = r.int(2, p.each ?? 9);
    return r.next() < 0.5 ? { q: `${name} packs ${b} eggs into each of ${a} trays. How many eggs is that?`, answer: String(a * b), model: Array(Math.min(a, 6)).fill(b) }
      : { q: `${a * b} children share into teams of ${b}. How many teams are there?`, answer: String(a), model: [a * b] };
  }) }),
  money: (r, n, p) => ({ kind: 'word', items: Array.from({ length: n }, () => {
    const name = r.pick(NAMES);
    if (!p.cents) { const price = r.int(2, 19); return { q: `${name} buys a notebook for $${price} and pays with $20. How much change?`, answer: String(20 - price), unit: '$' }; }
    const cents = r.int(21, 190) * 5; const price = cents / 100;
    return { q: `${name} buys a notebook for $${price.toFixed(2)} and pays with $10. How much change?`, answer: ((1000 - cents) / 100).toFixed(2), unit: '$' };
  }) }),
};

// ── Convince Me prompts (Thinking and Working Mathematically) ───────────────

const CONVINCE: Record<string, { prompt: string; hint: string }> = {
  oddEven: { prompt: 'Tino says: "When you add two odd numbers, the answer is always even." Is he right? Convince me with examples and a reason.', hint: 'Try 3 + 5, 7 + 9… What happens to the "odd one out" in each number?' },
  tens: { prompt: 'Rudo says 70 is the same as 7 tens. Is she right? Explain using tens and ones.', hint: 'How many tens make 70? Draw the tens.' },
  times5: { prompt: 'Why does every number in the 5 times table end in 0 or 5? Convince me.', hint: 'Look at 5, 10, 15, 20… what pattern do you see?' },
  half: { prompt: 'Chipo cut a mango into two pieces and said she has halves. When is she right and when is she wrong?', hint: 'Are the two pieces the same size?' },
  rounding: { prompt: 'Amina rounded 349 to the nearest hundred and got 400. Is she right? Explain.', hint: 'Which hundred is 349 nearer to: 300 or 400?' },
  fractions: { prompt: 'Joaquim says 1/8 is bigger than 1/4 because 8 is bigger than 4. Is he right? Convince me.', hint: 'Imagine sharing one cake between 8 people or between 4.' },
  triangle: { prompt: 'Can a triangle have two right angles? Convince me.', hint: 'The three angles of a triangle add up to 180°.' },
  area: { prompt: 'Two rectangles both have a perimeter of 20 cm. Must they have the same area? Convince me with examples.', hint: 'Try 1 by 9 and 5 by 5.' },
  decimals: { prompt: 'Farai says 0.5 is smaller than 0.25 because 5 is smaller than 25. Is he right? Explain.', hint: 'Write both with two decimal places, or think of money.' },
  mean: { prompt: 'The mean of three numbers is 6. Find three different sets of numbers that work and explain how you know.', hint: 'Three numbers with a mean of 6 add up to…' },
  chance: { prompt: 'Lúcia says a coin is more likely to land on heads after three tails in a row. Is she right? Convince me.', hint: 'Does the coin remember what happened before?' },
  shapes: { prompt: 'Is a square a rectangle? Convince me.', hint: 'What makes a shape a rectangle?' },
};

// ── Units ───────────────────────────────────────────────────────────────────

export interface MathsUnit {
  id: string; stage: MathsStage; order: number; strand: Strand;
  title: string; pt: string; objectives: string[];
  /** Maths words in English and Portuguese (Mozambique), read aloud on the unit page. */
  words: [string, string][];
  games: { kind: MathsKind; gen: string; n: number; p?: Record<string, number>; intro: string }[];
}
type G = MathsUnit['games'][number];
/** A game in a unit; its kind is read from what the generator makes. */
const g = (gen: string, n: number, intro: string, p?: Record<string, number>): G => ({ kind: GENERATORS[gen]!(rng('kind'), 1, p ?? {}).kind, gen, n, p, intro });
const cv = (key: keyof typeof CONVINCE): G => ({ kind: 'convince', gen: `convince:${key}`, n: 1, intro: 'Convince Me! Explain your thinking to Zuva.' });

const U = (stage: MathsStage, order: number, strand: Strand, slug: string, title: string, pt: string, objectives: string[], words: [string, string][], games: G[]): MathsUnit =>
  ({ id: `s${stage}-${slug}`, stage, order, strand, title, pt, objectives, words, games });

export const MATHS_UNITS: MathsUnit[] = [
  // Stage 1
  U(1, 1, 'number', 'count', 'Counting to 20', 'Contar até 20', ['Count objects to 20, counting each one once', 'Say numbers in order forwards and backwards'], [['count', 'contar'], ['number', 'número'], ['more', 'mais'], ['fewer', 'menos']], [g('count', 6, 'How many dots? Count each one once.', { max: 10 }), g('line', 5, 'Tap where the number lives on the number line.', { min: 0, max: 10, step: 1 }), g('compare', 5, 'Which is bigger? Choose <, = or >.', { max: 20 })]),
  U(1, 2, 'number', 'add10', 'Adding and subtracting to 10', 'Somar e subtrair até 10', ['Add and subtract within 10', 'Know number pairs that make 10'], [['add', 'somar'], ['subtract', 'subtrair'], ['equals', 'igual a'], ['total', 'total']], [g('bonds', 8, 'Number bonds! What makes 10?', { to: 10 }), g('addsub', 8, 'Quick Maths: add and take away.', { max: 10, sub: 1 }), g('storyAdd', 3, 'Story problems. Read, think, answer.', { max: 10 }), cv('oddEven')]),
  U(1, 3, 'geometry', 'shapes', 'Flat shapes and solids', 'Figuras planas e sólidos', ['Name common 2D shapes and 3D solids', 'Count sides of 2D shapes'], [['circle', 'círculo'], ['triangle', 'triângulo'], ['square', 'quadrado'], ['side', 'lado'], ['corner', 'vértice / canto']], [g('shapes2d', 6, 'What shape is it?'), g('shapes3d', 4, 'Name the solid.'), cv('shapes')]),
  U(1, 4, 'geometry', 'time1', 'Time to the hour', 'As horas certas', ['Read time to the hour and half hour'], [['clock', 'relógio'], ['hour', 'hora'], ['half past', 'e meia'], ["o'clock", 'em ponto']], [g('time', 6, 'What time is it?', { step: 30 })]),
  U(1, 5, 'statistics', 'sort', 'Sorting and counting data', 'Organizar e contar dados', ['Answer questions from a simple pictogram or block graph'], [['most', 'o mais'], ['least', 'o menos'], ['graph', 'gráfico']], [g('bars', 5, 'Read the graph.', { max: 8 })]),
  // Stage 2
  U(2, 1, 'number', 'place2', 'Tens and ones', 'Dezenas e unidades', ['Understand tens and ones in 2-digit numbers', 'Place 2-digit numbers on a number line'], [['tens', 'dezenas'], ['ones', 'unidades'], ['digit', 'algarismo']], [g('place', 5, 'Build the number with tens and ones.', { min: 11, max: 99 }), g('line', 5, 'Find the number on the line.', { min: 0, max: 100, step: 10 }), cv('tens')]),
  U(2, 2, 'number', 'add20', 'Adding and subtracting to 20', 'Somar e subtrair até 20', ['Add and subtract within 20', 'Recall doubles and halves to 20'], [['double', 'dobro'], ['half', 'metade'], ['difference', 'diferença']], [g('addsub', 10, 'Quick Maths to 20.', { max: 20, sub: 1 }), g('bonds', 6, 'Bonds to 20.', { to: 20 }), g('storyAdd', 3, 'Story problems.', { max: 20 })]),
  U(2, 3, 'number', 'times2510', 'The 2, 5 and 10 times tables', 'A tabuada do 2, 5 e 10', ['Recall multiplication facts for 2, 5 and 10', 'Use arrays to show multiplication'], [['times', 'vezes'], ['groups of', 'grupos de'], ['row', 'linha'], ['column', 'coluna']], [g('arrays', 5, 'Count the array: rows times columns.'), g('times', 10, 'Tables sprint: 2, 5 and 10.', { t1: 2, t2: 5, t3: 10 }), cv('times5')]),
  U(2, 4, 'number', 'halves', 'Halves and quarters', 'Metades e quartos', ['Recognise halves and quarters of shapes and amounts'], [['half', 'metade'], ['quarter', 'quarto'], ['equal parts', 'partes iguais']], [g('fracShade', 5, 'Shade the fraction.'), g('fracOf', 6, 'Find a half or a quarter.', { dens: 2, unit: 1, mult: 5 }), cv('half')]),
  U(2, 5, 'geometry', 'time2', 'Time to the quarter hour', 'As horas e quartos', ['Read time to the quarter hour'], [['quarter past', 'e um quarto'], ['quarter to', 'menos um quarto'], ['minute', 'minuto']], [g('time', 6, 'What time is it?', { step: 15 })]),
  U(2, 6, 'statistics', 'charts2', 'Block graphs', 'Gráficos de barras', ['Read and compare data in block graphs'], [['data', 'dados'], ['popular', 'popular'], ['compare', 'comparar']], [g('bars', 6, 'Read the block graph.', { max: 10 })]),
  // Stage 3
  U(3, 1, 'number', 'place3', 'Hundreds, tens and ones', 'Centenas, dezenas e unidades', ['Understand place value in 3-digit numbers', 'Round to the nearest 10 and 100'], [['hundreds', 'centenas'], ['round', 'arredondar'], ['nearest', 'mais próximo']], [g('place', 5, 'Build the 3-digit number.', { min: 101, max: 999 }), g('round', 8, 'Round to the nearest 10.', { to: 10, max: 999 }), cv('rounding')]),
  U(3, 2, 'number', 'addsub3', 'Adding and subtracting 3-digit numbers', 'Somar e subtrair números de 3 algarismos', ['Add and subtract 2- and 3-digit numbers', 'Estimate and check answers'], [['estimate', 'estimar'], ['check', 'verificar'], ['sum', 'soma']], [g('addsub', 10, 'Quick Maths to 200.', { max: 200, sub: 1 }), g('storyAdd', 4, 'Story problems.', { max: 200 })]),
  U(3, 3, 'number', 'times34', 'Tables: 3, 4 and 8', 'A tabuada do 3, 4 e 8', ['Recall multiplication and division facts for 3, 4 and 8'], [['multiply', 'multiplicar'], ['divide', 'dividir'], ['share', 'repartir']], [g('times', 10, 'Tables sprint: 3, 4 and 8.', { t1: 3, t2: 4, t3: 8 }), g('divide', 8, 'Division facts.', { t1: 3, t2: 4, t3: 8 }), g('storyMul', 3, 'Story problems.', { groups: 8, each: 8 })]),
  U(3, 4, 'number', 'fractions3', 'Fractions of shapes and amounts', 'Fracções de figuras e quantidades', ['Find unit fractions of amounts', 'Compare simple fractions'], [['fraction', 'fracção'], ['numerator', 'numerador'], ['denominator', 'denominador']], [g('fracShade', 5, 'Shade the fraction.'), g('fracOf', 6, 'Find a fraction of a number.', { dens: 4, unit: 1 }), g('fracCompare', 5, 'Which fraction is larger?'), cv('fractions')]),
  U(3, 5, 'geometry', 'time3', 'Time to 5 minutes', 'As horas de 5 em 5 minutos', ['Read time to the nearest 5 minutes'], [['past', 'e (passado)'], ['to', 'menos'], ['analogue', 'analógico']], [g('time', 6, 'What time is it?', { step: 5 })]),
  U(3, 6, 'statistics', 'charts3', 'Bar charts and chance', 'Gráficos e probabilidade', ['Read bar charts', 'Use words to describe how likely something is'], [['likely', 'provável'], ['unlikely', 'improvável'], ['certain', 'certo'], ['impossible', 'impossível']], [g('bars', 5, 'Read the bar chart.', { max: 12 }), g('chance', 6, 'How likely is it?')]),
  // Stage 4
  U(4, 1, 'number', 'place4', 'Thousands and negative numbers', 'Milhares e números negativos', ['Understand place value to 4 digits', 'Use negative numbers in context'], [['thousands', 'milhares'], ['negative', 'negativo'], ['temperature', 'temperatura']], [g('place', 5, 'Build the 4-digit number.', { min: 1001, max: 9999 }), g('negative', 6, 'Temperature problems.'), g('line', 5, 'Find the number on the line.', { min: -10, max: 10, step: 1 })]),
  U(4, 2, 'number', 'times4', 'All the tables to 10 × 10', 'Toda a tabuada até 10 × 10', ['Recall multiplication facts to 10 × 10', 'Multiply 2-digit by 1-digit numbers'], [['product', 'produto'], ['factor', 'factor'], ['multiple', 'múltiplo']], [g('times', 12, 'Tables sprint: 6, 7 and 9.', { t1: 6, t2: 7, t3: 9 }), g('mulBig', 6, 'Multiply bigger numbers.', { max: 50 }), g('storyMul', 3, 'Story problems.')]),
  U(4, 3, 'number', 'fractions4', 'Equivalent fractions', 'Fracções equivalentes', ['Recognise equivalent fractions', 'Add fractions with the same denominator'], [['equivalent', 'equivalente'], ['simplify', 'simplificar']], [g('fracShade', 5, 'Shade the fraction.', { big: 1 }), g('fracAdd', 6, 'Add the fractions (simplify if you can).'), g('fracCompare', 5, 'Which is larger?')]),
  U(4, 4, 'number', 'decimals4', 'Tenths and decimals', 'Décimas e números decimais', ['Understand tenths as decimals', 'Place decimals on a number line'], [['decimal', 'decimal'], ['tenth', 'décima'], ['decimal point', 'vírgula decimal']], [g('line', 6, 'Find the decimal on the line.', { min: 0, max: 1, step: 0.1 }), g('decimals', 6, 'Add and subtract tenths.', { dp: 1 }), cv('decimals')]),
  U(4, 5, 'geometry', 'perimeter', 'Perimeter and area', 'Perímetro e área', ['Find the perimeter of rectangles', 'Find area by counting squares'], [['perimeter', 'perímetro'], ['area', 'área'], ['centimetre', 'centímetro']], [g('perimeter', 6, 'Perimeter of rectangles.', { max: 12 }), g('perimeter', 6, 'Area of rectangles.', { max: 10, area: 1 }), cv('area')]),
  U(4, 6, 'statistics', 'charts4', 'Data and chance', 'Dados e probabilidade', ['Interpret bar charts', 'Describe chance with words'], [['survey', 'inquérito'], ['even chance', 'igual probabilidade']], [g('bars', 6, 'Read the bar chart.', { max: 20 }), g('chance', 6, 'How likely is it?'), cv('chance')]),
  // Stage 5
  U(5, 1, 'number', 'place5', 'Large numbers and rounding', 'Números grandes e arredondamentos', ['Round to the nearest 10, 100 and 1000', 'Count on and back in steps, including negatives'], [['round', 'arredondar'], ['sequence', 'sequência'], ['rule', 'regra']], [g('round', 8, 'Round to the nearest 100.', { to: 100, max: 9999 }), g('sequence', 8, 'What comes next? Find the rule.', { minStep: 3, maxStep: 25, down: 1 })]),
  U(5, 2, 'number', 'muldiv5', 'Multiplying and dividing', 'Multiplicar e dividir', ['Multiply 2-digit numbers by 1-digit numbers', 'Divide with remainders'], [['remainder', 'resto'], ['quotient', 'quociente']], [g('mulBig', 8, 'Multiply.', { max: 99 }), g('remainders', 6, 'Division with remainders.'), g('storyMul', 4, 'Story problems.', { groups: 12, each: 12 })]),
  U(5, 3, 'number', 'fractions5', 'Fractions, decimals and percentages', 'Fracções, decimais e percentagens', ['Add fractions with related denominators', 'Find simple percentages of amounts'], [['percentage', 'percentagem'], ['per cent', 'por cento']], [g('fracAdd', 6, 'Add fractions.', { mixed: 1 }), g('percent', 8, 'Percentages of amounts.'), g('decimals', 6, 'Decimals with hundredths.', { dp: 2 })]),
  U(5, 4, 'geometry', 'angles5', 'Angles', 'Ângulos', ['Classify angles as acute, right, obtuse or straight'], [['angle', 'ângulo'], ['acute', 'agudo'], ['obtuse', 'obtuso'], ['right angle', 'ângulo recto']], [g('angles', 8, 'What type of angle?'), g('perimeter', 6, 'Area of rectangles.', { max: 15, area: 1 })]),
  U(5, 5, 'number', 'money5', 'Money problems', 'Problemas com dinheiro', ['Solve problems with money, including change'], [['change', 'troco'], ['price', 'preço'], ['cost', 'custo']], [g('money', 6, 'Money problems.', { cents: 1 })]),
  U(5, 6, 'statistics', 'mean5', 'Averages and data', 'Médias e dados', ['Find the mode and the mean of small sets of data'], [['mean', 'média'], ['mode', 'moda'], ['data set', 'conjunto de dados']], [g('mean', 6, 'Find the mean.'), g('bars', 5, 'Read the bar chart.', { max: 30 }), cv('mean')]),
  // Stage 6
  U(6, 1, 'number', 'integers6', 'Negative numbers and sequences', 'Números negativos e sequências', ['Add and subtract with negative numbers', 'Find and explain rules of sequences'], [['integer', 'número inteiro'], ['term', 'termo']], [g('negative', 6, 'Temperature problems.'), g('sequence', 8, 'Find the next term.', { minStep: 4, maxStep: 40, down: 1 }), g('line', 5, 'Find the number on the line.', { min: -20, max: 20, step: 2 })]),
  U(6, 2, 'number', 'fractions6', 'Adding fractions and finding percentages', 'Somar fracções e calcular percentagens', ['Add fractions with different denominators', 'Find percentages of amounts'], [['common denominator', 'denominador comum'], ['equivalent', 'equivalente']], [g('fracAdd', 8, 'Add fractions with different denominators.', { mixed: 1 }), g('percent', 8, 'Percentages.'), g('fracOf', 6, 'Fractions of amounts.', { dens: 5, mult: 8 })]),
  U(6, 3, 'number', 'decimals6', 'Decimals and money', 'Decimais e dinheiro', ['Add and subtract decimals with up to two places', 'Solve money problems'], [['hundredth', 'centésima'], ['decimal place', 'casa decimal']], [g('decimals', 8, 'Add and subtract decimals.', { dp: 2 }), g('money', 4, 'Money problems.', { cents: 1 }), g('line', 5, 'Find the decimal.', { min: 0, max: 2, step: 0.2 })]),
  U(6, 4, 'geometry', 'triangles6', 'Angles in triangles', 'Ângulos nos triângulos', ['Use the fact that the angles of a triangle add up to 180°'], [['degrees', 'graus'], ['triangle', 'triângulo'], ['sum', 'soma']], [g('triangle', 8, 'Find the missing angle.'), g('angles', 5, 'Classify the angle.'), cv('triangle')]),
  U(6, 5, 'geometry', 'area6', 'Area and perimeter problems', 'Problemas de área e perímetro', ['Calculate area and perimeter of rectangles', 'Reason about shapes with the same perimeter'], [['area', 'área'], ['square centimetre', 'centímetro quadrado']], [g('perimeter', 6, 'Area.', { max: 20, area: 1 }), g('perimeter', 6, 'Perimeter.', { max: 20 }), cv('area')]),
  U(6, 6, 'statistics', 'data6', 'Mean, mode and probability', 'Média, moda e probabilidade', ['Find the mean of a data set', 'Describe probability and recognise events that cannot happen together'], [['probability', 'probabilidade'], ['outcome', 'resultado']], [g('mean', 8, 'Find the mean.'), g('chance', 6, 'How likely is it?'), cv('chance')]),
];

/** Units 1–2 of every stage are free; the rest come with Plus (like the English course). */
export const MATHS_FREE_ORDER = 2;
export const mathsUnitOpen = (u: MathsUnit, pro: boolean) => pro || u.order <= MATHS_FREE_ORDER;
export const mathsUnit = (id: string) => MATHS_UNITS.find((u) => u.id === id);
export const unitsForStage = (s: MathsStage) => MATHS_UNITS.filter((u) => u.stage === s).sort((a, b) => a.order - b.order);

/** The games for a unit. `round` 0 is the course set; higher rounds are fresh practice. */
export function buildMathsUnit(u: MathsUnit, round = 0): MathsActivity[] {
  return u.games.map((spec, i) => {
    const id = `${u.id}-${i}${round ? `-r${round}` : ''}`;
    const info = MATHS_KIND_INFO[spec.kind];
    const skill = `${u.strand}:${u.id}`;
    if (spec.gen.startsWith('convince:')) {
      const c = CONVINCE[spec.gen.slice(9)]!;
      return { kind: 'convince', prompt: c.prompt, hint: c.hint, id, title: info.title, intro: spec.intro, skill: `reasoning:${u.id}` };
    }
    const body = GENERATORS[spec.gen]!(rng(`${id}:${round}`), spec.n, spec.p ?? {});
    return { ...body, id, title: info.title, intro: spec.intro, skill } as MathsActivity;
  });
}

// ── Answer checking (accepts Portuguese decimal commas and equivalent fractions) ──

export function parseNumber(s: string): number | null {
  const t = s.trim().replace(/\s+/g, '').replace(/^\$/, '').replace(/[°%]$/, '').replace(',', '.').replace(/−/g, '-');
  if (/^-?\d+(\.\d+)?$/.test(t)) return Number(t);
  const f = /^(-?\d+)\/(\d+)$/.exec(t);
  if (f && Number(f[2])) return Number(f[1]) / Number(f[2]);
  const mixed = /^(\d+)(?:\+|\s)(\d+)\/(\d+)$/.exec(s.trim());
  if (mixed && Number(mixed[3])) return Number(mixed[1]) + Number(mixed[2]) / Number(mixed[3]);
  return null;
}
export function answerMatches(expected: string, given: string): boolean {
  const a = parseNumber(expected), b = parseNumber(given);
  if (a != null && b != null) return Math.abs(a - b) < 1e-9;
  return expected.trim().toLowerCase() === given.trim().toLowerCase();
}

/** Learner-facing text inside a maths activity, for safety checks on anything Zuva makes. */
export const mathsText = (a: MathsBody) => JSON.stringify(a);
