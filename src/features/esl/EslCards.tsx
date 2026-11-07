import { useState } from 'react';
import { ACTIVITY_INFO } from '@shared/esl';
import type { EslFeedbackCard as FeedbackCard, EslGameCard as GameCard } from '@shared/zuva';
import { Play, Star } from '@/components/icons';
import { cn } from '@/lib/utils';
import { GamePlayer } from './GamePlayer';
import { useEslPlace } from './EslContext';

/** A game Zuva offers in the chat: tap Play to play it right there. */
export function EslGameCard({ card }: { card: GameCard }) {
  const place = useEslPlace();
  const [open, setOpen] = useState(false);
  const a = card.activity;
  if (open && place) {
    return <div className="w-full"><GamePlayer activity={a} week={place.week} band={place.band} accent={place.accent} signedIn={place.signedIn} guest={place.guest} sessionId={place.sessionId} /></div>;
  }
  return (
    <div className="w-full max-w-sm rounded-2xl border-2 border-ink bg-white p-4 text-ink">
      <div className="flex items-center gap-3">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[#FFF8EA] text-2xl" aria-hidden="true">{ACTIVITY_INFO[a.kind].emoji}</span>
        <div className="min-w-0">
          <p className="font-bold">{a.title}</p>
          <p className="text-sm text-ink/80">{ACTIVITY_INFO[a.kind].title}{card.reason ? ` · ${card.reason}` : ''}{a.origin === 'zuva' ? ' · made for you' : ''}</p>
        </div>
      </div>
      {a.kind === 'story' && a.source && <p className="mt-2 text-xs text-ink/70">From {a.source.title} ({a.source.licence})</p>}
      <button type="button" onClick={() => setOpen(true)} disabled={!place} className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full border-4 border-ink bg-gold font-bold disabled:opacity-50"><Play className="h-5 w-5" /> {place ? 'Play' : 'Open the English course to play'}</button>
    </div>
  );
}

export function EslFeedbackCard({ card }: { card: FeedbackCard }) {
  return (
    <div className="w-full rounded-2xl border-2 border-ink bg-white p-4 text-ink">
      <p className="font-display text-lg font-bold">{card.title} <span className="text-sm font-normal text-ink/70">({card.wordCount} words)</span></p>
      <ul className="mt-3 space-y-2">
        {card.scores.map((s) => (
          <li key={s.criterion}>
            <div className="flex items-center justify-between gap-2 text-sm font-semibold"><span>{s.criterion}</span>
              <span className="flex" aria-label={`${s.band} out of 5`}>{[1, 2, 3, 4, 5].map((n) => <Star key={n} className={cn('h-4 w-4', n <= s.band ? 'fill-gold text-gold' : 'text-ink/20')} />)}</span>
            </div>
            <p className="text-sm text-ink/80">{s.comment}</p>
          </li>
        ))}
      </ul>
      {card.well.length > 0 && <div className="mt-3"><p className="text-sm font-bold text-teal-700">What you did well</p><ul className="list-disc pl-5 text-sm">{card.well.map((w) => <li key={w}>{w}</li>)}</ul></div>}
      {card.corrections.length > 0 && (
        <div className="mt-3"><p className="text-sm font-bold">Fix these</p>
          <ul className="space-y-1.5 text-sm">{card.corrections.map((c, i) => <li key={i}><span className="text-[#9B2C1D] line-through">{c.wrong}</span> → <span className="font-semibold text-teal-700">{c.right}</span> <span className="text-ink/75">({c.why})</span></li>)}</ul>
        </div>
      )}
      {card.nextStep && <p className="mt-3 rounded-xl bg-[#D6EBE8] p-3 text-sm"><strong>Next step:</strong> {card.nextStep}</p>}
    </div>
  );
}
