/**
 * Admin console, part two: money, teachers, learners, traffic and the data explorer.
 * Every change here goes through audited admin endpoints; secrets are never shown.
 */
import { Fragment, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { StudentDetail, StudentReportContent } from '@shared/teaching';
import { api, ApiError, errorMessage } from '@/lib/api';
import { Avatar, Dialog, Empty, Field, Input, PageLoader, Select, Stat, Textarea } from '@/components/ui';
import { ArrowLeft, Eye, Pencil, Plus, Search, Trash2, Wallet, X } from '@/components/icons';
import { cn, formatDate, formatDateTime } from '@/lib/utils';

const money = (cents: number | null | undefined) => {
  const n = cents ?? 0;
  return `${n < 0 ? '−' : ''}$${(Math.abs(n) / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};
const toCents = (v: string) => Math.round(Number(v.replace(/[^0-9.-]/g, '')) * 100);

function Section({ title, actions, children, className }: { title: string; actions?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn('card p-5', className)}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-lg font-semibold">{title}</h2>
        {actions}
      </div>
      {children}
    </section>
  );
}

/** Small accessible bar chart: one or two series per bucket, value on hover and in the label. */
function Bars({ data, series, height = 160, format = (n: number) => n.toLocaleString() }: {
  data: { label: string; values: number[] }[];
  series: { name: string; className: string }[];
  height?: number;
  format?: (n: number) => string;
}) {
  const max = Math.max(1, ...data.flatMap((d) => d.values));
  const every = Math.ceil(data.length / 12);
  return (
    <div>
      <div className="flex items-end gap-[2px]" style={{ height }} role="img" aria-label={`Chart of ${series.map((s) => s.name).join(' and ')}`}>
        {data.map((d, i) => (
          <div key={d.label} className="group relative flex h-full min-w-0 flex-1 items-end justify-center gap-[1px]">
            {d.values.map((v, j) => (
              <div key={j} className={cn('w-full rounded-t-sm', series[j]?.className)} style={{ height: `${v ? Math.max(2, (v / max) * 100) : 0}%` }} />
            ))}
            <span className="pointer-events-none absolute bottom-full z-10 mb-1 hidden whitespace-nowrap rounded bg-ink px-2 py-1 text-[11px] text-white group-hover:block dark:bg-night-700">
              {d.label}: {d.values.map((v, j) => `${series[j]?.name} ${format(v)}`).join(' · ')}
            </span>
            <span className="sr-only">{d.label}: {d.values.map((v, j) => `${series[j]?.name} ${format(v)}`).join(', ')}</span>
            {i % every === 0 && <span className="absolute -bottom-5 text-[10px] text-muted-fg">{d.label}</span>}
          </div>
        ))}
      </div>
      <div className="mt-7 flex gap-4 text-xs text-muted-fg">
        {series.map((s) => <span key={s.name} className="flex items-center gap-1.5"><span className={cn('h-2.5 w-2.5 rounded-sm', s.className)} />{s.name}</span>)}
      </div>
    </div>
  );
}

function Meter({ rows, format = (n: number) => n.toLocaleString() }: { rows: { label: string; value: number }[]; format?: (n: number) => string }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  if (!rows.length) return <p className="text-sm text-muted-fg">No data yet.</p>;
  return (
    <ul className="space-y-2 text-sm">
      {rows.map((r) => (
        <li key={r.label}>
          <div className="flex justify-between gap-3"><span className="truncate">{r.label}</span><span className="shrink-0 tabular-nums text-muted-fg">{format(r.value)}</span></div>
          <div className="mt-1 h-1.5 rounded-full bg-muted"><div className="h-full rounded-full bg-teal" style={{ width: `${(r.value / max) * 100}%` }} /></div>
        </li>
      ))}
    </ul>
  );
}

// ── Finance ───────────────────────────────────────────────────────────────

interface Finance {
  totals: { all_time: number; last30: number; this_month: number; payments: number; commission: number; mrr: number; activeSubscribers: number; ratePercent: number };
  byMonth: { month: string; cents: number; commission: number; n: number }[];
  byPlan: { plan: string; period: string; n: number; cents: number }[];
  ledger: { earned: number; paid_out: number; adjustments: number; owed: number };
  teachers: { id: string; name: string; email: string; students: number; paying: number; earned: number; paid_out: number; balance: number }[];
  payments: { id: string; reference: string; provider: string; plan: string; period: string; amount_cents: number; commission_cents: number | null; status: string; updated_at: string; name: string; email: string; teachers: string | null; teacher_ids: string | null }[];
}

export function FinanceAdmin() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ['admin-finance'], queryFn: () => api.get<Finance>('/api/admin/finance') });
  const [manual, setManual] = useState(false);
  const [wallet, setWallet] = useState<Finance['teachers'][number] | null>(null);
  const [override, setOverride] = useState<Finance['payments'][number] | null>(null);
  const [rate, setRate] = useState('');
  const saveRate = useMutation({
    mutationFn: () => api.put('/api/admin/settings', { commissionRatePercent: Number(rate) }),
    onSuccess: () => { toast.success('Commission rate saved. It applies to new payments.'); setRate(''); qc.invalidateQueries({ queryKey: ['admin-finance'] }); },
    onError: (e) => toast.error(errorMessage(e)),
  });
  if (!data) return <PageLoader />;
  const t = data.totals;
  const months = (() => {
    const out: { label: string; values: number[] }[] = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
      const key = d.toISOString().slice(0, 7);
      const m = data.byMonth.find((x) => x.month === key);
      out.push({ label: d.toLocaleDateString('en', { month: 'short', year: '2-digit', timeZone: 'UTC' }), values: [(m?.cents ?? 0) / 100, (m?.commission ?? 0) / 100] });
    }
    return out;
  })();
  const refresh = () => qc.invalidateQueries({ queryKey: ['admin-finance'] });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-2xl font-bold">Finance</h2>
        <button type="button" className="btn-primary btn-sm" onClick={() => setManual(true)}><Plus className="h-4 w-4" /> Record a payment</button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Monthly recurring revenue" value={money(t.mrr)} sub={`${t.activeSubscribers} active paid plans`} />
        <Stat label="This month" value={money(t.this_month)} sub={`${money(t.last30)} in the last 30 days`} />
        <Stat label="All time" value={money(t.all_time)} sub={`${t.payments} paid payments`} />
        <Stat label="Owed to teachers" value={money(data.ledger.owed)} sub={`${money(data.ledger.earned)} earned · ${money(data.ledger.paid_out)} paid out`} />
      </div>

      <Section title="Revenue and commission, last 12 months">
        <Bars data={months} series={[{ name: 'Revenue', className: 'bg-teal' }, { name: 'Teacher commission', className: 'bg-gold' }]} format={(n) => `$${n.toFixed(2)}`} />
      </Section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="By plan">
          {data.byPlan.length ? (
            <table className="w-full text-sm"><thead className="text-left text-muted-fg"><tr><th className="py-1 font-medium">Plan</th><th className="font-medium">Payments</th><th className="text-right font-medium">Total</th></tr></thead>
              <tbody className="divide-y divide-border">{data.byPlan.map((p) => <tr key={`${p.plan}-${p.period}`}><td className="py-2 capitalize">{p.plan} · {p.period}</td><td className="tabular-nums">{p.n}</td><td className="text-right tabular-nums">{money(p.cents)}</td></tr>)}</tbody>
            </table>
          ) : <p className="text-sm text-muted-fg">No paid payments yet.</p>}
        </Section>
        <Section title="Teacher commission rate">
          <p className="text-sm">Teachers get <strong>{t.ratePercent}%</strong> of each payment from their learners, shared equally when a learner has several teachers. Changing it affects new payments only.</p>
          <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); saveRate.mutate(); }}>
            <Input aria-label="New rate in percent" type="number" min={0} max={50} step={0.5} placeholder={String(t.ratePercent)} value={rate} onChange={(e) => setRate(e.target.value)} className="max-w-32" />
            <button className="btn-outline" disabled={!rate || saveRate.isPending}>Save rate</button>
          </form>
        </Section>
      </div>

      <Section title="Teacher wallets">
        {data.teachers.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="text-left text-muted-fg"><tr><th className="py-1 font-medium">Teacher</th><th className="font-medium">Learners</th><th className="font-medium">Paying</th><th className="text-right font-medium">Earned</th><th className="text-right font-medium">Paid out</th><th className="text-right font-medium">Balance</th><th /></tr></thead>
              <tbody className="divide-y divide-border">
                {data.teachers.map((w) => (
                  <tr key={w.id}>
                    <td className="py-2"><div className="font-medium">{w.name}</div><div className="text-xs text-muted-fg">{w.email}</div></td>
                    <td className="tabular-nums">{w.students}</td><td className="tabular-nums">{w.paying}</td>
                    <td className="text-right tabular-nums">{money(w.earned)}</td><td className="text-right tabular-nums">{money(w.paid_out)}</td>
                    <td className="text-right font-semibold tabular-nums">{money(w.balance)}</td>
                    <td className="pl-3 text-right"><div className="flex justify-end gap-1">
                      <Link to={`/teach/wallet?teacher=${w.id}`} className="btn-ghost btn-sm" aria-label={`Open ${w.name}'s wallet`}><Eye className="h-4 w-4" /></Link>
                      <button type="button" className="btn-outline btn-sm" onClick={() => setWallet(w)}><Wallet className="h-4 w-4" /> Pay or adjust</button>
                    </div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p className="text-sm text-muted-fg">No teachers yet.</p>}
      </Section>

      <Section title="Recent payments">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="text-left text-muted-fg"><tr><th className="py-1 font-medium">When</th><th className="font-medium">Learner</th><th className="font-medium">Plan</th><th className="font-medium">Status</th><th className="text-right font-medium">Amount</th><th className="font-medium pl-4">Commission to</th><th /></tr></thead>
            <tbody className="divide-y divide-border">
              {data.payments.map((p) => (
                <tr key={p.id}>
                  <td className="whitespace-nowrap py-2 text-xs">{formatDateTime(p.updated_at)}<div className="font-mono text-muted-fg">{p.reference}</div></td>
                  <td><div className="font-medium">{p.name}</div><div className="text-xs text-muted-fg">{p.email}</div></td>
                  <td className="capitalize">{p.plan} · {p.period}<div className="text-xs text-muted-fg">{p.provider}</div></td>
                  <td><span className={cn('chip', p.status === 'paid' ? 'bg-teal-100 text-teal-600' : 'bg-muted')}>{p.status}</span></td>
                  <td className="text-right tabular-nums">{money(p.amount_cents)}</td>
                  <td className="pl-4 text-xs">{p.teachers ? <>{p.teachers}<div className="text-muted-fg">{money(p.commission_cents)}</div></> : <span className="text-muted-fg">None</span>}</td>
                  <td className="pl-2 text-right">{p.status === 'paid' && <button type="button" className="btn-ghost btn-sm" onClick={() => setOverride(p)}><Pencil className="h-4 w-4" /> Commission</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Dialog open={manual} onOpenChange={setManual} title="Record a payment received outside Paynow">
        <ManualPayment onDone={() => { setManual(false); refresh(); }} />
      </Dialog>
      <Dialog open={!!wallet} onOpenChange={(o) => !o && setWallet(null)} title={wallet ? `${wallet.name}: balance ${money(wallet.balance)}` : ''}>
        {wallet && <WalletEntryForm teacher={wallet} onDone={() => { setWallet(null); refresh(); }} />}
      </Dialog>
      <Dialog open={!!override} onOpenChange={(o) => !o && setOverride(null)} title="Who gets this payment’s commission?">
        {override && <CommissionOverride payment={override} teachers={data.teachers} onDone={() => { setOverride(null); refresh(); }} />}
      </Dialog>
    </div>
  );
}

function ManualPayment({ onDone }: { onDone: () => void }) {
  const [f, setF] = useState({ email: '', plan: 'plus', period: 'monthly', amount: '', note: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const save = useMutation({
    mutationFn: () => api.post<{ reference: string }>('/api/admin/payments/manual', { email: f.email.trim(), plan: f.plan, period: f.period, amountCents: toCents(f.amount || '0'), note: f.note }),
    onSuccess: (r) => { toast.success(`Recorded as ${r.reference}. The plan is active and commission is paid.`); onDone(); },
    onError: (e) => { if (e instanceof ApiError && e.fields) setErrors(e.fields); toast.error(errorMessage(e)); },
  });
  return (
    <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); setErrors({}); save.mutate(); }}>
      <Field label="Learner’s email" htmlFor="mp-email" error={errors.email}><Input id="mp-email" type="email" required value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Plan" htmlFor="mp-plan"><Select id="mp-plan" value={f.plan} onChange={(e) => setF({ ...f, plan: e.target.value })}><option value="plus">Plus</option><option value="academy">Academy</option></Select></Field>
        <Field label="Period" htmlFor="mp-period"><Select id="mp-period" value={f.period} onChange={(e) => setF({ ...f, period: e.target.value })}><option value="monthly">Monthly</option><option value="yearly">Yearly</option></Select></Field>
        <Field label="Amount (USD)" htmlFor="mp-amt" error={errors.amountCents}><Input id="mp-amt" inputMode="decimal" required placeholder="5.00" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} /></Field>
      </div>
      <Field label="Note" htmlFor="mp-note" error={errors.note} hint="e.g. EcoCash ref MP2611… or bank transfer"><Input id="mp-note" required minLength={3} value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} /></Field>
      <button className="btn-primary" disabled={save.isPending}>{save.isPending ? 'Recording…' : 'Record payment'}</button>
    </form>
  );
}

function WalletEntryForm({ teacher, onDone }: { teacher: { id: string; balance: number }; onDone: () => void }) {
  const [f, setF] = useState({ kind: 'payout' as 'payout' | 'adjustment', amount: '', note: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const save = useMutation({
    mutationFn: () => api.post('/api/admin/wallets/entries', { teacherId: teacher.id, kind: f.kind, amountCents: toCents(f.amount || '0'), note: f.note }),
    onSuccess: () => { toast.success(f.kind === 'payout' ? 'Payout recorded' : 'Adjustment saved'); onDone(); },
    onError: (e) => { if (e instanceof ApiError && e.fields) setErrors(e.fields); toast.error(errorMessage(e)); },
  });
  return (
    <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); setErrors({}); save.mutate(); }}>
      <Field label="Type" htmlFor="we-kind" hint={f.kind === 'payout' ? 'Money you sent the teacher. Taken off their balance.' : 'A correction. Use a minus sign to take money off.'}>
        <Select id="we-kind" value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value as 'payout' | 'adjustment' })}><option value="payout">Payout</option><option value="adjustment">Adjustment</option></Select>
      </Field>
      <Field label="Amount (USD)" htmlFor="we-amt" error={errors.amountCents}>
        <div className="flex gap-2"><Input id="we-amt" inputMode="decimal" required value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} />
          {f.kind === 'payout' && teacher.balance > 0 && <button type="button" className="btn-outline btn-sm shrink-0" onClick={() => setF({ ...f, amount: (teacher.balance / 100).toFixed(2) })}>Full balance</button>}</div>
      </Field>
      <Field label="Note" htmlFor="we-note" error={errors.note}><Input id="we-note" required minLength={3} placeholder="e.g. EcoCash payout, ref …" value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} /></Field>
      <button className="btn-primary" disabled={save.isPending}>Save</button>
    </form>
  );
}

function CommissionOverride({ payment, teachers, onDone }: { payment: Finance['payments'][number]; teachers: Finance['teachers']; onDone: () => void }) {
  const [ids, setIds] = useState<string[]>((payment.teacher_ids ?? '').split(',').filter(Boolean));
  const [note, setNote] = useState('');
  const [q, setQ] = useState('');
  const save = useMutation({
    mutationFn: () => api.post<{ commissionCents: number }>(`/api/admin/payments/${payment.id}/commission`, { teacherIds: ids, note }),
    onSuccess: (r) => { toast.success(ids.length ? `Commission of ${money(r.commissionCents)} reassigned` : 'Commission removed'); onDone(); },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const list = teachers.filter((t) => !q || `${t.name} ${t.email}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
      <p className="text-sm text-muted-fg">{payment.name} paid {money(payment.amount_cents)} ({payment.reference}). Earlier commission is reversed and the new teachers are credited. Leave everyone unticked for no commission.</p>
      <Input aria-label="Filter teachers" placeholder="Filter teachers" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="max-h-56 space-y-1 overflow-y-auto rounded-lg border border-border p-2 text-sm">
        {list.map((t) => (
          <label key={t.id} className="flex items-center gap-2"><input type="checkbox" className="accent-teal" checked={ids.includes(t.id)} disabled={!ids.includes(t.id) && ids.length >= 5} onChange={(e) => setIds((x) => (e.target.checked ? [...x, t.id] : x.filter((y) => y !== t.id)))} /> {t.name} <span className="text-muted-fg">{t.email}</span></label>
        ))}
      </div>
      <Field label="Reason" htmlFor="co-note"><Input id="co-note" required minLength={3} value={note} onChange={(e) => setNote(e.target.value)} /></Field>
      <button className="btn-primary" disabled={save.isPending}>Save</button>
    </form>
  );
}

// ── Teachers ──────────────────────────────────────────────────────────────

interface TeacherRow { id: string; name: string; email: string; school: string | null; city: string | null; last_active_day: string | null; created_at: string; teacher_listed: number; students: number; classes: number; assignments: number; plans: number; reports: number; invites: number; balance: number }

export function TeachersAdmin() {
  const [q, setQ] = useState('');
  const { data } = useQuery({ queryKey: ['admin-teachers'], queryFn: () => api.get<{ teachers: TeacherRow[] }>('/api/admin/teachers') });
  if (!data) return <PageLoader />;
  const list = data.teachers.filter((t) => !q || `${t.name} ${t.email} ${t.school ?? ''}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-2xl font-bold">Teachers</h2>
        <div className="relative w-full max-w-xs"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-fg" /><Input aria-label="Search teachers" className="pl-9" placeholder="Name, email or school" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      </div>
      <p className="text-sm text-muted-fg">Open any teacher’s portal to see exactly what they see. Pending requests are under Teacher requests.</p>
      {list.length ? (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead className="border-b border-border text-left text-muted-fg"><tr>{['Teacher', 'Learners', 'Classes', 'Work set', 'Plans', 'Reports', 'Balance', 'Last active', ''].map((h) => <th key={h} className="px-4 py-2.5 font-medium">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-border">
              {list.map((t) => (
                <tr key={t.id}>
                  <td className="px-4 py-2.5"><div className="font-medium">{t.name}</div><div className="text-xs text-muted-fg">{t.email}{t.school ? ` · ${t.school}` : ''}{t.teacher_listed ? '' : ' · invite only'}</div></td>
                  <td className="px-4 tabular-nums">{t.students}</td><td className="px-4 tabular-nums">{t.classes}</td><td className="px-4 tabular-nums">{t.assignments}</td>
                  <td className="px-4 tabular-nums">{t.plans}</td><td className="px-4 tabular-nums">{t.reports}</td><td className="px-4 tabular-nums">{money(t.balance)}</td>
                  <td className="px-4 text-xs">{t.last_active_day ? formatDate(t.last_active_day) : '—'}</td>
                  <td className="px-4 text-right"><Link to={`/teach?teacher=${t.id}`} className="btn-outline btn-sm"><Eye className="h-4 w-4" /> Open portal</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <Empty title="No teachers found">Approved teachers appear here.</Empty>}
    </div>
  );
}

// ── One learner ───────────────────────────────────────────────────────────

interface LearnerData {
  user: Record<string, string | number | null> & { id: string; name: string; email: string; role: string; plan: string };
  teachers: { id: string; name: string; email: string; source: string; created_at: string }[];
  classes: { id: string; name: string; teacher_name: string; joined_at: string }[];
  payments: { id: string; reference: string; provider: string; plan: string; period: string; amount_cents: number; commission_cents: number | null; status: string; created_at: string }[];
  detail: StudentDetail | null;
  zuva: { memories: number; threads: number } | null;
  reports: { id: string; createdAt: string; authorName: string; content: StudentReportContent | null }[];
}

export function LearnerAdmin() {
  const { id = '' } = useParams();
  const qc = useQueryClient();
  const { data, error } = useQuery({ queryKey: ['admin-learner', id], queryFn: () => api.get<LearnerData>(`/api/admin/learners/${id}`) });
  const teachers = useQuery({ queryKey: ['admin-teachers'], queryFn: () => api.get<{ teachers: TeacherRow[] }>('/api/admin/teachers') });
  const [teacherId, setTeacherId] = useState('');
  const link = useMutation({
    mutationFn: () => api.post('/api/admin/links', { teacherId, studentId: id }),
    onSuccess: () => { toast.success('Linked'); setTeacherId(''); qc.invalidateQueries({ queryKey: ['admin-learner', id] }); },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const unlink = useMutation({
    mutationFn: (tid: string) => api.del(`/api/admin/links/${tid}/${id}`),
    onSuccess: () => { toast.success('Unlinked'); qc.invalidateQueries({ queryKey: ['admin-learner', id] }); },
    onError: (e) => toast.error(errorMessage(e)),
  });
  if (error) return <Empty title="Can’t open this learner">{errorMessage(error)}</Empty>;
  if (!data) return <PageLoader />;
  const u = data.user;
  const d = data.detail;
  const facts: [string, React.ReactNode][] = [
    ['Email', <>{u.email}{u.email_verified_at ? '' : <span className="ml-1 text-xs text-gold-600">(not confirmed)</span>}</>],
    ['Role', <span className="capitalize">{u.role}</span>],
    ['Plan', <span className="capitalize">{u.plan}{u.plan_expires_at && u.plan !== 'free' ? ` until ${formatDate(String(u.plan_expires_at))}` : ''}</span>],
    ['Level', <span className="capitalize">{String(u.level ?? '—')}</span>],
    ['Town / school', [u.city, u.school].filter(Boolean).join(' · ') || '—'],
    ['XP · streak', `${u.xp} · ${u.streak} days`],
    ['Joined', formatDate(String(u.created_at))],
    ['Last active', u.last_active_day ? formatDate(String(u.last_active_day)) : '—'],
    ['Two-step login', u.mfa_enabled_at ? 'On' : 'Off'],
    ['Account', u.disabled_at ? <span className="font-semibold text-red-600">Disabled</span> : 'Active'],
    ['Zuva', data.zuva ? `${data.zuva.threads} chats, ${data.zuva.memories} memories (content private)` : '—'],
  ];
  const linkable = (teachers.data?.teachers ?? []).filter((t) => !data.teachers.some((x) => x.id === t.id));
  return (
    <div className="space-y-6">
      <Link to="/admin/users" className="inline-flex items-center gap-1 text-sm text-muted-fg hover:text-fg"><ArrowLeft className="h-4 w-4" /> Users</Link>
      <div className="flex flex-wrap items-center gap-4">
        <Avatar name={u.name} size={56} />
        <div className="min-w-0 flex-1"><h2 className="font-display text-2xl font-bold">{u.name}</h2><p className="text-sm text-muted-fg">Viewing is recorded in the audit log.</p></div>
        <Link to={`/admin/data?table=users&q=${encodeURIComponent(String(u.email))}`} className="btn-outline btn-sm"><Pencil className="h-4 w-4" /> Edit record</Link>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Account">
          <dl className="grid grid-cols-[130px_1fr] gap-x-3 gap-y-2 text-sm">{facts.map(([k, v]) => <Fragment key={k}><dt className="text-muted-fg">{k}</dt><dd className="min-w-0 break-words">{v}</dd></Fragment>)}</dl>
        </Section>
        <Section title="Teachers and classes">
          {data.teachers.length ? (
            <ul className="divide-y divide-border text-sm">
              {data.teachers.map((t) => (
                <li key={t.id} className="flex items-center gap-2 py-2">
                  <span className="min-w-0 flex-1"><span className="font-medium">{t.name}</span> <span className="text-xs text-muted-fg">via {t.source} · {formatDate(t.created_at)}</span></span>
                  <Link to={`/teach/students/${id}?teacher=${t.id}`} className="btn-ghost btn-sm" aria-label={`See ${u.name} as ${t.name} does`}><Eye className="h-4 w-4" /></Link>
                  <button type="button" className="btn-ghost btn-sm text-red-600" aria-label={`Unlink from ${t.name}`} onClick={() => confirm(`Unlink ${u.name} from ${t.name}?`) && unlink.mutate(t.id)}><X className="h-4 w-4" /></button>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-muted-fg">No teachers.</p>}
          <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); if (teacherId) link.mutate(); }}>
            <Select aria-label="Teacher to link" value={teacherId} onChange={(e) => setTeacherId(e.target.value)}>
              <option value="">Link to a teacher…</option>
              {linkable.map((t) => <option key={t.id} value={t.id}>{t.name} ({t.email})</option>)}
            </Select>
            <button className="btn-outline shrink-0" disabled={!teacherId || link.isPending}>Link</button>
          </form>
          {data.classes.length > 0 && <ul className="mt-4 space-y-1 text-sm">{data.classes.map((c) => <li key={c.id}><Link to={`/classes/${c.id}`} className="font-medium hover:underline">{c.name}</Link> <span className="text-xs text-muted-fg">{c.teacher_name} · joined {formatDate(c.joined_at)}</span></li>)}</ul>}
        </Section>
      </div>
      {d && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Section title="Courses">
            {d.tracks.length ? <Meter rows={d.tracks.map((t) => ({ label: t.title, value: t.done }))} format={(n) => `${n} lessons`} /> : <p className="text-sm text-muted-fg">No lessons yet.</p>}
            {d.kids.some((k) => k.done) && <div className="mt-4"><p className="label">Kids Zone</p><Meter rows={d.kids.filter((k) => k.done).map((k) => ({ label: `Stage ${k.stage}`, value: k.done }))} format={(n) => `${n} levels`} /></div>}
          </Section>
          <Section title="Assignments">
            {d.assignments.length ? (
              <ul className="divide-y divide-border text-sm">{d.assignments.slice(0, 12).map((a) => <li key={a.id} className="flex justify-between gap-2 py-2"><span className="min-w-0 truncate">{a.title} <span className="text-xs text-muted-fg">{a.classroomName}</span></span><span className={cn('chip shrink-0', a.status === 'late' ? 'bg-red-100 text-red-700' : a.status === 'open' ? 'bg-muted' : 'bg-teal-100 text-teal-600')}>{a.status}{a.score != null ? ` ${a.score}` : ''}</span></li>)}</ul>
            ) : <p className="text-sm text-muted-fg">No work set.</p>}
          </Section>
        </div>
      )}
      <Section title="Payments">
        {data.payments.length ? (
          <div className="overflow-x-auto"><table className="w-full min-w-[520px] text-sm"><tbody className="divide-y divide-border">{data.payments.map((p) => <tr key={p.id}><td className="py-2 text-xs">{formatDateTime(p.created_at)}</td><td className="font-mono text-xs">{p.reference}</td><td className="capitalize">{p.plan} · {p.period}</td><td><span className="chip bg-muted">{p.status}</span></td><td className="text-right tabular-nums">{money(p.amount_cents)}</td><td className="text-right text-xs text-muted-fg">{p.commission_cents ? `${money(p.commission_cents)} to teachers` : ''}</td></tr>)}</tbody></table></div>
        ) : <p className="text-sm text-muted-fg">No payments.</p>}
      </Section>
      {data.reports.length > 0 && (
        <Section title="Zuva reports">
          <ul className="space-y-3">{data.reports.map((r) => <li key={r.id} className="rounded-lg bg-muted p-3 text-sm"><p className="text-xs text-muted-fg">{formatDateTime(r.createdAt)} · for {r.authorName}</p><p className="mt-1">{r.content?.summary}</p></li>)}</ul>
        </Section>
      )}
    </div>
  );
}

// ── Traffic ───────────────────────────────────────────────────────────────

interface Traffic {
  days: number;
  series: { day: string; views: number; visitors: number }[];
  pages: { path: string; views: number }[];
  sources: { value: string; views: number }[];
  countries: { value: string; views: number }[];
  devices: { value: string; views: number }[];
  auth: { value: string; views: number }[];
  totals: { views: number; visitors: number; signups: number };
}

const regionName = (() => {
  try { const dn = new Intl.DisplayNames(['en'], { type: 'region' }); return (c: string) => (c === 'XX' || c === 'T1' ? 'Unknown' : c.length === 2 ? dn.of(c.toUpperCase()) ?? c : c); } catch { return (c: string) => c; }
})();

export function TrafficAdmin() {
  const [days, setDays] = useState(30);
  const { data } = useQuery({ queryKey: ['admin-traffic', days], queryFn: () => api.get<Traffic>(`/api/admin/traffic?days=${days}`), placeholderData: keepPreviousData });
  if (!data) return <PageLoader />;
  const bars = data.series.map((s) => ({ label: new Date(`${s.day}T00:00:00Z`).toLocaleDateString('en', { day: 'numeric', month: 'short', timeZone: 'UTC' }), values: [s.views, s.visitors] }));
  const conv = data.totals.visitors ? ((data.totals.signups / data.totals.visitors) * 100).toFixed(1) : '0';
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-2xl font-bold">Traffic</h2>
        <div className="flex gap-1" role="group" aria-label="Period">
          {[7, 30, 90, 365].map((n) => <button key={n} type="button" aria-pressed={days === n} onClick={() => setDays(n)} className={cn('btn-sm rounded-lg px-3', days === n ? 'bg-ink text-white dark:bg-gold dark:text-ink' : 'btn-ghost')}>{n === 365 ? '1 year' : `${n} days`}</button>)}
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Page views" value={data.totals.views.toLocaleString()} />
        <Stat label="Visitors" value={data.totals.visitors.toLocaleString()} sub="Unique per day, counted without cookies" />
        <Stat label="Sign-ups" value={data.totals.signups.toLocaleString()} sub={`${conv}% of visitors`} />
      </div>
      <Section title="Views and visitors per day"><Bars data={bars} series={[{ name: 'Views', className: 'bg-teal' }, { name: 'Visitors', className: 'bg-gold' }]} /></Section>
      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Top pages"><Meter rows={data.pages.map((p) => ({ label: p.path, value: p.views }))} /></Section>
        <Section title="Where visitors came from"><Meter rows={data.sources.map((s) => ({ label: s.value, value: s.views }))} /></Section>
        <Section title="Countries"><Meter rows={data.countries.map((s) => ({ label: regionName(s.value), value: s.views }))} /></Section>
        <Section title="Devices and accounts">
          <Meter rows={data.devices.map((s) => ({ label: s.value, value: s.views }))} />
          <div className="mt-5"><Meter rows={data.auth.map((s) => ({ label: s.value === 'signed-in' ? 'Signed in' : s.value === 'guest' ? 'Not signed in' : s.value, value: s.views }))} /></div>
        </Section>
      </div>
      <p className="text-xs text-muted-fg">Counts are anonymous: no cookies, no IP addresses stored, and visitor ids change every day. Kept for 400 days.</p>
    </div>
  );
}

// ── Data explorer ─────────────────────────────────────────────────────────

interface TableList { tables: { name: string; rows: number; readOnly: boolean }[] }
interface TableData {
  table: string;
  columns: { name: string; type: string; required: boolean; pk: boolean }[];
  pk: string[];
  readOnly: boolean;
  rows: Record<string, string | number | null>[];
  total: number;
}
type Row = TableData['rows'][number];
const PAGE = 50;

export function DataAdmin() {
  const qc = useQueryClient();
  const params = new URLSearchParams(window.location.search);
  const [table, setTable] = useState(params.get('table') ?? '');
  const [q, setQ] = useState(params.get('q') ?? '');
  const [search, setSearch] = useState(params.get('q') ?? '');
  const [offset, setOffset] = useState(0);
  const [editing, setEditing] = useState<Row | 'new' | null>(null);
  const [filter, setFilter] = useState('');
  const tables = useQuery({ queryKey: ['admin-tables'], queryFn: () => api.get<TableList>('/api/admin/data') });
  const rows = useQuery({
    queryKey: ['admin-table', table, search, offset],
    enabled: !!table,
    placeholderData: keepPreviousData,
    queryFn: () => api.get<TableData>(`/api/admin/data/${table}?limit=${PAGE}&offset=${offset}&q=${encodeURIComponent(search)}`),
  });
  const keyOf = (r: Row, pk: string[]) => JSON.stringify(Object.fromEntries(pk.map((k) => [k, r[k]])));
  const del = useMutation({
    mutationFn: (r: Row) => api.del(`/api/admin/data/${table}/row?key=${encodeURIComponent(keyOf(r, rows.data!.pk))}`),
    onSuccess: () => { toast.success('Row deleted'); qc.invalidateQueries({ queryKey: ['admin-table', table] }); qc.invalidateQueries({ queryKey: ['admin-tables'] }); },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const pick = (t: string) => { setTable(t); setOffset(0); setQ(''); setSearch(''); };
  const data = rows.data;
  const cols = data ? [...(data.pk[0] === 'rowid' ? [{ name: 'rowid', type: 'INTEGER', required: false, pk: true }] : []), ...data.columns] : [];
  const visibleTables = (tables.data?.tables ?? []).filter((t) => !filter || t.name.includes(filter.toLowerCase()));

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-2xl font-bold">Data</h2>
        <p className="text-sm text-muted-fg">Read and change any record. Every change is written to the audit log. Passwords, two-step secrets and sessions are never shown.</p>
      </div>
      <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
        <aside className="card self-start p-2 lg:sticky lg:top-24">
          <Input aria-label="Filter tables" placeholder="Filter tables" value={filter} onChange={(e) => setFilter(e.target.value)} className="mb-2" />
          <ul className="max-h-[60vh] overflow-y-auto text-sm lg:max-h-[70vh]">
            {visibleTables.map((t) => (
              <li key={t.name}>
                <button type="button" onClick={() => pick(t.name)} aria-current={table === t.name} className={cn('flex w-full justify-between rounded-md px-2.5 py-1.5 text-left font-mono text-xs hover:bg-muted', table === t.name && 'bg-muted font-semibold')}>
                  <span className="truncate">{t.name}</span><span className="tabular-nums text-muted-fg">{t.rows}</span>
                </button>
              </li>
            ))}
          </ul>
        </aside>
        <div className="min-w-0">
          {!table ? <Empty title="Pick a table">Choose a table on the left to see its rows.</Empty> : !data ? <PageLoader /> : (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-mono text-base font-semibold">{data.table}</h3>
                <span className="text-sm text-muted-fg">{data.total.toLocaleString()} rows{data.readOnly ? ' · read-only' : ''}</span>
                <form className="ml-auto flex gap-2" onSubmit={(e) => { e.preventDefault(); setOffset(0); setSearch(q.trim()); }}>
                  <Input aria-label="Search this table" placeholder="Search text columns" value={q} onChange={(e) => setQ(e.target.value)} className="w-56" />
                  <button className="btn-outline btn-sm">Search</button>
                </form>
                {!data.readOnly && data.table !== 'users' && <button type="button" className="btn-primary btn-sm" onClick={() => setEditing('new')}><Plus className="h-4 w-4" /> New row</button>}
              </div>
              {data.rows.length ? (
                <div className="card overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="border-b border-border text-left text-muted-fg"><tr>{!data.readOnly && <th className="sticky left-0 bg-card px-2 py-2" />}{cols.map((c) => <th key={c.name} className="whitespace-nowrap px-3 py-2 font-mono font-medium">{c.name}{c.pk ? ' 🔑' : ''}</th>)}</tr></thead>
                    <tbody className="divide-y divide-border">
                      {data.rows.map((r) => (
                        <tr key={keyOf(r, data.pk)} className="hover:bg-muted/50">
                          {!data.readOnly && (
                            <td className="sticky left-0 bg-card px-2 py-1.5"><div className="flex gap-0.5">
                              <button type="button" className="rounded p-1 hover:bg-muted" aria-label="Edit row" onClick={() => setEditing(r)}><Pencil className="h-3.5 w-3.5" /></button>
                              <button type="button" className="rounded p-1 text-red-600 hover:bg-muted" aria-label="Delete row" onClick={() => confirm(`Delete this ${data.table} row? This can’t be undone.`) && del.mutate(r)}><Trash2 className="h-3.5 w-3.5" /></button>
                            </div></td>
                          )}
                          {cols.map((c) => <td key={c.name} className="max-w-[260px] truncate px-3 py-1.5 font-mono" title={r[c.name] == null ? 'NULL' : String(r[c.name])}>{r[c.name] == null ? <span className="text-muted-fg">null</span> : String(r[c.name])}</td>)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : <Empty title="No rows">{search ? 'Nothing matches that search.' : 'This table is empty.'}</Empty>}
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-fg">{data.total ? `${offset + 1}–${Math.min(offset + PAGE, data.total)} of ${data.total.toLocaleString()}` : ''}</span>
                <div className="flex gap-2">
                  <button type="button" className="btn-outline btn-sm" disabled={offset === 0} onClick={() => setOffset((o) => Math.max(0, o - PAGE))}>Previous</button>
                  <button type="button" className="btn-outline btn-sm" disabled={offset + PAGE >= data.total} onClick={() => setOffset((o) => o + PAGE)}>Next</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)} title={editing === 'new' ? `New ${table} row` : `Edit ${table} row`} wide>
        {editing && data && <RowEditor data={data} row={editing === 'new' ? null : editing} keyOf={keyOf} onDone={() => { setEditing(null); qc.invalidateQueries({ queryKey: ['admin-table', table] }); qc.invalidateQueries({ queryKey: ['admin-tables'] }); }} />}
      </Dialog>
    </div>
  );
}

function RowEditor({ data, row, keyOf, onDone }: { data: TableData; row: Row | null; keyOf: (r: Row, pk: string[]) => string; onDone: () => void }) {
  const isNum = (t: string) => /INT|REAL|NUM|FLOA|DOUB/i.test(t);
  const initial = useMemo(() => Object.fromEntries(data.columns.map((c) => [c.name, row?.[c.name] == null ? '' : String(row[c.name])])), [data.columns, row]);
  const nulls0 = useMemo(() => new Set(data.columns.filter((c) => row && row[c.name] == null).map((c) => c.name)), [data.columns, row]);
  const [vals, setVals] = useState<Record<string, string>>(initial);
  const [nulls, setNulls] = useState<Set<string>>(nulls0);
  const save = useMutation({
    mutationFn: () => {
      const values: Record<string, string | number | null> = {};
      for (const c of data.columns) {
        if (row && c.pk) continue;
        const changed = !row || vals[c.name] !== initial[c.name] || nulls.has(c.name) !== nulls0.has(c.name);
        if (!changed) continue;
        if (!row && vals[c.name] === '' && !nulls.has(c.name)) continue; // let defaults apply
        values[c.name] = nulls.has(c.name) ? null : isNum(c.type) && vals[c.name] !== '' && !Number.isNaN(Number(vals[c.name])) ? Number(vals[c.name]) : vals[c.name]!;
      }
      if (!Object.keys(values).length) throw new Error('Nothing changed.');
      return row
        ? api.put(`/api/admin/data/${data.table}/row?key=${encodeURIComponent(keyOf(row, data.pk))}`, { values })
        : api.post(`/api/admin/data/${data.table}`, { values });
    },
    onSuccess: () => { toast.success(row ? 'Saved' : 'Row added'); onDone(); },
    onError: (e) => toast.error(errorMessage(e)),
  });
  return (
    <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
      <div className="grid max-h-[60vh] gap-3 overflow-y-auto pr-1 sm:grid-cols-2">
        {data.columns.map((c) => {
          const long = (vals[c.name]?.length ?? 0) > 60 || /json|content|body|instructions|code|text/i.test(c.name);
          const locked = !!row && c.pk;
          return (
            <div key={c.name} className={cn(long && 'sm:col-span-2')}>
              <div className="mb-1 flex items-center justify-between gap-2">
                <label htmlFor={`col-${c.name}`} className="font-mono text-xs font-semibold">{c.name} <span className="font-normal text-muted-fg">{c.type || 'any'}{c.required ? ' · required' : ''}{c.pk ? ' · key' : ''}</span></label>
                {!locked && !c.required && <label className="flex items-center gap-1 text-[11px] text-muted-fg"><input type="checkbox" className="accent-teal" checked={nulls.has(c.name)} onChange={(e) => setNulls((s) => { const n = new Set(s); if (e.target.checked) n.add(c.name); else n.delete(c.name); return n; })} /> null</label>}
              </div>
              {long
                ? <Textarea id={`col-${c.name}`} rows={4} className="font-mono text-xs" disabled={locked || nulls.has(c.name)} value={vals[c.name]} onChange={(e) => setVals({ ...vals, [c.name]: e.target.value })} />
                : <Input id={`col-${c.name}`} className="font-mono text-xs" inputMode={isNum(c.type) ? 'decimal' : undefined} disabled={locked || nulls.has(c.name)} placeholder={!row && c.pk && c.name === 'id' ? 'Leave empty for a new id' : undefined} value={vals[c.name]} onChange={(e) => setVals({ ...vals, [c.name]: e.target.value })} />}
            </div>
          );
        })}
      </div>
      <p className="text-xs text-muted-fg">Only the fields you change are saved. Changes are audited.</p>
      <button className="btn-primary" disabled={save.isPending}>{save.isPending ? 'Saving…' : row ? 'Save changes' : 'Add row'}</button>
    </form>
  );
}
