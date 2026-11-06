import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ASSIGNMENT_KINDS, type AssignmentKind } from '@shared/teaching';
import { KID_LEVELS, STAGES, levelsAt, type StageId } from '@shared/kids-curriculum';
import { kidGame } from '@shared/kids-games';
import { catalog, getCatalogTrack } from '@/lib/catalog';
import { api, ApiError, errorMessage } from '@/lib/api';
import { Field, Input, Select, Textarea } from '@/components/ui';
import { cn } from '@/lib/utils';

interface Member { id: string; name: string }

/**
 * Assign work to a class, or to chosen learners in it. Lesson and Kids Zone work ticks off
 * automatically; code and written tasks are submitted. Learners are told in the app and by email.
 */
export function AssignForm({ classes, fixedStudent, onDone }: { classes: { id: string; name: string }[]; fixedStudent?: Member; onDone: () => void }) {
  const [classId, setClassId] = useState(classes[0]?.id ?? '');
  const [kind, setKind] = useState<AssignmentKind>('lesson');
  const [trackId, setTrackId] = useState('python');
  const [lesson, setLesson] = useState('');
  const [stage, setStage] = useState<StageId>(3);
  const [level, setLevel] = useState('');
  const [title, setTitle] = useState('');
  const [instructions, setInstructions] = useState('');
  const [due, setDue] = useState('');
  const [who, setWho] = useState<string[]>(fixedStudent ? [fixedStudent.id] : []);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const members = useQuery({
    queryKey: ['members', classId],
    enabled: !!classId && !fixedStudent,
    queryFn: () => api.get<{ members: Member[] }>(`/api/classrooms/${classId}/members`),
  });
  const track = getCatalogTrack(trackId);
  const lessons = track?.lessons ?? [];
  const levels = useMemo(() => levelsAt(stage), [stage]);
  const resource = kind === 'lesson' ? (lesson ? `${trackId}/${lesson}` : '') : kind === 'kids' ? level : '';
  const suggested = kind === 'lesson'
    ? lessons.find((l) => l.slug === lesson)?.title ?? ''
    : kind === 'kids' ? (() => { const l = KID_LEVELS.find((x) => x.key === level); return l ? `${kidGame(l.game)?.title}: ${l.name}` : ''; })() : '';

  const save = useMutation({
    mutationFn: () => api.post<{ id: string; notified: number }>(`/api/classrooms/${classId}/assignments`, {
      title: (title || suggested).trim(),
      instructions: (instructions || (kind === 'lesson' ? 'Work through this lesson, run the examples and try the exercises.' : kind === 'kids' ? 'Play this level and try to earn three stars.' : '')).trim(),
      kind, resource, studentIds: who, dueAt: due ? new Date(due).toISOString() : null, language: 'python', maxScore: 100,
    }),
    onSuccess: (r) => { toast.success(`Assigned. ${r.notified} learner${r.notified === 1 ? '' : 's'} notified.`); onDone(); },
    onError: (e) => { if (e instanceof ApiError && e.fields) setErrors(e.fields); toast.error(errorMessage(e)); },
  });

  if (!classes.length) return <p className="text-sm text-muted-fg">Work is set through a class. Add this learner to one of your classes first.</p>;

  return (
    <form onSubmit={(e) => { e.preventDefault(); setErrors({}); save.mutate(); }} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Class" htmlFor="af-class">
          <Select id="af-class" value={classId} onChange={(e) => { setClassId(e.target.value); if (!fixedStudent) setWho([]); }}>
            {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </Field>
        <Field label="Type of work" htmlFor="af-kind" hint={ASSIGNMENT_KINDS.find((k) => k.id === kind)?.hint}>
          <Select id="af-kind" value={kind} onChange={(e) => setKind(e.target.value as AssignmentKind)}>
            {ASSIGNMENT_KINDS.map((k) => <option key={k.id} value={k.id}>{k.label}</option>)}
          </Select>
        </Field>
      </div>

      {kind === 'lesson' && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Course" htmlFor="af-track">
            <Select id="af-track" value={trackId} onChange={(e) => { setTrackId(e.target.value); setLesson(''); }}>
              {catalog.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
            </Select>
          </Field>
          <Field label="Lesson" htmlFor="af-lesson" error={errors.resource}>
            <Select id="af-lesson" required value={lesson} onChange={(e) => setLesson(e.target.value)}>
              <option value="">Choose a lesson…</option>
              {lessons.map((l, i) => <option key={l.slug} value={l.slug}>{i + 1}. {l.title}</option>)}
            </Select>
          </Field>
        </div>
      )}
      {kind === 'kids' && (
        <div className="grid gap-4 sm:grid-cols-[180px_1fr]">
          <Field label="Stage" htmlFor="af-stage">
            <Select id="af-stage" value={stage} onChange={(e) => { setStage(Number(e.target.value) as StageId); setLevel(''); }}>
              {STAGES.map((s) => <option key={s.id} value={s.id}>{s.name} (ages {s.ages})</option>)}
            </Select>
          </Field>
          <Field label="Level" htmlFor="af-level" error={errors.resource}>
            <Select id="af-level" required value={level} onChange={(e) => setLevel(e.target.value)}>
              <option value="">Choose a level…</option>
              {levels.map((l) => <option key={l.key} value={l.key}>{kidGame(l.game)?.title}: {l.name}</option>)}
            </Select>
          </Field>
        </div>
      )}

      <Field label="Title" htmlFor="af-title" error={errors.title}>
        <Input id="af-title" value={title} placeholder={suggested || 'e.g. Loops practice'} onChange={(e) => setTitle(e.target.value)} maxLength={150} required={!suggested} minLength={3} />
      </Field>
      <Field label="Instructions" htmlFor="af-ins" error={errors.instructions} hint={kind === 'lesson' || kind === 'kids' ? 'Optional. A sensible default is used if you leave this empty.' : undefined}>
        <Textarea id="af-ins" rows={3} value={instructions} onChange={(e) => setInstructions(e.target.value)} maxLength={10000} required={kind === 'code' || kind === 'task'} minLength={3} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Due (optional)" htmlFor="af-due"><Input id="af-due" type="datetime-local" value={due} onChange={(e) => setDue(e.target.value)} /></Field>
        {fixedStudent ? (
          <Field label="For" htmlFor="af-who"><Input id="af-who" value={fixedStudent.name} disabled /></Field>
        ) : (
          <fieldset>
            <legend className="mb-1.5 text-sm font-medium">For</legend>
            <div className="max-h-36 space-y-1 overflow-y-auto rounded-lg border border-border p-2 text-sm">
              <label className="flex items-center gap-2 font-medium"><input type="checkbox" className="accent-teal" checked={!who.length} onChange={() => setWho([])} /> The whole class</label>
              {(members.data?.members ?? []).map((m) => (
                <label key={m.id} className={cn('flex items-center gap-2', !who.length && 'text-muted-fg')}>
                  <input type="checkbox" className="accent-teal" checked={who.includes(m.id)} onChange={(e) => setWho((w) => (e.target.checked ? [...w, m.id] : w.filter((x) => x !== m.id)))} /> {m.name}
                </label>
              ))}
            </div>
          </fieldset>
        )}
      </div>
      <button className="btn-primary" disabled={save.isPending || ((kind === 'lesson' || kind === 'kids') && !resource)}>{save.isPending ? 'Assigning…' : 'Assign and notify'}</button>
    </form>
  );
}
