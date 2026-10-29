import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Delete, Flame, Timer, Trophy } from '@/components/icons';
import { useKidsStars } from '../kidsStore';
import { Zuva, SpeechBubble } from '../Zuva';
import { celebrate } from '@/lib/celebrate';
import { storage, cn } from '@/lib/utils';

type Op = '+' | '−' | '×' | '÷' | 'mix';
interface Q { a: number; b: number; op: Exclude<Op, 'mix'>; answer: number }

const MODES: { op: Op; label: string; color: string }[] = [
  { op: '+', label: 'Adding', color: '#23807F' },
  { op: '−', label: 'Taking away', color: '#7A4FB8' },
  { op: '×', label: 'Times tables', color: '#3577B8' },
  { op: '÷', label: 'Sharing', color: '#B88A2E' },
  { op: 'mix', label: 'Mix it up!', color: '#2E4A62' },
];
const best = storage<Record<string, number>>('gaa:kids:math:best', {});
const DURATION = 60;

const rand = (min: number, max: number) => min + Math.floor(Math.random() * (max - min + 1));

function makeQuestion(op: Op, level: number): Q {
  const o = op === 'mix' ? (['+', '−', '×', '÷'] as const)[rand(0, 3)]! : op;
  const max = [10, 20, 50, 100][level]!;
  const tmax = [5, 10, 12, 15][level]!;
  if (o === '+') { const a = rand(0, max), b = rand(0, max); return { a, b, op: o, answer: a + b }; }
  if (o === '−') { const a = rand(0, max), b = rand(0, a); return { a, b, op: o, answer: a - b }; }
  if (o === '×') { const a = rand(1, tmax), b = rand(1, tmax); return { a, b, op: o, answer: a * b }; }
  const b = rand(1, tmax), answer = rand(1, tmax);
  return { a: b * answer, b, op: o, answer };
}

export default function MathSprint() {
  const { award } = useKidsStars();
  const [mode, setMode] = useState<Op | null>(null);
  const [level, setLevel] = useState(0);
  const [q, setQ] = useState<Q | null>(null);
  const [input, setInput] = useState('');
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [time, setTime] = useState(DURATION);
  const [flash, setFlash] = useState<'right' | 'wrong' | null>(null);
  const [done, setDone] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval>>();
  const key = `${mode}:${level}`;

  const start = (op: Op) => {
    setMode(op);
    setQ(makeQuestion(op, level));
    setScore(0); setStreak(0); setTime(DURATION); setInput(''); setDone(false);
    clearInterval(timer.current);
    timer.current = setInterval(() => setTime((t) => t - 1), 1000);
  };

  useEffect(() => {
    if (time > 0 || !mode || done) return;
    clearInterval(timer.current);
    setDone(true);
    const prev = best.get()[key] ?? 0;
    if (score > prev) best.set({ ...best.get(), [key]: score });
    const starsWon = score >= 25 ? 3 : score >= 15 ? 2 : score >= 5 ? 1 : 0;
    if (starsWon) { award(`math:${key}`, starsWon); celebrate('big'); }
  }, [time, mode, done, score, key, award]);
  useEffect(() => () => clearInterval(timer.current), []);

  const submit = useCallback((value: string) => {
    if (!q || done || value === '') return;
    if (Number(value) === q.answer) {
      const bonus = streak >= 4 ? 2 : 1;
      setScore((s) => s + bonus);
      setStreak((s) => s + 1);
      setFlash('right');
      setQ(makeQuestion(mode!, level));
      setInput('');
    } else {
      setStreak(0);
      setFlash('wrong');
      setInput('');
    }
    setTimeout(() => setFlash(null), 300);
  }, [q, done, streak, mode, level]);

  useEffect(() => {
    if (!q || done) return;
    const onKey = (e: KeyboardEvent) => {
      if (/^\d$/.test(e.key)) setInput((v) => (v.length < 4 ? v + e.key : v));
      else if (e.key === 'Backspace') setInput((v) => v.slice(0, -1));
      else if (e.key === 'Enter') submit(input);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [q, done, input, submit]);

  if (!mode) {
    return (
      <div className="mx-auto max-w-3xl text-center">
        <div className="flex justify-center"><Zuva size={110} /></div>
        <div className="mx-auto mt-2 max-w-md"><SpeechBubble>Solve as many as you can in 60 seconds. Get 5 in a row for double points!</SpeechBubble></div>
        <div className="mt-8 flex justify-center gap-2">
          {['Easy', 'Medium', 'Hard', 'Expert'].map((l, i) => (
            <button key={l} onClick={() => setLevel(i)} className={cn('rounded-full border-2 px-4 py-2 font-bold', level === i ? 'border-ink bg-ink text-white' : 'border-ink/20 bg-white')}>{l}</button>
          ))}
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {MODES.map((m) => (
            <motion.button key={m.op} whileHover={{ y: -4 }} whileTap={{ scale: 0.95 }} onClick={() => start(m.op)} className="rounded-3xl border-4 border-ink bg-white p-5 shadow-[5px_5px_0_#142B52]">
              <div className="text-5xl font-bold" style={{ color: m.color }}>{m.op === 'mix' ? '?' : m.op}</div>
              <div className="mt-2 text-lg font-bold">{m.label}</div>
              <div className="text-sm text-ink/60">Best: {best.get()[`${m.op}:${level}`] ?? 0}</div>
            </motion.button>
          ))}
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="mx-auto max-w-md text-center">
        <Trophy className="mx-auto h-16 w-16 text-gold" />
        <h2 className="mt-3 text-4xl font-bold">{score} points!</h2>
        <p className="mt-2 text-lg">{score >= 25 ? 'Incredible — a maths champion! ⭐⭐⭐' : score >= 15 ? 'Super fast! ⭐⭐' : score >= 5 ? 'Nice work! ⭐' : 'Good practice! Try again to earn a star.'}</p>
        <p className="mt-1 text-ink/60">Your best: {best.get()[key] ?? score}</p>
        <div className="mt-6 flex justify-center gap-3">
          <button onClick={() => start(mode)} className="rounded-2xl bg-[#5B8C3A] px-6 py-3 text-lg font-bold text-white shadow-[0_5px_0_#3d6126]">Play again</button>
          <button onClick={() => setMode(null)} className="rounded-2xl border-4 border-ink bg-white px-6 py-3 text-lg font-bold">Change game</button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md">
      <div className="mb-4 flex items-center justify-between text-xl font-bold">
        <span className={cn('flex items-center gap-1', time <= 10 && 'animate-pulse text-red-600')}><Timer className="h-6 w-6" /> {time}s</span>
        <span className="flex items-center gap-1">{streak >= 4 && <Flame className="h-6 w-6 text-gold-600" />} {score} pts</span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-white"><motion.div className="h-full bg-[#5B8C3A]" animate={{ width: `${(time / DURATION) * 100}%` }} /></div>
      <AnimatePresence mode="wait">
        <motion.div key={`${q?.a}${q?.op}${q?.b}`} initial={{ scale: 0.6, opacity: 0, rotate: -6 }} animate={{ scale: 1, opacity: 1, rotate: 0, x: flash === 'wrong' ? [0, -12, 12, -8, 0] : 0 }} exit={{ scale: 0.6, opacity: 0 }}
          className={cn('mt-6 rounded-3xl border-4 border-ink p-8 text-center shadow-[6px_6px_0_#142B52]', flash === 'right' ? 'bg-[#DFF3D3]' : flash === 'wrong' ? 'bg-[#FDE0DC]' : 'bg-white')}>
          <div className="text-5xl font-bold sm:text-6xl">{q?.a} {q?.op} {q?.b} =</div>
          <div className="mt-4 h-16 rounded-2xl bg-[#EEF4F3] text-5xl font-bold leading-[4rem]">{input || <span className="text-ink/20">?</span>}</div>
        </motion.div>
      </AnimatePresence>
      <div className="mt-5 grid grid-cols-3 gap-2">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
          <button key={d} onClick={() => setInput((v) => (v.length < 4 ? v + d : v))} className="rounded-2xl bg-white py-4 text-3xl font-bold shadow-[0_4px_0_#0002] active:translate-y-0.5">{d}</button>
        ))}
        <button onClick={() => setInput((v) => v.slice(0, -1))} className="flex items-center justify-center rounded-2xl bg-white py-4 shadow-[0_4px_0_#0002]" aria-label="Delete"><Delete className="h-7 w-7" /></button>
        <button onClick={() => setInput((v) => (v.length < 4 ? v + '0' : v))} className="rounded-2xl bg-white py-4 text-3xl font-bold shadow-[0_4px_0_#0002]">0</button>
        <button onClick={() => submit(input)} className="rounded-2xl bg-[#5B8C3A] py-4 text-2xl font-bold text-white shadow-[0_4px_0_#3d6126]">OK</button>
      </div>
    </div>
  );
}
