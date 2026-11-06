import { Link, useLocation } from 'react-router-dom';
import { Star } from '@/components/icons';
import { cn } from '@/lib/utils';
import { STRANDS, levelHref, levelsFor, stageLabel, stageRange, strandsFor } from '@shared/kids-curriculum';
import { useKidsStars } from './kidsStore';
import { useKidsStage } from './stage';

/**
 * Under each game: what every level teaches and which stage it suits, so a grown-up can see the
 * learning and a child can jump to the levels for their stage. Folded by default to keep the game first.
 */
export function LearnPanel({ game }: { game: string }) {
  const levels = levelsFor(game);
  const { stars } = useKidsStars();
  const [stage] = useKidsStage();
  const { search } = useLocation();
  if (!levels.length) return null;
  const range = stageRange(game);
  return (
    <details className="group mx-auto mt-10 max-w-3xl rounded-3xl border-4 border-ink bg-white">
      <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-5 py-3 text-lg font-bold [&::-webkit-details-marker]:hidden">
        <span>What you’ll learn <span className="ml-1 rounded-full bg-[#EEF4F3] px-2.5 py-0.5 text-sm text-ink/70">{stageLabel(range)}</span></span>
        <span aria-hidden="true" className="text-2xl leading-none transition-transform group-open:rotate-45">+</span>
      </summary>
      <div className="border-t-2 border-ink/10 px-5 pb-5 pt-3">
        <p className="text-[15px] text-ink/70">Practises {strandsFor(game).map((s) => STRANDS[s].name).join(', ')}. Stages follow the Cambridge Primary curriculum. <Link to="/kids/curriculum" className="font-semibold text-[#1F6F6E] underline underline-offset-4">How stages work</Link></p>
        <ol className="mt-3 divide-y-2 divide-ink/5">
          {levels.map((l, i) => {
            const earned = stars[l.key] ?? 0;
            const here = search === l.query;
            const mine = stage === l.stage;
            return (
              <li key={l.key}>
                <Link to={levelHref(l)} aria-current={here ? 'step' : undefined} className={cn('flex items-start gap-3 rounded-2xl px-2 py-2.5 hover:bg-[#F7FBFA]', here && 'bg-[#FFF4D6]')}>
                  <span className="mt-0.5 w-7 shrink-0 text-center text-lg font-bold text-ink/50 tabular">{i + 1}</span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="text-[17px] font-bold">{l.name}</span>
                      <span className={cn('rounded-full px-2 py-0.5 text-[12px] font-bold', mine ? 'bg-gold text-ink' : 'bg-[#EEF4F3] text-ink/70')}>Stage {l.stage}</span>
                    </span>
                    <span className="block text-[15px] leading-snug text-ink/75">{l.goal}</span>
                  </span>
                  <span className="mt-1 flex shrink-0" aria-label={`${earned} of 3 stars`}>{[1, 2, 3].map((n) => <Star key={n} className={cn('h-4 w-4', n <= earned ? 'fill-gold text-gold' : 'text-ink/20')} />)}</span>
                </Link>
              </li>
            );
          })}
        </ol>
      </div>
    </details>
  );
}
