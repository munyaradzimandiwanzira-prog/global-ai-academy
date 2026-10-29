import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, RotateCcw } from '@/components/icons';
import { CAREERS } from '@/data/careers';
import { getCatalogTrack, lessonPath } from '@/lib/catalog';
import { Button, ButtonLink, CareerMark, TrackMark } from '@/components/ui';
import { cn } from '@/lib/utils';
import { recommend, type Answers } from '@/features/start/recommend';

/**
 * "Where to start" (W3Schools' guided entry point), answered for this learner:
 * four questions → a first track, a career path to follow and the plan that fits.
 */
const QUESTIONS: { key: keyof Answers; title: string; options: { value: string; label: string; text: string }[] }[] = [
  {
    key: 'age', title: 'Who is learning?',
    options: [
      { value: 'child', label: 'A child (6–12)', text: 'Games and puzzles first' },
      { value: 'teen', label: 'A teenager (13–17)', text: 'School, projects, first real code' },
      { value: 'adult', label: 'An adult', text: 'Study, work or a career change' },
    ],
  },
  {
    key: 'goal', title: 'What do you want to build?',
    options: [
      { value: 'fun', label: 'Just try coding', text: 'See if I like it' },
      { value: 'web', label: 'Websites and web apps', text: 'Pages, shops, dashboards' },
      { value: 'data', label: 'Data and analysis', text: 'Spreadsheets to dashboards' },
      { value: 'ai', label: 'AI products', text: 'Chatbots, RAG, agents' },
      { value: 'mobile', label: 'Phone apps', text: 'Android and iOS' },
      { value: 'hardware', label: 'Robots and devices', text: 'Arduino, sensors, IoT' },
      { value: 'job', label: 'Get a software job', text: 'The most direct path to work' },
    ],
  },
  {
    key: 'experience', title: 'How much code have you written?',
    options: [
      { value: 'none', label: 'None yet', text: 'Never written a line' },
      { value: 'some', label: 'A little', text: 'A course, some tutorials' },
      { value: 'working', label: 'I code for work', text: 'I want to go further' },
    ],
  },
  {
    key: 'time', title: 'How much time each week?',
    options: [
      { value: 'light', label: '1–2 hours', text: 'A lesson or two' },
      { value: 'steady', label: '3–6 hours', text: 'Steady progress' },
      { value: 'serious', label: '7+ hours', text: 'I am serious about this' },
    ],
  },
];

export default function StartPage() {
  const [answers, setAnswers] = useState<Answers>({});
  const step = QUESTIONS.findIndex((q) => !answers[q.key]);
  const done = step === -1;
  const result = done ? recommend(answers as Required<Answers>) : null;
  const career = result?.career ? CAREERS.find((c) => c.id === result.career) : undefined;

  return (
    <div className="container max-w-4xl py-14">
      <h1 className="display-lg">Where to start</h1>
      <p className="lede mt-4 text-fg/85">Four questions, then a path made for you: your first lessons, the career it leads to and the plan that fits your week.</p>

      <ol className="mt-12 space-y-10">
        {QUESTIONS.map((q, i) => {
          if (i > step && !done) return null;
          const chosen = answers[q.key];
          return (
            <li key={q.key} className={cn(i < step || done ? 'opacity-90' : '')}>
              <h2 className="font-display text-2xl font-bold">{q.title}</h2>
              <div className="mt-4 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3" role="radiogroup" aria-label={q.title}>
                {q.options.map((o) => (
                  <button
                    key={o.value}
                    role="radio"
                    aria-checked={chosen === o.value}
                    onClick={() => {
                      const next: Answers = { ...answers, [q.key]: o.value };
                      if (q.key === 'age' && o.value === 'child') Object.assign(next, { goal: 'fun', experience: 'none', time: 'light' });
                      setAnswers(next);
                    }}
                    className={cn(
                      'rounded-2xl border-[1.5px] px-4 py-3.5 text-left transition-colors',
                      chosen === o.value ? 'border-teal bg-teal/[.08]' : 'border-border bg-card hover:border-teal/60',
                    )}
                  >
                    <span className="block font-semibold">{o.label}</span>
                    <span className="block text-[15px] text-fg/70">{o.text}</span>
                  </button>
                ))}
              </div>
            </li>
          );
        })}
      </ol>

      {result && (
        <section className="mt-14 rounded-3xl bg-ink p-7 text-white md:p-10" aria-live="polite">
          <h2 className="display-md">Your path</h2>
          <p className="lede mt-4 text-white/85">{result.why}</p>
          <h3 className="mt-8 font-display text-xl font-bold">Start with</h3>
          <ol className="mt-3 space-y-2">
            {result.kids ? (
              <li><Link to="/kids" className="flex items-center gap-3 rounded-2xl bg-white/[.07] p-4 hover:bg-white/[.12]"><span className="font-kids text-lg font-semibold">The Kids Zone</span><span className="text-white/75">Robo Maze, Turtle Art, Bug Hunt and more</span><ArrowRight className="ml-auto h-5 w-5" /></Link></li>
            ) : (
              result.first.map((id) => {
                const t = getCatalogTrack(id);
                return t ? (
                  <li key={id}><Link to={lessonPath(id)} className="flex items-center gap-3 rounded-2xl bg-white/[.07] p-4 hover:bg-white/[.12]"><TrackMark short={t.short} color={t.color} size={36} /><span className="font-semibold">{t.title}</span><span className="hidden text-white/75 sm:inline">{t.lessons.length} lessons</span><ArrowRight className="ml-auto h-5 w-5" /></Link></li>
                ) : null;
              })
            )}
          </ol>
          {career && (
            <>
              <h3 className="mt-8 font-display text-xl font-bold">Then follow</h3>
              <Link to={`/careers/${career.id}`} className="mt-3 flex items-center gap-3 rounded-2xl bg-white/[.07] p-4 hover:bg-white/[.12]"><CareerMark id={career.id} level={career.level} size={36} /><span className="font-semibold">{career.title}</span><ArrowRight className="ml-auto h-5 w-5" /></Link>
            </>
          )}
          <div className="mt-10 flex flex-wrap gap-3">
            <ButtonLink to={result.kids ? '/kids' : lessonPath(result.first[0]!)} color="accent" size="lg" endIcon={<ArrowRight />}>Start now</ButtonLink>
            {result.plan !== 'free' && <ButtonLink to="/pricing" variant="outlined" color="light" size="lg">See the {result.plan === 'plus' ? 'Plus' : 'Academy'} plan</ButtonLink>}
            <Button variant="text" color="light" size="lg" startIcon={<RotateCcw />} onClick={() => setAnswers({})}>Start over</Button>
          </div>
        </section>
      )}
    </div>
  );
}
