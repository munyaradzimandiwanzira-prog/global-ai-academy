import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useKidsStars } from '../kidsStore';
import { Zuva, SpeechBubble } from '../Zuva';
import { useCoach } from '../coach';
import { play } from '../sfx';
import { celebrate } from '@/lib/celebrate';
import { fastest, findLink, linkKey, routeCost, type Link } from './engines/network';
import { LevelTabs, StarRow, kidButton } from './common';
import { cn } from '@/lib/utils';

/** Town positions on the map, plus where each name label sits so nothing overlaps. */
const TOWNS: Record<string, [number, number]> = {
  'Victoria Falls': [60, 62], Hwange: [120, 170], Bulawayo: [210, 320], Gweru: [320, 250], Kwekwe: [372, 185],
  Kadoma: [430, 118], Chinhoyi: [470, 42], Harare: [570, 92], Chitungwiza: [585, 190], Marondera: [665, 132],
  Mutare: [650, 285], Masvingo: [460, 325],
};
const LABEL: Record<string, [number, number, 'start' | 'middle' | 'end']> = {
  'Victoria Falls': [18, -18, 'start'], Hwange: [0, 32, 'middle'], Bulawayo: [0, 32, 'middle'], Gweru: [0, 32, 'middle'], Kwekwe: [-20, 5, 'end'],
  Kadoma: [0, -20, 'middle'], Chinhoyi: [20, 5, 'start'], Harare: [0, -20, 'middle'], Chitungwiza: [20, 5, 'start'], Marondera: [0, -20, 'middle'],
  Mutare: [0, 32, 'middle'], Masvingo: [0, 32, 'middle'],
};

const BASE: Link[] = [
  { a: 'Victoria Falls', b: 'Hwange', ms: 10 }, { a: 'Hwange', b: 'Bulawayo', ms: 18 }, { a: 'Bulawayo', b: 'Gweru', ms: 12 },
  { a: 'Gweru', b: 'Kwekwe', ms: 6 }, { a: 'Kwekwe', b: 'Kadoma', ms: 6 }, { a: 'Kadoma', b: 'Harare', ms: 12 },
  { a: 'Kadoma', b: 'Chinhoyi', ms: 11 }, { a: 'Chinhoyi', b: 'Harare', ms: 9 }, { a: 'Harare', b: 'Chitungwiza', ms: 3 },
  { a: 'Harare', b: 'Marondera', ms: 7 }, { a: 'Marondera', b: 'Mutare', ms: 14 }, { a: 'Gweru', b: 'Masvingo', ms: 15 },
  { a: 'Masvingo', b: 'Bulawayo', ms: 22 }, { a: 'Masvingo', b: 'Mutare', ms: 25 }, { a: 'Chitungwiza', b: 'Masvingo', ms: 24 },
  { a: 'Hwange', b: 'Kwekwe', ms: 30 },
];

interface Level {
  name: string; brief: string; from: string; to?: string; links: Link[]; hints: string[]; fact: string;
  /** Optional DNS step: the child must look up the right address before sending. */
  dns?: { question: string; entries: { name: string; ip: string; town: string }[]; answer: string };
}

const LEVELS: Level[] = [
  {
    name: 'First packet', from: 'Harare', to: 'Bulawayo', links: BASE,
    brief: 'Send a message from Harare to Bulawayo. Tap towns one by one to build the route along the cables. The number on each cable is its delay in milliseconds (ms). Find the fastest way!',
    hints: ['Start at Harare (it glows). Tap a town joined to it by a cable.', 'Add up the numbers on the cables. Smaller total = faster.', 'Going through Kadoma, Kwekwe and Gweru is quick.'],
    fact: 'The internet is millions of routers passing packets along, just like this. Each router picks the next hop.',
  },
  {
    name: 'Cable cut', from: 'Harare', to: 'Bulawayo', links: BASE.map((l) => (linkKey(l.a, l.b) === linkKey('Kwekwe', 'Kadoma') ? { ...l, down: true } : l)),
    brief: 'Oh no, the cable between Kadoma and Kwekwe is broken! Find another fast way from Harare to Bulawayo.',
    hints: ['Broken cables are red. Packets cannot use them.', 'Try going south-east through Chitungwiza and Masvingo.', 'Compare the totals of two different routes before you send.'],
    fact: 'Because there are many paths, the internet keeps working even when a cable breaks. That is called redundancy.',
  },
  {
    name: 'Find the address', from: 'Bulawayo', links: BASE,
    brief: 'Computers don’t use names, they use numbers called IP addresses. Look up the school server in the address book first, then route your packet to its town.',
    dns: {
      question: 'Which address belongs to school.skuru.zw?',
      entries: [
        { name: 'news.zw', ip: '41.79.12.8', town: 'Harare' },
        { name: 'school.skuru.zw', ip: '102.66.7.21', town: 'Mutare' },
        { name: 'falls-tours.zw', ip: '196.4.80.3', town: 'Victoria Falls' },
      ],
      answer: '102.66.7.21',
    },
    hints: ['Read the address book and find school.skuru.zw.', 'The address book also tells you which town that server is in.', 'Now build the fastest route from Bulawayo to that town.'],
    fact: 'The internet’s address book is called DNS. Your phone asks DNS every time you open a website.',
  },
  {
    name: 'Traffic jam', from: 'Victoria Falls', to: 'Mutare', links: BASE.map((l) => (['Gweru~Kwekwe', 'Harare~Kadoma'].includes(linkKey(l.a, l.b)) ? { ...l, ms: l.ms * 5 } : l)),
    brief: 'Lots of people are streaming videos, so some cables are slow today (marked busy). Get from Victoria Falls to Mutare as fast as possible. The fewest hops is not always the fastest!',
    hints: ['Busy cables have big numbers now. Try to avoid them.', 'Going round the busy cables in the middle might be quicker. What about the southern road through Masvingo?', 'Add up every route you try and keep the smallest.'],
    fact: 'Real routers measure delay all the time and change their routes when cables get busy.',
  },
];

export default function PacketPost() {
  const { award } = useKidsStars();
  const coach = useCoach('packets');
  const [li, setLi] = useState(0);
  const L = LEVELS[li]!;
  const [dnsPick, setDnsPick] = useState<string | null>(null);
  const target = L.dns ? L.dns.entries.find((e) => e.ip === L.dns!.answer)!.town : L.to!;
  const dnsDone = !L.dns || dnsPick === L.dns.answer;
  const [route, setRoute] = useState<string[]>([L.from]);
  const [sending, setSending] = useState(false);
  const [hop, setHop] = useState(0);
  const [msg, setMsg] = useState(L.brief);
  const [won, setWon] = useState<number | null>(null);
  const [tries, setTries] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval>>();
  const best = useMemo(() => fastest(L.links, L.from, target), [L, target]);
  const cost = routeCost(L.links, route);

  useEffect(() => {
    setRoute([L.from]); setSending(false); setHop(0); setWon(null); setTries(0); setDnsPick(null); setMsg(L.brief);
    coach.level(li + 1, L.brief, L.hints);
  }, [li]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => clearInterval(timer.current), []);

  const tap = (town: string) => {
    if (sending || won !== null || !dnsDone) return;
    const last = route[route.length - 1]!;
    if (town === last && route.length > 1) { setRoute(route.slice(0, -1)); play('tap'); return; }
    const link = findLink(L.links, last, town);
    if (!link) { play('wrong'); setMsg(`${last} has no cable to ${town}. Pick a town joined to ${last}.`); return; }
    if (link.down) { play('wrong'); setMsg(`That cable is broken. Packets cannot travel on it.`); coach.attempt(false, `tried broken cable ${last}–${town}`); return; }
    if (route.includes(town)) { play('wrong'); setMsg('Your packet already visited that town. Going in circles wastes time!'); return; }
    play('step');
    setRoute([...route, town]);
  };

  const send = () => {
    if (route[route.length - 1] !== target) { setMsg(`Your route must end at ${target}.`); play('wrong'); return; }
    setSending(true); setHop(0);
    let h = 0;
    timer.current = setInterval(() => {
      h += 1; setHop(h); play('step');
      if (h >= route.length - 1) {
        clearInterval(timer.current);
        setSending(false);
        const n = tries + 1;
        setTries(n);
        const optimal = cost === best?.ms;
        coach.attempt(optimal, `route ${route.join(' → ')} took ${cost} ms (fastest is ${best?.ms} ms)`);
        if (optimal) {
          const stars = n === 1 ? 3 : n <= 3 ? 2 : 1;
          setWon(stars); award(`packets:${li + 1}`, stars); coach.complete(stars);
          play('win'); celebrate('big');
          setMsg(`Delivered in ${cost} ms, the fastest possible! ${L.fact}`);
        } else {
          play('right');
          setMsg(`Delivered in ${cost} ms! But there is a faster route (${best?.ms} ms). Tap the last town to undo hops and try again.`);
        }
      }
    }, 450);
  };

  const pos = (t: string) => TOWNS[t]!;
  const packetAt = sending ? route[Math.min(hop, route.length - 1)]! : route[route.length - 1]!;

  return (
    <div className="mx-auto max-w-4xl">
      <LevelTabs prefix="packets" count={LEVELS.length} current={li} onPick={setLi} labels={LEVELS.map((l) => l.name)} />
      <div className="mb-3 flex items-end gap-3">
        <Zuva size={64} mood={won ? 'wow' : 'happy'} />
        <div className="flex-1"><SpeechBubble>{msg}</SpeechBubble></div>
      </div>

      {L.dns && !dnsDone && (
        <div className="mb-4 rounded-[24px] border-4 border-ink bg-white p-4">
          <p className="text-lg font-bold">Address book (DNS): {L.dns.question}</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            {L.dns.entries.map((e) => (
              <button key={e.ip} onClick={() => { setDnsPick(e.ip); if (e.ip === L.dns!.answer) { play('right'); setMsg(`Yes! ${e.name} lives at ${e.ip}, in ${e.town}. Now route your packet from ${L.from} to ${e.town}.`); } else { play('wrong'); coach.attempt(false, `picked ${e.name} in the address book`); setMsg(`${e.ip} belongs to ${e.name}, not the school. Look again.`); } }}
                className={cn('rounded-2xl border-4 p-3 text-left', dnsPick === e.ip ? 'border-ink bg-[#F7C35C]' : 'border-ink/20')}>
                <span className="block font-bold">{e.name}</span>
                <span className="block font-mono">{e.ip}</span>
                <span className="block text-sm text-ink/70">{e.town}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-[24px] border-4 border-ink bg-[#EAF2E3]">
        <svg viewBox="0 0 720 370" className="block w-full" role="img" aria-label={`Network map. Route so far: ${route.join(', ')}.`}>
          {L.links.map((l) => {
            const [x1, y1] = pos(l.a); const [x2, y2] = pos(l.b);
            const inRoute = route.some((t, i) => i > 0 && linkKey(route[i - 1]!, t) === linkKey(l.a, l.b));
            const busy = l.ms > (BASE.find((b) => linkKey(b.a, b.b) === linkKey(l.a, l.b))?.ms ?? l.ms);
            return (
              <g key={linkKey(l.a, l.b)}>
                <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={l.down ? '#E2553E' : inRoute ? '#23807F' : '#142B52'} strokeOpacity={inRoute || l.down ? 1 : 0.35} strokeWidth={inRoute ? 7 : 4} strokeDasharray={l.down ? '8 8' : undefined} strokeLinecap="round" />
                <g transform={`translate(${(x1 + x2) / 2} ${(y1 + y2) / 2})`}>
                  <rect x="-20" y="-12" width="40" height="22" rx="11" fill={l.down ? '#F28B82' : busy ? '#F7C35C' : '#fff'} stroke="#142B52" strokeWidth="2" />
                  <text y="4" textAnchor="middle" fontSize="12" fontWeight="700" fill="#142B52">{l.down ? 'cut' : `${l.ms}`}</text>
                </g>
              </g>
            );
          })}
          {Object.keys(TOWNS).map((t) => {
            const [x, y] = pos(t);
            const isEnd = t === target && dnsDone;
            const inRoute = route.includes(t);
            return (
              <g key={t} onClick={() => tap(t)} role="button" tabIndex={0} aria-label={t} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') tap(t); }} className="cursor-pointer">
                <circle cx={x} cy={y} r="22" fill="transparent" />
                <rect x={x - 14} y={y - 11} width="28" height="22" rx="6" fill={t === L.from ? '#F7C35C' : isEnd ? '#9BCB6B' : inRoute ? '#8FD3D1' : '#fff'} stroke="#142B52" strokeWidth="3" />
                <circle cx={x - 5} cy={y} r="2.5" fill="#142B52" /><circle cx={x + 5} cy={y} r="2.5" fill="#142B52" />
                <text x={x + LABEL[t]![0]} y={y + LABEL[t]![1]} textAnchor={LABEL[t]![2]} fontSize="13" fontWeight="700" fill="#142B52" paintOrder="stroke" stroke="#EAF2E3" strokeWidth="4">{t}</text>
              </g>
            );
          })}
          <motion.g animate={{ x: pos(packetAt)[0] + 24, y: pos(packetAt)[1] - 18 }} transition={{ type: 'spring', stiffness: 120, damping: 14 }}>
            <rect x="-11" y="-8" width="22" height="16" rx="3" fill="#F2B544" stroke="#142B52" strokeWidth="2.5" />
            <path d="M-11 -8 L0 2 L11 -8" fill="none" stroke="#142B52" strokeWidth="2" />
          </motion.g>
        </svg>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
        <span className="rounded-full bg-white px-4 py-2 text-lg font-bold">Route: {route.join(' → ')}</span>
        <span className="rounded-full bg-white px-4 py-2 text-lg font-bold tabular">Total: {cost ?? '—'} ms</span>
        <button onClick={() => setRoute([L.from])} disabled={sending || route.length === 1} className="min-h-11 rounded-full bg-white px-4 font-bold disabled:opacity-40">Start again</button>
        <button onClick={send} disabled={sending || !dnsDone || won !== null} className={`${kidButton} bg-gold`}>Send packet</button>
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
