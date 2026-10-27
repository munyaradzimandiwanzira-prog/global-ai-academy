import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { tracksByCategory, lessonPath } from '@/lib/catalog';
import { CATEGORY_LABELS, type Level } from '@shared/content';
import { LevelBadge, PageHeader, ProgressBar, TrackMark } from '@/components/ui';
import { useProgress } from '@/lib/progress';
import { cn } from '@/lib/utils';

const LEVELS: (Level | 'all')[] = ['all', 'kids', 'beginner', 'intermediate', 'advanced'];
const LEVEL_TEXT: Record<string, string> = { all: 'All levels', kids: 'Kids', beginner: 'Entry level', intermediate: 'Intermediate', advanced: 'Advanced' };

export default function Tutorials() {
  const [level, setLevel] = useState<Level | 'all'>('all');
  const { trackProgress } = useProgress();
  const groups = useMemo(
    () => tracksByCategory().map((g) => ({ ...g, tracks: g.tracks.filter((t) => level === 'all' || t.level === level) })).filter((g) => g.tracks.length),
    [level],
  );

  return (
    <div className="container py-10">
      <PageHeader title="All tutorials" description="Every track is free. Each lesson has examples you can run, exercises and challenges with automatic checking." />
      <div className="mb-8 flex flex-wrap gap-2" role="tablist" aria-label="Filter by level">
        {LEVELS.map((l) => (
          <button key={l} role="tab" aria-selected={level === l} onClick={() => setLevel(l)} className={cn('rounded-full border px-4 py-1.5 text-sm font-medium', level === l ? 'border-ink bg-ink text-white dark:border-gold dark:bg-gold dark:text-ink' : 'border-border hover:bg-muted')}>
            {LEVEL_TEXT[l]}
          </button>
        ))}
      </div>
      <div className="space-y-12">
        {groups.map((g) => (
          <section key={g.category}>
            <h2 className="mb-4 text-2xl font-bold">{CATEGORY_LABELS[g.category]}</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {g.tracks.map((t) => {
                const p = trackProgress(t.id, t.lessons.length);
                return (
                  <Link key={t.id} to={lessonPath(t.id)} className="group card flex flex-col p-5 transition-colors hover:border-teal/50">
                    <div className="flex items-start gap-3">
                      <TrackMark short={t.short} color={t.color} size={48} />
                      <div className="min-w-0">
                        <h3 className="font-display text-lg font-semibold group-hover:text-teal-600">{t.title}</h3>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-fg"><LevelBadge level={t.level} /> {t.lessons.length} lessons</div>
                      </div>
                    </div>
                    <p className="mt-3 flex-1 text-sm text-muted-fg">{t.summary}</p>
                    {p.done > 0 && (
                      <div className="mt-4">
                        <div className="mb-1 flex justify-between text-xs text-muted-fg"><span>Your progress</span><span>{p.percent}%</span></div>
                        <ProgressBar value={p.percent} />
                      </div>
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
