/**
 * The seven maths games. Every answer is checked in the browser against the generated answer
 * (answerMatches accepts 0,5 and 0.5 and equivalent fractions), then sent to the learner model.
 */
import { useCallback, useEffect, useState } from 'react';
import { answerMatches, type MathsActivity } from '@shared/maths';
import { PT_UI } from '@shared/esl';
import { Delete, Lightbulb, MaterialIcon, Sparkles, Check } from '@/components/icons';
import { buttonClass } from '@/components/ui/Button';
import { api, errorMessage } from '@/lib/api';
import { cn } from '@/lib/utils';
import { streamZuva } from '@/features/zuva/api';
import { ZuvaCardView } from '@/features/zuva/ZuvaCards';
import type { ZuvaCard } from '@shared/zuva';
import { Dots, OptionButton, cheer, useItemClock } from '@/features/esl/games/kit';
import { focusRing, helperPill, optionClass } from '@/features/esl/ui';
import { PtLine } from '@/features/esl/support';
import { say } from '@/features/esl/voice';
import { Visual, FractionPicture } from './Visual';
import { useMathsPlace } from './context';

export interface MathsAnswer { item: string; correct: boolean; ms: number; tries: number; hints: number; support?: boolean; input?: 'tap' | 'type' }
export interface MathsGameProps<A extends MathsActivity = MathsActivity> { activity: A; onAnswer: (a: MathsAnswer) => void; onDone: () => void }
type Of<K extends MathsActivity['kind']> = MathsGameProps<Extract<MathsActivity, { kind: K }>>;

const right = (ok: boolean) => cheer('primary', 'gb', ok);

/** Shared loop: current item, tries, results for the progress dots. */
function useLoop(n: number, onDone: () => void, maxTries = 2) {
  const [i, setI] = useState(0);
  const [tries, setTries] = useState(1);
  const [results, setResults] = useState<(boolean | undefined)[]>([]);
  const [helped, setHelped] = useState(false);
  useEffect(() => { setTries(1); setHelped(false); }, [i]);
  const settle = (ok: boolean, delay = 1100) => { setResults((r) => { const c = [...r]; c[i] = ok; return c; }); setTimeout(() => (i + 1 >= n ? onDone() : setI(i + 1)), delay); };
  return { i, tries, setTries, results, settle, last: tries >= maxTries, helped, markHelp: () => setHelped(true) };
}

/** Portuguese for a question (translated on the server by position, cached). */
function MathsGloss({ activityId, field = 'item', index = 0, onUse }: { activityId: string; field?: 'item' | 'intro' | 'prompt'; index?: number; onUse?: () => void }) {
  const place = useMathsPlace();
  const [pt, setPt] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => { setPt(null); setErr(null); }, [activityId, index]);
  if (!place || place.support !== 'pt-MZ') return null;
  if (pt) return <PtLine text={pt} className="mx-auto max-w-lg" />;
  return (
    <span className="flex flex-col items-center">
      <button type="button" className={helperPill} disabled={busy} aria-busy={busy || undefined} onClick={async () => {
        setBusy(true); onUse?.();
        try { const r = await api.post<{ pt: string }>('/api/maths/gloss', { unitId: place.unitId, activityId, field, index }); setPt(r.pt); void say(r.pt, 'gb', 'primary', 'pt-MZ'); } catch (e) { setErr(errorMessage(e)); } finally { setBusy(false); }
      }}><MaterialIcon name="translate" /> {busy ? '…' : PT_UI.meaning}</button>
      {err && <span role="alert" className="text-[15px] text-red-700 dark:text-red-300">{err}</span>}
    </span>
  );
}

// ── Keypad answer (sprint and word problems) ────────────────────────────────

function Keypad({ value, onChange, onEnter, disabled }: { value: string; onChange: (v: string) => void; onEnter: () => void; disabled?: boolean }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      // Never steal keys from Zuva's chat box or any other field.
      if (disabled || el?.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el?.tagName ?? '')) return;
      if (/^[0-9.,/\-]$/.test(e.key)) { onChange((value + e.key).slice(0, 12)); e.preventDefault(); }
      else if (e.key === 'Backspace') { onChange(value.slice(0, -1)); e.preventDefault(); }
      else if (e.key === 'Enter') { onEnter(); e.preventDefault(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [value, onChange, onEnter, disabled]);
  const keys = ['7', '8', '9', '4', '5', '6', '1', '2', '3', '−', '0', '.'];
  return (
    <div className="mx-auto grid max-w-xs grid-cols-3 gap-2">
      {keys.map((k) => <button key={k} type="button" disabled={disabled} onClick={() => onChange((value + (k === '−' ? '-' : k)).slice(0, 12))} className={optionClass(undefined, 'h-14 font-display text-2xl')}>{k}</button>)}
      <button type="button" disabled={disabled} onClick={() => onChange((value + '/').slice(0, 12))} className={optionClass(undefined, 'h-14 font-display text-2xl')} aria-label="Fraction bar">/</button>
      <button type="button" disabled={disabled} onClick={() => onChange(value.slice(0, -1))} className={optionClass(undefined, 'h-14')} aria-label="Delete"><Delete /></button>
      <button type="button" disabled={disabled || !value} onClick={onEnter} className={cn(buttonClass({ color: 'action' }), 'h-14')}><Check /> Check</button>
    </div>
  );
}

function AnswerBox({ value, state }: { value: string; state: 'right' | 'wrong' | null }) {
  return (
    <output aria-live="polite" className={cn('mx-auto grid h-16 min-w-40 place-items-center rounded-md px-4 font-display text-4xl font-bold tabular-nums', state === 'right' ? 'bg-teal-100 text-teal-900 ring-2 ring-teal dark:bg-teal-900 dark:text-teal-50' : state === 'wrong' ? 'bg-red-100 text-red-900 ring-2 ring-red-700 dark:bg-red-950 dark:text-red-100' : 'bg-card')}>
      {value || <span className="text-fg/30">?</span>}
    </output>
  );
}

function useTyped(answer: string, loop: ReturnType<typeof useLoop>, onResult: (ok: boolean, given: string) => void) {
  const [value, setValue] = useState('');
  const [state, setState] = useState<'right' | 'wrong' | null>(null);
  useEffect(() => { setValue(''); setState(null); }, [loop.i]);
  const check = useCallback(() => {
    if (!value || state === 'right') return;
    const ok = answerMatches(answer, value);
    setState(ok ? 'right' : 'wrong'); right(ok);
    if (ok || loop.last) onResult(ok, value);
    else { loop.setTries(loop.tries + 1); setTimeout(() => { setValue(''); setState(null); }, 900); }
  }, [value, state, answer, loop, onResult]);
  return { value, setValue, state, check };
}

export function Sprint({ activity, onAnswer, onDone }: Of<'sprint'>) {
  const loop = useLoop(activity.items.length, onDone);
  const item = activity.items[loop.i]!;
  const clock = useItemClock(loop.i);
  const t = useTyped(item.answer, loop, (ok) => { onAnswer({ item: item.q, correct: ok, ms: clock(), tries: loop.tries, hints: 0, input: 'type', support: loop.helped }); loop.settle(ok, ok ? 700 : 1800); });
  return (
    <div className="space-y-5 text-center">
      <Dots n={activity.items.length} at={loop.i} results={loop.results} />
      <p className="font-display text-4xl font-bold tabular-nums sm:text-5xl">{item.q}</p>
      <AnswerBox value={t.state === 'wrong' && loop.last ? item.answer : t.value} state={t.state} />
      <Keypad value={t.value} onChange={t.setValue} onEnter={t.check} disabled={t.state === 'right'} />
      {/^[A-Za-z]/.test(item.q) && <MathsGloss activityId={activity.id} index={loop.i} onUse={loop.markHelp} />}
    </div>
  );
}

export function Word({ activity, onAnswer, onDone }: Of<'word'>) {
  const loop = useLoop(activity.items.length, onDone);
  const item = activity.items[loop.i]!;
  const clock = useItemClock(loop.i);
  const [hint, setHint] = useState(false);
  useEffect(() => setHint(false), [loop.i]);
  const t = useTyped(item.answer, loop, (ok) => { onAnswer({ item: item.q.slice(0, 200), correct: ok, ms: clock(), tries: loop.tries, hints: hint ? 1 : 0, input: 'type', support: loop.helped }); loop.settle(ok, ok ? 900 : 2200); });
  useEffect(() => { void say(item.q, 'gb', 'primary'); }, [loop.i]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="space-y-5 text-center">
      <Dots n={activity.items.length} at={loop.i} results={loop.results} />
      <p className="mx-auto max-w-xl text-xl font-semibold leading-relaxed">{item.q}</p>
      <div className="flex flex-wrap justify-center gap-1">
        <button type="button" className={helperPill} onClick={() => void say(item.q, 'gb', 'primary')}><MaterialIcon name="volume_up" /> Read it to me</button>
        {item.model && <button type="button" className={helperPill} onClick={() => setHint(true)}><Lightbulb /> Draw a bar model</button>}
        <MathsGloss activityId={activity.id} index={loop.i} onUse={loop.markHelp} />
      </div>
      {hint && item.model && (
        <div className="mx-auto flex max-w-md overflow-hidden rounded-md" aria-label={`Bar model: ${item.model.join(', ')}`}>
          {item.model.map((x, k) => <div key={k} className={cn('grid h-12 place-items-center border-r-2 border-card font-display text-lg font-bold last:border-r-0', x < 0 ? 'bg-red-100 text-red-900 line-through dark:bg-red-950 dark:text-red-100' : k % 2 ? 'bg-gold-100 text-ink-900' : 'bg-teal-100 text-teal-900 dark:bg-teal-900 dark:text-teal-50')} style={{ flex: Math.abs(x) || 1 }}>{Math.abs(x)}</div>)}
        </div>
      )}
      <AnswerBox value={t.state === 'wrong' && loop.last ? `${item.unit === '$' ? '$' : ''}${item.answer}` : `${item.unit === '$' && t.value ? '$' : ''}${t.value}`} state={t.state} />
      <Keypad value={t.value} onChange={t.setValue} onEnter={t.check} disabled={t.state === 'right'} />
    </div>
  );
}

export function Choice({ activity, onAnswer, onDone }: Of<'choice'>) {
  const loop = useLoop(activity.items.length, onDone);
  const item = activity.items[loop.i]!;
  const clock = useItemClock(loop.i);
  const [state, setState] = useState<Record<string, 'right' | 'wrong'>>({});
  useEffect(() => setState({}), [loop.i]);
  const solved = Object.values(state).includes('right');
  return (
    <div className="space-y-5 text-center">
      <Dots n={activity.items.length} at={loop.i} results={loop.results} />
      <p className="text-xl font-bold">{item.q}</p>
      {item.visual && <div className="flex justify-center text-fg"><Visual v={item.visual} /></div>}
      <div className={cn('mx-auto grid max-w-xl gap-3', item.options.length === 3 ? 'grid-cols-3' : 'grid-cols-2')}>
        {item.options.map((o) => (
          <OptionButton key={o} state={state[o]} disabled={solved || state[o] === 'wrong'} onClick={() => {
            const ok = o === item.answer;
            setState((s) => ({ ...s, [o]: ok ? 'right' : 'wrong', ...(!ok && loop.last ? { [item.answer]: 'right' } : {}) }));
            right(ok);
            if (ok || loop.last) { onAnswer({ item: item.q, correct: ok, ms: clock(), tries: loop.tries, hints: 0, support: loop.helped }); loop.settle(ok, ok ? 900 : 1800); }
            else loop.setTries(loop.tries + 1);
          }} className="font-display text-xl">{o}</OptionButton>
        ))}
      </div>
      <MathsGloss activityId={activity.id} index={loop.i} onUse={loop.markHelp} />
    </div>
  );
}

export function NumberLine({ activity, onAnswer, onDone }: Of<'numberline'>) {
  const loop = useLoop(activity.items.length, onDone);
  const item = activity.items[loop.i]!;
  const clock = useItemClock(loop.i);
  const [picked, setPicked] = useState<number | null>(null);
  useEffect(() => setPicked(null), [loop.i]);
  const ticks = Math.round((item.max - item.min) / item.step);
  const val = (k: number) => Math.round((item.min + k * item.step) * 1000) / 1000;
  const labelEvery = ticks > 10 ? Math.ceil(ticks / 10) : 1;
  const fmt = (x: number) => String(x);
  const ok = picked != null && Math.abs(picked - item.target) < 1e-9;
  return (
    <div className="space-y-6 text-center">
      <Dots n={activity.items.length} at={loop.i} results={loop.results} />
      <p className="text-xl font-bold">Where does <span className="font-display text-3xl">{fmt(item.target)}</span> go?</p>
      <div className="overflow-x-auto px-2 pb-2">
        <div role="radiogroup" aria-label={`Number line from ${item.min} to ${item.max}`} className="relative mx-auto flex min-w-[520px] max-w-3xl items-end justify-between pt-2">
          <div aria-hidden="true" className="absolute inset-x-3 bottom-[34px] h-1 rounded bg-fg/60" />
          {Array.from({ length: ticks + 1 }, (_, k) => {
            const v = val(k), chosen = picked === v, show = k % labelEvery === 0 || k === ticks || (picked != null && (chosen || v === item.target));
            return (
              <button key={k} type="button" role="radio" aria-checked={chosen} aria-label={show ? fmt(v) : `Mark ${k}`} disabled={picked != null && (ok || loop.last)}
                onClick={() => { const good = Math.abs(v - item.target) < 1e-9; setPicked(v); right(good); if (good || loop.last) { onAnswer({ item: `place ${item.target} on ${item.min}–${item.max}`, correct: good, ms: clock(), tries: loop.tries, hints: 0 }); loop.settle(good, good ? 900 : 1800); } else { loop.setTries(loop.tries + 1); setTimeout(() => setPicked(null), 900); } }}
                className={cn('relative z-[1] flex w-7 flex-col items-center gap-1 rounded-md pb-1', focusRing)}>
                <span className={cn('block w-1 rounded', k % labelEvery === 0 ? 'h-6 bg-fg' : 'h-4 bg-fg/60', chosen && (Math.abs(v - item.target) < 1e-9 ? 'w-2 bg-teal' : 'w-2 bg-red-700'))} />
                <span className={cn('h-5 text-sm tabular-nums', !show && 'invisible')}>{fmt(v)}</span>
              </button>
            );
          })}
        </div>
      </div>
      <p className="min-h-6 font-semibold" role="status">{picked == null ? 'Tap a mark on the line.' : ok ? 'Yes! Right there.' : loop.last ? `It goes at ${fmt(item.target)}.` : 'Not quite. Count the steps and try again.'}</p>
    </div>
  );
}

export function Blocks({ activity, onAnswer, onDone }: Of<'blocks'>) {
  const loop = useLoop(activity.items.length, onDone, 3);
  const item = activity.items[loop.i]!;
  const clock = useItemClock(loop.i);
  const cols = item.target >= 1000 ? (['thousands', 'hundreds', 'tens', 'ones'] as const) : item.target >= 100 ? (['hundreds', 'tens', 'ones'] as const) : (['tens', 'ones'] as const);
  const unit = { thousands: 1000, hundreds: 100, tens: 10, ones: 1 } as const;
  const [n, setN] = useState<Record<string, number>>({});
  const [state, setState] = useState<'right' | 'wrong' | null>(null);
  useEffect(() => { setN({}); setState(null); }, [loop.i]);
  const total = cols.reduce((s, c) => s + (n[c] ?? 0) * unit[c], 0);
  const check = () => {
    const ok = total === item.target; setState(ok ? 'right' : 'wrong'); right(ok);
    if (ok || loop.last) { onAnswer({ item: `build ${item.target}`, correct: ok, ms: clock(), tries: loop.tries, hints: 0 }); loop.settle(ok, ok ? 900 : 1800); }
    else { loop.setTries(loop.tries + 1); setTimeout(() => setState(null), 900); }
  };
  return (
    <div className="space-y-5 text-center">
      <Dots n={activity.items.length} at={loop.i} results={loop.results} />
      <p className="text-xl font-bold">Build <span className="font-display text-4xl tabular-nums">{item.target}</span></p>
      <div className="mx-auto grid max-w-2xl gap-3" style={{ gridTemplateColumns: `repeat(${cols.length}, minmax(0, 1fr))` }}>
        {cols.map((c) => (
          <div key={c} className="rounded-md bg-card p-3">
            <p className="font-semibold capitalize">{c}</p>
            <p className="font-display text-3xl font-bold tabular-nums" aria-live="polite">{n[c] ?? 0}</p>
            <div className="mt-2 flex justify-center gap-2">
              <button type="button" aria-label={`One fewer ${c}`} disabled={!n[c] || state === 'right'} onClick={() => setN((x) => ({ ...x, [c]: Math.max(0, (x[c] ?? 0) - 1) }))} className={optionClass(undefined, 'h-12 w-12 text-2xl')}>−</button>
              <button type="button" aria-label={`One more ${c}`} disabled={(n[c] ?? 0) >= 9 || state === 'right'} onClick={() => setN((x) => ({ ...x, [c]: Math.min(9, (x[c] ?? 0) + 1) }))} className={optionClass(undefined, 'h-12 w-12 bg-gold text-2xl text-ink-900 hover:bg-gold-600')}>+</button>
            </div>
          </div>
        ))}
      </div>
      <p className="font-display text-2xl tabular-nums" aria-live="polite">= {total}</p>
      <button type="button" onClick={check} disabled={state === 'right'} className={buttonClass({ color: 'action', size: 'lg' })}><Check /> Check</button>
      {state === 'wrong' && loop.last && <p className="font-semibold">{item.target} = {cols.map((c) => `${Math.floor(item.target / unit[c]) % 10} ${c}`).join(', ')}</p>}
    </div>
  );
}

export function Fraction({ activity, onAnswer, onDone }: Of<'fraction'>) {
  const loop = useLoop(activity.items.length, onDone);
  const item = activity.items[loop.i]!;
  const clock = useItemClock(loop.i);
  const [on, setOn] = useState<boolean[]>([]);
  const [state, setState] = useState<'right' | 'wrong' | null>(null);
  useEffect(() => { setOn(Array(item.den).fill(false)); setState(null); }, [loop.i, item.den]);
  const count = on.filter(Boolean).length;
  const check = () => {
    const ok = count === item.num; setState(ok ? 'right' : 'wrong'); right(ok);
    if (ok || loop.last) { onAnswer({ item: `shade ${item.num}/${item.den}`, correct: ok, ms: clock(), tries: loop.tries, hints: 0 }); loop.settle(ok, ok ? 900 : 1800); }
    else { loop.setTries(loop.tries + 1); setTimeout(() => setState(null), 900); }
  };
  return (
    <div className="space-y-5 text-center">
      <Dots n={activity.items.length} at={loop.i} results={loop.results} />
      <p className="text-xl font-bold">Shade <span className="font-display text-4xl">{item.num}/{item.den}</span> of the bar</p>
      <div className="mx-auto flex max-w-lg gap-1" role="group" aria-label={`Bar in ${item.den} equal parts`}>
        {on.map((x, k) => <button key={k} type="button" aria-pressed={x} aria-label={`Part ${k + 1}`} disabled={state === 'right'} onClick={() => setOn((o) => o.map((y, j) => (j === k ? !y : y)))} className={cn('h-16 flex-1 rounded-md transition-colors', focusRing, x ? 'bg-teal' : 'bg-card hover:bg-teal-100 dark:hover:bg-night-700')} />)}
      </div>
      <p className="font-semibold" aria-live="polite">{count} of {item.den} parts shaded</p>
      <button type="button" onClick={check} disabled={state === 'right' || !count} className={buttonClass({ color: 'action', size: 'lg' })}><Check /> Check</button>
      {state === 'wrong' && loop.last && <div className="flex justify-center"><FractionPicture num={item.num} den={item.den} /></div>}
    </div>
  );
}

export function Convince({ activity, onAnswer, onDone }: Of<'convince'>) {
  const place = useMathsPlace();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [cards, setCards] = useState<ZuvaCard[]>([]);
  const [reply, setReply] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [start] = useState(Date.now());
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const send = async () => {
    setBusy(true); setError(null); setCards([]); setReply('');
    try {
      await streamZuva({ mode: 'maths', message: `Please check my reasoning with maths_check_reasoning.\n\nQuestion: ${activity.prompt}\n\nMy explanation:\n${text}`.slice(0, 2000), maths: { stage: place?.stage ?? 1, unitId: place?.unitId, activityId: activity.id, kind: 'convince', task: activity.prompt, support: place?.support } }, (e) => {
        if (e.t === 'card') setCards((c) => [...c, e.card]); else if (e.t === 'text') setReply(e.text); else if (e.t === 'error') setError(e.message);
      });
    } catch (e) { setError(errorMessage(e)); } finally { setBusy(false); }
  };
  const fb = cards.find((c) => c.kind === 'maths_feedback');
  return (
    <div className="space-y-4">
      <div className="rounded-md bg-card p-4">
        <p className="text-lg font-semibold">{activity.prompt}</p>
        <div className="mt-2 flex flex-wrap gap-1">
          {activity.hint && <button type="button" className={helperPill} onClick={() => setShowHint(true)}><Lightbulb /> A hint</button>}
          <MathsGloss activityId={activity.id} field="prompt" />
        </div>
        {showHint && activity.hint && <p className="mt-2 text-[15px]">{activity.hint}</p>}
      </div>
      <textarea aria-label="Your explanation" value={text} onChange={(e) => setText(e.target.value)} rows={5} maxLength={1500} className="input w-full text-base leading-relaxed" placeholder="I think… because… For example…" />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-[15px] text-muted-fg">{words} words. Use examples and say why.</span>
        <div className="flex gap-2">
          <button type="button" disabled={words < 4 || busy} aria-busy={busy || undefined} onClick={() => void send()} className={buttonClass({ color: 'action' })}><Sparkles /> {busy ? 'Zuva is reading…' : 'Check my reasoning'}</button>
          {fb && <button type="button" onClick={() => { onAnswer({ item: activity.prompt.slice(0, 160), correct: fb.kind === 'maths_feedback' && fb.verdict !== 'not yet', ms: Date.now() - start, tries: 1, hints: showHint ? 1 : 0, input: 'type' }); onDone(); }} className={buttonClass({ variant: 'outlined' })}><Check /> Finish</button>}
        </div>
      </div>
      {error && <p role="alert" className="text-[15px] font-semibold text-red-700 dark:text-red-300">{error}</p>}
      {cards.map((c, k) => <ZuvaCardView key={k} card={c} kids onAsk={() => {}} />)}
      {reply && <div className="rounded-md bg-card p-4 text-[17px]">{reply}</div>}
    </div>
  );
}
