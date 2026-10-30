import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useKidsStars } from '../kidsStore';
import { Zuva, SpeechBubble } from '../Zuva';
import { useCoach } from '../coach';
import { play } from '../sfx';
import { celebrate } from '@/lib/celebrate';
import { parseTrack, runBot, type Action, type BotStep, type Heading, type RuleSet, type Situation } from './engines/linebot';
import { LevelTabs, StarRow, kidButton } from './common';
import { cn } from '@/lib/utils';

interface Level { name: string; rows: string[]; heading: Heading; situations: Situation[]; brief: string; hints: string[] }

const LEVELS: Level[] = [
  { name: 'Straight line', rows: ['.F.', '.#.', '.#.', '.#.', '.S.'], heading: 0, situations: ['ahead', 'none'], brief: 'Line Bot has light sensors that can see the black line. Tell it what to do when it sees the line straight ahead, then press Go!', hints: ['When the line is ahead, the robot should drive forward.', 'Set "Line ahead" to Forward.', 'When it sees no line, Stop is a safe choice.'] },
  { name: 'One corner', rows: ['....', '.##F', '.#..', '.#..', '.S..'], heading: 0, situations: ['ahead', 'rightOnly', 'none'], brief: 'Now the line turns a corner. What should the robot do when the line is only on its right?', hints: ['Watch where the robot stops. Where is the line from there?', 'When the line is only on the right, turn right.', 'After turning, the line is ahead again, so it drives on.'] },
  { name: 'Zig-zag', rows: ['F#....', '.#....', '.###..', '...#..', '...S..'], heading: 0, situations: ['ahead', 'leftOnly', 'rightOnly', 'none'], brief: 'This line turns left AND right. One set of rules must handle every turn!', hints: ['You need a rule for the line on the left, and one for the line on the right.', 'Line only on the left → turn left.', 'Line only on the right → turn right.'] },
  { name: 'Fork in the road', rows: ['F##.##', '..#.#.', '..###.', '...#..', '...S..'], heading: 0, situations: ['ahead', 'leftOnly', 'rightOnly', 'both', 'none'], brief: 'The line splits into two! The flag is on the left side. What should the robot do when it sees the line on BOTH sides?', hints: ['At the fork, the sensors see line on the left and on the right.', 'The finish flag is to the left, so choose left for "both sides".', 'Keep your corner rules from the last level.'] },
  { name: 'Rock on the road', rows: ['.F..', '.##.', '.W#.', '.##.', '.#..', '.S..'], heading: 0, situations: ['ahead', 'leftOnly', 'rightOnly', 'both', 'none', 'wall'], brief: 'A rock is blocking the line! Robots use a distance sensor to feel things ahead. What should it do when it detects a wall?', hints: ['If it drives into the rock, it crashes. Turn instead!', 'There is a path around the rock on the right.', 'Set "Something ahead" to Turn right. Keep your corner rules.'] },
];

const SIT_LABEL: Record<Situation, string> = { ahead: 'Line ahead', leftOnly: 'Line only on the left', rightOnly: 'Line only on the right', both: 'Line on both sides', none: 'No line at all', wall: 'Something blocking ahead' };
const ACTIONS: { a: Action; label: string }[] = [{ a: 'forward', label: 'Forward' }, { a: 'left', label: 'Turn left' }, { a: 'right', label: 'Turn right' }, { a: 'stop', label: 'Stop' }];
const DEFAULT: RuleSet = { ahead: 'stop', leftOnly: 'stop', rightOnly: 'stop', both: 'stop', none: 'stop', wall: 'stop' };

export default function LineBot() {
  const { award } = useKidsStars();
  const coach = useCoach('linebot');
  const [li, setLi] = useState(0);
  const L = LEVELS[li]!;
  const track = useMemo(() => parseTrack(L.rows, L.heading), [L]);
  const [rules, setRules] = useState<RuleSet>(DEFAULT);
  const [steps, setSteps] = useState<BotStep[]>([]);
  const [at, setAt] = useState(0);
  const [running, setRunning] = useState(false);
  const [runs, setRuns] = useState(0);
  const [msg, setMsg] = useState(L.brief);
  const [won, setWon] = useState<number | null>(null);
  const timer = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    setSteps([]); setAt(0); setRunning(false); setRuns(0); setWon(null); setMsg(L.brief);
    setRules((r) => ({ ...DEFAULT, ...Object.fromEntries(L.situations.filter((s) => li > 0 && s !== 'both' && s !== 'wall').map((s) => [s, r[s]])) }));
    coach.level(li + 1, L.brief, L.hints);
  }, [li]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => clearInterval(timer.current), []);

  const go = () => {
    const result = runBot(track, rules);
    const n = runs + 1;
    setRuns(n);
    setSteps(result.steps); setAt(0); setRunning(true);
    let i = 0;
    timer.current = setInterval(() => {
      i += 1; setAt(i); play('step');
      if (i >= result.steps.length) {
        clearInterval(timer.current); setRunning(false);
        const last = result.steps[result.steps.length - 1];
        coach.attempt(result.kind === 'finish', `${result.kind}${last ? ` when it saw "${SIT_LABEL[last.situation]}"` : ''}`);
        if (result.kind === 'finish') {
          const stars = n === 1 ? 3 : n <= 3 ? 2 : 1;
          setWon(stars); award(`linebot:${li + 1}`, stars); coach.complete(stars); play('win'); celebrate('big');
          setMsg('Line Bot reached the flag! Real robots in warehouses and farms follow lines and sensors exactly like this.');
        } else {
          play('wrong');
          setMsg(
            result.kind === 'crash' ? 'Crash! It drove into the rock. What should it do when something is blocking it?'
              : result.kind === 'lost' ? 'Oops, Line Bot drove off the line. Look at where it left the line: what did its sensors see?'
              : result.kind === 'stopped' ? `Line Bot stopped when it saw "${SIT_LABEL[last!.situation]}". Change that rule.`
              : 'Line Bot is going round in circles! Check your turning rules.',
          );
        }
      }
    }, 380);
  };

  const cur = running || steps.length ? steps[Math.min(at, steps.length - 1)] : undefined;
  const pos = cur ? cur.pos : track.start;
  const hd = cur ? cur.heading : track.heading;
  const C = 56;

  return (
    <div className="mx-auto max-w-5xl">
      <LevelTabs prefix="linebot" count={LEVELS.length} current={li} onPick={setLi} labels={LEVELS.map((l) => l.name)} />
      <div className="mb-3 flex items-end gap-3">
        <Zuva size={64} mood={won ? 'wow' : 'think'} />
        <div className="flex-1"><SpeechBubble>{msg}</SpeechBubble></div>
      </div>
      <div className="grid gap-4 md:grid-cols-[auto_1fr]">
        <div className="justify-self-center rounded-[24px] border-4 border-ink bg-[#F5F0E6] p-3">
          <svg width={track.w * C} height={track.h * C} role="img" aria-label="Track">
            {Array.from({ length: track.w * track.h }, (_, i) => {
              const x = (i % track.w) * C; const y = Math.floor(i / track.w) * C;
              return (
                <g key={i}>
                  <rect x={x} y={y} width={C} height={C} fill="#fff" stroke="#142B5222" />
                  {track.line.has(i) && <rect x={x + C / 2 - 9} y={y + C / 2 - 9} width="18" height="18" fill="#142B52" />}
                  {track.line.has(i) && [-1, 1].map((d) => track.line.has(i + d) && Math.floor((i + d) / track.w) === Math.floor(i / track.w) && <rect key={d} x={d < 0 ? x : x + C / 2} y={y + C / 2 - 9} width={C / 2} height="18" fill="#142B52" />)}
                  {track.line.has(i) && [-track.w, track.w].map((d) => track.line.has(i + d) && <rect key={d} x={x + C / 2 - 9} y={d < 0 ? y : y + C / 2} width="18" height={C / 2} fill="#142B52" />)}
                  {track.walls.has(i) && <ellipse cx={x + C / 2} cy={y + C / 2} rx="22" ry="18" fill="#9AA6B2" stroke="#142B52" strokeWidth="3" />}
                  {i === track.finish && <path d={`M${x + 18} ${y + 46} V${y + 10} L${x + 42} ${y + 18} L${x + 18} ${y + 26}`} fill="#9BCB6B" stroke="#142B52" strokeWidth="3" strokeLinejoin="round" />}
                </g>
              );
            })}
            <motion.g animate={{ x: (pos % track.w) * C + C / 2, y: Math.floor(pos / track.w) * C + C / 2, rotate: hd * 90 }} transition={{ type: 'spring', stiffness: 160, damping: 18 }}>
              <rect x="-17" y="-17" width="34" height="34" rx="8" fill="#F7C35C" stroke="#142B52" strokeWidth="3" />
              <circle cx="-8" cy="-18" r="4" fill="#E2553E" /><circle cx="0" cy="-20" r="4" fill="#E2553E" /><circle cx="8" cy="-18" r="4" fill="#E2553E" />
              <rect x="-22" y="-10" width="6" height="20" rx="2" fill="#142B52" /><rect x="16" y="-10" width="6" height="20" rx="2" fill="#142B52" />
            </motion.g>
          </svg>
        </div>
        <div className="rounded-[24px] border-4 border-ink bg-white p-4">
          <h2 className="text-xl font-extrabold">Robot rules: when the sensors see…</h2>
          <div className="mt-3 space-y-3">
            {L.situations.map((s) => (
              <div key={s} className={cn('rounded-2xl border-2 p-2', cur?.situation === s && running ? 'border-[#23807F] bg-[#D6EBE8]' : 'border-ink/15')}>
                <div className="font-bold">{SIT_LABEL[s]}</div>
                <div className="mt-1 flex flex-wrap gap-2">
                  {ACTIONS.map(({ a, label }) => (
                    <button key={a} onClick={() => { play('tap'); setRules((r) => ({ ...r, [s]: a })); }} disabled={running} aria-pressed={rules[s] === a} className={cn('min-h-11 rounded-full border-2 px-3 font-bold', rules[s] === a ? 'border-ink bg-ink text-white' : 'border-ink/20')}>{label}</button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <button onClick={go} disabled={running || won !== null} className={`${kidButton} mt-4 w-full bg-gold`}>Go!</button>
        </div>
      </div>
      {won !== null && (
        <div className="mt-4 flex flex-wrap items-center justify-center gap-4 rounded-[24px] border-4 border-ink bg-white p-4">
          <StarRow n={won} />
          {li < LEVELS.length - 1 && <button onClick={() => setLi(li + 1)} className={`${kidButton} bg-[#23807F] text-white`}>Next track</button>}
        </div>
      )}
    </div>
  );
}
