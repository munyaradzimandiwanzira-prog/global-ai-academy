import { useState } from 'react';
import type { MathsFeedbackCard as Feedback, MathsGameCard as GameCard } from '@shared/zuva';
import { MATHS_KIND_INFO } from '@shared/maths';
import { Play } from '@/components/icons';
import { buttonClass } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { MathsPlayer, MathsIcon } from './MathsPlayer';
import { useMathsPlace } from './context';

/** A practice game Zuva made: play it right in the chat. */
export function MathsGameCard({ card }: { card: GameCard }) {
  const place = useMathsPlace();
  const [open, setOpen] = useState(false);
  const a = card.activity;
  if (open && place) return <div className="w-full"><MathsPlayer activity={a} unitId={card.unitId} /></div>;
  return (
    <div className="w-full max-w-sm rounded-md bg-card p-4 text-fg">
      <div className="flex items-center gap-3">
        <MathsIcon kind={a.kind} className="text-teal-700 dark:text-teal-300" />
        <div className="min-w-0"><p className="font-bold">{a.title}</p><p className="text-[15px] text-muted-fg">{MATHS_KIND_INFO[a.kind].skill}{card.reason ? ` · ${card.reason}` : ''}</p></div>
      </div>
      <button type="button" onClick={() => setOpen(true)} disabled={!place} className={buttonClass({ color: 'accent', fullWidth: true }, 'mt-3')}><Play /> {place ? 'Play this practice' : 'Open Cambridge Maths to play'}</button>
    </div>
  );
}

const VERDICT = { convincing: { text: 'Convincing!', cls: 'bg-teal-100 text-teal-900 dark:bg-teal-900 dark:text-teal-50' }, nearly: { text: 'Nearly there', cls: 'bg-gold-100 text-ink-900' }, 'not yet': { text: 'Not convincing yet', cls: 'bg-muted' } } as const;
export function MathsFeedbackCard({ card }: { card: Feedback }) {
  const v = VERDICT[card.verdict];
  return (
    <div className="w-full rounded-md bg-card p-4 text-fg">
      <p className={cn('inline-block rounded-md px-3 py-1 font-display font-bold', v.cls)}>{v.text}</p>
      {card.well.length > 0 && <div className="mt-3"><p className="font-bold text-teal-700 dark:text-teal-300">What works</p><ul className="list-disc pl-5 text-[15px]">{card.well.map((w) => <li key={w}>{w}</li>)}</ul></div>}
      {card.improve.length > 0 && <div className="mt-3"><p className="font-bold">To make it stronger</p><ul className="list-disc pl-5 text-[15px]">{card.improve.map((w) => <li key={w}>{w}</li>)}</ul></div>}
      {card.nextStep && <p className="mt-3 rounded-md bg-muted p-3 text-[15px]"><strong>Next:</strong> {card.nextStep}</p>}
    </div>
  );
}
