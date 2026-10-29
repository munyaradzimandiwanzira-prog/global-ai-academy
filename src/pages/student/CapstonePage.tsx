import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ExternalLink, Github, Plus } from '@/components/icons';
import type { Capstone } from '@shared/api-types';
import { CAREERS } from '@/data/careers';
import { api, errorMessage } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { Button, ButtonLink, Dialog, Empty, Field, Input, PageLoader, Select, Textarea } from '@/components/ui';
import { cn } from '@/lib/utils';

const STATUS_LABEL: Record<Capstone['status'], string> = { planning: 'Planning', building: 'Building', review: 'In review', completed: 'Signed off' };
const STATUS_TONE: Record<Capstone['status'], string> = { planning: 'text-fg/70', building: 'text-gold-600', review: 'text-teal-600', completed: 'text-teal-600 font-semibold' };

type Form = { title: string; careerId: string; summary: string; stack: string; repoUrl: string; demoUrl: string; status: Capstone['status'] };
const empty: Form = { title: '', careerId: '', summary: '', stack: '', repoUrl: '', demoUrl: '', status: 'planning' };

/** The portfolio piece that closes a career path, reviewed by a mentor (Academy plan). */
export default function CapstonePage() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['capstones'], queryFn: () => api.get<{ capstones: Capstone[]; canSubmit: boolean }>('/api/capstones/mine') });
  const [editing, setEditing] = useState<Capstone | 'new' | null>(null);
  const [form, setForm] = useState<Form>(empty);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const save = useMutation({
    mutationFn: (f: Form) => {
      const payload = { ...f, careerId: f.careerId || null };
      return editing && editing !== 'new' ? api.put(`/api/capstones/${editing.id}`, payload) : api.post('/api/capstones', payload);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['capstones'] }); setEditing(null); toast.success('Capstone saved'); },
    onError: (e: unknown) => {
      const fields = (e as { fields?: Record<string, string> }).fields;
      if (fields) setErrors(fields);
      toast.error(errorMessage(e));
    },
  });

  const open = (c: Capstone | 'new') => {
    setErrors({});
    setForm(c === 'new' ? empty : { title: c.title, careerId: c.careerId ?? '', summary: c.summary, stack: c.stack, repoUrl: c.repoUrl, demoUrl: c.demoUrl, status: c.status });
    setEditing(c);
  };

  if (q.isLoading) return <PageLoader />;
  const { capstones, canSubmit } = q.data!;

  return (
    <div className="container py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-bold">Capstone projects</h1>
          <p className="mt-1 max-w-2xl text-fg/75">Build something real at the end of a career path, deploy it, and a mentor reviews it. A signed-off capstone earns 300 XP and a place on your profile.</p>
        </div>
        {canSubmit && <Button startIcon={<Plus />} onClick={() => open('new')}>New capstone</Button>}
      </div>

      {!canSubmit && (
        <div className="mt-8 rounded-3xl bg-ink p-7 text-white">
          <h2 className="font-display text-2xl font-bold">Mentor-reviewed capstones are part of Academy</h2>
          <p className="mt-2 max-w-2xl text-white/80">Academy learners plan, build and ship a capstone with feedback from their class teacher or a mentor.</p>
          <ButtonLink to="/pricing" color="accent" className="mt-5">See the Academy plan</ButtonLink>
        </div>
      )}

      {canSubmit && capstones.length === 0 && (
        <div className="mt-8"><Empty title="No capstone yet" action={<Button onClick={() => open('new')}>Plan your capstone</Button>}>Pick a career path, describe the project, then add your GitHub repository and live link as you build.</Empty></div>
      )}

      <ul className="mt-8 space-y-4">
        {capstones.map((c) => {
          const career = CAREERS.find((x) => x.id === c.careerId);
          return (
            <li key={c.id} className="rounded-3xl bg-card p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-display text-2xl font-bold">{c.title}</h2>
                  <p className="mt-1 text-[15px] text-fg/70">{career ? career.title : 'Independent project'} · updated {formatDate(c.updatedAt)}</p>
                </div>
                <span className={cn('text-[15px]', STATUS_TONE[c.status])}>{STATUS_LABEL[c.status]}{c.grade != null ? ` · ${c.grade}/100` : ''}</span>
              </div>
              {c.summary && <p className="mt-4 whitespace-pre-line text-[16px]">{c.summary}</p>}
              {c.stack && <p className="mt-2 text-[15px] text-fg/75">Stack: {c.stack}</p>}
              <div className="mt-4 flex flex-wrap gap-4 text-[15px]">
                {c.repoUrl && <a href={c.repoUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 font-medium text-teal-600 hover:underline"><Github className="h-4 w-4" /> Repository</a>}
                {c.demoUrl && <a href={c.demoUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 font-medium text-teal-600 hover:underline"><ExternalLink className="h-4 w-4" /> Live demo</a>}
              </div>
              {c.feedback && (
                <div className="mt-5 rounded-2xl bg-granite-100 p-4 dark:bg-night-700">
                  <p className="text-sm font-semibold">Feedback from {c.mentorName ?? 'your mentor'}</p>
                  <p className="mt-1 whitespace-pre-line text-[15px]">{c.feedback}</p>
                </div>
              )}
              {c.status !== 'completed' && <Button variant="outlined" size="sm" className="mt-5" onClick={() => open(c)}>Edit</Button>}
            </li>
          );
        })}
      </ul>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)} title={editing === 'new' ? 'Plan a capstone' : 'Update your capstone'} wide>
        <form onSubmit={(e) => { e.preventDefault(); save.mutate(form); }} className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2"><Field label="Project title" error={errors.title} htmlFor="ct"><Input id="ct" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. RAG assistant for ZIMRA tax questions" /></Field></div>
          <Field label="Career path" htmlFor="cc">
            <Select id="cc" value={form.careerId} onChange={(e) => setForm({ ...form, careerId: e.target.value })}>
              <option value="">Independent project</option>
              {CAREERS.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
            </Select>
          </Field>
          <Field label="Stage" htmlFor="cs" hint="Choose “In review” when it is ready for your mentor.">
            <Select id="cs" value={form.status === 'completed' ? 'review' : form.status} onChange={(e) => setForm({ ...form, status: e.target.value as Capstone['status'] })}>
              <option value="planning">Planning</option><option value="building">Building</option><option value="review">In review</option>
            </Select>
          </Field>
          <div className="sm:col-span-2"><Field label="What it does and who it is for" error={errors.summary} htmlFor="cm"><Textarea id="cm" rows={4} value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} /></Field></div>
          <div className="sm:col-span-2"><Field label="Stack" htmlFor="ck"><Input id="ck" value={form.stack} onChange={(e) => setForm({ ...form, stack: e.target.value })} placeholder="Python, FastAPI, Cloudflare Workers, OpenAI" /></Field></div>
          <Field label="GitHub repository" error={errors.repoUrl} htmlFor="cr"><Input id="cr" type="url" value={form.repoUrl} onChange={(e) => setForm({ ...form, repoUrl: e.target.value })} placeholder="https://github.com/…" /></Field>
          <Field label="Live link" error={errors.demoUrl} htmlFor="cd"><Input id="cd" type="url" value={form.demoUrl} onChange={(e) => setForm({ ...form, demoUrl: e.target.value })} placeholder="https://…" /></Field>
          <div className="sm:col-span-2"><Button type="submit" size="lg" loading={save.isPending}>Save capstone</Button></div>
        </form>
      </Dialog>
    </div>
  );
}
