/**
 * The course builder: an outline of units and lessons on the left, the selected lesson's editor on
 * the right (notes in Markdown with a preview, an optional video, and an auto-marked check).
 * Other tabs: who the course is shared with and their progress, and the course details.
 */
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { COURSE_COLORS, videoEmbed, type CourseColor, type CourseDetail, type TeacherLesson } from '@shared/courses';
import type { Classroom } from '@shared/api-types';
import type { Question } from '@shared/tests';
import { api, errorMessage } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Dialog, Field, Input, PageHeader, PageLoader, Textarea } from '@/components/ui';
import { ArrowLeft, MaterialIcon, Plus, Trash2 } from '@/components/icons';
import { Markdown } from '@/components/Markdown';
import { TeachNav, shortDate } from './shared';
import { QuestionEditor, TYPE_LABEL, blank } from './TeachTest';
import { LearnerPicker, type Audience } from './LearnerPicker';
import { COURSE_BAND } from './TeachCourses';

type Tab = 'content' | 'learners' | 'details';
const COLOR_NAME: Record<CourseColor, string> = { teal: 'Teal', gold: 'Gold', ink: 'Ink', clay: 'Clay' };

function IconButton({ label, icon, onClick, disabled, danger }: { label: string; icon: string; onClick: () => void; disabled?: boolean; danger?: boolean }) {
  return <button type="button" aria-label={label} title={label} onClick={onClick} disabled={disabled} className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-full hover:bg-muted disabled:opacity-30', danger && 'text-red-700 hover:bg-red-700/10 dark:text-red-300')}><MaterialIcon name={icon as never} className="text-[20px]" /></button>;
}

function LessonEditor({ courseId, lessonId, onSaved, onDeleted }: { courseId: string; lessonId: string; onSaved: () => void; onDeleted: () => void }) {
  const q = useQuery({ queryKey: ['course-lesson', lessonId], queryFn: () => api.get<{ lesson: TeacherLesson }>(`/api/courses/${courseId}/lessons/${lessonId}`) });
  const [l, setL] = useState<TeacherLesson | null>(null);
  const [view, setView] = useState<'write' | 'preview'>('write');
  const [dirty, setDirty] = useState(false);
  const [draftOpen, setDraftOpen] = useState(false);
  const [notes, setNotes] = useState('');
  useEffect(() => { if (q.data) { setL(q.data.lesson); setDirty(false); } }, [q.data]);
  const set = (patch: Partial<TeacherLesson>) => { setL((x) => (x ? { ...x, ...patch } : x)); setDirty(true); };
  const save = useMutation({
    mutationFn: () => api.put(`/api/courses/${courseId}/lessons/${lessonId}`, { title: l!.title, body: l!.body, videoUrl: l!.videoUrl || null, minutes: l!.minutes, checks: l!.checks }),
    onSuccess: () => { setDirty(false); toast.success('Lesson saved'); onSaved(); },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const remove = useMutation({ mutationFn: () => api.del(`/api/courses/${courseId}/lessons/${lessonId}`), onSuccess: () => { toast.success('Lesson deleted'); onDeleted(); }, onError: (e) => toast.error(errorMessage(e)) });
  const draft = useMutation({
    mutationFn: () => api.post<{ body: string; checks: Question[] }>('/api/courses/draft-lesson', { courseId, title: l!.title, notes, minutes: Math.min(90, Math.max(5, l!.minutes)) }),
    onSuccess: (r) => { set({ body: r.body, checks: r.checks }); setDraftOpen(false); setView('preview'); toast.success('Zuva’s draft is in. Read it through and change anything before saving.'); },
    onError: (e) => toast.error(errorMessage(e)),
  });
  // Don't lose edits on tab close.
  useEffect(() => { if (!dirty) return; const h = (e: BeforeUnloadEvent) => { e.preventDefault(); }; window.addEventListener('beforeunload', h); return () => window.removeEventListener('beforeunload', h); }, [dirty]);
  if (!l) return <div className="card h-96 animate-pulse" aria-busy="true" />;
  const embed = videoEmbed(l.videoUrl);
  const videoBad = !!l.videoUrl && !embed;
  return (
    <div className="space-y-5">
      <div className="card space-y-4 p-5">
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_8rem]">
          <Field label="Lesson title" htmlFor="le-t"><Input id="le-t" value={l.title} onChange={(e) => set({ title: e.target.value })} maxLength={120} /></Field>
          <Field label="Minutes" htmlFor="le-m"><Input id="le-m" type="number" min={1} max={180} value={l.minutes} onChange={(e) => set({ minutes: Math.max(1, Math.min(180, Number(e.target.value) || 1)) })} /></Field>
        </div>
        <Field label="Video (optional): a YouTube or Vimeo link" htmlFor="le-v" error={videoBad ? 'Use a YouTube or Vimeo link.' : undefined}><Input id="le-v" value={l.videoUrl ?? ''} onChange={(e) => set({ videoUrl: e.target.value })} placeholder="https://www.youtube.com/watch?v=…" inputMode="url" /></Field>
        {embed && <div className="aspect-video overflow-hidden rounded-md bg-black"><iframe src={embed} title="Lesson video preview" className="h-full w-full" allow="encrypted-media; picture-in-picture" allowFullScreen loading="lazy" referrerPolicy="strict-origin-when-cross-origin" /></div>}
        <div>
          <div className="mb-1.5 flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold">Lesson notes</span>
            <div role="tablist" aria-label="Notes view" className="inline-flex rounded-full bg-muted p-0.5 text-sm">
              {(['write', 'preview'] as const).map((v) => <button key={v} type="button" role="tab" aria-selected={view === v} onClick={() => setView(v)} className={cn('min-h-9 rounded-full px-3 font-semibold capitalize', view === v ? 'bg-card text-fg' : 'text-muted-fg')}>{v}</button>)}
            </div>
            <button type="button" className="btn-outline-run btn-sm ml-auto" onClick={() => setDraftOpen(true)}><MaterialIcon name="auto_awesome" /> Draft with Zuva</button>
          </div>
          {view === 'write'
            ? <Textarea aria-label="Lesson notes in Markdown" value={l.body} onChange={(e) => set({ body: e.target.value })} rows={16} maxLength={20000} className="font-mono text-[14px]" placeholder={'## What we’re learning\nWrite your notes here. Use ## for headings, - for lists, **bold**, and [links](https://…).'} />
            : <div className="min-h-[200px] rounded-md border border-border bg-card p-4">{l.body.trim() ? <Markdown>{l.body}</Markdown> : <p className="text-muted-fg">Nothing to preview yet.</p>}</div>}
          <p className="mt-1 text-xs text-muted-fg">Markdown: ## heading, - list, **bold**, [link](https://…). {l.body.length.toLocaleString()} / 20,000 characters.</p>
        </div>
      </div>

      <section className="space-y-3" aria-labelledby="checks">
        <div className="flex flex-wrap items-baseline justify-between gap-2"><h3 id="checks" className="font-display text-lg font-semibold">Quick check</h3><span className="text-sm text-muted-fg">Marked instantly when the learner finishes the lesson. Optional.</span></div>
        <ol className="space-y-3">{l.checks.map((x, i) => <QuestionEditor key={x.id} x={x} i={i} locked={false} onChange={(nq) => set({ checks: l.checks.map((y, j) => (j === i ? nq : y)) })} onRemove={() => set({ checks: l.checks.filter((_, j) => j !== i) })} />)}</ol>
        {l.checks.length < 12 && <div className="flex flex-wrap gap-2">{(['mcq', 'numeric', 'short'] as const).map((k) => <button key={k} type="button" className="btn-outline btn-sm" onClick={() => set({ checks: [...l.checks, blank(k, Date.now() % 100000)] })}><Plus /> {TYPE_LABEL[k]}</button>)}</div>}
      </section>

      <div className="sticky bottom-0 z-10 -mx-4 flex items-center gap-2 border-t border-border bg-granite/95 px-4 py-3 backdrop-blur dark:bg-night/95">
        <button type="button" className="btn-ghost text-red-700 dark:text-red-300" onClick={() => { if (window.confirm(`Delete “${l.title}”? Learners’ progress on it goes too.`)) remove.mutate(); }}><Trash2 /> Delete lesson</button>
        <span className="ml-auto text-sm text-muted-fg" aria-live="polite">{dirty ? 'Unsaved changes' : 'Saved'}</span>
        <button type="button" className="btn-primary" onClick={() => save.mutate()} disabled={!dirty || videoBad || save.isPending} aria-busy={save.isPending || undefined}>Save lesson</button>
      </div>

      <Dialog open={draftOpen} onOpenChange={setDraftOpen} title={`Draft “${l.title}” with Zuva`} description="Zuva writes notes and a quick check for this lesson. You edit it before anyone sees it.">
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); if (!l.body.trim() || window.confirm('Replace the notes and quick check you have now?')) draft.mutate(); }}>
          <Field label="What should it cover? (optional)" htmlFor="dr-n"><Textarea id="dr-n" value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} maxLength={1500} placeholder="e.g. Kinetic and potential energy, with examples from a bicycle and a dam. Keep it to Grade 6 level." /></Field>
          <button className="btn-primary w-full" disabled={draft.isPending} aria-busy={draft.isPending || undefined}><MaterialIcon name="auto_awesome" /> {draft.isPending ? 'Writing…' : 'Write the draft'}</button>
        </form>
      </Dialog>
    </div>
  );
}

function Outline({ d, courseId, selected, onSelect, refresh }: { d: CourseDetail; courseId: string; selected: string | null; onSelect: (id: string) => void; refresh: () => void }) {
  const err = (e: unknown) => toast.error(errorMessage(e));
  const addUnit = useMutation({ mutationFn: () => api.post(`/api/courses/${courseId}/units`, { title: `Unit ${d.units.length + 1}` }), onSuccess: refresh, onError: err });
  const addLesson = useMutation({ mutationFn: (unitId: string) => api.post<{ id: string }>(`/api/courses/${courseId}/units/${unitId}/lessons`, { title: 'New lesson', body: '', minutes: 15, checks: [] }), onSuccess: (r) => { refresh(); onSelect(r.id); }, onError: err });
  const rename = useMutation({ mutationFn: ({ id, title }: { id: string; title: string }) => api.put(`/api/courses/${courseId}/units/${id}`, { title }), onSuccess: refresh, onError: err });
  const delUnit = useMutation({ mutationFn: (id: string) => api.del(`/api/courses/${courseId}/units/${id}`), onSuccess: refresh, onError: err });
  const moveUnits = useMutation({ mutationFn: (ids: string[]) => api.post(`/api/courses/${courseId}/units/reorder`, { ids }), onSuccess: refresh, onError: err });
  const moveLessons = useMutation({ mutationFn: ({ unitId, ids }: { unitId: string; ids: string[] }) => api.post(`/api/courses/${courseId}/units/${unitId}/lessons/reorder`, { ids }), onSuccess: refresh, onError: err });
  const swap = <T,>(a: T[], i: number, j: number) => { const b = [...a]; [b[i], b[j]] = [b[j]!, b[i]!]; return b; };
  return (
    <nav aria-label="Course outline" className="space-y-4">
      {d.units.map((u, ui) => (
        <section key={u.id} className="card overflow-hidden">
          <div className="flex items-center gap-1 border-b border-border bg-muted/50 px-2 py-1.5">
            <input aria-label={`Unit ${ui + 1} title`} defaultValue={u.title} maxLength={120} onBlur={(e) => { const t = e.target.value.trim(); if (t && t !== u.title) rename.mutate({ id: u.id, title: t }); }} className="min-w-0 flex-1 rounded-md bg-transparent px-2 py-1.5 font-semibold focus:bg-card focus:outline-none focus-visible:ring-2 focus-visible:ring-teal" />
            <IconButton label="Move unit up" icon="arrow_upward" disabled={ui === 0} onClick={() => moveUnits.mutate(swap(d.units.map((x) => x.id), ui, ui - 1))} />
            <IconButton label="Move unit down" icon="arrow_downward" disabled={ui === d.units.length - 1} onClick={() => moveUnits.mutate(swap(d.units.map((x) => x.id), ui, ui + 1))} />
            <IconButton label={`Delete ${u.title}`} icon="delete" danger onClick={() => { if (window.confirm(`Delete “${u.title}” and its ${u.lessons.length} lessons?`)) delUnit.mutate(u.id); }} />
          </div>
          <ol>
            {u.lessons.map((l, li) => (
              <li key={l.id} className={cn('flex items-center gap-1 border-b border-border pr-1 last:border-b-0', selected === l.id && 'bg-teal-100/60 dark:bg-teal-900/40')}>
                <button type="button" onClick={() => onSelect(l.id)} aria-current={selected === l.id ? 'true' : undefined} className="min-h-11 min-w-0 flex-1 px-3 py-2 text-left">
                  <span className="block truncate text-[15px] font-medium">{li + 1}. {l.title}</span>
                  <span className="block text-xs text-muted-fg">{l.minutes} min{l.hasVideo ? ' · video' : ''}{l.checks ? ` · ${l.checks} check ${l.checks === 1 ? 'question' : 'questions'}` : ''}</span>
                </button>
                <IconButton label="Move lesson up" icon="arrow_upward" disabled={li === 0} onClick={() => moveLessons.mutate({ unitId: u.id, ids: swap(u.lessons.map((x) => x.id), li, li - 1) })} />
                <IconButton label="Move lesson down" icon="arrow_downward" disabled={li === u.lessons.length - 1} onClick={() => moveLessons.mutate({ unitId: u.id, ids: swap(u.lessons.map((x) => x.id), li, li + 1) })} />
              </li>
            ))}
          </ol>
          <button type="button" className="flex min-h-11 w-full items-center gap-2 px-3 text-[15px] font-semibold text-teal-700 hover:bg-muted dark:text-teal-400" onClick={() => addLesson.mutate(u.id)} disabled={addLesson.isPending}><Plus /> Add a lesson</button>
        </section>
      ))}
      <button type="button" className="btn-outline w-full" onClick={() => addUnit.mutate()} disabled={addUnit.isPending}><Plus /> Add a unit</button>
    </nav>
  );
}

function LearnersTab({ d, courseId, refresh }: { d: CourseDetail; courseId: string; refresh: () => void }) {
  const classes = useQuery({ queryKey: ['classes'], queryFn: () => api.get<{ teaching: Classroom[] }>('/api/classrooms') });
  const [classIds, setClassIds] = useState<string[]>(d.access.classes.map((c) => c.id));
  const [aud, setAud] = useState<Audience>({ mode: 'learners', classroomId: '', studentIds: d.access.learners.map((l) => l.id) });
  const share = useMutation({ mutationFn: () => api.put<{ learners: number }>(`/api/courses/${courseId}/share`, { classroomIds: classIds, studentIds: aud.studentIds }), onSuccess: (r) => { toast.success(`Shared with ${r.learners} ${r.learners === 1 ? 'learner' : 'learners'}.`); refresh(); }, onError: (e) => toast.error(errorMessage(e)) });
  const total = d.course.lessons;
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
      <section className="card h-fit space-y-4 p-5" aria-labelledby="share">
        <h2 id="share" className="font-display text-lg font-semibold">Who can open it</h2>
        <fieldset>
          <legend className="mb-1.5 text-sm font-semibold">Whole classes (new members get it too)</legend>
          {(classes.data?.teaching ?? []).length ? (
            <ul className="space-y-1">{classes.data!.teaching.map((c) => <li key={c.id}><label className="flex min-h-11 items-center gap-3 rounded-md px-2 hover:bg-muted"><input type="checkbox" className="h-5 w-5 accent-teal" checked={classIds.includes(c.id)} onChange={() => setClassIds((s) => (s.includes(c.id) ? s.filter((x) => x !== c.id) : [...s, c.id]))} />{c.name}</label></li>)}</ul>
          ) : <p className="text-sm text-muted-fg">No classes yet.</p>}
        </fieldset>
        <div><p className="mb-1.5 text-sm font-semibold">And chosen learners</p><LearnerPicker value={aud} onChange={setAud} learnersOnly /></div>
        <button type="button" className="btn-primary w-full" onClick={() => share.mutate()} disabled={share.isPending} aria-busy={share.isPending || undefined}>Save who can open it</button>
        {!d.course.publishedAt && <p className="text-sm text-muted-fg">Learners see the course once you publish it, and get a notification then.</p>}
      </section>
      <section aria-labelledby="prog">
        <h2 id="prog" className="mb-3 font-display text-lg font-semibold">Progress</h2>
        {!d.progress.length ? <p className="text-muted-fg">No learners yet.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[460px] text-left text-[15px]">
              <thead className="text-sm text-muted-fg"><tr><th className="py-2 pr-3 font-medium">Learner</th><th className="pr-3 font-medium">Lessons done</th><th className="pr-3 text-right font-medium">Check average</th><th className="font-medium">Last</th></tr></thead>
              <tbody>
                {d.progress.map((p) => (
                  <tr key={p.studentId} className="border-t border-border">
                    <td className="py-2.5 pr-3"><Link to={`/teach/students/${p.studentId}`} className="hover:underline">{p.name}</Link></td>
                    <td className="pr-3"><span className="flex items-center gap-2"><span className="h-2 w-20 rounded-full bg-muted" aria-hidden="true"><span className="block h-2 rounded-full bg-teal dark:bg-teal-400" style={{ width: `${total ? (p.done / total) * 100 : 0}%` }} /></span><span className="tabular-nums">{p.done} / {total}</span></span></td>
                    <td className="pr-3 text-right tabular-nums">{p.avgPct == null ? '—' : `${p.avgPct}%`}</td>
                    <td>{p.lastAt ? shortDate(p.lastAt) : <span className="text-muted-fg">Not started</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function DetailsTab({ d, courseId, refresh }: { d: CourseDetail; courseId: string; refresh: () => void }) {
  const nav = useNavigate();
  const [f, setF] = useState({ title: d.course.title, summary: d.course.summary, subject: d.course.subject, audience: d.course.audience, color: d.course.color });
  const save = useMutation({ mutationFn: () => api.put(`/api/courses/${courseId}`, f), onSuccess: () => { toast.success('Saved'); refresh(); }, onError: (e) => toast.error(errorMessage(e)) });
  const del = useMutation({ mutationFn: () => api.del(`/api/courses/${courseId}`), onSuccess: () => { toast.success('Course deleted'); nav('/teach/courses'); }, onError: (e) => toast.error(errorMessage(e)) });
  return (
    <form className="card max-w-2xl space-y-4 p-5" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
      <Field label="Title" htmlFor="cd-t"><Input id="cd-t" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} maxLength={120} /></Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Subject" htmlFor="cd-s"><Input id="cd-s" value={f.subject} onChange={(e) => setF({ ...f, subject: e.target.value })} maxLength={60} /></Field>
        <Field label="Who it’s for" htmlFor="cd-a"><Input id="cd-a" value={f.audience} onChange={(e) => setF({ ...f, audience: e.target.value })} maxLength={60} /></Field>
      </div>
      <Field label="About the course" htmlFor="cd-d"><Textarea id="cd-d" value={f.summary} onChange={(e) => setF({ ...f, summary: e.target.value })} rows={3} maxLength={600} /></Field>
      <fieldset><legend className="mb-1.5 text-sm font-semibold">Colour</legend>
        <div className="flex gap-2">{COURSE_COLORS.map((c) => <button key={c} type="button" aria-pressed={f.color === c} aria-label={COLOR_NAME[c]} title={COLOR_NAME[c]} onClick={() => setF({ ...f, color: c })} className={cn('h-11 w-11 rounded-full ring-offset-2 ring-offset-card', COURSE_BAND[c], f.color === c && 'ring-2 ring-fg')} />)}</div>
      </fieldset>
      <div className="flex flex-wrap gap-2 pt-2">
        <button type="button" className="btn-ghost text-red-700 dark:text-red-300" onClick={() => { if (window.confirm(`Delete “${d.course.title}”? Every lesson and all learner progress on it goes too. This can’t be undone.`)) del.mutate(); }}><Trash2 /> Delete course</button>
        <button className="btn-primary ml-auto" disabled={save.isPending} aria-busy={save.isPending || undefined}>Save details</button>
      </div>
    </form>
  );
}

export default function TeachCourse() {
  const { id = '' } = useParams();
  const qc = useQueryClient();
  const [params, setParams] = useSearchParams();
  const tab = (params.get('tab') as Tab) || 'content';
  const r = useQuery({ queryKey: ['teach-course', id], queryFn: () => api.get<CourseDetail>(`/api/courses/${id}`) });
  const refresh = () => void qc.invalidateQueries({ queryKey: ['teach-course', id] });
  const allLessons = useMemo(() => r.data?.units.flatMap((u) => u.lessons) ?? [], [r.data]);
  const selected = params.get('lesson') ?? allLessons[0]?.id ?? null;
  const select = (lid: string) => setParams((p) => { p.set('lesson', lid); p.delete('tab'); return p; }, { replace: true });
  const publish = useMutation({ mutationFn: (on: boolean) => api.post(`/api/courses/${id}/publish`, { publish: on }), onSuccess: (_x, on) => { toast.success(on ? 'Published. Learners with access have been told.' : 'Unpublished. Learners can’t open it now.'); refresh(); }, onError: (e) => toast.error(errorMessage(e)) });
  if (r.isLoading || !r.data) return r.error ? <div className="container py-8"><p>{errorMessage(r.error)}</p></div> : <PageLoader />;
  const d = r.data;
  return (
    <div className="container py-8">
      <Link to="/teach/courses" className="btn-ghost btn-sm -ml-3 mb-2"><ArrowLeft /> Your courses</Link>
      <PageHeader title={d.course.title}
        description={<span className="inline-flex flex-wrap items-center gap-2"><span className={cn('h-3 w-3 rounded-full', COURSE_BAND[d.course.color])} aria-hidden="true" />{d.course.publishedAt ? 'Published' : 'Draft'} · {d.course.units} units · {d.course.lessons} lessons · {d.course.learners} learners</span>}
        actions={<>
          <Link to={`/my-courses/${id}`} className="btn-outline"><MaterialIcon name="visibility" /> Preview</Link>
          {d.course.publishedAt
            ? <button type="button" className="btn-outline" onClick={() => publish.mutate(false)} disabled={publish.isPending}>Unpublish</button>
            : <button type="button" className="btn-primary" onClick={() => publish.mutate(true)} disabled={publish.isPending || !d.course.lessons}><MaterialIcon name="publish" /> Publish</button>}
        </>} />
      <TeachNav />
      <div role="tablist" aria-label="Course" className="mb-6 inline-flex rounded-full bg-muted p-1">
        {([['content', 'Lessons'], ['learners', `Learners (${d.course.learners})`], ['details', 'Details']] as const).map(([k, label]) => (
          <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setParams((p) => { p.set('tab', k); return p; }, { replace: true })} className={cn('min-h-10 rounded-full px-4 text-[15px] font-semibold', tab === k ? 'bg-card text-fg' : 'text-muted-fg')}>{label}</button>
        ))}
      </div>
      {tab === 'learners' ? <LearnersTab d={d} courseId={id} refresh={refresh} />
        : tab === 'details' ? <DetailsTab d={d} courseId={id} refresh={refresh} />
          : (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
              <Outline d={d} courseId={id} selected={selected} onSelect={select} refresh={refresh} />
              {selected && allLessons.some((l) => l.id === selected)
                ? <LessonEditor key={selected} courseId={id} lessonId={selected} onSaved={refresh} onDeleted={() => { setParams((p) => { p.delete('lesson'); return p; }, { replace: true }); refresh(); }} />
                : <div className="card grid min-h-64 place-items-center p-8 text-center"><div><MaterialIcon name="edit_note" className="text-[40px] text-muted-fg" /><p className="mt-2 text-muted-fg">Add a lesson to a unit to start writing.</p></div></div>}
            </div>
          )}
    </div>
  );
}
