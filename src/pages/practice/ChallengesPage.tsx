import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, CheckCircle2 } from '@/components/icons';
import type { CatalogTrack, Challenge } from '@shared/content';
import { catalog, lessonPath, loadTrack } from '@/lib/catalog';
import { useProgress } from '@/lib/progress';
import { ChallengeBlock } from '@/features/lesson/blocks';
import { PageLoader, TrackMark } from '@/components/ui';
import { cn } from '@/lib/utils';

/** ISO-8601 week number, so everyone in Zimbabwe gets the same challenge each Monday. */
export function isoWeek(d = new Date()): { year: number; week: number } {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return { year: date.getUTCFullYear(), week: Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7) };
}

const challengeLessons = catalog
  .filter((t) => t.category !== 'kids')
  .flatMap((t: CatalogTrack) => t.lessons.filter((l: CatalogTrack['lessons'][number]) => l.hasChallenge).map((l: CatalogTrack['lessons'][number]) => ({ track: t, lesson: l })));

function WeeklyChallenge() {
  const { year, week } = isoWeek();
  // Only free lessons ship their challenge code to the browser, so the weekly pick comes from those.
  const open = challengeLessons.filter((c) => !c.lesson.locked);
  const pick = open[(year * 53 + week) % open.length]!;
  const track = useQuery({ queryKey: ['track', pick.track.id], queryFn: () => loadTrack(pick.track.id), staleTime: Infinity });
  const challenge = useMemo(() => {
    const lesson = track.data?.lessons.find((l) => l.slug === pick.lesson.slug);
    const block = lesson?.blocks.find((b) => b.type === 'challenge');
    return block && block.type === 'challenge' ? (block.challenge as Challenge) : null;
  }, [track.data, pick.lesson.slug]);

  return (
    <section className="bg-ink py-16 text-white dark:bg-night-800">
      <div className="container grid gap-10 lg:grid-cols-[0.8fr_1.4fr]">
        <div>
          <h2 className="display-md">Challenge of the week</h2>
          <p className="lede mt-4 text-white/80">Week {week}, {year}. A new one every Monday for everyone on the site. Solve it, then share your code with your class.</p>
          <p className="mt-6 flex items-center gap-3 text-white/85"><TrackMark short={pick.track.short} color={pick.track.color} size={32} />{pick.track.title} · from <Link to={lessonPath(pick.track.id, pick.lesson.slug)} className="font-semibold text-gold underline-offset-4 hover:underline">{pick.lesson.title}</Link></p>
        </div>
        <div className="min-w-0 rounded-3xl bg-card p-2 text-fg md:p-4">
          {track.isLoading ? <PageLoader /> : challenge ? <ChallengeBlock challenge={challenge} trackId={pick.track.id} lessonTitle={pick.lesson.title} /> : <p className="p-6">This week’s challenge could not be loaded. <Link to={lessonPath(pick.track.id, pick.lesson.slug)} className="text-teal-600 underline">Open it in the lesson</Link>.</p>}
        </div>
      </div>
    </section>
  );
}

export default function ChallengesPage() {
  const [filter, setFilter] = useState<string>('all');
  const { passed } = useProgress();
  const tracks = [...new Map(challengeLessons.map((c) => [c.track.id, c.track])).values()].sort((a, b) => a.order - b.order);
  const shown = filter === 'all' ? challengeLessons : challengeLessons.filter((c) => c.track.id === filter);
  

  return (
    <div>
      <div className="container py-14">
        <h1 className="display-lg">Code challenges</h1>
        <p className="lede mt-4 max-w-2xl text-fg/85">{challengeLessons.length} problems that run your code against real tests. Stuck? Coach Zuva gives you a hint, then a bigger one, but never the answer.</p>
      </div>
      <WeeklyChallenge />
      <div className="container py-16">
        <h2 className="display-md">Every challenge</h2>
        <div className="mt-6 flex flex-wrap gap-2" role="tablist" aria-label="Filter by track">
          {[{ id: 'all', title: 'All tracks' }, ...tracks].map((t) => (
            <button key={t.id} role="tab" aria-selected={filter === t.id} onClick={() => setFilter(t.id)}
              className={cn('h-9 rounded-full px-4 text-sm font-medium transition-colors', filter === t.id ? 'bg-ink text-white dark:bg-sand dark:text-ink' : 'bg-granite-100 hover:bg-granite-200 dark:bg-night-700')}>
              {t.title}
            </button>
          ))}
        </div>
        <ul className="mt-8 grid gap-x-10 md:grid-cols-2">
          {shown.map(({ track, lesson }) => {
            const solved = !!lesson.challengeId && passed.has(`challenge:${lesson.challengeId}`);
            return (
              <li key={`${track.id}/${lesson.slug}`} className="border-b border-border">
                <Link to={`${lessonPath(track.id, lesson.slug)}#challenge`} className="group flex items-center gap-4 py-3.5">
                  <TrackMark short={track.short} color={track.color} size={34} />
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold group-hover:text-teal-600">{lesson.challengeTitle ?? lesson.title}</span>
                    <span className="block text-sm text-fg/70">{track.title} · {lesson.title}{lesson.difficulty ? ` · ${lesson.difficulty}` : ''}</span>
                  </span>
                  {solved ? <span className="flex items-center gap-1 text-sm font-medium text-teal-600"><CheckCircle2 className="h-4 w-4" /> Solved</span> : <ArrowRight className="h-5 w-5 text-fg/40 group-hover:text-teal-600" aria-hidden="true" />}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
