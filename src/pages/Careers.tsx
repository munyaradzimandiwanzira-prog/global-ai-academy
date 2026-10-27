import { Link } from 'react-router-dom';
import { CAREERS } from '@/data/careers';
import { LevelBadge, PageHeader, ProgressBar, CareerMark } from '@/components/ui';
import { useProgress } from '@/lib/progress';
import { getCatalogTrack } from '@/lib/catalog';

export default function Careers() {
  const { trackProgress } = useProgress();
  return (
    <div className="container py-10">
      <PageHeader title="Career paths" description="Each path lists the tracks to finish, in order, from entry level to advanced — with a portfolio project at every stage so you can show employers real work." />
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {CAREERS.map((c) => {
          const totals = c.trackIds.reduce(
            (acc, id) => {
              const t = getCatalogTrack(id);
              if (!t) return acc;
              const p = trackProgress(id, t.lessons.length);
              return { done: acc.done + p.done, total: acc.total + p.total };
            },
            { done: 0, total: 0 },
          );
          const pct = totals.total ? Math.round((totals.done / totals.total) * 100) : 0;
          return (
            <Link key={c.id} to={`/careers/${c.id}`} className="group card flex flex-col p-6 transition-colors hover:border-teal/50">
              <div className="flex items-start justify-between gap-3">
                <CareerMark id={c.id} level={c.level} size={56} />
                <LevelBadge level={c.level} />
              </div>
              <h2 className="mt-3 font-display text-xl font-semibold group-hover:text-teal-600">{c.title}</h2>
              <p className="mt-2 flex-1 text-sm text-muted-fg">{c.summary}</p>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {c.tools.slice(0, 5).map((t) => <span key={t} className="chip bg-muted">{t}</span>)}
              </div>
              <div className="mt-4">
                <div className="mb-1 flex justify-between text-xs text-muted-fg"><span>{c.trackIds.length} tracks</span><span>{pct}% complete</span></div>
                <ProgressBar value={pct} />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
