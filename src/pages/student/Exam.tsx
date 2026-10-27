import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Award, Clock, CheckCircle2, XCircle, Lock } from 'lucide-react';
import type { Certificate } from '@shared/api-types';
import { EXAM } from '@shared/config';
import { api, errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { getCatalogTrack, lessonPath } from '@/lib/catalog';
import { celebrate } from '@/lib/celebrate';
import { InlineCode } from '@/features/lesson/blocks';
import { PageLoader, ProgressBar } from '@/components/ui';
import { CertificateView } from './Certificates';
import { cn, formatDateTime } from '@/lib/utils';
import NotFound from '../NotFound';

interface Eligibility { eligible: boolean; completion: number; required: number; bankSize: number; cooldownUntil: string | null; certificate: { id: string; score: number } | null }
interface ExamQ { id: string; q: string; options: string[] }
interface ExamResult { score: number; passed: boolean; correct: number; total: number; review: { id: string; correct: boolean; answer: number; chosen: number | null; explain: string | null }[]; certificate: Certificate | null }

export default function Exam() {
  const { trackId = '' } = useParams();
  const track = getCatalogTrack(trackId);
  const { can } = useAuth();
  const elig = useQuery({ queryKey: ['exam-elig', trackId], queryFn: () => api.get<Eligibility>(`/api/exams/${trackId}/eligibility`), enabled: !!track });
  const [attempt, setAttempt] = useState<{ attemptId: string; questions: ExamQ[] } | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [current, setCurrent] = useState(0);
  const [result, setResult] = useState<ExamResult | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (!track) return <NotFound />;
  if (elig.isLoading) return <PageLoader />;
  const e = elig.data;

  const start = async () => {
    setBusy(true);
    setError('');
    try {
      const a = await api.post<{ attemptId: string; questions: ExamQ[] }>(`/api/exams/${trackId}/start`);
      setAttempt(a);
      setAnswers({});
      setCurrent(0);
      setResult(null);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const submit = async () => {
    if (!attempt) return;
    setBusy(true);
    try {
      const r = await api.post<ExamResult>(`/api/exams/${trackId}/submit`, { attemptId: attempt.attemptId, answers });
      setResult(r);
      if (r.passed) celebrate('big');
      void elig.refetch();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  if (result && attempt) {
    return (
      <div className="container max-w-3xl py-10">
        <div className={cn('card p-6 text-center', result.passed ? 'border-teal' : 'border-stone/40')}>
          {result.passed ? <CheckCircle2 className="mx-auto h-14 w-14 text-teal" /> : <XCircle className="mx-auto h-14 w-14 text-stone" />}
          <h1 className="mt-3 text-3xl font-bold">{result.passed ? 'You passed!' : 'Not this time'}</h1>
          <p className="mt-2 text-lg">{result.correct} of {result.total} correct · <strong>{result.score}%</strong></p>
          <p className="mt-1 text-sm text-muted-fg">{result.passed ? 'Your certificate is ready below.' : `You need ${EXAM.passPercent}% to pass. Review the explanations, revisit the lessons, and try again after ${EXAM.cooldownHours} hours.`}</p>
        </div>
        {result.certificate && <div className="mt-8"><CertificateView cert={result.certificate} /><div className="mt-3 text-center"><Link to="/certificates" className="btn-primary">Go to my certificates</Link></div></div>}
        <h2 className="mt-10 text-xl font-bold">Review</h2>
        <ol className="mt-4 space-y-4">
          {attempt.questions.map((q, i) => {
            const r = result.review.find((x) => x.id === q.id)!;
            return (
              <li key={q.id} className="card p-4">
                <p className="font-medium">{i + 1}. <InlineCode text={q.q} /></p>
                <p className={cn('mt-2 text-sm', r.correct ? 'text-teal-600' : 'text-red-700 dark:text-red-300')}>
                  {r.correct ? 'Correct' : <>Your answer: {r.chosen != null ? <InlineCode text={q.options[r.chosen]!} /> : 'none'} · Correct: <InlineCode text={q.options[r.answer]!} /></>}
                </p>
                {r.explain && <p className="mt-1 text-sm text-muted-fg"><InlineCode text={r.explain} /></p>}
              </li>
            );
          })}
        </ol>
      </div>
    );
  }

  if (attempt) {
    const q = attempt.questions[current]!;
    const answered = Object.keys(answers).length;
    return (
      <div className="container max-w-2xl py-10">
        <div className="mb-4 flex items-center justify-between text-sm text-muted-fg">
          <span>{track.title} exam</span>
          <span>Question {current + 1} of {attempt.questions.length}</span>
        </div>
        <ProgressBar value={(answered / attempt.questions.length) * 100} />
        <div className="card mt-6 p-6">
          <p className="text-lg font-medium"><InlineCode text={q.q} /></p>
          <div className="mt-5 space-y-2" role="radiogroup">
            {q.options.map((o, oi) => (
              <button key={oi} role="radio" aria-checked={answers[q.id] === oi} onClick={() => setAnswers({ ...answers, [q.id]: oi })}
                className={cn('w-full rounded-lg border px-4 py-3 text-left', answers[q.id] === oi ? 'border-teal bg-teal-100 dark:bg-teal/20' : 'border-border hover:bg-muted')}>
                <InlineCode text={o} />
              </button>
            ))}
          </div>
        </div>
        <div className="mt-5 flex justify-between">
          <button disabled={current === 0} onClick={() => setCurrent((c) => c - 1)} className="btn-outline">Previous</button>
          {current < attempt.questions.length - 1 ? (
            <button onClick={() => setCurrent((c) => c + 1)} className="btn-primary">Next</button>
          ) : (
            <button disabled={busy || answered < attempt.questions.length} onClick={submit} className="btn-run">{busy ? 'Submitting…' : `Submit exam (${answered}/${attempt.questions.length})`}</button>
          )}
        </div>
        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      </div>
    );
  }

  return (
    <div className="container max-w-3xl py-10">
      <div className="card overflow-hidden">
        <div className="bg-ink p-6 text-white">
          <Award className="h-10 w-10 text-gold" />
          <h1 className="mt-3 text-3xl font-bold">{track.title} certification exam</h1>
          <p className="mt-2 text-white/70">Up to {EXAM.questionCount} multiple-choice questions drawn from the whole track. Pass with {EXAM.passPercent}% to earn a verifiable certificate.</p>
        </div>
        <div className="chevron-band" />
        <div className="space-y-4 p-6">
          {e?.certificate && <p className="rounded-lg bg-teal-100 p-3 text-sm text-teal-600">You already hold this certificate (best score {Math.round(e.certificate.score)}%). You can retake the exam to improve your score.</p>}
          <div>
            <div className="mb-1 flex justify-between text-sm"><span>Track completion</span><span>{Math.round((e?.completion ?? 0) * 100)}% of {Math.round((e?.required ?? 0.6) * 100)}% needed</span></div>
            <ProgressBar value={((e?.completion ?? 0) / (e?.required ?? 0.6)) * 100} />
          </div>
          <ul className="space-y-1.5 text-sm text-muted-fg">
            <li className="flex items-center gap-2"><Clock className="h-4 w-4" /> Take your time — the attempt stays open for 2 hours.</li>
            <li className="flex items-center gap-2"><XCircle className="h-4 w-4" /> If you don’t pass, you can retake it after {EXAM.cooldownHours} hours.</li>
          </ul>
          {e?.cooldownUntil && <p className="text-sm text-stone">Next attempt available {formatDateTime(e.cooldownUntil)}.</p>}
          {error && <p className="text-sm text-red-600">{error}</p>}
          {!can('exam.take') ? (
            <div className="rounded-xl bg-muted p-4">
              <p className="flex items-center gap-2 font-semibold"><Lock className="h-4 w-4" /> Exams are part of Plus and Academy</p>
              <Link to="/pricing" className="btn-gold btn-sm mt-3">See plans</Link>
            </div>
          ) : (
            <div className="flex flex-wrap gap-3">
              <button disabled={!e?.eligible || busy} onClick={start} className="btn-run btn-lg">{busy ? 'Preparing…' : 'Start exam'}</button>
              {!e?.eligible && (e?.completion ?? 0) < (e?.required ?? 0.6) && <Link to={lessonPath(track.id)} className="btn-outline btn-lg">Keep learning</Link>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
