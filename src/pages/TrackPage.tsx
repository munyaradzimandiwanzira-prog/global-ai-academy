import { Link, useParams } from 'react-router-dom';
import { CheckCircle2, Circle, Clock, Trophy, Award, Code2, PlayCircle, Lock } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { DEFAULT_PREVIEW_LESSONS } from '@shared/content';
import { getCatalogTrack, lessonPath } from '@/lib/catalog';
import { CAREERS } from '@/data/careers';
import { useProgress } from '@/lib/progress';
import { LevelBadge, ProgressRing, TrackMark, CareerMark } from '@/components/ui';
import { CATEGORY_LABELS } from '@shared/content';
import NotFound from './NotFound';

export default function TrackPage() {
  const { trackId = '' } = useParams();
  const track = getCatalogTrack(trackId);
  const { completed, trackProgress } = useProgress();
  const { can } = useAuth();
  if (!track) return <NotFound />;
  const pro = can('content.pro');
  const preview = track.preview ?? DEFAULT_PREVIEW_LESSONS;
  const p = trackProgress(track.id, track.lessons.length);
  const next = track.lessons.find((l) => !completed.has(`${track.id}/${l.slug}`)) ?? track.lessons[0]!;
  const careers = CAREERS.filter((c) => c.trackIds.includes(track.id));

  return (
    <>
      <section className="border-b border-border" style={{ background: `linear-gradient(135deg, ${track.color}18, transparent 60%)` }}>
        <div className="container grid gap-8 py-12 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <nav className="mb-3 text-sm text-muted-fg"><Link to="/tutorials" className="hover:text-fg">Tutorials</Link> / {CATEGORY_LABELS[track.category]}</nav>
            <div className="flex items-center gap-4">
              <TrackMark short={track.short} color={track.color} size={72} />
              <h1 className="text-4xl font-bold md:text-5xl">{track.title}</h1>
            </div>
            <p className="mt-4 max-w-2xl text-lg text-muted-fg">{track.summary}</p>
            <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-muted-fg">
              <LevelBadge level={track.level} />
              <span className="flex items-center gap-1"><Clock className="h-4 w-4" /> about {Math.max(1, Math.round(track.totalMinutes / 60))} h</span>
              <span className="flex items-center gap-1"><Code2 className="h-4 w-4" /> {track.exerciseCount} exercises</span>
              <span className="flex items-center gap-1"><Trophy className="h-4 w-4" /> {track.challengeCount} challenges</span>
              {track.premium && <span className="chip bg-gold-100 text-gold-600">{pro ? 'Professional track · unlocked' : `Professional track · first ${preview} lessons free`}</span>}
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to={lessonPath(track.id, next.slug)} className="btn-run btn-lg"><PlayCircle className="h-5 w-5" /> {p.done ? 'Continue' : 'Start'}: {next.title}</Link>
              {track.quizCount >= 5 && <Link to={`/exam/${track.id}`} className="btn-outline btn-lg"><Award className="h-5 w-5" /> Certification exam</Link>}
            </div>
          </div>
          <div className="card flex items-center gap-4 p-5">
            <ProgressRing value={p.percent} size={84} stroke={8} />
            <div>
              <div className="font-display text-xl font-semibold">{p.done} / {p.total}</div>
              <div className="text-sm text-muted-fg">lessons completed</div>
            </div>
          </div>
        </div>
      </section>
      <div className="container grid gap-10 py-10 lg:grid-cols-[1fr_320px]">
        <section>
          <h2 className="mb-4 text-2xl font-bold">Lessons</h2>
          <ol className="card divide-y divide-border overflow-hidden">
            {track.lessons.map((l, i) => {
              const done = completed.has(`${track.id}/${l.slug}`);
              const lockedHere = !!l.locked && !pro;
              return (
                <li key={l.slug}>
                  {i === preview && track.premium && !pro && (
                    <div className="flex items-center gap-2 bg-gold-100/70 px-5 py-2 text-sm font-semibold text-gold-600 dark:bg-night-700"><Lock className="h-4 w-4" aria-hidden="true" /> Included with Plus · <Link to="/pricing?plan=plus" className="underline underline-offset-4">see plans</Link></div>
                  )}
                  <Link to={lessonPath(track.id, l.slug)} className="flex items-center gap-4 px-5 py-3.5 hover:bg-muted">
                    <span className="w-6 text-right text-sm tabular-nums text-muted-fg">{i + 1}</span>
                    {done ? <CheckCircle2 className="h-5 w-5 shrink-0 text-teal" aria-label="Completed" /> : lockedHere ? <Lock className="h-5 w-5 shrink-0 text-muted-fg" aria-label="Plus" /> : <Circle className="h-5 w-5 shrink-0 text-border" aria-hidden="true" />}
                    <span className="flex-1 font-medium">{l.title}</span>
                    {l.hasChallenge && <Trophy className="h-4 w-4 text-gold-600" aria-label="Has a coding challenge" />}
                    <span className="text-xs text-muted-fg">{l.minutes} min</span>
                  </Link>
                </li>
              );
            })}
          </ol>
        </section>
        <aside className="space-y-6">
          {careers.length > 0 && (
            <div className="card p-5">
              <h3 className="font-display text-lg font-semibold">Part of these career paths</h3>
              <ul className="mt-3 space-y-2">
                {careers.map((c) => (
                  <li key={c.id}><Link to={`/careers/${c.id}`} className="flex items-center gap-2 text-sm hover:text-teal-600"><CareerMark id={c.id} level={c.level} size={24} />{c.title}</Link></li>
                ))}
              </ul>
            </div>
          )}
          <div className="card bg-ink p-5 text-white dark:bg-night-700">
            <h3 className="font-display text-lg font-semibold">Earn a certificate</h3>
            <p className="mt-1 text-sm text-white/70">Finish most lessons, then pass the {track.title} exam with 70% or more to get a certificate anyone can verify.</p>
            <Link to={`/exam/${track.id}`} className="btn-gold btn-sm mt-4">About the exam</Link>
          </div>
        </aside>
      </div>
    </>
  );
}
