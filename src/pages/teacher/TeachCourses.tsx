import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { CourseColor, CourseSummary } from '@shared/courses';
import { api, errorMessage } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Dialog, Empty, Field, Input, PageHeader, PageLoader, Textarea } from '@/components/ui';
import { MaterialIcon, Plus } from '@/components/icons';
import { TeachNav, shortDate, useTeacherScope } from './shared';

/** Course spine colours: a band down the left of each card, from the site palette. */
export const COURSE_BAND: Record<CourseColor, string> = { teal: 'bg-teal', gold: 'bg-gold', ink: 'bg-ink dark:bg-sand', clay: 'bg-[#B5543B]' };

export default function TeachCourses() {
  const { readOnly } = useTeacherScope();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: '', summary: '', subject: '', audience: '' });
  const list = useQuery({ queryKey: ['teach-courses'], queryFn: () => api.get<{ courses: CourseSummary[] }>('/api/courses') });
  const create = useMutation({ mutationFn: () => api.post<{ id: string }>('/api/courses', form), onSuccess: (r) => nav(`/teach/courses/${r.id}`), onError: (e) => toast.error(errorMessage(e)) });
  if (list.isLoading) return <PageLoader />;
  const courses = list.data?.courses ?? [];
  return (
    <div className="container py-8">
      <PageHeader title="Your courses" description="Build your own course: units, lessons with notes and video, and a quick check after each lesson that marks itself. Share it with a class or chosen learners."
        actions={readOnly ? undefined : <button type="button" className="btn-primary" onClick={() => setOpen(true)}><Plus /> New course</button>} />
      <TeachNav />
      {courses.length ? (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {courses.map((c) => (
            <li key={c.id}>
              <Link to={`/teach/courses/${c.id}`} className="card relative flex h-full flex-col overflow-hidden p-5 pl-7 hover:border-teal">
                <span aria-hidden="true" className={cn('absolute inset-y-0 left-0 w-2', COURSE_BAND[c.color])} />
                <span className="flex items-center gap-2 text-sm text-muted-fg">{c.subject || 'Course'}{c.audience && ` · ${c.audience}`}<span className={cn('chip ml-auto', c.publishedAt ? 'bg-teal-100 text-teal-900 dark:bg-teal-900 dark:text-teal-50' : 'bg-muted')}>{c.publishedAt ? 'Published' : 'Draft'}</span></span>
                <span className="mt-2 font-display text-lg font-semibold">{c.title}</span>
                {c.summary && <span className="mt-1 line-clamp-2 text-[15px] text-fg/80">{c.summary}</span>}
                <span className="mt-auto pt-4 text-sm text-muted-fg">{c.units} {c.units === 1 ? 'unit' : 'units'} · {c.lessons} {c.lessons === 1 ? 'lesson' : 'lessons'} · {c.learners} {c.learners === 1 ? 'learner' : 'learners'} · edited {shortDate(c.updatedAt)}</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <Empty icon={<MaterialIcon name="menu_book" className="text-[40px]" />} title="No courses yet" action={readOnly ? undefined : <button type="button" className="btn-primary" onClick={() => setOpen(true)}><Plus /> Start a course</button>}>
          Turn what you teach into a course your learners can work through at their own pace. Zuva can draft any lesson for you to edit.
        </Empty>
      )}
      <Dialog open={open} onOpenChange={setOpen} title="New course">
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); if (form.title.trim().length >= 2) create.mutate(); }}>
          <Field label="Title" htmlFor="nc-t"><Input id="nc-t" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} maxLength={120} placeholder="e.g. Grade 6 Science: Energy" autoFocus /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Subject" htmlFor="nc-s"><Input id="nc-s" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} maxLength={60} placeholder="Science" /></Field>
            <Field label="Who it’s for" htmlFor="nc-a"><Input id="nc-a" value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value })} maxLength={60} placeholder="Ages 11–12" /></Field>
          </div>
          <Field label="One or two lines about it (optional)" htmlFor="nc-d"><Textarea id="nc-d" value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} rows={2} maxLength={600} /></Field>
          <button className="btn-primary w-full" disabled={form.title.trim().length < 2 || create.isPending} aria-busy={create.isPending || undefined}>Create and add lessons</button>
        </form>
      </Dialog>
    </div>
  );
}
