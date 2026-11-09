/** Public, printable progress report a parent opens from an email or a shared link. */
import { useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import type { ParentReportContent } from '@shared/messages';
import { api, errorMessage } from '@/lib/api';
import { PageLoader } from '@/components/ui';
import { MaterialIcon } from '@/components/icons';

const fmt = (d: string) => new Date(`${d.slice(0, 10)}T12:00:00Z`).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
const TREND: Record<string, string> = { up: 'improving', down: 'finding it harder lately', steady: 'steady', new: 'just started' };

function Fact({ label, value }: { label: string; value: string | number }) {
  return <div className="rounded-lg bg-card p-4 ring-1 ring-border"><dt className="text-sm text-muted-fg">{label}</dt><dd className="mt-1 font-display text-2xl font-bold tabular-nums">{value}</dd></div>;
}

export function ReportBody({ c }: { c: ParentReportContent }) {
  return (
    <article className="space-y-6 text-[16px] leading-relaxed">
      <header>
        <p className="text-sm font-semibold uppercase tracking-wide text-teal-700 dark:text-teal-400">Progress report</p>
        <h1 className="mt-1 font-display text-3xl font-bold">{c.learner}</h1>
        <p className="text-muted-fg">From {c.teacher} · {fmt(c.period.from)} to {fmt(c.period.to)}</p>
      </header>
      <p className="text-lg">{c.summary}</p>
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Fact label="Days learning (last 30)" value={c.activeDays} />
        <Fact label="Lessons finished" value={c.lessonsDone} />
        {c.tests.some((t) => t.pct != null) && <Fact label="Average test mark" value={`${Math.round(c.tests.filter((t) => t.pct != null).reduce((n, t) => n + t.pct!, 0) / c.tests.filter((t) => t.pct != null).length)}%`} />}
      </dl>
      {c.teacherMessage && <blockquote className="rounded-lg border-l-4 border-gold bg-gold-100/60 p-4 text-ink dark:bg-gold-100/90"><p className="whitespace-pre-line">{c.teacherMessage}</p><footer className="mt-2 text-sm font-semibold">{c.teacher}</footer></blockquote>}
      <div className="grid gap-6 sm:grid-cols-2">
        {c.strengths.length > 0 && <section><h2 className="font-display text-lg font-semibold">Going well</h2><ul className="mt-2 space-y-1.5">{c.strengths.map((s) => <li key={s} className="flex gap-2"><MaterialIcon name="check_circle" className="mt-0.5 shrink-0 text-[20px] text-teal-700 dark:text-teal-400" />{s}</li>)}</ul></section>}
        {c.nextSteps.length > 0 && <section><h2 className="font-display text-lg font-semibold">Working on next</h2><ul className="mt-2 space-y-1.5">{c.nextSteps.map((s) => <li key={s} className="flex gap-2"><MaterialIcon name="arrow_forward" className="mt-0.5 shrink-0 text-[20px] text-gold-700 dark:text-gold" />{s}</li>)}</ul></section>}
      </div>
      {c.tests.length > 0 && (
        <section>
          <h2 className="font-display text-lg font-semibold">Tests and homework</h2>
          <table className="mt-2 w-full text-left"><tbody>{c.tests.map((t, i) => <tr key={i} className="border-t border-border"><td className="py-2 pr-3">{t.title}</td><td className="py-2 text-right tabular-nums">{t.pct != null ? `${t.pct}%` : <span className="text-muted-fg">{t.status}</span>}</td></tr>)}</tbody></table>
        </section>
      )}
      {(c.english || c.maths || c.courses.length > 0) && (
        <section>
          <h2 className="font-display text-lg font-semibold">Courses</h2>
          <ul className="mt-2 space-y-1.5">
            {c.english && <li>English: {c.english.unitsDone} units done{c.english.accuracy != null ? `, ${c.english.accuracy}% of answers right` : ''}, {TREND[c.english.trend] ?? c.english.trend}.</li>}
            {c.maths && <li>Cambridge Maths, Stage {c.maths.stage}: {c.maths.unitsDone} units done{c.maths.accuracy != null ? `, ${c.maths.accuracy}% of answers right` : ''}, {TREND[c.maths.trend] ?? c.maths.trend}.</li>}
            {c.courses.map((x) => <li key={x.title}>{x.title}: {x.done} of {x.total} lessons.</li>)}
          </ul>
        </section>
      )}
      {c.homeTip && <section className="rounded-lg bg-teal-100 p-4 text-teal-900 dark:bg-teal-900 dark:text-teal-50"><h2 className="flex items-center gap-2 font-display font-semibold"><MaterialIcon name="home" className="text-[20px]" /> One thing to try at home</h2><p className="mt-1">{c.homeTip}</p></section>}
    </article>
  );
}

export default function ParentReport() {
  const { token = '' } = useParams();
  const r = useQuery({ queryKey: ['parent-report', token], queryFn: () => api.get<{ content: ParentReportContent; expiresAt: string }>(`/api/messages/report/${token}`), retry: false });
  if (r.isLoading) return <PageLoader />;
  return (
    <div className="container max-w-3xl py-10">
      {r.data ? (
        <>
          <ReportBody c={r.data.content} />
          <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-border pt-4 text-sm text-muted-fg print:hidden">
            <button type="button" className="btn-outline btn-sm" onClick={() => window.print()}><MaterialIcon name="print" /> Print</button>
            <span>This link works until {fmt(r.data.expiresAt)}. Written with help from Zuva, our AI tutor, from learning records only.</span>
          </div>
        </>
      ) : <div className="card p-8 text-center"><h1 className="font-display text-2xl font-bold">Report not available</h1><p className="mt-2 text-muted-fg">{errorMessage(r.error)}</p></div>}
    </div>
  );
}

export function Unsubscribe() {
  const { token = '' } = useParams();
  const info = useQuery({ queryKey: ['unsub', token], queryFn: () => api.get<{ name: string; learner: string; unsubscribed: boolean }>(`/api/messages/unsubscribe/${token}`), retry: false });
  const go = useMutation({ mutationFn: () => api.post(`/api/messages/unsubscribe/${token}`, {}), onSuccess: () => void info.refetch() });
  if (info.isLoading) return <PageLoader />;
  return (
    <div className="container max-w-lg py-16">
      <div className="card p-8 text-center">
        {!info.data ? <><h1 className="font-display text-2xl font-bold">Link not valid</h1><p className="mt-2 text-muted-fg">{errorMessage(info.error)}</p></>
          : info.data.unsubscribed ? <><MaterialIcon name="check_circle" className="text-[40px] text-teal-700 dark:text-teal-400" /><h1 className="mt-2 font-display text-2xl font-bold">You’re unsubscribed</h1><p className="mt-2 text-muted-fg">You won’t get any more emails about {info.data.learner}. A teacher or {info.data.learner} can add you again if you change your mind.</p></>
            : <><h1 className="font-display text-2xl font-bold">Stop emails about {info.data.learner}?</h1><p className="mt-2 text-muted-fg">Hi {info.data.name}, you’ll stop getting class announcements and progress reports from {info.data.learner}’s teachers.</p><button type="button" className="btn-primary mt-6" onClick={() => go.mutate()} disabled={go.isPending} aria-busy={go.isPending || undefined}>Unsubscribe</button></>}
      </div>
    </div>
  );
}
