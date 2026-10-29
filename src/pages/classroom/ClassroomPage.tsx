import { useEffect, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Megaphone, ClipboardList, Users, MessageSquare, Settings, Copy, RefreshCw, Plus, Sparkles, Trash2, Send, Brain, Archive, CalendarClock, CheckCircle2, Video, FileText } from '@/components/icons';
import type { Announcement, Assignment, ChatMessage, Classroom, LiveSession, LearnerReport } from '@shared/api-types';
import { api, errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { getCatalogTrack, lessonPath } from '@/lib/catalog';
import { Avatar, Dialog, Empty, Field, Input, LevelBadge, PageLoader, ProgressBar, Select, Spinner, Textarea } from '@/components/ui';
import { Markdown } from '@/components/Markdown';
import { ClassroomForm } from './Classes';
import { cn, formatDate, formatDateTime, timeAgo } from '@/lib/utils';

type Tab = 'stream' | 'sessions' | 'assignments' | 'learners' | 'discussion' | 'settings';
const TABS: Tab[] = ['stream', 'sessions', 'assignments', 'learners', 'discussion', 'settings'];

interface MemberRow {
  id: string; name: string; email?: string; xp: number; streak?: number; avatarColor: string; lastActiveDay?: string | null;
  tracks?: Record<string, { done: number; total: number }>; submitted?: number; avgScore?: number | null;
}

export default function ClassroomPage() {
  const { id = '' } = useParams();
  const { data, isLoading, error } = useQuery({ queryKey: ['classroom', id], queryFn: () => api.get<{ classroom: Classroom; manager: boolean }>(`/api/classrooms/${id}`) });
  const [params, setParams] = useSearchParams();
  const tab: Tab = TABS.includes(params.get('tab') as Tab) ? (params.get('tab') as Tab) : 'stream';
  const setTab = (t: Tab) => setParams(t === 'stream' ? {} : { tab: t }, { replace: true });
  if (isLoading) return <PageLoader />;
  if (error || !data) return <div className="container py-16"><Empty title="Class not available">{errorMessage(error)}</Empty></div>;
  const { classroom: c, manager } = data;

  const tabs: { id: Tab; label: string; icon: typeof Megaphone }[] = [
    { id: 'stream', label: 'Stream', icon: Megaphone },
    { id: 'sessions', label: 'Live sessions', icon: Video },
    { id: 'assignments', label: 'Assignments', icon: ClipboardList },
    { id: 'learners', label: manager ? 'Learners & progress' : 'Classmates', icon: Users },
    { id: 'discussion', label: 'Discussion', icon: MessageSquare },
    ...(manager ? [{ id: 'settings' as Tab, label: 'Settings', icon: Settings }] : []),
  ];

  return (
    <div>
      <section className="bg-ink text-white dark:bg-night-800">
        <div className="container py-8">
          <Link to="/classes" className="text-sm text-white/60 hover:text-white">Classes</Link>
          <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold md:text-4xl">{c.name}</h1>
              <p className="mt-1 text-white/70">{c.teacherName} · {c.memberCount} learners</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <LevelBadge level={c.level} />
                {c.trackIds.map((t) => { const tr = getCatalogTrack(t); return tr ? <Link key={t} to={lessonPath(t)} className="chip bg-white/10 text-white hover:bg-white/20">{tr.title}</Link> : null; })}
              </div>
            </div>
            {manager && c.joinCode && (
              <button onClick={() => { void navigator.clipboard.writeText(c.joinCode!); toast.success('Join code copied'); }} className="rounded-xl bg-white/10 px-4 py-3 text-left hover:bg-white/15">
                <span className="block text-xs text-white/60">Join code</span>
                <span className="flex items-center gap-2 font-mono text-2xl font-bold tracking-[0.2em] text-gold">{c.joinCode} <Copy className="h-4 w-4" /></span>
              </button>
            )}
          </div>
        </div>
        <div className="container flex gap-1 overflow-x-auto scrollbar-none">
          {tabs.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} className={cn('flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium', tab === t.id ? 'border-gold text-gold' : 'border-transparent text-white/70 hover:text-white')}>
              <t.icon className="h-4 w-4" /> {t.label}
            </button>
          ))}
        </div>
      </section>
      <div className="container py-8">
        {c.description && tab === 'stream' && <p className="mb-6 max-w-3xl text-muted-fg">{c.description}</p>}
        {tab === 'stream' && <Stream id={id} manager={manager} />}
        {tab === 'sessions' && <Sessions id={id} manager={manager} />}
        {tab === 'assignments' && <Assignments id={id} manager={manager} />}
        {tab === 'learners' && <Learners id={id} manager={manager} />}
        {tab === 'discussion' && <Discussion id={id} manager={manager} />}
        {tab === 'settings' && manager && <ClassSettings classroom={c} />}
      </div>
    </div>
  );
}

function Stream({ id, manager }: { id: string; manager: boolean }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ title: '', body: '' });
  const { data } = useQuery({ queryKey: ['announcements', id], queryFn: () => api.get<{ announcements: (Announcement & { created_at: string; author_name: string })[] }>(`/api/classrooms/${id}/announcements`) });
  const post = useMutation({
    mutationFn: () => api.post(`/api/classrooms/${id}/announcements`, form),
    onSuccess: () => { setForm({ title: '', body: '' }); qc.invalidateQueries({ queryKey: ['announcements', id] }); toast.success('Announcement posted'); },
    onError: (e) => toast.error(errorMessage(e)),
  });
  return (
    <div className="max-w-3xl space-y-4">
      {manager && (
        <form onSubmit={(e) => { e.preventDefault(); post.mutate(); }} className="card space-y-3 p-5">
          <h2 className="font-display text-lg font-semibold">Post an announcement</h2>
          <Input placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required minLength={3} aria-label="Title" />
          <Textarea placeholder="Message to the class… (Markdown supported)" value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} required aria-label="Message" />
          <button disabled={post.isPending} className="btn-primary">Post</button>
        </form>
      )}
      {data?.announcements.length ? data.announcements.map((a) => (
        <article key={a.id} className="card p-5">
          <h3 className="font-display text-lg font-semibold">{a.title}</h3>
          <p className="text-xs text-muted-fg">{a.author_name} · {timeAgo(a.created_at)}</p>
          <Markdown className="mt-3 prose-sm">{a.body}</Markdown>
        </article>
      )) : <Empty icon={<Megaphone className="h-8 w-8" />} title="No announcements yet">{manager ? 'Welcome your learners and tell them where to start.' : 'Your teacher’s announcements will appear here.'}</Empty>}
    </div>
  );
}

function AssignmentEditor({ classroomId, onDone }: { classroomId: string; onDone: () => void }) {
  const [form, setForm] = useState({ title: '', instructions: '', language: 'python', starterCode: '', rubric: '', dueAt: '', maxScore: 100 });
  const [topic, setTopic] = useState('');
  const [drafting, setDrafting] = useState(false);
  const [busy, setBusy] = useState(false);

  const draft = async () => {
    if (topic.trim().length < 3) return toast.error('Describe the topic first');
    setDrafting(true);
    try {
      const r = await api.post<{ draft: typeof form }>(`/api/classrooms/${classroomId}/assignments/draft`, { topic, level: 'beginner', language: form.language });
      setForm((f) => ({ ...f, ...r.draft, dueAt: f.dueAt, maxScore: f.maxScore }));
      toast.success('Draft ready — review and edit before publishing.');
    } catch (e) { toast.error(errorMessage(e)); } finally { setDrafting(false); }
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post(`/api/classrooms/${classroomId}/assignments`, { ...form, dueAt: form.dueAt ? new Date(form.dueAt).toISOString() : null });
      toast.success('Assignment published');
      onDone();
    } catch (err) { toast.error(errorMessage(err)); } finally { setBusy(false); }
  };

  return (
    <form onSubmit={save} className="space-y-4">
      <div className="rounded-xl border border-gold/50 bg-gold-100/50 p-4 dark:bg-night-800">
        <p className="flex items-center gap-2 text-sm font-semibold"><Sparkles className="h-4 w-4 text-gold-600" /> Draft with AI</p>
        <div className="mt-2 flex gap-2">
          <Input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. loops using a tuckshop sales list" aria-label="Assignment topic" />
          <button type="button" onClick={draft} disabled={drafting} className="btn-gold">{drafting ? <Spinner className="text-ink" /> : 'Draft'}</button>
        </div>
      </div>
      <Field label="Title" htmlFor="at"><Input id="at" required minLength={3} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
      <Field label="Instructions (Markdown)" htmlFor="ai"><Textarea id="ai" required minLength={10} rows={8} value={form.instructions} onChange={(e) => setForm({ ...form, instructions: e.target.value })} /></Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Language" htmlFor="al">
          <Select id="al" value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })}>
            {['python', 'javascript', 'typescript', 'html', 'sql', 'java', 'kotlin', 'php', 'cpp', 'text'].map((l) => <option key={l} value={l}>{l}</option>)}
          </Select>
        </Field>
        <Field label="Due (optional)" htmlFor="ad"><Input id="ad" type="datetime-local" value={form.dueAt} onChange={(e) => setForm({ ...form, dueAt: e.target.value })} /></Field>
        <Field label="Max score" htmlFor="am"><Input id="am" type="number" min={1} max={1000} value={form.maxScore} onChange={(e) => setForm({ ...form, maxScore: Number(e.target.value) })} /></Field>
      </div>
      <Field label="Starter code (optional)" htmlFor="as"><Textarea id="as" className="font-mono text-xs" rows={5} value={form.starterCode} onChange={(e) => setForm({ ...form, starterCode: e.target.value })} /></Field>
      <Field label="Marking rubric (used by AI pre-marking)" htmlFor="ar"><Textarea id="ar" rows={4} value={form.rubric} onChange={(e) => setForm({ ...form, rubric: e.target.value })} /></Field>
      <button disabled={busy} className="btn-primary w-full">{busy ? 'Publishing…' : 'Publish assignment'}</button>
    </form>
  );
}

function Assignments({ id, manager }: { id: string; manager: boolean }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const { data } = useQuery({ queryKey: ['assignments', id], queryFn: () => api.get<{ assignments: Assignment[] }>(`/api/classrooms/${id}/assignments`) });
  return (
    <div className="max-w-4xl">
      {manager && <button onClick={() => setOpen(true)} className="btn-primary mb-5"><Plus className="h-4 w-4" /> New assignment</button>}
      {data?.assignments.length ? (
        <ul className="card divide-y divide-border overflow-hidden">
          {data.assignments.map((a) => {
            const overdue = a.dueAt && a.dueAt < new Date().toISOString() && !a.mySubmission;
            return (
              <li key={a.id}>
                <Link to={`/assignments/${a.id}`} className="flex flex-wrap items-center gap-4 px-5 py-4 hover:bg-muted">
                  <ClipboardList className="h-5 w-5 text-teal" />
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold">{a.title}</div>
                    <div className="mt-0.5 flex flex-wrap gap-3 text-xs text-muted-fg">
                      <span className="font-mono">{a.language}</span>
                      {a.dueAt && <span className={cn('flex items-center gap-1', overdue && 'font-semibold text-red-600')}><CalendarClock className="h-3.5 w-3.5" /> Due {formatDateTime(a.dueAt)}</span>}
                    </div>
                  </div>
                  {manager ? (
                    <span className="chip bg-muted">{a.submissionCount ?? 0} submitted</span>
                  ) : a.mySubmission ? (
                    a.mySubmission.status === 'graded'
                      ? <span className="chip bg-teal-100 text-teal-600">Graded {a.mySubmission.score}/{a.maxScore}</span>
                      : <span className="chip bg-muted"><CheckCircle2 className="h-3.5 w-3.5" /> Submitted</span>
                  ) : <span className="chip bg-gold-100 text-gold-600">To do</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      ) : <Empty icon={<ClipboardList className="h-8 w-8" />} title="No assignments yet">{manager ? 'Create one — or let AI draft it from a topic.' : 'Assignments from your teacher will show up here.'}</Empty>}
      <Dialog open={open} onOpenChange={setOpen} title="New assignment" wide>
        <AssignmentEditor classroomId={id} onDone={() => { setOpen(false); qc.invalidateQueries({ queryKey: ['assignments', id] }); }} />
      </Dialog>
    </div>
  );
}

function Learners({ id, manager }: { id: string; manager: boolean }) {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ['members', id], queryFn: () => api.get<{ members: MemberRow[]; trackIds?: string[]; assignmentCount?: number }>(`/api/classrooms/${id}/members`) });
  const [insights, setInsights] = useState<{ summary: string; atRisk: { name: string; reason: string }[]; strengths: string[]; actions: string[] } | null>(null);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [reportFor, setReportFor] = useState<MemberRow | null>(null);
  const remove = useMutation({ mutationFn: (uid: string) => api.del(`/api/classrooms/${id}/members/${uid}`), onSuccess: () => qc.invalidateQueries({ queryKey: ['members', id] }) });

  if (!data) return <PageLoader />;
  if (!data.members.length) return <Empty icon={<Users className="h-8 w-8" />} title="No learners yet">{manager ? 'Share the join code at the top of this page.' : 'Nobody else has joined yet.'}</Empty>;

  if (!manager) {
    return (
      <ul className="grid max-w-3xl gap-3 sm:grid-cols-2">
        {data.members.map((m) => <li key={m.id} className="card flex items-center gap-3 p-3"><Avatar name={m.name} color={m.avatarColor} /><span className="flex-1 font-medium">{m.name}</span><span className="text-xs text-muted-fg">{m.xp} XP</span></li>)}
      </ul>
    );
  }

  const tracks = data.trackIds ?? [];
  return (
    <div className="space-y-6">
      <div className="card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold"><Brain className="h-5 w-5 text-teal" /> Class insights</h2>
          <button onClick={async () => { setLoadingInsights(true); try { setInsights((await api.post<{ insights: NonNullable<typeof insights> }>(`/api/classrooms/${id}/insights`)).insights); } catch (e) { toast.error(errorMessage(e)); } finally { setLoadingInsights(false); } }} disabled={loadingInsights} className="btn-outline btn-sm">
            {loadingInsights ? <Spinner label="Analysing…" /> : <><Sparkles className="h-4 w-4" /> Analyse with AI</>}
          </button>
        </div>
        {insights ? (
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <div className="md:col-span-3 text-sm">{insights.summary}</div>
            <div><h3 className="text-sm font-semibold text-red-700 dark:text-red-300">Needs attention</h3><ul className="mt-1 space-y-1 text-sm">{insights.atRisk.length ? insights.atRisk.map((r) => <li key={r.name}><strong>{r.name}</strong> — {r.reason}</li>) : <li className="text-muted-fg">Nobody flagged.</li>}</ul></div>
            <div><h3 className="text-sm font-semibold text-teal-600">Going well</h3><ul className="mt-1 list-disc space-y-1 pl-4 text-sm">{insights.strengths.map((s) => <li key={s}>{s}</li>)}</ul></div>
            <div><h3 className="text-sm font-semibold text-gold-600">Suggested actions</h3><ul className="mt-1 list-disc space-y-1 pl-4 text-sm">{insights.actions.map((s) => <li key={s}>{s}</li>)}</ul></div>
          </div>
        ) : <p className="mt-2 text-sm text-muted-fg">Get a summary of who is ahead, who is stuck and what to teach next, based on progress and scores.</p>}
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-muted text-left text-xs text-muted-fg">
            <tr>
              <th className="px-4 py-2.5 font-medium">Learner</th>
              {tracks.map((t) => <th key={t} className="px-4 py-2.5 font-medium">{getCatalogTrack(t)?.title ?? t}</th>)}
              <th className="px-4 py-2.5 font-medium">Assignments</th>
              <th className="px-4 py-2.5 font-medium">Avg score</th>
              <th className="px-4 py-2.5 font-medium">Last active</th>
              <th className="px-2 py-2.5"><span className="sr-only">Report</span></th>
              <th className="px-2 py-2.5"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            {data.members.map((m) => (
              <tr key={m.id} className="border-t border-border">
                <td className="px-4 py-3"><div className="flex items-center gap-2.5"><Avatar name={m.name} color={m.avatarColor} size={28} /><div><div className="font-medium">{m.name}</div><div className="text-xs text-muted-fg">{m.email}</div></div></div></td>
                {tracks.map((t) => { const p = m.tracks?.[t]; const pct = p ? Math.round((p.done / p.total) * 100) : 0; return <td key={t} className="px-4 py-3"><div className="flex items-center gap-2"><ProgressBar value={pct} className="h-1.5 w-20" /><span className="text-xs text-muted-fg">{pct}%</span></div></td>; })}
                <td className="px-4 py-3">{m.submitted ?? 0}/{data.assignmentCount ?? 0}</td>
                <td className="px-4 py-3">{m.avgScore != null ? Math.round(m.avgScore) : '—'}</td>
                <td className="px-4 py-3 text-xs text-muted-fg">{m.lastActiveDay ? formatDate(m.lastActiveDay) : 'Never'}</td>
                <td className="px-2 py-3"><button onClick={() => setReportFor(m)} className="rounded p-1.5 text-muted-fg hover:text-teal-600" aria-label={`AI report for ${m.name}`} title="AI learner report"><FileText className="h-4 w-4" /></button></td>
                <td className="px-2 py-3"><button onClick={() => { if (confirm(`Remove ${m.name} from this class?`)) remove.mutate(m.id); }} className="rounded p-1.5 text-muted-fg hover:text-red-600" aria-label={`Remove ${m.name}`}><Trash2 className="h-4 w-4" /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {reportFor && <LearnerReportDialog classroomId={id} member={reportFor} onClose={() => setReportFor(null)} />}
    </div>
  );
}

/** Private AI report on one learner: strengths, gaps with evidence, and a two-week plan (Base44's weakness assessor). */
function LearnerReportDialog({ classroomId, member, onClose }: { classroomId: string; member: MemberRow; onClose: () => void }) {
  const qc = useQueryClient();
  const key = ['learner-reports', classroomId, member.id];
  const { data, isLoading } = useQuery({ queryKey: key, queryFn: () => api.get<{ reports: LearnerReport[] }>(`/api/classrooms/${classroomId}/students/${member.id}/reports`) });
  const generate = useMutation({
    mutationFn: () => api.post<{ report: LearnerReport }>(`/api/classrooms/${classroomId}/students/${member.id}/reports`),
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
    onError: (e) => toast.error(errorMessage(e)),
  });
  const latest = data?.reports[0];
  const sev: Record<string, string> = { high: 'text-red-700 dark:text-red-300', medium: 'text-gold-600', low: 'text-fg/70' };
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} title={`Learner report: ${member.name}`} description="Private to teachers. Built from this learner's lessons, practice and assignment results." wide>
      {isLoading ? <PageLoader /> : !latest ? (
        <div className="space-y-4">
          <p className="text-[15px]">No report yet. Generate one to see strengths, gaps with the evidence behind them, and a plan for the next two weeks.</p>
          <button className="btn-primary" onClick={() => generate.mutate()} disabled={generate.isPending}>{generate.isPending ? <Spinner label="Analysing…" /> : <><Sparkles className="h-4 w-4" /> Generate report</>}</button>
        </div>
      ) : (
        <div className="space-y-5 text-[15px]">
          <p className="text-fg/70 text-sm">Generated {formatDateTime(latest.createdAt)}{latest.content.atRisk && <span className="ml-2 font-semibold text-red-700 dark:text-red-300">At risk of falling behind</span>}</p>
          <p>{latest.content.overview}</p>
          <div className="grid gap-5 md:grid-cols-2">
            <div><h3 className="font-semibold text-teal-600">Strengths</h3><ul className="mt-1 list-disc space-y-1 pl-5">{latest.content.strengths.map((x) => <li key={x}>{x}</li>)}</ul></div>
            <div><h3 className="font-semibold">Gaps</h3><ul className="mt-1 space-y-2">{latest.content.gaps.map((g) => <li key={g.area}><span className={cn('font-medium', sev[g.severity])}>{g.area}</span> <span className="text-fg/70">· {g.severity}</span><br /><span className="text-fg/80">{g.evidence}</span></li>)}</ul></div>
          </div>
          <div className="rounded-2xl bg-granite-100 p-4 dark:bg-night-700">
            <h3 className="font-semibold">Plan</h3>
            <p className="mt-2 text-sm font-medium">Next two weeks</p><ul className="list-disc pl-5">{latest.content.plan.nextTwoWeeks.map((x) => <li key={x}>{x}</li>)}</ul>
            <p className="mt-2 text-sm font-medium">This month</p><ul className="list-disc pl-5">{latest.content.plan.thisMonth.map((x) => <li key={x}>{x}</li>)}</ul>
            <p className="mt-2"><span className="text-sm font-medium">Longer term:</span> {latest.content.plan.longTerm}</p>
          </div>
          {latest.content.suggestedLessons.length > 0 && <p><span className="font-semibold">Suggested lessons:</span> {latest.content.suggestedLessons.join(', ')}</p>}
          <button className="btn-outline btn-sm" onClick={() => generate.mutate()} disabled={generate.isPending}>{generate.isPending ? <Spinner label="Analysing…" /> : <><RefreshCw className="h-4 w-4" /> Refresh report</>}</button>
        </div>
      )}
    </Dialog>
  );
}

const toLocalInput = (iso: string) => { const d = new Date(iso); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 16); };

/** Scheduled live classes with join links; after class the teacher pastes notes and AI writes the recap. */
function Sessions({ id, manager }: { id: string; manager: boolean }) {
  const qc = useQueryClient();
  const key = ['sessions', id];
  const { data } = useQuery({ queryKey: key, queryFn: () => api.get<{ sessions: LiveSession[] }>(`/api/classrooms/${id}/sessions`) });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', startsAt: toLocalInput(new Date(Date.now() + 86400_000).toISOString()), minutes: 60, meetingUrl: '', recordingUrl: '' });
  const [notesFor, setNotesFor] = useState<LiveSession | null>(null);
  const [notes, setNotes] = useState('');
  const create = useMutation({
    mutationFn: () => api.post(`/api/classrooms/${id}/sessions`, { ...form, startsAt: new Date(form.startsAt).toISOString() }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: key }); setOpen(false); toast.success('Session scheduled'); },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const summarise = useMutation({
    mutationFn: () => api.post(`/api/classrooms/${id}/sessions/${notesFor!.id}/summary`, { notes }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: key }); setNotesFor(null); toast.success('Recap published to the class'); },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const remove = useMutation({ mutationFn: (sid: string) => api.del(`/api/classrooms/${id}/sessions/${sid}`), onSuccess: () => qc.invalidateQueries({ queryKey: key }) });

  if (!data) return <PageLoader />;
  const now = Date.now();
  const upcoming = data.sessions.filter((s) => Date.parse(s.startsAt) + s.minutes * 60_000 >= now).reverse();
  const past = data.sessions.filter((s) => Date.parse(s.startsAt) + s.minutes * 60_000 < now);

  return (
    <div className="max-w-4xl space-y-8">
      {manager && <button className="btn-primary" onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Schedule a live session</button>}
      <section>
        <h2 className="font-display text-xl font-semibold">Upcoming</h2>
        {upcoming.length === 0 ? <p className="mt-2 text-[15px] text-fg/70">{manager ? 'Nothing scheduled. Add a Zoom, Google Meet or Teams link and your learners see it on their dashboard.' : 'No live sessions scheduled yet.'}</p> : (
          <ul className="mt-3 divide-y divide-border">
            {upcoming.map((s) => {
              const start = Date.parse(s.startsAt);
              const live = now >= start - 10 * 60_000;
              return (
                <li key={s.id} className="flex flex-wrap items-center gap-4 py-4">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{s.title}</p>
                    <p className="text-sm text-fg/70">{formatDateTime(s.startsAt)} · {s.minutes} min</p>
                    {s.description && <p className="mt-1 text-[15px]">{s.description}</p>}
                  </div>
                  {s.meetingUrl && <a href={s.meetingUrl} target="_blank" rel="noopener noreferrer" className={live ? 'btn-run' : 'btn-outline'}>{live ? 'Join now' : 'Meeting link'}</a>}
                  {manager && <button onClick={() => { if (confirm('Cancel this session?')) remove.mutate(s.id); }} className="rounded p-2 text-muted-fg hover:text-red-600" aria-label={`Cancel ${s.title}`}><Trash2 className="h-4 w-4" /></button>}
                </li>
              );
            })}
          </ul>
        )}
      </section>
      <section>
        <h2 className="font-display text-xl font-semibold">Past sessions</h2>
        {past.length === 0 ? <p className="mt-2 text-[15px] text-fg/70">Recaps of past classes appear here.</p> : (
          <ul className="mt-3 space-y-4">
            {past.map((s) => (
              <li key={s.id} className="rounded-2xl bg-card p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div><p className="font-semibold">{s.title}</p><p className="text-sm text-fg/70">{formatDateTime(s.startsAt)}</p></div>
                  <div className="flex gap-2">
                    {s.recordingUrl && <a href={s.recordingUrl} target="_blank" rel="noopener noreferrer" className="btn-outline btn-sm">Recording</a>}
                    {manager && <button className="btn-ghost btn-sm" onClick={() => { setNotes(s.notes ?? ''); setNotesFor(s); }}><Sparkles className="h-4 w-4" /> {s.summary ? 'Redo recap' : 'Write recap with AI'}</button>}
                  </div>
                </div>
                {s.summary && (
                  <div className="mt-4 space-y-3 text-[15px]">
                    <p>{s.summary.summary}</p>
                    {s.summary.endedAt && <p><span className="font-semibold">We stopped at:</span> {s.summary.endedAt}</p>}
                    {s.summary.actionItems.length > 0 && <div><p className="font-semibold">Before next class</p><ul className="list-disc pl-5">{s.summary.actionItems.map((a) => <li key={a}>{a}</li>)}</ul></div>}
                    {s.summary.keyPoints.length > 0 && <details><summary className="cursor-pointer font-medium text-teal-600">Key points</summary><ul className="mt-1 list-disc pl-5">{s.summary.keyPoints.map((k) => <li key={k.point}>{k.point}{k.by ? ` (${k.by})` : ''}</li>)}</ul></details>}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <Dialog open={open} onOpenChange={setOpen} title="Schedule a live session">
        <form onSubmit={(e) => { e.preventDefault(); create.mutate(); }} className="space-y-4">
          <Field label="Title" htmlFor="st"><Input id="st" required minLength={3} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Loops and lists" /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Starts" htmlFor="ss"><Input id="ss" type="datetime-local" required value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} /></Field>
            <Field label="Minutes" htmlFor="sm"><Input id="sm" type="number" min={15} max={480} value={form.minutes} onChange={(e) => setForm({ ...form, minutes: Number(e.target.value) })} /></Field>
          </div>
          <Field label="Meeting link" hint="Zoom, Google Meet or Microsoft Teams." htmlFor="su"><Input id="su" type="url" value={form.meetingUrl} onChange={(e) => setForm({ ...form, meetingUrl: e.target.value })} placeholder="https://meet.google.com/…" /></Field>
          <Field label="What you will cover (optional)" htmlFor="sd"><Textarea id="sd" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
          <button disabled={create.isPending} className="btn-primary w-full">Schedule</button>
        </form>
      </Dialog>

      <Dialog open={!!notesFor} onOpenChange={(o) => !o && setNotesFor(null)} title="Write the recap with AI" description="Paste your notes or the meeting transcript. Learners see the summary, where the class stopped and what to do before next time." wide>
        <form onSubmit={(e) => { e.preventDefault(); summarise.mutate(); }} className="space-y-4">
          <Textarea rows={12} required minLength={20} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Paste notes or transcript…" />
          <button disabled={summarise.isPending} className="btn-primary">{summarise.isPending ? <Spinner label="Writing recap…" /> : 'Publish recap'}</button>
        </form>
      </Dialog>
    </div>
  );
}

function Discussion({ id, manager }: { id: string; manager: boolean }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [body, setBody] = useState('');
  const bottom = useRef<HTMLDivElement>(null);
  const { data } = useQuery({ queryKey: ['messages', id], queryFn: () => api.get<{ messages: (ChatMessage & { user_id: string; user_name: string; created_at: string })[] }>(`/api/classrooms/${id}/messages`), refetchInterval: 8000 });
  const send = useMutation({ mutationFn: () => api.post(`/api/classrooms/${id}/messages`, { body }), onSuccess: () => { setBody(''); qc.invalidateQueries({ queryKey: ['messages', id] }); }, onError: (e) => toast.error(errorMessage(e)) });
  const del = useMutation({ mutationFn: (mid: string) => api.del(`/api/classrooms/${id}/messages/${mid}`), onSuccess: () => qc.invalidateQueries({ queryKey: ['messages', id] }) });
  useEffect(() => { bottom.current?.scrollIntoView({ block: 'nearest' }); }, [data?.messages.length]);

  return (
    <div className="card flex h-[60vh] max-w-3xl flex-col">
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {!data?.messages.length && <p className="py-10 text-center text-sm text-muted-fg">Start the conversation — ask a question or share something you built. Be kind; your teacher can see everything here.</p>}
        {data?.messages.map((m) => {
          const mine = m.user_id === user?.id;
          return (
            <div key={m.id} className={cn('group flex gap-2', mine && 'flex-row-reverse')}>
              <Avatar name={m.user_name} size={30} color={m.role === 'teacher' || m.role === 'admin' ? '#B88A2E' : undefined} />
              <div className={cn('max-w-[75%] rounded-2xl px-3.5 py-2 text-sm', mine ? 'bg-ink text-white' : 'bg-muted')}>
                <div className={cn('mb-0.5 text-xs', mine ? 'text-white/60' : 'text-muted-fg')}>{m.user_name}{m.role !== 'student' && ' · teacher'} · {timeAgo(m.created_at)}</div>
                <p className="whitespace-pre-wrap break-words">{m.body}</p>
              </div>
              {(mine || manager) && <button onClick={() => del.mutate(m.id)} className="grid min-h-11 min-w-11 place-items-center self-center rounded-full text-muted-fg opacity-0 hover:bg-muted hover:text-red-600 group-hover:opacity-100 focus:opacity-100" aria-label="Delete message"><Trash2 className="h-3.5 w-3.5" /></button>}
            </div>
          );
        })}
        <div ref={bottom} />
      </div>
      <form onSubmit={(e) => { e.preventDefault(); if (body.trim()) send.mutate(); }} className="flex gap-2 border-t border-border p-3">
        <Input value={body} onChange={(e) => setBody(e.target.value)} maxLength={2000} placeholder="Write a message…" aria-label="Message" />
        <button disabled={send.isPending || !body.trim()} className="btn-run" aria-label="Send"><Send className="h-4 w-4" /></button>
      </form>
    </div>
  );
}

function ClassSettings({ classroom }: { classroom: Classroom }) {
  const qc = useQueryClient();
  const update = useMutation({ mutationFn: (v: object) => api.patch(`/api/classrooms/${classroom.id}`, v), onSuccess: () => { qc.invalidateQueries({ queryKey: ['classroom', classroom.id] }); toast.success('Class updated'); }, onError: (e) => toast.error(errorMessage(e)) });
  const regen = useMutation({ mutationFn: () => api.post(`/api/classrooms/${classroom.id}/regenerate-code`), onSuccess: () => { qc.invalidateQueries({ queryKey: ['classroom', classroom.id] }); toast.success('New join code created. The old one no longer works.'); } });
  const archive = useMutation({ mutationFn: () => api.post(`/api/classrooms/${classroom.id}/archive`), onSuccess: () => { qc.invalidateQueries({ queryKey: ['classroom', classroom.id] }); toast.success(classroom.archived ? 'Class restored' : 'Class archived'); } });
  return (
    <div className="grid max-w-4xl gap-6 lg:grid-cols-[1fr_280px]">
      <div className="card p-6"><ClassroomForm initial={classroom} onSubmit={(v) => update.mutate(v)} busy={update.isPending} submitLabel="Save changes" /></div>
      <div className="space-y-4">
        <div className="card p-5">
          <h3 className="font-semibold">Join code</h3>
          <p className="mt-1 text-sm text-muted-fg">Make a new code if the old one was shared too widely.</p>
          <button onClick={() => regen.mutate()} className="btn-outline btn-sm mt-3"><RefreshCw className="h-4 w-4" /> New code</button>
        </div>
        <div className="card p-5">
          <h3 className="font-semibold">{classroom.archived ? 'Restore class' : 'Archive class'}</h3>
          <p className="mt-1 text-sm text-muted-fg">{classroom.archived ? 'Learners will be able to join again.' : 'Archived classes stay readable but nobody new can join.'}</p>
          <button onClick={() => archive.mutate()} className="btn-outline btn-sm mt-3"><Archive className="h-4 w-4" /> {classroom.archived ? 'Restore' : 'Archive'}</button>
        </div>
      </div>
    </div>
  );
}
