import { useEffect, useRef, useState, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { localize, spokenMatch, typedMatch, type Accent, type Activity, type EslTier } from '@shared/esl';
import { Mic, Volume2, Check, Keyboard } from '@/components/icons';
import { Zuva } from '@/features/kids/Zuva';
import { play } from '@/features/kids/sfx';
import { cn } from '@/lib/utils';
import { hear, micSupported, say, useMic, type Pace } from '../voice';
import { focusRing, helperPill, optionClass } from '../ui';
import { buttonClass } from '@/components/ui/Button';

export interface Answer { item: string; correct: boolean; score?: number | null; ms: number; tries: number; hints: number; input: 'voice' | 'tap' | 'type' | 'grown-up'; heard?: string | null }

export interface GameProps<A extends Activity = Activity> {
  activity: A;
  tier: EslTier;
  accent: Accent;
  /** Words in the game, to help the speech recogniser. */
  context: string[];
  signedIn: boolean;
  onAnswer: (a: Answer) => void;
  onDone: () => void;
}

export const paceFor = (tier: EslTier): Pace => tier;
export const big = (tier: EslTier) => tier === 'early';

const PRAISE: Record<EslTier, string[]> = {
  early: ['Yay! You did it!', 'Wonderful! High five!', 'Super job, superstar!', 'Brilliant! I heard you!'],
  primary: ['Great job!', 'Nice one!', 'Spot on!', 'Excellent work!'],
  secondary: ['Correct.', 'Well done.', 'That’s right.', 'Good.'],
};
const RETRY: Record<EslTier, string[]> = {
  early: ['Let’s try again together!', 'Nearly! Listen to me first.'],
  primary: ['Not quite. Try again!', 'Close! Have another go.'],
  secondary: ['Not quite. Try again.', 'Have another look.'],
};
const pick = <T,>(xs: T[]) => xs[Math.floor(Math.random() * xs.length)]!;

/** Short scripted reactions: cached voice clips, so they cost nothing after the first time. */
export function cheer(tier: EslTier, accent: Accent, ok: boolean) {
  play(ok ? 'right' : 'wrong');
  void say(localize(pick(ok ? PRAISE[tier] : RETRY[tier]), accent), accent, tier);
}

/** Times one item: from when it appears to the answer. */
export function useItemClock(key: unknown) {
  const start = useRef(Date.now());
  useEffect(() => { start.current = Date.now(); }, [key]);
  return () => Date.now() - start.current;
}

export function ZuvaSays({ text, accent, pace, auto = true, children }: { text: string; accent: Accent; pace: Pace; auto?: boolean; children?: ReactNode }) {
  useEffect(() => { if (auto) void say(text, accent, pace); }, [text, accent, pace, auto]);
  return (
    <div className="flex items-start gap-3">
      <Zuva size={pace === 'early' ? 64 : 48} />
      <div className="min-w-0 rounded-md rounded-tl-none bg-card px-4 py-3 text-fg">
        <p className={cn('font-semibold', pace === 'early' ? 'text-xl' : 'text-[17px]')}>{children ?? text}</p>
        <button type="button" onClick={() => void say(text, accent, pace)} className={cn(helperPill, '-ml-3 mt-1')}><Volume2 /> Hear Zuva again</button>
      </div>
    </div>
  );
}

/** A picture card: the emoji straight away, the generated picture when it has loaded. */
export function Picture({ word, emoji, size = 140, label }: { word: string; emoji: string; size?: number; label?: boolean }) {
  const [ok, setOk] = useState(false);
  const [failed, setFailed] = useState(false);
  const src = `/api/esl/image/${encodeURIComponent(word.toLowerCase())}`;
  return (
    <span className="inline-flex flex-col items-center gap-1">
      <span className="relative grid place-items-center overflow-hidden rounded-md bg-gold-100 dark:bg-night-700" style={{ width: size, height: size }}>
        {!ok && <span aria-hidden="true" style={{ fontSize: size * 0.55, lineHeight: 1 }}>{emoji || '·'}</span>}
        {!failed && <img src={src} alt={label ? '' : word} loading="lazy" decoding="async" onLoad={() => setOk(true)} onError={() => setFailed(true)} className={cn('absolute inset-0 h-full w-full object-cover transition-opacity', ok ? 'opacity-100' : 'opacity-0')} />}
      </span>
      {label && <span className="font-bold">{word}</span>}
    </span>
  );
}

export function SoundButton({ text, accent, pace, label = 'Listen' }: { text: string; accent: Accent; pace: Pace; label?: string }) {
  return (
    <button type="button" onClick={() => void say(text, accent, pace)} className={buttonClass({ variant: 'outlined', color: 'action', size: 'lg' })}>
      <Volume2 /> {label}
    </button>
  );
}

/**
 * Say it: record, check against the target, report. Little ones without a microphone can have a
 * grown-up tick "they said it"; older learners can type instead.
 */
export function SpeakCheck({ target, tier, context, onResult }: {
  target: string; tier: EslTier; accent: Accent; context: string[];
  onResult: (r: { ok: boolean; heard: string | null; score: number | null; input: Answer['input'] }) => void;
}) {
  const mic = useMic(tier === 'secondary' ? 9000 : 5000);
  const [heard, setHeard] = useState<string | null>(null);
  const [typing, setTyping] = useState(false);
  const [typed, setTyped] = useState('');
  const canMic = micSupported();
  useEffect(() => { setHeard(null); setTyped(''); }, [target]);

  const go = async () => {
    const blob = await mic.record();
    if (!blob) return;
    try {
      const r = await hear(blob, target, tier, context);
      setHeard(r.heard || '…');
      onResult({ ok: r.ok, heard: r.heard, score: r.score, input: 'voice' });
    } catch (e) {
      mic.setError(e instanceof Error ? e.message : 'Try again.');
    } finally {
      mic.setState('idle');
    }
  };

  const listening = mic.state === 'listening';
  return (
    <div className="flex flex-col items-center gap-3">
      {canMic && !typing && (
        <motion.button
          type="button" onClick={() => (listening ? mic.stop() : void go())} disabled={mic.state === 'checking' || mic.state === 'asking'}
          animate={listening ? { scale: 1 + mic.level * 0.25 } : { scale: 1 }}
          className={cn('grid place-items-center rounded-full font-bold transition-colors disabled:opacity-45', focusRing, big(tier) ? 'h-28 w-28' : 'h-20 w-20', listening ? 'bg-red-700 text-white' : 'bg-gold text-ink-900 hover:bg-gold-600')}
          aria-label={listening ? 'Stop' : `Press and say “${target}”`}
        >
          <Mic className={big(tier) ? 'text-[48px]' : 'text-[36px]'} />
        </motion.button>
      )}
      <p className="min-h-6 text-center text-[15px] font-semibold" role="status">
        {mic.state === 'asking' ? 'Allow the microphone…' : listening ? 'I’m listening…' : mic.state === 'checking' ? 'Checking…' : heard ? <>I heard: “{heard}”</> : canMic && !typing ? (big(tier) ? 'Tap the microphone and talk!' : 'Tap, then speak') : ''}
      </p>
      {mic.error && <p className="text-center text-[15px] font-semibold text-red-700 dark:text-red-300">{mic.error}</p>}
      {(!canMic || mic.error) && tier === 'early' && (
        <button type="button" onClick={() => onResult({ ok: true, heard: null, score: null, input: 'grown-up' })} className={buttonClass({ variant: 'outlined' })}><Check /> Grown-up: they said it</button>
      )}
      {tier !== 'early' && (typing || !canMic || mic.error) ? (
        <form className="flex w-full max-w-sm gap-2" onSubmit={(e) => { e.preventDefault(); if (typed.trim()) { const ok = typedMatch(target, typed) || spokenMatch(target, typed, tier).ok; setHeard(typed); onResult({ ok, heard: typed, score: null, input: 'type' }); } }}>
          <input aria-label="Type your answer" value={typed} onChange={(e) => setTyped(e.target.value)} className="input flex-1" autoCapitalize="none" autoComplete="off" />
          <button className={buttonClass({ color: 'action' })}>Check</button>
        </form>
      ) : tier !== 'early' && canMic ? (
        <button type="button" onClick={() => setTyping(true)} className={helperPill}><Keyboard /> Type instead</button>
      ) : null}
    </div>
  );
}

export function Dots({ n, at, results }: { n: number; at: number; results: (boolean | undefined)[] }) {
  return (
    <ol className="flex justify-center gap-1.5" aria-label={`Question ${Math.min(at + 1, n)} of ${n}`}>
      {Array.from({ length: n }, (_, i) => (
        <li key={i} className={cn('h-2.5 rounded-full transition-[width,background-color] duration-[180ms]', i === at && results[i] === undefined ? 'w-6 bg-gold' : 'w-2.5', results[i] === true ? 'bg-teal' : results[i] === false ? 'bg-red-700' : i !== at && 'bg-fg/20')} />
      ))}
    </ol>
  );
}

/** Option button used by the tap games. */
export function OptionButton({ children, onClick, state, disabled, className }: { children: ReactNode; onClick: () => void; state?: 'right' | 'wrong'; disabled?: boolean; className?: string }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled}
      className={optionClass(state, className)}>
      {children}
    </button>
  );
}
