/**
 * Teacher dashboard charts and signals. Single-series charts in the brand teal (validated for
 * contrast on light and dark surfaces), recessive grid, hover/focus tooltips, and a table view.
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import type { ClassInsights } from '@shared/tests';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { MaterialIcon, type SymbolName } from '@/components/icons';
import { useTeacherScope } from './shared';

const FLAG: Record<ClassInsights['flags'][number]['reasons'][number]['kind'], { symbol: SymbolName; tone: string; label: string }> = {
  overdue: { symbol: 'alarm', tone: 'bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-100', label: 'Not handed in' },
  low: { symbol: 'trending_down', tone: 'bg-gold-100 text-ink-900', label: 'Low marks' },
  rushing: { symbol: 'bolt', tone: 'bg-gold-100 text-ink-900', label: 'Rushing' },
  inactive: { symbol: 'bedtime', tone: 'bg-muted text-fg', label: 'Inactive' },
  onboarding: { symbol: 'person_add', tone: 'bg-teal-100 text-teal-900 dark:bg-teal-900 dark:text-teal-50', label: 'Not started' },
};

const dayLabel = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' });

/** Bars for one series with a tooltip on hover/focus. */
function BarChart({ data, max, label, unit, height = 140 }: { data: { key: string; label: string; value: number | null; note?: string }[]; max?: number; label: string; unit?: string; height?: number }) {
  const [hover, setHover] = useState<number | null>(null);
  const top = Math.max(max ?? 0, ...data.map((d) => d.value ?? 0), 1);
  // Even top so the middle gridline is a whole number.
  const nice = max ?? (top <= 4 ? 4 : Math.ceil(top / 4) * 4);
  const W = 100 / data.length;
  const h = hover != null ? data[hover] : null;
  return (
    <figure className="relative">
      <div className="relative" style={{ height }}>
        {[0, 0.5, 1].map((g) => <div key={g} aria-hidden="true" className="absolute inset-x-0 border-t border-border/70" style={{ bottom: `${g * 100}%` }}><span className="absolute -top-2.5 right-full mr-1.5 text-[11px] tabular-nums text-muted-fg">{Math.round(nice * g)}{unit}</span></div>)}
        <div className="absolute inset-0 ml-0 flex items-end" role="list" aria-label={label}>
          {data.map((d, i) => (
            <div key={d.key} role="listitem" tabIndex={0} aria-label={`${d.label}: ${d.value == null ? 'no data' : `${d.value}${unit ?? ''}`}${d.note ? `, ${d.note}` : ''}`}
              onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} onFocus={() => setHover(i)} onBlur={() => setHover(null)}
              className="flex h-full cursor-default items-end justify-center outline-none focus-visible:bg-muted/60" style={{ width: `${W}%` }}>
              <span className={cn('block w-[60%] max-w-8 rounded-t-[4px] bg-teal dark:bg-teal-400', hover === i && 'opacity-80', d.value == null && 'bg-transparent')} style={{ height: `${Math.max(d.value ? 2 : 0, ((d.value ?? 0) / nice) * 100)}%` }} />
            </div>
          ))}
        </div>
        {h && hover != null && (
          <div role="status" className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-md bg-ink px-2.5 py-1.5 text-[13px] text-white shadow-lg dark:bg-sand dark:text-ink" style={{ left: `${(hover + 0.5) * W}%`, top: 0 }}>
            <strong className="font-semibold">{h.label}</strong> · {h.value == null ? 'no data' : `${h.value}${unit ?? ''}`}{h.note ? ` · ${h.note}` : ''}
          </div>
        )}
      </div>
      <div className="mt-1 flex text-[11px] text-muted-fg" aria-hidden="true">
        {data.map((d, i) => <span key={d.key} className="truncate text-center" style={{ width: `${W}%` }}>{data.length > 8 ? (i % 2 === 0 || i === data.length - 1 ? d.label : '') : d.label}</span>)}
      </div>
      <details className="mt-2 text-sm">
        <summary className="cursor-pointer text-muted-fg hover:text-fg">Show as table</summary>
        <table className="mt-2 w-full text-left"><tbody>{data.map((d) => <tr key={d.key} className="border-t border-border"><td className="py-1 pr-2">{d.label}</td><td className="py-1 text-right tabular-nums">{d.value ?? '—'}{d.value != null ? unit : ''}</td><td className="py-1 pl-2 text-muted-fg">{d.note}</td></tr>)}</tbody></table>
      </details>
    </figure>
  );
}

export function ClassInsightsPanel() {
  const { q } = useTeacherScope();
  const r = useQuery({ queryKey: ['teach-insights', q('')], queryFn: () => api.get<ClassInsights>(q('/api/teach/insights')) });
  if (!r.data) return <div className="card h-72 animate-pulse" aria-busy="true" aria-label="Loading class insights" />;
  const d = r.data;
  const joined = d.funnel[0]?.n ?? 0;
  const ask = (text: string) => q(`/teach/zuva?ask=${encodeURIComponent(text)}`);
  return (
    <div className="space-y-6" data-tour="insights">
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-5" aria-labelledby="ins-act">
          <h2 id="ins-act" className="font-display text-lg font-semibold">Learners active each day</h2>
          <p className="mb-4 text-sm text-muted-fg">Last 14 days, across lessons, English, Maths, practice and tests.</p>
          <div className="pl-7"><BarChart label="Learners active each day" data={d.activity.map((a) => ({ key: a.day, label: dayLabel(a.day), value: a.learners, note: `${a.events} activities` }))} /></div>
        </section>
        <section className="card p-5" aria-labelledby="ins-fun">
          <h2 id="ins-fun" className="font-display text-lg font-semibold">Onboarding</h2>
          <p className="mb-4 text-sm text-muted-fg">Where your learners are, from joining to handing in work.</p>
          <ol className="space-y-3">
            {d.funnel.map((f, i) => {
              const pct = joined ? Math.round((f.n / joined) * 100) : 0;
              return (
                <li key={f.step}>
                  <div className="mb-1 flex items-baseline justify-between text-[15px]"><span>{i + 1}. {f.step}</span><span className="font-semibold tabular-nums">{f.n}{i > 0 && joined ? <span className="ml-1 font-normal text-muted-fg">({pct}%)</span> : null}</span></div>
                  <div className="h-3 rounded-full bg-muted" aria-hidden="true"><div className="h-3 rounded-full bg-teal dark:bg-teal-400" style={{ width: `${joined ? Math.max(f.n ? 2 : 0, pct) : 0}%` }} /></div>
                </li>
              );
            })}
          </ol>
          {joined > 0 && (d.funnel[1]?.n ?? 0) < joined && <p className="mt-4 text-sm"><Link to={q('/teach/students')} className="font-semibold text-teal-600 hover:underline dark:text-teal-400">{joined - (d.funnel[1]?.n ?? 0)} joined but haven’t started</Link>: a short welcome message or a first easy assignment usually helps.</p>}
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-5" aria-labelledby="ins-tests">
          <h2 id="ins-tests" className="font-display text-lg font-semibold">Test averages</h2>
          <p className="mb-4 text-sm text-muted-fg">Your last {d.tests.length || ''} published tests, oldest first.</p>
          {d.tests.length ? <div className="pl-9"><BarChart label="Class average per test" unit="%" max={100} data={d.tests.map((t) => ({ key: t.id, label: t.title.length > 12 ? `${t.title.slice(0, 11)}…` : t.title, value: t.averagePct, note: `${t.handInPct}% handed in` }))} /></div>
            : <p className="text-[15px] text-muted-fg">No tests yet. <Link to={q('/teach/tests')} className="font-semibold text-teal-600 hover:underline dark:text-teal-400">Make one</Link> and averages appear here.</p>}
        </section>
        <section className="card p-5" aria-labelledby="ins-next">
          <h2 id="ins-next" className="flex items-center gap-2 font-display text-lg font-semibold"><MaterialIcon name="insights" className="text-[22px] text-gold-700 dark:text-gold" /> What to teach next</h2>
          <p className="mb-3 text-sm text-muted-fg">From marks actually earned and course mastery. Ask Zuva to turn any of these into a lesson.</p>
          {!d.reteach.length && !d.skills.length ? <p className="text-[15px] text-muted-fg">Suggestions appear once learners have handed in tests or practised in English or Maths.</p> : (
            <ul className="space-y-2">
              {d.reteach.map((x) => (
                <li key={`${x.testId}-${x.question}`} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border border-border p-3">
                  <span className="min-w-0 flex-1 text-[15px]"><strong className="tabular-nums">{x.pct}%</strong> of marks on “{x.question}” <span className="text-muted-fg">({x.test})</span></span>
                  <Link to={ask(`Plan a 20-minute reteach of this question my class struggled with (${x.pct}% of marks): "${x.question}"`)} className="btn-ghost btn-sm">Plan a reteach</Link>
                </li>
              ))}
              {d.skills.slice(0, Math.max(0, 5 - d.reteach.length)).filter((s) => s.mastery < 70).map((s) => (
                <li key={`${s.course}-${s.skill}`} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border border-border p-3">
                  <span className="min-w-0 flex-1 text-[15px]">{s.course}: <strong>{s.skill}</strong> at {s.mastery}% mastery <span className="text-muted-fg">({s.learners} learners)</span></span>
                  <Link to={ask(`My class is at ${s.mastery}% mastery on ${s.course} ${s.skill}. Suggest a short lesson and a homework task.`)} className="btn-ghost btn-sm">Ask Zuva</Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

/** Who needs a nudge, with the reasons spelled out (icon + label, never colour alone). */
export function AttentionList() {
  const { q } = useTeacherScope();
  const r = useQuery({ queryKey: ['teach-insights', q('')], queryFn: () => api.get<ClassInsights>(q('/api/teach/insights')) });
  const flags = r.data?.flags ?? [];
  return (
    <section data-tour="attention" aria-labelledby="att">
      <h2 id="att" className="mb-4 text-xl font-bold">Needs attention</h2>
      {!r.data ? <div className="card h-32 animate-pulse" /> : flags.length ? (
        <ul className="card divide-y divide-border overflow-hidden">
          {flags.map((f) => (
            <li key={f.id}>
              <Link to={q(`/teach/students/${f.id}`)} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-5 py-3.5 hover:bg-muted">
                <span className="min-w-0 flex-1 font-semibold">{f.name}</span>
                <span className="flex flex-wrap gap-1.5">
                  {f.reasons.map((x) => <span key={x.text} className={cn('chip gap-1', FLAG[x.kind].tone)} title={x.text}><MaterialIcon name={FLAG[x.kind].symbol} className="text-[16px]" /> <span className="sr-only">{FLAG[x.kind].label}: </span>{x.text}</span>)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : <p className="text-[15px] text-fg/70">Everyone has started, is active and is up to date.</p>}
    </section>
  );
}
