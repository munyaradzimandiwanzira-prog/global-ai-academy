import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { Announcement } from '@shared/messages';
import { api, errorMessage } from '@/lib/api';
import { Empty, Field, Input, PageHeader, PageLoader, Textarea } from '@/components/ui';
import { MaterialIcon } from '@/components/icons';
import { TeachNav, shortDate, useTeacherScope } from './shared';
import { LearnerPicker, audienceBody, audienceReady, emptyAudience, type Audience } from './LearnerPicker';

/** Announcements to a class or chosen learners, optionally emailed to their parents too. */
export default function TeachMessages() {
  const { readOnly } = useTeacherScope();
  const qc = useQueryClient();
  const list = useQuery({ queryKey: ['announcements'], queryFn: () => api.get<{ announcements: Announcement[] }>('/api/messages/announcements'), enabled: !readOnly });
  const [aud, setAud] = useState<Audience>(emptyAudience);
  const [title, setTitle] = useState('');
  const [bodyText, setBody] = useState('');
  const [toParents, setToParents] = useState(false);
  const send = useMutation({
    mutationFn: () => api.post<{ learners: number; parentEmails: number }>('/api/messages/announcements', { ...audienceBody(aud), title, body: bodyText, toParents }),
    onSuccess: (r) => {
      toast.success(`Sent to ${r.learners} ${r.learners === 1 ? 'learner' : 'learners'}${toParents ? ` and ${r.parentEmails} ${r.parentEmails === 1 ? 'parent' : 'parents'}` : ''}.`);
      setTitle(''); setBody(''); setToParents(false);
      void qc.invalidateQueries({ queryKey: ['announcements'] });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const ready = audienceReady(aud) && title.trim().length >= 2 && bodyText.trim().length >= 2;
  return (
    <div className="container py-8">
      <PageHeader title="Messages" description="Announcements reach learners in the app and by email. Tick “also email parents” to reach the parents and guardians on file." />
      <TeachNav />
      {readOnly ? <p className="text-muted-fg">Messages are private to each teacher.</p> : (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <form className="card h-fit space-y-4 p-5" onSubmit={(e) => { e.preventDefault(); if (ready) send.mutate(); }} data-tour="compose">
            <h2 className="font-display text-lg font-semibold">New announcement</h2>
            <LearnerPicker value={aud} onChange={setAud} />
            <Field label="Subject" htmlFor="an-t"><Input id="an-t" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} placeholder="e.g. No class on Friday" /></Field>
            <Field label="Message" htmlFor="an-b"><Textarea id="an-b" value={bodyText} onChange={(e) => setBody(e.target.value)} rows={6} maxLength={4000} /></Field>
            <label className="flex items-start gap-2 text-[15px]"><input type="checkbox" checked={toParents} onChange={(e) => setToParents(e.target.checked)} className="mt-1 h-4 w-4 accent-teal" /><span>Also email parents and guardians<span className="block text-sm text-muted-fg">Only those added on a learner’s page or in their settings. Up to 120 parent emails a day.</span></span></label>
            <button className="btn-primary w-full" disabled={!ready || send.isPending} aria-busy={send.isPending || undefined}><MaterialIcon name="send" /> Send</button>
          </form>
          <section aria-labelledby="sent">
            <h2 id="sent" className="mb-3 font-display text-lg font-semibold">Sent</h2>
            {list.isLoading ? <PageLoader /> : !list.data?.announcements.length ? <Empty icon={<MaterialIcon name="campaign" className="text-[40px]" />} title="Nothing sent yet">Your announcements and who has read them appear here.</Empty> : (
              <ul className="space-y-3">
                {list.data.announcements.map((a) => (
                  <li key={a.id} className="card p-4">
                    <div className="flex flex-wrap items-baseline justify-between gap-2"><h3 className="font-semibold">{a.title}</h3><span className="text-sm text-muted-fg">{shortDate(a.createdAt)}</span></div>
                    <p className="mt-1 line-clamp-3 whitespace-pre-line text-[15px] text-fg/80">{a.body}</p>
                    <p className="mt-2 text-sm text-muted-fg">{a.classroomName ?? 'Chosen learners'} · read by {a.read} of {a.learners}{a.toParents ? ` · emailed to ${a.parentEmails} ${a.parentEmails === 1 ? 'parent' : 'parents'}` : ''}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
