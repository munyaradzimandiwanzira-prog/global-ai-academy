import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { Question, TestResults } from '@shared/tests';
import { MATHS_UNITS } from '@shared/maths';
import type { Classroom } from '@shared/api-types';
import { api, errorMessage } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Dialog, Field, Input, PageHeader, PageLoader, Select, Textarea } from '@/components/ui';
import { ArrowLeft, Check, MaterialIcon, Plus, Trash2 } from '@/components/icons';
import { Visual } from '@/features/maths/Visual';
import { TeachNav, shortDate } from './shared';

type Tab = 'questions' | 'results';
const blank = (type: Question['type'], n: number): Question =>
  type === 'mcq' ? { id: `q${n}`, type, q: '', options: ['', ''], answer: 0, marks: 1 }
    : type === 'numeric' ? { id: `q${n}`, type, q: '', answer: '', marks: 1 }
      : type === 'short' ? { id: `q${n}`, type, q: '', accept: [''], marks: 1 }
        : { id: `q${n}`, type, q: '', rubric: '', marks: 3 };
const TYPE_LABEL = { mcq: 'Multiple choice', numeric: 'Number', short: 'Short answer', long: 'Written answer' } as const;

function QuestionEditor({ x, i, onChange, onRemove, locked }: { x: Question; i: number; onChange: (q: Question) => void; onRemove: () => void; locked: boolean }) {
  return (
    <li className="card space-y-3 p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="font-semibold">{i + 1}. {TYPE_LABEL[x.type]}</p>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1 text-sm">Marks <input type="number" min={1} max={20} value={x.marks} disabled={locked} onChange={(e) => onChange({ ...x, marks: Math.max(1, Math.min(20, Number(e.target.value) || 1)) })} className="input h-9 w-16" /></label>
          {!locked && <button type="button" onClick={onRemove} aria-label={`Remove question ${i + 1}`} className="grid h-11 w-11 place-items-center rounded-full text-red-700 hover:bg-red-700/10 dark:text-red-300"><Trash2 /></button>}
        </div>
      </div>
      <Textarea aria-label={`Question ${i + 1}`} value={x.q} disabled={locked} onChange={(e) => onChange({ ...x, q: e.target.value })} rows={2} placeholder="Write the question" className="min-h-[64px]" />
      {x.visual && <div className="flex justify-center text-fg"><Visual v={x.visual} /></div>}
      {x.type === 'mcq' && (
        <fieldset className="space-y-2" disabled={locked}>
          <legend className="text-sm text-muted-fg">Options (tick the right one)</legend>
          {x.options.map((o, k) => (
            <div key={k} className="flex items-center gap-2">
              <input type="radio" name={`${x.id}-ans`} checked={x.answer === k} onChange={() => onChange({ ...x, answer: k })} aria-label={`Option ${k + 1} is right`} className="h-5 w-5 accent-teal" />
              <Input value={o} onChange={(e) => onChange({ ...x, options: x.options.map((y, j) => (j === k ? e.target.value : y)) })} placeholder={`Option ${k + 1}`} />
              {x.options.length > 2 && <button type="button" aria-label={`Remove option ${k + 1}`} onClick={() => onChange({ ...x, options: x.options.filter((_, j) => j !== k), answer: x.answer >= k && x.answer > 0 ? x.answer - 1 : x.answer })} className="grid h-11 w-11 shrink-0 place-items-center rounded-full hover:bg-muted"><MaterialIcon name="close" /></button>}
            </div>
          ))}
          {x.options.length < 6 && <button type="button" className="btn-ghost btn-sm" onClick={() => onChange({ ...x, options: [...x.options, ''] })}><Plus /> Add option</button>}
        </fieldset>
      )}
      {x.type === 'numeric' && <Field label="Answer (0,5 and 0.5 both count; fractions are compared by value)"><Input value={x.answer} disabled={locked} onChange={(e) => onChange({ ...x, answer: e.target.value })} placeholder="e.g. 3/4" /></Field>}
      {x.type === 'short' && <Field label="Accepted answers, one per line (case and punctuation ignored)"><Textarea value={x.accept.join('\n')} disabled={locked} onChange={(e) => onChange({ ...x, accept: e.target.value.split('\n').slice(0, 10) })} rows={2} /></Field>}
      {x.type === 'long' && <Field label="Marking rubric (what earns the marks)"><Textarea value={x.rubric} disabled={locked} onChange={(e) => onChange({ ...x, rubric: e.target.value })} rows={3} placeholder="e.g. 1 mark for the right claim, 1 for two examples, 1 for a reason that always works." /></Field>}
    </li>
  );
}

function Results({ r, onMark }: { r: TestResults; onMark: (attemptId: string) => void }) {
  const notIn = r.rows.filter((x) => x.status === 'not started' || x.status === 'started');
  const done = r.rows.filter((x) => x.pct != null);
  const avg = done.length ? Math.round(done.reduce((n, x) => n + (x.pct ?? 0), 0) / done.length) : null;
  return (
    <div className="space-y-6">
      <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div><dt className="text-sm text-muted-fg">Handed in</dt><dd className="font-display text-3xl font-bold tabular-nums">{r.rows.length - notIn.length} / {r.rows.length}</dd></div>
        <div><dt className="text-sm text-muted-fg">Class average</dt><dd className="font-display text-3xl font-bold tabular-nums">{avg == null ? '—' : `${avg}%`}</dd></div>
        <div><dt className="text-sm text-muted-fg">To confirm</dt><dd className="font-display text-3xl font-bold tabular-nums">{r.rows.filter((x) => x.needsMarking).length}</dd></div>
        <div><dt className="text-sm text-muted-fg">Late</dt><dd className="font-display text-3xl font-bold tabular-nums">{r.rows.filter((x) => x.late).length}</dd></div>
      </dl>
      {r.perQuestion.some((q) => q.pctCorrect != null) && (
        <section aria-labelledby="pq">
          <h2 id="pq" className="font-display text-lg font-semibold">Which questions were hardest</h2>
          <p className="text-sm text-muted-fg">Share of marks earned per question. Reteach the shortest bars first.</p>
          <ul className="mt-3 space-y-2">
            {[...r.perQuestion].sort((a, b) => (a.pctCorrect ?? 101) - (b.pctCorrect ?? 101)).map((q) => (
              <li key={q.id} className="grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)_3.5rem] items-center gap-3 text-[15px]">
                <span className="truncate" title={q.q}>{r.test.questionList.findIndex((x) => x.id === q.id) + 1}. {q.q}</span>
                <span className="h-3 rounded-full bg-muted" aria-hidden="true"><span className={cn('block h-3 rounded-full', (q.pctCorrect ?? 0) < 50 ? 'bg-red-700' : (q.pctCorrect ?? 0) < 75 ? 'bg-gold' : 'bg-teal')} style={{ width: `${q.pctCorrect ?? 0}%` }} /></span>
                <span className="text-right tabular-nums">{q.pctCorrect == null ? '—' : `${q.pctCorrect}%`}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
      <section aria-labelledby="who">
        <h2 id="who" className="font-display text-lg font-semibold">Learners</h2>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-[15px]">
            <thead className="text-sm text-muted-fg"><tr><th className="py-2 pr-3 font-medium">Learner</th><th className="pr-3 font-medium">Status</th><th className="pr-3 text-right font-medium">Mark</th><th className="pr-3 font-medium">Handed in</th><th /></tr></thead>
            <tbody>
              {r.rows.map((x) => (
                <tr key={x.studentId} className="border-t border-border">
                  <td className="py-2.5 pr-3"><Link to={`/teach/students/${x.studentId}`} className="hover:underline">{x.name}</Link></td>
                  <td className="pr-3">{x.needsMarking ? <span className="chip bg-gold-100 text-ink">Confirm written answer</span> : x.status === 'not started' ? <span className="chip bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200">Not started</span> : x.status === 'started' ? <span className="chip bg-muted">Started</span> : <span className="chip bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-100">Marked</span>}{x.late && <span className="chip ml-1 bg-muted">Late</span>}</td>
                  <td className="pr-3 text-right tabular-nums">{x.pct == null ? '—' : `${x.score} / ${x.max} (${x.pct}%)`}</td>
                  <td className="pr-3">{x.submittedAt ? shortDate(x.submittedAt) : '—'}</td>
                  <td className="text-right">{x.attemptId && x.status !== 'started' && <button type="button" className="btn-ghost btn-sm" onClick={() => onMark(x.attemptId!)}>{x.needsMarking ? 'Confirm' : 'Review'}</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function MarkDialog({ testId, attemptId, onClose }: { testId: string; attemptId: string; onClose: () => void }) {
  const qc = useQueryClient();
  const a = useQuery({ queryKey: ['attempt', attemptId], queryFn: () => api.get<{ attempt: { name: string; answers: Record<string, unknown>; marks: Record<string, { m: number; ai?: boolean; why?: string }>; comment: string | null }; questions: Question[] }>(`/api/tests/${testId}/attempts/${attemptId}`) });
  const [marks, setMarks] = useState<Record<string, number>>({});
  const [comment, setComment] = useState('');
  useEffect(() => { if (a.data) { setMarks(Object.fromEntries(Object.entries(a.data.attempt.marks).map(([k, v]) => [k, v.m]))); setComment(a.data.attempt.comment ?? ''); } }, [a.data]);
  const save = useMutation({ mutationFn: () => api.post(`/api/tests/${testId}/attempts/${attemptId}/mark`, { marks, comment: comment || undefined }), onSuccess: () => { toast.success('Marks saved and the learner told.'); void qc.invalidateQueries({ queryKey: ['teach-test', testId] }); onClose(); }, onError: (e) => toast.error(errorMessage(e)) });
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} title={a.data ? `${a.data.attempt.name}’s answers` : 'Answers'} wide>
      {!a.data ? <PageLoader /> : (
        <div className="space-y-4">
          <ol className="space-y-3">
            {a.data.questions.map((x, i) => {
              const given = a.data!.attempt.answers[x.id];
              const m = a.data!.attempt.marks[x.id];
              return (
                <li key={x.id} className="rounded-md border border-border p-3">
                  <p className="font-semibold">{i + 1}. {x.q}</p>
                  <p className="mt-1 whitespace-pre-wrap text-[15px]"><span className="text-muted-fg">Answer: </span>{x.type === 'mcq' ? (typeof given === 'number' || typeof given === 'string' ? x.options[Number(given)] ?? '—' : '—') : String(given ?? '—')}</p>
                  {m?.ai && <p className="mt-1 text-sm text-muted-fg">Suggested by Zuva from your rubric: {m.m}/{x.marks}. {m.why}</p>}
                  <label className="mt-2 flex items-center gap-2 text-sm">Mark <input type="number" min={0} max={x.marks} value={marks[x.id] ?? 0} onChange={(e) => setMarks((s) => ({ ...s, [x.id]: Math.max(0, Math.min(x.marks, Number(e.target.value) || 0)) }))} className="input h-9 w-16" /> / {x.marks}</label>
                </li>
              );
            })}
          </ol>
          <Field label="Comment for the learner (optional)"><Textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={2} maxLength={1000} /></Field>
          <button type="button" className="btn-primary w-full" onClick={() => save.mutate()} disabled={save.isPending} aria-busy={save.isPending || undefined}><Check /> Save marks</button>
        </div>
      )}
    </Dialog>
  );
}

export default function TeachTest() {
  const { id = '' } = useParams();
  const qc = useQueryClient();
  const r = useQuery({ queryKey: ['teach-test', id], queryFn: () => api.get<TestResults>(`/api/tests/${id}`) });
  const classes = useQuery({ queryKey: ['classes'], queryFn: () => api.get<{ teaching: Classroom[] }>('/api/classrooms') });
  const [tab, setTab] = useState<Tab>('questions');
  const [qs, setQs] = useState<Question[]>([]);
  const [meta, setMeta] = useState({ title: '', instructions: '', timeLimitMin: '' as string, showAnswers: true, kind: 'test' as 'homework' | 'test' | 'exam' });
  const [publishOpen, setPublishOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [pub, setPub] = useState({ classroomId: '', dueAt: '' });
  const [imp, setImp] = useState({ unitId: MATHS_UNITS[0]!.id, count: 8 });
  const [marking, setMarking] = useState<string | null>(null);
  useEffect(() => {
    if (!r.data) return;
    const t = r.data.test;
    setQs(t.questionList);
    setMeta({ title: t.title, instructions: t.instructions, timeLimitMin: t.timeLimitMin ? String(t.timeLimitMin) : '', showAnswers: t.showAnswers, kind: t.kind });
    if (t.publishedAt) setTab('results');
  }, [r.data]);
  const locked = !!r.data && r.data.rows.some((x) => x.status === 'submitted' || x.status === 'marked');
  const save = useMutation({
    mutationFn: () => api.put(`/api/tests/${id}`, { ...meta, timeLimitMin: meta.timeLimitMin ? Number(meta.timeLimitMin) : null, questions: qs.map((x, i) => ({ ...x, id: x.id || `q${i}` })) }),
    onSuccess: () => { toast.success('Saved'); void qc.invalidateQueries({ queryKey: ['teach-test', id] }); },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const publish = useMutation({
    mutationFn: async () => { await save.mutateAsync(); return api.post<{ assigned: number }>(`/api/tests/${id}/publish`, { classroomId: pub.classroomId || null, studentIds: [], dueAt: pub.dueAt ? new Date(pub.dueAt).toISOString() : null }); },
    onSuccess: (x) => { toast.success(`Set for ${x.assigned} learners. They’ve been told.`); setPublishOpen(false); void qc.invalidateQueries({ queryKey: ['teach-test', id] }); },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const importMaths = useMutation({
    mutationFn: () => api.post<{ questions: Question[] }>('/api/tests/import/maths', { unitId: imp.unitId, count: imp.count, seed: Math.floor(Math.random() * 99999) }),
    onSuccess: (x) => { const base = qs.length; setQs((s) => [...s, ...x.questions.map((q, k) => ({ ...q, id: `q${base + k}-${Date.now() % 10000}` }))]); setImportOpen(false); toast.success(`Added ${x.questions.length} questions. Check them, then save.`); },
    onError: (e) => toast.error(errorMessage(e)),
  });
  if (r.isLoading || !r.data) return <PageLoader />;
  const t = r.data.test;
  const total = qs.reduce((n, x) => n + x.marks, 0);
  return (
    <div className="container py-8">
      <Link to="/teach/tests" className="btn-ghost btn-sm -ml-3 mb-2"><ArrowLeft /> All tests</Link>
      <PageHeader title={t.title} description={`${t.publishedAt ? `Set${t.classroomName ? ` for ${t.classroomName}` : ''}${t.dueAt ? `, due ${shortDate(t.dueAt)}` : ''}` : 'Draft'} · ${qs.length} questions · ${total} marks`}
        actions={<>
          <button type="button" className="btn-outline" onClick={() => save.mutate()} disabled={save.isPending}>Save</button>
          <button type="button" className="btn-primary" onClick={() => setPublishOpen(true)} disabled={!qs.length}><MaterialIcon name="send" /> {t.publishedAt ? 'Set for more learners' : 'Set this'}</button>
        </>} />
      <TeachNav />
      <div role="tablist" aria-label="Test" className="mb-6 inline-flex rounded-full bg-muted p-1">
        {(['questions', 'results'] as const).map((x) => <button key={x} type="button" role="tab" aria-selected={tab === x} onClick={() => setTab(x)} className={cn('min-h-10 rounded-full px-4 text-[15px] font-semibold capitalize', tab === x ? 'bg-card text-fg' : 'text-muted-fg')}>{x}{x === 'results' && t.publishedAt ? ` (${t.submitted}/${t.assigned})` : ''}</button>)}
      </div>
      {tab === 'results' ? <Results r={r.data} onMark={setMarking} /> : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-4">
            {locked && <p className="rounded-md bg-gold-100 p-3 text-[15px] text-ink">Learners have handed this in, so the questions are locked to keep marks fair.</p>}
            <ol className="space-y-3">{qs.map((x, i) => <QuestionEditor key={x.id || i} x={x} i={i} locked={locked} onChange={(nq) => setQs((s) => s.map((y, j) => (j === i ? nq : y)))} onRemove={() => setQs((s) => s.filter((_, j) => j !== i))} />)}</ol>
            {!locked && (
              <div className="flex flex-wrap gap-2">
                {(['mcq', 'numeric', 'short', 'long'] as const).map((k) => <button key={k} type="button" className="btn-outline btn-sm" onClick={() => setQs((s) => [...s, blank(k, s.length + 1)])}><Plus /> {TYPE_LABEL[k]}</button>)}
                <button type="button" className="btn-outline-run btn-sm" onClick={() => setImportOpen(true)}><MaterialIcon name="calculate" /> Questions from Cambridge Maths</button>
              </div>
            )}
          </div>
          <aside className="card h-fit space-y-4 p-4">
            <Field label="Title"><Input value={meta.title} onChange={(e) => setMeta({ ...meta, title: e.target.value })} maxLength={120} /></Field>
            <Field label="Type"><Select value={meta.kind} onChange={(e) => setMeta({ ...meta, kind: e.target.value as typeof meta.kind })}><option value="homework">Homework</option><option value="test">Test</option><option value="exam">Exam</option></Select></Field>
            <Field label="Instructions"><Textarea value={meta.instructions} onChange={(e) => setMeta({ ...meta, instructions: e.target.value })} rows={3} maxLength={2000} /></Field>
            <Field label="Time limit in minutes (optional)"><Input type="number" min={1} max={300} value={meta.timeLimitMin} onChange={(e) => setMeta({ ...meta, timeLimitMin: e.target.value })} /></Field>
            <label className="flex items-start gap-2 text-[15px]"><input type="checkbox" checked={meta.showAnswers} onChange={(e) => setMeta({ ...meta, showAnswers: e.target.checked })} className="mt-1 h-4 w-4 accent-teal" /> Show learners the right answers after they hand in</label>
          </aside>
        </div>
      )}
      {marking && <MarkDialog testId={id} attemptId={marking} onClose={() => setMarking(null)} />}
      <Dialog open={publishOpen} onOpenChange={setPublishOpen} title="Set this for learners" description="Learners get a notification and an email with the link.">
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); publish.mutate(); }}>
          <Field label="Class" htmlFor="pc"><Select id="pc" value={pub.classroomId} onChange={(e) => setPub({ ...pub, classroomId: e.target.value })}><option value="">Choose a class</option>{(classes.data?.teaching ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></Field>
          <Field label="Due (optional)" htmlFor="pd"><Input id="pd" type="datetime-local" value={pub.dueAt} onChange={(e) => setPub({ ...pub, dueAt: e.target.value })} /></Field>
          <button className="btn-primary w-full" disabled={!pub.classroomId || publish.isPending} aria-busy={publish.isPending || undefined}><MaterialIcon name="send" /> Set it</button>
        </form>
      </Dialog>
      <Dialog open={importOpen} onOpenChange={setImportOpen} title="Questions from Cambridge Maths" description="Fresh questions from a unit's generators: every answer is correct, so nothing needs checking except whether they suit your class.">
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); importMaths.mutate(); }}>
          <Field label="Unit" htmlFor="iu"><Select id="iu" value={imp.unitId} onChange={(e) => setImp({ ...imp, unitId: e.target.value })}>{MATHS_UNITS.map((u) => <option key={u.id} value={u.id}>Stage {u.stage}: {u.title}</option>)}</Select></Field>
          <Field label="How many quick questions" htmlFor="ic"><Input id="ic" type="number" min={1} max={20} value={imp.count} onChange={(e) => setImp({ ...imp, count: Math.max(1, Math.min(20, Number(e.target.value) || 1)) })} /></Field>
          <button className="btn-primary w-full" disabled={importMaths.isPending} aria-busy={importMaths.isPending || undefined}><Plus /> Add questions</button>
        </form>
      </Dialog>
    </div>
  );
}
