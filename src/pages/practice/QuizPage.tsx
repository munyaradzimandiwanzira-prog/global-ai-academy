import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Check, RotateCcw, X } from 'lucide-react';
import type { QuizQuestion, Track } from '@shared/content';
import { catalog, getCatalogTrack, lessonPath, loadTrack } from '@/lib/catalog';
import { useProgress } from '@/lib/progress';
import { celebrate } from '@/lib/celebrate';
import { InlineCode } from '@/features/lesson/blocks';
import { Button, ButtonLink, PageLoader, ProgressBar, TrackMark } from '@/components/ui';
import { cn } from '@/lib/utils';
import NotFound from '@/pages/NotFound';

const QUIZ_LENGTH = 20;
const PASS = 70;

interface Item extends QuizQuestion { lessonSlug: string; lessonTitle: string }

/** Every lesson quiz question in a track (exam-only questions stay on the server). */
function questionsOf(track: Track): Item[] {
  return track.lessons.flatMap((l) =>
    l.blocks.flatMap((b) => (b.type === 'quiz' && !b.examOnly ? b.questions.map((q) => ({ ...q, lessonSlug: l.slug, lessonTitle: l.title })) : [])),
  );
}

function shuffle<T>(arr: T[], seed: number): T[] {
  const a = [...arr];
  let s = seed || 1;
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 16807) % 2147483647;
    const j = s % (i + 1);
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

export function QuizIndex() {
  const tracks = catalog.filter((t) => t.quizCount > 0 && t.category !== 'kids').sort((a, b) => a.order - b.order);
  const { activity } = useProgress();
  return (
    <div className="container py-14">
      <h1 className="display-lg">Quizzes</h1>
      <p className="lede mt-4 max-w-2xl text-fg/85">Up to {QUIZ_LENGTH} questions drawn from a track’s lessons. Score {PASS}% or more to pass, then see what to revise. Each attempt shuffles the questions.</p>
      <ul className="mt-10 grid gap-x-10 sm:grid-cols-2 lg:grid-cols-3">
        {tracks.map((t) => {
          const best = activity.find((a) => a.kind === 'quiz' && a.refId === `track-quiz:${t.id}`);
          return (
            <li key={t.id} className="border-b border-border">
              <Link to={`/quiz/${t.id}`} className="group flex items-center gap-4 py-4">
                <TrackMark short={t.short} color={t.color} size={40} />
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold group-hover:text-teal-600">{t.title} quiz</span>
                  <span className="block text-sm text-fg/70">{best?.score != null ? `Best score ${Math.round(best.score)}%` : 'Not taken yet'}</span>
                </span>
                <ArrowRight className="h-5 w-5 text-fg/40 group-hover:text-teal-600" aria-hidden="true" />
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default function QuizPage() {
  const { trackId = '' } = useParams();
  const meta = getCatalogTrack(trackId);
  const track = useQuery({ queryKey: ['track', trackId], queryFn: () => loadTrack(trackId), enabled: !!meta, staleTime: Infinity });
  const [seed, setSeed] = useState(() => Date.now() % 100000);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [checked, setChecked] = useState(false);
  const { recordActivity } = useProgress();

  const items = useMemo(() => (track.data ? shuffle(questionsOf(track.data), seed).slice(0, QUIZ_LENGTH) : []), [track.data, seed]);
  const done = items.length > 0 && index >= items.length;
  const score = items.filter((q, i) => answers[i] === q.answer).length;
  const pct = items.length ? Math.round((score / items.length) * 100) : 0;

  useEffect(() => {
    if (!done) return;
    recordActivity({ kind: 'quiz', refId: `track-quiz:${trackId}`, trackId, passed: pct >= PASS, score: pct });
    if (pct >= PASS) celebrate('big');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done]);

  if (!meta) return <NotFound />;
  if (track.isLoading) return <PageLoader />;

  const restart = () => { setSeed((s) => s + 7919); setIndex(0); setAnswers({}); setChecked(false); };
  const q = items[index];
  const chosen = answers[index];

  if (!items.length) {
    return (
      <div className="container py-14">
        <h1 className="display-md">{meta.title} quiz</h1>
        <p className="mt-4">This track has no quiz questions yet. <Link className="font-semibold text-teal-600" to="/quiz">Choose another quiz</Link>.</p>
      </div>
    );
  }

  if (done) {
    const missed = items.map((it, i) => ({ it, i })).filter(({ it, i }) => answers[i] !== it.answer);
    const revise = [...new Map(missed.map(({ it }) => [it.lessonSlug, it.lessonTitle])).entries()];
    return (
      <div className="container max-w-3xl py-14">
        <p className="text-fg/70">{meta.title} quiz result</p>
        <h1 className="mt-2 font-display font-bold tracking-display tabular" style={{ fontSize: 'clamp(4rem, 12vw, 8rem)', lineHeight: 0.95 }}>{pct}%</h1>
        <p className="lede mt-4">{score} of {items.length} correct. {pct >= PASS ? 'You passed. Well done!' : `You need ${PASS}% to pass. Revise the lessons below and try again.`}</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button onClick={restart} startIcon={<RotateCcw />} size="lg">Take it again</Button>
          <ButtonLink to={lessonPath(trackId)} variant="outlined" size="lg">Back to {meta.title}</ButtonLink>
          {pct >= PASS && <ButtonLink to={`/exam/${trackId}`} variant="text" size="lg" endIcon={<ArrowRight />}>Try the certificate exam</ButtonLink>}
        </div>
        {revise.length > 0 && (
          <section className="mt-12">
            <h2 className="font-display text-2xl font-bold">Revise these lessons</h2>
            <ul className="mt-4 divide-y divide-border">
              {revise.map(([slug, title]) => (
                <li key={slug}><Link to={lessonPath(trackId, slug)} className="flex items-center justify-between py-3 font-medium hover:text-teal-600">{title}<ArrowRight className="h-4 w-4" /></Link></li>
              ))}
            </ul>
          </section>
        )}
      </div>
    );
  }

  return (
    <div className="container max-w-3xl py-12">
      <div className="flex items-center gap-4">
        <TrackMark short={meta.short} color={meta.color} size={44} />
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-2xl font-bold">{meta.title} quiz</h1>
          <p className="text-sm text-fg/70 tabular">Question {index + 1} of {items.length}</p>
        </div>
      </div>
      <ProgressBar value={(index / items.length) * 100} className="mt-5" />

      <section className="mt-8 rounded-3xl bg-card p-6 md:p-8" aria-live="polite">
        <h2 className="text-xl font-semibold leading-snug md:text-2xl" style={{ fontFamily: 'inherit', letterSpacing: 0 }}><InlineCode text={q!.q} /></h2>
        <div className="mt-6 grid gap-3" role="radiogroup" aria-label="Answers">
          {q!.options.map((o, oi) => {
            const isChosen = chosen === oi;
            const right = checked && oi === q!.answer;
            const wrong = checked && isChosen && oi !== q!.answer;
            return (
              <button
                key={oi}
                role="radio"
                aria-checked={isChosen}
                disabled={checked}
                onClick={() => setAnswers({ ...answers, [index]: oi })}
                className={cn(
                  'flex min-h-[3.25rem] items-center gap-3 rounded-2xl border-[1.5px] px-4 py-3 text-left text-[16px] transition-colors',
                  !checked && (isChosen ? 'border-teal bg-teal/[.08]' : 'border-border hover:border-teal/60'),
                  right && 'border-teal bg-teal/[.1] font-medium',
                  wrong && 'border-red-600 bg-red-600/[.06]',
                  checked && !right && !wrong && 'border-border opacity-60',
                )}
              >
                <span className={cn('flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-[1.5px]', isChosen ? 'border-teal bg-teal text-white' : 'border-fg/30')}>
                  {right ? <Check className="h-4 w-4" /> : wrong ? <X className="h-4 w-4" /> : null}
                </span>
                <InlineCode text={o} />
              </button>
            );
          })}
        </div>
        {checked && (
          <div className="mt-5 rounded-2xl bg-granite-100 p-4 text-[15px] dark:bg-night-700">
            <p className="font-semibold">{chosen === q!.answer ? 'Correct.' : `Not quite. The answer is: ${q!.options[q!.answer]}`}</p>
            {q!.explain && <p className="mt-1"><InlineCode text={q!.explain} /></p>}
            <p className="mt-2 text-fg/70">From the lesson <Link to={lessonPath(trackId, q!.lessonSlug)} className="font-medium text-teal-600 underline-offset-4 hover:underline">{q!.lessonTitle}</Link></p>
          </div>
        )}
        <div className="mt-6 flex justify-end gap-3">
          {!checked ? (
            <Button disabled={chosen === undefined} onClick={() => setChecked(true)} size="lg">Check answer</Button>
          ) : (
            <Button color="action" size="lg" endIcon={<ArrowRight />} onClick={() => { setChecked(false); setIndex(index + 1); }}>{index + 1 === items.length ? 'See my score' : 'Next question'}</Button>
          )}
        </div>
      </section>
    </div>
  );
}
