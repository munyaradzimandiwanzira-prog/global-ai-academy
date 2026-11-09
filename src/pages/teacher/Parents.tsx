/**
 * Parents and guardians: the contacts that get class announcements and progress reports.
 * GuardianList is shared by the learner's Settings ("me") and the teacher's student page.
 */
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { Guardian, ParentReportContent, ParentReportListItem, Relation } from '@shared/messages';
import { api, errorMessage } from '@/lib/api';
import { Dialog, Field, Input, Select, Textarea } from '@/components/ui';
import { MaterialIcon, Plus, Trash2 } from '@/components/icons';
import { shortDate } from './shared';
import { ReportBody } from '@/pages/ParentReport';

export function GuardianList({ studentId, learnerName, readOnly = false }: { studentId: string; learnerName?: string; readOnly?: boolean }) {
  const qc = useQueryClient();
  const key = ['guardians', studentId];
  const list = useQuery({ queryKey: key, queryFn: () => api.get<{ guardians: Guardian[] }>(`/api/messages/guardians/${studentId}`) });
  const [form, setForm] = useState<{ name: string; email: string; relation: Relation } | null>(null);
  const add = useMutation({
    mutationFn: () => api.post(`/api/messages/guardians/${studentId}`, form),
    onSuccess: () => { toast.success('Added. They’ll get a short welcome email.'); setForm(null); void qc.invalidateQueries({ queryKey: key }); },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const remove = useMutation({ mutationFn: (gid: string) => api.del(`/api/messages/guardians/${studentId}/${gid}`), onSuccess: () => void qc.invalidateQueries({ queryKey: key }), onError: (e) => toast.error(errorMessage(e)) });
  const gs = list.data?.guardians ?? [];
  const who = studentId === 'me' ? 'you' : learnerName ?? 'this learner';
  return (
    <div>
      {gs.length ? (
        <ul className="divide-y divide-border rounded-md border border-border">
          {gs.map((g) => (
            <li key={g.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2.5">
              <span className="min-w-0 flex-1"><span className="block font-medium">{g.name} <span className="font-normal text-muted-fg">· {g.relation}</span></span><span className="block truncate text-sm text-muted-fg">{g.email}</span></span>
              {g.unsubscribed && <span className="chip bg-muted">Unsubscribed</span>}
              <span className="text-xs text-muted-fg">Added by {g.addedBy === 'learner' ? (studentId === 'me' ? 'you' : 'the learner') : 'a teacher'}</span>
              {!readOnly && <button type="button" onClick={() => { if (window.confirm(`Remove ${g.name}? They’ll stop getting emails.`)) remove.mutate(g.id); }} aria-label={`Remove ${g.name}`} className="grid h-11 w-11 place-items-center rounded-full text-red-700 hover:bg-red-700/10 dark:text-red-300"><Trash2 /></button>}
            </li>
          ))}
        </ul>
      ) : <p className="text-[15px] text-muted-fg">No parent contacts for {who} yet.</p>}
      {!readOnly && gs.length < 4 && (form ? (
        <form className="mt-3 grid gap-3 rounded-md border border-border p-3 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); add.mutate(); }}>
          <Field label="Name" htmlFor={`g-n-${studentId}`}><Input id={`g-n-${studentId}`} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} maxLength={80} autoComplete="off" required /></Field>
          <Field label="Email" htmlFor={`g-e-${studentId}`}><Input id={`g-e-${studentId}`} type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} maxLength={200} autoComplete="off" required /></Field>
          <Field label="Who they are" htmlFor={`g-r-${studentId}`}><Select id={`g-r-${studentId}`} value={form.relation} onChange={(e) => setForm({ ...form, relation: e.target.value as Relation })}><option value="parent">Parent</option><option value="guardian">Guardian</option><option value="other">Other carer</option></Select></Field>
          <div className="flex items-end gap-2"><button type="button" className="btn-ghost" onClick={() => setForm(null)}>Cancel</button><button className="btn-primary flex-1" disabled={add.isPending} aria-busy={add.isPending || undefined}>Add</button></div>
        </form>
      ) : <button type="button" className="btn-outline btn-sm mt-3" onClick={() => setForm({ name: '', email: '', relation: 'parent' })}><Plus /> Add a parent or guardian</button>)}
    </div>
  );
}

/** Teacher side: contacts plus a progress report for parents, previewed before sending. */
export function ParentsPanel({ studentId, learnerName, readOnly }: { studentId: string; learnerName: string; readOnly: boolean }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [draft, setDraft] = useState<{ id: string; content: ParentReportContent; url: string; guardians: { name: string }[] } | null>(null);
  const reports = useQuery({ queryKey: ['parent-reports', studentId], queryFn: () => api.get<{ reports: ParentReportListItem[] }>(`/api/messages/parent-reports?student=${studentId}`), enabled: !readOnly });
  const preview = useMutation({ mutationFn: () => api.post<NonNullable<typeof draft>>('/api/messages/parent-reports/preview', { studentId, message }), onSuccess: setDraft, onError: (e) => toast.error(errorMessage(e)) });
  const send = useMutation({
    mutationFn: () => api.post<{ sentTo: number }>(`/api/messages/parent-reports/${draft!.id}/send`, {}),
    onSuccess: (r) => { toast.success(`Sent to ${r.sentTo} ${r.sentTo === 1 ? 'parent' : 'parents'}.`); setOpen(false); setDraft(null); setMessage(''); void qc.invalidateQueries({ queryKey: ['parent-reports', studentId] }); },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const copy = async (url: string) => { try { await navigator.clipboard.writeText(url); toast.success('Link copied. It works for 60 days.'); } catch { toast.error('Couldn’t copy. Select the link and copy it.'); } };
  return (
    <section className="card p-5" aria-labelledby="parents">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="parents" className="font-display text-lg font-semibold">Parents and guardians</h2>
        {!readOnly && <button type="button" className="btn-primary btn-sm" onClick={() => { setOpen(true); setDraft(null); }}><MaterialIcon name="description" /> Progress report for parents</button>}
      </div>
      <p className="mb-3 mt-1 text-sm text-muted-fg">They get the announcements you send with “also email parents”, and the progress reports you send. Every email has an unsubscribe link.</p>
      <GuardianList studentId={studentId} learnerName={learnerName} readOnly={readOnly} />
      {!!reports.data?.reports.length && (
        <details className="mt-4 text-sm">
          <summary className="cursor-pointer font-medium">Reports for parents ({reports.data.reports.length})</summary>
          <ul className="mt-2 space-y-1.5">
            {reports.data.reports.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-2">
                <span>{shortDate(r.createdAt)}</span>
                <span className="text-muted-fg">{r.sentAt ? `emailed to ${r.sentTo}` : 'not emailed'}{r.viewedAt ? ` · opened ${shortDate(r.viewedAt)}` : ''}</span>
                <a href={r.url} target="_blank" rel="noreferrer" className="font-semibold text-teal-600 hover:underline dark:text-teal-400">Open</a>
                <button type="button" className="font-semibold text-teal-600 hover:underline dark:text-teal-400" onClick={() => void copy(r.url)}>Copy link</button>
              </li>
            ))}
          </ul>
        </details>
      )}
      <Dialog open={open} onOpenChange={setOpen} title={`Progress report for ${learnerName}’s parents`} description="Zuva writes it from learning records only (never chats). Check it, then email it or copy the link." wide>
        {!draft ? (
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); preview.mutate(); }}>
            <Field label="Your note to the parents (optional)" htmlFor="pr-msg"><Textarea id="pr-msg" value={message} onChange={(e) => setMessage(e.target.value)} rows={4} maxLength={1500} placeholder={`e.g. ${learnerName} has worked hard on fractions this month…`} /></Field>
            <button className="btn-primary w-full" disabled={preview.isPending} aria-busy={preview.isPending || undefined}><MaterialIcon name="auto_awesome" /> {preview.isPending ? 'Writing the report…' : 'Write the report'}</button>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="max-h-[55vh] overflow-y-auto rounded-md border border-border bg-granite p-4 dark:bg-night"><ReportBody c={draft.content} /></div>
            <p className="text-sm text-muted-fg">{draft.guardians.length ? `Will be emailed to ${draft.guardians.map((g) => g.name).join(', ')}.` : 'No parent emails yet: add one above, or copy the link and share it on WhatsApp.'}</p>
            <div className="flex flex-wrap gap-2">
              <button type="button" className="btn-ghost" onClick={() => setDraft(null)}>Rewrite</button>
              <button type="button" className="btn-outline" onClick={() => void copy(draft.url)}><MaterialIcon name="link" /> Copy link</button>
              <button type="button" className="btn-primary ml-auto" onClick={() => send.mutate()} disabled={!draft.guardians.length || send.isPending} aria-busy={send.isPending || undefined}><MaterialIcon name="send" /> Email it</button>
            </div>
          </div>
        )}
      </Dialog>
    </section>
  );
}
