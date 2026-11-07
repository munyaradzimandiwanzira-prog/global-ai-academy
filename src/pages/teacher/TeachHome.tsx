import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { Capstone } from '@shared/api-types';
import { CAREERS } from '@/data/careers';
import { errorMessage } from '@/lib/api';
import { Dialog, Field, Input, Select, Textarea } from '@/components/ui';
import { ClipboardCheck, Users, GraduationCap, AlarmClock, Plus, BookOpen, Sparkles, Brain, Ticket, Wallet } from '@/components/icons';
import { TeachNav, money, useTeacherScope } from './shared';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Empty, PageHeader, PageLoader, Stat } from '@/components/ui';
import { greeting } from '@/lib/utils';

interface Summary { classes: { id: string; name: string; learners: number; to_grade: number; assignments: number; inactive: number }[] }
interface Overview { students: number; paying: number; inactive: number; openWork: number; classes: number; toGrade: number; invites: number; lessonPlans: number; walletCents: number; needsAttention: { id: string; name: string; reason: string }[] }

const ASKS = [
  'Who needs my attention this week, and why?',
  'Write a 40-minute lesson plan for the next Python lesson',
  'Draft a homework task on loops for my class',
  'Summarise how my class is doing overall',
];

export default function TeachHome() {
  const { user } = useAuth();
  const { q, readOnly } = useTeacherScope();
  const overview = useQuery({ queryKey: ['teach-overview', q('')], queryFn: () => api.get<Overview>(q('/api/teach/overview')) });
  const { data, isLoading } = useQuery({ queryKey: ['teach-summary'], queryFn: () => api.get<Summary>('/api/classrooms/teaching/summary'), enabled: !readOnly });
  if (isLoading || overview.isLoading) return <PageLoader />;
  const o = overview.data;
  const classes = data?.classes ?? [];

  return (
    <div className="container py-8">
      <PageHeader
        title="Teaching"
        description={readOnly ? 'Teacher portal (admin view).' : `${greeting()}, ${user?.name.split(' ')[0]}. Here’s what needs your attention.`}
        actions={readOnly ? undefined : <><Link to="/teach/invites" className="btn-outline"><Ticket className="h-4 w-4" /> Invite learners</Link><Link to="/classes" className="btn-primary"><Plus className="h-4 w-4" /> New class</Link></>}
      />
      <TeachNav />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Students" value={o?.students ?? 0} icon={<Users className="h-4 w-4" />} sub={`${o?.paying ?? 0} on a paid plan`} />
        <Stat label="Need attention" value={o?.needsAttention.length ?? 0} icon={<AlarmClock className="h-4 w-4 text-stone" />} sub={`${o?.inactive ?? 0} inactive 7+ days`} />
        <Stat label="Waiting to be graded" value={o?.toGrade ?? 0} icon={<ClipboardCheck className="h-4 w-4 text-gold-700 dark:text-gold" />} sub="Zuva has pre-marked these" />
        <Stat label="Wallet" value={money(o?.walletCents ?? 0)} icon={<Wallet className="h-4 w-4 text-teal" />} sub="From your students’ subscriptions" />
      </div>
      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_340px]">
        <section className="min-w-0">
          <h2 className="mb-4 text-xl font-bold">Needs attention</h2>
          {o?.needsAttention.length ? (
            <ul className="card divide-y divide-border overflow-hidden">
              {o.needsAttention.map((s) => (
                <li key={s.id}>
                  <Link to={q(`/teach/students/${s.id}`)} className="flex flex-wrap items-center gap-3 px-5 py-3.5 hover:bg-muted">
                    <span className="min-w-0 flex-1 font-semibold">{s.name}</span>
                    <span className="text-sm text-muted-fg">{s.reason}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[15px] text-fg/70">{o?.students ? 'Everyone is active and up to date.' : 'No students yet. Share an invite link to get started.'}</p>
          )}

          {!readOnly && (
            <>
              <h2 className="mb-4 mt-8 text-xl font-bold">Your classes</h2>
              {classes.length ? (
                <ul className="card divide-y divide-border overflow-hidden">
                  {classes.map((c) => (
                    <li key={c.id}>
                      <Link to={`/classes/${c.id}`} className="flex flex-wrap items-center gap-4 px-5 py-4 hover:bg-muted">
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold">{c.name}</div>
                          <div className="text-xs text-muted-fg">{c.learners} learners · {c.assignments} assignments</div>
                        </div>
                        {c.to_grade > 0 && <span className="chip bg-gold-100 text-gold-700">{c.to_grade} to grade</span>}
                        {c.inactive > 0 && <span className="chip bg-stone-100 text-stone">{c.inactive} inactive</span>}
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <Empty icon={<GraduationCap className="h-10 w-10" />} title="Create your first class" action={<Link to="/classes" className="btn-primary">Create a class</Link>}>
                  Choose the courses to follow, then share an invite link with your learners.
                </Empty>
              )}
              <CapstoneQueue />
            </>
          )}
        </section>
        <aside className="space-y-6">
          {!readOnly && (
            <div className="card p-5">
              <h2 className="flex items-center gap-2 font-display text-lg font-semibold"><Sparkles className="h-5 w-5 text-gold-700 dark:text-gold" /> Ask Zuva</h2>
              <p className="mt-1 text-sm text-muted-fg">Your teaching assistant knows your classes and students.</p>
              <ul className="mt-3 space-y-2">
                {ASKS.map((a) => <li key={a}><Link to={`/teach/zuva?ask=${encodeURIComponent(a)}`} className="block rounded-lg border border-border px-3 py-2 text-sm hover:border-teal hover:bg-muted">{a}</Link></li>)}
              </ul>
            </div>
          )}
          <div className="card p-5">
            <h2 className="font-display text-lg font-semibold">Your toolkit</h2>
            <ul className="mt-4 space-y-4 text-sm">
              <li className="flex gap-3"><Ticket className="h-5 w-5 shrink-0 text-teal" /><span><strong>Invite links.</strong> Learners join you free with a link or code ({o?.invites ?? 0} active).</span></li>
              <li className="flex gap-3"><Brain className="h-5 w-5 shrink-0 text-ink dark:text-sand" /><span><strong>Zuva reports.</strong> Pain points and next steps for any student, in seconds.</span></li>
              <li className="flex gap-3"><BookOpen className="h-5 w-5 shrink-0 text-teal" /><span><strong>Lesson plans.</strong> Timed plans built from the course content ({o?.lessonPlans ?? 0} saved).</span></li>
              <li className="flex gap-3"><ClipboardCheck className="h-5 w-5 shrink-0 text-gold-700 dark:text-gold" /><span><strong>Assign anything.</strong> Lessons and Kids Zone levels tick off by themselves; code is pre-marked.</span></li>
              <li className="flex gap-3"><Wallet className="h-5 w-5 shrink-0 text-teal" /><span><strong>Earn.</strong> A share of every subscription your students pay goes to your wallet.</span></li>
            </ul>
          </div>
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
