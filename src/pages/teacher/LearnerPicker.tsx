/**
 * Choose who gets something: a whole class, or chosen learners (searchable, filterable by class).
 * Used when setting tests, sending announcements and sharing courses.
 */
import { useId, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { Classroom } from '@shared/api-types';
import type { RosterStudent } from '@shared/teaching';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Input, Select } from '@/components/ui';

export interface Audience { mode: 'class' | 'learners'; classroomId: string; studentIds: string[] }
export const emptyAudience: Audience = { mode: 'class', classroomId: '', studentIds: [] };
export const audienceReady = (a: Audience) => (a.mode === 'class' ? !!a.classroomId : a.studentIds.length > 0);
/** The body the API expects: a class id, or a list of the teacher's own learners. */
export const audienceBody = (a: Audience) => (a.mode === 'class' ? { classroomId: a.classroomId, studentIds: [] as string[] } : { classroomId: null, studentIds: a.studentIds });

export function LearnerPicker({ value, onChange, allowEveryone = false, learnersOnly = false }: { value: Audience; onChange: (a: Audience) => void; allowEveryone?: boolean; learnersOnly?: boolean }) {
  const uid = useId();
  const classes = useQuery({ queryKey: ['classes'], queryFn: () => api.get<{ teaching: Classroom[] }>('/api/classrooms') });
  const roster = useQuery({ queryKey: ['teach-students'], queryFn: () => api.get<{ students: RosterStudent[] }>('/api/teach/students'), enabled: value.mode === 'learners' || allowEveryone || learnersOnly });
  const [q, setQ] = useState('');
  const [cls, setCls] = useState('');
  const all = roster.data?.students ?? [];
  const shown = useMemo(() => all.filter((s) => (!cls || s.classes.some((c) => c.id === cls)) && (!q || s.name.toLowerCase().includes(q.toLowerCase()))), [all, cls, q]);
  const picked = new Set(value.studentIds);
  const toggle = (id: string) => onChange({ ...value, studentIds: picked.has(id) ? value.studentIds.filter((x) => x !== id) : [...value.studentIds, id] });
  const allShownPicked = shown.length > 0 && shown.every((s) => picked.has(s.id));
  const teaching = classes.data?.teaching ?? [];
  return (
    <div className="space-y-3">
      {!learnersOnly && <div role="radiogroup" aria-label="Who gets it" className="inline-flex rounded-full bg-muted p-1">
        {([['class', 'A class'], ['learners', 'Chosen learners']] as const).map(([m, label]) => (
          <button key={m} type="button" role="radio" aria-checked={value.mode === m} onClick={() => onChange({ ...value, mode: m })}
            className={cn('min-h-10 rounded-full px-4 text-[15px] font-semibold', value.mode === m ? 'bg-card text-fg shadow-sm' : 'text-muted-fg hover:text-fg')}>{label}</button>
        ))}
      </div>}
      {value.mode === 'class' && !learnersOnly ? (
        <div>
          <label htmlFor={`${uid}-c`} className="mb-1.5 block text-sm font-semibold">Class</label>
          <Select id={`${uid}-c`} value={value.classroomId} onChange={(e) => onChange({ ...value, classroomId: e.target.value })}>
            <option value="">Choose a class</option>
            {teaching.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
          {!teaching.length && classes.isSuccess && <p className="mt-1.5 text-sm text-muted-fg">No classes yet. Switch to “Chosen learners”, or make a class from Classes.</p>}
        </div>
      ) : (
        <fieldset className="space-y-2">
          <legend className="sr-only">Choose learners</legend>
          <div className="flex flex-wrap gap-2">
            <Input aria-label="Search learners" placeholder="Search by name" value={q} onChange={(e) => setQ(e.target.value)} className="min-w-0 flex-1" />
            {teaching.length > 0 && <Select aria-label="Only learners in a class" value={cls} onChange={(e) => setCls(e.target.value)} className="w-auto"><option value="">All classes</option>{teaching.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select>}
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-fg" aria-live="polite">{value.studentIds.length} chosen</span>
            {shown.length > 0 && <button type="button" className="font-semibold text-teal-600 hover:underline dark:text-teal-400"
              onClick={() => onChange({ ...value, studentIds: allShownPicked ? value.studentIds.filter((id) => !shown.some((s) => s.id === id)) : [...new Set([...value.studentIds, ...shown.map((s) => s.id)])] })}>{allShownPicked ? 'Clear these' : `Choose all ${shown.length}`}</button>}
          </div>
          <ul className="max-h-64 divide-y divide-border overflow-y-auto rounded-md border border-border">
            {roster.isLoading ? <li className="p-3 text-sm text-muted-fg">Loading learners…</li> : !shown.length ? <li className="p-3 text-sm text-muted-fg">{all.length ? 'No learners match.' : 'No learners yet. Invite some from Invites.'}</li> : shown.map((s) => (
              <li key={s.id}>
                <label className="flex min-h-11 cursor-pointer items-center gap-3 px-3 py-2 hover:bg-muted">
                  <input type="checkbox" checked={picked.has(s.id)} onChange={() => toggle(s.id)} className="h-5 w-5 accent-teal" />
                  <span className="min-w-0 flex-1"><span className="block truncate font-medium">{s.name}</span>{s.classes.length > 0 && <span className="block truncate text-xs text-muted-fg">{s.classes.map((c) => c.name).join(', ')}</span>}</span>
                </label>
              </li>
            ))}
          </ul>
        </fieldset>
      )}
    </div>
  );
}
