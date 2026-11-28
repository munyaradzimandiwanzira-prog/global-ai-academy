import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowRight, ChevronDown, Lock, MaterialIcon } from '@/components/icons';
import { TrackMark } from '@/components/ui';
import { catalog, lessonPath } from '@/lib/catalog';
import { LEVEL_LABELS } from '@shared/content';
import { cn } from '@/lib/utils';
import { ESL_BANDS } from '@shared/esl-curriculum';
import { buildMenus, menuOfTrack, type Menu, type MenuId } from './learning-menu';

/**
 * The learning menu under the header: one row of dropdowns (AI/ML Learning, Cambridge, Coding,
 * Apps, Cloud & Hardware) plus direct links to the Kids Zone and Start here. Each stone is a dressed
 * block on the Great Zimbabwe wall; a chevron frieze, like the one on the Great Enclosure, caps it.
 * Opening a dropdown shows its sections side by side, each with the tracks in learning order,
 * their level, size and whether they are free.
 */

/** The chevron band of the Great Enclosure's outer wall, as a repeating strip. */
const CHEVRON = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='8'%3E%3Cpath d='M0 7 8 1 16 7' fill='none' stroke='%23E2B13C' stroke-opacity='.55' stroke-width='1.5'/%3E%3C/svg%3E")`;

const CAMBRIDGE_COURSES = [
  { to: '/cambridge/esl', short: 'En', color: '#C8961E', title: 'English as a Second Language', meta: `Ages 2–20 · ${ESL_BANDS.length} levels · help in Portuguese` },
  { to: '/cambridge/maths', short: 'Ma', color: '#284A80', title: 'Cambridge Maths', meta: 'Stages 1–6 · number, geometry, data · fresh practice daily' },
  { to: '/kids/curriculum', short: 'Kz', color: '#1F7A6E', title: 'Kids Zone by Cambridge stage', meta: 'Coding, science and maths · Primary Stages 1–6 and Stage 7' },
];

export function CategoryBar() {
  const menus = useMemo(() => buildMenus(catalog), []);
  const [open, setOpen] = useState<MenuId | null>(null);
  const location = useLocation();
  const root = useRef<HTMLDivElement>(null);
  const panelId = useId();

  const path = location.pathname;
  const current: MenuId | 'kids' | 'start' | undefined =
    path.startsWith('/cambridge') ? 'cambridge'
      : path.startsWith('/kids') ? 'kids'
        : path.startsWith('/learn/start-here') ? 'start'
          : path.startsWith('/learn/') ? menuOfTrack(menus, path.split('/')[2] ?? '')
            : undefined;

  useEffect(() => setOpen(null), [path]);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => root.current && !root.current.contains(e.target as Node) && setOpen(null);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(null);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);

  // A dressed stone: flat face, a darker bed joint underneath, no mortar between stones.
  const stone = (on: boolean) => cn(
    'flex min-h-11 items-center justify-center gap-1.5 rounded-[3px] px-3 text-[13.5px] font-semibold leading-none transition-[background-color,color,transform] duration-[180ms] active:scale-[.97] sm:min-h-9',
    'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold',
    on ? 'bg-gold text-ink' : 'bg-white/[0.09] text-white hover:bg-white/[0.17]',
  );

  const dropdown = (m: Pick<Menu, 'id' | 'label' | 'symbol'>) => (
    <button key={m.id} type="button" className={stone(current === m.id || open === m.id)} aria-expanded={open === m.id}
      aria-controls={open === m.id ? panelId : undefined} onClick={() => setOpen(open === m.id ? null : m.id)}>
      <MaterialIcon name={m.symbol} className="text-[20px] leading-none" />
      {m.label}
      <ChevronDown className={cn('text-[18px] transition-transform', open === m.id && 'rotate-180')} />
    </button>
  );

  const [aiml, ...rest] = menus;
  const active = menus.find((m) => m.id === open && m.id !== 'cambridge');

  return (
    <div ref={root} className="relative bg-ink text-white dark:bg-night-800">
      <nav aria-label="Learning paths" className="container py-1.5 md:py-2">
        <div className="flex flex-wrap items-center gap-1">
          {aiml && dropdown(aiml)}
          {dropdown({ id: 'cambridge', label: 'Cambridge', symbol: 'school' })}
          {rest.filter((m) => m.id !== 'cambridge').map(dropdown)}
          <Link to="/kids" className={stone(current === 'kids')} aria-current={current === 'kids' ? 'page' : undefined}>
            <MaterialIcon name="child_care" className="text-[20px] leading-none" />
            Kids Zone
          </Link>
          <Link to={lessonPath('start-here')} className={stone(current === 'start')} aria-current={current === 'start' ? 'page' : undefined}>
            <MaterialIcon name="flag" className="text-[20px] leading-none" />
            Start here
          </Link>
          <Link to="/tutorials" className="ml-auto flex min-h-11 shrink-0 items-center gap-1 px-2 text-[13.5px] text-white/85 underline-offset-4 hover:text-white hover:underline sm:min-h-9">
            All tracks <ArrowRight />
          </Link>
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
              <ul className="mt-4 grid gap-x-6 sm:grid-cols-2 lg:grid-cols-3">
                {CAMBRIDGE_COURSES.map((c) => (
                  <li key={c.to} className="border-b border-border">
                    <Link to={c.to} className="group flex items-center gap-3 py-2.5">
                      <TrackMark short={c.short} color={c.color} size={32} />
                      <span className="min-w-0 flex-1">
                        <span className="block font-semibold group-hover:text-teal-600 dark:group-hover:text-teal-400">{c.title}</span>
                        <span className="block text-[13px] text-muted-fg">{c.meta}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {active && (
        <div id={panelId} role="region" aria-label={active.label}
          className="absolute inset-x-0 top-full z-40 max-h-[calc(100vh-9rem)] overflow-y-auto overscroll-contain border-b border-border bg-card text-fg shadow-float">
          <div className="container py-6">
            <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
              <h2 className="font-display text-lg font-bold">{active.label}</h2>
              <Link to="/tutorials" className="text-sm font-semibold text-teal-600 hover:underline dark:text-teal-400">See every track</Link>
            </div>
            {/* Sections flow down balanced columns, so a long section never leaves a hole beside a short one. */}
            <div className={cn('mt-4 gap-x-8 sm:columns-2', active.sections.length > 3 ? 'xl:columns-3' : 'lg:columns-3')}>
              {active.sections.map((s) => (
                <section key={s.label} aria-label={s.label} className="mb-6 min-w-0 break-inside-avoid">
                  <h3 className="font-display text-[15px] font-bold text-gold-700 dark:text-gold">{s.label}</h3>
                  <p className="mt-0.5 text-[13px] text-muted-fg">{s.blurb}</p>
                  <ul className="mt-2">
                    {s.tracks.map((t) => (
                      <li key={t.id} className="border-b border-border last:border-b-0">
                        <Link to={lessonPath(t.id)} className="group flex items-center gap-3 py-1.5">
                          <TrackMark short={t.short} color={t.color} size={28} />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[15px] font-semibold group-hover:text-teal-600 dark:group-hover:text-teal-400">{t.title}</span>
                            <span className="block text-[12.5px] text-muted-fg">
                              {LEVEL_LABELS[t.level]} · {t.lessons.length} lessons{t.premium ? ' · free preview, then Plus' : ' · free'}
                            </span>
                          </span>
                          {t.premium && <Lock className="text-muted-fg" label="Plus" />}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
