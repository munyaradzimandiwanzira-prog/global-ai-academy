/** Game Maker: a grid level the child designs, the rules they choose, and a solver that playtests it. */
export type Tile = 'floor' | 'wall' | 'coin' | 'lava' | 'goal' | 'start';
export interface Rules { lavaRestart: boolean; needAllCoins: boolean }
export interface Level { w: number; h: number; tiles: Tile[] }
export interface PlayState { pos: number; coins: Set<number>; score: number; moves: number; won: boolean; restarts: number }
export type Dir = 'up' | 'down' | 'left' | 'right';

export const blankLevel = (w = 10, h = 7): Level => ({ w, h, tiles: Array(w * h).fill('floor') });
export const count = (l: Level, t: Tile) => l.tiles.filter((x) => x === t).length;
export const startOf = (l: Level) => l.tiles.indexOf('start');

export function neighbour(l: Level, i: number, d: Dir): number | null {
  const x = i % l.w;
  const y = Math.floor(i / l.w);
  const [nx, ny] = d === 'up' ? [x, y - 1] : d === 'down' ? [x, y + 1] : d === 'left' ? [x - 1, y] : [x + 1, y];
  if (nx < 0 || ny < 0 || nx >= l.w || ny >= l.h) return null;
  const j = ny * l.w + nx;
  return l.tiles[j] === 'wall' ? null : j;
}

export function newGame(l: Level): PlayState {
  return { pos: startOf(l), coins: new Set(), score: 0, moves: 0, won: false, restarts: 0 };
}

export type StepEvent = 'move' | 'blocked' | 'coin' | 'lava' | 'win' | 'need-coins';

export function step(l: Level, rules: Rules, s: PlayState, d: Dir): { state: PlayState; event: StepEvent } {
  if (s.won) return { state: s, event: 'blocked' };
  const j = neighbour(l, s.pos, d);
  if (j === null) return { state: s, event: 'blocked' };
  const next: PlayState = { ...s, coins: new Set(s.coins), pos: j, moves: s.moves + 1 };
  const t = l.tiles[j];
  if (t === 'coin' && !next.coins.has(j)) {
    next.coins.add(j);
    next.score += 1;
    return { state: next, event: 'coin' };
  }
  if (t === 'lava' && rules.lavaRestart) return { state: { ...next, pos: startOf(l), restarts: s.restarts + 1 }, event: 'lava' };
  if (t === 'goal') {
    if (rules.needAllCoins && next.coins.size < count(l, 'coin')) return { state: next, event: 'need-coins' };
    return { state: { ...next, won: true }, event: 'win' };
  }
  return { state: next, event: 'move' };
}

/**
 * Playtest: can the level be won? Breadth-first search over (square, coins collected).
 * Returns the fewest moves to win, or null if it can't be won.
 */
export function solve(l: Level, rules: Rules): number | null {
  const start = startOf(l);
  const goal = l.tiles.indexOf('goal');
  if (start < 0 || goal < 0) return null;
  const coinIdx = l.tiles.flatMap((t, i) => (t === 'coin' ? [i] : []));
  const need = rules.needAllCoins ? (1 << coinIdx.length) - 1 : 0;
  if (coinIdx.length > 12) return null;
  const key = (p: number, m: number) => p * 4096 + m;
  const seen = new Set([key(start, 0)]);
  let frontier: [number, number][] = [[start, 0]];
  for (let dist = 1; frontier.length && dist < 2000; dist++) {
    const next: [number, number][] = [];
    for (const [p, m] of frontier) {
      for (const d of ['up', 'down', 'left', 'right'] as Dir[]) {
        const j = neighbour(l, p, d);
        if (j === null) continue;
        if (l.tiles[j] === 'lava' && rules.lavaRestart) continue; // stepping on lava just sends you back
        const ci = coinIdx.indexOf(j);
        const nm = ci >= 0 ? m | (1 << ci) : m;
        if (j === goal && (nm & need) === need) return dist;
        const k = key(j, nm);
        if (!seen.has(k)) { seen.add(k); next.push([j, nm]); }
      }
    }
    frontier = next;
  }
  return null;
}
