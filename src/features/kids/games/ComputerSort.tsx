import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useKidsStars } from '../kidsStore';
import { Zuva, SpeechBubble } from '../Zuva';
import { useCoach } from '../coach';
import { play } from '../sfx';
import { celebrate } from '@/lib/celebrate';
import { LevelTabs, StarRow, kidButton } from './common';
import { cn } from '@/lib/utils';

interface Item { name: string; bin: string; why: string }
interface Round { name: string; brief: string; bins: { id: string; label: string; color: string }[]; items: Item[]; order?: boolean; hints: string[] }

const IO = [
  { id: 'in', label: 'Input', color: '#8FD3D1' },
  { id: 'out', label: 'Output', color: '#F7C35C' },
];

const ROUNDS: Round[] = [
  {
    name: 'In or out?', bins: IO,
    brief: 'Input devices put information INTO the computer. Output devices bring it OUT to us. Sort each one!',
    items: [
      { name: 'Keyboard', bin: 'in', why: 'You type letters in.' },
      { name: 'Screen', bin: 'out', why: 'It shows you pictures and words.' },
      { name: 'Microphone', bin: 'in', why: 'It records your voice.' },
      { name: 'Speaker', bin: 'out', why: 'It plays sound to you.' },
      { name: 'Mouse', bin: 'in', why: 'Your clicks and moves go in.' },
      { name: 'Printer', bin: 'out', why: 'It puts your work on paper.' },
      { name: 'Camera', bin: 'in', why: 'It captures pictures.' },
      { name: 'Headphones', bin: 'out', why: 'Sound comes out to your ears.' },
    ],
    hints: ['Ask: does information go into the computer, or come out to me?', 'Things you speak, type or click with are inputs.', 'Things you look at or listen to are outputs.'],
  },
  {
    name: 'Inside the box', bins: [
      { id: 'store', label: 'Storage', color: '#9BCB6B' },
      { id: 'proc', label: 'Processing', color: '#F28B82' },
    ],
    brief: 'Inside the computer, some parts THINK (processing) and some parts REMEMBER (storage). Which is which?',
    items: [
      { name: 'CPU (processor)', bin: 'proc', why: 'It follows instructions: the computer’s brain.' },
      { name: 'SSD drive', bin: 'store', why: 'It keeps files even when the power is off.' },
      { name: 'Memory card', bin: 'store', why: 'Phones and cameras keep photos on it.' },
      { name: 'Graphics chip (GPU)', bin: 'proc', why: 'It does maths to draw pictures, very fast.' },
      { name: 'USB flash drive', bin: 'store', why: 'You carry files on it.' },
      { name: 'RAM', bin: 'store', why: 'Short-term memory: it holds what you are using right now, and forgets when switched off.' },
      { name: 'AI chip (NPU)', bin: 'proc', why: 'Newer phones have a chip that runs AI quickly.' },
    ],
    hints: ['Does it do work (thinking), or keep things (remembering)?', 'Drives and cards keep files: storage.', 'Chips with "processor" or "unit" in the name usually process.'],
  },
  {
    name: 'Tricky ones', bins: [...IO, { id: 'both', label: 'Both!', color: '#C9B6EC' }],
    brief: 'Some devices are input AND output at the same time. Can you spot them?',
    items: [
      { name: 'Touchscreen', bin: 'both', why: 'It shows pictures (out) and feels your finger (in).' },
      { name: 'Webcam', bin: 'in', why: 'It only captures video.' },
      { name: 'Game controller that buzzes', bin: 'both', why: 'Buttons go in, the buzz comes out.' },
      { name: 'Projector', bin: 'out', why: 'It shines pictures onto a wall.' },
      { name: 'Headset with microphone', bin: 'both', why: 'You hear (out) and talk (in).' },
      { name: 'Fingerprint reader', bin: 'in', why: 'It scans your finger.' },
      { name: 'Smart speaker', bin: 'both', why: 'It listens to you and talks back.' },
    ],
    hints: ['Look for devices that you both see/hear AND touch/speak to.', 'A touchscreen shows AND senses.', 'If information goes both ways, choose Both.'],
  },
  {
    name: 'Follow the photo', order: true, bins: [],
    brief: 'You take a photo and send it to a friend. Put the steps in the right order, first to last!',
    items: [
      { name: 'The camera captures light', bin: '1', why: 'Input comes first.' },
      { name: 'The processor squeezes the photo smaller', bin: '2', why: 'Processing turns light into a small file.' },
      { name: 'The photo is saved to storage', bin: '3', why: 'Saved so it is not lost.' },
      { name: 'Wi-Fi sends it over the network', bin: '4', why: 'The network carries it to your friend.' },
      { name: 'Your friend’s screen shows it', bin: '5', why: 'Output at the end!' },
    ],
    hints: ['Every computer job goes: input, then processing, then output.', 'What has to happen before a photo can be saved?', 'Sending happens after it is saved, and your friend sees it last.'],
  },
];

const shuffle = <T,>(a: T[]) => [...a].sort(() => Math.random() - 0.5);

export default function ComputerSort() {
  const { award } = useKidsStars();
  const coach = useCoach('sorting');
  const [ri, setRi] = useState(0);
  const R = ROUNDS[ri]!;
  const [seed, setSeed] = useState(0);
  const deck = useMemo(() => shuffle(R.items), [R, seed]); // eslint-disable-line react-hooks/exhaustive-deps
  const [i, setI] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [msg, setMsg] = useState(R.brief);
  const [placed, setPlaced] = useState<Record<string, string[]>>({});
  const [order, setOrder] = useState<string[]>([]);
  const [won, setWon] = useState<number | null>(null);

  useEffect(() => {
    setI(0); setMistakes(0); setMsg(R.brief); setPlaced({}); setOrder([]); setWon(null); setSeed((s) => s + 1);
    coach.level(ri + 1, R.brief, R.hints);
  }, [ri]); // eslint-disable-line react-hooks/exhaustive-deps

  const finish = (m: number) => {
    const stars = m === 0 ? 3 : m <= 2 ? 2 : 1;
    setWon(stars); award(`sorting:${ri + 1}`, stars); coach.complete(stars); play('win'); celebrate('big');
  };

  const choose = (bin: string) => {
    const item = deck[i]!;
    if (item.bin === bin) {
      play('right'); coach.attempt(true);
      setPlaced((p) => ({ ...p, [bin]: [...(p[bin] ?? []), item.name] }));
      setMsg(`Yes! ${item.name}: ${item.why}`);
      if (i + 1 >= deck.length) finish(mistakes); else setI(i + 1);
    } else {
      play('wrong'); setMistakes((m) => m + 1);
      coach.attempt(false, `put ${item.name} in ${bin}`);
      setMsg(`Not quite. Think again about the ${item.name}.`);
    }
  };

  const pickStep = (name: string) => {
    if (order.includes(name) || won !== null) return;
    const step = R.items.find((x) => x.name === name)!;
    if (Number(step.bin) === order.length + 1) {
      play('right'); const next = [...order, name]; setOrder(next); setMsg(step.why); coach.attempt(true);
      if (next.length === R.items.length) finish(mistakes);
    } else {
      play('wrong'); setMistakes((m) => m + 1); coach.attempt(false, `chose "${name}" as step ${order.length + 1}`);
      setMsg('Not that one yet. What has to happen first?');
    }
  };

  const item = deck[i];

  return (
    <div className="mx-auto max-w-4xl">
      <LevelTabs prefix="sorting" count={ROUNDS.length} current={ri} onPick={setRi} labels={ROUNDS.map((r) => r.name)} />
      <div className="mb-4 flex items-end gap-3">
        <Zuva size={64} mood={won ? 'wow' : 'happy'} />
        <div className="flex-1"><SpeechBubble>{msg}</SpeechBubble></div>
      </div>

      {R.order ? (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            {deck.map((s) => (
              <button key={s.name} onClick={() => pickStep(s.name)} disabled={order.includes(s.name)} className="block w-full rounded-2xl border-4 border-ink bg-white p-4 text-left text-lg font-bold disabled:opacity-30">{s.name}</button>
            ))}
          </div>
          <ol className="space-y-2 rounded-[24px] border-4 border-dashed border-ink/40 bg-white/60 p-3">
            {R.items.map((_, n) => (
              <li key={n} className="flex min-h-14 items-center gap-3 rounded-2xl bg-white p-3 text-lg font-bold">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink text-white">{n + 1}</span>{order[n] ?? ''}
              </li>
            ))}
          </ol>
        </div>
      ) : (
        <>
          <div className="flex min-h-40 items-center justify-center">
            <AnimatePresence mode="wait">
              {item && won === null && (
                <motion.div key={item.name} initial={{ y: -30, opacity: 0, rotate: -4 }} animate={{ y: 0, opacity: 1, rotate: 0 }} exit={{ y: 30, opacity: 0 }} className="rounded-[24px] border-4 border-ink bg-white px-10 py-8 text-center text-3xl font-extrabold">
                  {item.name}
                  <div className="mt-2 text-base font-semibold text-ink/60">{i + 1} of {deck.length}</div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <div className={cn('mt-5 grid gap-3', R.bins.length === 3 ? 'grid-cols-3' : 'grid-cols-2')}>
            {R.bins.map((b) => (
              <button key={b.id} onClick={() => choose(b.id)} disabled={won !== null} className="min-h-28 rounded-[24px] border-4 border-ink p-3 text-left transition-transform active:scale-95" style={{ background: b.color }}>
                <span className="block text-2xl font-extrabold">{b.label}</span>
                <span className="mt-1 block text-sm font-semibold">{(placed[b.id] ?? []).join(', ')}</span>
              </button>
            ))}
          </div>
        </>
      )}
      {won !== null && (
        <div className="mt-4 flex flex-wrap items-center justify-center gap-4 rounded-[24px] border-4 border-ink bg-white p-4">
          <StarRow n={won} /> <span className="font-bold">{mistakes} {mistakes === 1 ? 'mistake' : 'mistakes'}</span>
          {ri < ROUNDS.length - 1 && <button onClick={() => setRi(ri + 1)} className={`${kidButton} bg-[#23807F] text-white`}>Next round</button>}
        </div>
      )}
    </div>
  );
}
