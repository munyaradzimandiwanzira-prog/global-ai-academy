import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { PAYOUT_METHODS, PAYOUT_MIN_CENTS, type PayoutMethod, type PayoutRequest, type PayoutStatus } from '@shared/teaching';
import { api, ApiError, errorMessage } from '@/lib/api';
import { Dialog, Field, Input, Select, Textarea } from '@/components/ui';
import { Send } from '@/components/icons';
import { cn } from '@/lib/utils';
import { money, shortDate, useTeacherScope } from './shared';

interface PayoutsData { requests: PayoutRequest[]; balanceCents: number; reservedCents: number; availableCents: number; lastMethod: { method: PayoutMethod; details: string } | null }

export const PAYOUT_STATUS: Record<PayoutStatus, { label: string; className: string }> = {
  pending: { label: 'Waiting', className: 'bg-gold-100 text-gold-600' },
  paid: { label: 'Paid', className: 'bg-teal-100 text-teal-600 dark:bg-teal/20' },
  rejected: { label: 'Not paid', className: 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300' },
  cancelled: { label: 'Cancelled', className: 'bg-muted text-muted-fg' },
};
export const methodLabel = (m: PayoutMethod) => PAYOUT_METHODS.find((x) => x.id === m)?.label ?? m;

/** "Get paid" card on the wallet page: ask for a payout, see where it is, cancel it. */
export function PayoutPanel() {
  const { q, readOnly } = useTeacherScope();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const { data } = useQuery({ queryKey: ['teach-payouts', q('')], queryFn: () => api.get<PayoutsData>(q('/api/teach/payouts')) });
  const cancel = useMutation({
    mutationFn: (id: string) => api.post(`/api/teach/payouts/${id}/cancel`),
    onSuccess: () => { toast.success('Request cancelled'); qc.invalidateQueries({ queryKey: ['teach-payouts'] }); },
    onError: (e) => toast.error(errorMessage(e)),
  });
  if (!data) return null;
  const pending = data.requests.find((r) => r.status === 'pending');
  const canAsk = !readOnly && !pending && data.availableCents >= PAYOUT_MIN_CENTS;
  const past = data.requests.filter((r) => r.status !== 'pending');

  return (
    <section className="card mt-6 p-5" aria-labelledby="get-paid">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="get-paid" className="font-display text-xl font-semibold">Get paid</h2>
          <p className="mt-1 text-sm text-muted-fg">
            {pending ? 'Your request is with the Academy team. We’ll tell you here and by email when it’s sent.'
              : data.availableCents >= PAYOUT_MIN_CENTS ? `You can ask for up to ${money(data.availableCents)}. Payouts usually arrive within 3 working days.`
                : `You can ask for a payout once your balance reaches ${money(PAYOUT_MIN_CENTS)}.`}
          </p>
        </div>
        {!readOnly && !pending && <button type="button" className="btn-primary" disabled={!canAsk} onClick={() => setOpen(true)}><Send className="h-4 w-4" /> Request payout</button>}
      </div>

      {pending && (
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-gold/50 bg-gold-100/40 p-4 dark:bg-night-800">
          <div className="min-w-0 flex-1">
            <p className="font-semibold">{money(pending.amountCents)} by {methodLabel(pending.method)}</p>
            <p className="truncate text-sm text-muted-fg">To {pending.details} · asked {shortDate(pending.createdAt)}</p>
          </div>
          <span className={cn('chip', PAYOUT_STATUS.pending.className)}>{PAYOUT_STATUS.pending.label}</span>
          {!readOnly && <button type="button" className="btn-outline btn-sm" disabled={cancel.isPending} onClick={() => { if (window.confirm('Cancel this payout request?')) cancel.mutate(pending.id); }}>Cancel</button>}
        </div>
      )}

      {past.length > 0 && (
        <details className="mt-4 text-sm">
          <summary className="cursor-pointer font-medium">Past requests ({past.length})</summary>
          <ul className="mt-2 divide-y divide-border rounded-lg border border-border">
            {past.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5">
                <span className="font-medium tabular">{money(r.amountCents)}</span>
                <span className="text-muted-fg">{methodLabel(r.method)} · {shortDate(r.createdAt)}</span>
                {r.reference && <span className="font-mono text-xs text-muted-fg">ref {r.reference}</span>}
                <span className={cn('chip ml-auto', PAYOUT_STATUS[r.status].className)}>{PAYOUT_STATUS[r.status].label}</span>
                {r.adminNote && <p className="w-full text-xs text-muted-fg">{r.adminNote}</p>}
              </li>
            ))}
          </ul>
        </details>
      )}

      <Dialog open={open} onOpenChange={setOpen} title="Request a payout">
        <RequestForm data={data} onDone={() => { setOpen(false); qc.invalidateQueries({ queryKey: ['teach-payouts'] }); }} />
      </Dialog>
    </section>
  );
}

function RequestForm({ data, onDone }: { data: PayoutsData; onDone: () => void }) {
  const [f, setF] = useState({
    amount: (data.availableCents / 100).toFixed(2),
    method: data.lastMethod?.method ?? ('ecocash' as PayoutMethod),
    details: data.lastMethod?.details ?? '',
    note: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const cents = Math.round(Number(f.amount) * 100);
  const send = useMutation({
    mutationFn: () => api.post('/api/teach/payouts', { amountCents: cents, method: f.method, details: f.details, note: f.note }),
    onSuccess: () => { toast.success('Request sent. We’ll let you know when it’s paid.'); onDone(); },
    onError: (e) => { if (e instanceof ApiError && e.fields) setErrors(e.fields); toast.error(errorMessage(e)); },
  });
  const hint = PAYOUT_METHODS.find((m) => m.id === f.method)?.hint;
  const tooMuch = cents > data.availableCents;
  const tooLittle = !Number.isFinite(cents) || cents < PAYOUT_MIN_CENTS;
  return (
    <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); setErrors({}); send.mutate(); }}>
      <Field label="Amount (USD)" htmlFor="po-amt" error={errors.amountCents ?? (tooMuch ? `Up to ${money(data.availableCents)}` : undefined)} hint={`Between ${money(PAYOUT_MIN_CENTS)} and ${money(data.availableCents)}.`}>
        <Input id="po-amt" inputMode="decimal" required value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} />
      </Field>
      <Field label="Pay me by" htmlFor="po-method">
        <Select id="po-method" value={f.method} onChange={(e) => setF({ ...f, method: e.target.value as PayoutMethod })}>
          {PAYOUT_METHODS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
        </Select>
      </Field>
      <Field label="Where to send it" htmlFor="po-details" error={errors.details} hint={hint}>
        {f.method === 'bank' || f.method === 'other'
          ? <Textarea id="po-details" rows={3} required minLength={5} maxLength={300} value={f.details} onChange={(e) => setF({ ...f, details: e.target.value })} />
          : <Input id="po-details" inputMode="tel" autoComplete="tel" required minLength={5} maxLength={300} value={f.details} onChange={(e) => setF({ ...f, details: e.target.value })} />}
      </Field>
      <Field label="Note (optional)" htmlFor="po-note"><Input id="po-note" maxLength={300} value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} /></Field>
      <p className="text-xs text-muted-fg">Check the number carefully: money sent to a wrong number can’t always be recovered. Only the Academy team sees these details.</p>
      <button className="btn-primary" disabled={send.isPending || tooMuch || tooLittle}>{send.isPending ? 'Sending…' : `Request ${tooLittle ? '' : money(cents)}`}</button>
    </form>
  );
}
