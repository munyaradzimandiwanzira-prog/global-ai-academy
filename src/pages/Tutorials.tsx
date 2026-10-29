import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { catalog, tracksByCategory, lessonPath } from '@/lib/catalog';
import { CATEGORY_BLURBS, CATEGORY_LABELS, CATEGORY_SHORT, type Level } from '@shared/content';
import { LevelBadge, ProgressBar, TrackMark } from '@/components/ui';
import { ArrowRight, Lock } from '@/components/icons';
import { useProgress } from '@/lib/progress';
import { cn } from '@/lib/utils';

const LEVELS: (Level | 'all')[] = ['all', 'beginner', 'intermediate', 'advanced'];
const LEVEL_TEXT: Record<string, string> = { all: 'All levels', beginner: 'Entry level', intermediate: 'Intermediate', advanced: 'Advanced' };

/**
 * The catalogue, organised for someone who has never been here: a three-step way in first,
 * then every track grouped by topic with a sentence on what the topic is for.
 */
export default function Tutorials() {
  const [level, setLevel] = useState<Level | 'all'>('all');
  const { trackProgress } = useProgress();
  const { hash } = useLocation();
  const startHere = catalog.find((t) => t.id === 'start-here');
  const groups = useMemo(
    () => tracksByCategory()
      .filter((g) => g.category !== 'start')
      .map((g) => ({ ...g, tracks: g.tracks.filter((t) => level === 'all' || t.level === level) }))
      .filter((g) => g.tracks.length),
    [level],
  );
  const total = catalog.filter((t) => t.category !== 'start').length;

  // Arriving from the topic bar ("/tutorials#databases") scrolls to that topic once it renders.
  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView({ block: 'start' });
  }, [hash]);

  return (
    <div className="container py-10 md:py-14">
      <h1 className="display-lg">Tutorials</h1>
      <p className="lede mt-3 max-w-2xl text-fg/80">
        {total} tracks in {groups.length} topics. Core tracks are free; professional tracks start with a free preview. Every lesson has code you can run.
      </p>

      {/* The way in: three steps for a newcomer, in the order they should take them. */}
      <section aria-labelledby="new-here" className="mt-8 rounded-[20px] border border-border bg-card p-6 md:p-8">
        <h2 id="new-here" className="font-display text-xl font-bold">New here? Three steps</h2>
        <ol className="mt-4 grid gap-x-8 gap-y-5 md:grid-cols-3">
          <li>
            <span className="eyebrow">Step 1</span>
            <Link to={startHere ? lessonPath(startHere.id) : '/learn/start-here'} className="group mt-1 block">
              <span className="block font-semibold group-hover:text-teal-600">Take the Start here track</span>
              <span className="mt-1 block text-[15px] text-muted-fg">{startHere?.lessons.length ?? 6} short lessons on how code, computers and this site work.</span>
            </Link>
          </li>
          <li>
            <span className="eyebrow">Step 2</span>
            <Link to="/start" className="group mt-1 block">
              <span className="block font-semibold group-hover:text-teal-600">Answer four questions</span>
              <span className="mt-1 block text-[15px] text-muted-fg">We suggest the right first track for your age, goal and time.</span>
            </Link>
          </li>
          <li>
            <span className="eyebrow">Step 3</span>
            <Link to="/careers" className="group mt-1 block">
              <span className="block font-semibold group-hover:text-teal-600">Pick a career path</span>
              <span className="mt-1 block text-[15px] text-muted-fg">Tracks in order, with a project at each stage, for the job you want.</span>
            </Link>
          </li>
        </ol>
      </section>

      {/* Topic jump links + level filter */}
      <div className="sticky top-[113px] z-20 -mx-4 mt-10 border-y border-border bg-bg/95 px-4 py-3 backdrop-blur-sm supports-[backdrop-filter]:bg-bg/80">
        <nav aria-label="Jump to a topic" className="flex gap-1.5 overflow-x-auto scrollbar-none">
          {groups.map((g) => (
            <a key={g.category} href={`#${g.category}`} className="shrink-0 rounded-full border border-border px-3 py-1.5 text-sm font-medium hover:bg-muted">
              {CATEGORY_SHORT[g.category]}
            </a>
          ))}
        </nav>
        <div className="mt-2 flex flex-wrap gap-1.5" role="group" aria-label="Filter by level">
          {LEVELS.map((l) => (
            <button key={l} type="button" aria-pressed={level === l} onClick={() => setLevel(l)} className={cn('rounded-full px-3 py-1 text-[13px] font-semibold', level === l ? 'bg-ink text-white dark:bg-sand dark:text-ink' : 'text-muted-fg hover:bg-muted')}>
              {LEVEL_TEXT[l]}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-10 space-y-14">
        {groups.map((g) => (
          <section key={g.category} id={g.category} aria-labelledby={`h-${g.category}`} className="scroll-mt-[220px]">
            <div className="grid gap-2 border-b border-border pb-4 md:grid-cols-[minmax(0,22rem)_1fr] md:items-end md:gap-8">
              <h2 id={`h-${g.category}`} className="display-md">{CATEGORY_LABELS[g.category]}</h2>
              <p className="text-fg/75">{CATEGORY_BLURBS[g.category]}</p>
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {g.tracks.map((t) => {
                const p = trackProgress(t.id, t.lessons.length);
                return (
                  <Link key={t.id} to={t.category === 'kids' ? '/kids' : lessonPath(t.id)} className="group card flex flex-col p-5 transition-colors hover:border-teal/50">
                    <div className="flex items-start gap-3">
                      <TrackMark short={t.short} color={t.color} size={44} />
                      <div className="min-w-0 flex-1">
                        <h3 className="font-display text-lg font-bold leading-snug group-hover:text-teal-600">{t.title}</h3>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-[13px] text-muted-fg">
                          <LevelBadge level={t.level} /> {t.lessons.length} lessons
                          {t.premium && <span className="inline-flex items-center gap-0.5"><Lock /> Plus after the preview</span>}
                        </div>
                      </div>
                    </div>
                    <p className="mt-3 flex-1 text-[15px] text-muted-fg">{t.summary}</p>
                    {p.done > 0 ? (
                      <div className="mt-4">
                        <div className="mb-1 flex justify-between text-xs text-muted-fg"><span>Your progress</span><span>{p.percent}%</span></div>
                        <ProgressBar value={p.percent} />
                      </div>
                    ) : (
                      <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-teal-600 dark:text-teal-400">Start the track <ArrowRight /></span>
                    )}
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
