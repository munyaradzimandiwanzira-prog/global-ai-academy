import { Link, useParams } from 'react-router-dom';
import { CheckCircle2, Hammer, MapPin, Wrench, ArrowRight } from 'lucide-react';
import { getCareer, CAREERS } from '@/data/careers';
import { getCatalogTrack, lessonPath } from '@/lib/catalog';
import { useProgress } from '@/lib/progress';
import { LevelBadge, ProgressBar, TrackMark, CareerMark } from '@/components/ui';
import NotFound from './NotFound';

export default function CareerDetail() {
  const { careerId = '' } = useParams();
  const career = getCareer(careerId);
  const { trackProgress } = useProgress();
  if (!career) return <NotFound />;

  return (
    <>
      <section className="bg-ink text-white dark:bg-night-800">
        <div className="container py-12">
          <Link to="/careers" className="text-sm text-white/60 hover:text-white">Career paths</Link>
          <div className="mt-3 flex flex-wrap items-center gap-4">
            <CareerMark id={career.id} level={career.level} size={64} />
            <h1 className="text-4xl font-bold md:text-5xl">{career.title}</h1>
          </div>
          <p className="mt-4 max-w-3xl text-lg text-white/75">{career.summary}</p>
          <div className="mt-4"><LevelBadge level={career.level} /></div>
        </div>
        <div className="chevron-band" />
      </section>
      <div className="container grid gap-10 py-10 lg:grid-cols-[1fr_340px]">
        <div>
          <h2 className="text-2xl font-bold">Your learning path</h2>
          <ol className="relative mt-6 space-y-8 border-l-2 border-gold/50 pl-8">
            {career.stages.map((stage, i) => (
              <li key={stage.level} className="relative">
                <span className="absolute -left-[45px] flex h-8 w-8 items-center justify-center rounded-full bg-gold font-bold text-ink">{i + 1}</span>
                <h3 className="font-display text-xl font-semibold">{stage.level}</h3>
                <p className="text-sm text-muted-fg">{stage.focus}</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {stage.trackIds.map((id) => {
                    const t = getCatalogTrack(id);
                    if (!t) return null;
                    const p = trackProgress(id, t.lessons.length);
                    return (
                      <Link key={id} to={lessonPath(id)} className="card flex items-center gap-3 p-3.5 hover:border-teal/50">
                        <TrackMark short={t.short} color={t.color} size={36} />
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-1.5 font-medium">{t.title}{p.percent === 100 && <CheckCircle2 className="h-4 w-4 text-teal" />}</span>
                          <ProgressBar value={p.percent} className="mt-1.5 h-1.5" />
                        </span>
                      </Link>
                    );
                  })}
                </div>
                <div className="mt-4 flex gap-3 rounded-xl border border-dashed border-gold/60 bg-gold-100/40 p-4 text-sm dark:bg-night-800">
                  <Hammer className="h-5 w-5 shrink-0 text-gold-600" />
                  <p><strong>Portfolio project:</strong> {stage.project}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
        <aside className="space-y-5">
          <div className="card p-5">
            <h3 className="font-display text-lg font-semibold">What you’ll do</h3>
            <ul className="mt-3 space-y-2 text-sm">{career.dayToDay.map((d) => <li key={d} className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-teal" />{d}</li>)}</ul>
          </div>
          <div className="card p-5">
            <h3 className="flex items-center gap-2 font-display text-lg font-semibold"><Wrench className="h-4 w-4" /> Tools</h3>
            <div className="mt-3 flex flex-wrap gap-1.5">{career.tools.map((t) => <span key={t} className="chip bg-muted">{t}</span>)}</div>
          </div>
          <div className="card p-5">
            <h3 className="flex items-center gap-2 font-display text-lg font-semibold"><MapPin className="h-4 w-4 text-stone" /> In Zimbabwe</h3>
            <p className="mt-2 text-sm text-muted-fg">{career.zimbabwe}</p>
          </div>
          {career.next.length > 0 && (
            <div className="card p-5">
              <h3 className="font-display text-lg font-semibold">Where it leads</h3>
              <ul className="mt-3 space-y-2">
                {career.next.map((id) => {
                  const c = CAREERS.find((x) => x.id === id);
                  return c ? <li key={id}><Link to={`/careers/${id}`} className="flex items-center gap-2 text-sm hover:text-teal-600"><CareerMark id={c.id} level={c.level} size={28} /> {c.title} <ArrowRight className="ml-auto h-4 w-4" /></Link></li> : null;
                })}
              </ul>
            </div>
          )}
        </aside>
      </div>
    </>
  );
}
