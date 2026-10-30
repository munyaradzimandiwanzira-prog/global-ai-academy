import { describe, expect, it } from 'vitest';
import { simulate, describeMiss } from '../src/features/kids/games/engines/physics';
import { run, dir, file, type Shell } from '../src/features/kids/games/engines/terminal';
import { blankLevel, solve, step, newGame, type Level } from '../src/features/kids/games/engines/gamemaker';
import { fastest, routeCost, type Link } from '../src/features/kids/games/engines/network';
import { checkBridge, rank, type Node } from '../src/features/kids/games/engines/bridge';
import { parseTrack, runBot, type RuleSet } from '../src/features/kids/games/engines/linebot';
import { predict, accuracy, makeFruit, truth } from '../src/features/kids/games/engines/ml';

describe('Launch Lab physics', () => {
  it('45° goes farther than 20° or 70° on flat ground, and matches v²/g', () => {
    const world = { g: 9.8, target: { x1: 1000, x2: 1001, y: 0 } };
    const r = (a: number) => simulate({ angleDeg: a, speed: 20 }, world).outcome.x;
    expect(r(45)).toBeGreaterThan(r(20));
    expect(r(45)).toBeGreaterThan(r(70));
    expect(r(45)).toBeCloseTo(400 / 9.8, 0);
  });
  it('lands in a basket, hits a wall, and describes misses', () => {
    const range = (400 / 9.8);
    expect(simulate({ angleDeg: 45, speed: 20 }, { g: 9.8, target: { x1: range - 2, x2: range + 2, y: 0 } }).outcome.kind).toBe('target');
    expect(simulate({ angleDeg: 15, speed: 20 }, { g: 9.8, walls: [{ x1: 10, x2: 12, h: 8 }], target: { x1: 38, x2: 42, y: 0 } }).outcome.kind).toBe('wall');
    expect(describeMiss({ kind: 'ground', x: 30, y: 0 }, { x1: 38, x2: 42, y: 0 })).toBe('landed 10 m short');
  });
  it('lower gravity throws farther (the Moon)', () => {
    const t = { x1: 9999, x2: 10000, y: 0 };
    expect(simulate({ angleDeg: 45, speed: 10 }, { g: 1.62, target: t }).outcome.x).toBeGreaterThan(simulate({ angleDeg: 45, speed: 10 }, { g: 9.8, target: t }).outcome.x * 5);
  });
});

describe('Terminal Treasure shell', () => {
  const shell: Shell = { fs: dir({ home: dir({ zuva: dir({ 'note.txt': file('hello'), '.secret': file('gold'), kariba: dir({ 'map.txt': file('X') }) }) }) }), cwd: ['home', 'zuva'], home: ['home', 'zuva'] };
  it('ls, cd, cat, pwd, hidden files', () => {
    expect(run(shell, 'ls').out).toEqual(['kariba/   note.txt']);
    expect(run(shell, 'ls -a').out![0]).toContain('.secret');
    const s2 = run(shell, 'cd kariba').shell;
    expect(run(s2, 'pwd').out).toEqual(['/home/zuva/kariba']);
    expect(run(s2, 'cat map.txt').out).toEqual(['X']);
    expect(run(run(s2, 'cd ..').shell, 'pwd').out).toEqual(['/home/zuva']);
    expect(run(s2, 'cat ~/note.txt').out).toEqual(['hello']);
  });
  it('mkdir makes a folder without changing the original, and errors are friendly', () => {
    const r = run(shell, 'mkdir camp');
    expect(run(r.shell, 'ls').out![0]).toContain('camp/');
    expect(run(shell, 'ls').out![0]).not.toContain('camp');
    expect(run(shell, 'cd nowhere').out![0]).toMatch(/no folder/);
    expect(run(shell, 'cat kariba').out![0]).toMatch(/is a folder/);
    expect(run(shell, 'rm note.txt').out![0]).toMatch(/switched off/);
    expect(run(shell, 'clear').out).toBeNull();
  });
});

describe('Game Maker solver', () => {
  const lvl = (rows: string[]): Level => {
    const l = blankLevel(rows[0]!.length, rows.length);
    const map: Record<string, Level['tiles'][number]> = { '.': 'floor', '#': 'wall', c: 'coin', l: 'lava', G: 'goal', S: 'start' };
    l.tiles = rows.join('').split('').map((ch) => map[ch]!);
    return l;
  };
  it('finds the shortest win and respects needAllCoins and lava', () => {
    const l = lvl(['S.c', '###', '..G']);
    expect(solve(l, { lavaRestart: true, needAllCoins: false })).toBeNull(); // walled off
    const l2 = lvl(['S.c', '.#.', '..G']);
    expect(solve(l2, { lavaRestart: true, needAllCoins: false })).toBe(4);
    expect(solve(l2, { lavaRestart: true, needAllCoins: true })).toBe(4);
    const l3 = lvl(['Sl.', 'll.', 'c.G']);
    expect(solve(l3, { lavaRestart: true, needAllCoins: true })).toBeNull();
    expect(solve(l3, { lavaRestart: false, needAllCoins: true })).not.toBeNull();
  });
  it('step: coins, lava sends you back, goal needs coins', () => {
    const l = lvl(['Slc', '..G']);
    const rules = { lavaRestart: true, needAllCoins: true };
    let s = newGame(l);
    const lava = step(l, rules, s, 'right');
    expect(lava.event).toBe('lava');
    expect(lava.state.pos).toBe(0);
    s = step(l, rules, s, 'down').state;
    s = step(l, rules, s, 'right').state;
    expect(step(l, rules, s, 'right').event).toBe('need-coins');
  });
});

describe('Packet Post routing', () => {
  const links: Link[] = [
    { a: 'Harare', b: 'Kadoma', ms: 12 }, { a: 'Kadoma', b: 'Gweru', ms: 10 }, { a: 'Gweru', b: 'Bulawayo', ms: 14 },
    { a: 'Harare', b: 'Masvingo', ms: 20 }, { a: 'Masvingo', b: 'Bulawayo', ms: 25 },
  ];
  it('finds the fastest route and costs routes', () => {
    expect(fastest(links, 'Harare', 'Bulawayo')).toEqual({ ms: 36, route: ['Harare', 'Kadoma', 'Gweru', 'Bulawayo'] });
    expect(routeCost(links, ['Harare', 'Masvingo', 'Bulawayo'])).toBe(45);
    expect(routeCost(links, ['Harare', 'Gweru'])).toBeNull();
  });
  it('reroutes around a broken cable', () => {
    const broken = links.map((l) => (l.b === 'Gweru' ? { ...l, down: true } : l));
    expect(fastest(broken, 'Harare', 'Bulawayo')!.route).toEqual(['Harare', 'Masvingo', 'Bulawayo']);
  });
});

describe('Bridge Builder rigidity', () => {
  // Two anchors, one free joint above the middle, deck = the two anchors.
  const tri: Node[] = [{ id: 0, x: 0, y: 0, anchor: true, deck: true }, { id: 1, x: 2, y: 0, anchor: true, deck: true }, { id: 2, x: 1, y: 1 }];
  it('rank works', () => {
    expect(rank([[1, 0], [0, 1], [1, 1]])).toBe(2);
    expect(rank([[1, 2], [2, 4]])).toBe(1);
  });
  it('a triangle on two anchors is rigid; a single beam to a free joint wobbles', () => {
    expect(checkBridge(tri, [{ a: 0, b: 2 }, { a: 1, b: 2 }, { a: 0, b: 1 }]).rigid).toBe(true);
    const r = checkBridge(tri, [{ a: 0, b: 2 }, { a: 0, b: 1 }]);
    expect(r.rigid).toBe(false);
    expect(r.wobbly).toEqual([2]);
  });
  it('a square of beams sags; adding a diagonal makes it rigid', () => {
    const n: Node[] = [
      { id: 0, x: 0, y: 0, anchor: true, deck: true }, { id: 1, x: 1, y: 0, deck: true }, { id: 2, x: 2, y: 0, anchor: true, deck: true },
      { id: 3, x: 0, y: 1, anchor: true }, { id: 4, x: 1, y: 1 },
    ];
    const square = [{ a: 0, b: 1 }, { a: 1, b: 2 }, { a: 1, b: 4 }, { a: 3, b: 4 }];
    expect(checkBridge(n, square).rigid).toBe(false); // a straight deck joint can drop
    expect(checkBridge(n, [...square, { a: 0, b: 4 }, { a: 2, b: 4 }]).rigid).toBe(true);
  });
  it('the deck must reach both banks', () => {
    const n: Node[] = [{ id: 0, x: 0, y: 0, anchor: true, deck: true }, { id: 1, x: 3, y: 0, anchor: true, deck: true }, { id: 2, x: 1, y: 1 }];
    expect(checkBridge(n, [{ a: 0, b: 2 }]).deckConnected).toBe(false);
  });
});

describe('Line Bot', () => {
  const rules: RuleSet = { ahead: 'forward', leftOnly: 'left', rightOnly: 'right', both: 'left', none: 'stop', wall: 'right' };
  it('follows a line with a turn to the finish', () => {
    const t = parseTrack(['.F..', '.#..', '.###', '...S'], 3);
    expect(runBot(t, rules).kind).toBe('finish');
  });
  it('gets lost with bad rules', () => {
    const t = parseTrack(['.F..', '.#..', '.###', '...S'], 3);
    expect(runBot(t, { ...rules, rightOnly: 'forward' }).kind).toBe('lost');
  });
});

describe('Teach the Machine', () => {
  it('k-NN learns the ripe rule from good examples', () => {
    const train = makeFruit(30, 7);
    const test = makeFruit(40, 99);
    expect(accuracy(train, test)).toBeGreaterThan(0.8);
    expect(predict([], 0.5, 0.5)).toBeNull();
    expect(truth(1, 1)).toBe('ripe');
  });
  it('biased examples (only green fruit) do worse on real fruit', () => {
    const biased = makeFruit(30, 7, (x) => x < 0.45);
    const test = makeFruit(40, 99);
    expect(accuracy(biased, test)).toBeLessThan(accuracy(makeFruit(30, 7), test));
  });
});
