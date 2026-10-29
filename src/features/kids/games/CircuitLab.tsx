import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Star, ArrowRight, Sun, Cloud } from '@/components/icons';
import { useKidsStars } from '../kidsStore';
import { Zuva, SpeechBubble } from '../Zuva';
import { play } from '../sfx';
import { celebrate } from '@/lib/celebrate';
import { cn } from '@/lib/utils';

/**
 * Circuit Lab: electricity for kids. Level 1 closes a switch, level 2 sorts conductors from
 * insulators by testing them in the gap, level 3 powers a lamp with a solar panel (as at Hwange).
 */
const INK = '#142B52';

function Circuit({ closed, glow, gapItem, solar, sun }: { closed: boolean; glow: number; gapItem?: { name: string; colour: string } | null; solar?: boolean; sun?: number }) {
  const lit = glow > 0;
  return (
    <svg viewBox="0 0 360 240" className="h-auto w-full max-w-[560px]" role="img" aria-label={lit ? 'The bulb is on' : 'The bulb is off'}>
      {/* wire loop */}
      <path d="M70 60 H290 V180 H70 Z" fill="none" stroke={lit ? '#E0A422' : '#5E5A52'} strokeWidth="8" strokeLinejoin="round" />
      {lit && (
        <motion.path d="M70 60 H290 V180 H70 Z" fill="none" stroke="#FFF2B0" strokeWidth="3" strokeDasharray="6 16" animate={{ strokeDashoffset: [0, -44] }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }} />
      )}
      {/* source: battery or solar panel on the left */}
      {solar ? (
        <g>
          <rect x="22" y="88" width="96" height="64" rx="6" fill="#2F6FB2" stroke={INK} strokeWidth="5" />
          {[0, 1, 2].map((c) => [0, 1].map((r) => <rect key={`${c}${r}`} x={30 + c * 29} y={96 + r * 26} width="24" height="20" fill="#5C93CF" />))}
          <text x="70" y="172" textAnchor="middle" fontSize="13" fontWeight="700" fill={INK}>Solar panel</text>
        </g>
      ) : (
        <g>
          <rect x="40" y="96" width="60" height="48" rx="8" fill="#EEF4F3" stroke={INK} strokeWidth="5" />
          <rect x="46" y="102" width="26" height="36" rx="4" fill="#3A8F4B" />
          <text x="86" y="126" textAnchor="middle" fontSize="18" fontWeight="800" fill={INK}>+</text>
          <text x="70" y="166" textAnchor="middle" fontSize="13" fontWeight="700" fill={INK}>Battery</text>
        </g>
      )}
      {/* bulb on the right */}
      <g transform="translate(290 120)">
        {lit && <motion.circle r="46" fill="#FFE45C" initial={{ opacity: 0 }} animate={{ opacity: [0.25 * glow, 0.45 * glow, 0.25 * glow] }} transition={{ duration: 1.6, repeat: Infinity }} />}
        <circle r="26" fill={lit ? '#FFE45C' : '#D9D6CE'} stroke={INK} strokeWidth="5" />
        <path d="M-9 6 L-4 -6 L0 4 L4 -6 L9 6" fill="none" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
      </g>
      {/* gap or switch on the top wire */}
      <rect x="150" y="44" width="60" height="32" fill="#EEF4F3" />
      {gapItem !== undefined ? (
        gapItem ? (
          <g><rect x="146" y="50" width="68" height="20" rx="8" fill={gapItem.colour} stroke={INK} strokeWidth="3" /><text x="180" y="92" textAnchor="middle" fontSize="13" fontWeight="700" fill={INK}>{gapItem.name}</text></g>
        ) : (
          <text x="180" y="92" textAnchor="middle" fontSize="13" fontWeight="700" fill="#B4472A">Gap: test something here</text>
        )
      ) : (
        <g>
          <circle cx="152" cy="60" r="6" fill={INK} /><circle cx="208" cy="60" r="6" fill={INK} />
          <motion.line x1="152" y1="60" x2="208" y2="60" stroke={INK} strokeWidth="7" strokeLinecap="round" style={{ originX: '152px', originY: '60px' }} animate={{ rotate: closed ? 0 : -32 }} transition={{ type: 'spring', stiffness: 300, damping: 18 }} />
          <text x="180" y="92" textAnchor="middle" fontSize="13" fontWeight="700" fill={INK}>Switch</text>
        </g>
      )}
      {solar && sun !== undefined && <text x="180" y="214" textAnchor="middle" fontSize="13" fontWeight="700" fill={INK}>Power: {Math.round(sun * 100)}%</text>}
    </svg>
  );
}

const MATERIALS = [
  { name: 'Copper wire', colour: '#C8743A', conducts: true },
  { name: 'Plastic ruler', colour: '#7FB3E6', conducts: false },
  { name: 'Coin', colour: '#C9C5BB', conducts: true },
  { name: 'Rubber band', colour: '#B4472A', conducts: false },
  { name: 'Wooden stick', colour: '#A9784B', conducts: false },
  { name: 'Steel nail', colour: '#8A9097', conducts: true },
];

const LEVELS = ['Switch it on', 'Conductor or insulator?', 'Power from the sun'];

export default function CircuitLab() {
  const { stars, award } = useKidsStars();
  const [level, setLevel] = useState(0);
  const [closed, setClosed] = useState(false);
  const [gap, setGap] = useState<(typeof MATERIALS)[number] | null>(null);
  const [answers, setAnswers] = useState<Record<string, boolean>>({});
  const [sun, setSun] = useState(0.2);
  const [l3done, setL3done] = useState(false);

  useEffect(() => { setClosed(false); setGap(null); setAnswers({}); setSun(0.2); setL3done(false); }, [level]);

  const glow = level === 0 ? (closed ? 1 : 0) : level === 1 ? (gap?.conducts ? 1 : 0) : sun >= 0.6 ? sun : 0;
  const sorted = Object.keys(answers).length;
  const allRight = sorted === MATERIALS.length && MATERIALS.every((m) => answers[m.name] === m.conducts);

  useEffect(() => {
    if (level === 0 && closed) { play('right'); celebrate('small'); award('circuit:1', 3); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [closed]);
  useEffect(() => {
    if (level === 1 && allRight) { play('win'); celebrate('big'); award('circuit:2', 3); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allRight]);
  useEffect(() => {
    if (level === 2 && sun >= 0.6 && !l3done) { setL3done(true); play('win'); celebrate('big'); award('circuit:3', 3); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sun]);

  const test = (m: (typeof MATERIALS)[number]) => {
    setGap(m);
    play(m.conducts ? 'right' : 'wrong');
  };
  const classify = (m: (typeof MATERIALS)[number], conducts: boolean) => {
    setAnswers((a) => ({ ...a, [m.name]: conducts }));
    play(conducts === m.conducts ? 'tap' : 'wrong');
  };

  const say = level === 0
    ? closed ? 'The circuit is closed, so electricity can flow all the way round and the bulb lights up!' : 'Electricity needs a complete loop to flow. Tap the switch to close the circuit.'
    : level === 1
      ? allRight ? 'Brilliant! Metals let electricity through: they are conductors. Plastic, rubber and wood stop it: they are insulators.' : 'Put each object in the gap to test it. Does the bulb light? Then sort it: conductor or insulator.'
      : sun >= 0.6 ? 'The sun is strong enough! Hwange Solar Park powers thousands of homes the same way.' : 'Solar panels turn sunlight into electricity. Slide the clouds away to give the panel more sun.';

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex flex-wrap justify-center gap-2">
        {LEVELS.map((t, i) => (
          <button key={t} onClick={() => setLevel(i)} className={cn('flex h-12 items-center gap-1.5 rounded-2xl border-[3px] px-4 font-bold transition-transform active:scale-95', level === i ? 'border-ink bg-ink text-white' : 'border-ink/20 bg-white')}>
            {i + 1}. {t}{stars[`circuit:${i + 1}`] ? <Star className="h-4 w-4 fill-gold text-gold" /> : null}
          </button>
        ))}
      </div>
      <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-end">
        <Zuva size={90} mood={glow ? 'wow' : 'think'} />
        <div className="w-full flex-1"><SpeechBubble>{say}</SpeechBubble></div>
      </div>

      <div className="mt-8 grid items-center gap-8 lg:grid-cols-[1.2fr_1fr]">
        <div className="flex justify-center rounded-[28px] border-4 border-ink bg-white p-4">
          <Circuit closed={closed} glow={glow} gapItem={level === 1 ? gap : undefined} solar={level === 2} sun={level === 2 ? sun : undefined} />
        </div>

        <div>
          {level === 0 && (
            <button onClick={() => { setClosed((c) => !c); play('tap'); }} aria-pressed={closed} className={cn('h-20 w-full rounded-3xl border-4 border-ink text-2xl font-bold transition-transform active:scale-95', closed ? 'bg-[#3A8F4B] text-white' : 'bg-white')}>
              {closed ? 'Switch is ON' : 'Tap to switch ON'}
            </button>
          )}

          {level === 1 && (
            <ul className="space-y-2">
              {MATERIALS.map((m) => (
                <li key={m.name} className={cn('flex flex-wrap items-center gap-2 rounded-2xl border-[3px] bg-white p-2', gap?.name === m.name ? 'border-ink' : 'border-ink/15')}>
                  <button onClick={() => test(m)} className="flex min-h-12 flex-1 items-center gap-3 rounded-xl px-2 text-left font-bold hover:bg-[#EEF4F3]">
                    <span className="h-5 w-10 rounded-md border-2 border-ink" style={{ background: m.colour }} /> {m.name}
                  </button>
                  <button onClick={() => classify(m, true)} className={cn('h-12 rounded-xl px-3 text-sm font-bold', answers[m.name] === true ? (m.conducts ? 'bg-[#3A8F4B] text-white' : 'bg-[#B4472A] text-white') : 'bg-[#D6EBE8]')}>Conductor</button>
                  <button onClick={() => classify(m, false)} className={cn('h-12 rounded-xl px-3 text-sm font-bold', answers[m.name] === false ? (!m.conducts ? 'bg-[#3A8F4B] text-white' : 'bg-[#B4472A] text-white') : 'bg-[#D6EBE8]')}>Insulator</button>
                </li>
              ))}
              <li className="pt-1 text-center font-bold tabular">{MATERIALS.filter((m) => answers[m.name] === m.conducts).length} of {MATERIALS.length} sorted correctly</li>
            </ul>
          )}

          {level === 2 && (
            <div className="rounded-3xl border-4 border-ink bg-white p-6">
              <label htmlFor="sun" className="flex items-center justify-between text-lg font-bold"><Cloud className="h-8 w-8 text-[#8A9097]" /> How sunny is it? <Sun className="h-8 w-8 text-[#F2B544]" /></label>
              <input id="sun" type="range" min={0} max={1} step={0.05} value={sun} onChange={(e) => setSun(Number(e.target.value))} className="mt-4 h-10 w-full accent-[#F2B544]" />
              <p className="mt-3 text-center text-lg">{sun < 0.3 ? 'Cloudy: very little power.' : sun < 0.6 ? 'Getting brighter: almost enough.' : 'Full sun: the lamp is on!'}</p>
            </div>
          )}

          {((level === 0 && closed) || (level === 1 && allRight) || (level === 2 && l3done)) && level < LEVELS.length - 1 && (
            <button onClick={() => setLevel(level + 1)} className="mt-5 flex h-14 items-center gap-2 rounded-2xl bg-ink px-6 text-lg font-bold text-white">Next experiment <ArrowRight className="h-5 w-5" /></button>
          )}
        </div>
      </div>
      <p className="mx-auto mt-8 max-w-xl text-center text-sm text-ink/70">Safety first: these experiments are safe with a small battery. Never put anything into a wall socket.</p>
    </div>
  );
}
