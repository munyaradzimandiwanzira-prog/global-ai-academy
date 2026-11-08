import { useEffect, useId, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowRight, ChevronDown, Lock } from '@/components/icons';
import { TrackMark } from '@/components/ui';
import { getCatalogTrack, lessonPath, tracksByCategory } from '@/lib/catalog';
import { CATEGORY_BLURBS, CATEGORY_LABELS, CATEGORY_SHORT, LEVEL_LABELS, type TrackCategory } from '@shared/content';
import { cn } from '@/lib/utils';
import { ESL_BANDS } from '@shared/esl-curriculum';

type Panel = TrackCategory | 'cambridge';

/**
 * The bar under the header, laid like a Great Zimbabwe wall: every learning path is a stone,
 * coursed into three compartments (school, foundations, specialise), one course each, that
 * wrap instead of scrolling sideways, so every path is visible at once. A chevron frieze, like the one on the
 * Great Enclosure, caps the wall. Topics with one track link straight to it; the rest open a
 * panel listing their tracks with level, size and whether they are free.
 */
const COMPARTMENTS: { label: string; items: Panel[] }[] = [
  { label: 'School', items: ['cambridge', 'kids', 'start'] },
  { label: 'Foundations', items: ['languages', 'web', 'frameworks', 'databases', 'tools'] },
  { label: 'Specialise', items: ['maths-data', 'ai', 'agentic', 'mobile', 'cloud', 'hardware'] },
];

/** The chevron band of the Great Enclosure's outer wall, as a repeating strip. */
const CHEVRON = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='8'%3E%3Cpath d='M0 7 8 1 16 7' fill='none' stroke='%23E2B13C' stroke-opacity='.55' stroke-width='1.5'/%3E%3C/svg%3E")`;

export function CategoryBar() {
  const groups = tracksByCategory();
  const byCat = new Map(groups.map((g) => [g.category, g.tracks]));
  const [open, setOpen] = useState<Panel | null>(null);
  const location = useLocation();
  const root = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const current: Panel | undefined = location.pathname.startsWith('/cambridge') ? 'cambridge' : location.pathname.startsWith('/kids') ? 'kids' : getCatalogTrack(location.pathname.split('/')[2] ?? '')?.category;

  useEffect(() => setOpen(null), [location.pathname]);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => root.current && !root.current.contains(e.target as Node) && setOpen(null);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(null);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);

  // On phones the wall folds to the School course; the choice is remembered on this device.
  const [allPaths, setAllPaths] = useState(() => { try { return localStorage.getItem('gaa:paths-open') === '1'; } catch { return false; } });
  const flipAllPaths = () => setAllPaths((v) => { try { localStorage.setItem('gaa:paths-open', v ? '0' : '1'); } catch { /* private mode */ } return !v; });

  const toggle = (cat: Panel) => setOpen(open === cat ? null : cat);
  const active = groups.find((g) => g.category === open);
  // A dressed stone: flat face, a darker bed joint underneath, no mortar between stones.
  const stone = (on: boolean) => cn(
    'flex grow items-center justify-center gap-1 rounded-[3px] px-2 py-1.5 text-[12.5px] font-semibold leading-none transition-colors sm:px-2.5 sm:text-[13.5px]',
    'shadow-[inset_0_-2px_0_rgba(0,0,0,0.28),inset_0_1px_0_rgba(255,255,255,0.06)]',
    on ? 'bg-gold text-ink' : 'bg-white/[0.08] text-white/90 hover:bg-white/[0.16] hover:text-white',
  );

  const renderStone = (cat: Panel) => {
    const on = current === cat || open === cat;
    if (cat === 'cambridge') {
      return (
        <button key={cat} type="button" className={stone(on)} aria-expanded={open === cat} aria-controls={open === cat ? panelId : undefined} onClick={() => toggle(cat)}>
          Cambridge <span className={cn('rounded-sm px-1 py-0.5 text-[9.5px] font-bold uppercase', on ? 'bg-ink text-gold' : 'bg-gold text-ink')}>New</span>
          <ChevronDown className={cn('text-[18px] transition-transform', open === cat && 'rotate-180')} />
        </button>
      );
    }
    const tracks = byCat.get(cat);
    if (!tracks?.length) return null;
    if (tracks.length === 1) {
      return (
        <Link key={cat} to={cat === 'kids' ? '/kids' : lessonPath(tracks[0]!.id)} className={stone(on)} aria-current={current === cat ? 'page' : undefined}>
          {CATEGORY_SHORT[cat]}
        </Link>
      );
    }
    return (
      <button key={cat} type="button" className={stone(on)} aria-expanded={open === cat} aria-controls={open === cat ? panelId : undefined} onClick={() => toggle(cat)}>
        {CATEGORY_SHORT[cat]}
        <ChevronDown className={cn('text-[18px] transition-transform', open === cat && 'rotate-180')} />
      </button>
    );
  };

  return (
    <div ref={root} className="relative bg-ink text-white dark:bg-night-800">
      <nav aria-label="Learning paths" className="container py-1.5 md:py-2">
        <div className="grid gap-y-1.5">
          {COMPARTMENTS.map((c, i) => (
            <section key={c.label} id={i > 0 ? `${panelId}-c${i}` : undefined} aria-label={c.label} className={cn('min-w-0 items-start gap-2.5', i > 0 && !allPaths ? 'hidden sm:flex' : 'flex')}>
              <h2 className="w-[68px] shrink-0 pt-2 text-[9px] font-bold uppercase tracking-[0.06em] text-gold/80 sm:w-[96px] sm:text-[10.5px] sm:tracking-[0.14em]">{c.label}</h2>
              <div className="flex min-w-0 flex-1 flex-wrap gap-1">
                {c.items.map(renderStone)}
                {i === COMPARTMENTS.length - 1 && (
                  <Link to="/tutorials" className="flex shrink-0 items-center gap-1 px-2 py-1.5 text-[12.5px] text-white/75 hover:text-white sm:text-[13px]">
                    All tracks <ArrowRight />
                  </Link>
                )}
                {/* Takes the slack in the last course so its stones keep their natural size. */}
                <span aria-hidden="true" className="grow-[12]" />
              </div>
            </section>
          ))}
          <button type="button" onClick={flipAllPaths} aria-expanded={allPaths} aria-controls={`${panelId}-c1 ${panelId}-c2`}
            className="flex w-full items-center justify-center gap-1 rounded-[3px] border border-dashed border-gold/50 py-1 text-[12px] font-semibold text-gold sm:hidden">
            {allPaths ? 'Show fewer paths' : 'Show all paths'}
            <ChevronDown className={cn('text-[18px] transition-transform', allPaths && 'rotate-180')} />
          </button>
        </div>
      </nav>
      <div aria-hidden="true" className="h-2 bg-repeat-x" style={{ backgroundImage: CHEVRON, backgroundSize: '16px 8px' }} />

      {open === 'cambridge' && (
        <div id={panelId} role="region" aria-label="Cambridge curriculum" className="absolute inset-x-0 top-full z-40 border-b border-border bg-card text-fg shadow-float">
          <div className="container py-6">
            <div className="max-w-5xl">
              <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
                <h2 className="font-display text-lg font-bold">Cambridge curriculum</h2>
                <Link to="/cambridge" className="text-sm font-semibold text-teal-600 hover:underline dark:text-teal-400">All Cambridge courses</Link>
              </div>
              <p className="mt-1 max-w-2xl text-[15px] text-muted-fg">Courses that follow Cambridge stages and levels, taught by Zuva. Our own mapping, not endorsed by Cambridge.</p>
              <ul className="mt-4 grid gap-x-6 sm:grid-cols-2">
                <li className="border-b border-border">
                  <Link to="/cambridge/esl" className="group flex items-center gap-3 py-2.5">
                    <span className="grid h-8 w-8 place-items-center rounded-lg bg-gold-100 text-lg" aria-hidden="true">🗣️</span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold group-hover:text-teal-600 dark:group-hover:text-teal-400">English as a Second Language</span>
                      <span className="block text-[13px] text-muted-fg">Ages 2–20 · {ESL_BANDS.length} levels · 36 weeks · first 4 weeks free</span>
                    </span>
                  </Link>
                </li>
                <li className="border-b border-border">
                  <Link to="/kids/curriculum" className="group flex items-center gap-3 py-2.5">
                    <span className="grid h-8 w-8 place-items-center rounded-lg bg-teal-50 text-lg" aria-hidden="true">🧮</span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold group-hover:text-teal-600 dark:group-hover:text-teal-400">Kids Zone by Cambridge stage</span>
                      <span className="block text-[13px] text-muted-fg">Coding, science and maths · Primary Stages 1–6 and Stage 7</span>
                    </span>
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

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
