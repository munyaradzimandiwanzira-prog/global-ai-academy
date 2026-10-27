/** A tiny Logo-style interpreter for Turtle Art. Pure and unit-tested. */

export interface Segment { x1: number; y1: number; x2: number; y2: number; color: string; width: number }
export interface TurtleState { x: number; y: number; heading: number; pen: boolean; color: string; width: number }

export class TurtleError extends Error {}

type Token = string;
const MAX_STEPS = 5000;

const ALIASES: Record<string, string> = {
  fd: 'forward', forward: 'forward', move: 'forward',
  bk: 'back', back: 'back', backward: 'back',
  rt: 'right', right: 'right',
  lt: 'left', left: 'left',
  pu: 'penup', penup: 'penup',
  pd: 'pendown', pendown: 'pendown',
  color: 'color', colour: 'color', pencolor: 'color',
  width: 'width', size: 'width',
  repeat: 'repeat', home: 'home',
};

const NAMED_COLORS = new Set(['red', 'blue', 'green', 'yellow', 'orange', 'purple', 'pink', 'black', 'brown', 'gold', 'teal', 'navy', 'gray', 'white']);

export function tokenize(src: string): Token[] {
  return src
    .replace(/#[^\n]*/g, (m) => (/^#[0-9a-fA-F]{3,6}\b/.test(m) ? m : '')) // allow #hex colours, strip comments
    .replace(/\[/g, ' [ ')
    .replace(/\]/g, ' ] ')
    .split(/[\s,]+/)
    .filter(Boolean)
    .map((t) => t.toLowerCase());
}

export function run(src: string, start: Partial<TurtleState> = {}): Segment[] {
  const tokens = tokenize(src);
  const state: TurtleState = { x: 0, y: 0, heading: 0, pen: true, color: '#142B52', width: 3, ...start };
  const segments: Segment[] = [];
  let steps = 0;

  const num = (i: number, cmd: string): number => {
    const t = tokens[i];
    const n = Number(t);
    if (t === undefined || Number.isNaN(n)) throw new TurtleError(`“${cmd}” needs a number after it, like “${cmd} 50”.`);
    return n;
  };

  const exec = (start: number, end: number) => {
    let i = start;
    while (i < end) {
      if (++steps > MAX_STEPS) throw new TurtleError('That is a LOT of steps! Try smaller repeat numbers.');
      const raw = tokens[i]!;
      const cmd = ALIASES[raw];
      if (!cmd) throw new TurtleError(`I don’t know the word “${raw}”. Try forward, right, left or repeat.`);
      switch (cmd) {
        case 'forward':
        case 'back': {
          const d = num(i + 1, raw) * (cmd === 'back' ? -1 : 1);
          const rad = (state.heading * Math.PI) / 180;
          const nx = state.x + d * Math.sin(rad);
          const ny = state.y - d * Math.cos(rad);
          if (state.pen) segments.push({ x1: state.x, y1: state.y, x2: nx, y2: ny, color: state.color, width: state.width });
          state.x = nx;
          state.y = ny;
          i += 2;
          break;
        }
        case 'right':
        case 'left':
          state.heading = (state.heading + (cmd === 'right' ? 1 : -1) * num(i + 1, raw) + 360) % 360;
          i += 2;
          break;
        case 'penup': state.pen = false; i += 1; break;
        case 'pendown': state.pen = true; i += 1; break;
        case 'home': state.x = 0; state.y = 0; state.heading = 0; i += 1; break;
        case 'width': state.width = Math.max(1, Math.min(20, num(i + 1, raw))); i += 2; break;
        case 'color': {
          const c = tokens[i + 1];
          if (!c || !(NAMED_COLORS.has(c) || /^#[0-9a-f]{3,6}$/.test(c))) throw new TurtleError('Pick a colour like “color red” or “color blue”.');
          state.color = c;
          i += 2;
          break;
        }
        case 'repeat': {
          const times = num(i + 1, raw);
          if (tokens[i + 2] !== '[') throw new TurtleError('After “repeat 4” put the commands inside [ square brackets ].');
          let depth = 0;
          let j = i + 2;
          for (; j < end; j++) {
            if (tokens[j] === '[') depth++;
            else if (tokens[j] === ']' && --depth === 0) break;
          }
          if (depth !== 0) throw new TurtleError('A [ bracket is missing its closing ].');
          for (let k = 0; k < Math.min(times, 360); k++) exec(i + 3, j);
          i = j + 1;
          break;
        }
      }
    }
  };
  exec(0, tokens.length);
  return segments;
}

/** Normalised, direction-independent fingerprint of a drawing, used to check challenges. */
export function fingerprint(segments: Segment[]): string[] {
  const r = (n: number) => Math.round(n);
  return segments
    .filter((s) => Math.hypot(s.x2 - s.x1, s.y2 - s.y1) > 0.5)
    .map((s) => {
      const a = `${r(s.x1)},${r(s.y1)}`;
      const b = `${r(s.x2)},${r(s.y2)}`;
      return a < b ? `${a}|${b}` : `${b}|${a}`;
    })
    .sort();
}

export function sameDrawing(a: Segment[], b: Segment[]): boolean {
  const fa = new Set(fingerprint(a));
  const fb = new Set(fingerprint(b));
  if (fa.size !== fb.size) return false;
  for (const x of fa) if (!fb.has(x)) return false;
  return true;
}

export const CHALLENGES = [
  { id: 'line', title: 'A straight line', goal: 'Draw a line 100 steps long, straight up.', target: 'forward 100', starter: 'forward 50', tip: 'forward 100 moves 100 steps.' },
  { id: 'square', title: 'Square', goal: 'Draw a square with sides of 100.', target: 'repeat 4 [forward 100 right 90]', starter: 'forward 100\nright 90\n', tip: 'A square has 4 equal sides and 4 turns of 90°. Use repeat 4 [ … ].' },
  { id: 'triangle', title: 'Triangle', goal: 'Draw a triangle with sides of 120.', target: 'repeat 3 [forward 120 right 120]', starter: 'repeat 3 [\n  forward 120\n  right ??\n]', tip: 'To go all the way round you turn 360°. With 3 turns, each is 360 ÷ 3.' },
  { id: 'hexagon', title: 'Hexagon (like a honeycomb)', goal: 'Draw a hexagon with sides of 70.', target: 'repeat 6 [forward 70 right 60]', starter: '', tip: '6 sides → each turn is 360 ÷ 6 degrees.' },
  { id: 'star', title: 'Star', goal: 'Draw a 5-pointed star with lines of 150.', target: 'repeat 5 [forward 150 right 144]', starter: 'repeat 5 [\n  forward 150\n  right 144\n]', tip: 'A star turns 144° each time. Try it!' },
  { id: 'steps', title: 'Staircase', goal: 'Draw 4 steps, each 30 up and 30 across.', target: 'repeat 4 [forward 30 right 90 forward 30 left 90]', starter: '', tip: 'Up, turn right, across, turn left… then repeat.' },
] as const;
