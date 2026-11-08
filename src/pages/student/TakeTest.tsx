import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { LearnerTest, QuestionForLearner, TestKind } from '@shared/tests';
import { api, errorMessage } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Dialog, Input, PageLoader, Textarea } from '@/components/ui';
import { ArrowLeft, MaterialIcon } from '@/components/icons';
import { Visual } from '@/features/maths/Visual';
import { shortDate } from '@/pages/teacher/shared';

type Head = { id: string; title: string; kind: TestKind; instructions: string; totalMarks: number; timeLimitMin?: number | null; dueAt: string | null };
type Review = QuestionForLearner & { given: unknown; got: number; provisional: boolean; why?: string; answer: string | null };
type Take =
  | { done: false; test: Head; startedAt: string; questions: QuestionForLearner[]; saved: Record<string, unknown> }
  | { done: true; test: Head; status: 'submitted' | 'marked'; score: number | null; max: number | null; comment: string | null; late: boolean; review: Review[] | null };

/** D1 stores "YYYY-MM-DD HH:MM:SS" in UTC. */
const utc = (s: string) => new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(s) ? s : `${s.replace(' ', 'T')}Z`).getTime();
const mmss = (ms: number) => { const s = Math.max(0, Math.round(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };

function ReviewView({ r }: { r: Extract<Take, { done: true }> }) {
  const pct = r.max ? Math.round(((r.score ?? 0) / r.max) * 100) : null;
  return (
    <div className="space-y-6">
      <div className="card p-6 text-center">
        {r.status === 'marked' ? <>
          <p className="text-muted-fg">Your mark</p>
          <p className="font-display text-5xl font-bold tabular-nums">{r.score} / {r.max}</p>
          <p className="mt-1 text-lg font-semibold">{pct}%{r.late ? ' · handed in late' : ''}</p>
        </> : <>
          <MaterialIcon name="hourglass_top" className="text-[40px] text-gold-700 dark:text-gold" />
          <p className="mt-2 font-display text-xl font-semibold">Handed in. Your teacher is checking the written answers.</p>
          <p className="text-muted-fg">Everything else is already marked: {r.score ?? 0} marks so far.</p>
        </>}
        {r.comment && <p className="mx-auto mt-4 max-w-prose rounded-md bg-muted p-3 text-left text-[15px]"><strong>From your teacher:</strong> {r.comment}</p>}
      </div>
      {r.review ? (
        <ol className="space-y-3">
          {r.review.map((x, i) => {
            const right = x.got >= x.marks; const given = x.type === 'mcq' ? (x.options?.[Number(x.given)] ?? '—') : String(x.given ?? '—');
            return (
              <li key={x.id} className={cn('card border-l-4 p-4', right ? 'border-l-teal' : x.got > 0 ? 'border-l-gold' : 'border-l-red-700')}>
                <p className="font-semibold">{i + 1}. {x.q} <span className="font-normal text-muted-fg">({x.got}/{x.marks}{x.provisional ? ', not confirmed yet' : ''})</span></p>
                {x.visual && <div className="my-2 flex justify-center"><Visual v={x.visual} /></div>}
                <p className="mt-1 whitespace-pre-wrap text-[15px]"><span className="text-muted-fg">You wrote: </span>{given}</p>
                {!right && x.answer && <p className="text-[15px]"><span className="text-muted-fg">Answer: </span><strong>{x.answer}</strong></p>}
                {x.why && <p className="mt-1 text-sm text-muted-fg">{x.why}</p>}
              </li>
            );
          })}
        </ol>
      ) : <p className="text-center text-muted-fg">Your teacher will go through the answers with you.</p>}
    </div>
  );
}

function Answer({ x, value, onChange }: { x: QuestionForLearner; value: unknown; onChange: (v: unknown) => void }) {
  if (x.type === 'mcq') return (
    <div role="radiogroup" aria-label="Choose one" className="grid gap-2 sm:grid-cols-2">
      {(x.options ?? []).map((o, k) => (
        <button key={k} type="button" role="radio" aria-checked={value === k} onClick={() => onChange(k)}
          className={cn('min-h-12 rounded-md border-2 px-4 py-2 text-left text-[16px] font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal', value === k ? 'border-teal bg-teal-100 dark:bg-teal-900' : 'border-border bg-card hover:border-teal/60')}>
          <span className="mr-2 font-display font-bold text-muted-fg">{String.fromCharCode(65 + k)}</span>{o}
        </button>
      ))}
    </div>
  );
  if (x.type === 'long') return <Textarea aria-label="Your answer" value={String(value ?? '')} onChange={(e) => onChange(e.target.value)} rows={5} maxLength={4000} placeholder="Write your answer. Explain your thinking." />;
  return <Input aria-label="Your answer" inputMode={x.type === 'numeric' ? 'decimal' : 'text'} value={String(value ?? '')} onChange={(e) => onChange(e.target.value)} maxLength={200} className="max-w-xs text-lg" placeholder={x.type === 'numeric' ? 'Type a number' : 'Type your answer'} />;
}

function Taking({ t, onDone }: { t: Extract<Take, { done: false }>; onDone: () => void }) {
  const [answers, setAnswers] = useState<Record<string, unknown>>(t.saved);
  const [confirm, setConfirm] = useState(false);
  const [now, setNow] = useState(Date.now());
  const dirty = useRef(false);
  const deadline = t.test.timeLimitMin ? utc(t.startedAt) + t.test.timeLimitMin * 60_000 : null;
  const submit = useMutation({
    mutationFn: (final: boolean) => api.post<{ score?: number; max?: number; status?: string }>(`/api/tests/${t.test.id}/submit`, { answers, final }),
    onSuccess: (_r, final) => { dirty.current = false; if (final) { toast.success('Handed in.'); onDone(); } },
    onError: (e, final) => { if (final) toast.error(errorMessage(e)); },
  });
  const save = useCallback(() => { if (dirty.current && !submit.isPending) submit.mutate(false); }, [submit]);
  useEffect(() => { const i = setInterval(save, 15_000); return () => clearInterval(i); }, [save]);
  useEffect(() => { if (!deadline) return; const i = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(i); }, [deadline]);
  const timeUp = deadline != null && now >= deadline;
  useEffect(() => { if (timeUp && !submit.isPending) submit.mutate(true); }, [timeUp]); // eslint-disable-line react-hooks/exhaustive-deps
  const set = (id: string, v: unknown) => { dirty.current = true; setAnswers((s) => ({ ...s, [id]: v })); };
  const answered = t.questions.filter((x) => answers[x.id] !== undefined && answers[x.id] !== '').length;
  const left = deadline ? deadline - now : null;
  return (
    <>
      <div className="sticky top-16 z-10 -mx-4 mb-4 flex items-center gap-3 border-b border-border bg-granite/95 px-4 py-2 backdrop-blur dark:bg-night/95">
        <span className="text-[15px] font-medium tabular-nums">{answered} of {t.questions.length} answered</span>
        {left != null && <span role="timer" aria-live={left < 60_000 ? 'assertive' : 'off'} className={cn('ml-auto inline-flex items-center gap-1 rounded-full px-3 py-1 font-display font-bold tabular-nums', left < 120_000 ? 'bg-red-700 text-white' : 'bg-muted')}><MaterialIcon name="timer" className="text-[20px]" /> {mmss(left)}</span>}
        <span className={cn('text-sm text-muted-fg', left == null && 'ml-auto')} aria-live="polite">{submit.isPending && !submit.variables ? 'Saving…' : 'Saved as you go'}</span>
      </div>
      {t.test.instructions && <p className="mb-4 whitespace-pre-wrap rounded-md bg-muted p-4 text-[16px]">{t.test.instructions}</p>}
      <ol className="space-y-4">
        {t.questions.map((x, i) => (
          <li key={x.id} className="card space-y-3 p-5">
            <p className="text-[17px] font-semibold">{i + 1}. {x.q} <span className="text-sm font-normal text-muted-fg">({x.marks} {x.marks === 1 ? 'mark' : 'marks'})</span></p>
            {x.visual && <div className="flex justify-center"><Visual v={x.visual} /></div>}
            <Answer x={x} value={answers[x.id]} onChange={(v) => set(x.id, v)} />
          </li>
        ))}
      </ol>
      <button type="button" className="btn-primary btn-lg mt-6 w-full" onClick={() => setConfirm(true)} disabled={submit.isPending}><MaterialIcon name="send" /> Hand it in</button>
      <Dialog open={confirm} onOpenChange={setConfirm} title="Hand it in?" description={answered < t.questions.length ? `You've left ${t.questions.length - answered} unanswered. You can't change answers after handing in.` : "You can't change answers after handing in."}>
        <div className="flex gap-2"><button type="button" className="btn-outline flex-1" onClick={() => setConfirm(false)}>Keep working</button><button type="button" className="btn-primary flex-1" onClick={() => { setConfirm(false); submit.mutate(true); }} aria-busy={submit.isPending || undefined}>Hand it in</button></div>
      </Dialog>
    </>
  );
}

export default function TakeTest() {
  const { id = '' } = useParams();
  const qc = useQueryClient();
  const list = useQuery({ queryKey: ['my-tests'], queryFn: () => api.get<{ tests: LearnerTest[] }>('/api/tests/mine/list') });
  const info = list.data?.tests.find((t) => t.id === id);
  // Opening the paper starts the clock, so a learner who hasn't started sees an intro first.
  const [begun, setBegun] = useState(false);
  const shouldLoad = begun || (!!info && info.status !== 'to do');
  const take = useQuery({ queryKey: ['take', id], enabled: shouldLoad, queryFn: () => api.get<Take>(`/api/tests/${id}/take`) });
  if (list.isLoading || (shouldLoad && take.isLoading)) return <PageLoader />;
  const head = take.data?.test;
  return (
    <div className="container max-w-3xl py-8">
      <Link to="/tests" className="btn-ghost btn-sm -ml-3 mb-2"><ArrowLeft /> Tests and homework</Link>
      <h1 className="font-display text-3xl font-bold">{head?.title ?? info?.title ?? 'Test'}</h1>
      {!shouldLoad ? (
        info ? (
          <div className="card mt-6 space-y-4 p-6">
            <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div><dt className="text-sm text-muted-fg">From</dt><dd className="font-semibold">{info.teacher}</dd></div>
              <div><dt className="text-sm text-muted-fg">Questions</dt><dd className="font-semibold">{info.questions} · {info.totalMarks} marks</dd></div>
              <div><dt className="text-sm text-muted-fg">Time</dt><dd className="font-semibold">{info.timeLimitMin ? `${info.timeLimitMin} minutes` : 'No time limit'}</dd></div>
              <div><dt className="text-sm text-muted-fg">Due</dt><dd className="font-semibold">{info.dueAt ? shortDate(info.dueAt) : 'Any time'}</dd></div>
            </dl>
            {info.timeLimitMin ? <p className="text-[15px]">The clock starts when you press Start and keeps going if you leave the page. When it runs out, your answers are handed in for you.</p> : <p className="text-[15px]">Your answers save as you go, so you can stop and come back.</p>}
            <button type="button" className="btn-primary btn-lg w-full" onClick={() => setBegun(true)}><MaterialIcon name="play_arrow" /> Start</button>
          </div>
        ) : <p className="mt-6 text-muted-fg">This test isn&rsquo;t set for you, or it has been removed.</p>
      ) : take.error ? <p className="mt-6 text-red-700">{errorMessage(take.error)}</p> : take.data ? (
        <div className="mt-4">{take.data.done ? <ReviewView r={take.data} /> : <Taking t={take.data} onDone={() => { void qc.invalidateQueries({ queryKey: ['take', id] }); void qc.invalidateQueries({ queryKey: ['my-tests'] }); }} />}</div>
      ) : null}
    </div>
  );
}
