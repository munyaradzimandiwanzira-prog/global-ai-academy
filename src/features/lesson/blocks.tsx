import { lazy, Suspense, useCallback, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, ExternalLink, CheckCircle2, Lightbulb, Sparkles, RotateCcw, Eye, Trophy, ChevronDown } from 'lucide-react';
import { compressToEncodedURIComponent } from 'lz-string';
import { ANSWER_ALT, type Block, type Challenge, type QuizQuestion } from '@shared/content';
import { Playground, EditorFallback } from '@/features/editor/Playground';
import { OutputPanel, TestBanner, HtmlPreview } from '@/features/editor/OutputPanel';
import { useRunner } from '@/features/editor/useRunner';
import { LANGUAGE_LABELS } from '@/features/runners';
import { Markdown } from '@/components/Markdown';
import { useProgress } from '@/lib/progress';
import { api, ApiError, errorMessage } from '@/lib/api';
import { celebrate } from '@/lib/celebrate';
import { cn } from '@/lib/utils';
import { Spinner } from '@/components/ui';

const CodeEditor = lazy(() => import('@/features/editor/CodeEditor'));

const playgroundLink = (lang: string, code: string) => `/playground?lang=${lang}#code=${compressToEncodedURIComponent(code)}`;

// ── Try it Yourself example ────────────────────────────────────────────────

export function TryIt({ block }: { block: Extract<Block, { type: 'run' }> }) {
  const [open, setOpen] = useState(false);
  return (
    <figure className="not-prose my-6 overflow-hidden rounded-xl border border-border bg-sand-50 dark:bg-night-800">
      <figcaption className="flex items-center justify-between gap-3 border-b border-border px-4 py-2.5">
        <span className="font-display text-[15px] font-semibold">{block.title ?? 'Example'}</span>
        <span className="font-mono text-[11px] text-muted-fg">{LANGUAGE_LABELS[block.lang]}</span>
      </figcaption>
      {!open ? (
        <>
          <Suspense fallback={<pre className="bg-sand-50 p-4 font-mono text-[13px]">{block.code}</pre>}>
            <CodeEditor value={block.code} language={block.lang} readOnly light />
          </Suspense>
          <div className="flex flex-wrap items-center gap-2 border-t border-border px-4 py-3">
            <button onClick={() => setOpen(true)} className="btn-run">
              <Play className="h-4 w-4 fill-current" /> Try it yourself
            </button>
            <Link to={playgroundLink(block.lang, block.code)} className="btn-ghost btn-sm text-muted-fg">
              <ExternalLink className="h-3.5 w-3.5" /> Open in full editor
            </Link>
          </div>
        </>
      ) : (
        <div className="p-3">
          <Playground language={block.lang} initialCode={block.code} expectedOutput={block.output} autoRun />
          <button onClick={() => setOpen(false)} className="btn-ghost btn-sm mt-2 text-muted-fg">Close editor</button>
        </div>
      )}
    </figure>
  );
}

// ── Fill-in-the-blank exercise (W3Schools style) ───────────────────────────

const normalize = (s: string) => s.trim().replace(/\s+/g, ' ');

export function Exercise({ block, trackId }: { block: Extract<Block, { type: 'exercise' }>; trackId: string }) {
  const parts = useMemo(() => block.code.split('___'), [block.code]);
  const [values, setValues] = useState<string[]>(() => block.answers.map(() => ''));
  const [checked, setChecked] = useState<null | boolean[]>(null);
  const [revealed, setRevealed] = useState(false);
  const { recordActivity, passed } = useProgress();
  const already = passed.has(`exercise:${block.id}`);

  const check = () => {
    const results = block.answers.map((a, i) => a.split(ANSWER_ALT).some((alt) => normalize(alt) === normalize(values[i] ?? '')));
    setChecked(results);
    const ok = results.every(Boolean);
    recordActivity({ kind: 'exercise', refId: block.id, trackId, passed: ok });
    if (ok) celebrate('small');
  };
  const allOk = checked?.every(Boolean);

  return (
    <section className="not-prose my-6 rounded-2xl bg-gold-100/70 p-5 dark:bg-night-800" aria-label="Exercise">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="flex items-center gap-2 font-display text-base font-semibold">
          <Sparkles className="h-4 w-4 text-gold-600" /> Exercise
        </h3>
        {(already || allOk) && <span className="chip bg-teal-100 text-teal-600"><CheckCircle2 className="h-3.5 w-3.5" /> Completed</span>}
      </div>
      <p className="mb-3 text-[15px]">{block.prompt}</p>
      <pre className="overflow-x-auto rounded-lg bg-night p-4 font-mono text-[14px] leading-[2] text-sand">
        {parts.map((part, i) => (
          <span key={i}>
            {part}
            {i < parts.length - 1 && (
              <input
                aria-label={`Blank ${i + 1}`}
                value={revealed ? block.answers[i]!.split(ANSWER_ALT)[0] : values[i]}
                onChange={(e) => { const v = [...values]; v[i] = e.target.value; setValues(v); setChecked(null); }}
                onKeyDown={(e) => e.key === 'Enter' && check()}
                spellCheck={false}
                autoCapitalize="off"
                className={cn(
                  'mx-0.5 rounded border-b-2 bg-night-700 px-1.5 py-0 font-mono text-gold outline-none focus:border-teal',
                  checked?.[i] === true && 'border-teal-400 text-teal-400',
                  checked?.[i] === false && 'border-red-400 text-red-300',
                  !checked && 'border-gold/60',
                )}
                style={{ width: `${Math.max(3, (revealed ? block.answers[i]!.split(ANSWER_ALT)[0]!.length : values[i]?.length ?? 0) + 1.5)}ch` }}
              />
            )}
          </span>
        ))}
      </pre>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button onClick={check} className="btn-primary btn-sm">Submit answer</button>
        {block.hint && checked && !allOk && <span className="text-sm text-muted-fg"><Lightbulb className="mr-1 inline h-4 w-4 text-gold-600" />{block.hint}</span>}
        {checked && !allOk && !revealed && <button onClick={() => setRevealed(true)} className="btn-ghost btn-sm text-muted-fg"><Eye className="h-3.5 w-3.5" /> Show answer</button>}
        {allOk && <span className="text-sm font-medium text-teal-600">Correct! 🎉</span>}
      </div>
    </section>
  );
}

// ── Coding challenge with tests and the AI coach ───────────────────────────

export function ChallengeBlock({ challenge, trackId, lessonTitle }: { challenge: Challenge; trackId: string; lessonTitle?: string }) {
  const [code, setCode] = useState(challenge.starter);
  const { run, running, status, live, result, reset } = useRunner(challenge.lang);
  const [htmlTest, setHtmlTest] = useState<{ passed: boolean; message?: string } | null>(null);
  const [hints, setHints] = useState<string[]>([]);
  const [hinting, setHinting] = useState(false);
  const [failures, setFailures] = useState(0);
  const { recordActivity, passed } = useProgress();
  const solved = passed.has(`challenge:${challenge.id}`);
  const isHtml = challenge.lang === 'html' || challenge.lang === 'css';

  const onHtmlTest = useCallback((ok: boolean, message?: string) => {
    setHtmlTest({ passed: ok, message });
    recordActivity({ kind: 'challenge', refId: challenge.id, trackId, passed: ok, code });
    if (ok) celebrate('big');
    else setFailures((f) => f + 1);
  }, [challenge.id, trackId, recordActivity, code]);

  const check = async () => {
    setHtmlTest(null);
    const r = await run(code, { tests: challenge.tests || undefined, expectedOutput: challenge.expectedOutput });
    if (isHtml) return; // result arrives via onHtmlTest
    const ok = !!r.test?.passed;
    recordActivity({ kind: 'challenge', refId: challenge.id, trackId, passed: ok, code });
    if (ok) celebrate('big');
    else setFailures((f) => f + 1);
  };

  const test = isHtml ? htmlTest : result?.test;

  const askCoach = async () => {
    setHinting(true);
    try {
      const r = await api.post<{ hint: string }>('/api/ai/hint', {
        task: `${challenge.title}\n${challenge.prompt}`,
        code,
        language: challenge.lang,
        error: test?.message ?? result?.error,
        attempt: hints.length + 1,
        lessonTitle,
      });
      setHints((h) => [...h, r.hint]);
    } catch (e) {
      const msg = e instanceof ApiError && e.status === 429 ? e.message : errorMessage(e);
      setHints((h) => [...h, `⚠️ ${msg}`]);
    } finally {
      setHinting(false);
    }
  };

  return (
    <section id={`challenge-${challenge.id}`} data-challenge className="not-prose my-8 scroll-mt-28 overflow-hidden rounded-3xl border border-border bg-card" aria-label="Coding challenge">
      <header className="flex flex-wrap items-center gap-3 bg-ink px-5 py-3 text-white">
        <Trophy className="h-5 w-5 text-gold" />
        <h3 className="font-display text-lg font-semibold">{challenge.title}</h3>
        <span className="chip bg-white/10 text-white/80">{challenge.difficulty ?? 'easy'}</span>
        {solved && <span className="chip ml-auto bg-teal text-white"><CheckCircle2 className="h-3.5 w-3.5" /> Solved</span>}
      </header>
      <div className="chevron-band" />
      <div className="px-5 pb-5 pt-4">
        <Markdown className="prose-sm">{challenge.prompt}</Markdown>
        <div className="mt-4 overflow-hidden rounded-xl border border-night-700">
          <div className="flex items-center gap-2 border-b border-night-700 bg-night-800 px-3 py-2">
            <button onClick={check} disabled={running} className="btn-run btn-sm"><Play className="h-3.5 w-3.5 fill-current" /> {running ? 'Checking…' : 'Run & check'}</button>
            <button onClick={() => { setCode(challenge.starter); reset(); setHtmlTest(null); }} className="ml-auto rounded p-1.5 text-sand/60 hover:bg-night-700 hover:text-sand" title="Reset to starter code"><RotateCcw className="h-4 w-4" /></button>
          </div>
          <div className="grid md:grid-cols-2">
            <div className="min-w-0 md:border-r md:border-night-700">
              <Suspense fallback={<EditorFallback />}>
                <CodeEditor value={code} onChange={setCode} language={challenge.lang} onRun={check} height="280px" />
              </Suspense>
            </div>
            <div className="h-[280px] min-w-0 border-t border-night-700 md:border-t-0">
              {isHtml && result?.html ? (
                <HtmlPreview html={result.html} onTest={onHtmlTest} className="h-full min-h-0" />
              ) : (
                <OutputPanel result={result} live={live} status={status} running={running} className="h-full" />
              )}
            </div>
          </div>
        </div>
        <AnimatePresence>
          {test && !running && (
            <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-3">
              <TestBanner passed={test.passed} message={test.message} />
            </motion.div>
          )}
        </AnimatePresence>

        {(failures > 0 || hints.length > 0) && !test?.passed && (
          <div className="mt-4 rounded-xl border border-gold/40 bg-gold-100/50 p-4 dark:bg-night-800">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="flex items-center gap-2 text-sm font-semibold"><span className="text-lg" aria-hidden="true">☀️</span> Coach Zuva can help you get unstuck</p>
              <button onClick={askCoach} disabled={hinting || hints.length >= 3} className="btn-gold btn-sm">
                {hinting ? <Spinner className="text-ink" label="Thinking…" /> : <><Lightbulb className="h-4 w-4" /> {hints.length === 0 ? 'Give me a hint' : hints.length < 3 ? 'I need more help' : 'Hints used'}</>}
              </button>
            </div>
            <ol className="mt-3 space-y-3">
              {hints.map((h, i) => (
                <motion.li key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="rounded-lg bg-card p-3 text-sm shadow-sm">
                  <div className="mb-1 text-xs font-semibold text-gold-600">Hint {i + 1} of 3</div>
                  <Markdown className="prose-sm">{h}</Markdown>
                </motion.li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </section>
  );
}

// ── Lesson quiz ─────────────────────────────────────────────────────────────

export function Quiz({ block, trackId }: { block: Extract<Block, { type: 'quiz' }>; trackId: string }) {
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const { recordActivity } = useProgress();
  const score = block.questions.filter((q, i) => answers[i] === q.answer).length;

  const submit = () => {
    setSubmitted(true);
    const pct = Math.round((score / block.questions.length) * 100);
    recordActivity({ kind: 'quiz', refId: block.id, trackId, passed: pct >= 70, score: pct });
    if (pct >= 70) celebrate('small');
  };

  return (
    <section className="not-prose my-8 rounded-2xl border border-border bg-card p-5" aria-label="Quiz">
      <h3 className="mb-4 font-display text-lg font-semibold">Check your understanding</h3>
      <ol className="space-y-5">
        {block.questions.map((q, i) => (
          <QuizItem key={i} index={i} q={q} chosen={answers[i]} submitted={submitted} onChoose={(o) => !submitted && setAnswers({ ...answers, [i]: o })} />
        ))}
      </ol>
      <div className="mt-5 flex flex-wrap items-center gap-3">
        {!submitted ? (
          <button onClick={submit} disabled={Object.keys(answers).length < block.questions.length} className="btn-primary">Check answers</button>
        ) : (
          <>
            <span className={cn('font-display text-lg font-semibold', score / block.questions.length >= 0.7 ? 'text-teal-600' : 'text-stone')}>
              {score} / {block.questions.length} correct
            </span>
            <button onClick={() => { setAnswers({}); setSubmitted(false); }} className="btn-outline btn-sm"><RotateCcw className="h-3.5 w-3.5" /> Try again</button>
          </>
        )}
      </div>
    </section>
  );
}

function QuizItem({ q, index, chosen, submitted, onChoose }: { q: QuizQuestion; index: number; chosen?: number; submitted: boolean; onChoose: (o: number) => void }) {
  return (
    <li>
      <p className="mb-2 font-medium"><span className="mr-1 text-muted-fg">{index + 1}.</span> <InlineCode text={q.q} /></p>
      <div className="grid gap-2 sm:grid-cols-2" role="radiogroup">
        {q.options.map((o, oi) => {
          const isChosen = chosen === oi;
          const isRight = submitted && oi === q.answer;
          const isWrong = submitted && isChosen && oi !== q.answer;
          return (
            <button
              key={oi}
              role="radio"
              aria-checked={isChosen}
              onClick={() => onChoose(oi)}
              className={cn(
                'rounded-lg border px-3 py-2 text-left text-sm transition-colors',
                !submitted && (isChosen ? 'border-teal bg-teal-100 dark:bg-teal/20' : 'border-border hover:border-teal/50 hover:bg-muted'),
                isRight && 'border-teal bg-teal-100 font-medium text-teal-600 dark:bg-teal/20',
                isWrong && 'border-red-300 bg-red-50 text-red-700 dark:bg-red-950/40',
                submitted && !isRight && !isWrong && 'border-border opacity-60',
              )}
            >
              <InlineCode text={o} />
            </button>
          );
        })}
      </div>
      {submitted && q.explain && (
        <details className="mt-2 text-sm text-muted-fg" open={chosen !== q.answer}>
          <summary className="flex cursor-pointer items-center gap-1 font-medium"><ChevronDown className="h-3.5 w-3.5" /> Why?</summary>
          <p className="mt-1 pl-5"><InlineCode text={q.explain} /></p>
        </details>
      )}
    </li>
  );
}

/** Renders `code` spans inside plain strings without pulling in full Markdown. */
export function InlineCode({ text }: { text: string }) {
  const parts = text.split(/(`[^`]+`)/g);
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith('`') && p.endsWith('`') ? (
          <code key={i} className="rounded bg-sand-200 px-1 py-0.5 font-mono text-[0.88em] text-stone dark:bg-night-700 dark:text-gold">{p.slice(1, -1)}</code>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  );
}

// ── Block renderer ─────────────────────────────────────────────────────────

export function BlockRenderer({ blocks, trackId, lessonTitle }: { blocks: Block[]; trackId: string; lessonTitle: string }) {
  return (
    <>
      {blocks.map((b, i) => {
        switch (b.type) {
          case 'md': return <Markdown key={i}>{b.md}</Markdown>;
          case 'run': return <TryIt key={b.id} block={b} />;
          case 'code': return (
            <Suspense key={i} fallback={<pre className="my-4 rounded-lg bg-night p-4 font-mono text-[13px] text-sand">{b.code}</pre>}>
              <div className="not-prose my-5 overflow-hidden rounded-lg border border-night-700"><CodeEditor value={b.code} language={b.lang} readOnly /></div>
            </Suspense>
          );
          case 'exercise': return <Exercise key={b.id} block={b} trackId={trackId} />;
          case 'challenge': return <ChallengeBlock key={b.challenge.id} challenge={b.challenge} trackId={trackId} lessonTitle={lessonTitle} />;
          case 'quiz': return b.examOnly ? null : <Quiz key={b.id} block={b} trackId={trackId} />;
          default: return null;
        }
      })}
    </>
  );
}
