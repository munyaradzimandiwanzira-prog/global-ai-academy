import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { LearnerLesson } from '@shared/courses';
import { api, errorMessage } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Input, PageLoader } from '@/components/ui';
import { ArrowLeft, ArrowRight, MaterialIcon } from '@/components/icons';
import { Markdown } from '@/components/Markdown';
import { Visual } from '@/features/maths/Visual';

type Review = { id: string; got: number; marks: number; answer: string }[];

/** One lesson of a teacher's course: video, notes, and a quick check that marks itself. */
export default function CourseLesson() {
  const { id = '', lessonId = '' } = useParams();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['my-lesson', lessonId], queryFn: () => api.get<LearnerLesson>(`/api/courses/mine/${id}/lessons/${lessonId}`), retry: false });
  const [answers, setAnswers] = useState<Record<string, string | number>>({});
  const [result, setResult] = useState<{ score: number | null; max: number | null; review: Review } | null>(null);
  useEffect(() => { setAnswers({}); setResult(null); window.scrollTo({ top: 0 }); }, [lessonId]);
  const done = useMutation({
    mutationFn: () => api.post<{ score: number | null; max: number | null; review: Review }>(`/api/courses/mine/${id}/lessons/${lessonId}/complete`, { answers }),
    onSuccess: (r) => { setResult(r); void qc.invalidateQueries({ queryKey: ['my-course', id] }); void qc.invalidateQueries({ queryKey: ['my-courses'] }); if (r.max == null) toast.success('Lesson done'); },
    onError: (e) => toast.error(errorMessage(e)),
  });
  if (q.isLoading) return <PageLoader />;
  if (!q.data) return <div className="container py-10"><p>{errorMessage(q.error)}</p></div>;
  const l = q.data;
  const shown = result ?? (l.done && !Object.keys(answers).length ? { score: l.done.score, max: l.done.max, review: l.done.review } : null);
  const byId = new Map(shown?.review.map((r) => [r.id, r]) ?? []);
  const all = l.checks.every((c) => answers[c.id] !== undefined && answers[c.id] !== '');
  return (
    <div className="container max-w-3xl py-8">
      <Link to={`/my-courses/${id}`} className="btn-ghost btn-sm -ml-3 mb-2"><ArrowLeft /> {l.courseTitle}</Link>
      <h1 className="font-display text-3xl font-bold">{l.title}</h1>
      <p className="mt-1 text-muted-fg">{l.minutes} minutes</p>
      {l.video && <div className="mt-6 aspect-video overflow-hidden rounded-lg bg-black"><iframe src={l.video} title={`Video: ${l.title}`} className="h-full w-full" allow="encrypted-media; picture-in-picture" allowFullScreen loading="lazy" referrerPolicy="strict-origin-when-cross-origin" /></div>}
      {l.body.trim() && <div className="mt-6"><Markdown>{l.body}</Markdown></div>}

      <section className="mt-10" aria-labelledby="check">
        {l.checks.length > 0 ? (
          <>
            <h2 id="check" className="font-display text-xl font-semibold">Quick check</h2>
            {shown?.max != null && <p className="mt-1 text-lg font-semibold" role="status">You got {shown.score} out of {shown.max}.{shown.score === shown.max ? ' Well done!' : ' Look at the answers below, then try again if you like.'}</p>}
            <ol className="mt-4 space-y-4">
              {l.checks.map((c, i) => {
                const r = byId.get(c.id);
                return (
                  <li key={c.id} className={cn('card space-y-3 p-5', r && (r.got >= r.marks ? 'border-l-4 border-l-teal' : 'border-l-4 border-l-red-700'))}>
                    <p className="text-[17px] font-semibold">{i + 1}. {c.q}</p>
                    {c.visual && <div className="flex justify-center"><Visual v={c.visual} /></div>}
                    {c.type === 'mcq' ? (
                      <div role="radiogroup" aria-label={`Question ${i + 1}`} className="grid gap-2 sm:grid-cols-2">
                        {(c.options ?? []).map((o, k) => <button key={k} type="button" role="radio" aria-checked={answers[c.id] === k} onClick={() => setAnswers((s) => ({ ...s, [c.id]: k }))} className={cn('min-h-12 rounded-md border-2 px-4 py-2 text-left font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal', answers[c.id] === k ? 'border-teal bg-teal-100 dark:bg-teal-900' : 'border-border bg-card hover:border-teal/60')}>{o}</button>)}
                      </div>
                    ) : <Input aria-label={`Answer to question ${i + 1}`} inputMode={c.type === 'numeric' ? 'decimal' : 'text'} value={String(answers[c.id] ?? '')} onChange={(e) => setAnswers((s) => ({ ...s, [c.id]: e.target.value }))} className="max-w-xs text-lg" maxLength={200} />}
                    {r && r.got < r.marks && <p className="text-[15px]">Answer: <strong>{r.answer}</strong></p>}
                  </li>
                );
              })}
            </ol>
            <button type="button" className="btn-primary btn-lg mt-5 w-full" onClick={() => done.mutate()} disabled={!all || done.isPending} aria-busy={done.isPending || undefined}><MaterialIcon name="task_alt" /> {shown ? 'Check again' : 'Check my answers'}</button>
          </>
        ) : (
          <button type="button" className="btn-primary btn-lg w-full" onClick={() => done.mutate()} disabled={done.isPending || !!shown || !!l.done}><MaterialIcon name="task_alt" /> {l.done || shown ? 'Done' : 'Mark as done'}</button>
        )}
      </section>

      <nav className="mt-8 flex flex-wrap justify-between gap-3 border-t border-border pt-5" aria-label="Lessons">
        {l.prev ? <Link to={`/my-courses/${id}/${l.prev.id}`} className="btn-outline"><ArrowLeft /> {l.prev.title}</Link> : <span />}
        {l.next ? <Link to={`/my-courses/${id}/${l.next.id}`} className="btn-primary">{l.next.title} <ArrowRight /></Link> : <Link to={`/my-courses/${id}`} className="btn-primary">Back to the course</Link>}
      </nav>
    </div>
  );
}
