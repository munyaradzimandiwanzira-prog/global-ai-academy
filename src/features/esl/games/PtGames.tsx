/**
 * Practice made for Portuguese speakers:
 *   pairs    Sound Twins    hear one of two words that Portuguese speakers often merge, tap it
 *   friends  False Friends  an English word that looks Portuguese: choose its real meaning
 *   fix      Fix It         grammar that transfers from Portuguese: choose the correct English
 */
import { useEffect, useState } from 'react';
import type { Activity } from '@shared/esl';
import { cn } from '@/lib/utils';
import { say } from '../voice';
import { PtLine } from '../support';
import { Dots, OptionButton, SoundButton, big, cheer, useItemClock, type GameProps } from './kit';

type Of<K extends Activity['kind']> = GameProps<Extract<Activity, { kind: K }>>;

/** Shared item loop for the tap games: one answer per item, a second try, then the right answer. */
function useLoop(n: number, onDone: () => void) {
  const [i, setI] = useState(0);
  const [tries, setTries] = useState(1);
  const [state, setState] = useState<Record<string, 'right' | 'wrong'>>({});
  const [results, setResults] = useState<(boolean | undefined)[]>([]);
  useEffect(() => { setState({}); setTries(1); }, [i]);
  const settle = (ok: boolean, delay: number) => {
    setResults((r) => { const c = [...r]; c[i] = ok; return c; });
    setTimeout(() => (i + 1 >= n ? onDone() : setI(i + 1)), delay);
  };
  return { i, tries, setTries, state, setState, results, settle, solved: Object.values(state).includes('right') };
}

export function Pairs({ activity, tier, accent, onAnswer, onDone }: Of<'pairs'>) {
  const s = useLoop(activity.items.length, onDone);
  const item = activity.items[s.i]!;
  const clock = useItemClock(s.i);
  useEffect(() => { void say(item.target, accent, 'word'); }, [s.i]); // eslint-disable-line react-hooks/exhaustive-deps
  const choose = (w: string) => {
    const ok = w === item.target;
    s.setState((st) => ({ ...st, [w]: ok ? 'right' : 'wrong', ...(!ok && s.tries >= 2 ? { [item.target]: 'right' } : {}) }));
    cheer(tier, accent, ok);
    if (ok || s.tries >= 2) {
      onAnswer({ item: `${item.a}/${item.b}`, correct: ok, ms: clock(), tries: s.tries, hints: 0, input: 'tap' });
      setTimeout(() => void say(`${item.a}… ${item.b}`, accent, 'word'), 700);
      s.settle(ok, 3200);
    } else { s.setTries(s.tries + 1); setTimeout(() => void say(item.target, accent, 'word'), 900); }
  };
  return (
    <div className="space-y-5 text-center">
      <Dots n={activity.items.length} at={s.i} results={s.results} />
      <p className={cn('font-bold', big(tier) ? 'text-2xl' : 'text-lg')}>Which word did I say?</p>
      <SoundButton text={item.target} accent={accent} pace="word" label="Hear it again" />
      <div className="mx-auto grid max-w-md grid-cols-2 gap-3">
        {[item.a, item.b].map((w) => (
          <OptionButton key={w} state={s.state[w]} disabled={s.solved || s.state[w] === 'wrong'} onClick={() => choose(w)} className="min-h-20 font-display text-3xl">{w}</OptionButton>
        ))}
      </div>
      {s.solved && item.tip && <PtLine text={item.tip} className="mx-auto max-w-md text-left" />}
    </div>
  );
}

export function Friends({ activity, tier, accent, onAnswer, onDone }: Of<'friends'>) {
  const s = useLoop(activity.items.length, onDone);
  const item = activity.items[s.i]!;
  const clock = useItemClock(s.i);
  useEffect(() => { void say(item.example, accent, tier === 'secondary' ? 'secondary' : 'primary'); }, [s.i]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="space-y-5 text-center">
      <Dots n={activity.items.length} at={s.i} results={s.results} />
      <p className="font-display text-4xl font-bold">{item.en}</p>
      <p className="mx-auto max-w-lg text-lg italic">“{item.example}”</p>
      <SoundButton text={item.example} accent={accent} pace={tier === 'secondary' ? 'secondary' : 'primary'} label="Hear the sentence" />
      <p className="font-semibold" lang="pt-MZ">O que significa “{item.en}”?</p>
      <div className="mx-auto grid max-w-lg grid-cols-1 gap-3 sm:grid-cols-3">
        {item.options.map((o) => (
          <OptionButton key={o} state={s.state[o]} disabled={s.solved || s.state[o] === 'wrong'} onClick={() => {
            const ok = o === item.answer;
            s.setState((st) => ({ ...st, [o]: ok ? 'right' : 'wrong', ...(!ok && s.tries >= 2 ? { [item.answer]: 'right' } : {}) }));
            cheer(tier, accent, ok);
            if (ok || s.tries >= 2) { onAnswer({ item: item.en, correct: ok, ms: clock(), tries: s.tries, hints: 0, input: 'tap', support: true }); s.settle(ok, 2400); }
            else s.setTries(s.tries + 1);
          }} className="text-lg"><span lang="pt-MZ">{o}</span></OptionButton>
        ))}
      </div>
    </div>
  );
}

export function Fix({ activity, tier, accent, onAnswer, onDone }: Of<'fix'>) {
  const s = useLoop(activity.items.length, onDone);
  const item = activity.items[s.i]!;
  const clock = useItemClock(s.i);
  const [before, after] = item.text.split('___');
  return (
    <div className="space-y-6">
      <Dots n={activity.items.length} at={s.i} results={s.results} />
      <p className={cn('text-center font-semibold leading-relaxed', big(tier) ? 'text-3xl' : 'text-2xl')}>
        {before}<span className={cn('mx-1 inline-block min-w-20 rounded-md px-2 text-center', s.solved ? 'bg-teal-100 text-teal-900 dark:bg-teal-900 dark:text-teal-50' : 'bg-card')}>{s.solved ? item.answer : '?'}</span>{after}
      </p>
      <div className="mx-auto grid max-w-lg grid-cols-1 gap-3 sm:grid-cols-2">
        {item.options.map((o) => (
          <OptionButton key={o} state={s.state[o]} disabled={s.solved || s.state[o] === 'wrong'} onClick={() => {
            const ok = o === item.answer;
            s.setState((st) => ({ ...st, [o]: ok ? 'right' : 'wrong', ...(!ok && s.tries >= 2 ? { [item.answer]: 'right' } : {}) }));
            cheer(tier, accent, ok);
            if (ok || s.tries >= 2) {
              onAnswer({ item: item.text, correct: ok, ms: clock(), tries: s.tries, hints: 0, input: 'tap' });
              setTimeout(() => void say(item.text.replace('___', item.answer), accent, tier === 'secondary' ? 'secondary' : 'primary'), 600);
              s.settle(ok, 3600);
            } else s.setTries(s.tries + 1);
          }} className="text-xl">{o}</OptionButton>
        ))}
      </div>
      {s.solved && item.why && <PtLine text={item.why} className="mx-auto max-w-lg" />}
    </div>
  );
}
