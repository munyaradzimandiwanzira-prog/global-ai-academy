import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Star } from '@/components/icons';
import { useKidsStars } from '../kidsStore';
import { Zuva, SpeechBubble } from '../Zuva';
import { BulbArt } from '../KidsArt';
import { play } from '../sfx';
import { celebrate } from '@/lib/celebrate';
import { cn } from '@/lib/utils';

const ROUNDS = [
  { bits: 3, targets: [1, 2, 4, 3, 5, 7] },
  { bits: 4, targets: [8, 9, 12, 10, 15, 6] },
  { bits: 5, targets: [16, 20, 25, 31, 18, 27] },
  { bits: 8, targets: [64, 100, 128, 200, 255, 42] },
];

export default function BinaryBulbs() {
  const { stars, award } = useKidsStars();
  const [round, setRound] = useState(0);
  const [qi, setQi] = useState(0);
  const [on, setOn] = useState<boolean[]>([]);
  const [solved, setSolved] = useState(0);
  const cfg = ROUNDS[round]!;
  const target = cfg.targets[qi]!;
  const values = useMemo(() => Array.from({ length: cfg.bits }, (_, i) => 2 ** (cfg.bits - 1 - i)), [cfg.bits]);
  const total = on.reduce((sum, b, i) => sum + (b ? values[i]! : 0), 0);
  const correct = total === target;

  useEffect(() => { setOn(Array(cfg.bits).fill(false)); }, [round, qi, cfg.bits]);
  useEffect(() => {
    if (!correct || !on.some(Boolean)) return;
    celebrate('small');
    play('right');
    const t = setTimeout(() => {
      const nextSolved = solved + 1;
      setSolved(nextSolved);
      if (qi < cfg.targets.length - 1) setQi(qi + 1);
      else {
        award(`binary:${round + 1}`, 3);
        celebrate('big');
      }
    }, 900);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [correct]);

  const finishedRound = qi === cfg.targets.length - 1 && correct;

  return (
    <div className="mx-auto max-w-4xl text-center">
      <div className="mb-5 flex justify-center gap-2">
        {ROUNDS.map((r, i) => (
          <button key={i} onClick={() => { setRound(i); setQi(0); setSolved(0); }} className={cn('rounded-full border-2 px-4 py-2 font-bold', round === i ? 'border-ink bg-ink text-white' : 'border-ink/20 bg-white')}>
            {r.bits} bulbs {stars[`binary:${i + 1}`] ? <Star className="ml-1 inline h-4 w-4 fill-gold text-gold" /> : null}
          </button>
        ))}
      </div>
      <div className="flex items-end justify-center gap-3">
        <Zuva size={70} mood={correct ? 'wow' : 'think'} />
        <div className="max-w-md text-left"><SpeechBubble>Computers count with switches that are ON (1) or OFF (0). Each bulb is worth double the one on its right. Light bulbs that add up to <b>{target}</b>!</SpeechBubble></div>
      </div>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        {values.map((v, i) => (
          <motion.button key={`${round}-${i}`} whileTap={{ scale: 0.9 }} onClick={() => { play('tap'); setOn((o) => o.map((x, k) => (k === i ? !x : x))); }} className="flex w-16 flex-col items-center gap-2 sm:w-20" aria-pressed={on[i]} aria-label={`Bulb worth ${v}`}>
            <motion.div animate={{ scale: on[i] ? 1.1 : 1, rotate: on[i] ? [0, -6, 6, 0] : 0 }} transition={{ type: 'spring', stiffness: 300, damping: 14 }} className="flex h-20 w-16 items-center justify-center sm:h-24 sm:w-20">
              <BulbArt size={76} lit={on[i]} />
            </motion.div>
            <span className="rounded-lg bg-white px-2 py-0.5 text-lg font-bold">{v}</span>
            <span className="font-mono text-2xl font-bold">{on[i] ? 1 : 0}</span>
          </motion.button>
        ))}
      </div>
      <div className="mt-8 inline-flex items-center gap-6 rounded-3xl border-4 border-ink bg-white px-8 py-4 ">
        <div><div className="text-sm text-ink/60">Binary</div><div className="font-mono text-3xl font-bold">{on.map((b) => (b ? 1 : 0)).join('')}</div></div>
        <div className="text-3xl">=</div>
        <div><div className="text-sm text-ink/60">Number</div><div className={cn('text-4xl font-bold', correct ? 'text-[#5B8C3A]' : total > target ? 'text-red-600' : '')}>{total}</div></div>
        <div className="text-3xl">/</div>
        <div><div className="text-sm text-ink/60">Target</div><div className="text-4xl font-bold">{target}</div></div>
      </div>
      <p className="mt-4 text-lg">{correct ? 'Yes! That is it!' : total > target ? 'Too much — switch a big bulb off.' : `Question ${qi + 1} of ${cfg.targets.length}`}</p>
      {finishedRound && round < ROUNDS.length - 1 && <button onClick={() => { setRound(round + 1); setQi(0); }} className="mt-4 rounded-2xl bg-ink px-6 py-3 text-lg font-bold text-white">Next: {ROUNDS[round + 1]!.bits} bulbs →</button>}
      <p className="mx-auto mt-8 max-w-xl text-sm text-ink/60">Fun fact: with 8 bulbs you can make every number from 0 to 255. That group of 8 is called a <b>byte</b>!</p>
    </div>
  );
}
