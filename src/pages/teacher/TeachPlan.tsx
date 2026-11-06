import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { LessonPlan, LessonPlanContent } from '@shared/teaching';
import { api, errorMessage } from '@/lib/api';
import { Input, PageLoader, Textarea } from '@/components/ui';
import { ArrowLeft, Pencil, Printer, Save, Trash2, Clock, Plus, X } from '@/components/icons';
import { TeachNav, shortDate, useTeacherScope } from './shared';

const lines = (v: string) => v.split('\n').map((x) => x.trim()).filter(Boolean);

export default function TeachPlan() {
  const { id = '' } = useParams();
  const { q, readOnly } = useTeacherScope();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({ queryKey: ['teach-plan', id, q('')], queryFn: () => api.get<{ plan: LessonPlan }>(q(`/api/teach/lesson-plans/${id}`)) });
  const [draft, setDraft] = useState<LessonPlanContent | null>(null);
  const save = useMutation({
    mutationFn: (content: LessonPlanContent) => api.put(`/api/teach/lesson-plans/${id}`, { content }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['teach-plan', id] }); qc.invalidateQueries({ queryKey: ['teach-plans'] }); setDraft(null); toast.success('Plan saved'); },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const remove = useMutation({
    mutationFn: () => api.del(`/api/teach/lesson-plans/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['teach-plans'] }); navigate('/teach/plans'); toast.success('Plan deleted'); },
  });
  if (isLoading) return <PageLoader />;
  if (!data) return <div className="container py-8"><TeachNav /><p>Plan not found.</p></div>;
  const plan = data.plan;
  const c = draft ?? plan.content;
  const total = c.timeline.reduce((n, t) => n + t.minutes, 0);
  const editing = !!draft;
  const set = (patch: Partial<LessonPlanContent>) => setDraft({ ...c, ...patch });

  const List = ({ title, items, k }: { title: string; items: string[]; k: 'objectives' | 'priorKnowledge' | 'materials' | 'assessment' }) => (
    <section className="break-inside-avoid">
      <h2 className="font-display text-lg font-semibold">{title}</h2>
      {editing ? (
        <Textarea aria-label={`${title}, one per line`} rows={Math.max(3, items.length + 1)} defaultValue={items.join('\n')} onBlur={(e) => set({ [k]: lines(e.target.value) } as Partial<LessonPlanContent>)} className="mt-2" />
      ) : items.length ? <ul className="mt-2 list-disc space-y-1 pl-5 text-[15px]">{items.map((x) => <li key={x}>{x}</li>)}</ul> : <p className="mt-1 text-sm text-muted-fg">None.</p>}
    </section>
  );

  return (
    <div className="container max-w-5xl py-8">
      <Link to={q('/teach/plans')} className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-muted-fg hover:text-fg print:hidden"><ArrowLeft className="h-4 w-4" /> All plans</Link>
      <TeachNav />
      <header className="flex flex-wrap items-start gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-teal-600">{plan.trackTitle} · <Clock className="inline h-3.5 w-3.5" /> {total} minutes</p>
          {editing ? <Input aria-label="Title" className="mt-1 text-2xl font-bold" value={c.title} onChange={(e) => set({ title: e.target.value })} /> : <h1 className="mt-1 font-display text-3xl font-bold">{c.title}</h1>}
          <p className="mt-1 text-xs text-muted-fg print:hidden">Written by Zuva · updated {shortDate(plan.updatedAt)}. Check it before you teach: you know your class best.</p>
        </div>
        <div className="flex flex-wrap gap-2 print:hidden">
          {editing ? (
            <>
              <button type="button" className="btn-primary" disabled={save.isPending} onClick={() => save.mutate(c)}><Save className="h-4 w-4" /> Save</button>
              <button type="button" className="btn-outline" onClick={() => setDraft(null)}>Cancel</button>
            </>
          ) : (
            <>
              <button type="button" className="btn-outline" onClick={() => window.print()}><Printer className="h-4 w-4" /> Print</button>
              {!readOnly && <button type="button" className="btn-outline" onClick={() => setDraft(structuredClone(plan.content))}><Pencil className="h-4 w-4" /> Edit</button>}
              {!readOnly && <button type="button" className="btn-outline" aria-label="Delete plan" onClick={() => { if (window.confirm('Delete this lesson plan?')) remove.mutate(); }}><Trash2 className="h-4 w-4" /></button>}
            </>
          )}
        </div>
      </header>

      <section className="mt-6">
        {editing ? <Textarea aria-label="Overview" rows={3} value={c.overview} onChange={(e) => set({ overview: e.target.value })} /> : <p className="text-[17px] leading-relaxed">{c.overview}</p>}
      </section>

      <div className="mt-8 grid gap-8 md:grid-cols-3">
        <List title="Objectives" items={c.objectives} k="objectives" />
        <List title="Learners should already know" items={c.priorKnowledge} k="priorKnowledge" />
        <List title="Materials" items={c.materials} k="materials" />
      </div>

      <section className="mt-10" aria-labelledby="timeline">
        <h2 id="timeline" className="font-display text-xl font-semibold">The lesson, minute by minute</h2>
        <ol className="mt-4 space-y-3">
          {c.timeline.map((t, i) => (
            <li key={i} className="card grid gap-3 p-4 md:grid-cols-[110px_1fr_1fr] break-inside-avoid">
              <div>
                {editing ? (
                  <>
                    <Input aria-label="Minutes" type="number" min={1} max={240} value={t.minutes} onChange={(e) => set({ timeline: c.timeline.map((x, j) => (j === i ? { ...x, minutes: Math.max(1, Number(e.target.value) || 1) } : x)) })} />
                    <Input aria-label="Phase" className="mt-2" value={t.phase} onChange={(e) => set({ timeline: c.timeline.map((x, j) => (j === i ? { ...x, phase: e.target.value } : x)) })} />
                    <button type="button" className="mt-2 inline-flex items-center gap-1 text-xs text-red-700 dark:text-red-300" onClick={() => set({ timeline: c.timeline.filter((_, j) => j !== i) })}><X className="h-3.5 w-3.5" /> Remove</button>
                  </>
                ) : (
                  <><div className="font-display text-2xl font-bold tabular">{t.minutes}<span className="text-sm font-normal text-muted-fg"> min</span></div><div className="text-sm font-semibold text-teal-600">{t.phase}</div></>
                )}
              </div>
              <div><div className="text-xs font-semibold uppercase tracking-wide text-muted-fg">Teacher</div>{editing ? <Textarea aria-label="Teacher does" rows={3} value={t.teacher} onChange={(e) => set({ timeline: c.timeline.map((x, j) => (j === i ? { ...x, teacher: e.target.value } : x)) })} /> : <p className="mt-1 text-[15px]">{t.teacher}</p>}</div>
              <div><div className="text-xs font-semibold uppercase tracking-wide text-muted-fg">Learners</div>{editing ? <Textarea aria-label="Learners do" rows={3} value={t.learners} onChange={(e) => set({ timeline: c.timeline.map((x, j) => (j === i ? { ...x, learners: e.target.value } : x)) })} /> : <p className="mt-1 text-[15px]">{t.learners}</p>}</div>
            </li>
          ))}
        </ol>
        {editing && c.timeline.length < 12 && <button type="button" className="btn-outline btn-sm mt-3" onClick={() => set({ timeline: [...c.timeline, { minutes: 5, phase: 'Activity', teacher: '', learners: '' }] })}><Plus className="h-4 w-4" /> Add a step</button>}
      </section>

      <div className="mt-10 grid gap-8 md:grid-cols-2">
        <section className="break-inside-avoid">
          <h2 className="font-display text-lg font-semibold">Support</h2>
          {editing ? <Textarea aria-label="Support, one per line" rows={4} defaultValue={c.differentiation.support.join('\n')} onBlur={(e) => set({ differentiation: { ...c.differentiation, support: lines(e.target.value) } })} className="mt-2" /> : <ul className="mt-2 list-disc space-y-1 pl-5 text-[15px]">{c.differentiation.support.map((x) => <li key={x}>{x}</li>)}</ul>}
        </section>
        <section className="break-inside-avoid">
          <h2 className="font-display text-lg font-semibold">Stretch</h2>
          {editing ? <Textarea aria-label="Stretch, one per line" rows={4} defaultValue={c.differentiation.stretch.join('\n')} onBlur={(e) => set({ differentiation: { ...c.differentiation, stretch: lines(e.target.value) } })} className="mt-2" /> : <ul className="mt-2 list-disc space-y-1 pl-5 text-[15px]">{c.differentiation.stretch.map((x) => <li key={x}>{x}</li>)}</ul>}
        </section>
        <List title="Checking understanding" items={c.assessment} k="assessment" />
        <section className="break-inside-avoid">
          <h2 className="font-display text-lg font-semibold">Homework</h2>
          {editing ? <Textarea aria-label="Homework" rows={3} value={c.homework} onChange={(e) => set({ homework: e.target.value })} className="mt-2" /> : <p className="mt-2 text-[15px]">{c.homework || 'None.'}</p>}
        </section>
      </div>

      {c.resources.length > 0 && (
        <section className="mt-10 break-inside-avoid">
          <h2 className="font-display text-lg font-semibold">On the Academy</h2>
          <ul className="mt-2 space-y-1 text-[15px]">{c.resources.map((r) => <li key={r.path}><Link to={r.path} className="font-medium text-teal-600 underline">{r.title}</Link> <span className="text-sm text-muted-fg">skurulearning.com{r.path}</span></li>)}</ul>
        </section>
      )}
    </div>
  );
}
