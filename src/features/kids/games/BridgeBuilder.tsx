import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useKidsStars } from '../kidsStore';
import { Zuva, SpeechBubble } from '../Zuva';
import { useCoach } from '../coach';
import { play } from '../sfx';
import { celebrate } from '@/lib/celebrate';
import { beamLength, bridgeCost, checkBridge, makeNodes, BRIDGE_LEVELS, type Beam, type Node } from './engines/bridge';
import { LevelTabs, StarRow, kidButton } from './common';

const S = 60; // pixels per metre
const MAX_LEN = 2.3;
const key = (b: Beam) => [b.a, b.b].sort((p, q) => p - q).join('-');

export default function BridgeBuilder() {
  const { award } = useKidsStars();
  const coach = useCoach('bridge');
  const [li, setLi] = useState(0);
  const L = BRIDGE_LEVELS[li]!;
  const nodes = useMemo(() => makeNodes(L), [L]);
  const [beams, setBeams] = useState<Beam[]>([]);
  const [sel, setSel] = useState<number | null>(null);
  const [msg, setMsg] = useState(L.brief);
  const [state, setState] = useState<'build' | 'driving' | 'sag'>('build');
  const [wobbly, setWobbly] = useState<number[]>([]);
  const [tests, setTests] = useState(0);
  const [won, setWon] = useState<number | null>(null);
  const cost = bridgeCost(nodes, beams, 100);

  useEffect(() => {
    setBeams([]); setSel(null); setMsg(L.brief); setState('build'); setWobbly([]); setTests(0); setWon(null);
    coach.level(li + 1, L.brief, L.hints);
  }, [li]); // eslint-disable-line react-hooks/exhaustive-deps

  const tapNode = (id: number) => {
    if (state !== 'build' || won !== null) return;
    setWobbly([]);
    if (sel === null) { setSel(id); play('tap'); return; }
    if (sel === id) { setSel(null); return; }
    const b = { a: sel, b: id };
    const exists = beams.find((x) => key(x) === key(b));
    if (exists) { setBeams(beams.filter((x) => key(x) !== key(b))); setSel(null); play('tap'); return; }
    if (beamLength(nodes, b) > MAX_LEN) { setMsg('That beam is too long. Steel beams here can be at most about 2 squares long.'); play('wrong'); setSel(id); return; }
    if (nodes[sel]!.anchor && nodes[id]!.anchor) { setMsg('Both of those joints are on solid ground already. Join the bridge instead!'); setSel(null); return; }
    setBeams([...beams, b]); setSel(null); play('step');
  };

  const test = () => {
    const n = tests + 1;
    setTests(n);
    const r = checkBridge(nodes, beams);
    coach.attempt(r.rigid, r.rigid ? `stood up, cost $${cost}` : r.deckConnected ? `${r.wobbly.length || 'some'} joints wobble` : 'the road does not reach both banks');
    if (!r.deckConnected) { setMsg('The road must go all the way across, along the bottom row of joints.'); play('wrong'); return; }
    if (!r.rigid) {
      setWobbly(r.wobbly); setState('sag'); play('wrong');
      setMsg(r.wobbly.length ? 'Creak! The flashing joints can still move. Add beams to make triangles there.' : 'Creak! Part of the bridge can still bend. Look for squares and add a diagonal beam.');
      setTimeout(() => setState('build'), 1400);
      return;
    }
    setState('driving'); play('step');
    setTimeout(() => {
      const stars = cost <= L.budget * 0.8 ? 3 : cost <= L.budget ? 2 : 1;
      setWon(stars); award(`bridge:${li + 1}`, stars); coach.complete(stars); play('win'); celebrate('big');
      setMsg(cost <= L.budget ? `The truck made it! Your bridge cost $${cost}, inside the $${L.budget} budget. Triangles keep their shape, that is why bridges are full of them.` : `The truck made it, but the bridge cost $${cost}, more than the $${L.budget} budget. Can you build it cheaper?`);
    }, 2200);
  };

  const W = (L.gap + 2) * S;
  const X = (x: number) => (x + 1) * S;
  const Y = (y: number) => 200 - y * S;
  const sagged = (n: Node) => (state === 'sag' && !n.anchor ? 18 + (n.y === 0 ? 10 : 0) : 0);

  return (
    <div className="mx-auto max-w-5xl">
      <LevelTabs prefix="bridge" count={BRIDGE_LEVELS.length} current={li} onPick={setLi} labels={BRIDGE_LEVELS.map((l) => l.name)} />
      <div className="mb-3 flex items-end gap-3">
        <Zuva size={64} mood={won ? 'wow' : state === 'sag' ? 'oops' : 'happy'} />
        <div className="flex-1"><SpeechBubble>{msg}</SpeechBubble></div>
      </div>
      <div className="overflow-x-auto rounded-[24px] border-4 border-ink bg-[#E7F3F1]">
        <svg viewBox={`0 0 ${W} 330`} className="block w-full min-w-[560px]" role="img" aria-label={`Bridge over a ${L.gap} metre river with ${beams.length} beams.`}>
          <path d={`M0 ${Y(0)} H${X(0)} V330 H0 Z M${X(L.gap)} ${Y(0)} H${W} V330 H${X(L.gap)} Z`} fill="#B88A2E" stroke="#142B52" strokeWidth="3" />
          <path d={`M${X(0)} 300 Q${W / 2} 280 ${X(L.gap)} 300 V330 H${X(0)} Z`} fill="#2F6FB2" />
          {L.pier && <rect x={X(L.gap / 2) - 18} y={Y(-1.5)} width="36" height={330 - Y(-1.5)} fill="#9AA6B2" stroke="#142B52" strokeWidth="3" />}
          {beams.map((b) => {
            const p = nodes[b.a]!; const q = nodes[b.b]!;
            return <line key={key(b)} x1={X(p.x)} y1={Y(p.y) + sagged(p)} x2={X(q.x)} y2={Y(q.y) + sagged(q)} stroke={p.deck && q.deck ? '#142B52' : '#C8302B'} strokeWidth={p.deck && q.deck ? 9 : 6} strokeLinecap="round" style={{ transition: 'all .4s' }} />;
          })}
          {nodes.map((n) => (
            <g key={n.id} onClick={() => tapNode(n.id)} className="cursor-pointer" role="button" aria-label={`Joint at ${n.x} metres, height ${n.y}${n.anchor ? ', fixed' : ''}`}>
              <circle cx={X(n.x)} cy={Y(n.y) + sagged(n)} r="20" fill="transparent" />
              <motion.circle
                cx={X(n.x)} cy={Y(n.y) + sagged(n)} r={n.anchor ? 10 : 8}
                fill={sel === n.id ? '#F7C35C' : n.anchor ? '#142B52' : wobbly.includes(n.id) ? '#E2553E' : '#fff'}
                stroke="#142B52" strokeWidth="3"
                animate={wobbly.includes(n.id) ? { scale: [1, 1.5, 1] } : { scale: 1 }}
                transition={wobbly.includes(n.id) ? { repeat: Infinity, duration: 0.6 } : undefined}
                style={{ transition: 'cy .4s' }}
              />
            </g>
          ))}
          {state === 'driving' && (
            <motion.g initial={{ x: 0 }} animate={{ x: X(L.gap) + 30 }} transition={{ duration: 2, ease: 'easeInOut' }}>
              <rect x="-10" y={Y(0) - 42} width="58" height="30" rx="5" fill="#F7C35C" stroke="#142B52" strokeWidth="3" />
              <rect x="34" y={Y(0) - 36} width="18" height="14" rx="3" fill="#8FD3D1" stroke="#142B52" strokeWidth="2" />
              <circle cx="4" cy={Y(0) - 8} r="8" fill="#142B52" /><circle cx="38" cy={Y(0) - 8} r="8" fill="#142B52" />
            </motion.g>
          )}
        </svg>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
        <span className="rounded-full bg-white px-4 py-2 text-lg font-bold tabular">Cost ${cost} / ${L.budget}</span>
        <span className="rounded-full bg-white px-4 py-2 text-lg font-bold tabular">{beams.length} beams</span>
        <button onClick={() => { setBeams([]); setWobbly([]); }} disabled={state !== 'build' || won !== null} className="min-h-11 rounded-full bg-white px-4 font-bold disabled:opacity-40">Clear</button>
        <button onClick={test} disabled={state !== 'build' || won !== null || !beams.length} className={`${kidButton} bg-gold`}>Test with truck</button>
      </div>
      {won !== null && (
        <div className="mt-4 flex flex-wrap items-center justify-center gap-4 rounded-[24px] border-4 border-ink bg-white p-4">
          <StarRow n={won} />
          <button onClick={() => { setWon(null); setState('build'); setMsg('Make it cheaper: remove beams that are not needed, then test again.'); }} className="min-h-11 rounded-full bg-white px-4 font-bold">Improve it</button>
          {li < BRIDGE_LEVELS.length - 1 && <button onClick={() => setLi(li + 1)} className={`${kidButton} bg-[#23807F] text-white`}>Next bridge</button>}
        </div>
      )}
    </div>
  );
}
