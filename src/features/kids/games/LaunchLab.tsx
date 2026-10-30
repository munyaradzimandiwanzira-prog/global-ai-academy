import { useEffect, useMemo, useRef, useState } from 'react';
import { useKidsStars } from '../kidsStore';
import { Zuva, SpeechBubble } from '../Zuva';
import { useCoach } from '../coach';
import { play } from '../sfx';
import { celebrate } from '@/lib/celebrate';
import { simulate, describeMiss, type World, type Point } from './engines/physics';
import { LevelTabs, StarRow, kidButton } from './common';

interface LevelDef { name: string; world: World; size: number; maxSpeed: number; intro: string; fact: string; hints: string[] }

const LEVELS: LevelDef[] = [
  {
    name: 'First throw', size: 60, maxSpeed: 30, world: { g: 9.8, target: { x1: 34, x2: 40, y: 0 } },
    intro: 'Throw the mango into the basket! Change the angle and the power, then press Launch.',
    fact: 'On flat ground, 45° throws farthest. Higher or lower angles land closer.',
    hints: ['Look where your mango landed. Was it short or too far?', 'If it was short, add a little power. If it was too far, take some away.', 'Try 45° and change only the power.'],
  },
  {
    name: 'Baobab in the way', size: 60, maxSpeed: 30, world: { g: 9.8, walls: [{ x1: 18, x2: 22, h: 14 }], target: { x1: 40, x2: 46, y: 0 } },
    intro: 'A tall baobab tree is in the way. Throw high enough to go over it.',
    fact: 'A steep angle sends the mango higher, but it needs more power to go as far.',
    hints: ['Hitting the tree? Your mango is flying too low.', 'Try an angle above 55°.', 'With a high angle, add power until it clears the tree.'],
  },
  {
    name: 'Onto the roof', size: 60, maxSpeed: 30, world: { g: 9.8, target: { x1: 38, x2: 46, y: 8 } },
    intro: 'The basket is on a roof 8 metres up. Land the mango on top!',
    fact: 'To land on something high, the mango must still be above it when it gets there.',
    hints: ['Watch the dotted path. Is it above the roof when it reaches the basket?', 'Higher angle or more power will lift the path.', 'Try about 55° and plenty of power.'],
  },
  {
    name: 'Windy day', size: 70, maxSpeed: 30, world: { g: 9.8, wind: -3, target: { x1: 34, x2: 40, y: 0 } },
    intro: 'The wind is blowing towards you. It slows the mango down as it flies.',
    fact: 'Wind pushes on everything that flies. Pilots and athletes plan for it.',
    hints: ['The wind pushes the mango back. You need more power than without wind.', 'A lower angle spends less time in the air, so the wind has less time to push.', 'Try about 35° to 40° with lots of power.'],
  },
  {
    name: 'On the Moon', size: 220, maxSpeed: 18, world: { g: 1.62, target: { x1: 150, x2: 166, y: 0 } },
    intro: 'Now we are on the Moon! Gravity is about one sixth of Earth’s.',
    fact: 'With weaker gravity, things fall slowly, so the same throw flies about six times farther.',
    hints: ['Gravity is weak here, so you need much less power.', 'Start at 45° and small power, then go up a little at a time.', 'Somewhere around 16 to 17 power should do it at 45°.'],
  },
];

const W = 640;
const H = 300;
const GROUND = 260;

export default function LaunchLab() {
  const { award } = useKidsStars();
  const coach = useCoach('launch');
  const [li, setLi] = useState(0);
  const L = LEVELS[li]!;
  const [angle, setAngle] = useState(40);
  const [speed, setSpeed] = useState(15);
  const [tries, setTries] = useState(0);
  const [trails, setTrails] = useState<Point[][]>([]);
  const [flying, setFlying] = useState<Point[] | null>(null);
  const [frame, setFrame] = useState(0);
  const [message, setMessage] = useState(L.intro);
  const [won, setWon] = useState<number | null>(null);
  const raf = useRef(0);

  const sx = W / L.size;
  const sy = sx;
  const px = (p: Point) => 40 + p.x * sx;
  const py = (p: Point) => GROUND - p.y * sy;

  useEffect(() => {
    setTries(0); setTrails([]); setFlying(null); setWon(null); setMessage(L.intro);
    setAngle(40); setSpeed(Math.round(L.maxSpeed / 2));
    coach.level(li + 1, `${L.name}: ${L.intro}`, L.hints);
  }, [li]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  const launch = () => {
    if (flying) return;
    play('tap');
    const { points, outcome } = simulate({ angleDeg: angle, speed }, L.world);
    const n = tries + 1;
    setTries(n);
    setFlying(points);
    let i = 0;
    const tick = () => {
      i += 3;
      setFrame(i);
      if (i < points.length) raf.current = requestAnimationFrame(tick);
      else {
        setFlying(null);
        setTrails((t) => [...t.slice(-3), points]);
        const hit = outcome.kind === 'target';
        coach.attempt(hit, `angle ${angle}°, power ${speed}: ${describeMiss(outcome, L.world.target)}`);
        if (hit) {
          const stars = n <= 2 ? 3 : n <= 5 ? 2 : 1;
          setWon(stars);
          award(`launch:${li + 1}`, stars);
          coach.complete(stars);
          play('win');
          celebrate('big');
          setMessage(`In the basket in ${n} ${n === 1 ? 'throw' : 'throws'}! ${L.fact}`);
        } else {
          play('wrong');
          setMessage(`Your mango ${describeMiss(outcome, L.world.target)}. Change something and try again.`);
        }
      }
    };
    raf.current = requestAnimationFrame(tick);
  };

  const ball = flying ? flying[Math.min(frame, flying.length - 1)]! : null;
  const t = L.world.target;
  const ticks = useMemo(() => Array.from({ length: Math.floor(L.size / (L.size > 100 ? 50 : 10)) + 1 }, (_, i) => i * (L.size > 100 ? 50 : 10)), [L.size]);

  return (
    <div className="mx-auto max-w-4xl">
      <LevelTabs prefix="launch" count={LEVELS.length} current={li} onPick={setLi} labels={LEVELS.map((l) => l.name)} />
      <div className="mb-3 flex items-end gap-3">
        <Zuva size={64} mood={won ? 'wow' : tries > 0 ? 'think' : 'happy'} />
        <div className="flex-1"><SpeechBubble>{message}</SpeechBubble></div>
      </div>

      <div className="overflow-hidden rounded-[24px] border-4 border-ink bg-white">
        <svg viewBox={`0 0 ${W + 60} ${H}`} className="block w-full" role="img" aria-label={`Field ${L.size} metres wide. Basket from ${t.x1} to ${t.x2} metres${t.y ? `, ${t.y} metres up` : ''}.`}>
          <rect width={W + 60} height={H} fill={L.world.g < 5 ? '#1F2A44' : '#E7F3F1'} />
          {L.world.g < 5 && Array.from({ length: 40 }, (_, i) => <circle key={i} cx={(i * 97) % (W + 60)} cy={(i * 53) % 200} r="1.4" fill="#fff" opacity=".7" />)}
          <rect y={GROUND} width={W + 60} height={H - GROUND} fill={L.world.g < 5 ? '#9AA6B2' : '#9BCB6B'} />
          {ticks.map((m) => (
            <g key={m}><line x1={40 + m * sx} x2={40 + m * sx} y1={GROUND} y2={GROUND + 8} stroke="#142B52" strokeWidth="2" /><text x={40 + m * sx} y={GROUND + 24} textAnchor="middle" fontSize="13" fill="#142B52">{m} m</text></g>
          ))}
          {L.world.wind ? <text x={W - 20} y={36} textAnchor="end" fontSize="16" fill="#142B52" fontWeight="700">← wind</text> : null}
          {(L.world.walls ?? []).map((w, i) => (
            <g key={i}>
              <rect x={40 + w.x1 * sx} y={GROUND - w.h * sy} width={(w.x2 - w.x1) * sx} height={w.h * sy} rx="8" fill="#8B5E34" stroke="#142B52" strokeWidth="3" />
              <ellipse cx={40 + ((w.x1 + w.x2) / 2) * sx} cy={GROUND - w.h * sy} rx={34} ry={18} fill="#5B8C3A" stroke="#142B52" strokeWidth="3" />
            </g>
          ))}
          {t.y > 0 && <rect x={40 + (t.x1 - 2) * sx} y={GROUND - t.y * sy} width={(t.x2 - t.x1 + 4) * sx} height={t.y * sy} fill="#D9C7A3" stroke="#142B52" strokeWidth="3" />}
          <path d={`M${40 + t.x1 * sx} ${GROUND - t.y * sy - 18} L${40 + t.x1 * sx + 6} ${GROUND - t.y * sy} H${40 + t.x2 * sx - 6} L${40 + t.x2 * sx} ${GROUND - t.y * sy - 18}`} fill="#B88A2E" stroke="#142B52" strokeWidth="3" strokeLinejoin="round" />
          {trails.map((tr, i) => <polyline key={i} points={tr.map((p) => `${px(p)},${py(p)}`).join(' ')} fill="none" stroke="#142B52" strokeOpacity={0.25 + 0.15 * i} strokeWidth="2" strokeDasharray="4 5" />)}
          <g transform={`translate(40 ${GROUND}) rotate(${-angle})`}>
            <rect x="-6" y="-6" width="52" height="12" rx="6" fill="#C8302B" stroke="#142B52" strokeWidth="3" />
          </g>
          <circle cx="40" cy={GROUND} r="12" fill="#142B52" />
          {ball && <circle cx={px(ball)} cy={py(ball)} r="9" fill="#F7C35C" stroke="#142B52" strokeWidth="3" />}
        </svg>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <label className="block rounded-2xl border-4 border-ink bg-white p-3">
          <span className="flex justify-between text-lg font-bold"><span>Angle</span><span className="tabular">{angle}°</span></span>
          <input type="range" min={5} max={85} value={angle} onChange={(e) => setAngle(+e.target.value)} className="mt-2 w-full accent-[#23807F]" disabled={!!flying} />
        </label>
        <label className="block rounded-2xl border-4 border-ink bg-white p-3">
          <span className="flex justify-between text-lg font-bold"><span>Power</span><span className="tabular">{speed}</span></span>
          <input type="range" min={3} max={L.maxSpeed} value={speed} onChange={(e) => setSpeed(+e.target.value)} className="mt-2 w-full accent-[#C8302B]" disabled={!!flying} />
        </label>
        <button onClick={launch} disabled={!!flying} className={`${kidButton} h-16 bg-gold text-ink`}>Launch!</button>
      </div>
      {won !== null && (
        <div className="mt-4 flex flex-wrap items-center justify-center gap-4 rounded-[24px] border-4 border-ink bg-white p-4">
          <StarRow n={won} />
          {li < LEVELS.length - 1 && <button onClick={() => setLi(li + 1)} className={`${kidButton} bg-[#23807F] text-white`}>Next level</button>}
        </div>
      )}
      <p className="mt-3 text-center text-[15px] text-ink/70">Tries this level: {tries}. Fewer throws earn more stars.</p>
    </div>
  );
}
