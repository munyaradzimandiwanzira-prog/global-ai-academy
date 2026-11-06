import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { ListedTeacher, MyAssignment, MyTeacher } from '@shared/teaching';
import { api, errorMessage } from '@/lib/api';
import { Dialog, Field, Input } from '@/components/ui';
import { ClipboardCheck, GraduationCap, Plus, X } from '@/components/icons';
import { formatDateTime } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { InvitePreviewLine, TeacherSearch } from './TeacherPicker';

const KIND_LABEL: Record<MyAssignment['kind'], string> = { lesson: 'Lesson', kids: 'Kids Zone', code: 'Code', task: 'Task' };

function dueText(a: MyAssignment) {
  if (!a.dueAt) return null;
  const late = a.status === 'open' && Date.parse(a.dueAt) < Date.now();
  return <span className={cn(late && 'font-semibold text-red-700 dark:text-red-300')}>{late ? 'Late · was due ' : 'Due '}{formatDateTime(a.dueAt)}</span>;
}

/** Work teachers have set this learner. Open work first, so the next thing to do is on top. */
export function AssignedToMe() {
  const { data } = useQuery({ queryKey: ['my-assignments'], queryFn: () => api.get<{ assignments: MyAssignment[] }>('/api/me/assignments') });
  const items = data?.assignments ?? [];
  if (!items.length) return null;
  const open = items.filter((a) => a.status === 'open').sort((a, b) => (a.dueAt ?? '9').localeCompare(b.dueAt ?? '9'));
  const rest = items.filter((a) => a.status !== 'open').slice(0, 4);
  return (
    <section className="card p-5" aria-labelledby="assigned">
      <div className="flex items-center justify-between">
        <h2 id="assigned" className="flex items-center gap-2 font-display text-lg font-semibold"><ClipboardCheck className="h-5 w-5 text-teal" /> Assigned to me</h2>
        {open.length > 0 && <span className="chip bg-gold-100 text-gold-600">{open.length} to do</span>}
      </div>
      <ul className="mt-3 divide-y divide-border">
        {[...open, ...rest].map((a) => (
          <li key={a.id} className="flex items-center gap-3 py-3">
            <div className="min-w-0 flex-1">
              <p className={cn('text-sm font-semibold', a.status !== 'open' && 'text-muted-fg')}>{a.title}</p>
              <p className="text-xs text-muted-fg">{KIND_LABEL[a.kind]} · {a.teacherName} · {a.classroomName}{a.dueAt ? ' · ' : ''}{dueText(a)}</p>
            </div>
            {a.status === 'open'
              ? <Link to={a.href} className="btn-primary btn-sm shrink-0">Start</Link>
              : <span className="chip shrink-0 bg-teal-100 text-teal-600 dark:bg-teal/20">{a.status === 'graded' ? 'Marked' : a.status === 'submitted' ? 'Handed in' : 'Done'}</span>}
          </li>
        ))}
      </ul>
    </section>
  );
}

/** The learner's teachers, with a way to add one by code or by name. */
export function MyTeachers() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const { data } = useQuery({ queryKey: ['my-teachers'], queryFn: () => api.get<{ teachers: MyTeacher[] }>('/api/me/teachers') });
  const leave = useMutation({
    mutationFn: (id: string) => api.del(`/api/me/teachers/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['my-teachers'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }); toast.success('Teacher removed'); },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const teachers = data?.teachers ?? [];
  return (
    <section className="card p-5" aria-labelledby="my-teachers">
      <div className="flex items-center justify-between">
        <h2 id="my-teachers" className="flex items-center gap-2 font-display text-lg font-semibold"><GraduationCap className="h-5 w-5 text-teal" /> My teachers</h2>
        <button type="button" className="btn-ghost btn-sm" onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Add</button>
      </div>
      {teachers.length ? (
        <ul className="mt-3 space-y-1">
          {teachers.map((t) => (
            <li key={t.id} className="group flex items-center justify-between rounded-lg px-3 py-2 hover:bg-muted">
              <span><span className="block text-sm font-medium">{t.name}</span><span className="text-xs text-muted-fg">{[t.school, t.city].filter(Boolean).join(' · ') || 'Teacher'}</span></span>
              <button type="button" aria-label={`Leave ${t.name}`} className="rounded p-1 text-muted-fg opacity-60 hover:text-fg group-hover:opacity-100" onClick={() => { if (window.confirm(`Leave ${t.name}? You’ll also leave their classes.`)) leave.mutate(t.id); }}><X className="h-4 w-4" /></button>
            </li>
          ))}
        </ul>
      ) : <p className="mt-3 text-sm text-muted-fg">Learning with a teacher? Add them with their invite code and they can set you work and help you. It’s free.</p>}
      <Dialog open={open} onOpenChange={setOpen} title="Add a teacher">
        <AddTeacher exclude={teachers.map((t) => t.id)} onDone={() => { setOpen(false); qc.invalidateQueries({ queryKey: ['my-teachers'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }); qc.invalidateQueries({ queryKey: ['my-assignments'] }); }} />
      </Dialog>
    </section>
  );
}

function AddTeacher({ exclude, onDone }: { exclude: string[]; onDone: () => void }) {
  const [code, setCode] = useState('');
  const [picked, setPicked] = useState<ListedTeacher[]>([]);
  const add = useMutation({
    mutationFn: async () => {
      if (code.trim()) await api.post('/api/me/teachers', { code: code.trim() });
      for (const t of picked) await api.post('/api/me/teachers', { teacherId: t.id });
    },
    onSuccess: () => { toast.success('Teacher added'); onDone(); },
    onError: (e) => toast.error(errorMessage(e)),
  });
  return (
    <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); add.mutate(); }}>
      <Field label="Invite code" htmlFor="at-code" hint="Your teacher gives you this.">
        <Input id="at-code" autoCapitalize="characters" autoComplete="off" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} />
      </Field>
      <InvitePreviewLine code={code} />
      <div><p className="label">Or find them</p><TeacherSearch value={picked} onChange={setPicked} exclude={exclude} /></div>
      <button className="btn-primary" disabled={add.isPending || (!code.trim() && !picked.length)}>{add.isPending ? 'Adding…' : 'Add teacher'}</button>
    </form>
  );
}
