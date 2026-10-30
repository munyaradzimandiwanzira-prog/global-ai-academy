import { useCallback, useEffect, useState } from 'react';
import { useKidsStars } from '../kidsStore';
import { Zuva, SpeechBubble } from '../Zuva';
import { useCoach } from '../coach';
import { play } from '../sfx';
import { celebrate } from '@/lib/celebrate';
import { blankLevel, count, newGame, solve, step, type Dir, type Level, type PlayState, type Rules, type Tile } from './engines/gamemaker';
import { LevelTabs, StarRow, kidButton } from './common';
import { cn } from '@/lib/utils';

interface Challenge { name: string; brief: string; rules: Partial<Rules>; check: (l: Level, r: Rules) => string | null; hints: string[] }

const CHALLENGES: Challenge[] = [
  {
    name: 'A game you can win', rules: {},
    brief: 'Every game needs a start and a goal. Put Zuva (start) and a flag (goal) on the grid, add some walls, then press Play and reach the flag.',
    check: (l) => (count(l, 'start') !== 1 ? 'Put exactly one start square.' : count(l, 'goal') !== 1 ? 'Put exactly one flag.' : count(l, 'wall') < 4 ? 'Add at least 4 walls to make it interesting.' : null),
    hints: ['Pick "Start" from the paint box and tap a square.', 'Then pick "Flag" and tap another square.', 'Add walls between them, then press Play and use the arrows.'],
  },
  {
    name: 'Collect them all', rules: { needAllCoins: true },
    brief: 'Rule: you must collect every coin before the flag works. Place at least 3 coins, then win your own game.',
    check: (l) => (count(l, 'coin') < 3 ? 'Place at least 3 coins.' : null),
    hints: ['Pick "Coin" and place three of them.', 'Zuva playtests your level to make sure every coin can be reached.', 'Plan a path that visits every coin, then the flag.'],
  },
  {
    name: 'Danger zone', rules: { needAllCoins: true, lavaRestart: true },
    brief: 'Rule: touching lava sends you back to the start. Add at least 4 lava squares so the game is tricky, but still possible!',
    check: (l) => (count(l, 'lava') < 4 ? 'Add at least 4 lava squares.' : count(l, 'coin') < 2 ? 'Add at least 2 coins.' : null),
    hints: ['Good games are hard but fair. Leave a safe path.', 'If Zuva says it cannot be won, a coin or the flag is blocked by lava or walls.', 'Try putting lava next to the path, not on it.'],
  },
  {
    name: 'Just right', rules: { needAllCoins: true, lavaRestart: true },
    brief: 'Game designers balance difficulty. Make a level where the shortest win takes between 15 and 25 moves, then win it.',
    check: (l, r) => {
      const best = solve(l, r);
      if (best === null) return null;
      return best < 15 ? `The shortest win is only ${best} moves. Make the path longer.` : best > 25 ? `The shortest win is ${best} moves. Make it a bit shorter.` : null;
    },
    hints: ['Walls that make the player go around add moves.', 'Put coins in far corners so the path has to visit them.', 'Zuva tells you the shortest win after each change.'],
  },
];

const PAINT: { tile: Tile; label: string; color: string }[] = [
  { tile: 'start', label: 'Start', color: '#F7C35C' },
  { tile: 'goal', label: 'Flag', color: '#9BCB6B' },
  { tile: 'wall', label: 'Wall', color: '#2E4A62' },
  { tile: 'coin', label: 'Coin', color: '#F2B544' },
  { tile: 'lava', label: 'Lava', color: '#E2553E' },
  { tile: 'floor', label: 'Eraser', color: '#FFFFFF' },
];

function TileFace({ t, here }: { t: Tile; here?: boolean }) {
  return (
    <span className="relative flex h-full w-full items-center justify-center">
      {t === 'coin' && <span className="h-1/2 w-1/2 rounded-full border-2 border-ink bg-[#F2B544]" />}
      {t === 'goal' && <span className="text-xl font-black">⚑</span>}
      {t === 'lava' && <span className="h-full w-full bg-[repeating-linear-gradient(45deg,#E2553E_0_6px,#F28B82_6px_12px)]" />}
      {here && <span className="absolute h-3/4 w-3/4 rounded-full border-[3px] border-ink bg-[#F7C35C]" aria-label="Zuva" />}
    </span>
  );
}

export default function GameMaker() {
  const { award } = useKidsStars();
  const coach = useCoach('gamemaker');
  const [ci, setCi] = useState(0);
  const C = CHALLENGES[ci]!;
  const rules: Rules = { lavaRestart: false, needAllCoins: false, ...C.rules };
  const [level, setLevel] = useState<Level>(() => blankLevel());
  const [brush, setBrush] = useState<Tile>('start');
  const [mode, setMode] = useState<'build' | 'play'>('build');
  const [game, setGame] = useState<PlayState | null>(null);
  const [msg, setMsg] = useState(C.brief);
  const [won, setWon] = useState<number | null>(null);

  useEffect(() => {
    setMode('build'); setGame(null); setWon(null); setMsg(C.brief);
    coach.level(ci + 1, C.brief, C.hints);
  }, [ci]); // eslint-disable-line react-hooks/exhaustive-deps

  const paint = (i: number) => {
    if (mode !== 'build') return;
    play('tap');
    setLevel((l) => {
      const tiles = [...l.tiles];
      if (brush === 'start' || brush === 'goal') tiles.forEach((t, j) => { if (t === brush) tiles[j] = 'floor'; });
      tiles[i] = brush;
      return { ...l, tiles };
    });
  };

  const best = solve(level, rules);

  const startPlay = () => {
    const problem = C.check(level, rules);
    if (problem) { setMsg(problem); play('wrong'); coach.attempt(false, problem); return; }
    if (best === null) { setMsg('Zuva tested your level: nobody can win it yet! Something blocks the way to a coin or the flag.'); play('wrong'); coach.attempt(false, 'level cannot be won'); return; }
    setGame(newGame(level)); setMode('play');
    setMsg(`Playtest time! The shortest possible win is ${best} moves. Use the arrows or your keyboard.`);
  };

  const move = useCallback((d: Dir) => {
    if (!game || mode !== 'play' || won !== null) return;
    const r = step(level, rules, game, d);
    setGame(r.state);
    if (r.event === 'coin') play('right');
    else if (r.event === 'lava') { play('wrong'); setMsg('Ouch, lava! Back to the start.'); }
    else if (r.event === 'need-coins') setMsg('The flag is locked. Collect every coin first!');
    else if (r.event === 'blocked') play('tap');
    else if (r.event === 'win') {
      const stars = r.state.restarts === 0 && r.state.moves <= (best ?? 0) + 4 ? 3 : r.state.restarts <= 1 ? 2 : 1;
      setWon(stars); award(`gamemaker:${ci + 1}`, stars); coach.attempt(true, `won in ${r.state.moves} moves`); coach.complete(stars);
      play('win'); celebrate('big');
      setMsg(`You designed a game AND beat it in ${r.state.moves} moves! That is what game designers do: build, playtest, improve.`);
    } else play('step');
  }, [game, mode, won, level, rules, best, award, ci, coach]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const d = ({ ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' } as Record<string, Dir>)[e.key];
      if (d && mode === 'play') { e.preventDefault(); move(d); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [move, mode]);

  return (
    <div className="mx-auto max-w-4xl">
      <LevelTabs prefix="gamemaker" count={CHALLENGES.length} current={ci} onPick={setCi} labels={CHALLENGES.map((c) => c.name)} />
      <div className="mb-3 flex items-end gap-3">
        <Zuva size={64} mood={won ? 'wow' : 'happy'} />
        <div className="flex-1"><SpeechBubble>{msg}</SpeechBubble></div>
      </div>
      <div className="mb-3 flex flex-wrap items-center justify-center gap-2 text-sm font-bold">
        <span className="rounded-full bg-white px-3 py-2">Rules:</span>
        <span className="rounded-full bg-white px-3 py-2">Coin → +1 point</span>
        {rules.needAllCoins && <span className="rounded-full bg-[#F7C35C] px-3 py-2">Flag needs all coins</span>}
        {rules.lavaRestart && <span className="rounded-full bg-[#F28B82] px-3 py-2">Lava → back to start</span>}
        {mode === 'build' && <span className={cn('rounded-full px-3 py-2', best === null ? 'bg-ink/10' : 'bg-[#D6EBE8]')}>{best === null ? 'Not winnable yet' : `Shortest win: ${best} moves`}</span>}
        {mode === 'play' && game && <span className="rounded-full bg-[#D6EBE8] px-3 py-2">Coins {game.coins.size}/{count(level, 'coin')} · Moves {game.moves}</span>}
      </div>
      <div className="grid gap-4 md:grid-cols-[1fr_auto]">
        <div className="grid gap-1 rounded-[24px] border-4 border-ink bg-[#D6EBE8] p-2" style={{ gridTemplateColumns: `repeat(${level.w}, minmax(0, 1fr))` }}>
          {level.tiles.map((t, i) => (
            <button
              key={i}
              onClick={() => paint(i)}
              aria-label={`Square ${i + 1}: ${t}`}
              className="aspect-square overflow-hidden rounded-md border-2 border-ink/30"
              style={{ background: t === 'wall' ? '#2E4A62' : t === 'start' && mode === 'build' ? '#F7C35C' : '#fff' }}
            >
              <TileFace t={mode === 'play' && (t === 'start' || game?.coins.has(i)) ? 'floor' : t} here={mode === 'play' && game?.pos === i} />
            </button>
          ))}
        </div>
        {mode === 'build' ? (
          <div className="flex flex-row flex-wrap gap-2 md:flex-col">
            {PAINT.map((p) => (
              <button key={p.tile} onClick={() => setBrush(p.tile)} aria-pressed={brush === p.tile} className={cn('flex min-h-11 items-center gap-2 rounded-full border-4 px-4 py-2 font-bold', brush === p.tile ? 'border-ink' : 'border-transparent bg-white')} style={brush === p.tile ? { background: p.color, color: p.tile === 'wall' ? '#fff' : undefined } : undefined}>
                <span className="h-4 w-4 rounded border-2 border-ink" style={{ background: p.color }} /> {p.label}
              </button>
            ))}
            <button onClick={startPlay} className={`${kidButton} bg-gold`}>Play!</button>
            <button onClick={() => setLevel(blankLevel())} className="min-h-11 rounded-full bg-white px-4 font-bold">Clear</button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <button onClick={() => move('up')} className={`${kidButton} bg-white`} aria-label="Up">↑</button>
            <div className="flex gap-2">
              <button onClick={() => move('left')} className={`${kidButton} bg-white`} aria-label="Left">←</button>
              <button onClick={() => move('down')} className={`${kidButton} bg-white`} aria-label="Down">↓</button>
              <button onClick={() => move('right')} className={`${kidButton} bg-white`} aria-label="Right">→</button>
            </div>
            <button onClick={() => { setMode('build'); setGame(null); setWon(null); setMsg('Back to building. Change anything you like!'); }} className="mt-2 min-h-11 rounded-full bg-white px-4 font-bold">Edit level</button>
          </div>
        )}
      </div>
      {won !== null && (
        <div className="mt-4 flex flex-wrap items-center justify-center gap-4 rounded-[24px] border-4 border-ink bg-white p-4">
          <StarRow n={won} />
          {ci < CHALLENGES.length - 1 && <button onClick={() => setCi(ci + 1)} className={`${kidButton} bg-[#23807F] text-white`}>Next challenge</button>}
        </div>
      )}
    </div>
  );
}
