import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { LessonPlan } from '@shared/teaching';
import { catalog, getCatalogTrack } from '@/lib/catalog';
import { api, ApiError, errorMessage } from '@/lib/api';
import { Dialog, Empty, Field, Input, PageHeader, PageLoader, Select } from '@/components/ui';
import { BookOpen, Plus, Sparkles, ArrowRight } from '@/components/icons';
import { TeachNav, shortDate, useTeacherScope } from './shared';

export default function TeachPlans() {
  const { q, readOnly } = useTeacherScope();
  const [open, setOpen] = useState(false);
  const plans = useQuery({ queryKey: ['teach-plans', q('')], queryFn: () => api.get<{ plans: LessonPlan[] }>(q('/api/teach/lesson-plans')) });
  if (plans.isLoading) return <PageLoader />;
  const list = plans.data?.plans ?? [];
  return (
    <div className="container py-8">
      <PageHeader title="Lesson plans" description="Zuva writes timed plans from the real course content. Edit them, print them, teach them." actions={readOnly ? undefined : <button type="button" className="btn-primary" onClick={() => setOpen(true)}><Sparkles className="h-4 w-4" /> New plan</button>} />
      <TeachNav />
      {list.length ? (
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {list.map((p) => (
            <li key={p.id}>
              <Link to={q(`/teach/plans/${p.id}`)} className="card flex h-full flex-col p-5 hover:border-teal">
                <span className="text-sm font-semibold text-teal-600">{p.trackTitle}</span>
                <span className="mt-1 font-display text-lg font-semibold">{p.title}</span>
                <span className="mt-1 line-clamp-2 text-sm text-muted-fg">{p.content.overview}</span>
                <span className="mt-auto flex items-center justify-between pt-3 text-xs text-muted-fg">
                  <span>{p.content.timeline.reduce((n, t) => n + t.minutes, 0)} min · updated {shortDate(p.updatedAt)}</span>
                  <ArrowRight className="h-4 w-4" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <Empty icon={<BookOpen className="h-10 w-10" />} title="No lesson plans yet" action={readOnly ? undefined : <button type="button" className="btn-primary" onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Plan a lesson</button>}>
          Pick a course and lessons; Zuva plans the session minute by minute, with support and stretch tasks and a paper fallback for power cuts.
        </Empty>
      )}
      <Dialog open={open} onOpenChange={setOpen} title="Plan a lesson with Zuva" wide>
        <NewPlan onDone={() => setOpen(false)} />
      </Dialog>
    </div>
  );
}

function NewPlan({ onDone }: { onDone: () => void }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const classes = useQuery({ queryKey: ['my-classes'], queryFn: () => api.get<{ teaching: { id: string; name: string; archived: boolean; trackIds: string[] }[] }>('/api/classrooms') });
  const [form, setForm] = useState({ trackId: 'python', lessons: [] as string[], minutes: 60, classroomId: '', focus: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const track = getCatalogTrack(form.trackId);
  const create = useMutation({
    mutationFn: () => api.post<{ plan: LessonPlan }>('/api/teach/lesson-plans', { trackId: form.trackId, lessonSlugs: form.lessons, minutes: form.minutes, classroomId: form.classroomId || null, focus: form.focus }),
    onSuccess: (r) => { qc.invalidateQueries({ queryKey: ['teach-plans'] }); toast.success('Your plan is ready'); onDone(); navigate(`/teach/plans/${r.plan.id}`); },
    onError: (e) => { if (e instanceof ApiError && e.fields) setErrors(e.fields); toast.error(errorMessage(e)); },
  });
  const toggle = (slug: string) => setForm((f) => ({ ...f, lessons: f.lessons.includes(slug) ? f.lessons.filter((x) => x !== slug) : f.lessons.length >= 5 ? f.lessons : [...f.lessons, slug] }));
  return (
    <form onSubmit={(e) => { e.preventDefault(); setErrors({}); create.mutate(); }} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Course" htmlFor="np-track" error={errors.trackId}>
          <Select id="np-track" value={form.trackId} onChange={(e) => setForm({ ...form, trackId: e.target.value, lessons: [] })}>
            {catalog.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
          </Select>
        </Field>
        <Field label="Class (optional)" htmlFor="np-class" hint="Zuva fits the plan to the class level and size.">
          <Select id="np-class" value={form.classroomId} onChange={(e) => setForm({ ...form, classroomId: e.target.value })}>
            <option value="">Any class</option>
            {(classes.data?.teaching ?? []).filter((c) => !c.archived).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </Field>
      </div>
      <fieldset>
        <legend className="label">Lessons to cover <span className="font-normal text-muted-fg">(up to 5; none = the first two)</span></legend>
        <div className="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-border p-2 text-sm">
          {track?.lessons.map((l, i) => (
            <label key={l.slug} className="flex items-center gap-2"><input type="checkbox" className="accent-teal" checked={form.lessons.includes(l.slug)} onChange={() => toggle(l.slug)} /> {i + 1}. {l.title} <span className="text-muted-fg">({l.minutes} min)</span></label>
          ))}
        </div>
      </fieldset>
      <div className="grid gap-4 sm:grid-cols-[160px_1fr]">
        <Field label="Session length" htmlFor="np-min">
          <Select id="np-min" value={form.minutes} onChange={(e) => setForm({ ...form, minutes: Number(e.target.value) })}>
            {[30, 35, 40, 45, 60, 70, 80, 90, 120].map((m) => <option key={m} value={m}>{m} minutes</option>)}
          </Select>
        </Field>
        <Field label="Anything Zuva should know (optional)" htmlFor="np-focus"><Input id="np-focus" placeholder="e.g. 40 learners, 10 shared laptops, first time coding" value={form.focus} onChange={(e) => setForm({ ...form, focus: e.target.value })} maxLength={600} /></Field>
      </div>
      <button className="btn-primary" disabled={create.isPending}><Sparkles className="h-4 w-4" /> {create.isPending ? 'Zuva is planning… (about 30 seconds)' : 'Write the plan'}</button>
    </form>
  );
}

