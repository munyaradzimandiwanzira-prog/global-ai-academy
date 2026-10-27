import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Flame, Zap, Award, BookOpen, Target, Plus, Trash2, CheckCircle2, Megaphone, Users, PlayCircle, Lock, MailWarning, Video, Sparkles } from 'lucide-react';
import type { Goal, PublicUser } from '@shared/api-types';
import { levelForXp, rankForXp, TRIAL } from '@shared/config';
import { api, errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useProgress } from '@/lib/progress';
import { catalog, getCatalogTrack, lessonPath } from '@/lib/catalog';
import { CAREERS } from '@/data/careers';
import { Dialog, Empty, Field, Input, ProgressBar, ProgressRing, Select, Stat, TrackMark, CareerMark } from '@/components/ui';
import { greeting, timeAgo, formatDateTime } from '@/lib/utils';
import { Button } from '@/components/ui';

interface DashboardData {
  lastLesson: string | null;
  weekXp: number;
  week: { day: string; n: number }[];
  classes: { id: string; name: string; teacher_name: string; open_assignments: number }[];
  certificateCount: number;
  announcements: { id: string; title: string; body: string; created_at: string; author_name: string }[];
}

function WeekStrip({ week }: { week: { day: string; n: number }[] }) {
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(Date.now() - (6 - i) * 86400_000);
    const key = d.toISOString().slice(0, 10);
    return { key, label: d.toLocaleDateString('en', { weekday: 'narrow' }), n: week.find((w) => w.day === key)?.n ?? 0 };
  });
  const max = Math.max(1, ...days.map((d) => d.n));
  return (
    <div className="flex h-24 items-end gap-2" aria-label="Lessons completed in the last 7 days">
      {days.map((d) => (
        <div key={d.key} className="flex flex-1 flex-col items-center gap-1">
          <div className="flex w-full flex-1 items-end">
            <div className="w-full rounded-t bg-teal/80" style={{ height: `${Math.max(d.n ? 12 : 3, (d.n / max) * 100)}%`, opacity: d.n ? 1 : 0.25 }} title={`${d.n} lessons`} />
          </div>
          <span className="text-[11px] text-muted-fg">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

interface SessionItem { id: string; classroomId: string; className: string; title: string; startsAt: string; minutes: number; meetingUrl: string; recordingUrl: string; hasSummary: boolean }

/** Live classes across every class: join links for upcoming ones, recaps for the last week. */
function LiveSessions() {
  const { data } = useQuery({ queryKey: ['my-sessions'], queryFn: () => api.get<{ sessions: SessionItem[] }>('/api/me/sessions') });
  if (!data?.sessions.length) return null;
  const now = Date.now();
  return (
    <section className="card p-5">
      <h2 className="flex items-center gap-2 font-display text-lg font-semibold"><Video className="h-5 w-5 text-teal" /> Live classes</h2>
      <ul className="mt-3 divide-y divide-border">
        {data.sessions.map((s) => {
          const start = Date.parse(s.startsAt);
          const live = now >= start - 10 * 60_000 && now <= start + s.minutes * 60_000;
          const past = now > start + s.minutes * 60_000;
          return (
            <li key={s.id} className="py-3">
              <p className="text-sm font-semibold">{s.title}</p>
              <p className="text-xs text-muted-fg">{s.className} · {formatDateTime(s.startsAt)}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {!past && s.meetingUrl && <a href={s.meetingUrl} target="_blank" rel="noopener noreferrer" className={live ? 'btn-run btn-sm' : 'btn-outline btn-sm'}>{live ? 'Join now' : 'Meeting link'}</a>}
                {past && (s.hasSummary || s.recordingUrl) && <Link to={`/classes/${s.classroomId}?tab=sessions`} className="btn-ghost btn-sm">Recap{s.recordingUrl ? ' and recording' : ''}</Link>}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function TrialBanner() {
  const { user, setUser } = useAuth();
  const [busy, setBusy] = useState(false);
  if (!user?.trialAvailable) return null;
  const start = async () => {
    setBusy(true);
    try {
      const r = await api.post<{ user: PublicUser; message: string }>('/api/me/trial', {});
      setUser(r.user);
      toast.success(r.message);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="mb-6 flex flex-wrap items-center gap-4 rounded-2xl bg-ink px-5 py-4 text-white">
      <Sparkles className="h-5 w-5 text-gold" aria-hidden="true" />
      <p className="flex-1 text-[15px]"><strong>Try Plus free for {TRIAL.days} days:</strong> Professor Zuva the AI tutor, goals, certificates and shareable projects. No payment needed.</p>
      <Button color="accent" size="sm" loading={busy} onClick={start}>Start my trial</Button>
    </div>
  );
}

function Goals() {
  const { can } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: '', kind: 'lessons_per_week' as Goal['kind'], target: 5, trackId: '' });
  const allowed = can('goals.manage');
  const { data } = useQuery({ queryKey: ['goals'], queryFn: () => api.get<{ goals: Goal[] }>('/api/me/goals'), enabled: allowed });
  const create = useMutation({
    mutationFn: () => api.post('/api/me/goals', { ...form, trackId: form.kind === 'finish_track' ? form.trackId : null }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['goals'] }); setOpen(false); toast.success('Goal set. You’ve got this!'); },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const remove = useMutation({ mutationFn: (id: string) => api.del(`/api/me/goals/${id}`), onSuccess: () => qc.invalidateQueries({ queryKey: ['goals'] }) });

  return (
    <section className="card p-5">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-display text-lg font-semibold"><Target className="h-5 w-5 text-stone" /> Goals</h2>
        {allowed && <button onClick={() => setOpen(true)} className="btn-outline btn-sm"><Plus className="h-4 w-4" /> New goal</button>}
      </div>
      {!allowed ? (
        <div className="mt-4 rounded-xl bg-muted p-4 text-sm">
          <p className="flex items-center gap-2 font-semibold"><Lock className="h-4 w-4" /> Goals are part of Plus</p>
          <p className="mt-1 text-muted-fg">Set weekly targets, finish-a-track deadlines and daily study minutes, and watch your progress fill up.</p>
          <Link to="/pricing" className="btn-gold btn-sm mt-3">See Plus</Link>
        </div>
      ) : data?.goals.length ? (
        <ul className="mt-4 space-y-4">
          {data.goals.map((g) => {
            const pct = Math.min(100, Math.round(((g.current ?? 0) / g.target) * 100));
            return (
              <li key={g.id}>
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="font-medium">{pct >= 100 && <CheckCircle2 className="mr-1 inline h-4 w-4 text-teal" />}{g.title}</span>
                  <button onClick={() => remove.mutate(g.id)} className="rounded p-1 text-muted-fg hover:text-red-600" aria-label={`Delete goal ${g.title}`}><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
                <ProgressBar value={pct} className="mt-1.5" tone="gold" />
                <p className="mt-1 text-xs text-muted-fg">{g.current ?? 0} of {g.target} {g.kind === 'minutes_per_day' ? 'minutes today' : g.kind === 'lessons_per_week' ? 'lessons this week' : 'lessons'}</p>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-muted-fg">No goals yet. A small weekly target is the easiest way to keep momentum — set your first one.</p>
      )}
      <Dialog open={open} onOpenChange={setOpen} title="Set a goal">
        <form onSubmit={(e) => { e.preventDefault(); create.mutate(); }} className="space-y-4">
          <Field label="Goal name" htmlFor="gt"><Input id="gt" required minLength={3} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Finish Python before December" /></Field>
          <Field label="Type" htmlFor="gk">
            <Select id="gk" value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as Goal['kind'] })}>
              <option value="lessons_per_week">Lessons per week</option>
              <option value="minutes_per_day">Study minutes per day</option>
              <option value="finish_track">Finish a track</option>
            </Select>
          </Field>
          {form.kind === 'finish_track' ? (
            <Field label="Track" htmlFor="gtr">
              <Select id="gtr" required value={form.trackId} onChange={(e) => setForm({ ...form, trackId: e.target.value })}>
                <option value="">Choose a track…</option>
                {catalog.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
              </Select>
            </Field>
          ) : (
            <Field label="Target" htmlFor="gtt"><Input id="gtt" type="number" min={1} max={500} value={form.target} onChange={(e) => setForm({ ...form, target: Number(e.target.value) })} /></Field>
          )}
          <button disabled={create.isPending} className="btn-primary w-full">Save goal</button>
        </form>
      </Dialog>
    </section>
  );
}

export default function Dashboard() {
  const { user, refresh } = useAuth();
  const { progress, trackProgress } = useProgress();
  const { data } = useQuery({ queryKey: ['dashboard'], queryFn: () => api.get<DashboardData>('/api/me/dashboard') });
  if (!user) return null;

  const lvl = levelForXp(user.xp);
  const rank = rankForXp(user.xp);
  const [lastTrack, lastSlug] = (data?.lastLesson ?? '').split('/');
  const last = lastTrack ? getCatalogTrack(lastTrack) : undefined;
  const lastLessonTitle = last?.lessons.find((l) => l.slug === lastSlug)?.title;

  const startedTracks = [...new Set(progress.map((p) => p.trackId))]
    .map((id) => getCatalogTrack(id))
    .filter((t): t is NonNullable<typeof t> => !!t)
    .map((t) => ({ t, p: trackProgress(t.id, t.lessons.length) }))
    .sort((a, b) => b.p.percent - a.p.percent);

  const suggestions = CAREERS.filter((c) => (user.level === 'advanced' ? c.level === 'advanced' : user.level === 'intermediate' ? c.level !== 'advanced' : c.level === 'beginner')).slice(0, 3);

  return (
    <div className="container py-8">
      {!user.emailVerified && (
        <div className="mb-6 flex flex-wrap items-center gap-3 rounded-xl border border-gold/50 bg-gold-100/60 px-4 py-3 text-sm dark:bg-night-800">
          <MailWarning className="h-5 w-5 text-gold-600" />
          <span className="flex-1">Confirm your email so we can send certificates and password resets.</span>
          <button className="btn-outline btn-sm" onClick={async () => { try { const r = await api.post<{ devVerifyUrl?: string }>('/api/auth/resend-verification'); toast.success('Confirmation email sent.', { description: r.devVerifyUrl }); void refresh(); } catch (e) { toast.error(errorMessage(e)); } }}>Resend email</button>
        </div>
      )}
      <TrialBanner />
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted-fg">{greeting()}, {user.name.split(' ')[0]}</p>
          <h1 className="mt-1 text-3xl font-bold md:text-4xl">My learning</h1>
        </div>
        {last && lastLessonTitle && (
          <Link to={lessonPath(last.id, lastSlug)} className="btn-run btn-lg"><PlayCircle className="h-5 w-5" /> Continue: {lastLessonTitle}</Link>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Day streak" value={<span className="flex items-center gap-2">{user.streak} <Flame className="h-6 w-6 text-[#E07A2F]" /></span>} sub={user.streak > 1 ? 'Keep it going tomorrow!' : 'Learn something tomorrow to build a streak'} />
        <Stat label="Total XP" value={user.xp.toLocaleString()} sub={`+${data?.weekXp ?? 0} this week`} icon={<Zap className="h-4 w-4 text-gold-600" />} />
        <div className="card flex items-center gap-4 p-4">
          <ProgressRing value={lvl.progress * 100} label={<span className="font-display text-base">{lvl.level}</span>} />
          <div>
            <div className="text-sm text-muted-fg">Level</div>
            <div className="font-display text-lg font-bold" style={{ color: rank.color }}>{rank.name}</div>
            <div className="text-xs text-muted-fg">{lvl.nextAt - user.xp} XP to level {lvl.level + 1}</div>
          </div>
        </div>
        <Stat label="Certificates" value={data?.certificateCount ?? 0} sub={<Link to="/certificates" className="text-teal-600 hover:underline">View certificates</Link>} icon={<Award className="h-4 w-4 text-stone" />} />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <section className="card p-5">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-display text-lg font-semibold"><BookOpen className="h-5 w-5 text-teal" /> My tracks</h2>
              <Link to="/tutorials" className="text-sm text-teal-600 hover:underline">Browse all</Link>
            </div>
            {startedTracks.length ? (
              <ul className="mt-4 divide-y divide-border">
                {startedTracks.map(({ t, p }) => {
                  const next = t.lessons.find((l) => !progress.some((x) => x.trackId === t.id && x.lessonSlug === l.slug && x.status === 'completed'));
                  return (
                    <li key={t.id} className="flex items-center gap-4 py-3">
                      <TrackMark short={t.short} color={t.color} size={40} />
                      <div className="min-w-0 flex-1">
                        <div className="flex justify-between text-sm"><Link to={lessonPath(t.id)} className="font-semibold hover:text-teal-600">{t.title}</Link><span className="text-muted-fg">{p.done}/{p.total}</span></div>
                        <ProgressBar value={p.percent} className="mt-1.5" />
                      </div>
                      {next && <Link to={lessonPath(t.id, next.slug)} className="btn-outline btn-sm hidden sm:inline-flex">Resume</Link>}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <Empty title="Start your first track" action={<Link to="/learn/start-here" className="btn-primary">Begin with Start Here</Link>}>Pick any tutorial — your progress will appear here.</Empty>
            )}
          </section>

          <section className="card p-5">
            <h2 className="font-display text-lg font-semibold">This week</h2>
            <div className="mt-4"><WeekStrip week={data?.week ?? []} /></div>
          </section>

          <section className="card p-5">
            <h2 className="font-display text-lg font-semibold">Suggested career paths</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {suggestions.map((c) => (
                <Link key={c.id} to={`/careers/${c.id}`} className="rounded-xl border border-border p-4 hover:border-teal/50">
                  <CareerMark id={c.id} level={c.level} size={40} />
                  <div className="mt-2 text-sm font-semibold">{c.title}</div>
                </Link>
              ))}
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <LiveSessions />
          <Goals />
          <section className="card p-5">
            <h2 className="font-display text-lg font-semibold">Practise</h2>
            <ul className="mt-3 grid grid-cols-2 gap-2 text-sm">
              {[['/challenges', 'Challenge of the week'], ['/quiz', 'Take a quiz'], ['/projects', 'My projects'], ['/capstone', 'Capstone'], ['/reference', 'References'], ['/start', 'Where to start']].map(([to, label]) => (
                <li key={to}><Link to={to!} className="block rounded-xl bg-granite-100 px-3 py-2.5 font-medium hover:bg-granite-200 dark:bg-night-700">{label}</Link></li>
              ))}
            </ul>
          </section>
          <section className="card p-5">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-display text-lg font-semibold"><Users className="h-5 w-5 text-ink dark:text-gold" /> My classes</h2>
              <Link to="/classes" className="text-sm text-teal-600 hover:underline">All classes</Link>
            </div>
            {data?.classes.length ? (
              <ul className="mt-3 space-y-2">
                {data.classes.map((c) => (
                  <li key={c.id}>
                    <Link to={`/classes/${c.id}`} className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-muted">
                      <span><span className="block text-sm font-medium">{c.name}</span><span className="text-xs text-muted-fg">{c.teacher_name}</span></span>
                      {c.open_assignments > 0 && <span className="chip bg-gold-100 text-gold-600">{c.open_assignments} to do</span>}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-muted-fg">Have a class code from your teacher? <Link to="/classes" className="text-teal-600 hover:underline">Join a class</Link>.</p>
            )}
          </section>
          {data?.announcements.length ? (
            <section className="card p-5">
              <h2 className="flex items-center gap-2 font-display text-lg font-semibold"><Megaphone className="h-5 w-5 text-stone" /> Announcements</h2>
              <ul className="mt-3 space-y-3">
                {data.announcements.map((a) => (
                  <li key={a.id} className="rounded-lg bg-muted p-3">
                    <p className="text-sm font-semibold">{a.title}</p>
                    <p className="mt-0.5 line-clamp-3 text-sm text-muted-fg">{a.body}</p>
                    <p className="mt-1 text-xs text-muted-fg">{a.author_name} · {timeAgo(a.created_at)}</p>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}
