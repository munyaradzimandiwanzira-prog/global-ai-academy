/** Sentence Train (order), Fill the Gap (gap) and Story Time (story). */
import { useEffect, useState } from 'react';
import { normalise, type Activity } from '@shared/esl';
import { ArrowRight, Volume2 } from '@/components/icons';
import { cn } from '@/lib/utils';
import { say } from '../voice';
import { focusRing, helperPill, optionClass } from '../ui';
import { buttonClass } from '@/components/ui/Button';
import { MaterialIcon } from '@/components/icons';
import { Dots, OptionButton, cheer, big, useItemClock, type GameProps } from './kit';

type Of<K extends Activity['kind']> = GameProps<Extract<Activity, { kind: K }>>;

export function Order({ activity, tier, accent, onAnswer, onDone }: Of<'order'>) {
  const [i, setI] = useState(0);
  const [placed, setPlaced] = useState<number[]>([]);
  const [tries, setTries] = useState(1);
  const [state, setState] = useState<'right' | 'wrong' | null>(null);
  const [results, setResults] = useState<(boolean | undefined)[]>([]);
  const item = activity.items[i]!;
  const clock = useItemClock(i);
  useEffect(() => { setPlaced([]); setState(null); setTries(1); }, [i]);
  const finish = (ok: boolean) => {
    setResults((r) => { const c = [...r]; c[i] = ok; return c; });
    onAnswer({ item: item.sentence, correct: ok, ms: clock(), tries, hints: 0, input: 'tap' });
    void say(item.sentence, accent, tier === 'secondary' ? 'secondary' : 'primary');
    setTimeout(() => (i + 1 >= activity.items.length ? onDone() : setI(i + 1)), 2200);
  };
  const check = (order: number[]) => {
    const built = order.map((k) => item.words[k]).join(' ');
    const ok = normalise(built) === normalise(item.sentence);
    setState(ok ? 'right' : 'wrong');
    cheer(tier, accent, ok);
    if (ok || tries >= 3) finish(ok);
    else { setTries(tries + 1); setTimeout(() => { setPlaced([]); setState(null); }, 1000); }
  };
  return (
    <div className="space-y-5">
      <Dots n={activity.items.length} at={i} results={results} />
      <p className="text-center text-lg font-bold">Tap the words in the right order.</p>
      <div className={cn('flex min-h-[72px] flex-wrap items-center gap-2 rounded-md p-3', state === 'right' ? 'bg-teal-100 ring-2 ring-teal dark:bg-teal-900' : state === 'wrong' ? 'bg-red-100 ring-2 ring-red-700 dark:bg-red-950' : 'bg-card')} aria-label="Your sentence">
        <MaterialIcon name="train" className="text-teal-700 dark:text-teal-300" />
        {state === 'wrong' && tries >= 3
          ? <span className="text-lg font-bold">{item.sentence}</span>
          : placed.map((k, n) => (
            <button key={n} type="button" disabled={!!state} onClick={() => setPlaced((p) => p.filter((_, x) => x !== n))} aria-label={`Take out ${item.words[k]}`} className={cn('min-h-12 rounded-md bg-gold px-3 text-lg font-bold text-ink-900 transition-colors hover:bg-gold-600', focusRing)}>{item.words[k]}</button>
          ))}
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {item.words.map((w, k) => (
          <button key={k} type="button" disabled={placed.includes(k) || !!state} onClick={() => { const n = [...placed, k]; setPlaced(n); if (n.length === item.words.length) check(n); }}
            className={optionClass(undefined, 'px-4 text-lg disabled:opacity-30')}>{w}</button>
        ))}
      </div>
    </div>
  );
}

export function Gap({ activity, tier, accent, onAnswer, onDone }: Of<'gap'>) {
  const [i, setI] = useState(0);
  const [tries, setTries] = useState(1);
  const [state, setState] = useState<Record<string, 'right' | 'wrong'>>({});
  const [results, setResults] = useState<(boolean | undefined)[]>([]);
  const item = activity.items[i]!;
  const clock = useItemClock(i);
  useEffect(() => { setState({}); setTries(1); }, [i]);
  const [before, after] = item.text.split('___');
  const solved = Object.values(state).includes('right');
  return (
    <div className="space-y-6">
      <Dots n={activity.items.length} at={i} results={results} />
      <p className={cn('text-center font-semibold leading-relaxed', big(tier) ? 'text-3xl' : 'text-2xl')}>
        {before}<span className={cn('mx-1 inline-block min-w-20 rounded-md px-2 text-center', solved ? 'bg-teal-100 text-teal-900 dark:bg-teal-900 dark:text-teal-50' : 'bg-card')}>{solved ? item.answer : '?'}</span>{after}
      </p>
      <div className="mx-auto grid max-w-lg grid-cols-1 gap-3 sm:grid-cols-2">
        {item.options.map((o) => (
          <OptionButton key={o} state={state[o]} disabled={solved || state[o] === 'wrong'} onClick={() => {
            const ok = o === item.answer;
            setState((s) => ({ ...s, [o]: ok ? 'right' : 'wrong', ...(!ok && tries >= 2 ? { [item.answer]: 'right' } : {}) }));
            cheer(tier, accent, ok);
            if (ok || tries >= 2) {
              setResults((r) => { const c = [...r]; c[i] = ok; return c; });
              onAnswer({ item: item.text, correct: ok, ms: clock(), tries, hints: 0, input: 'tap' });
              setTimeout(() => void say(item.text.replace('___', item.answer), accent, tier === 'secondary' ? 'secondary' : 'primary'), 600);
              setTimeout(() => (i + 1 >= activity.items.length ? onDone() : setI(i + 1)), 2600);
            } else setTries(tries + 1);
          }} className="text-xl">{o}</OptionButton>
        ))}
      </div>
    </div>
  );
}

export function Story({ activity, tier, accent, onAnswer, onDone }: Of<'story'>) {
  // Young children hear one line at a time; older learners read the whole text.
  const lineByLine = tier === 'early';
  const [line, setLine] = useState(0);
  const [reading, setReading] = useState(true);
  const [q, setQ] = useState(0);
  const [state, setState] = useState<Record<string, 'right' | 'wrong'>>({});
  const [tries, setTries] = useState(1);
  const clock = useItemClock(`${reading}-${q}`);
  const pace = tier === 'secondary' ? 'secondary' : tier;
  useEffect(() => { if (lineByLine && reading) void say(activity.paragraphs[line]!, accent, pace); }, [line, reading]); // eslint-disable-line react-hooks/exhaustive-deps
  const question = activity.questions[q]!;
  useEffect(() => { if (!reading) { setState({}); setTries(1); void say(question.q, accent, pace); } }, [reading, q]); // eslint-disable-line react-hooks/exhaustive-deps

  if (reading) {
    return (
      <div className="space-y-5">
        <h3 className={cn('text-center font-display font-bold', big(tier) ? 'text-3xl' : 'text-2xl')}>{activity.title}</h3>
        <div className="mx-auto max-w-2xl rounded-md bg-card p-5 sm:p-7">
          {lineByLine
            ? <p className="text-center text-2xl font-semibold leading-relaxed">{activity.paragraphs[line]}</p>
            : activity.paragraphs.map((p, k) => <p key={k} className="mb-3 text-lg leading-relaxed last:mb-0">{p}</p>)}
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          <button type="button" onClick={() => void say(lineByLine ? activity.paragraphs[line]! : activity.paragraphs.join(' ').slice(0, 300), accent, pace)} className={buttonClass({ variant: 'outlined', color: 'action', size: 'lg' })}><Volume2 /> {lineByLine ? 'Hear it again' : 'Read it to me'}</button>
          <button type="button" onClick={() => (lineByLine && line + 1 < activity.paragraphs.length ? setLine(line + 1) : setReading(false))} className={buttonClass({ color: 'accent', size: 'lg' })}>
            {lineByLine && line + 1 < activity.paragraphs.length ? 'Next line' : 'Answer questions'} <ArrowRight />
          </button>
        </div>
        {activity.source && <p className="text-center text-sm text-muted-fg">Source: {activity.source.url ? <a href={activity.source.url} target="_blank" rel="noopener noreferrer" className="underline">{activity.source.title}</a> : activity.source.title}, {activity.source.licence}</p>}
      </div>
    );
  }
  const solved = Object.values(state).includes('right');
  return (
    <div className="space-y-5">
      <Dots n={activity.questions.length} at={q} results={[]} />
      <p className={cn('text-center font-bold', big(tier) ? 'text-2xl' : 'text-xl')}>{question.q}</p>
      <div className="mx-auto grid max-w-xl grid-cols-1 gap-3 sm:grid-cols-3">
        {question.options.map((o) => (
          <OptionButton key={o.label} state={state[o.label]} disabled={solved || state[o.label] === 'wrong'} onClick={() => {
            const ok = o.label === question.answer;
            setState((s) => ({ ...s, [o.label]: ok ? 'right' : 'wrong', ...(!ok && tries >= 2 ? { [question.answer]: 'right' } : {}) }));
            cheer(tier, accent, ok);
            if (ok || tries >= 2) {
              onAnswer({ item: `${activity.title}: ${question.q}`, correct: ok, ms: clock(), tries, hints: 0, input: 'tap' });
              setTimeout(() => (q + 1 >= activity.questions.length ? onDone() : setQ(q + 1)), 1500);
            } else setTries(tries + 1);
          }} className="flex-col py-3 text-lg">
            {o.emoji && <span className="text-4xl" aria-hidden="true">{o.emoji}</span>}
            <span>{o.label}</span>
          </OptionButton>
        ))}
      </div>
      <button type="button" onClick={() => setReading(true)} className={cn(helperPill, 'mx-auto flex')}>Read the story again</button>
    </div>
  );
}
