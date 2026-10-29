import { useEffect, useId, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowRight, ChevronDown, Lock } from '@/components/icons';
import { TrackMark } from '@/components/ui';
import { getCatalogTrack, lessonPath, tracksByCategory } from '@/lib/catalog';
import { CATEGORY_BLURBS, CATEGORY_LABELS, CATEGORY_SHORT, LEVEL_LABELS, type TrackCategory } from '@shared/content';
import { cn } from '@/lib/utils';

/**
 * The bar under the header: one entry per topic instead of a long row of language names.
 * Topics with one track link straight to it; the rest open a panel listing their tracks with
 * level, size and whether they are free, so a newcomer can choose without opening each one.
 *
 * The panel renders outside the horizontally scrolling strip, so it is never clipped on phones.
 */
export function CategoryBar() {
  const groups = tracksByCategory();
  const [open, setOpen] = useState<TrackCategory | null>(null);
  const location = useLocation();
  const root = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const current = getCatalogTrack(location.pathname.split('/')[2] ?? '')?.category;

  useEffect(() => setOpen(null), [location.pathname]);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => root.current && !root.current.contains(e.target as Node) && setOpen(null);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(null);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);

  const toggle = (cat: TrackCategory, button: HTMLElement) => {
    setOpen(open === cat ? null : cat);
    // On phones the strip scrolls sideways; keep the chosen topic in view.
    button.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  };

  const active = groups.find((g) => g.category === open);
  const item = 'flex shrink-0 items-center gap-1 border-b-2 px-3 py-2.5 text-[14px] font-semibold transition-colors hover:bg-white/10';

  return (
    <div ref={root} className="relative bg-ink text-white dark:bg-night-800">
      <nav aria-label="Tutorials by topic" className="container flex items-center overflow-x-auto scrollbar-none">
        {groups.map(({ category, tracks }) => {
          const isCurrent = current === category;
          const cls = cn(item, isCurrent || open === category ? 'border-gold text-gold' : 'border-transparent text-white/90');
          if (tracks.length === 1) {
            return (
              <Link key={category} to={category === 'kids' ? '/kids' : lessonPath(tracks[0].id)} className={cls} aria-current={isCurrent ? 'page' : undefined}>
                {CATEGORY_SHORT[category]}
              </Link>
            );
          }
          return (
            <button
              key={category}
              type="button"
              className={cls}
              aria-expanded={open === category}
              aria-controls={open === category ? panelId : undefined}
              onClick={(e) => toggle(category, e.currentTarget)}
            >
              {CATEGORY_SHORT[category]}
              <ChevronDown className={cn('transition-transform', open === category && 'rotate-180')} />
            </button>
          );
        })}
        <Link to="/tutorials" className="ml-auto flex shrink-0 items-center gap-1 px-3 py-2.5 text-[14px] text-white/80 hover:text-white">
          All tracks <ArrowRight />
        </Link>
      </nav>

      {active && (
        <div
          id={panelId}
          role="region"
          aria-label={CATEGORY_LABELS[active.category]}
          className="absolute inset-x-0 top-full z-40 border-b border-border bg-card text-fg shadow-float"
        >
          <div className="container py-6">
            <div className="max-w-5xl">
              <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
                <h2 className="font-display text-lg font-bold">{CATEGORY_LABELS[active.category]}</h2>
                <Link to={`/tutorials#${active.category}`} className="text-sm font-semibold text-teal-600 hover:underline dark:text-teal-400">See them on the tutorials page</Link>
              </div>
              <p className="mt-1 max-w-2xl text-[15px] text-muted-fg">{CATEGORY_BLURBS[active.category]}</p>
              <ul className="mt-4 grid gap-x-6 sm:grid-cols-2 lg:grid-cols-3">
                {active.tracks.map((t) => (
                  <li key={t.id} className="border-b border-border">
                    <Link to={lessonPath(t.id)} className="group flex items-center gap-3 py-2.5">
                      <TrackMark short={t.short} color={t.color} size={32} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold group-hover:text-teal-600 dark:group-hover:text-teal-400">{t.title}</span>
                        <span className="block text-[13px] text-muted-fg">
                          {LEVEL_LABELS[t.level]} · {t.lessons.length} lessons{t.premium ? ' · free preview, then Plus' : ' · free'}
                        </span>
                      </span>
                      {t.premium && <Lock className="text-muted-fg" label="Plus" />}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
