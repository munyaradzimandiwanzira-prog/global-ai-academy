/**
 * Word-level games: Copy Cat (echo), Say What You See (say), Listen and Tap (pick),
 * Sound It Out (sound), Rhyme Time (rhyme) and Spell It (spell).
 */
import { useEffect, useMemo, useState } from 'react';
import { soundHint, type Activity } from '@shared/esl';
import { Delete, Lightbulb, Volume2 } from '@/components/icons';
import { cn } from '@/lib/utils';
import { say } from '../voice';
import { focusRing, helperPill, optionClass } from '../ui';
import { Dots, OptionButton, Picture, SoundButton, SpeakCheck, ZuvaSays, big, cheer, useItemClock, type GameProps } from './kit';

type Of<K extends Activity['kind']> = GameProps<Extract<Activity, { kind: K }>>;
const MAX_TRIES = 3;

/** Shared item loop: index, tries and hints per item, results for the dots. */
function useItems(n: number, onDone: () => void) {
  const [i, setI] = useState(0);
  const [tries, setTries] = useState(1);
  const [hints, setHints] = useState(0);
  const [results, setResults] = useState<(boolean | undefined)[]>([]);
  const next = (ok: boolean) => {
    setResults((r) => { const c = [...r]; c[i] = ok; return c; });
    setTimeout(() => {
      if (i + 1 >= n) onDone();
      else { setI(i + 1); setTries(1); setHints(0); }
    }, ok ? 900 : 1600);
  };
  return { i, tries, setTries, hints, setHints, results, next };
}

// ── Copy Cat ───────────────────────────────────────────────────────────────

export function Echo({ activity, tier, accent, context, onAnswer, onDone }: Of<'echo'>) {
  const s = useItems(activity.items.length, onDone);
  const item = activity.items[s.i]!;
  const clock = useItemClock(s.i);
  return (
    <div className="space-y-6 text-center">
      <Dots n={activity.items.length} at={s.i} results={s.results} />
      <ZuvaSays text={item.text} accent={accent} pace={tier === 'secondary' ? 'secondary' : tier}>
        <span className={cn(big(tier) ? 'text-3xl' : 'text-2xl')}>{item.emoji} {item.text}</span>
      </ZuvaSays>
      <p className="font-bold">{tier === 'secondary' ? 'Now read it aloud with the same rhythm.' : 'Your turn! Say it like me.'}</p>
      <SpeakCheck key={s.i} target={item.text} tier={tier} accent={accent} context={context} onResult={(r) => {
        if (r.ok || s.tries >= MAX_TRIES) {
          cheer(tier, accent, r.ok);
          onAnswer({ item: item.text, correct: r.ok, score: r.score, ms: clock(), tries: s.tries, hints: s.hints, input: r.input, heard: r.heard });
          s.next(r.ok);
        } else { s.setTries(s.tries + 1); cheer(tier, accent, false); setTimeout(() => void say(item.text, accent, tier === 'secondary' ? 'secondary' : 'word'), 1400); }
      }} />
    </div>
  );
}

// ── Say What You See ───────────────────────────────────────────────────────

export function SayIt({ activity, tier, accent, context, onAnswer, onDone }: Of<'say'>) {
  const s = useItems(activity.items.length, onDone);
  const item = activity.items[s.i]!;
  const clock = useItemClock(s.i);
  const [shown, setShown] = useState(false);
  useEffect(() => setShown(false), [s.i]);
  const hint = () => {
    s.setHints(s.hints + 1);
    if (s.hints === 0) void say(`It starts with ${soundHint(item.word[0]!.toLowerCase()).split(',')[0]}… ${item.word[0]}…`, accent, 'word');
    else { setShown(true); void say(item.word, accent, 'word'); }
  };
  return (
    <div className="space-y-5 text-center">
      <Dots n={activity.items.length} at={s.i} results={s.results} />
      <p className={cn('font-bold', big(tier) ? 'text-2xl' : 'text-lg')}>What is this?</p>
      <div className="flex justify-center"><Picture word={item.word} emoji={item.emoji} size={big(tier) ? 200 : 160} /></div>
      {shown && <p className="text-2xl font-bold">{item.word}</p>}
      <SpeakCheck key={s.i} target={item.word} tier={tier} accent={accent} context={context} onResult={(r) => {
        if (r.ok || s.tries >= MAX_TRIES) {
          cheer(tier, accent, r.ok);
          if (!r.ok) { setShown(true); setTimeout(() => void say(item.word, accent, 'word'), 1200); }
          onAnswer({ item: item.word, correct: r.ok, score: r.score, ms: clock(), tries: s.tries, hints: s.hints, input: r.input, heard: r.heard });
          s.next(r.ok);
        } else { s.setTries(s.tries + 1); cheer(tier, accent, false); }
      }} />
      <button type="button" onClick={hint} className={helperPill}><Lightbulb /> {s.hints ? 'Say it for me' : 'Give me a clue'}</button>
    </div>
  );
}

// ── Listen and Tap / Rhyme Time ──────────────────────────────────────────────

function PictureChoice({ prompt, target, answer, options, tier, accent, labels, onPick }: {
  prompt: string; target: string; answer: string; options: { word: string; emoji: string }[]; tier: Of<'pick'>['tier']; accent: Of<'pick'>['accent'];
  labels: boolean; onPick: (word: string, ok: boolean) => 'retry' | 'done';
}) {
  const [state, setState] = useState<Record<string, 'right' | 'wrong'>>({});
  useEffect(() => { setState({}); void say(target, accent, 'word'); }, [target, accent]);
  return (
    <div className="space-y-5 text-center">
      <p className={cn('font-bold', big(tier) ? 'text-2xl' : 'text-lg')}>{prompt}</p>
      <SoundButton text={target} accent={accent} pace="word" label="Hear it again" />
      <div className={cn('mx-auto grid max-w-xl gap-3', options.length === 3 ? 'grid-cols-3' : 'grid-cols-2')}>
        {options.map((o) => (
          <OptionButton key={o.word} state={state[o.word]} disabled={Object.values(state).includes('right')} onClick={() => {
            const ok = o.word.toLowerCase() === answer.toLowerCase();
            setState((s) => ({ ...s, [o.word]: ok ? 'right' : 'wrong' }));
            const r = onPick(o.word, ok);
            if (r === 'done' && !ok) setState((s) => ({ ...s, [answer]: 'right' }));
          }} className="flex-col py-3">
            <Picture word={o.word} emoji={o.emoji} size={big(tier) ? 120 : 96} label={labels || !!state[o.word]} />
          </OptionButton>
        ))}
      </div>
    </div>
  );
}

export function Pick({ activity, tier, accent, onAnswer, onDone }: Of<'pick'>) {
  const s = useItems(activity.items.length, onDone);
  const item = activity.items[s.i]!;
  const clock = useItemClock(s.i);
  return (
    <div className="space-y-4">
      <Dots n={activity.items.length} at={s.i} results={s.results} />
      <PictureChoice prompt={tier === 'early' ? 'Tap the one I say!' : 'Listen. Which picture is it?'} target={item.word} answer={item.word} options={item.options} tier={tier} accent={accent} labels={tier === 'secondary'}
        onPick={(_w, ok) => {
          cheer(tier, accent, ok);
          if (ok || s.tries >= MAX_TRIES - 1) { onAnswer({ item: item.word, correct: ok, ms: clock(), tries: s.tries, hints: 0, input: 'tap' }); s.next(ok); return 'done'; }
          s.setTries(s.tries + 1); return 'retry';
        }} />
    </div>
  );
}

export function Rhyme({ activity, tier, accent, onAnswer, onDone }: Of<'rhyme'>) {
  const s = useItems(activity.items.length, onDone);
  const item = activity.items[s.i]!;
  const clock = useItemClock(s.i);
  return (
    <div className="space-y-4">
      <Dots n={activity.items.length} at={s.i} results={s.results} />
      <div className="flex justify-center"><Picture word={item.word} emoji={item.emoji} size={110} label /></div>
      <PictureChoice prompt={`What rhymes with “${item.word}”?`} target={item.word} answer={item.answer} options={item.options} tier={tier} accent={accent} labels
        onPick={(_w, ok) => {
          cheer(tier, accent, ok);
          if (ok) setTimeout(() => void say(`${item.word}, ${item.answer}!`, accent, 'word'), 700);
          if (ok || s.tries >= MAX_TRIES - 1) { onAnswer({ item: `${item.word}/${item.answer}`, correct: ok, ms: clock(), tries: s.tries, hints: 0, input: 'tap' }); s.next(ok); return 'done'; }
          s.setTries(s.tries + 1); return 'retry';
        }} />
    </div>
  );
}

// ── Sound It Out ─────────────────────────────────────────────────────────────

export function SoundOut({ activity, tier, accent, context, onAnswer, onDone }: Of<'sound'>) {
  const s = useItems(activity.items.length, onDone);
  const item = activity.items[s.i]!;
  const clock = useItemClock(s.i);
  const [tapped, setTapped] = useState<number[]>([]);
  useEffect(() => setTapped([]), [s.i]);
  const all = tapped.length >= item.sounds.length;
  return (
    <div className="space-y-5 text-center">
      <Dots n={activity.items.length} at={s.i} results={s.results} />
      <div className="flex justify-center"><Picture word={item.word} emoji={item.emoji} size={150} /></div>
      <p className="text-lg font-bold">{all ? 'Now blend the sounds and say the word!' : 'Tap each sound.'}</p>
      <div className="flex justify-center gap-2">
        {item.sounds.map((snd, k) => (
          <button key={k} type="button" onClick={() => { setTapped((t) => (t.includes(k) ? t : [...t, k])); void say(soundHint(snd), accent, 'word'); }}
            aria-label={`Sound ${snd.replace('_e', ' magic e')}`} aria-pressed={tapped.includes(k)}
            className={cn('grid h-16 min-w-16 place-items-center rounded-md px-3 font-display text-3xl font-bold transition-colors', focusRing, tapped.includes(k) ? 'bg-gold text-ink-900' : 'bg-card hover:bg-gold-100 dark:hover:bg-night-700')}>
            {snd.replace('_e', '…e')}
          </button>
        ))}
      </div>
      {all && (
        <>
          <button type="button" onClick={() => void say(item.sounds.map((x) => x.replace('_e', '')).join('… ') + '… ' + item.word, accent, 'word')} className={helperPill}><Volume2 /> Blend it with Zuva</button>
          <SpeakCheck key={s.i} target={item.word} tier={tier} accent={accent} context={context} onResult={(r) => {
            if (r.ok || s.tries >= MAX_TRIES) { cheer(tier, accent, r.ok); onAnswer({ item: item.word, correct: r.ok, score: r.score, ms: clock(), tries: s.tries, hints: 0, input: r.input, heard: r.heard }); s.next(r.ok); }
            else { s.setTries(s.tries + 1); cheer(tier, accent, false); }
          }} />
        </>
      )}
    </div>
  );
}

// ── Spell It ─────────────────────────────────────────────────────────────────

export function Spell({ activity, tier, accent, onAnswer, onDone }: Of<'spell'>) {
  const s = useItems(activity.items.length, onDone);
  const item = activity.items[s.i]!;
  const clock = useItemClock(s.i);
  const [picked, setPicked] = useState<number[]>([]);
  const [state, setState] = useState<'right' | 'wrong' | null>(null);
  useEffect(() => { setPicked([]); setState(null); void say(item.word, accent, 'word'); }, [s.i]); // eslint-disable-line react-hooks/exhaustive-deps
  const built = picked.map((k) => item.letters[k]).join('');
  const word = item.word;
  const slots = useMemo(() => word.split(''), [word]);
  const check = (letters: string) => {
    const ok = letters.toLowerCase() === word.toLowerCase();
    setState(ok ? 'right' : 'wrong');
    cheer(tier, accent, ok);
    if (ok || s.tries >= MAX_TRIES) { onAnswer({ item: word, correct: ok, ms: clock(), tries: s.tries, hints: s.hints, input: 'tap' }); s.next(ok); }
    else { s.setTries(s.tries + 1); setTimeout(() => { setPicked([]); setState(null); }, 900); }
  };
  return (
    <div className="space-y-5 text-center">
      <Dots n={activity.items.length} at={s.i} results={s.results} />
      <div className="flex items-center justify-center gap-4"><Picture word={word} emoji={item.emoji} size={120} /><SoundButton text={word} accent={accent} pace="word" label="Hear it" /></div>
      <div className="flex flex-wrap justify-center gap-1.5" aria-label="Your spelling">
        {slots.map((ch, k) => (
          <span key={k} className={cn('grid h-14 w-11 place-items-center rounded-md font-display text-3xl font-bold', ch === ' ' ? '' : state === 'right' ? 'bg-teal-100 text-teal-900 ring-2 ring-teal dark:bg-teal-900 dark:text-teal-50' : state === 'wrong' ? 'bg-red-100 text-red-900 ring-2 ring-red-700 dark:bg-red-950 dark:text-red-100' : 'bg-card ring-2 ring-inset ring-fg/15')}>
            {state === 'wrong' && s.tries >= MAX_TRIES ? ch : built[k] ?? ''}
          </span>
        ))}
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {item.letters.map((l, k) => (
          <button key={k} type="button" disabled={picked.includes(k) || !!state} onClick={() => { const n = [...picked, k]; setPicked(n); if (n.length === item.letters.length) check(n.map((x) => item.letters[x]).join('')); }}
            aria-label={`Letter ${l}`} className={optionClass(undefined, 'h-14 w-12 bg-gold font-display text-3xl text-ink-900 hover:bg-gold-600 disabled:opacity-30')}>{l}</button>
        ))}
        <button type="button" aria-label="Remove last letter" onClick={() => setPicked((p) => p.slice(0, -1))} disabled={!picked.length || !!state} className={optionClass(undefined, 'h-14 w-14 disabled:opacity-30')}><Delete /></button>
      </div>
      <button type="button" onClick={() => { s.setHints(s.hints + 1); void say(word.split('').join(', '), accent, 'word'); }} className={helperPill}><Lightbulb /> Spell it for me</button>
    </div>
  );
}

