import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { Capstone } from '@shared/api-types';
import { CAREERS } from '@/data/careers';
import { errorMessage } from '@/lib/api';
import { Dialog, Field, Input, Select, Textarea } from '@/components/ui';
import { ClipboardCheck, Users, GraduationCap, AlarmClock, Plus, BookOpen, Sparkles, Brain, MessageSquare } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Empty, PageHeader, PageLoader, Stat } from '@/components/ui';
import { greeting } from '@/lib/utils';

interface Summary { classes: { id: string; name: string; learners: number; to_grade: number; assignments: number; inactive: number }[] }

export default function TeachHome() {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({ queryKey: ['teach-summary'], queryFn: () => api.get<Summary>('/api/classrooms/teaching/summary') });
  if (isLoading) return <PageLoader />;
  const classes = data?.classes ?? [];
  const totals = classes.reduce((a, c) => ({ learners: a.learners + c.learners, toGrade: a.toGrade + c.to_grade, inactive: a.inactive + c.inactive }), { learners: 0, toGrade: 0, inactive: 0 });

  return (
    <div className="container py-8">
      <PageHeader title="Teaching" description={`${greeting()}, ${user?.name.split(' ')[0]}. Here’s what needs your attention.`} actions={<Link to="/classes" className="btn-primary"><Plus className="h-4 w-4" /> New class</Link>} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Active classes" value={classes.length} icon={<GraduationCap className="h-4 w-4" />} />
        <Stat label="Learners" value={totals.learners} icon={<Users className="h-4 w-4" />} />
        <Stat label="Waiting to be graded" value={totals.toGrade} icon={<ClipboardCheck className="h-4 w-4 text-gold-600" />} sub="AI has pre-marked these" />
        <Stat label="Inactive 7+ days" value={totals.inactive} icon={<AlarmClock className="h-4 w-4 text-stone" />} sub="Worth a nudge" />
      </div>
      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_340px]">
        <section>
          <h2 className="mb-4 text-xl font-bold">Your classes</h2>
          {classes.length ? (
            <ul className="card divide-y divide-border overflow-hidden">
              {classes.map((c) => (
                <li key={c.id}>
                  <Link to={`/classes/${c.id}`} className="flex flex-wrap items-center gap-4 px-5 py-4 hover:bg-muted">
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold">{c.name}</div>
                      <div className="text-xs text-muted-fg">{c.learners} learners · {c.assignments} assignments</div>
                    </div>
                    {c.to_grade > 0 && <span className="chip bg-gold-100 text-gold-600">{c.to_grade} to grade</span>}
                    {c.inactive > 0 && <span className="chip bg-stone-100 text-stone">{c.inactive} inactive</span>}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <Empty icon={<GraduationCap className="h-10 w-10" />} title="Create your first class" action={<Link to="/classes" className="btn-primary">Create a class</Link>}>
              Choose the tracks to follow, then share the join code with your learners.
            </Empty>
          )}
          <CapstoneQueue />
        </section>
        <aside className="card p-5">
          <h2 className="font-display text-lg font-semibold">Your toolkit</h2>
          <ul className="mt-4 space-y-4 text-sm">
            <li className="flex gap-3"><Sparkles className="h-5 w-5 shrink-0 text-gold-600" /><span><strong>AI assignment drafts.</strong> Describe a topic and get instructions, starter code and a rubric to edit.</span></li>
            <li className="flex gap-3"><ClipboardCheck className="h-5 w-5 shrink-0 text-teal" /><span><strong>AI pre-marking.</strong> Every submission arrives with a suggested score and feedback. You decide the final grade.</span></li>
            <li className="flex gap-3"><Brain className="h-5 w-5 shrink-0 text-ink dark:text-sand" /><span><strong>Class insights.</strong> See who is stuck and what to teach next.</span></li>
            <li className="flex gap-3"><MessageSquare className="h-5 w-5 shrink-0 text-stone" /><span><strong>Discussion & announcements.</strong> Keep the class talking between lessons.</span></li>
            <li className="flex gap-3"><BookOpen className="h-5 w-5 shrink-0 text-teal" /><span><strong>{'Core tutorials free.'}</strong> Point learners at any lesson — progress shows up in your class table.</span></li>
          </ul>
        </aside>
      </div>
    </div>
  );
}

/** Capstones from this teacher's learners, waiting for review and sign-off. */
function CapstoneQueue() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ['capstone-review'], queryFn: () => api.get<{ capstones: Capstone[] }>('/api/capstones/review') });
  const [open, setOpen] = useState<Capstone | null>(null);
  const [form, setForm] = useState({ feedback: '', grade: '', status: 'completed' as 'building' | 'review' | 'completed' });
  const review = useMutation({
    mutationFn: () => api.post(`/api/capstones/${open!.id}/review`, { feedback: form.feedback, grade: form.grade === '' ? null : Number(form.grade), status: form.status }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['capstone-review'] }); setOpen(null); toast.success('Review sent to the learner'); },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const items = data?.capstones ?? [];
  return (
    <section className="mt-8">
      <h2 className="mb-4 text-xl font-bold">Capstones to review</h2>
      {items.length === 0 ? <p className="text-[15px] text-fg/70">When learners in your classes move a capstone to review, it appears here.</p> : (
        <ul className="card divide-y divide-border overflow-hidden">
          {items.map((c) => (
            <li key={c.id} className="flex flex-wrap items-center gap-4 px-5 py-4">
              <div className="min-w-0 flex-1">
                <div className="font-semibold">{c.title}</div>
                <div className="text-sm text-fg/70">{c.learnerName} · {CAREERS.find((x) => x.id === c.careerId)?.title ?? 'Independent'} · {c.status === 'review' ? 'ready for review' : 'still building'}</div>
              </div>
              {c.repoUrl && <a href={c.repoUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-teal-600 hover:underline">Repo</a>}
              {c.demoUrl && <a href={c.demoUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-teal-600 hover:underline">Demo</a>}
              <button className={c.status === 'review' ? 'btn-primary btn-sm' : 'btn-outline btn-sm'} onClick={() => { setForm({ feedback: c.feedback ?? '', grade: c.grade?.toString() ?? '', status: 'completed' }); setOpen(c); }}>Review</button>
            </li>
          ))}
        </ul>
      )}
      <Dialog open={!!open} onOpenChange={(o) => !o && setOpen(null)} title={open ? `Review: ${open.title}` : ''} description={open?.summary || undefined} wide>
        <form onSubmit={(e) => { e.preventDefault(); review.mutate(); }} className="space-y-4">
          <Field label="Feedback for the learner" htmlFor="rf"><Textarea id="rf" rows={6} required minLength={3} value={form.feedback} onChange={(e) => setForm({ ...form, feedback: e.target.value })} /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Grade out of 100 (optional)" htmlFor="rg"><Input id="rg" type="number" min={0} max={100} value={form.grade} onChange={(e) => setForm({ ...form, grade: e.target.value })} /></Field>
            <Field label="Decision" htmlFor="rs">
              <Select id="rs" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as typeof form.status })}>
                <option value="completed">Sign off as complete</option>
                <option value="building">Needs more work</option>
                <option value="review">Keep in review</option>
              </Select>
            </Field>
          </div>
          <button disabled={review.isPending} className="btn-primary">Send review</button>
        </form>
      </Dialog>
    </section>
  );
}
