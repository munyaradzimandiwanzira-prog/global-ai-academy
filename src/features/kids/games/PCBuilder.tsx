import { useEffect, useState } from 'react';
import { useKidsStars } from '../kidsStore';
import { Zuva, SpeechBubble } from '../Zuva';
import { useCoach } from '../coach';
import { play } from '../sfx';
import { celebrate } from '@/lib/celebrate';
import { BOARD, PARTS, part, powerNeeded, powerOn, price, type Build, type Slot } from './engines/pcbuild';
import { LevelTabs, StarRow, kidButton } from './common';
import { cn } from '@/lib/utils';

interface Mission { name: string; brief: string; start?: Build; budget?: number; extra: (b: Build) => string | null; hints: string[] }

const MISSIONS: Mission[] = [
  {
    name: 'Make it turn on',
    brief: 'Build a computer that switches on! Tap parts to put them on the motherboard, then press the power button.',
    extra: () => null,
    hints: ['Every computer needs a processor, a cooler, RAM, storage and a power supply.', 'Check the labels: the board takes AM5 processors and DDR5 memory.', 'Press power: the test tells you what is missing.'],
  },
  {
    name: 'School computer', budget: 350,
    brief: 'A school needs a computer for typing and the internet. It must start up quickly (use an SSD) and cost $350 or less, motherboard included.',
    extra: (b) => (!part(b.storage)?.fast ? 'Teachers want it to start fast. Use an SSD, not a spinning hard disk.' : null),
    hints: ['Typing and the internet do not need a graphics card.', 'Pick the cheaper parts that still work: Ryzen 3, 8 GB, 512 GB SSD, 300 W.', 'Watch the price counter. The motherboard already costs $120.'],
  },
  {
    name: 'Gaming PC', budget: 900,
    brief: 'Build a gaming PC: it needs the gaming graphics card, 16 GB of RAM and an SSD, for $900 or less. Make sure the power supply is strong enough!',
    extra: (b) => (part(b.gpu)?.tier !== 'gaming' ? 'Games need the gaming graphics card.' : (part(b.ram)?.gb ?? 0) < 16 ? 'Games need 16 GB of RAM.' : !part(b.storage)?.fast ? 'Games load slowly from a hard disk. Use an SSD.' : null),
    hints: ['The gaming card uses a lot of power: 220 W.', 'Look at "Power needed". The power supply must give more than that.', 'A 550 W power supply is enough. 300 W is not.'],
  },
  {
    name: 'Fix it!',
    start: { cpu: 'i5', cooler: 'fan', ram: 'ram16old', storage: 'hdd', gpu: 'gpu2', psu: 'psu300' },
    brief: 'Someone built this gaming PC but it will not work properly. Press power to test it, then swap the wrong parts. It also needs an SSD.',
    extra: (b) => (!part(b.storage)?.fast ? 'Still slow: swap the hard disk for an SSD.' : part(b.gpu)?.tier !== 'gaming' ? 'Keep the gaming graphics card.' : null),
    hints: ['Press power first and read what the test says.', 'Tap a part on the board to take it out, then pick a better one.', 'Check the socket (AM5), memory type (DDR5) and power supply size.'],
  },
];

const SLOTS: { slot: Slot; label: string; x: number; y: number; w: number; h: number }[] = [
  { slot: 'cpu', label: 'Processor', x: 120, y: 40, w: 90, h: 80 },
  { slot: 'cooler', label: 'Cooler', x: 230, y: 40, w: 70, h: 80 },
  { slot: 'ram', label: 'RAM', x: 320, y: 30, w: 50, h: 120 },
  { slot: 'storage', label: 'Storage', x: 120, y: 150, w: 130, h: 40 },
  { slot: 'gpu', label: 'Graphics (optional)', x: 60, y: 215, w: 300, h: 50 },
  { slot: 'psu', label: 'Power supply', x: 390, y: 200, w: 110, h: 80 },
];

export default function PCBuilder() {
  const { award } = useKidsStars();
  const coach = useCoach('pcbuilder');
  const [mi, setMi] = useState(0);
  const M = MISSIONS[mi]!;
  const [build, setBuild] = useState<Build>({});
  const [tests, setTests] = useState(0);
  const [msg, setMsg] = useState(M.brief);
  const [problems, setProblems] = useState<string[]>([]);
  const [won, setWon] = useState<number | null>(null);

  useEffect(() => {
    setBuild(M.start ?? {}); setTests(0); setMsg(M.brief); setProblems([]); setWon(null);
    coach.level(mi + 1, M.brief, M.hints);
  }, [mi]); // eslint-disable-line react-hooks/exhaustive-deps

  const put = (id: string) => {
    if (won !== null) return;
    const p = part(id)!;
    play('tap');
    setBuild((b) => ({ ...b, [p.slot]: id }));
    setProblems([]);
  };
  const remove = (slot: Slot) => { if (won === null) { play('tap'); setBuild((b) => { const n = { ...b }; delete n[slot]; return n; }); } };

  const test = () => {
    const n = tests + 1;
    setTests(n);
    const found = powerOn(build);
    if (!found.length && M.budget && price(build) > M.budget) found.push(`It works, but it costs $${price(build)}. The budget is $${M.budget}.`);
    const extra = found.length ? null : M.extra(build);
    if (extra) found.push(extra);
    setProblems(found);
    coach.attempt(found.length === 0, found[0] ?? 'it worked');
    if (found.length) { play('wrong'); setMsg('The test found problems. Read them and fix one at a time.'); return; }
    const stars = n <= 1 ? 3 : n <= 3 ? 2 : 1;
    setWon(stars); award(`pcbuilder:${mi + 1}`, stars); coach.complete(stars); play('win'); celebrate('big');
    setMsg(`It works! The screen lights up. Total cost $${price(build)}, using about ${powerNeeded(build)} W.`);
  };

  return (
    <div className="mx-auto max-w-5xl">
      <LevelTabs prefix="pcbuilder" count={MISSIONS.length} current={mi} onPick={setMi} labels={MISSIONS.map((m) => m.name)} />
      <div className="mb-3 flex items-end gap-3">
        <Zuva size={64} mood={won ? 'wow' : problems.length ? 'oops' : 'happy'} />
        <div className="flex-1"><SpeechBubble>{msg}</SpeechBubble></div>
      </div>
      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <div>
          <div className="overflow-hidden rounded-[24px] border-4 border-ink bg-[#2F5D3A]">
            <svg viewBox="0 0 520 300" className="block w-full" role="img" aria-label={BOARD.name}>
              <path d="M20 20 H500 V290 H20 Z" fill="#3A8F4B" stroke="#142B52" strokeWidth="4" />
              {Array.from({ length: 12 }, (_, i) => <path key={i} d={`M${30 + i * 40} 290 V200`} stroke="#F7C35C" strokeOpacity=".25" strokeWidth="2" />)}
              <text x="30" y="285" fontSize="12" fill="#fff" opacity=".8">AM5 · DDR5</text>
              {SLOTS.map((s) => {
                const p = part(build[s.slot]);
                return (
                  <g key={s.slot} onClick={() => p && remove(s.slot)} className={p ? 'cursor-pointer' : undefined} role={p ? 'button' : undefined} aria-label={p ? `Remove ${p.name}` : `${s.label} slot, empty`}>
                    <rect x={s.x} y={s.y} width={s.w} height={s.h} rx="8" fill={p ? '#F7C35C' : '#ffffff22'} stroke="#142B52" strokeWidth="3" strokeDasharray={p ? undefined : '6 5'} />
                    <foreignObject x={s.x + 4} y={s.y + 4} width={s.w - 8} height={s.h - 8}>
                      <div className={cn('flex h-full items-center justify-center text-center text-[11px] font-bold leading-tight', p ? 'text-[#142B52]' : 'text-white')}>{p ? p.name : s.label}</div>
                    </foreignObject>
                  </g>
                );
              })}
            </svg>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-lg font-bold">
            <span className="rounded-full bg-white px-4 py-2 tabular">Price ${price(build)}{M.budget ? ` / $${M.budget}` : ''}</span>
            <span className="rounded-full bg-white px-4 py-2 tabular">Power needed ~{powerNeeded(build)} W</span>
            <button onClick={test} disabled={won !== null} className={`${kidButton} bg-gold`}>Power on</button>
          </div>
          {problems.length > 0 && (
            <ul className="mt-3 space-y-2" aria-live="polite">
              {problems.map((p) => <li key={p} className="rounded-2xl border-4 border-[#E2553E] bg-white p-3 font-semibold">{p}</li>)}
            </ul>
          )}
        </div>
        <div className="space-y-3">
          {(['cpu', 'cooler', 'ram', 'storage', 'gpu', 'psu'] as Slot[]).map((slot) => (
            <div key={slot} className="rounded-2xl border-4 border-ink/15 bg-white p-2">
              <div className="px-2 text-sm font-bold uppercase tracking-wide text-ink/60">{SLOTS.find((s) => s.slot === slot)!.label}</div>
              <div className="mt-1 flex flex-wrap gap-2">
                {PARTS.filter((p) => p.slot === slot).map((p) => (
                  <button key={p.id} onClick={() => put(p.id)} aria-pressed={build[slot] === p.id} className={cn('min-h-11 rounded-xl border-2 px-3 py-1.5 text-left text-sm font-bold', build[slot] === p.id ? 'border-ink bg-[#F7C35C]' : 'border-ink/20')}>
                    {p.name}<span className="block text-xs font-semibold text-ink/60">${p.price}{p.watts ? ` · ${p.watts} W` : ''}{p.supply ? ` · gives ${p.supply} W` : ''}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      {won !== null && (
        <div className="mt-4 flex flex-wrap items-center justify-center gap-4 rounded-[24px] border-4 border-ink bg-white p-4">
          <StarRow n={won} />
          {mi < MISSIONS.length - 1 && <button onClick={() => setMi(mi + 1)} className={`${kidButton} bg-[#23807F] text-white`}>Next mission</button>}
        </div>
      )}
    </div>
  );
}
