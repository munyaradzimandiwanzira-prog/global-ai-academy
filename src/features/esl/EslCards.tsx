import { useState } from 'react';
import { ACTIVITY_INFO } from '@shared/esl';
import type { EslFeedbackCard as FeedbackCard, EslGameCard as GameCard } from '@shared/zuva';
import { Play, Star } from '@/components/icons';
import { cn } from '@/lib/utils';
import { GamePlayer } from './GamePlayer';
import { useEslPlace } from './EslContext';
import { GameIcon } from './ui';
import { buttonClass } from '@/components/ui/Button';

/** A game Zuva offers in the chat: tap Play to play it right there. */
export function EslGameCard({ card }: { card: GameCard }) {
  const place = useEslPlace();
  const [open, setOpen] = useState(false);
  const a = card.activity;
  if (open && place) {
    return <div className="w-full"><GamePlayer activity={a} week={place.week} band={place.band} accent={place.accent} signedIn={place.signedIn} guest={place.guest} sessionId={place.sessionId} /></div>;
  }
  return (
    <div className="w-full max-w-sm rounded-md bg-card p-4 text-fg">
      <div className="flex items-center gap-3">
        <GameIcon kind={a.kind} className="text-teal-700 dark:text-teal-300" />
        <div className="min-w-0">
          <p className="font-bold">{a.title}</p>
          <p className="text-[15px] text-muted-fg">{ACTIVITY_INFO[a.kind].title}{card.reason ? ` · ${card.reason}` : ''}{a.origin === 'zuva' ? ' · made for you' : ''}</p>
        </div>
      </div>
      {a.kind === 'story' && a.source && <p className="mt-2 text-sm text-muted-fg">From {a.source.title} ({a.source.licence})</p>}
      <button type="button" onClick={() => setOpen(true)} disabled={!place} className={buttonClass({ color: 'accent', fullWidth: true }, 'mt-3')}><Play /> {place ? 'Play this game' : 'Open the English course to play'}</button>
    </div>
  );
}

export function EslFeedbackCard({ card }: { card: FeedbackCard }) {
  return (
    <div className="w-full rounded-md bg-card p-4 text-fg">
      <p className="font-display text-lg font-bold">{card.title} <span className="text-[15px] font-normal text-muted-fg">({card.wordCount} words)</span></p>
      <ul className="mt-3 space-y-2">
        {card.scores.map((s) => (
          <li key={s.criterion}>
            <div className="flex items-center justify-between gap-2 font-semibold"><span>{s.criterion}</span>
              <span className="flex" role="img" aria-label={`${s.band} out of 5`}>{[1, 2, 3, 4, 5].map((n) => <Star key={n} className={cn('text-[20px]', n <= s.band ? 'text-gold-700 dark:text-gold' : 'text-fg/20')} />)}</span>
            </div>
            <p className="text-[15px]">{s.comment}</p>
          </li>
        ))}
      </ul>
      {card.well.length > 0 && <div className="mt-3"><p className="font-bold text-teal-700 dark:text-teal-300">What you did well</p><ul className="list-disc pl-5 text-[15px]">{card.well.map((w) => <li key={w}>{w}</li>)}</ul></div>}
      {card.corrections.length > 0 && (
        <div className="mt-3"><p className="font-bold">Fix these</p>
          <ul className="space-y-1.5 text-[15px]">{card.corrections.map((c, i) => <li key={i}><span className="text-red-700 line-through dark:text-red-300">{c.wrong}</span> → <span className="font-semibold text-teal-700 dark:text-teal-300">{c.right}</span> <span className="text-muted-fg">({c.why})</span></li>)}</ul>
        </div>
      )}
      {card.nextStep && <p className="mt-3 rounded-md bg-muted p-3 text-[15px]"><strong>Next step:</strong> {card.nextStep}</p>}
    </div>
  );
}
