import { lazy, Suspense, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { compressToEncodedURIComponent } from 'lz-string';
import { Search, Play, ArrowRight, Check } from '@/components/icons';
import { catalog, lessonPath, search as searchCatalog } from '@/lib/catalog';
import { CAREERS } from '@/data/careers';
import type { BillingPeriod, Plan } from '@shared/config';
import { BROWSER_LANGUAGES, type CatalogTrack } from '@shared/content';
import { ButtonLink, TrackMark, CareerMark, Button } from '@/components/ui';
import { PlanCards, PeriodToggle } from '@/features/pricing/PlanCards';
import { WaitlistDialog } from '@/features/pricing/WaitlistDialog';
import { useAuth } from '@/lib/auth';
import { Photo } from '@/components/Photo';
import { useReveal } from '@/lib/reveal';
import { cn } from '@/lib/utils';

const Playground = lazy(() => import('@/features/editor/Playground').then((m) => ({ default: m.Playground })));

const HERO_CODE = `# Mhoroi! Salibonani! Press Run.
name = "Tariro"
city = "Bulawayo"

skills = ["Python", "AI", "Cloud"]
for i, skill in enumerate(skills, start=1):
    print(f"{i}. {name} from {city} is learning {skill}")

print("Shinga! Keep building.")`;

const lessons = catalog.reduce((n, t) => n + t.lessons.length, 0);
const exercises = catalog.reduce((n, t) => n + t.exerciseCount, 0);
const challenges = catalog.reduce((n, t) => n + t.challengeCount, 0);
const quizzes = catalog.reduce((n, t) => n + t.quizCount, 0);
const track = (id: string) => catalog.find((t) => t.id === id);
const tryHref = (lang: string, code: string) => `/playground?lang=${lang}#code=${compressToEncodedURIComponent(code)}`;

function HeroSearch() {
  const [q, setQ] = useState('');
  const navigate = useNavigate();
  const results = q ? searchCatalog(q, 6) : [];
  return (
    <div className="relative max-w-xl">
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          if (results[0]) navigate(lessonPath(results[0].trackId, results[0].slug));
        }}
        className="flex h-14 items-center gap-2 rounded-full bg-white pl-5 pr-1.5"
      >
        <Search className="h-5 w-5 shrink-0 text-ink/50" aria-hidden="true" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search lessons, e.g. loops" className="h-full w-full bg-transparent text-base text-ink outline-none placeholder:text-ink/50" aria-label="Search tutorials" />
        <button className="btn-run h-11 shrink-0">Search</button>
      </form>
      {results.length > 0 && (
        <ul className="absolute inset-x-0 top-full z-20 mt-2 overflow-hidden rounded-3xl bg-card text-fg shadow-float">
          {results.map((r) => (
            <li key={`${r.trackId}/${r.slug}`}>
              <Link to={lessonPath(r.trackId, r.slug)} className="flex items-center gap-3 px-4 py-3 text-[15px] hover:bg-muted">
                <TrackMark short={r.short} color={r.color} size={28} />
                <span className="font-medium">{r.title}</span>
                <span className="ml-auto text-sm text-muted-fg">{r.trackTitle}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** A stone in the wall: one real track, its width set by how many lessons it holds. */
function Stone({ t, tone }: { t: CatalogTrack; tone: string }) {
  return (
    <Link
      to={lessonPath(t.id)}
      title={`${t.title}: ${t.lessons.length} lessons`}
      className={cn('group relative flex min-w-[7.5rem] items-center gap-2.5 rounded-[10px] px-3 py-3 transition-[transform,background-color] duration-200 ease-out hover:-translate-y-0.5', tone)}
      style={{ flexGrow: t.lessons.length, flexBasis: `${t.lessons.length * 0.9}rem`, maxWidth: '58%' }}
    >
      <TrackMark short={t.short} color={t.color} size={30} />
      <span className="min-w-0">
        <span className="block truncate text-[15px] font-semibold leading-tight">{t.title}</span>
        <span className="block text-[13px] leading-tight opacity-75">{t.lessons.length} lessons</span>
      </span>
    </Link>
  );
}

/**
 * The signature: Great Zimbabwe's dry-stone courses as the learning path. Every stone is a real
 * track from the catalogue; each course is a level, laid bottom-up from the Kids Zone ground.
 */
function LearningWall() {
  const byLevel = (pred: (t: CatalogTrack) => boolean) => catalog.filter(pred).sort((a, b) => a.order - b.order);
  const courses: { name: string; note: string; tracks: CatalogTrack[]; tone: string }[] = [
    { name: 'Advanced', note: 'LLMs in production: RAG, agents, guardrails, MLOps', tracks: byLevel((t) => t.level === 'advanced'), tone: 'bg-ink text-white hover:bg-ink-700 dark:bg-ink-600' },
    { name: 'Intermediate', note: 'Back ends, data, mobile, deployment, AI engineering', tracks: byLevel((t) => t.level === 'intermediate'), tone: 'bg-[#C9C5BB] text-ink-900 hover:bg-[#BEB9AE] dark:bg-night-700 dark:text-sand' },
    { name: 'Entry level', note: 'Your first languages and your first real projects', tracks: byLevel((t) => t.level === 'beginner' && t.category !== 'start' && t.category !== 'kids'), tone: 'bg-[#DEDBD3] text-ink-900 hover:bg-[#D3CFC6] dark:bg-night-800 dark:text-sand' },
    { name: 'Foundations', note: 'How computers, editors, terminals and Git work', tracks: byLevel((t) => t.category === 'start'), tone: 'bg-white text-ink-900 hover:bg-sand dark:bg-night dark:text-sand' },
  ];
  const lead = CAREERS.find((c) => c.id === 'lead-platform-ai-engineer');

  return (
    <div className="space-y-2" data-ui>
      {lead && (
        <Link to={`/careers/${lead.id}`} className="flex items-center justify-between gap-4 rounded-[10px] bg-gold px-4 py-4 text-ink-900 transition-colors hover:bg-gold-600" data-reveal style={{ ['--i' as string]: 0 }}>
          <span className="flex items-center gap-3"><CareerMark id={lead.id} level="advanced" size={34} /><span className="font-display text-lg font-bold">Lead Platform AI Engineer</span></span>
          <span className="hidden text-[15px] font-medium sm:block">The capstone: lead the team that runs AI in production</span>
          <ArrowRight className="h-5 w-5 shrink-0" aria-hidden="true" />
        </Link>
      )}
      {courses.map((course, i) => (
        <div key={course.name} data-reveal style={{ ['--i' as string]: i + 1 }}>
          <div className="flex flex-wrap gap-2">
            {course.tracks.map((t) => <Stone key={t.id} t={t} tone={course.tone} />)}
          </div>
          <p className="mt-1.5 text-sm text-fg/70"><strong className="font-semibold text-fg">{course.name}.</strong> {course.note}</p>
        </div>
      ))}
      <Link to="/kids" className="flex items-center justify-between gap-4 rounded-[10px] border-2 border-teal bg-teal-100 px-4 py-4 text-ink-900 transition-colors hover:bg-[#cde7e5] dark:bg-teal/20 dark:text-sand" data-reveal style={{ ['--i' as string]: 5 }}>
        <span className="font-display text-xl font-bold">Kids Zone, where it all starts</span>
        <span className="hidden text-[15px] font-medium sm:block">Robo Maze, Turtle Art, Bug Hunt and more</span>
        <ArrowRight className="h-5 w-5 shrink-0" aria-hidden="true" />
      </Link>
    </div>
  );
}

export default function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [period, setPeriod] = useState<BillingPeriod>('monthly');
  const [waitlist, setWaitlist] = useState(false);
  const page = useReveal<HTMLDivElement>();
  const py = track('python');
  const web = track('html');
  const sql = track('sql');
  const rag = track('rag');
  const featuredCareers = CAREERS.filter((c) => ['python-engineer', 'web-developer', 'data-scientist', 'ai-engineer', 'agentic-ai-engineer', 'android-engineer', 'ios-engineer', 'network-engineer', 'mechatronics-engineer'].includes(c.id));

  const choosePlan = (p: Plan) => {
    if (p.comingSoon) return setWaitlist(true);
    navigate(p.id === 'free' ? (user ? '/dashboard' : '/signup') : '/pricing');
  };

  return (
    <div ref={page}>
      {/* ── Hero: the editor is the picture, and it runs ─────────────────── */}
      <section className="relative isolate overflow-hidden bg-ink text-white dark:bg-night">
        {/* Victoria Falls, Mosi-oa-Tunya: the photograph sits behind the editor and dissolves into ink under the headline. */}
        <Photo
          name="victoria-falls"
          alt=""
          priority
          sizes="(min-width: 1024px) 70vw, 100vw"
          className="absolute inset-y-0 right-0 -z-10 w-full opacity-40 lg:w-[70%] lg:opacity-70 [mask-image:linear-gradient(180deg,#000_0%,transparent_85%)] lg:[mask-image:linear-gradient(90deg,transparent_0%,#000_45%)]"
          imgClassName="object-[60%_45%]"
        />
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(20,43,82,.10)_0%,rgba(20,43,82,.55)_100%)] dark:bg-[linear-gradient(180deg,rgba(14,26,48,.2)_0%,rgba(14,26,48,.7)_100%)]" aria-hidden="true" />
        <div className="container grid [&>*]:min-w-0 items-center gap-12 py-14 md:py-20 lg:grid-cols-[1.02fr_1fr]">
          <div>
            <h1 className="display-xl max-w-[11ch]">Learn to code by running it.</h1>
            <p className="lede mt-6 max-w-xl text-white/85">
              Free tutorials with a live editor on every page, an AI coach when you are stuck, and teachers when you want a class. Built in Harare for Zimbabwean learners, from a child’s first loop to lead AI engineer.
            </p>
            <div className="mt-8"><HeroSearch /></div>
            <div className="mt-6 flex flex-wrap gap-3">
              <ButtonLink to={user ? '/dashboard' : '/learn/python'} color="accent" size="lg" endIcon={<ArrowRight />}>{user ? 'Continue learning' : 'Start Python free'}</ButtonLink>
              <ButtonLink to="/kids" variant="outlined" color="light" size="lg">Kids Zone</ButtonLink>
            </div>
            <p className="mt-8 text-[15px] text-white/80 tabular">{catalog.length} tracks · {lessons} lessons · {challenges} coding challenges · no install, works on a phone</p>
          </div>
          <div className="min-w-0 animate-rise">
            <p className="mb-2 flex items-center justify-between text-sm text-white/90 [text-shadow:0_1px_2px_rgba(12,28,56,.8)]"><span>This editor is live. Press Run.</span><span>Python 3, in your browser</span></p>
            <Suspense fallback={<div className="h-[348px] rounded-2xl bg-night" />}>
              <Playground language="python" initialCode={HERO_CODE} height="300px" />
            </Suspense>
          </div>
        </div>
        <div className="chevron-band" aria-hidden="true" />
      </section>

      {/* ── Python: tutorial + live example (W3Schools' signature, in our colours) ── */}
      {py && (
        <section className="bg-card py-16 md:py-24">
          <div className="container grid [&>*]:min-w-0 items-center gap-12 lg:grid-cols-2">
            <div data-reveal>
              <h2 className="display-lg">Python</h2>
              <p className="lede mt-5 max-w-md text-fg/85">The language of AI, data and automation, and the best first language. Every lesson has code you can run and change.</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <ButtonLink to={lessonPath('python')} color="action" size="lg">Learn Python</ButtonLink>
                <ButtonLink to="/exercises?track=python" variant="outlined" size="lg">Python exercises</ButtonLink>
              </div>
              <p className="mt-5 text-[15px] text-fg/70 tabular">{py.lessons.length} lessons · {py.exerciseCount} exercises · {py.challengeCount} challenges · <Link to="/reference/python" className="font-medium text-teal-600 underline-offset-4 hover:underline">Python reference</Link></p>
            </div>
            <figure data-reveal style={{ ['--i' as string]: 1 }} className="rounded-3xl bg-granite-100 p-5 dark:bg-night-800" data-ui>
              <figcaption className="mb-3 font-display text-lg font-semibold">Python example</figcaption>
              <pre className="overflow-x-auto rounded-2xl bg-white p-5 font-mono text-[14px] leading-relaxed text-ink dark:bg-night dark:text-sand">{`prices = {"mealie meal": 8.5, "cooking oil": 4.2, "sugar": 2.8}
total = sum(prices.values())
print(f"Basket total: \${total:.2f}")`}</pre>
              <ButtonLink to={tryHref('python', 'prices = {"mealie meal": 8.5, "cooking oil": 4.2, "sugar": 2.8}\ntotal = sum(prices.values())\nprint(f"Basket total: ${total:.2f}")')} color="action" className="mt-4" startIcon={<Play className="fill-current" />}>Try it yourself</ButtonLink>
            </figure>
          </div>
        </section>
      )}

      {/* ── Web: code beside what it renders ─────────────────────────────── */}
      {web && (
        <section className="border-t border-border py-16 md:py-24">
          <div className="container">
            <div className="flex flex-wrap items-end justify-between gap-6" data-reveal>
              <div>
                <h2 className="display-lg">HTML, CSS and JavaScript</h2>
                <p className="lede mt-5 max-w-xl text-fg/85">The three languages every web page is made of. Write on the left, see the page on the right.</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <ButtonLink to={lessonPath('html')} color="action" size="lg">Learn HTML</ButtonLink>
                <ButtonLink to={lessonPath('css')} variant="outlined" size="lg">Learn CSS</ButtonLink>
                <ButtonLink to={lessonPath('javascript')} variant="outlined" size="lg">Learn JavaScript</ButtonLink>
              </div>
            </div>
            <div className="mt-12 grid overflow-hidden rounded-[20px] border border-border bg-white text-ink md:grid-cols-2" data-reveal style={{ ['--i' as string]: 1 }} data-ui>
              <pre className="overflow-x-auto bg-night p-6 font-mono text-[14px] leading-relaxed text-sand">{`<h1>Mhoro, Harare!</h1>
<p>Kombi fares today:</p>
<ul>
  <li>CBD to Avondale — $1</li>
  <li>CBD to Highlands — $1</li>
</ul>
<button onclick="this.textContent='Paid!'">
  Pay with EcoCash
</button>`}</pre>
              <div className="p-6">
                <h3 className="font-sans text-3xl font-bold tracking-normal">Mhoro, Harare!</h3>
                <p className="mt-3">Kombi fares today:</p>
                <ul className="mt-2 list-disc pl-6"><li>CBD to Avondale — $1</li><li>CBD to Highlands — $1</li></ul>
                <PaidButton />
                <p className="mt-6"><Link to={tryHref('html', '<h1>Mhoro, Harare!</h1>\n<p>Kombi fares today:</p>\n<ul>\n  <li>CBD to Avondale — $1</li>\n  <li>CBD to Highlands — $1</li>\n</ul>\n<button onclick="this.textContent=\'Paid!\'">\n  Pay with EcoCash\n</button>')} className="font-semibold text-teal-600 underline-offset-4 hover:underline">Open this in the editor →</Link></p>
              </div>
            </div>
            <p className="mt-5 text-[15px] text-fg/70 tabular">{(web?.lessons.length ?? 0) + (track('css')?.lessons.length ?? 0) + (track('javascript')?.lessons.length ?? 0)} lessons across the three, plus TypeScript and React when you are ready.</p>
          </div>
        </section>
      )}

      {/* ── SQL: a query and the table it returns ────────────────────────── */}
      {sql && (
        <section className="bg-card py-16 md:py-24">
          <div className="container grid [&>*]:min-w-0 items-center gap-12 lg:grid-cols-[1fr_1.1fr]">
            <div className="lg:order-2" data-reveal>
              <h2 className="display-lg">SQL</h2>
              <p className="lede mt-5 max-w-md text-fg/85">Ask questions of data. Practise on Zim Traders, a sample database of shops from Mbare to Hwange. This is its real answer.</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <ButtonLink to={lessonPath('sql')} color="primary" size="lg">Learn SQL</ButtonLink>
                <ButtonLink to="/compiler/sql" variant="outlined" size="lg">Open the SQL editor</ButtonLink>
              </div>
            </div>
            <div className="overflow-hidden rounded-[20px] border border-border bg-card" data-reveal style={{ ['--i' as string]: 1 }} data-ui>
              <pre className="overflow-x-auto bg-night p-6 font-mono text-[14px] leading-relaxed text-sand">{`SELECT Province, COUNT(*) AS Customers
FROM Customers
GROUP BY Province
ORDER BY Customers DESC, Province
LIMIT 4;`}</pre>
              <table className="w-full text-left text-[15px] tabular">
                <thead><tr className="border-b border-border"><th className="px-6 py-3 font-semibold">Province</th><th className="px-6 py-3 text-right font-semibold">Customers</th></tr></thead>
                <tbody>
                  {[['Harare', 3], ['Matabeleland North', 2], ['Bulawayo', 1], ['Manicaland', 1]].map(([c, n]) => (
                    <tr key={c} className="border-b border-border last:border-0"><td className="px-6 py-2.5">{c}</td><td className="px-6 py-2.5 text-right">{n}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* ── AI: the track people come for ───────────────────────────────── */}
      {rag && (
        <section className="bg-night py-20 text-white md:py-28">
          <div className="container grid [&>*]:min-w-0 gap-12 lg:grid-cols-[1.1fr_1fr]">
            <div data-reveal>
              <h2 className="display-lg">Build with AI</h2>
              <p className="lede mt-5 max-w-xl text-white/85">From what a model is to production agents: the maths and statistics underneath, LLM APIs, RAG and GraphRAG, MCP and A2A, agentic engineering, evaluations and inference, each with code that runs and pencil-sketch diagrams of every deeper idea.</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <ButtonLink to={lessonPath('ai-fundamentals')} color="accent" size="lg">Start AI fundamentals</ButtonLink>
                <ButtonLink to="/careers/agentic-ai-engineer" variant="outlined" color="light" size="lg">Agentic AI engineer path</ButtonLink>
              </div>
            </div>
            <ul className="grid gap-x-8 self-center sm:grid-cols-2" data-reveal style={{ ['--i' as string]: 1 }}>
              {catalog.filter((t) => t.category === 'ai').sort((a, b) => a.order - b.order).map((t) => (
                <li key={t.id} className="border-b border-white/15">
                  <Link to={lessonPath(t.id)} className="group flex items-center gap-3 py-3">
                    <TrackMark short={t.short} color={t.color} size={30} />
                    <span className="min-w-0 flex-1 truncate font-semibold group-hover:text-gold">{t.title}</span>
                    <span className="shrink-0 text-sm text-white/70 tabular">{t.lessons.length}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* ── Graph Lab: simulated work placements ─────────────────────────── */}
      <section className="bg-granite-100 py-20 dark:bg-night-800 md:py-28">
        <div className="container grid [&>*]:min-w-0 gap-12 lg:grid-cols-[1fr_1.1fr] lg:items-center">
          <div data-reveal>
            <h2 className="display-lg">Work like it's your job</h2>
            <p className="lede mt-5 max-w-xl text-fg/85">The Graph Lab drops you into a company with a manager and a queue of tickets. Trace a supply-chain stock-out, uncover a mobile-money fraud ring, or build an AI tutor's memory, with Cypher on a live graph database in your browser. Every ticket is checked against the real data.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink to="/lab" color="primary" size="lg">Open the Graph Lab</ButtonLink>
              <ButtonLink to={lessonPath('neo4j')} variant="text" size="lg" endIcon={<ArrowRight />}>Learn Neo4j first</ButtonLink>
            </div>
          </div>
          <ol className="space-y-3" data-reveal style={{ ['--i' as string]: 1 }}>
            {[
              ['MON-103', 'MoneyLink · Fraud analyst', 'Money is moving in a circle between three new accounts. Find every account on the loop.'],
              ['ZIM-102', 'ZimFresh · Supply-chain analyst', 'Mutare is out of cooking oil. Which suppliers can restock it, and who sells cheapest?'],
              ['AGE-102', 'AI team · Memory engineer', "Rebuild Rudo's last conversation so the tutor remembers where she left off."],
            ].map(([code, who, ticket]) => (
              <li key={code} className="rounded-2xl border border-border bg-card p-5">
                <p className="flex items-center gap-2 text-xs text-muted-fg"><span className="font-mono">{code}</span> · {who}</p>
                <p className="mt-1.5 font-medium">{ticket}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── The wall: every track, laid by level ─────────────────────────── */}
      <section className="relative isolate overflow-hidden py-16 md:py-24">
        {/* The Great Enclosure itself, faded far back behind the heading: the wall the metaphor comes from. */}
        <Photo
          name="great-zimbabwe-aerial"
          alt=""
          sizes="(min-width: 1024px) 50vw, 100vw"
          className="absolute inset-y-0 left-0 -z-10 w-full opacity-30 dark:opacity-[.18] lg:w-1/2 [mask-image:linear-gradient(180deg,#000_0%,transparent_75%)] lg:[mask-image:linear-gradient(90deg,#000_30%,transparent_100%)]"
          imgClassName="object-[50%_60%] grayscale-[.35]"
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-bg/40 via-bg/10 to-bg/60" aria-hidden="true" />
        <div className="container grid [&>*]:min-w-0 gap-12 lg:grid-cols-[0.8fr_1.6fr]">
          <div data-reveal>
            <h2 className="display-lg">Lay your wall</h2>
            <p className="lede mt-5 text-fg/85">Great Zimbabwe was raised without mortar, one stone at a time. Every stone here is a track you can open now. Each course is a level, from the Kids Zone ground up to lead engineer.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink to="/start" color="primary" size="lg">Find where to start</ButtonLink>
              <ButtonLink to="/tutorials" variant="text" size="lg" endIcon={<ArrowRight />}>All tutorials</ButtonLink>
            </div>
          </div>
          <LearningWall />
        </div>
      </section>

      {/* ── Careers: an index, not cards ─────────────────────────────────── */}
      <section className="bg-card py-16 md:py-24">
        <div className="container grid [&>*]:min-w-0 gap-12 lg:grid-cols-[0.8fr_1.6fr]">
          <div data-reveal>
            <h2 className="display-lg">Pick the job</h2>
            <p className="lede mt-5 text-fg/85">We lay the path. Each career orders its tracks entry level, intermediate, advanced, with a project at every stage that proves you can do the work.</p>
            <ButtonLink to="/careers" variant="outlined" size="lg" className="mt-8">See all {CAREERS.length} career paths</ButtonLink>
          </div>
          <ul className="grid gap-x-8 sm:grid-cols-2" data-reveal style={{ ['--i' as string]: 1 }}>
            {featuredCareers.map((c) => (
              <li key={c.id} className="border-b border-border">
                <Link to={`/careers/${c.id}`} className="group flex items-center gap-4 py-4">
                  <CareerMark id={c.id} level={c.level} size={42} />
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold group-hover:text-teal-600">{c.title}</span>
                    <span className="block text-sm text-fg/70">{c.trackIds.length} tracks · {c.stages.length} projects</span>
                  </span>
                  <ArrowRight className="h-5 w-5 text-fg/40 transition-transform group-hover:translate-x-1 group-hover:text-teal-600" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── Practice: the numbers are the design ─────────────────────────── */}
      <section className="border-y border-border bg-granite-100 py-16 dark:bg-night-800 md:py-20">
        <div className="container grid gap-10 lg:grid-cols-[0.8fr_1.6fr]">
          <h2 className="display-lg max-w-sm" data-reveal>Practise until it sticks</h2>
          <dl className="grid divide-y divide-border border-y border-border sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-4 lg:divide-x" data-reveal style={{ ['--i' as string]: 1 }}>
            {[
              { n: exercises, label: 'Exercises', text: 'Fill-in-the-blank checks on every chapter.', to: '/exercises' },
              { n: challenges, label: 'Coding challenges', text: 'Real tests run on your code, with a weekly challenge.', to: '/challenges' },
              { n: quizzes, label: 'Quiz questions', text: 'In every lesson, then a scored quiz per track.', to: '/quiz' },
              { n: BROWSER_LANGUAGES.length, label: 'Online editors', text: 'Python, JavaScript, TypeScript, SQL, HTML and CSS, no install.', to: '/compiler/python' },
            ].map((s) => (
              <div key={s.label} className="py-5 sm:px-5 lg:first:pl-0">
                <dt className="sr-only">{s.label}</dt>
                <dd>
                  <Link to={s.to} className="group block">
                    <span className="block font-display text-3xl font-extrabold text-ink tabular dark:text-sand">{s.n}</span>
                    <span className="mt-1 block font-semibold text-teal-600 underline-offset-4 group-hover:underline dark:text-teal-400">{s.label}</span>
                    <span className="mt-1 block text-[15px] text-fg/75">{s.text}</span>
                  </Link>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ── Academy: the teacher's real screen ───────────────────────────── */}
      <section className="py-16 md:py-24">
        <div className="container grid [&>*]:min-w-0 items-center gap-12 lg:grid-cols-2">
          <div data-reveal>
            <h2 className="display-lg">A classroom with a teacher</h2>
            <p className="lede mt-5 text-fg/85">Academy gives schools and bootcamps a class with a join code, live sessions, assignments marked first by AI and then by the teacher, and a private report on every learner.</p>
            <ul className="mt-8 space-y-3 text-[16px]">
              {['Progress per learner, per track, at a glance', 'Schedule live classes; AI writes the recap and where you stopped', 'AI drafts assignments and pre-marks submissions; you give the grade', 'Capstone projects reviewed by a mentor'].map((x) => (
                <li key={x} className="flex gap-3"><Check className="mt-0.5 h-5 w-5 shrink-0 text-teal" aria-hidden="true" /> {x}</li>
              ))}
            </ul>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink to="/pricing" color="primary" size="lg">See the Academy plan</ButtonLink>
              <ButtonLink to="/contact" variant="outlined" size="lg">Talk to us about your school</ButtonLink>
            </div>
          </div>
          <div className="relative" data-reveal style={{ ['--i' as string]: 1 }}>
          {/* A real classroom (shown no wider than its source, so it stays sharp), with the teacher's screen over its corner. */}
          <Photo name="classroom" sizes="(min-width: 1024px) 400px, 80vw" className="ml-auto block aspect-[715/429] w-[min(88%,400px)] overflow-hidden rounded-[20px]" />
          <div className="relative -mt-16 w-[min(100%,540px)] overflow-hidden rounded-[20px] border border-border bg-card shadow-float sm:-mt-24" data-ui>
            <div className="flex items-center gap-3 bg-ink px-5 py-4 text-white">
              <span className="font-semibold">Form 4 Computer Science, Harare</span>
              <span className="ml-auto rounded-full bg-white/10 px-3 py-1 text-sm tabular">Join code K7M2QX</span>
            </div>
            <table className="w-full text-left text-[15px] tabular">
              <thead><tr className="border-b border-border text-fg/75"><th className="px-5 py-3 font-medium">Learner</th><th className="px-5 py-3 font-medium">Python</th><th className="px-5 py-3 text-right font-medium">Avg score</th></tr></thead>
              <tbody>
                {([['Tinashe M.', 21, 25, 91], ['Nomvula S.', 16, 25, 78], ['Kudakwashe C.', 10, 25, 66], ['Ruvimbo T.', 4, 25, null]] as const).map(([n, d, total, s]) => (
                  <tr key={n} className="border-b border-border last:border-0">
                    <td className="px-5 py-3 font-medium">{n}</td>
                    <td className="px-5 py-3"><div className="flex items-center gap-3"><div className="h-2 w-28 rounded-full bg-muted"><div className="h-full rounded-full bg-teal" style={{ width: `${(d / total) * 100}%` }} /></div><span className="text-sm text-fg/70">{d}/{total}</span></div></td>
                    <td className="px-5 py-3 text-right">{s ?? <span className="font-medium text-gold-600">Needs a nudge</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="bg-granite-100 px-5 py-3 text-sm text-fg/75 dark:bg-night-700">Next live session: Thursday 15:00 · Loops and lists</p>
          </div>
          </div>
        </div>
      </section>

      {/* ── Plans ────────────────────────────────────────────────────────── */}
      <section className="bg-ink py-20 text-white dark:bg-night-800 md:py-28">
        <div className="container">
          <div className="flex flex-wrap items-end justify-between gap-6" data-reveal>
            <div>
              <h2 className="display-lg">Free to learn</h2>
              <p className="lede mt-4 max-w-xl text-white/80">Pay only for a tutor, a teacher or a mentor. Yearly billing gives you two months free.</p>
            </div>
            <PeriodToggle period={period} onChange={setPeriod} tone="dark" />
          </div>
          <div className="mt-12" data-reveal style={{ ['--i' as string]: 1 }}>
            <PlanCards period={period} tone="dark" currentPlan={user?.plan} onChoose={choosePlan} featureLimit={5} actionLabel={(p) => (p.comingSoon ? 'Join the waitlist' : p.id === 'free' ? 'Start free' : `See ${p.name}`)} />
          </div>
        </div>
      </section>
      <WaitlistDialog open={waitlist} onOpenChange={setWaitlist} />
    </div>
  );
}

/** The one interactive control inside the rendered-page preview. */
function PaidButton() {
  const [paid, setPaid] = useState(false);
  return (
    <Button size="sm" className="mt-4 rounded-md bg-teal text-white hover:bg-teal-600" onClick={() => setPaid(true)}>{paid ? 'Paid!' : 'Pay with EcoCash'}</Button>
  );
}
