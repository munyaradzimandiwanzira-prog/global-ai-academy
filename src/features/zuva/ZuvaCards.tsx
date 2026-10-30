import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { ExperimentCard, QuizCard, ZuvaCard } from '@shared/zuva';
import { kidGame } from '@shared/kids-games';
import { CheckCircle2, Circle, Science, ShieldCheck, ShoppingBasket, Quiz, ArrowRight } from '@/components/icons';
import { storage, cn } from '@/lib/utils';

const SAFETY = {
  easy: { label: 'You can do this on your own', tone: 'bg-[#D6EBE8] text-ink' },
  helper: { label: 'Ask a grown-up to stay nearby', tone: 'bg-[#F7E3B0] text-ink' },
  adult: { label: 'A grown-up must help with this', tone: 'bg-[#F6C9C4] text-ink' },
} as const;

/** Ticks persist per experiment on this device, so a child can gather materials over a few days. */
function useTicks(key: string) {
  const store = storage<Record<string, boolean>>(`gaa:zuva:ticks:${key}`, {});
  const [ticks, setTicks] = useState<Record<string, boolean>>(store.get);
  useEffect(() => store.set(ticks), [ticks]); // eslint-disable-line react-hooks/exhaustive-deps
  return [ticks, (k: string) => setTicks((t) => ({ ...t, [k]: !t[k] }))] as const;
}

export function ExperimentCardView({ card, kids, onAsk }: { card: ExperimentCard; kids: boolean; onAsk: (text: string) => void }) {
  const [ticks, toggle] = useTicks(card.id ?? card.title);
  const have = card.materials.filter((m) => ticks[`m:${m.item}`]).length;
  const toBuy = card.materials.filter((m) => !ticks[`m:${m.item}`]).reduce((s, m) => s + (m.approxUsd ?? 0), 0);
  const doneSteps = card.steps.filter((_, i) => ticks[`s:${i}`]).length;
  const game = card.game ? kidGame(card.game) : undefined;
  const safety = SAFETY[card.safety.level];
  return (
    <div className={cn('overflow-hidden rounded-2xl border-2 bg-card text-fg', kids ? 'border-ink' : 'border-border')}>
      <div className="flex items-start gap-3 bg-[#23807F] px-4 py-3 text-white">
        <Science className="mt-0.5 shrink-0" />
        <div>
          <div className="font-display text-lg font-bold leading-tight">{card.title}</div>
          <div className="text-sm text-white/90">{card.goal}</div>
        </div>
      </div>
      <div className="space-y-4 p-4 text-[15px]">
        <div className={cn('rounded-xl p-3', safety.tone)}>
          <div className="flex items-center gap-2 font-bold"><ShieldCheck /> {safety.label}</div>
          <ul className="mt-1 list-disc pl-6">{card.safety.rules.map((r) => <li key={r}>{r}</li>)}</ul>
        </div>
        <div>
          <div className="flex items-center justify-between gap-2">
            <h4 className="flex items-center gap-2 font-bold"><ShoppingBasket /> What you need</h4>
            <span className="text-sm text-muted-fg tabular">{have}/{card.materials.length} ready</span>
          </div>
          <ul className="mt-2 space-y-1.5">
            {card.materials.map((m) => {
              const on = !!ticks[`m:${m.item}`];
              return (
                <li key={m.item}>
                  <button type="button" onClick={() => toggle(`m:${m.item}`)} aria-pressed={on} className="flex w-full items-start gap-2 rounded-lg p-1.5 text-left hover:bg-muted">
                    {on ? <CheckCircle2 className="shrink-0 text-[#23807F]" /> : <Circle className="shrink-0 text-muted-fg" />}
                    <span className="min-w-0">
                      <span className={cn('font-semibold', on && 'line-through opacity-60')}>{m.qty ? `${m.qty} × ` : ''}{m.item}</span>
                      <span className="block text-sm text-muted-fg">Find it: {m.where}{m.approxUsd ? ` · about $${m.approxUsd.toFixed(2)}` : m.approxUsd === 0 ? ' · free' : ''}{m.substitute ? ` · or use: ${m.substitute}` : ''}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          <p className="mt-1 text-sm font-semibold">{toBuy > 0 ? `Still to get: about $${toBuy.toFixed(2)} if you buy them new.` : 'You have everything!'}</p>
        </div>
        <div>
          <div className="flex items-center justify-between">
            <h4 className="font-bold">Steps</h4>
            <span className="text-sm text-muted-fg tabular">{doneSteps}/{card.steps.length} done</span>
          </div>
          <ol className="mt-2 space-y-1.5">
            {card.steps.map((s, i) => {
              const on = !!ticks[`s:${i}`];
              return (
                <li key={i}>
                  <button type="button" onClick={() => toggle(`s:${i}`)} aria-pressed={on} className="flex w-full items-start gap-2 rounded-lg p-1.5 text-left hover:bg-muted">
                    <span className={cn('flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-sm font-bold', on ? 'bg-[#23807F] text-white' : 'bg-muted')}>{on ? '✓' : i + 1}</span>
                    <span className={cn(on && 'opacity-60')}>{s}</span>
                  </button>
                </li>
              );
            })}
          </ol>
        </div>
        <p className="rounded-xl bg-muted p-3"><b>The science: </b>{card.science}</p>
        {card.tryNext && <p><b>Try next: </b>{card.tryNext}</p>}
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => onAsk(`Guide me through "${card.title}" one step at a time. I'm on step ${Math.min(doneSteps + 1, card.steps.length)}.`)} className="btn-primary btn-sm">Guide me step by step</button>
          <button type="button" onClick={() => onAsk(`I don't have everything for "${card.title}". What can I use instead?`)} className="btn-outline btn-sm">Swap materials</button>
          {game && <Link to={`/kids/${game.id}`} className="btn-outline btn-sm">Play {game.title} <ArrowRight /></Link>}
        </div>
      </div>
    </div>
  );
}

export function QuizCardView({ card, kids }: { card: QuizCard; kids: boolean }) {
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const q = card.questions[i];
  const finished = i >= card.questions.length;
  return (
    <div className={cn('rounded-2xl border-2 bg-card p-4 text-fg', kids ? 'border-ink' : 'border-border')}>
      <div className="flex items-center gap-2 font-display text-lg font-bold"><Quiz /> {card.title}</div>
      {finished ? (
        <p className="mt-3 text-lg font-bold">You got {score} of {card.questions.length}! {score === card.questions.length ? 'Perfect!' : 'Nice work. Want to try again?'}</p>
      ) : (
        <>
          <p className="mt-3 font-semibold">{i + 1}. {q!.q}</p>
          <div className="mt-2 grid gap-2">
            {q!.options.map((o, k) => (
              <button
                key={k}
                type="button"
                disabled={picked !== null}
                onClick={() => { setPicked(k); if (k === q!.answer) setScore((s) => s + 1); }}
                className={cn('rounded-xl border-2 px-3 py-2 text-left', picked === null ? 'border-border hover:border-[#23807F]' : k === q!.answer ? 'border-[#23807F] bg-[#D6EBE8]' : k === picked ? 'border-[#E2553E] bg-[#FBE3DF]' : 'border-border opacity-60')}
              >
                {o}
              </button>
            ))}
          </div>
          {picked !== null && (
            <div className="mt-2">
              <p className="text-sm">{picked === q!.answer ? 'Correct! ' : 'Not quite. '}{q!.why}</p>
              <button type="button" onClick={() => { setI(i + 1); setPicked(null); }} className="btn-primary btn-sm mt-2">{i + 1 < card.questions.length ? 'Next question' : 'See my score'}</button>
            </div>
          )}
        </>
      )}
      {finished && <button type="button" onClick={() => { setI(0); setScore(0); setPicked(null); }} className="btn-outline btn-sm mt-2">Try again</button>}
    </div>
  );
}

export function ZuvaCardView({ card, kids, onAsk }: { card: ZuvaCard; kids: boolean; onAsk: (text: string) => void }) {
  return card.kind === 'experiment' ? <ExperimentCardView card={card} kids={kids} onAsk={onAsk} /> : <QuizCardView card={card} kids={kids} />;
}
