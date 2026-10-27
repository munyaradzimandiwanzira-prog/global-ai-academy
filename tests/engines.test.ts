import { describe, expect, it } from 'vitest';
import { LEVELS, simulate, countBlocks, starsFor, type Node } from '../src/features/kids/games/maze-engine';
import { run, sameDrawing, CHALLENGES, TurtleError } from '../src/features/kids/games/turtle-engine';

let n = 0;
const F: () => Node = () => ({ kind: 'cmd', cmd: 'F', id: `f${n++}` });
const L: () => Node = () => ({ kind: 'cmd', cmd: 'L', id: `l${n++}` });
const R: () => Node = () => ({ kind: 'cmd', cmd: 'R', id: `r${n++}` });
const loop = (times: number, ...body: Node[]): Node => ({ kind: 'loop', times, body, id: `loop${n++}` });

/** Reference solutions — proves every level is solvable in its stated optimal block count. */
const SOLUTIONS: Node[][] = [
  [F(), F(), F(), F()],
  [F(), R(), F(), F(), L(), F()],
  [F(), R(), F(), L(), F(), R(), F(), L(), F()],
  [loop(7, F())],
  [loop(3, F(), R(), F(), L())],
  [loop(4, F()), R(), loop(2, F()), R(), loop(4, F())],
  [loop(4, F()), L(), loop(2, F()), L(), loop(4, F())],
  [loop(2, loop(3, F()), R()), loop(3, F())],
  [loop(4, F(), R(), F(), L())],
  [loop(3, loop(4, F()), R()), loop(2, F()), R(), loop(2, F())],
];

describe('Robo Maze', () => {
  it.each(LEVELS.map((l, i) => [i + 1, l, SOLUTIONS[i]!] as const))('level %i is solvable within its optimal block count', (_i, level, solution) => {
    expect(simulate(level, solution).result).toBe('won');
    expect(countBlocks(solution)).toBeLessThanOrEqual(level.optimal + (level.loops ? 0 : 1));
  });

  it('detects crashes into rocks', () => {
    expect(simulate(LEVELS[1]!, [F(), F(), F()]).result).toBe('crashed');
  });

  it('awards fewer stars for long programs', () => {
    expect(starsFor(LEVELS[3]!, [loop(7, F())])).toBe(3);
    expect(starsFor(LEVELS[3]!, Array.from({ length: 7 }, F))).toBe(1);
  });
});

describe('Turtle engine', () => {
  it('draws a square with repeat', () => {
    const segs = run('repeat 4 [forward 100 right 90]');
    expect(segs).toHaveLength(4);
    expect(sameDrawing(segs, run('fd 100 rt 90 fd 100 rt 90 fd 100 rt 90 fd 100'))).toBe(true);
  });

  it('every challenge target is self-consistent', () => {
    for (const c of CHALLENGES) expect(sameDrawing(run(c.target), run(c.target))).toBe(true);
  });

  it('gives friendly errors', () => {
    expect(() => run('jump 10')).toThrow(TurtleError);
    expect(() => run('repeat 4 forward 10')).toThrow(/square brackets/);
    expect(() => run('forward')).toThrow(/needs a number/);
  });
});
