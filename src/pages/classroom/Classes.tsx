import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Users, KeyRound, GraduationCap, Lock } from '@/components/icons';
import type { Classroom } from '@shared/api-types';
import type { Level } from '@shared/content';
import { api, ApiError, errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { catalog } from '@/lib/catalog';
import { Dialog, Empty, Field, Input, LevelBadge, PageHeader, PageLoader, Select, Textarea } from '@/components/ui';

export function ClassroomForm({ initial, onSubmit, busy, submitLabel }: { initial?: Partial<Classroom>; onSubmit: (v: { name: string; description: string; level: Level; trackIds: string[] }) => void; busy: boolean; submitLabel: string }) {
  const [form, setForm] = useState({ name: initial?.name ?? '', description: initial?.description ?? '', level: (initial?.level ?? 'beginner') as Level, trackIds: initial?.trackIds ?? [] as string[] });
  const toggle = (id: string) => setForm((f) => ({ ...f, trackIds: f.trackIds.includes(id) ? f.trackIds.filter((t) => t !== id) : [...f.trackIds, id] }));
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(form); }} className="space-y-4">
      <Field label="Class name" htmlFor="cn"><Input id="cn" required minLength={3} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Form 4 Computer Science — Prince Edward" /></Field>
      <Field label="Description" htmlFor="cd"><Textarea id="cd" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="What this class covers, when you meet, expectations…" /></Field>
      <Field label="Level" htmlFor="cl">
        <Select id="cl" value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value as Level })}>
          <option value="kids">Kids & teens</option><option value="beginner">Entry level</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option>
        </Select>
      </Field>
      <fieldset>
        <legend className="label">Tracks to follow ({form.trackIds.length})</legend>
        <div className="flex max-h-48 flex-wrap gap-1.5 overflow-y-auto rounded-lg border border-border p-2">
          {catalog.map((t) => (
            <button type="button" key={t.id} onClick={() => toggle(t.id)} aria-pressed={form.trackIds.includes(t.id)} className={form.trackIds.includes(t.id) ? 'chip bg-teal text-white' : 'chip bg-muted hover:bg-border'}>{t.title}</button>
          ))}
        </div>
      </fieldset>
      <button disabled={busy} className="btn-primary w-full">{busy ? 'Saving…' : submitLabel}</button>
    </form>
  );
}

function ClassCard({ c, teaching }: { c: Classroom; teaching: boolean }) {
  return (
    <Link to={`/classes/${c.id}`} className="group card flex flex-col overflow-hidden transition-colors hover:border-teal/50">
      <div className="bg-ink px-5 py-4 text-white">
        <h3 className="font-display text-lg font-semibold group-hover:text-gold">{c.name}</h3>
        <p className="text-sm text-white/65">{c.teacherName}</p>
      </div>
      <div className="chevron-band h-2 opacity-60" />
      <div className="flex flex-1 flex-col p-5">
        <p className="line-clamp-2 flex-1 text-sm text-muted-fg">{c.description || 'No description yet.'}</p>
        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-muted-fg">
          <LevelBadge level={c.level} />
          <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {c.memberCount}</span>
          {teaching && c.joinCode && <span className="chip ml-auto bg-gold-100 font-mono text-gold-600">{c.joinCode}</span>}
          {c.archived && <span className="chip bg-muted">Archived</span>}
        </div>
      </div>
    </Link>
  );
}

export default function Classes() {
  const { user, can } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [joinError, setJoinError] = useState('');
  const [creating, setCreating] = useState(false);
  const { data, isLoading } = useQuery({ queryKey: ['classes'], queryFn: () => api.get<{ teaching: Classroom[]; learning: Classroom[] }>('/api/classrooms') });

  const join = useMutation({
    mutationFn: () => api.post<{ id: string }>('/api/classrooms/join', { code }),
    onSuccess: (r) => { qc.invalidateQueries({ queryKey: ['classes'] }); toast.success('You joined the class!'); navigate(`/classes/${r.id}`); },
    onError: (e) => setJoinError(e instanceof ApiError && e.fields?.code ? e.fields.code : errorMessage(e)),
  });
  const create = useMutation({
    mutationFn: (v: object) => api.post<{ id: string }>('/api/classrooms', v),
    onSuccess: (r) => { qc.invalidateQueries({ queryKey: ['classes'] }); setCreating(false); navigate(`/classes/${r.id}`); },
    onError: (e) => toast.error(errorMessage(e)),
  });

  if (isLoading) return <PageLoader />;
  const canJoin = can('classroom.join') || user?.role !== 'student';

  return (
    <div className="container py-10">
      <PageHeader title="Classes" description="Teacher-led classrooms with assignments, grades and a class discussion."
        actions={can('classroom.create') && <button onClick={() => setCreating(true)} className="btn-primary"><Plus className="h-4 w-4" /> New class</button>} />

      {user?.role === 'student' && (
        <section className="card mb-10 p-6">
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold"><KeyRound className="h-5 w-5 text-gold-600" /> Join a class</h2>
          {canJoin ? (
            <form onSubmit={(e) => { e.preventDefault(); setJoinError(''); join.mutate(); }} className="mt-3 flex max-w-md gap-2">
              <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} maxLength={6} placeholder="6-character code" className="font-mono uppercase tracking-widest" aria-label="Class code" />
              <button disabled={join.isPending || code.length !== 6} className="btn-run">Join</button>
            </form>
          ) : (
            <div className="mt-3 rounded-xl bg-muted p-4 text-sm">
              <p className="flex items-center gap-2 font-semibold"><Lock className="h-4 w-4" /> Classrooms are part of the Academy plan</p>
              <p className="mt-1 text-muted-fg">If your school sponsors your seat, ask your teacher or an administrator to activate it for you.</p>
              <Link to="/pricing" className="btn-gold btn-sm mt-3">See Academy</Link>
            </div>
          )}
          {joinError && <p className="mt-2 text-sm text-red-600">{joinError}</p>}
        </section>
      )}

      {!!data?.teaching.length && (
        <section className="mb-10">
          <h2 className="mb-4 text-2xl font-bold">Classes you teach</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{data.teaching.map((c) => <ClassCard key={c.id} c={c} teaching />)}</div>
        </section>
      )}
      <section>
        <h2 className="mb-4 text-2xl font-bold">{user?.role === 'student' ? 'My classes' : 'Classes you’ve joined'}</h2>
        {data?.learning.length ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{data.learning.map((c) => <ClassCard key={c.id} c={c} teaching={false} />)}</div>
        ) : (
          <Empty icon={<GraduationCap className="h-10 w-10" />} title="No classes yet">{user?.role === 'student' ? 'Enter the code your teacher gave you above.' : 'Create a class and share its join code with learners.'}</Empty>
        )}
      </section>

      <Dialog open={creating} onOpenChange={setCreating} title="Create a class" description="Learners join with a 6-character code you can share on WhatsApp or the board.">
        <ClassroomForm onSubmit={(v) => create.mutate(v)} busy={create.isPending} submitLabel="Create class" />
      </Dialog>
    </div>
  );
}
