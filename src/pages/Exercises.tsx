import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Trophy, Sparkles, CheckCircle2 } from '@/components/icons';
import { catalog, lessonPath } from '@/lib/catalog';
import type { CatalogTrack } from '@shared/content';
import { useProgress } from '@/lib/progress';
import { PageHeader, ProgressBar, TrackMark } from '@/components/ui';
import { cn } from '@/lib/utils';

export default function Exercises() {
  const [params, setParams] = useSearchParams();
  const selected = params.get('track');
  const { passed, activity } = useProgress();
  const tracks = useMemo(() => catalog.filter((t) => t.exerciseCount + t.challengeCount > 0), []);
  const shown = selected ? tracks.filter((t) => t.id === selected) : tracks;

  return (
    <div className="container py-10">
      <PageHeader title="Exercises & challenges" description="Short fill-in-the-blank exercises check that you remember the syntax. Coding challenges run your code against tests — and Coach Zuva helps if you get stuck." />
      <div className="mb-8 flex flex-wrap gap-2">
        <button onClick={() => setParams({})} className={cn('rounded-full border px-3.5 py-1.5 text-sm', !selected ? 'border-ink bg-ink text-white dark:border-gold dark:bg-gold dark:text-ink' : 'border-border hover:bg-muted')}>All</button>
        {tracks.map((t) => (
          <button key={t.id} onClick={() => setParams({ track: t.id })} className={cn('rounded-full border px-3.5 py-1.5 text-sm', selected === t.id ? 'border-ink bg-ink text-white dark:border-gold dark:bg-gold dark:text-ink' : 'border-border hover:bg-muted')}>
            {t.title}
          </button>
        ))}
      </div>
      <div className="grid gap-5 md:grid-cols-2">
        {shown.map((t) => {
          const solved = activity.filter((a) => a.trackId === t.id && a.passed && (a.kind === 'exercise' || a.kind === 'challenge')).length;
          const total = t.exerciseCount + t.challengeCount;
          return (
            <section key={t.id} className="card p-5">
              <div className="flex items-center justify-between gap-3">
                <h2 className="flex items-center gap-2 font-display text-xl font-semibold"><TrackMark short={t.short} color={t.color} size={32} />{t.title}</h2>
                <span className="text-sm text-muted-fg">{solved}/{total} done</span>
              </div>
              <ProgressBar value={(solved / Math.max(1, total)) * 100} className="mt-3" tone="gold" />
              <ul className="mt-4 divide-y divide-border">
                {t.lessons.filter((l: CatalogTrack['lessons'][number]) => l.hasExercise || l.hasChallenge).map((l: CatalogTrack['lessons'][number]) => {
                  const done = [...passed].some((k) => k.includes(`${t.id}:${l.slug}:`));
                  return (
                    <li key={l.slug}>
                      <Link to={lessonPath(t.id, l.slug)} className="flex items-center gap-3 py-2.5 text-sm hover:text-teal-600">
                        {done ? <CheckCircle2 className="h-4 w-4 text-teal" /> : l.hasChallenge ? <Trophy className="h-4 w-4 text-gold-600" /> : <Sparkles className="h-4 w-4 text-muted-fg" />}
                        <span className="flex-1">{l.title}</span>
                        <span className="text-xs text-muted-fg">{l.hasChallenge ? 'Challenge' : 'Exercise'}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
