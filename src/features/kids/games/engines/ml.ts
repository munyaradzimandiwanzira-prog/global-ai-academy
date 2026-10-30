/** Teach the Machine: a k-nearest-neighbours classifier on two features (colour, softness), both 0..1. */
export interface Example { x: number; y: number; label: 'ripe' | 'unripe' }

export function predict(train: Example[], x: number, y: number, k = 3): 'ripe' | 'unripe' | null {
  if (!train.length) return null;
  const near = [...train].sort((a, b) => (a.x - x) ** 2 + (a.y - y) ** 2 - ((b.x - x) ** 2 + (b.y - y) ** 2)).slice(0, Math.min(k, train.length));
  const ripe = near.filter((e) => e.label === 'ripe').length;
  return ripe * 2 > near.length ? 'ripe' : ripe * 2 < near.length ? 'unripe' : near[0]!.label;
}

export function accuracy(train: Example[], test: Example[], k = 3): number {
  if (!test.length) return 0;
  return test.filter((t) => predict(train, t.x, t.y, k) === t.label).length / test.length;
}

/** The "true" rule nature uses in this game: yellow-ish and soft-ish fruit is ripe. */
export const truth = (x: number, y: number): 'ripe' | 'unripe' => (x * 0.6 + y * 0.4 > 0.5 ? 'ripe' : 'unripe');

/** Deterministic pseudo-random numbers so every child sees the same fruit for a level. */
export function rng(seed: number) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
}

export function makeFruit(n: number, seed: number, region?: (x: number, y: number) => boolean): Example[] {
  const r = rng(seed);
  const out: Example[] = [];
  while (out.length < n) {
    const x = Math.round(r() * 100) / 100;
    const y = Math.round(r() * 100) / 100;
    if (Math.abs(x * 0.6 + y * 0.4 - 0.5) < 0.04) continue; // keep the borderline fair
    if (region && !region(x, y)) continue;
    out.push({ x, y, label: truth(x, y) });
  }
  return out;
}
