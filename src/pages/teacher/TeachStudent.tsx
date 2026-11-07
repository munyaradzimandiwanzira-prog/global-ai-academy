import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { StudentDetail, StudentReport } from '@shared/teaching';
import { STAGES } from '@shared/kids-curriculum';
import { api, errorMessage } from '@/lib/api';
import { Avatar, Dialog, PageLoader, ProgressBar, Select, Stat } from '@/components/ui';
import { ArrowLeft, Sparkles, ClipboardList, BookOpen, Star, Flame, Trophy, Trash2, Printer, Plus } from '@/components/icons';
import { cn } from '@/lib/utils';
import { AssignForm } from './AssignForm';
import { EslPanel } from './EslPanel';
import { StatusChip, TeachNav, firstName, lastSeen, shortDate, useTeacherScope } from './shared';

export default function TeachStudent() {
  const { id = '' } = useParams();
  const { q, readOnly } = useTeacherScope();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [assignOpen, setAssignOpen] = useState(false);
  const detail = useQuery({ queryKey: ['teach-student', id, q('')], queryFn: () => api.get<StudentDetail>(q(`/api/teach/students/${id}`)) });
  const reports = useQuery({ queryKey: ['teach-reports', id, q('')], queryFn: () => api.get<{ reports: StudentReport[] }>(q(`/api/teach/students/${id}/reports`)) });
  const classes = useQuery({ queryKey: ['my-classes'], enabled: !readOnly, queryFn: () => api.get<{ teaching: { id: string; name: string; archived: boolean }[] }>('/api/classrooms') });
  const report = useMutation({
    mutationFn: () => api.post<{ report: StudentReport }>(`/api/teach/students/${id}/reports`, {}),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['teach-reports', id] }); toast.success('Zuva’s report is ready'); },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const remove = useMutation({
    mutationFn: () => api.del(`/api/teach/students/${id}`),
    onSuccess: () => { toast.success('Removed from your students'); navigate('/teach/students'); },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const addToClass = useMutation({
    mutationFn: (classId: string) => api.post(`/api/classrooms/${classId}/members`, { userId: id }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['teach-student', id] }); toast.success('Added to the class'); },
    onError: (e) => toast.error(errorMessage(e)),
  });

  if (detail.isLoading) return <PageLoader />;
  if (!detail.data) return <div className="container py-8"><TeachNav /><p>That student isn’t one of yours.</p></div>;
  const d = detail.data;
  const s = d.student;
  const myClasses = (classes.data?.teaching ?? []).filter((c) => !c.archived);
  const theirClasses = myClasses.filter((c) => s.classes.some((x) => x.id === c.id));
  const otherClasses = myClasses.filter((c) => !s.classes.some((x) => x.id === c.id));
  const maxDay = Math.max(1, ...d.activityByDay.map((x) => x.count));
  const days = Array.from({ length: 28 }, (_, i) => {
    const day = new Date(Date.now() - (27 - i) * 86_400_000).toISOString().slice(0, 10);
    return { day, count: d.activityByDay.find((x) => x.day === day)?.count ?? 0 };
  });
  const latest = reports.data?.reports[0];

  return (
    <div className="container py-8">
      <Link to={q('/teach/students')} className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-muted-fg hover:text-fg"><ArrowLeft className="h-4 w-4" /> All students</Link>
      <TeachNav />
      <header className="flex flex-wrap items-center gap-4">
        <Avatar name={s.name} color={s.avatarColor} size={56} />
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-3xl font-bold">{s.name}</h1>
          <p className="text-sm text-muted-fg">
            {s.level} · {s.paid ? `${s.plan} plan` : 'free plan'} · {s.classes.map((c) => c.name).join(', ') || 'joined by invite'} · active {lastSeen(s.lastActiveDay)}
            {s.kidsStage && <> · Kids Zone around {STAGES.find((x) => x.id === s.kidsStage)?.name}</>}
          </p>
          <p className="text-sm text-muted-fg">{s.email}{s.school ? ` · ${s.school}` : ''}{s.city ? ` · ${s.city}` : ''}</p>
        </div>
        {!readOnly && (
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-outline" onClick={() => setAssignOpen(true)}><ClipboardList className="h-4 w-4" /> Assign work</button>
            <button type="button" className="btn-primary" disabled={report.isPending} onClick={() => report.mutate()}><Sparkles className="h-4 w-4" /> {report.isPending ? 'Zuva is writing…' : 'Zuva report'}</button>
          </div>
        )}
      </header>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Stat label="Lessons done" value={s.lessonsDone} icon={<BookOpen className="h-4 w-4" />} />
        <Stat label="Kids Zone stars" value={s.kidsStars} icon={<Star className="h-4 w-4 text-gold-700 dark:text-gold" />} />
        <Stat label="Your work done" value={`${s.assignmentsDone}/${s.assignmentsDone + s.assignmentsOpen}`} icon={<ClipboardList className="h-4 w-4" />} />
        <Stat label="Average score" value={s.avgScore === null ? '—' : `${s.avgScore}%`} icon={<Trophy className="h-4 w-4" />} />
        <Stat label="Streak" value={`${s.streak} day${s.streak === 1 ? '' : 's'}`} icon={<Flame className="h-4 w-4 text-red-600" />} />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="min-w-0 space-y-6">
          <section className="card p-5" aria-labelledby="zr">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 id="zr" className="flex items-center gap-2 font-display text-lg font-semibold"><Sparkles className="h-5 w-5 text-gold-700 dark:text-gold" /> Zuva’s report</h2>
              {latest && <span className="flex items-center gap-3 text-xs text-muted-fg">{shortDate(latest.createdAt)} · confidence {latest.content.confidence}<button type="button" className="inline-flex items-center gap-1 font-medium hover:text-fg print:hidden" onClick={() => window.print()}><Printer className="h-3.5 w-3.5" /> Print</button></span>}
            </div>
            {latest ? (
              <div className="mt-3 space-y-4 text-[15px]">
                <p>{latest.content.summary}</p>
                {latest.content.strengths.length > 0 && (
                  <div><h3 className="text-sm font-semibold uppercase tracking-wide text-teal-600">Strengths</h3><ul className="mt-1 list-disc space-y-1 pl-5">{latest.content.strengths.map((x) => <li key={x}>{x}</li>)}</ul></div>
                )}
                {latest.content.painPoints.length > 0 && (
                  <div><h3 className="text-sm font-semibold uppercase tracking-wide text-red-700 dark:text-red-300">Pain points</h3><ul className="mt-1 space-y-2">{latest.content.painPoints.map((p) => <li key={p.area}><strong>{p.area}.</strong> <span className="text-fg/80">{p.evidence}</span></li>)}</ul></div>
                )}
                {latest.content.nextSteps.length > 0 && (
                  <div><h3 className="text-sm font-semibold uppercase tracking-wide text-ink dark:text-sand">Recommended next steps</h3>
                    <ol className="mt-1 list-decimal space-y-2 pl-5">{latest.content.nextSteps.map((n) => <li key={n.action}><strong>{n.action}</strong> <span className="text-fg/80">{n.why}</span>{n.resource && <> <Link className="font-medium text-teal-600 underline" to={n.resource.path}>{n.resource.title}</Link></>}</li>)}</ol>
                  </div>
                )}
                {latest.content.parentNote && <div className="rounded-lg bg-muted p-3 text-sm"><strong>For parents:</strong> {latest.content.parentNote}</div>}
              </div>
            ) : (
              <p className="mt-2 text-sm text-muted-fg">{readOnly ? 'No reports yet.' : `Ask Zuva for a report on ${firstName(s.name)}: strengths, pain points backed by evidence, and next steps with links.`}</p>
            )}
            {(reports.data?.reports.length ?? 0) > 1 && (
              <details className="mt-4 text-sm"><summary className="cursor-pointer font-medium">Earlier reports ({reports.data!.reports.length - 1})</summary>
                <ul className="mt-2 space-y-2">{reports.data!.reports.slice(1).map((r) => <li key={r.id} className="rounded-lg border border-border p-3"><div className="text-xs text-muted-fg">{shortDate(r.createdAt)} · {r.authorName}</div>{r.content.summary}</li>)}</ul>
              </details>
            )}
          </section>

          <section className="card overflow-hidden" aria-labelledby="work">
            <h2 id="work" className="border-b border-border px-5 py-3 font-display text-lg font-semibold">Work you set</h2>
            {d.assignments.length ? (
              <ul className="divide-y divide-border">
                {d.assignments.map((a) => (
                  <li key={a.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                    <Link to={`/assignments/${a.id}`} className="min-w-0 flex-1"><span className="block font-medium hover:underline">{a.title}</span><span className="block text-xs text-muted-fg">{a.classroomName} · {a.kind}{a.dueAt ? ` · due ${shortDate(a.dueAt)}` : ''}</span></Link>
                    {a.score !== null && <span className="text-sm tabular">{a.score}/{a.maxScore}</span>}
                    <StatusChip status={a.status} />
                  </li>
                ))}
              </ul>
            ) : <p className="px-5 py-4 text-sm text-muted-fg">No work set yet.</p>}
          </section>

          {d.esl && <EslPanel v={d.esl} name={firstName(s.name)} />}

          <section className="card p-5" aria-labelledby="courses">
            <h2 id="courses" className="font-display text-lg font-semibold">Courses</h2>
            {d.tracks.length ? (
              <ul className="mt-3 space-y-3">{d.tracks.map((t) => <li key={t.id}><div className="flex justify-between text-sm"><Link to={`/learn/${t.id}`} className="font-medium hover:underline">{t.title}</Link><span className="tabular text-muted-fg">{t.done}/{t.total}</span></div><ProgressBar value={t.total ? (t.done / t.total) * 100 : 0} className="mt-1" /></li>)}</ul>
            ) : <p className="mt-2 text-sm text-muted-fg">No course lessons started yet.</p>}
          </section>
        </div>

        <aside className="space-y-6">
          <section className="card p-5" aria-labelledby="act">
            <h2 id="act" className="font-display text-lg font-semibold">Activity, last 4 weeks</h2>
            <div className="mt-3 flex h-20 items-end gap-[3px]" role="img" aria-label={`Active on ${d.activityByDay.length} of the last 28 days`}>
              {days.map((x) => <span key={x.day} title={`${x.day}: ${x.count}`} className={cn('flex-1 rounded-t-sm', x.count ? 'bg-teal' : 'bg-muted')} style={{ height: `${x.count ? 18 + (x.count / maxDay) * 82 : 8}%` }} />)}
            </div>
            <p className="mt-2 text-xs text-muted-fg">Active on {d.activityByDay.length} of the last 28 days.</p>
          </section>
          {d.kids.length > 0 && (
            <section className="card p-5" aria-labelledby="kz">
              <h2 id="kz" className="font-display text-lg font-semibold">Kids Zone by stage</h2>
              <ul className="mt-3 space-y-2">{d.kids.map((k) => <li key={k.stage}><div className="flex justify-between text-sm"><span>{STAGES.find((x) => x.id === k.stage)?.name}</span><span className="tabular text-muted-fg">{k.done}/{k.total} levels</span></div><ProgressBar value={(k.done / k.total) * 100} className="mt-1" /></li>)}</ul>
            </section>
          )}
          {d.struggles.length > 0 && (
            <section className="card p-5" aria-labelledby="stuck">
              <h2 id="stuck" className="font-display text-lg font-semibold">Stuck on</h2>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">{d.struggles.map((x) => <li key={x}>{x}</li>)}</ul>
            </section>
          )}
          {!readOnly && (
            <section className="card p-5" aria-labelledby="cls">
              <h2 id="cls" className="font-display text-lg font-semibold">Classes</h2>
              <p className="mt-1 text-sm text-muted-fg">{theirClasses.length ? `In ${theirClasses.map((c) => c.name).join(', ')}.` : 'Not in any of your classes yet. Work is set through a class.'}</p>
              {otherClasses.length > 0 && (
                <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); const v = new FormData(e.currentTarget).get('cls'); if (v) addToClass.mutate(String(v)); }}>
                  <label htmlFor="add-cls" className="sr-only">Add to class</label>
                  <Select id="add-cls" name="cls" defaultValue={otherClasses[0]!.id}>{otherClasses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select>
                  <button className="btn-outline btn-sm shrink-0" disabled={addToClass.isPending}><Plus className="h-4 w-4" /> Add</button>
                </form>
              )}
              <button type="button" className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-red-700 hover:underline dark:text-red-300" onClick={() => { if (window.confirm(`Stop teaching ${s.name}? They leave your classes and you stop seeing their progress.`)) remove.mutate(); }}><Trash2 className="h-4 w-4" /> Remove from my students</button>
            </section>
          )}
        </aside>
      </div>

      <Dialog open={assignOpen} onOpenChange={setAssignOpen} title={`Assign work to ${firstName(s.name)}`} wide>
        <AssignForm classes={theirClasses} fixedStudent={{ id: s.id, name: s.name }} onDone={() => { setAssignOpen(false); qc.invalidateQueries({ queryKey: ['teach-student', id] }); }} />
      </Dialog>
    </div>
  );
}
