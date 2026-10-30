/** Line Bot: a robot with three light sensors follows a black line using rules the child writes. */
export type Heading = 0 | 1 | 2 | 3; // north, east, south, west
export type Action = 'forward' | 'left' | 'right' | 'stop';
export type Situation = 'ahead' | 'leftOnly' | 'rightOnly' | 'both' | 'none' | 'wall';
export type RuleSet = Record<Situation, Action>;

export interface Track { w: number; h: number; line: Set<number>; walls: Set<number>; start: number; heading: Heading; finish: number }

export function parseTrack(rows: string[], heading: Heading): Track {
  const h = rows.length;
  const w = rows[0]!.length;
  const line = new Set<number>();
  const walls = new Set<number>();
  let start = 0;
  let finish = 0;
  rows.forEach((r, y) => [...r].forEach((ch, x) => {
    const i = y * w + x;
    if (ch === '#' || ch === 'S' || ch === 'F') line.add(i);
    if (ch === 'W') walls.add(i);
    if (ch === 'S') start = i;
    if (ch === 'F') finish = i;
  }));
  return { w, h, line, walls, start, heading, finish };
}

const DX = [0, 1, 0, -1];
const DY = [-1, 0, 1, 0];

function cell(t: Track, i: number, hd: number): number | null {
  const x = (i % t.w) + DX[hd]!;
  const y = Math.floor(i / t.w) + DY[hd]!;
  return x < 0 || y < 0 || x >= t.w || y >= t.h ? null : y * t.w + x;
}

const onLine = (t: Track, i: number | null) => i !== null && t.line.has(i);

/** What the sensors see from square i facing hd. */
export function sense(t: Track, i: number, hd: Heading): Situation {
  const ahead = cell(t, i, hd);
  if (ahead !== null && t.walls.has(ahead)) return 'wall';
  if (onLine(t, ahead)) return 'ahead';
  const l = onLine(t, cell(t, i, ((hd + 3) % 4) as Heading));
  const r = onLine(t, cell(t, i, ((hd + 1) % 4) as Heading));
  return l && r ? 'both' : l ? 'leftOnly' : r ? 'rightOnly' : 'none';
}

export interface BotStep { pos: number; heading: Heading; situation: Situation; action: Action }
export type BotResult = { kind: 'finish' | 'lost' | 'stopped' | 'loop' | 'crash'; steps: BotStep[] };

export function runBot(t: Track, rules: RuleSet, maxSteps = 200): BotResult {
  let pos = t.start;
  let hd = t.heading;
  const steps: BotStep[] = [];
  const seen = new Set<string>();
  for (let n = 0; n < maxSteps; n++) {
    if (pos === t.finish) return { kind: 'finish', steps };
    const situation = sense(t, pos, hd);
    const action = rules[situation];
    steps.push({ pos, heading: hd, situation, action });
    if (action === 'stop') return { kind: 'stopped', steps };
    if (action === 'left') { hd = ((hd + 3) % 4) as Heading; continue; }
    if (action === 'right') { hd = ((hd + 1) % 4) as Heading; continue; }
    // Driving forward over the same square in the same direction twice means it is going round in circles.
    const key = `${pos}:${hd}`;
    if (seen.has(key)) return { kind: 'loop', steps };
    seen.add(key);
    const next = cell(t, pos, hd);
    if (next !== null && t.walls.has(next)) return { kind: 'crash', steps };
    if (next === null || !t.line.has(next)) return { kind: 'lost', steps: [...steps, { pos: next ?? pos, heading: hd, situation: 'none', action: 'forward' }] };
    pos = next;
  }
  return { kind: 'loop', steps };
}
