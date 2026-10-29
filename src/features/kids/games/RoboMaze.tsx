import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowUp, RotateCcw, RotateCw, Repeat, Play, Trash2, Star, ChevronLeft, ChevronRight, Undo2 } from '@/components/icons';
import { LEVELS, countBlocks, findCell, simulate, starsFor, type Cmd, type Dir, type Node } from './maze-engine';
import { useKidsStars } from '../kidsStore';
import { Zuva, SpeechBubble } from '../Zuva';
import { MangoArt, TreeTile, RockTile } from '../KidsArt';
import { play } from '../sfx';
import { celebrate } from '@/lib/celebrate';
import { cn } from '@/lib/utils';

const CELL = 64;
let uid = 0;
const newId = () => `n${++uid}`;

const CMD_STYLE: Record<Cmd, { label: string; icon: typeof ArrowUp; bg: string }> = {
  F: { label: 'Forward', icon: ArrowUp, bg: 'bg-[#23807F]' },
  L: { label: 'Turn left', icon: RotateCcw, bg: 'bg-[#7A4FB8]' },
  R: { label: 'Turn right', icon: RotateCw, bg: 'bg-[#3577B8]' },
};

/** Inserts a node into the loop with id `target` (or the root when null). */
function insert(nodes: Node[], target: string | null, node: Node): Node[] {
  if (target === null) return [...nodes, node];
  return nodes.map((n) => (n.kind === 'loop' ? (n.id === target ? { ...n, body: [...n.body, node] } : { ...n, body: insert(n.body, target, node) }) : n));
}
function remove(nodes: Node[], id: string): Node[] {
  return nodes.filter((n) => n.id !== id).map((n) => (n.kind === 'loop' ? { ...n, body: remove(n.body, id) } : n));
}
function setTimes(nodes: Node[], id: string, times: number): Node[] {
  return nodes.map((n) => (n.kind === 'loop' ? (n.id === id ? { ...n, times } : { ...n, body: setTimes(n.body, id, times) }) : n));
}
function removeLast(nodes: Node[], target: string | null): Node[] {
  if (target === null) return nodes.slice(0, -1);
  return nodes.map((n) => (n.kind === 'loop' ? (n.id === target ? { ...n, body: n.body.slice(0, -1) } : { ...n, body: removeLast(n.body, target) }) : n));
}

function ProgramView({ nodes, target, setTarget, onRemove, onTimes, depth = 0 }: { nodes: Node[]; target: string | null; setTarget: (id: string | null) => void; onRemove: (id: string) => void; onTimes: (id: string, t: number) => void; depth?: number }) {
  return (
    <div className="flex flex-wrap gap-2">
      <AnimatePresence initial={false}>
        {nodes.map((n) =>
          n.kind === 'cmd' ? (
            <motion.button layout key={n.id} initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} onClick={() => onRemove(n.id)} title="Tap to remove"
              className={cn('flex h-12 items-center gap-1 rounded-xl px-3 text-white shadow-[0_3px_0_#0003]', CMD_STYLE[n.cmd].bg)}>
              {(() => { const I = CMD_STYLE[n.cmd].icon; return <I className="h-6 w-6" />; })()}
            </motion.button>
          ) : (
            <motion.div layout key={n.id} initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0 }}
              onClick={(e) => { e.stopPropagation(); setTarget(n.id); }}
              className={cn('flex min-h-[60px] min-w-[140px] flex-col gap-2 rounded-2xl border-4 bg-[#E3EEF6] p-2', target === n.id ? 'border-[#D4A64A] ring-4 ring-[#D4A64A]/40' : 'border-[#B88A2E]')}>
              <div className="flex items-center gap-2 text-sm font-bold text-[#2E4A62]">
                <Repeat className="h-4 w-4" /> Repeat
                <select value={n.times} onClick={(e) => e.stopPropagation()} onChange={(e) => onTimes(n.id, Number(e.target.value))} className="rounded-lg border-2 border-[#B88A2E] bg-white px-1 font-bold" aria-label="Repeat times">
                  {[2, 3, 4, 5, 6, 7, 8].map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
                times
                <button onClick={(e) => { e.stopPropagation(); onRemove(n.id); if (target === n.id) setTarget(null); }} className="ml-auto rounded p-1 hover:bg-white/60" aria-label="Delete loop"><Trash2 className="h-4 w-4" /></button>
              </div>
              {n.body.length ? <ProgramView nodes={n.body} target={target} setTarget={setTarget} onRemove={onRemove} onTimes={onTimes} depth={depth + 1} /> : <span className="px-1 text-xs text-[#2E4A62]/70">{target === n.id ? 'Tap blocks to put them in here' : 'Tap me, then add blocks'}</span>}
            </motion.div>
          ),
        )}
      </AnimatePresence>
    </div>
  );
}

export default function RoboMaze() {
  const { stars, award } = useKidsStars();
  const firstUnsolved = LEVELS.findIndex((_, i) => !stars[`maze:${i + 1}`]);
  const [li, setLi] = useState(firstUnsolved === -1 ? 0 : firstUnsolved);
  const level = LEVELS[li]!;
  const [program, setProgram] = useState<Node[]>([]);
  const [target, setTarget] = useState<string | null>(null);
  const [robot, setRobot] = useState<{ r: number; c: number; dir: Dir; rot: number; crashed?: boolean }>(() => ({ ...findCell(level, 'S'), dir: level.dir, rot: level.dir * 90 }));
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState<{ text: string; mood: 'happy' | 'wow' | 'oops' | 'think' }>({ text: level.hint, mood: 'think' });
  const [won, setWon] = useState<number | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    clearTimeout(timer.current);
    setProgram([]);
    setTarget(null);
    setRobot({ ...findCell(level, 'S'), dir: level.dir, rot: level.dir * 90 });
    setMessage({ text: level.hint, mood: 'think' });
    setWon(null);
    setRunning(false);
  }, [li, level]);
  useEffect(() => () => clearTimeout(timer.current), []);

  const add = (node: Node) => {
    if (running) return;
    setProgram((p) => insert(p, target, node));
    if (node.kind === 'loop') setTarget(node.id);
  };

  const reset = () => {
    clearTimeout(timer.current);
    setRunning(false);
    setRobot({ ...findCell(level, 'S'), dir: level.dir, rot: level.dir * 90 });
  };

  const run = () => {
    if (!program.length) return setMessage({ text: 'Add some blocks first! Start with Forward.', mood: 'think' });
    reset();
    setRunning(true);
    const { steps, result } = simulate(level, program);
    let rotation = level.dir * 90;
    let lastDir = level.dir;
    steps.forEach((s, i) => {
      timer.current = setTimeout(() => {
        const diff = (s.dir - lastDir + 4) % 4;
        rotation += diff === 3 ? -90 : diff * 90;
        lastDir = s.dir;
        setRobot({ r: s.pos.r, c: s.pos.c, dir: s.dir, rot: rotation, crashed: s.crashed });
        play(s.crashed ? 'wrong' : 'step');
        if (i === steps.length - 1) {
          setRunning(false);
          if (result === 'won') {
            const n = starsFor(level, program);
            setWon(n);
            award(`maze:${li + 1}`, n);
            celebrate('big');
            play('win');
            setMessage({ text: n === 3 ? 'Perfect! You used the fewest blocks possible!' : `You did it! Can you solve it with only ${level.optimal} blocks for 3 stars?`, mood: 'wow' });
          } else if (result === 'crashed') {
            setMessage({ text: 'Bonk! I bumped into a rock. Check where I turned.', mood: 'oops' });
          }
        }
      }, (i + 1) * 420);
    });
    if (!steps.length || result === 'short') {
      timer.current = setTimeout(() => {
        setRunning(false);
        if (result === 'short') setMessage({ text: 'I stopped before the mango. Add more blocks!', mood: 'think' });
      }, (steps.length + 1) * 420);
    }
  };

  const cols = Math.max(...level.rows.map((r) => r.length));
  const cell = Math.min(CELL, Math.floor(Math.min(520, typeof window !== 'undefined' ? window.innerWidth - 48 : 520) / cols));
  const goal = findCell(level, 'G');

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-4 flex flex-wrap items-center justify-center gap-2 sm:gap-3">
        <button disabled={li === 0} onClick={() => setLi(li - 1)} className="grid h-11 w-11 place-items-center rounded-full bg-white shadow disabled:opacity-30" aria-label="Previous level"><ChevronLeft className="h-5 w-5" /></button>
        <div className="flex flex-wrap justify-center gap-1.5">
          {LEVELS.map((_, i) => (
            <button key={i} onClick={() => setLi(i)} className={cn('flex h-11 w-11 flex-col items-center justify-center gap-1 rounded-xl border-2 text-sm font-bold', i === li ? 'border-ink bg-ink text-white' : 'border-ink/20 bg-white')} aria-label={`Level ${i + 1}, ${stars[`maze:${i + 1}`] ?? 0} of 3 stars`}>
              {i + 1}
              {/* Stars earned, as small gold dots (an indicator, not a control, so no icon glyphs squeezed in). */}
              <span className="flex h-1.5 gap-0.5" aria-hidden="true">{Array.from({ length: stars[`maze:${i + 1}`] ?? 0 }, (_, k) => <span key={k} className="h-1.5 w-1.5 rounded-full bg-gold" />)}</span>
            </button>
          ))}
        </div>
        <button disabled={li === LEVELS.length - 1} onClick={() => setLi(li + 1)} className="grid h-11 w-11 place-items-center rounded-full bg-white shadow disabled:opacity-30" aria-label="Next level"><ChevronRight className="h-5 w-5" /></button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[auto_1fr]">
        <div className="flex flex-col items-center gap-4">
          <div className="relative rounded-3xl border-4 border-ink bg-[#9BC26B] p-3 ">
            <div className="relative" style={{ width: cols * cell, height: level.rows.length * cell }}>
              {level.rows.map((row, r) => row.split('').map((ch, c) => (
                <div key={`${r}-${c}`} className="absolute flex items-center justify-center" style={{ left: c * cell, top: r * cell, width: cell, height: cell }}>
                  {ch === '#' ? ((r + c) % 3 === 0 ? <TreeTile size={cell * 0.85} /> : <RockTile size={cell * 0.8} />) : <div className="h-[88%] w-[88%] rounded-xl bg-[#E9D3A1]" />}
                </div>
              )))}
              <motion.div className="absolute flex items-center justify-center" style={{ left: goal.c * cell, top: goal.r * cell, width: cell, height: cell, fontSize: cell * 0.55 }} animate={{ scale: won ? [1, 1.4, 0] : [1, 1.1, 1] }} transition={{ duration: won ? 0.6 : 1.4, repeat: won ? 0 : Infinity }} aria-label="Mango"><MangoArt size={cell * 0.8} /></motion.div>
              <motion.div className="absolute flex items-center justify-center" animate={{ left: robot.c * cell, top: robot.r * cell, rotate: robot.rot, x: robot.crashed ? [0, -6, 6, -4, 0] : 0 }} transition={{ type: 'spring', stiffness: 220, damping: 20 }} style={{ width: cell, height: cell }}>
                <svg viewBox="0 0 40 40" width={cell * 0.8} height={cell * 0.8} aria-label="Robot">
                  <polygon points="20,2 26,10 14,10" fill="#142B52" />
                  <rect x="7" y="9" width="26" height="24" rx="8" fill="#F7C35C" stroke="#142B52" strokeWidth="2.5" />
                  <circle cx="15" cy="19" r="3" fill="#142B52" /><circle cx="25" cy="19" r="3" fill="#142B52" />
                  <path d="M14 26 Q20 30 26 26" stroke="#142B52" strokeWidth="2" fill="none" strokeLinecap="round" />
                </svg>
              </motion.div>
            </div>
          </div>
          <div className="flex w-full max-w-md items-end gap-2">
            <Zuva size={70} mood={message.mood} />
            <div className="flex-1"><SpeechBubble>{message.text}</SpeechBubble></div>
          </div>
        </div>

        <div className="space-y-4">
          <section className="rounded-3xl border-4 border-ink bg-white p-4">
            <h2 className="mb-3 text-lg font-bold">Blocks <span className="text-sm font-normal text-ink/60">— tap to add {target ? 'into the loop' : ''}</span></h2>
            <div className="flex flex-wrap gap-2">
              {(['F', 'L', 'R'] as Cmd[]).map((c) => {
                const s = CMD_STYLE[c];
                return (
                  <motion.button whileTap={{ scale: 0.9 }} key={c} onClick={() => add({ kind: 'cmd', cmd: c, id: newId() })} className={cn('flex items-center gap-2 rounded-2xl px-4 py-3 text-lg font-bold text-white shadow-[0_4px_0_#0003]', s.bg)}>
                    <s.icon className="h-6 w-6" /> {s.label}
                  </motion.button>
                );
              })}
              {level.loops && (
                <motion.button whileTap={{ scale: 0.9 }} onClick={() => add({ kind: 'loop', times: 3, body: [], id: newId() })} className="flex items-center gap-2 rounded-2xl border-4 border-[#B88A2E] bg-[#E3EEF6] px-4 py-2 text-lg font-bold text-[#2E4A62]">
                  <Repeat className="h-6 w-6" /> Repeat
                </motion.button>
              )}
            </div>
            {target && <button onClick={() => setTarget(null)} className="mt-3 rounded-full bg-[#E3EEF6] px-4 py-1.5 text-sm font-bold text-[#2E4A62]">✓ Done with loop — add blocks after it</button>}
          </section>

          <section className="rounded-3xl border-4 border-ink bg-white p-4" onClick={() => setTarget(null)}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-bold">My program <span className="text-sm font-normal text-ink/60">({countBlocks(program)} blocks · best is {level.optimal})</span></h2>
              <div className="flex gap-1">
                <button onClick={(e) => { e.stopPropagation(); setProgram((p) => removeLast(p, target)); }} className="grid min-h-11 min-w-11 place-items-center rounded-full hover:bg-muted" aria-label="Undo last block"><Undo2 className="h-5 w-5" /></button>
                <button onClick={(e) => { e.stopPropagation(); setProgram([]); setTarget(null); reset(); }} className="grid min-h-11 min-w-11 place-items-center rounded-full hover:bg-muted" aria-label="Clear program"><Trash2 className="h-5 w-5" /></button>
              </div>
            </div>
            <div className="min-h-[72px] rounded-2xl border-2 border-dashed border-ink/20 p-3">
              {program.length ? <ProgramView nodes={program} target={target} setTarget={setTarget} onRemove={(id) => setProgram((p) => remove(p, id))} onTimes={(id, t) => setProgram((p) => setTimes(p, id, t))} /> : <span className="text-ink/50">Your blocks will appear here. Zuva runs them from left to right.</span>}
            </div>
            <div className="mt-4 flex gap-2">
              <motion.button whileTap={{ scale: 0.95 }} onClick={(e) => { e.stopPropagation(); run(); }} disabled={running} className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[#5B8C3A] py-3 text-xl font-bold text-white shadow-[0_5px_0_#3d6126] disabled:opacity-60">
                <Play className="h-6 w-6 fill-current" /> {running ? 'Running…' : 'Run!'}
              </motion.button>
              <button onClick={(e) => { e.stopPropagation(); reset(); }} className="rounded-2xl border-4 border-ink bg-white px-4 font-bold">Reset</button>
            </div>
          </section>

          <AnimatePresence>
            {won !== null && (
              <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0 }} className="rounded-3xl border-4 border-ink bg-[#FFF1C9] p-5 text-center">
                <div className="flex justify-center gap-2">{[1, 2, 3].map((s) => <motion.span key={s} initial={{ scale: 0, rotate: -90 }} animate={{ scale: 1, rotate: 0 }} transition={{ delay: s * 0.2 }}><Star className={cn('h-12 w-12', s <= won ? 'fill-gold text-gold' : 'text-ink/20')} /></motion.span>)}</div>
                <p className="mt-2 text-xl font-bold">Level {li + 1} complete!</p>
                {li < LEVELS.length - 1 ? <button onClick={() => setLi(li + 1)} className="mt-3 rounded-2xl bg-ink px-6 py-3 text-lg font-bold text-white">Next level ➜</button> : <p className="mt-2">You finished every maze! You’re a real coder. 🏆</p>}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
