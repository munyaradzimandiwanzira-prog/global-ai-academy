import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { TeacherInvite } from '@shared/teaching';
import { api, errorMessage } from '@/lib/api';
import { Dialog, Empty, Field, Input, PageHeader, PageLoader, Select } from '@/components/ui';
import { QrCode } from '@/components/QrCode';
import { Copy, Plus, Ticket, Share2 } from '@/components/icons';
import { TeachNav, shortDate, useTeacherScope } from './shared';

export default function TeachInvites() {
  const { q, readOnly } = useTeacherScope();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [qr, setQr] = useState<TeacherInvite | null>(null);
  const invites = useQuery({ queryKey: ['teach-invites', q('')], queryFn: () => api.get<{ invites: TeacherInvite[] }>(q('/api/teach/invites')) });
  const settings = useQuery({ queryKey: ['teach-settings', q('')], queryFn: () => api.get<{ listed: boolean }>(q('/api/teach/settings')) });
  const classes = useQuery({ queryKey: ['my-classes'], enabled: !readOnly, queryFn: () => api.get<{ teaching: { id: string; name: string; archived: boolean }[] }>('/api/classrooms') });
  const revoke = useMutation({
    mutationFn: (id: string) => api.post(`/api/teach/invites/${id}/revoke`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['teach-invites'] }); toast.success('Invite switched off'); },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const listed = useMutation({
    mutationFn: (v: boolean) => api.put('/api/teach/settings', { listed: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['teach-settings'] }),
    onError: (e) => toast.error(errorMessage(e)),
  });

  const copy = async (inv: TeacherInvite) => {
    const text = `Join my class on Global AI Academy. It's free: ${inv.url} (or enter the code ${inv.code} when you sign up).`;
    try {
      if (navigator.share) await navigator.share({ title: 'Join my class', text });
      else { await navigator.clipboard.writeText(inv.url); toast.success('Link copied'); }
    } catch { /* share sheet closed */ }
  };

  if (invites.isLoading) return <PageLoader />;
  const active = invites.data?.invites.filter((i) => !i.revoked) ?? [];
  const old = invites.data?.invites.filter((i) => i.revoked) ?? [];

  return (
    <div className="container py-8">
      <PageHeader title="Invite learners" description="Learners join you free with a link or a code. Anyone who joins shows up in your Students list." actions={readOnly ? undefined : <button type="button" className="btn-primary" onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> New invite</button>} />
      <TeachNav />
      {active.length ? (
        <ul className="grid gap-4 md:grid-cols-2">
          {active.map((i) => (
            <li key={i.id} className="card p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-semibold">{i.label || 'Invite'}</div>
                  <div className="text-sm text-muted-fg">{i.classroomName ? `Joins ${i.classroomName}` : 'Joins you (no class)'} · {i.used}{i.maxUses ? `/${i.maxUses}` : ''} joined{i.expiresAt ? ` · until ${shortDate(i.expiresAt)}` : ''}</div>
                </div>
                <span className="rounded-lg bg-muted px-3 py-1.5 font-mono text-lg font-semibold tracking-wider">{i.code}</span>
              </div>
              <div className="mt-3 truncate rounded-lg border border-border bg-muted/40 px-3 py-2 font-mono text-xs">{i.url}</div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" className="btn-primary btn-sm" onClick={() => copy(i)}><Share2 className="h-4 w-4" /> Share</button>
                <button type="button" className="btn-outline btn-sm" onClick={async () => { await navigator.clipboard.writeText(i.code); toast.success('Code copied'); }}><Copy className="h-4 w-4" /> Copy code</button>
                <button type="button" className="btn-outline btn-sm" onClick={() => setQr(i)}>QR code</button>
                {!readOnly && <button type="button" className="btn-outline btn-sm ml-auto" onClick={() => revoke.mutate(i.id)}>Switch off</button>}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <Empty icon={<Ticket className="h-10 w-10" />} title="No invites yet" action={readOnly ? undefined : <button type="button" className="btn-primary" onClick={() => setOpen(true)}>Make your first invite</button>}>
          Make one link for each class, or one for everyone. Share it on WhatsApp, write the code on the board, or print the QR code.
        </Empty>
      )}

      <section className="card mt-8 max-w-2xl p-5" aria-labelledby="find-me">
        <h2 id="find-me" className="font-display text-lg font-semibold">Let learners find you</h2>
        <label className="mt-2 flex items-start gap-3 text-sm">
          <input type="checkbox" className="mt-0.5 h-4 w-4 accent-teal" disabled={readOnly || settings.isLoading} checked={!!settings.data?.listed} onChange={(e) => listed.mutate(e.target.checked)} />
          <span>Show my name, school and city when learners search for their teacher at sign-up. Learners who pick you join your Students list. Turn this off to accept learners by invite only.</span>
        </label>
      </section>

      {old.length > 0 && (
        <details className="mt-8 max-w-2xl text-sm"><summary className="cursor-pointer font-medium">Switched-off invites ({old.length})</summary>
          <ul className="mt-2 divide-y divide-border rounded-lg border border-border">{old.map((i) => <li key={i.id} className="flex justify-between px-4 py-2"><span>{i.label || i.code}</span><span className="text-muted-fg">{i.used} joined</span></li>)}</ul>
        </details>
      )}

      <Dialog open={open} onOpenChange={setOpen} title="New invite">
        <NewInvite classes={(classes.data?.teaching ?? []).filter((c) => !c.archived)} onDone={() => { setOpen(false); qc.invalidateQueries({ queryKey: ['teach-invites'] }); }} />
      </Dialog>
      <Dialog open={!!qr} onOpenChange={(o) => !o && setQr(null)} title={qr ? `Scan to join${qr.classroomName ? ` ${qr.classroomName}` : ''}` : ''}>
        {qr && (
          <div className="flex flex-col items-center gap-3 text-center">
            <QrCode value={qr.url} size={240} label={`QR code for ${qr.url}`} />
            <p className="font-mono text-2xl font-semibold tracking-widest">{qr.code}</p>
            <p className="text-sm text-muted-fg">Scan with a phone camera, or go to the site and enter this code when signing up.</p>
            <button type="button" className="btn-outline btn-sm print:hidden" onClick={() => window.print()}>Print</button>
          </div>
        )}
      </Dialog>
    </div>
  );
}

function NewInvite({ classes, onDone }: { classes: { id: string; name: string }[]; onDone: () => void }) {
  const [form, setForm] = useState({ label: '', classroomId: classes[0]?.id ?? '', maxUses: '', expiresInDays: '' });
  const create = useMutation({
    mutationFn: () => api.post('/api/teach/invites', {
      label: form.label, classroomId: form.classroomId || null,
      maxUses: form.maxUses ? Number(form.maxUses) : null, expiresInDays: form.expiresInDays ? Number(form.expiresInDays) : null,
    }),
    onSuccess: () => { toast.success('Invite ready to share'); onDone(); },
    onError: (e) => toast.error(errorMessage(e)),
  });
  return (
    <form onSubmit={(e) => { e.preventDefault(); create.mutate(); }} className="space-y-4">
      <Field label="Name (for you)" htmlFor="ni-label"><Input id="ni-label" placeholder="e.g. Form 2 Blue, 2027" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} maxLength={80} /></Field>
      <Field label="Also join this class" htmlFor="ni-class" hint="Learners who use the link are added to the class too.">
        <Select id="ni-class" value={form.classroomId} onChange={(e) => setForm({ ...form, classroomId: e.target.value })}>
          <option value="">No class, just link them to me</option>
          {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Most learners (optional)" htmlFor="ni-max"><Input id="ni-max" type="number" min={1} max={1000} value={form.maxUses} onChange={(e) => setForm({ ...form, maxUses: e.target.value })} /></Field>
        <Field label="Expires after days (optional)" htmlFor="ni-exp"><Input id="ni-exp" type="number" min={1} max={365} value={form.expiresInDays} onChange={(e) => setForm({ ...form, expiresInDays: e.target.value })} /></Field>
      </div>
      <button className="btn-primary" disabled={create.isPending}>Create invite</button>
    </form>
  );
}
