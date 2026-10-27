/** Pure Robo Maze engine — no React, fully unit-testable. */

export type Dir = 0 | 1 | 2 | 3; // N E S W
export type Cmd = 'F' | 'L' | 'R';
export type Node = { kind: 'cmd'; cmd: Cmd; id: string } | { kind: 'loop'; times: number; body: Node[]; id: string };

export interface MazeLevel {
  rows: string[]; // S start, G goal, . path, # blocked
  dir: Dir;
  optimal: number; // blocks in the best solution
  hint: string;
  loops?: boolean; // loop block available
}

export interface Pos { r: number; c: number }
export interface Step { pos: Pos; dir: Dir; crashed?: boolean; won?: boolean; cmd: Cmd }

export const LEVELS: MazeLevel[] = [
  { rows: ['S...G'], dir: 1, optimal: 4, hint: 'The robot is facing the mango. Move it forward until it reaches the mango!' },
  { rows: ['S..', '#.#', '#.G'], dir: 1, optimal: 6, hint: 'Turns don’t move Zuva — they only change the direction it faces.' },
  { rows: ['S.##', '#..#', '##.G'], dir: 1, optimal: 9, hint: 'Right, left, right, left… can you see the pattern?' },
  { rows: ['S......G'], dir: 1, optimal: 2, hint: 'Seven moves is a lot of blocks. Use a Repeat block!', loops: true },
  { rows: ['S.##', '#..#', '##..', '###G'], dir: 1, optimal: 5, hint: 'Forward, right, forward, left… repeated. Put those 4 blocks inside a loop.', loops: true },
  { rows: ['S....', '####.', 'G....'], dir: 1, optimal: 8, hint: 'Go along the top, down the side, then back along the bottom.', loops: true },
  { rows: ['G....', '####.', 'S....'], dir: 1, optimal: 8, hint: 'This time Zuva must turn left to go up.', loops: true },
  { rows: ['S...', '.##.', '.##.', 'G...'], dir: 1, optimal: 6, hint: 'A loop inside a loop! Repeat 2 × (repeat 3 × forward, then turn).', loops: true },
  { rows: ['S.###', '#..##', '##..#', '###..', '####G'], dir: 1, optimal: 5, hint: 'A long staircase. One loop can do it all.', loops: true },
  { rows: ['S....', '####.', '..G#.', '.###.', '.....'], dir: 1, optimal: 9, hint: 'A spiral! Three sides look the same — loop them.', loops: true },
];

export function findCell(level: MazeLevel, ch: 'S' | 'G'): Pos {
  for (let r = 0; r < level.rows.length; r++) {
    const c = level.rows[r]!.indexOf(ch);
    if (c >= 0) return { r, c };
  }
  throw new Error(`Level has no ${ch}`);
}

export function isOpen(level: MazeLevel, p: Pos): boolean {
  const row = level.rows[p.r];
  if (!row || p.c < 0 || p.c >= row.length) return false;
  return row[p.c] !== '#';
}

const DELTA: Record<Dir, Pos> = { 0: { r: -1, c: 0 }, 1: { r: 0, c: 1 }, 2: { r: 1, c: 0 }, 3: { r: 0, c: -1 } };

export function flatten(program: Node[], limit = 200): Cmd[] {
  const out: Cmd[] = [];
  const walk = (nodes: Node[]) => {
    for (const n of nodes) {
      if (out.length >= limit) return;
      if (n.kind === 'cmd') out.push(n.cmd);
      else for (let i = 0; i < n.times; i++) walk(n.body);
    }
  };
  walk(program);
  return out;
}

export function countBlocks(program: Node[]): number {
  return program.reduce((n, node) => n + 1 + (node.kind === 'loop' ? countBlocks(node.body) : 0), 0);
}

export function simulate(level: MazeLevel, program: Node[]): { steps: Step[]; result: 'won' | 'crashed' | 'short' } {
  let pos = findCell(level, 'S');
  let dir = level.dir;
  const goal = findCell(level, 'G');
  const steps: Step[] = [];
  for (const cmd of flatten(program)) {
    if (cmd === 'L') dir = ((dir + 3) % 4) as Dir;
    else if (cmd === 'R') dir = ((dir + 1) % 4) as Dir;
    else {
      const next = { r: pos.r + DELTA[dir].r, c: pos.c + DELTA[dir].c };
      if (!isOpen(level, next)) {
        steps.push({ pos, dir, crashed: true, cmd });
        return { steps, result: 'crashed' };
      }
      pos = next;
    }
    const won = pos.r === goal.r && pos.c === goal.c;
    steps.push({ pos, dir, won, cmd });
    if (won) return { steps, result: 'won' };
  }
  return { steps, result: 'short' };
}

export function starsFor(level: MazeLevel, program: Node[]): number {
  const n = countBlocks(program);
  if (n <= level.optimal) return 3;
  if (n <= level.optimal + 3) return 2;
  return 1;
}
