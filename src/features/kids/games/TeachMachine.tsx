import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useKidsStars } from '../kidsStore';
import { Zuva, SpeechBubble } from '../Zuva';
import { useCoach } from '../coach';
import { play } from '../sfx';
import { celebrate } from '@/lib/celebrate';
import { accuracy, makeFruit, predict, type Example } from './engines/ml';
import { LevelTabs, StarRow, kidButton } from './common';
import { cn } from '@/lib/utils';

type Label = Example['label'];
interface Level { name: string; brief: string; hints: string[]; kind: 'label' | 'fix'; baskets: Example[][]; goal: number; fact: string }

const test = makeFruit(24, 4242);
const LEVELS: Level[] = [
  {
    name: 'Teach it', kind: 'label', goal: 0.8, baskets: [makeFruit(12, 11)],
    brief: 'Help the computer learn which mangoes are ripe! Ripe mangoes are yellow and soft. Look at each mango and tell the computer: ripe or not ripe?',
    hints: ['Look at the colour first: yellow means ripe, green means not ripe.', 'Then the squeeze: soft mangoes are riper.', 'If you label some wrong, the computer learns the wrong thing too.'],
    fact: 'This is machine learning: you give examples with answers, and the computer finds the pattern itself.',
  },
  {
    name: 'Missing examples', kind: 'label', goal: 0.85, baskets: [makeFruit(10, 21, (x) => x < 0.4), makeFruit(10, 1, (x) => x > 0.4)],
    brief: 'This time the first basket only has green mangoes. Teach the computer, test it, and see what happens. Then add the second basket.',
    hints: ['After the first basket, the computer has never seen a yellow mango.', 'An AI can only learn from the examples it gets. Missing examples = mistakes.', 'Add the second basket of yellow mangoes and test again.'],
    fact: 'When training data leaves things out, AI makes unfair mistakes. This is called bias. Good engineers check their data.',
  },
  {
    name: 'Fix the mistakes', kind: 'fix', goal: 0.9, baskets: [makeFruit(20, 6)],
    brief: 'Someone labelled these mangoes in a hurry, and 3 labels are wrong. Find them on the chart and tap them to fix the label.',
    hints: ['Look for a dot that is a different colour from all its neighbours.', 'A green-labelled dot sitting among yellow, soft mangoes is suspicious.', 'Fixing wrong labels makes the computer smarter without adding any new data.'],
    fact: 'Real AI teams spend a lot of time cleaning data. Bad labels teach bad lessons.',
  },
];

const fruitColor = (x: number) => {
  const g = [91, 140, 58];
  const y = [242, 181, 68];
  const c = g.map((v, i) => Math.round(v + (y[i]! - v) * x));
  return `rgb(${c.join(',')})`;
};

function Mango({ e, size = 64 }: { e: Pick<Example, 'x' | 'y'>; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <ellipse cx="32" cy="36" rx={20 + e.y * 6} ry={24 - e.y * 5} fill={fruitColor(e.x)} stroke="#142B52" strokeWidth="3" />
      <path d="M32 12 q4 -8 12 -6" fill="none" stroke="#5B8C3A" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

function Squeeze({ v }: { v: number }) {
  const n = Math.round(v * 4);
  return <span className="inline-flex items-center gap-1 text-sm font-bold">Squeeze: {[0, 1, 2, 3].map((i) => <span key={i} className={cn('h-3 w-5 rounded', i < n ? 'bg-[#F28B82]' : 'bg-ink/15')} />)} {v > 0.6 ? 'soft' : v > 0.3 ? 'medium' : 'hard'}</span>;
}

export default function TeachMachine() {
  const { award } = useKidsStars();
  const coach = useCoach('teachai');
  const [li, setLi] = useState(0);
  const L = LEVELS[li]!;
  const [basket, setBasket] = useState(0);
  const [labelled, setLabelled] = useState<Example[]>([]);
  const [fixData, setFixData] = useState<Example[]>([]);
  const [score, setScore] = useState<number | null>(null);
  const [msg, setMsg] = useState(L.brief);
  const [won, setWon] = useState<number | null>(null);
  const [tests, setTests] = useState(0);

  useEffect(() => {
    setBasket(0); setLabelled([]); setScore(null); setWon(null); setTests(0); setMsg(L.brief);
    if (L.kind === 'fix') {
      const d = L.baskets[0]!.map((e) => ({ ...e }));
      // Flip three examples that are clearly one kind (not borderline), so the mistakes are findable.
      [...d].map((e, i) => ({ i, m: Math.abs(e.x * 0.6 + e.y * 0.4 - 0.5) })).filter((o) => o.m > 0.1).sort((a, b) => a.m - b.m).slice(0, 3).forEach(({ i }) => { d[i] = { ...d[i]!, label: d[i]!.label === 'ripe' ? 'unripe' : 'ripe' }; });
      setFixData(d);
    }
    coach.level(li + 1, L.brief, L.hints);
  }, [li]); // eslint-disable-line react-hooks/exhaustive-deps

  const pool = L.kind === 'label' ? L.baskets.slice(0, basket + 1).flat() : [];
  const next = L.kind === 'label' ? pool[labelled.length] : undefined;
  const train = L.kind === 'fix' ? fixData : labelled;

  const label = (lab: Label) => {
    if (!next) return;
    play('tap');
    setLabelled([...labelled, { x: next.x, y: next.y, label: lab }]);
    setScore(null);
  };

  const runTest = () => {
    const acc = accuracy(train, test);
    const n = tests + 1;
    setTests(n); setScore(acc);
    const pct = Math.round(acc * 100);
    coach.attempt(acc >= L.goal, `tested: ${pct}% correct with ${train.length} examples`);
    const allBaskets = L.kind !== 'label' || basket === L.baskets.length - 1;
    if (acc >= L.goal && allBaskets) {
      const stars = acc >= 0.95 ? 3 : acc >= L.goal + 0.05 ? 2 : 1;
      setWon(stars); award(`teachai:${li + 1}`, stars); coach.complete(stars); play('win'); celebrate('big');
      setMsg(`The computer got ${pct}% of new mangoes right! ${L.fact}`);
    } else if (L.kind === 'label' && basket < L.baskets.length - 1) {
      play('wrong'); setMsg(`Only ${pct}% right. The computer never saw a yellow mango, so it guesses badly. Add the next basket!`);
    } else {
      play('wrong'); setMsg(`${pct}% right. The goal is ${Math.round(L.goal * 100)}%. ${L.kind === 'fix' ? 'Some labels are still wrong.' : 'Check your labels: yellow and soft means ripe.'}`);
    }
  };

  const grid = useMemo(() => {
    if (!train.length) return [];
    const cells: { x: number; y: number; l: Label }[] = [];
    for (let i = 0; i < 16; i++) for (let j = 0; j < 16; j++) {
      const x = (i + 0.5) / 16; const y = (j + 0.5) / 16;
      cells.push({ x, y, l: predict(train, x, y)! });
    }
    return cells;
  }, [train]);

  const P = 300;

  return (
    <div className="mx-auto max-w-5xl">
      <LevelTabs prefix="teachai" count={LEVELS.length} current={li} onPick={setLi} labels={LEVELS.map((l) => l.name)} />
      <div className="mb-3 flex items-end gap-3">
        <Zuva size={64} mood={won ? 'wow' : 'think'} />
        <div className="flex-1"><SpeechBubble>{msg}</SpeechBubble></div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-[24px] border-4 border-ink bg-white p-4">
          {L.kind === 'label' ? (
            next ? (
              <motion.div key={labelled.length} initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center">
                <div className="text-sm font-bold text-ink/60">Mango {labelled.length + 1} of {pool.length}</div>
                <div className="flex justify-center"><Mango e={next} size={140} /></div>
                <Squeeze v={next.y} />
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <button onClick={() => label('ripe')} className={`${kidButton} bg-[#F2B544]`}>Ripe</button>
                  <button onClick={() => label('unripe')} className={`${kidButton} bg-[#9BCB6B]`}>Not ripe</button>
                </div>
              </motion.div>
            ) : (
              <div className="text-center">
                <p className="text-xl font-bold">You taught the computer {labelled.length} mangoes.</p>
                {basket < L.baskets.length - 1 && score !== null && (
                  <button onClick={() => { setBasket(basket + 1); setScore(null); setMsg('Here is a basket of yellow mangoes. Label them too!'); }} className={`${kidButton} mt-3 bg-[#8FD3D1]`}>Add the next basket</button>
                )}
                <button onClick={runTest} disabled={won !== null} className={`${kidButton} mt-3 w-full bg-gold`}>Test on {test.length} new mangoes</button>
              </div>
            )
          ) : (
            <div>
              <p className="font-bold">Tap a dot to change its label. Yellow ring = labelled ripe, green ring = labelled not ripe.</p>
              <button onClick={runTest} disabled={won !== null} className={`${kidButton} mt-3 w-full bg-gold`}>Test on {test.length} new mangoes</button>
            </div>
          )}
          {score !== null && <p className="mt-4 text-center text-3xl font-black tabular">{Math.round(score * 100)}% correct</p>}
        </div>
        <div className="rounded-[24px] border-4 border-ink bg-white p-4">
          <h2 className="text-lg font-extrabold">What the computer has learned</h2>
          <svg viewBox={`-30 0 ${P + 40} ${P + 30}`} className="mt-2 w-full" role="img" aria-label="Chart: colour across, softness up. Shaded areas show what the computer predicts.">
            {grid.map((c, i) => <rect key={i} x={(c.x - 1 / 32) * P} y={P - (c.y + 1 / 32) * P} width={P / 16} height={P / 16} fill={c.l === 'ripe' ? '#F7C35C' : '#9BCB6B'} opacity=".35" />)}
            <rect x="0" y="0" width={P} height={P} fill="none" stroke="#142B52" strokeWidth="3" />
            <text x={P / 2} y={P + 22} textAnchor="middle" fontSize="13" fontWeight="700" fill="#142B52">green → yellow</text>
            <text x="-12" y={P / 2} textAnchor="middle" fontSize="13" fontWeight="700" fill="#142B52" transform={`rotate(-90 -12 ${P / 2})`}>hard → soft</text>
            {train.map((e, i) => (
              <g key={i} onClick={() => { if (L.kind === 'fix' && won === null) { play('tap'); setFixData((d) => d.map((x, j) => (j === i ? { ...x, label: x.label === 'ripe' ? 'unripe' : 'ripe' } : x))); setScore(null); } }} className={L.kind === 'fix' ? 'cursor-pointer' : undefined}>
                <circle cx={e.x * P} cy={P - e.y * P} r="10" fill={fruitColor(e.x)} stroke={e.label === 'ripe' ? '#B88A2E' : '#2F5D3A'} strokeWidth="5" />
              </g>
            ))}
          </svg>
          <p className="text-sm text-ink/70">Yellow areas: the computer says ripe. Green areas: not ripe.</p>
        </div>
      </div>
      {won !== null && (
        <div className="mt-4 flex flex-wrap items-center justify-center gap-4 rounded-[24px] border-4 border-ink bg-white p-4">
          <StarRow n={won} />
          {li < LEVELS.length - 1 && <button onClick={() => setLi(li + 1)} className={`${kidButton} bg-[#23807F] text-white`}>Next level</button>}
        </div>
      )}
    </div>
  );
}
