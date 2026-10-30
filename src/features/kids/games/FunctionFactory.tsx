import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useKidsStars } from '../kidsStore';
import { Zuva, SpeechBubble } from '../Zuva';
import { useCoach } from '../coach';
import { play } from '../sfx';
import { celebrate } from '@/lib/celebrate';
import { LevelTabs, StarRow, kidButton } from './common';
import { cn } from '@/lib/utils';

/** A block is one step of a function: "+ 3", "× 2" … */
export interface Block { op: '+' | '-' | '×'; n: number }
export const label = (b: Block) => `${b.op} ${b.n}`;
export const applyBlocks = (bs: Block[], x: number) => bs.reduce((v, b) => (b.op === '+' ? v + b.n : b.op === '-' ? v - b.n : v * b.n), x);
const same = (a: Block[], b: Block[], tests: number[]) => tests.every((t) => applyBlocks(a, t) === applyBlocks(b, t));

interface Level { secret: Block[]; palette: Block[]; examples: number[]; probes: number; hints: string[]; fact: string }

const B = (op: Block['op'], n: number): Block => ({ op, n });
const LEVELS: Level[] = [
  { secret: [B('+', 3)], palette: [B('+', 1), B('+', 2), B('+', 3), B('×', 2)], examples: [1, 4], probes: 3, hints: ['Compare each number going in with the one coming out.', 'How much bigger is the output every time?', 'It adds the same amount each time: 1 → 4, 4 → 7.'], fact: 'A function is a machine: the same input always gives the same output.' },
  { secret: [B('×', 2)], palette: [B('+', 2), B('×', 2), B('×', 3), B('+', 4)], examples: [2, 5], probes: 3, hints: ['Try feeding the machine 0 or 1. Small numbers make the rule easier to see.', 'Does the output grow by the same amount, or does it double?', '5 → 10 and 2 → 4. Is that adding or multiplying?'], fact: 'Doubling is the same as multiplying by 2. Computers double numbers by shifting bits!' },
  { secret: [B('×', 2), B('+', 1)], palette: [B('+', 1), B('+', 2), B('×', 2), B('×', 3)], examples: [1, 3], probes: 4, hints: ['This machine has TWO steps. Feed it 0: what comes out?', 'Feeding 0 shows what gets added, because 0 times anything is 0.', 'It doubles, then adds something.'], fact: 'Programs are just many small steps joined together, like your machine.' },
  { secret: [B('+', 1), B('×', 3)], palette: [B('+', 1), B('×', 3), B('+', 3), B('×', 2)], examples: [0, 2], probes: 4, hints: ['Order matters! "add then multiply" is different from "multiply then add".', 'Try both orders of the same two blocks and test them.', 'Input 0 gives 3. Which order of +1 and ×3 gives 3 from 0?'], fact: 'In maths and code, the order of steps changes the answer. That is why we write brackets.' },
  { secret: [B('×', 3), B('-', 2), B('×', 2)], palette: [B('×', 2), B('×', 3), B('-', 2), B('+', 2), B('-', 1)], examples: [1, 2], probes: 5, hints: ['Three steps this time! Probe with 0 and 1 to see how the output changes.', 'When the input goes up by 1, the output goes up by 6. What two multiplications make 6?', 'Multiply by 3, take away something, then double.'], fact: 'Scientists find hidden rules the same way: test, look for patterns, guess, test again.' },
];

export default function FunctionFactory() {
  const { award } = useKidsStars();
  const coach = useCoach('functions');
  const [li, setLi] = useState(0);
  const L = LEVELS[li]!;
  const [seen, setSeen] = useState<[number, number][]>([]);
  const [probe, setProbe] = useState('');
  const [probesLeft, setProbesLeft] = useState(L.probes);
  const [mine, setMine] = useState<Block[]>([]);
  const [tries, setTries] = useState(0);
  const [msg, setMsg] = useState('');
  const [won, setWon] = useState<number | null>(null);
  const [spin, setSpin] = useState(0);

  useEffect(() => {
    setSeen(L.examples.map((x) => [x, applyBlocks(L.secret, x)])); setProbe(''); setProbesLeft(L.probes); setMine([]); setTries(0); setWon(null);
    setMsg(`This machine has a secret rule with ${L.secret.length} ${L.secret.length === 1 ? 'step' : 'steps'}. Test it with your own numbers, then build a copy from the blocks.`);
    coach.level(li + 1, `Find the machine's secret rule (${L.secret.length} steps) and build it from blocks.`, L.hints);
  }, [li]); // eslint-disable-line react-hooks/exhaustive-deps

  const doProbe = () => {
    const x = Number(probe);
    if (!Number.isInteger(x) || probe.trim() === '' || Math.abs(x) > 1000) { setMsg('Type a whole number between -1000 and 1000.'); return; }
    if (!probesLeft) { setMsg('No tests left. Use what you found to build the machine!'); return; }
    play('step'); setSpin((s) => s + 1);
    setSeen((s) => [...s, [x, applyBlocks(L.secret, x)]]);
    setProbesLeft((p) => p - 1); setProbe('');
  };

  const check = () => {
    const n = tries + 1;
    setTries(n);
    const tests = [-3, 0, 1, 2, 5, 7, 10, 13];
    const ok = mine.length === L.secret.length && same(mine, L.secret, tests);
    coach.attempt(ok, `built [${mine.map(label).join(', ')}]`);
    if (ok) {
      const usedProbes = L.probes - probesLeft;
      const stars = n === 1 && usedProbes <= L.probes - 1 ? 3 : n <= 2 ? 2 : 1;
      setWon(stars); award(`functions:${li + 1}`, stars); coach.complete(stars); play('win'); celebrate('big');
      setMsg(`Your machine matches perfectly! ${L.fact}`);
    } else {
      play('wrong');
      const wrong = tests.find((t) => applyBlocks(mine, t) !== applyBlocks(L.secret, t));
      setMsg(mine.length !== L.secret.length ? `The secret machine has ${L.secret.length} steps. Yours has ${mine.length}.` : `Close! For ${wrong}, your machine makes ${applyBlocks(mine, wrong!)} but the secret one makes ${applyBlocks(L.secret, wrong!)}.`);
    }
  };

  return (
    <div className="mx-auto max-w-4xl">
      <LevelTabs prefix="functions" count={LEVELS.length} current={li} onPick={setLi} />
      <div className="mb-3 flex items-end gap-3">
        <Zuva size={64} mood={won ? 'wow' : 'think'} />
        <div className="flex-1"><SpeechBubble>{msg}</SpeechBubble></div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-[24px] border-4 border-ink bg-white p-4">
          <h2 className="text-xl font-extrabold">The secret machine</h2>
          <div className="mt-3 flex items-center justify-center gap-3">
            <span className="rounded-xl bg-[#8FD3D1] px-3 py-2 font-bold">in</span>
            <motion.div key={spin} animate={{ rotate: [0, 20, -20, 0] }} className="flex h-20 w-28 items-center justify-center rounded-2xl border-4 border-ink bg-[#23807F] text-3xl font-black text-white">?</motion.div>
            <span className="rounded-xl bg-[#F7C35C] px-3 py-2 font-bold">out</span>
          </div>
          <table className="mt-4 w-full text-center text-lg">
            <thead><tr className="text-sm uppercase text-ink/60"><th>In</th><th>Out</th></tr></thead>
            <tbody>{seen.map(([a, b], i) => <tr key={i} className="border-t-2 border-ink/10 font-bold tabular"><td className="py-1">{a}</td><td>{b}</td></tr>)}</tbody>
          </table>
          <form onSubmit={(e) => { e.preventDefault(); doProbe(); }} className="mt-3 flex gap-2">
            <input value={probe} onChange={(e) => setProbe(e.target.value)} inputMode="numeric" aria-label="Number to test" placeholder="Try a number" className="min-h-11 min-w-0 flex-1 rounded-full border-4 border-ink px-4 text-lg font-bold" />
            <button disabled={!probesLeft || won !== null} className={`${kidButton} bg-[#8FD3D1]`}>Test ({probesLeft})</button>
          </form>
        </div>
        <div className="rounded-[24px] border-4 border-ink bg-white p-4">
          <h2 className="text-xl font-extrabold">Your machine</h2>
          <div className="mt-3 flex min-h-16 flex-wrap items-center gap-2 rounded-2xl border-4 border-dashed border-ink/30 p-2">
            <span className="font-bold text-ink/60">in →</span>
            {mine.map((b, i) => (
              <button key={i} onClick={() => setMine(mine.filter((_, j) => j !== i))} aria-label={`Remove ${label(b)}`} className="rounded-xl border-4 border-ink bg-[#F7C35C] px-3 py-1 text-xl font-black">{label(b)}</button>
            ))}
            <span className="font-bold text-ink/60">→ out</span>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {L.palette.map((b, i) => (
              <button key={i} onClick={() => { if (mine.length < 4) { play('tap'); setMine([...mine, b]); } }} disabled={won !== null} className={cn('min-h-11 rounded-xl border-4 border-ink px-4 py-1 text-xl font-black active:scale-95', b.op === '×' ? 'bg-[#C9B6EC]' : 'bg-[#D6EBE8]')}>{label(b)}</button>
            ))}
          </div>
          {mine.length > 0 && <p className="mt-3 text-ink/70">Your machine turns 0 into <b>{applyBlocks(mine, 0)}</b> and 5 into <b>{applyBlocks(mine, 5)}</b>.</p>}
          <button onClick={check} disabled={!mine.length || won !== null} className={`${kidButton} mt-3 w-full bg-gold`}>Check my machine</button>
        </div>
      </div>
      {won !== null && (
        <div className="mt-4 flex flex-wrap items-center justify-center gap-4 rounded-[24px] border-4 border-ink bg-white p-4">
          <StarRow n={won} />
          {li < LEVELS.length - 1 && <button onClick={() => setLi(li + 1)} className={`${kidButton} bg-[#23807F] text-white`}>Next machine</button>}
        </div>
      )}
    </div>
  );
}
