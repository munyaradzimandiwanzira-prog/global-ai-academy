import { useState } from 'react';
import { NavLink, Route, Routes, Link } from 'react-router-dom';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { LayoutDashboard, Users, UserCheck, GraduationCap, CreditCard, Megaphone, Inbox, ScrollText, Search, Check, X, HeartPulse, Tag, HandHeart, ListOrdered } from '@/components/icons';
import type { PublicUser, PromoCode, Scholarship, WaitlistEntry } from '@shared/api-types';
import { PLANS, type PlanId } from '@shared/config';
import type { Role } from '@shared/rbac';
import { api, errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { getCatalogTrack } from '@/lib/catalog';
import { Avatar, Dialog, Empty, Field, Input, PageLoader, Select, Stat, Textarea } from '@/components/ui';
import { cn, formatDate, formatDateTime, timeAgo } from '@/lib/utils';

const NAV = [
  { to: '', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: 'users', label: 'Users', icon: Users },
  { to: 'teachers', label: 'Teacher requests', icon: UserCheck },
  { to: 'classes', label: 'Classrooms', icon: GraduationCap },
  { to: 'payments', label: 'Payments', icon: CreditCard },
  { to: 'promos', label: 'Promo codes', icon: Tag },
  { to: 'scholarships', label: 'Scholarships', icon: HandHeart },
  { to: 'waitlist', label: 'Premium waitlist', icon: ListOrdered },
  { to: 'announcements', label: 'Announcements', icon: Megaphone },
  { to: 'inbox', label: 'Contact inbox', icon: Inbox },
  { to: 'audit', label: 'Audit log', icon: ScrollText },
];

export default function AdminHome() {
  return (
    <div className="container py-8 lg:grid lg:grid-cols-[220px_1fr] lg:gap-8">
      <aside className="mb-6 lg:mb-0">
        <h1 className="mb-4 font-display text-2xl font-bold">Administration</h1>
        <nav className="flex gap-1 overflow-x-auto scrollbar-none lg:flex-col" aria-label="Admin">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => cn('flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium', isActive ? 'bg-ink text-white dark:bg-gold dark:text-ink' : 'hover:bg-muted')}>
              <n.icon className="h-4 w-4" /> {n.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="min-w-0">
        <Routes>
          <Route index element={<Overview />} />
          <Route path="users" element={<UsersAdmin />} />
          <Route path="teachers" element={<TeacherRequests />} />
          <Route path="classes" element={<ClassesAdmin />} />
          <Route path="payments" element={<PaymentsAdmin />} />
          <Route path="promos" element={<PromosAdmin />} />
          <Route path="scholarships" element={<ScholarshipsAdmin />} />
          <Route path="waitlist" element={<WaitlistAdmin />} />
          <Route path="announcements" element={<AnnouncementsAdmin />} />
          <Route path="inbox" element={<InboxAdmin />} />
          <Route path="audit" element={<AuditAdmin />} />
        </Routes>
      </div>
    </div>
  );
}

interface Stats {
  users: number; newUsers: number; active: number; teachers: number; paid: number; classes: number; lessonsWeek: number;
  revenueCents: number; pendingTeachers: number; contacts: number; signups: { day: string; n: number }[]; popular: { track_id: string; learners: number }[];
}

function Overview() {
  const { data } = useQuery({ queryKey: ['admin-stats'], queryFn: () => api.get<Stats>('/api/admin/stats') });
  const health = useQuery({ queryKey: ['health'], queryFn: () => api.get<Record<string, boolean>>('/api/health') });
  if (!data) return <PageLoader />;
  const max = Math.max(1, ...data.signups.map((s) => s.n));
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Learners" value={data.users.toLocaleString()} sub={`+${data.newUsers} this week`} />
        <Stat label="Active today" value={data.active} />
        <Stat label="Paid subscribers" value={data.paid} sub={`$${(data.revenueCents / 100).toFixed(2)} collected`} />
        <Stat label="Lessons completed (7 days)" value={data.lessonsWeek.toLocaleString()} />
        <Stat label="Teachers" value={data.teachers} sub={data.pendingTeachers ? <Link to="teachers" className="text-teal-600 hover:underline">{data.pendingTeachers} awaiting review</Link> : 'No pending requests'} />
        <Stat label="Active classrooms" value={data.classes} />
        <Stat label="Unread contact messages" value={data.contacts} sub={<Link to="inbox" className="text-teal-600 hover:underline">Open inbox</Link>} />
        <div className="card p-4">
          <div className="flex items-center gap-2 text-sm text-muted-fg"><HeartPulse className="h-4 w-4" /> Integrations</div>
          <ul className="mt-2 grid grid-cols-2 gap-1 text-xs">
            {health.data && Object.entries(health.data).filter(([k]) => k !== 'ok').map(([k, v]) => (
              <li key={k} className="flex items-center gap-1">{v ? <Check className="h-3.5 w-3.5 text-teal" /> : <X className="h-3.5 w-3.5 text-red-500" />}{k}</li>
            ))}
          </ul>
        </div>
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <section className="card p-5">
          <h2 className="font-display text-lg font-semibold">Sign-ups, last 30 days</h2>
          <div className="mt-4 flex h-40 items-end gap-1">
            {data.signups.length ? data.signups.map((s) => (
              <div key={s.day} className="flex-1 rounded-t bg-teal" style={{ height: `${(s.n / max) * 100}%` }} title={`${s.day}: ${s.n}`} />
            )) : <p className="text-sm text-muted-fg">No sign-ups yet.</p>}
          </div>
        </section>
        <section className="card p-5">
          <h2 className="font-display text-lg font-semibold">Most popular tracks</h2>
          <ul className="mt-3 space-y-2">
            {data.popular.map((p) => (
              <li key={p.track_id} className="flex items-center justify-between text-sm"><span>{getCatalogTrack(p.track_id)?.title ?? p.track_id}</span><span className="font-semibold">{p.learners}</span></li>
            ))}
            {!data.popular.length && <li className="text-sm text-muted-fg">No activity yet.</li>}
          </ul>
        </section>
      </div>
    </div>
  );
}

type AdminUser = PublicUser & { disabled: boolean; lastActiveDay: string | null };

function UsersAdmin() {
  const { user: me } = useAuth();
  const qc = useQueryClient();
  const [q, setQ] = useState('');
  const [role, setRole] = useState('');
  const [page, setPage] = useState(0);
  const [editing, setEditing] = useState<AdminUser | null>(null);
  const [form, setForm] = useState({ role: 'student' as Role, plan: 'free' as PlanId, planMonths: 12, disabled: false });
  const { data } = useQuery({ queryKey: ['admin-users', q, role, page], queryFn: () => api.get<{ users: AdminUser[]; total: number }>(`/api/admin/users?q=${encodeURIComponent(q)}&role=${role}&page=${page}`), placeholderData: keepPreviousData });
  const save = useMutation({
    mutationFn: () => {
      const body: Record<string, unknown> = { role: form.role, disabled: form.disabled };
      if (form.plan !== editing!.plan || form.plan !== 'free') { body.plan = form.plan; body.planMonths = form.planMonths; }
      return api.patch(`/api/admin/users/${editing!.id}`, body);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-users'] }); setEditing(null); toast.success('User updated'); },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const resetMfa = useMutation({
    mutationFn: () => api.post(`/api/admin/users/${editing!.id}/reset-mfa`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-users'] }); toast.success('Two-step login reset. They can sign in with their password and set it up again.'); },
    onError: (e) => toast.error(errorMessage(e)),
  });

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        <div className="relative flex-1"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-fg" /><Input value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} placeholder="Search name or email" className="pl-9" aria-label="Search users" /></div>
        <Select value={role} onChange={(e) => { setRole(e.target.value); setPage(0); }} className="w-40" aria-label="Filter role"><option value="">All roles</option><option value="student">Students</option><option value="teacher">Teachers</option><option value="admin">Admins</option></Select>
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-muted text-left text-xs text-muted-fg"><tr><th className="px-4 py-2.5">User</th><th className="px-4">Role</th><th className="px-4">Plan</th><th className="px-4">XP</th><th className="px-4">Joined</th><th className="px-4">Last active</th><th /></tr></thead>
          <tbody>
            {data?.users.map((u) => (
              <tr key={u.id} className={cn('border-t border-border', u.disabled && 'opacity-50')}>
                <td className="px-4 py-2.5"><div className="flex items-center gap-2.5"><Avatar name={u.name} color={u.avatarColor} size={28} /><div><div className="font-medium">{u.name}</div><div className="text-xs text-muted-fg">{u.email}{u.mfaEnabled && <span className="ml-1.5 font-medium text-teal-700 dark:text-teal-300">· 2-step on</span>}</div></div></div></td>
                <td className="px-4 capitalize">{u.role}</td>
                <td className="px-4">{PLANS[u.plan].name}{u.planExpiresAt && u.plan !== 'free' && <div className="text-xs text-muted-fg">to {formatDate(u.planExpiresAt)}</div>}</td>
                <td className="px-4 tabular-nums">{u.xp}</td>
                <td className="px-4 text-xs">{formatDate(u.createdAt)}</td>
                <td className="px-4 text-xs">{u.lastActiveDay ? formatDate(u.lastActiveDay) : '—'}</td>
                <td className="px-4 text-right"><button onClick={() => { setEditing(u); setForm({ role: u.role, plan: u.plan, planMonths: 12, disabled: u.disabled }); }} className="btn-outline btn-sm">Edit</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex items-center justify-between text-sm text-muted-fg">
        <span>{data?.total ?? 0} users</span>
        <div className="flex gap-2"><button disabled={page === 0} onClick={() => setPage((p) => p - 1)} className="btn-outline btn-sm">Previous</button><button disabled={(page + 1) * 50 >= (data?.total ?? 0)} onClick={() => setPage((p) => p + 1)} className="btn-outline btn-sm">Next</button></div>
      </div>
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)} title={`Edit ${editing?.name ?? ''}`} description={editing?.email}>
        <form onSubmit={(e) => { e.preventDefault(); save.mutate(); }} className="space-y-4">
          <Field label="Role" htmlFor="r"><Select id="r" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })} disabled={editing?.id === me?.id}><option value="student">Student</option><option value="teacher">Teacher</option><option value="admin">Admin</option></Select></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Plan (scholarship / manual)" htmlFor="p"><Select id="p" value={form.plan} onChange={(e) => setForm({ ...form, plan: e.target.value as PlanId })}><option value="free">Free</option><option value="plus">Plus</option><option value="academy">Academy</option></Select></Field>
            <Field label="Months" htmlFor="m"><Input id="m" type="number" min={1} max={36} value={form.planMonths} disabled={form.plan === 'free'} onChange={(e) => setForm({ ...form, planMonths: Number(e.target.value) })} /></Field>
          </div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4 accent-red-600" checked={form.disabled} disabled={editing?.id === me?.id} onChange={(e) => setForm({ ...form, disabled: e.target.checked })} /> Disable account (signs them out everywhere)</label>
          <button disabled={save.isPending} className="btn-primary w-full">Save</button>
          {editing?.mfaEnabled && editing.id !== me?.id && (
            <div className="border-t border-border pt-4 text-sm">
              <p className="text-muted-fg">Lost their phone and recovery codes? Only reset after confirming who they are (for example a call to the number on file).</p>
              <button type="button" disabled={resetMfa.isPending} onClick={() => { if (window.confirm(`Reset two-step login for ${editing.name}? They will be signed out everywhere.`)) resetMfa.mutate(); }} className="btn-outline btn-sm mt-2">Reset two-step login</button>
            </div>
          )}
        </form>
      </Dialog>
    </div>
  );
}

function TeacherRequests() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ['admin-teachers'], queryFn: () => api.get<{ requests: { id: string; message: string; status: string; created_at: string; name: string; email: string; city: string | null; school: string | null }[] }>('/api/admin/teacher-requests') });
  const decide = useMutation({ mutationFn: ({ id, d }: { id: string; d: 'approve' | 'reject' }) => api.post(`/api/admin/teacher-requests/${id}/${d}`), onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-teachers'] }); toast.success('Decision saved'); } });
  if (!data) return <PageLoader />;
  if (!data.requests.length) return <Empty icon={<UserCheck className="h-8 w-8" />} title="No teacher requests">Requests appear when someone ticks “I’m a teacher” at sign-up or asks from Settings.</Empty>;
  return (
    <ul className="space-y-3">
      {data.requests.map((r) => (
        <li key={r.id} className="card flex flex-wrap items-start gap-4 p-4">
          <Avatar name={r.name} />
          <div className="min-w-0 flex-1">
            <div className="font-semibold">{r.name} <span className="text-sm font-normal text-muted-fg">{r.email}</span></div>
            <div className="text-xs text-muted-fg">{[r.school, r.city].filter(Boolean).join(' · ')} · {timeAgo(r.created_at)}</div>
            {r.message && <p className="mt-2 text-sm">{r.message}</p>}
          </div>
          {r.status === 'pending' ? (
            <div className="flex gap-2">
              <button onClick={() => decide.mutate({ id: r.id, d: 'approve' })} className="btn-run btn-sm"><Check className="h-4 w-4" /> Approve</button>
              <button onClick={() => decide.mutate({ id: r.id, d: 'reject' })} className="btn-outline btn-sm"><X className="h-4 w-4" /> Decline</button>
            </div>
          ) : <span className={cn('chip capitalize', r.status === 'approved' ? 'bg-teal-100 text-teal-600' : 'bg-muted')}>{r.status}</span>}
        </li>
      ))}
    </ul>
  );
}

function ClassesAdmin() {
  const { data } = useQuery({ queryKey: ['admin-classes'], queryFn: () => api.get<{ classrooms: { id: string; name: string; level: string; join_code: string; archived_at: string | null; created_at: string; teacher_name: string; members: number; assignments: number }[] }>('/api/admin/classrooms') });
  if (!data) return <PageLoader />;
  if (!data.classrooms.length) return <Empty icon={<GraduationCap className="h-8 w-8" />} title="No classrooms yet" />;
  return (
    <div className="card overflow-x-auto">
      <table className="w-full min-w-[640px] text-sm">
        <thead className="bg-muted text-left text-xs text-muted-fg"><tr><th className="px-4 py-2.5">Class</th><th className="px-4">Teacher</th><th className="px-4">Code</th><th className="px-4">Learners</th><th className="px-4">Assignments</th><th className="px-4">Created</th></tr></thead>
        <tbody>{data.classrooms.map((c) => (
          <tr key={c.id} className="border-t border-border"><td className="px-4 py-2.5"><Link to={`/classes/${c.id}`} className="font-medium hover:text-teal-600">{c.name}</Link>{c.archived_at && <span className="chip ml-2 bg-muted">archived</span>}</td><td className="px-4">{c.teacher_name}</td><td className="px-4 font-mono">{c.join_code}</td><td className="px-4">{c.members}</td><td className="px-4">{c.assignments}</td><td className="px-4 text-xs">{formatDate(c.created_at)}</td></tr>
        ))}</tbody>
      </table>
    </div>
  );
}

function PaymentsAdmin() {
  const { data } = useQuery({ queryKey: ['admin-payments'], queryFn: () => api.get<{ payments: { id: string; reference: string; plan: string; period: string; amount_cents: number; status: string; created_at: string; name: string; email: string; provider: string }[] }>('/api/admin/payments') });
  if (!data) return <PageLoader />;
  if (!data.payments.length) return <Empty icon={<CreditCard className="h-8 w-8" />} title="No payments yet">Payments appear here once Paynow is connected. You can also grant plans manually from Users.</Empty>;
  return (
    <div className="card overflow-x-auto">
      <table className="w-full min-w-[640px] text-sm">
        <thead className="bg-muted text-left text-xs text-muted-fg"><tr><th className="px-4 py-2.5">Date</th><th className="px-4">Learner</th><th className="px-4">Plan</th><th className="px-4">Amount</th><th className="px-4">Status</th><th className="px-4">Reference</th></tr></thead>
        <tbody>{data.payments.map((p) => (
          <tr key={p.id} className="border-t border-border"><td className="px-4 py-2.5 text-xs">{formatDateTime(p.created_at)}</td><td className="px-4">{p.name}<div className="text-xs text-muted-fg">{p.email}</div></td><td className="px-4 capitalize">{p.plan} · {p.period}</td><td className="px-4">${(p.amount_cents / 100).toFixed(2)}</td><td className="px-4"><span className={cn('chip capitalize', p.status === 'paid' ? 'bg-teal-100 text-teal-600' : p.status === 'pending' ? 'bg-gold-100 text-gold-600' : 'bg-muted')}>{p.status}</span></td><td className="px-4 font-mono text-xs">{p.reference}</td></tr>
        ))}</tbody>
      </table>
    </div>
  );
}

function AnnouncementsAdmin() {
  const qc = useQueryClient();
  const [form, setForm] = useState({ title: '', body: '' });
  const { data } = useQuery({ queryKey: ['admin-ann'], queryFn: () => api.get<{ announcements: { id: string; title: string; body: string; created_at: string; author_name: string }[] }>('/api/admin/announcements') });
  const post = useMutation({ mutationFn: () => api.post('/api/admin/announcements', form), onSuccess: () => { setForm({ title: '', body: '' }); qc.invalidateQueries({ queryKey: ['admin-ann'] }); toast.success('Announcement sent to everyone'); }, onError: (e) => toast.error(errorMessage(e)) });
  const del = useMutation({ mutationFn: (id: string) => api.del(`/api/admin/announcements/${id}`), onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-ann'] }) });
  return (
    <div className="max-w-3xl space-y-4">
      <form onSubmit={(e) => { e.preventDefault(); post.mutate(); }} className="card space-y-3 p-5">
        <h2 className="font-display text-lg font-semibold">Announce to all learners</h2>
        <Input placeholder="Title" required minLength={3} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} aria-label="Title" />
        <Textarea placeholder="Message" required value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} aria-label="Message" />
        <button disabled={post.isPending} className="btn-primary">Publish</button>
      </form>
      {data?.announcements.map((a) => (
        <div key={a.id} className="card flex gap-4 p-4">
          <div className="flex-1"><p className="font-semibold">{a.title}</p><p className="mt-1 text-sm text-muted-fg">{a.body}</p><p className="mt-1 text-xs text-muted-fg">{a.author_name} · {timeAgo(a.created_at)}</p></div>
          <button onClick={() => del.mutate(a.id)} className="btn-ghost btn-sm text-red-600">Delete</button>
        </div>
      ))}
    </div>
  );
}

function InboxAdmin() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ['admin-inbox'], queryFn: () => api.get<{ messages: { id: string; name: string; email: string; subject: string; body: string; handled_at: string | null; created_at: string }[] }>('/api/admin/contacts') });
  const done = useMutation({ mutationFn: (id: string) => api.post(`/api/admin/contacts/${id}/handled`), onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-inbox'] }) });
  if (!data) return <PageLoader />;
  if (!data.messages.length) return <Empty icon={<Inbox className="h-8 w-8" />} title="Inbox is empty">Messages from the Contact page land here.</Empty>;
  return (
    <ul className="space-y-3">
      {data.messages.map((m) => (
        <li key={m.id} className={cn('card p-4', m.handled_at && 'opacity-60')}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-semibold">{m.subject}</p>
            <span className="text-xs text-muted-fg">{formatDateTime(m.created_at)}</span>
          </div>
          <p className="text-sm text-muted-fg">{m.name} · <a href={`mailto:${m.email}?subject=Re: ${encodeURIComponent(m.subject)}`} className="text-teal-600 hover:underline">{m.email}</a></p>
          <p className="mt-2 whitespace-pre-wrap text-sm">{m.body}</p>
          {!m.handled_at && <button onClick={() => done.mutate(m.id)} className="btn-outline btn-sm mt-3"><Check className="h-4 w-4" /> Mark handled</button>}
        </li>
      ))}
    </ul>
  );
}

function AuditAdmin() {
  const { data } = useQuery({ queryKey: ['admin-audit'], queryFn: () => api.get<{ entries: { id: number; action: string; target: string | null; meta: string | null; created_at: string; actor_name: string | null }[] }>('/api/admin/audit') });
  if (!data) return <PageLoader />;
  return (
    <div className="card overflow-x-auto">
      <table className="w-full min-w-[640px] text-sm">
        <thead className="bg-muted text-left text-xs text-muted-fg"><tr><th className="px-4 py-2.5">When</th><th className="px-4">Who</th><th className="px-4">Action</th><th className="px-4">Details</th></tr></thead>
        <tbody>{data.entries.map((e) => (
          <tr key={e.id} className="border-t border-border align-top"><td className="whitespace-nowrap px-4 py-2 text-xs">{formatDateTime(e.created_at)}</td><td className="px-4 py-2">{e.actor_name ?? 'system'}</td><td className="px-4 py-2 font-mono text-xs">{e.action}</td><td className="max-w-xs truncate px-4 py-2 font-mono text-xs text-muted-fg" title={e.meta ?? ''}>{e.meta ?? e.target}</td></tr>
        ))}</tbody>
      </table>
    </div>
  );
}

function PromosAdmin() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ['admin-promos'], queryFn: () => api.get<{ promos: PromoCode[] }>('/api/admin/promos') });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ code: '', percentOff: 20, plans: ['plus', 'academy'], periods: ['monthly', 'yearly'], maxUses: '', expiresAt: '', description: '' });
  const create = useMutation({
    mutationFn: () => api.post('/api/admin/promos', { ...form, maxUses: form.maxUses ? Number(form.maxUses) : null, expiresAt: form.expiresAt || null }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-promos'] }); setOpen(false); toast.success('Promo code created'); },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const toggle = useMutation({ mutationFn: (p: PromoCode) => api.post(`/api/admin/promos/${encodeURIComponent(p.code)}/${p.active ? 'disable' : 'enable'}`), onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-promos'] }) });
  const flip = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  if (!data) return <PageLoader />;
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-2xl text-sm text-muted-fg">Percentage discounts applied at checkout and priced on the server. A 100% code activates the plan immediately without payment.</p>
        <button className="btn-primary" onClick={() => setOpen(true)}><Tag className="h-4 w-4" /> New code</button>
      </div>
      {!data.promos.length ? <Empty title="No promo codes yet">Create one for a school, a launch week or a partner.</Empty> : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="text-left text-xs text-muted-fg"><tr className="border-b border-border"><th className="px-4 py-2.5">Code</th><th className="px-4">Discount</th><th className="px-4">Applies to</th><th className="px-4 text-right">Used</th><th className="px-4">Expires</th><th className="px-4">Status</th><th /></tr></thead>
            <tbody>{data.promos.map((p) => (
              <tr key={p.code} className="border-b border-border last:border-0">
                <td className="px-4 py-2.5 font-semibold">{p.code}<div className="text-xs font-normal text-muted-fg">{p.description}</div></td>
                <td className="px-4 tabular">{p.percentOff}%</td>
                <td className="px-4 capitalize">{p.plans.join(', ')} · {p.periods.join(', ')}</td>
                <td className="px-4 text-right tabular">{p.used}{p.maxUses ? ` / ${p.maxUses}` : ''}</td>
                <td className="px-4">{p.expiresAt ? formatDate(p.expiresAt) : '—'}</td>
                <td className="px-4">{p.active ? 'Active' : 'Disabled'}</td>
                <td className="px-4 text-right"><button className="btn-ghost btn-sm" onClick={() => toggle.mutate(p)}>{p.active ? 'Disable' : 'Enable'}</button></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
      <Dialog open={open} onOpenChange={setOpen} title="New promo code">
        <form onSubmit={(e) => { e.preventDefault(); create.mutate(); }} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Code" hint="Letters, digits, dashes." htmlFor="pc"><Input id="pc" required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="SCHOOL-2026" /></Field>
            <Field label="Percent off" htmlFor="pp"><Input id="pp" type="number" min={1} max={100} required value={form.percentOff} onChange={(e) => setForm({ ...form, percentOff: Number(e.target.value) })} /></Field>
          </div>
          <fieldset><legend className="label">Plans</legend><div className="flex gap-4 text-sm">{['plus', 'academy'].map((v) => <label key={v} className="flex items-center gap-2 capitalize"><input type="checkbox" checked={form.plans.includes(v)} onChange={() => setForm({ ...form, plans: flip(form.plans, v) })} />{v}</label>)}</div></fieldset>
          <fieldset><legend className="label">Billing</legend><div className="flex gap-4 text-sm">{['monthly', 'yearly'].map((v) => <label key={v} className="flex items-center gap-2 capitalize"><input type="checkbox" checked={form.periods.includes(v)} onChange={() => setForm({ ...form, periods: flip(form.periods, v) })} />{v}</label>)}</div></fieldset>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Max uses (optional)" htmlFor="pm"><Input id="pm" type="number" min={1} value={form.maxUses} onChange={(e) => setForm({ ...form, maxUses: e.target.value })} /></Field>
            <Field label="Expires (optional)" htmlFor="pe"><Input id="pe" type="date" value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} /></Field>
          </div>
          <Field label="Note (optional)" htmlFor="pd"><Input id="pd" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Prince Edward School, Form 4" /></Field>
          <button disabled={create.isPending} className="btn-primary w-full">Create code</button>
        </form>
      </Dialog>
    </div>
  );
}

function ScholarshipsAdmin() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ['admin-scholarships'], queryFn: () => api.get<{ scholarships: Scholarship[] }>('/api/admin/scholarships') });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ email: '', plan: 'academy', months: 6, label: 'Full scholarship', reason: '' });
  const grant = useMutation({
    mutationFn: () => api.post('/api/admin/scholarships', form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-scholarships'] }); setOpen(false); toast.success('Scholarship granted'); },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const revoke = useMutation({ mutationFn: (id: string) => api.post(`/api/admin/scholarships/${id}/revoke`), onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-scholarships'] }) });
  if (!data) return <PageLoader />;
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-2xl text-sm text-muted-fg">Give a learner Plus or Academy for a set number of months, with a recorded reason. Every grant is in the audit log.</p>
        <button className="btn-primary" onClick={() => setOpen(true)}><HandHeart className="h-4 w-4" /> Grant scholarship</button>
      </div>
      {!data.scholarships.length ? <Empty title="No scholarships yet">Grant one to a learner who has applied through the contact page.</Empty> : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="text-left text-xs text-muted-fg"><tr className="border-b border-border"><th className="px-4 py-2.5">Learner</th><th className="px-4">Award</th><th className="px-4">Plan</th><th className="px-4">Until</th><th className="px-4">Granted by</th><th /></tr></thead>
            <tbody>{data.scholarships.map((s) => (
              <tr key={s.id} className="border-b border-border last:border-0">
                <td className="px-4 py-2.5">{s.userName}<div className="text-xs text-muted-fg">{s.userEmail}</div></td>
                <td className="px-4">{s.label}{s.reason && <div className="text-xs text-muted-fg">{s.reason}</div>}</td>
                <td className="px-4 capitalize">{s.plan} · {s.months} mo</td>
                <td className="px-4">{s.revoked ? 'Revoked' : formatDate(s.expiresAt)}</td>
                <td className="px-4">{s.grantedBy}</td>
                <td className="px-4 text-right">{!s.revoked && <button className="btn-ghost btn-sm" onClick={() => { if (confirm(`Revoke ${s.userName}'s scholarship?`)) revoke.mutate(s.id); }}>Revoke</button>}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
      <Dialog open={open} onOpenChange={setOpen} title="Grant a scholarship">
        <form onSubmit={(e) => { e.preventDefault(); grant.mutate(); }} className="space-y-4">
          <Field label="Learner's account email" htmlFor="se"><Input id="se" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Plan" htmlFor="sp"><Select id="sp" value={form.plan} onChange={(e) => setForm({ ...form, plan: e.target.value })}><option value="plus">Plus</option><option value="academy">Academy</option></Select></Field>
            <Field label="Months" htmlFor="sm2"><Input id="sm2" type="number" min={1} max={36} value={form.months} onChange={(e) => setForm({ ...form, months: Number(e.target.value) })} /></Field>
            <Field label="Award" htmlFor="sl"><Select id="sl" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })}>{['Full scholarship', 'Merit scholarship', 'Community grant', 'Strategic partner', 'Staff benefit', 'Beta tester'].map((l) => <option key={l}>{l}</option>)}</Select></Field>
          </div>
          <Field label="Reason" htmlFor="sr"><Textarea id="sr" rows={3} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} /></Field>
          <button disabled={grant.isPending} className="btn-primary w-full">Grant</button>
        </form>
      </Dialog>
    </div>
  );
}

function WaitlistAdmin() {
  const { data } = useQuery({ queryKey: ['admin-waitlist'], queryFn: () => api.get<{ entries: WaitlistEntry[] }>('/api/admin/waitlist') });
  if (!data) return <PageLoader />;
  const csv = () => {
    const rows = [['name', 'email', 'plan', 'note', 'joined'], ...data.entries.map((e) => [e.name, e.email, e.plan, e.note, e.createdAt])];
    const text = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: 'text/csv' }));
    a.download = 'premium-waitlist.csv';
    a.click();
  };
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-fg tabular">{data.entries.length} people waiting for Premium.</p>
        {data.entries.length > 0 && <button className="btn-outline btn-sm" onClick={csv}>Download CSV</button>}
      </div>
      {!data.entries.length ? <Empty title="Nobody on the waitlist yet">Sign-ups from the Premium card on the pricing page appear here.</Empty> : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="text-left text-xs text-muted-fg"><tr className="border-b border-border"><th className="px-4 py-2.5">Name</th><th className="px-4">Email</th><th className="px-4">What they want</th><th className="px-4">Joined</th></tr></thead>
            <tbody>{data.entries.map((e) => (
              <tr key={e.id} className="border-b border-border last:border-0"><td className="px-4 py-2.5">{e.name || '—'}</td><td className="px-4"><a href={`mailto:${e.email}`} className="text-teal-600 hover:underline">{e.email}</a></td><td className="px-4">{e.note || '—'}</td><td className="px-4">{formatDate(e.createdAt)}</td></tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}
