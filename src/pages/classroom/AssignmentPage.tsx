import { lazy, Suspense, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Play, Send, Sparkles, CheckCircle2, AlertCircle, Trash2, CalendarClock } from 'lucide-react';
import type { AiFeedback, Assignment, Submission } from '@shared/api-types';
import type { RunLanguage } from '@shared/content';
import { api, errorMessage } from '@/lib/api';
import { isBrowserRunnable } from '@/features/runners';
import { useRunner } from '@/features/editor/useRunner';
import { OutputPanel } from '@/features/editor/OutputPanel';
import { EditorFallback } from '@/features/editor/Playground';
import { Markdown } from '@/components/Markdown';
import { Avatar, Empty, Field, Input, PageLoader, Textarea } from '@/components/ui';
import { celebrate } from '@/lib/celebrate';
import { cn, formatDateTime } from '@/lib/utils';

const CodeEditor = lazy(() => import('@/features/editor/CodeEditor'));

function FeedbackCard({ fb }: { fb: AiFeedback }) {
  return (
    <div className="rounded-xl border border-gold/50 bg-gold-100/40 p-4 text-sm dark:bg-night-800">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-2 font-semibold"><Sparkles className="h-4 w-4 text-gold-600" /> AI pre-mark</p>
        <span className={cn('chip', fb.pass ? 'bg-teal-100 text-teal-600' : 'bg-stone-100 text-stone')}>{fb.score}/100</span>
      </div>
      <p className="mt-2">{fb.summary}</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div><p className="font-semibold text-teal-600">Strengths</p><ul className="mt-1 list-disc space-y-0.5 pl-4">{fb.strengths.map((s) => <li key={s}>{s}</li>)}</ul></div>
        <div><p className="font-semibold text-stone">To improve</p><ul className="mt-1 list-disc space-y-0.5 pl-4">{fb.improvements.map((s) => <li key={s}>{s}</li>)}</ul></div>
      </div>
      <p className="mt-3 text-xs text-muted-fg">Your teacher gives the final grade.</p>
    </div>
  );
}

function StudentView({ a }: { a: Assignment }) {
  const qc = useQueryClient();
  const sub = a.mySubmission;
  const lang = (a.language || 'text') as RunLanguage;
  const [code, setCode] = useState(sub?.code || a.starterCode);
  const [text, setText] = useState(sub?.text ?? '');
  const runner = useRunner(lang);
  const graded = sub?.status === 'graded';
  const submit = useMutation({
    mutationFn: () => api.post<{ aiFeedback: AiFeedback | null; xpAwarded: number }>(`/api/classrooms/assignments/${a.id}/submit`, { code: lang === 'text' ? '' : code, text }),
    onSuccess: (r) => { qc.invalidateQueries({ queryKey: ['assignment', a.id] }); celebrate('small'); toast.success(r.xpAwarded ? `Submitted · +${r.xpAwarded} XP` : 'Submitted'); },
    onError: (e) => toast.error(errorMessage(e)),
  });

  return (
    <div className="space-y-5">
      {graded && sub && (
        <div className="rounded-xl border border-teal/40 bg-teal-100 p-4 text-teal-600">
          <p className="flex items-center gap-2 font-semibold"><CheckCircle2 className="h-5 w-5" /> Graded: {sub.score} / {a.maxScore}</p>
          {sub.teacherFeedback && <p className="mt-2 text-sm text-fg">{sub.teacherFeedback}</p>}
        </div>
      )}
      {lang !== 'text' && (
        <div className="overflow-hidden rounded-xl border border-night-700">
          <div className="flex items-center gap-2 border-b border-night-700 bg-night-800 px-3 py-2">
            {isBrowserRunnable(lang) && <button onClick={() => void runner.run(code)} disabled={runner.running} className="btn-run btn-sm"><Play className="h-3.5 w-3.5 fill-current" /> Run</button>}
            <span className="font-mono text-xs text-sand/60">{lang}</span>
          </div>
          <div className="grid md:grid-cols-2">
            <div className="min-w-0 md:border-r md:border-night-700">
              <Suspense fallback={<EditorFallback height="360px" />}>
                <CodeEditor value={code} onChange={setCode} language={lang} readOnly={graded} height="360px" onRun={() => void runner.run(code)} />
              </Suspense>
            </div>
            <div className="h-[360px] min-w-0"><OutputPanel result={runner.result} live={runner.live} status={runner.status} running={runner.running} className="h-full" /></div>
          </div>
        </div>
      )}
      <Field label={lang === 'text' ? 'Your answer' : 'Notes for your teacher (optional)'} htmlFor="ans">
        <Textarea id="ans" rows={lang === 'text' ? 10 : 3} value={text} onChange={(e) => setText(e.target.value)} disabled={graded} />
      </Field>
      {!graded && <button onClick={() => submit.mutate()} disabled={submit.isPending} className="btn-primary btn-lg"><Send className="h-4 w-4" /> {submit.isPending ? 'Submitting and pre-marking…' : sub ? 'Resubmit' : 'Submit'}</button>}
      {sub && <p className="text-sm text-muted-fg">Last submitted {formatDateTime(sub.submittedAt)}</p>}
      {sub?.aiFeedback && <FeedbackCard fb={sub.aiFeedback} />}
    </div>
  );
}

function ManagerView({ a }: { a: Assignment }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data } = useQuery({ queryKey: ['submissions', a.id], queryFn: () => api.get<{ submissions: Submission[] }>(`/api/classrooms/assignments/${a.id}/submissions`) });
  const [selected, setSelected] = useState<string | null>(null);
  const current = data?.submissions.find((s) => s.id === selected) ?? data?.submissions[0];
  const [grade, setGrade] = useState({ score: '', feedback: '' });
  useEffect(() => { if (current) setGrade({ score: current.score?.toString() ?? (current.aiFeedback ? String(Math.round((current.aiFeedback.score / 100) * a.maxScore)) : ''), feedback: current.teacherFeedback ?? current.aiFeedback?.summary ?? '' }); }, [current, a.maxScore]);
  const save = useMutation({
    mutationFn: () => api.post(`/api/classrooms/submissions/${current!.id}/grade`, { score: Number(grade.score), feedback: grade.feedback }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['submissions', a.id] }); toast.success('Grade saved'); },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const del = useMutation({ mutationFn: () => api.del(`/api/classrooms/assignments/${a.id}`), onSuccess: () => { toast.success('Assignment deleted'); navigate(`/classes/${a.classroomId}`); } });

  return (
    <div className="space-y-5">
      <div className="flex justify-end"><button onClick={() => confirm('Delete this assignment and all submissions?') && del.mutate()} className="btn-ghost btn-sm text-red-600"><Trash2 className="h-4 w-4" /> Delete assignment</button></div>
      {!data?.submissions.length ? <Empty title="No submissions yet">Learners’ work will appear here, already pre-marked by AI.</Empty> : (
        <div className="grid gap-5 lg:grid-cols-[260px_1fr]">
          <ul className="card max-h-[70vh] divide-y divide-border overflow-y-auto">
            {data.submissions.map((s) => (
              <li key={s.id}>
                <button onClick={() => setSelected(s.id)} className={cn('flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-muted', current?.id === s.id && 'bg-muted')}>
                  <Avatar name={s.userName ?? '?'} size={28} />
                  <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{s.userName}</span><span className="text-xs text-muted-fg">{formatDateTime(s.submittedAt)}</span></span>
                  {s.status === 'graded' ? <span className="chip bg-teal-100 text-teal-600">{s.score}</span> : s.aiFeedback ? <span className="chip bg-gold-100 text-gold-600">AI {s.aiFeedback.score}</span> : <AlertCircle className="h-4 w-4 text-muted-fg" />}
                </button>
              </li>
            ))}
          </ul>
          {current && (
            <div className="space-y-4">
              {current.code && (
                <div className="overflow-hidden rounded-xl border border-night-700">
                  <Suspense fallback={<EditorFallback />}><CodeEditor value={current.code} language={a.language} readOnly height="320px" /></Suspense>
                </div>
              )}
              {current.text && <div className="card p-4 text-sm whitespace-pre-wrap">{current.text}</div>}
              {current.aiFeedback && <FeedbackCard fb={current.aiFeedback} />}
              <form onSubmit={(e) => { e.preventDefault(); save.mutate(); }} className="card space-y-3 p-4">
                <h3 className="font-display font-semibold">Final grade</h3>
                <Field label={`Score (out of ${a.maxScore})`} htmlFor="gs"><Input id="gs" type="number" min={0} max={a.maxScore} required value={grade.score} onChange={(e) => setGrade({ ...grade, score: e.target.value })} /></Field>
                <Field label="Feedback to learner" htmlFor="gf"><Textarea id="gf" value={grade.feedback} onChange={(e) => setGrade({ ...grade, feedback: e.target.value })} /></Field>
                <button disabled={save.isPending} className="btn-primary">{current.status === 'graded' ? 'Update grade' : 'Save grade'}</button>
              </form>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function AssignmentPage() {
  const { id = '' } = useParams();
  const { data, isLoading, error } = useQuery({ queryKey: ['assignment', id], queryFn: () => api.get<{ assignment: Assignment; manager: boolean }>(`/api/classrooms/assignments/${id}`) });
  if (isLoading) return <PageLoader />;
  if (error || !data) return <div className="container py-16"><Empty title="Assignment not available">{errorMessage(error)}</Empty></div>;
  const a = data.assignment;
  return (
    <div className="container py-8">
      <Link to={`/classes/${a.classroomId}`} className="text-sm text-muted-fg hover:text-fg">Back to class</Link>
      <h1 className="mt-2 text-3xl font-bold">{a.title}</h1>
      <p className="mt-1 flex flex-wrap gap-4 text-sm text-muted-fg">
        <span className="font-mono">{a.language}</span><span>Max score {a.maxScore}</span>
        {a.dueAt && <span className="flex items-center gap-1"><CalendarClock className="h-4 w-4" /> Due {formatDateTime(a.dueAt)}</span>}
      </p>
      <div className="mt-6 grid gap-8 xl:grid-cols-[minmax(0,420px)_1fr]">
        <div className="space-y-4">
          <div className="card p-5"><Markdown>{a.instructions}</Markdown></div>
          {a.rubric && <details className="card p-5"><summary className="cursor-pointer font-semibold">Marking rubric</summary><Markdown className="mt-3 prose-sm">{a.rubric}</Markdown></details>}
        </div>
        <div>{data.manager ? <ManagerView a={a} /> : <StudentView a={a} />}</div>
      </div>
    </div>
  );
}
