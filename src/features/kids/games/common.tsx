import { Star } from '@/components/icons';
import { useKidsStars } from '../kidsStore';
import { cn } from '@/lib/utils';

/** Level buttons used by every game: big touch targets, stars earned shown on each. */
export function LevelTabs({ prefix, count, current, onPick, labels }: { prefix: string; count: number; current: number; onPick: (i: number) => void; labels?: string[] }) {
  const { stars } = useKidsStars();
  return (
    <div className="mb-5 flex flex-wrap justify-center gap-2" role="tablist" aria-label="Levels">
      {Array.from({ length: count }, (_, i) => {
        const earned = stars[`${prefix}:${i + 1}`] ?? 0;
        return (
          <button
            key={i}
            role="tab"
            aria-selected={current === i}
            onClick={() => onPick(i)}
            className={cn('flex min-h-11 items-center gap-1 rounded-full border-2 px-4 py-2 font-bold transition-transform active:scale-95', current === i ? 'border-ink bg-ink text-white' : 'border-ink/20 bg-white')}
          >
            {labels?.[i] ?? `Level ${i + 1}`}
            {earned > 0 && (
              <span className="ml-1 flex" aria-label={`${earned} stars`}>
                {Array.from({ length: earned }, (_, s) => <Star key={s} className="h-4 w-4 fill-gold text-gold" />)}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/** Stars shown at the end of a level. */
export function StarRow({ n, className }: { n: number; className?: string }) {
  return (
    <span className={cn('inline-flex gap-1', className)} aria-label={`${n} of 3 stars`}>
      {[1, 2, 3].map((s) => <Star key={s} className={cn('h-7 w-7', s <= n ? 'fill-gold text-gold' : 'text-ink/25')} />)}
    </span>
  );
}

export const kidButton = 'min-h-11 rounded-full border-4 border-ink px-5 py-2 text-lg font-bold transition-transform active:scale-95 disabled:opacity-40';
