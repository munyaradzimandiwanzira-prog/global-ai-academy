import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CheckCircle2, Circle, Lightbulb, Lock, Play, Send, Eye, Database, Briefcase, RotateCcw } from 'lucide-react';
import { SCENARIOS, getScenario, checkTask, type Scenario, type CheckOutcome } from '@/features/graph/scenarios';
import { getDataset } from '@/features/graph/datasets';
import { OutputPanel, TestBanner } from '@/features/editor/OutputPanel';
import type { RunResult } from '@/features/runners';
import { Markdown } from '@/components/Markdown';
import { UpgradeCard } from '@/components/UpgradeCard';
import { Avatar, Button, ButtonLink, ProgressBar } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { celebrate } from '@/lib/celebrate';
import { cn } from '@/lib/utils';
import NotFound from '../NotFound';

const CodeEditor = lazy(() => import('@/features/editor/CodeEditor'));

// Progress and drafts live in this browser only (a practice convenience, not a record).
const STORE_KEY = 'gaa.graphlab.v1';
type LabStore = { solved: Record<string, true>; drafts: Record<string, string> };
function readStore(): LabStore {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) return { solved: {}, drafts: {}, ...JSON.parse(raw) } as LabStore;
  } catch { /* storage unavailable */ }
  return { solved: {}, drafts: {} };
}
function writeStore(s: LabStore) {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(s)); } catch { /* storage unavailable */ }
}
function useLabStore() {
  const [store, setStore] = useState<LabStore>(readStore);
  const update = useCallback((fn: (s: LabStore) => LabStore) => setStore((prev) => { const next = fn(prev); writeStore(next); return next; }), []);
  return [store, update] as const;
}
const key = (s: string, t: string) => `${s}/${t}`;

/** /lab — the job board of simulated work placements. */
export function GraphLabIndex() {
  const [store] = useLabStore();
  const { can } = useAuth();
  const pro = can('content.pro');
  useEffect(() => { document.title = 'Graph Lab: simulated graph database jobs | Global AI Academy'; }, []);

  return (
    <div className="container py-12 md:py-16">
      <div className="max-w-3xl">
        <h1 className="display-lg">Graph Lab</h1>
        <p className="lede mt-4 text-muted-fg">
          A simulated work placement. Pick a company, read the tickets your manager has assigned you, and solve them with Cypher on a live graph database that runs in your browser. Every answer is checked against the real data.
        </p>
        <p className="mt-4 text-sm text-muted-fg">New to graphs? Start with the <Link to="/learn/neo4j" className="font-semibold text-teal-600 underline-offset-4 hover:underline">Neo4j &amp; Graph Databases</Link> track, or experiment freely in the <Link to="/compiler/cypher" className="font-semibold text-teal-600 underline-offset-4 hover:underline">Cypher playground</Link>.</p>
      </div>
      <div className="mt-10 grid gap-5 md:grid-cols-2 [&>*]:min-w-0">
        {SCENARIOS.map((s) => {
          const solved = s.tasks.filter((t) => store.solved[key(s.id, t.id)]).length;
          const ds = getDataset(s.dataset);
          return (
            <Link key={s.id} to={`/lab/${s.id}`} className="group flex flex-col rounded-3xl border border-border bg-card p-6 transition-colors hover:border-teal">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-teal-600">{s.company}</p>
                  <h2 className="mt-1 font-display text-2xl font-bold">{s.role}</h2>
                </div>
                {!pro && s.freeTasks < s.tasks.length && <span className="chip shrink-0 bg-gold-100 text-gold-600">{s.freeTasks} free · {s.tasks.length - s.freeTasks} Plus</span>}
                {(pro || s.freeTasks >= s.tasks.length) && <span className="chip shrink-0 bg-teal-100 text-teal-600">Open</span>}
              </div>
              <p className="mt-3 flex-1 text-[15px] text-muted-fg">{s.summary}</p>
              <p className="mt-4 flex items-center gap-2 text-sm text-muted-fg"><Database className="h-4 w-4" aria-hidden="true" /> {ds?.title}</p>
              <div className="mt-4 flex items-center gap-3 text-sm">
                <ProgressBar value={(solved / s.tasks.length) * 100} className="h-1.5" />
                <span className="shrink-0 tabular text-muted-fg">{solved}/{s.tasks.length} tickets</span>
                <ArrowRight className="h-4 w-4 shrink-0 text-teal-600 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

/** /lab/:scenarioId — the workspace: ticket queue, ticket, editor, results. */
export default function GraphLabScenario() {
  const { scenarioId = '' } = useParams();
  const scenario = getScenario(scenarioId);
  if (!scenario) return <NotFound />;
  return <Workspace key={scenario.id} scenario={scenario} />;
}

function Workspace({ scenario }: { scenario: Scenario }) {
  const { can } = useAuth();
  const pro = can('content.pro');
  const [store, update] = useLabStore();
  const firstOpen = scenario.tasks.findIndex((t) => !store.solved[key(scenario.id, t.id)]);
  const [index, setIndex] = useState(firstOpen === -1 ? 0 : firstOpen);
  const task = scenario.tasks[index]!;
  const locked = !pro && index >= scenario.freeTasks;
  const dataset = getDataset(scenario.dataset)!;
  const starter = `// dataset: ${scenario.dataset}\n// ${task.title}\n`;
  const [code, setCode] = useState(store.drafts[key(scenario.id, task.id)] ?? starter);
  const [result, setResult] = useState<RunResult | null>(null);
  const [running, setRunning] = useState(false);
  const [outcome, setOutcome] = useState<CheckOutcome | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [showSolution, setShowSolution] = useState(false);
  const solvedCount = scenario.tasks.filter((t) => store.solved[key(scenario.id, t.id)]).length;
  const isSolved = !!store.solved[key(scenario.id, task.id)];

  useEffect(() => { document.title = `${task.title} · ${scenario.company} | Graph Lab`; }, [task.title, scenario.company]);
  useEffect(() => {
    setCode(readStore().drafts[key(scenario.id, task.id)] ?? `// dataset: ${scenario.dataset}\n// ${task.title}\n`);
    setResult(null); setOutcome(null); setAttempts(0); setShowHint(false); setShowSolution(false);
  }, [scenario.id, scenario.dataset, task.id, task.title]);

  const onChange = (v: string) => {
    setCode(v);
    update((s) => ({ ...s, drafts: { ...s.drafts, [key(scenario.id, task.id)]: v } }));
  };

  const run = async () => {
    setRunning(true);
    const { runCypherCode } = await import('@/features/runners/cypher');
    // The lab always uses the scenario's own data, whatever the dataset comment says.
    const body = code.replace(/^\s*\/\/\s*dataset:.*$/m, '');
    setResult(await runCypherCode(`// dataset: ${scenario.dataset}\n${body}`));
    setRunning(false);
  };

  const submit = async () => {
    await run();
    const body = code.replace(/^\s*\/\/\s*dataset:.*$/m, '');
    const o = checkTask(scenario.dataset, task, body);
    setOutcome(o);
    setAttempts((a) => a + 1);
    if (o.passed) {
      update((s) => ({ ...s, solved: { ...s.solved, [key(scenario.id, task.id)]: true } }));
      celebrate();
    }
  };

  const reset = () => onChange(starter);

  return (
    <div className="lg:grid lg:grid-cols-[300px_1fr]">
      <aside className="border-b border-border bg-card lg:sticky lg:top-[105px] lg:h-[calc(100vh-105px)] lg:overflow-y-auto lg:border-b-0 lg:border-r" aria-label="Ticket queue">
        <div className="border-b border-border p-5">
          <Link to="/lab" className="flex items-center gap-1.5 text-sm text-muted-fg hover:text-fg"><ArrowLeft className="h-4 w-4" /> All placements</Link>
          <p className="mt-4 text-sm font-semibold text-teal-600">{scenario.company}</p>
          <h1 className="font-display text-xl font-bold">{scenario.role}</h1>
          <div className="mt-3 flex items-center gap-2.5 text-sm">
            <Avatar name={scenario.manager.name} size={28} />
            <span className="leading-tight"><span className="font-medium">{scenario.manager.name}</span><br /><span className="text-xs text-muted-fg">{scenario.manager.title}, your manager</span></span>
          </div>
          <div className="mt-4 flex items-center gap-2 text-xs text-muted-fg"><ProgressBar value={(solvedCount / scenario.tasks.length) * 100} className="h-1.5" /><span className="shrink-0 tabular">{solvedCount}/{scenario.tasks.length}</span></div>
        </div>
        <nav className="py-2">
          {scenario.tasks.map((t, i) => {
            const done = !!store.solved[key(scenario.id, t.id)];
            const lock = !pro && i >= scenario.freeTasks;
            return (
              <button key={t.id} onClick={() => setIndex(i)} aria-current={i === index ? 'true' : undefined}
                className={cn('flex w-full items-center gap-2.5 border-l-4 px-5 py-2.5 text-left text-sm', i === index ? 'border-gold bg-gold-100/60 font-semibold dark:bg-night-700' : 'border-transparent hover:bg-muted')}>
                {done ? <CheckCircle2 className="h-4 w-4 shrink-0 text-teal" aria-label="Solved" /> : lock ? <Lock className="h-4 w-4 shrink-0 text-muted-fg" aria-label="Plus" /> : <Circle className="h-4 w-4 shrink-0 text-border" aria-hidden="true" />}
                <span className="font-mono text-[11px] text-muted-fg">{scenario.id.slice(0, 3).toUpperCase()}-{101 + i}</span>
                <span className="truncate">{t.title}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      <div className="min-w-0 px-4 py-6 md:px-8 lg:py-8">
        <div className="mx-auto max-w-[980px]">
          {locked ? (
            <UpgradeCard
              title="Keep going on the real tickets"
              done={`You've worked through the free tickets at ${scenario.company}. The rest of the placement, and every other lab, opens with Plus.`}
              unlocks={[
                `${scenario.tasks.length - scenario.freeTasks} more tickets here, then ${SCENARIOS.length - 1} other placements`,
                'Every professional track in full: Neo4j, GraphRAG, MCP, agentic engineering, evaluations',
                'Professor Zuva, your AI tutor, beside every lesson and lab',
                'Certificates you can share with employers',
              ]}
            />
          ) : (
            <>
              <article className="rounded-3xl border border-border bg-card p-5 md:p-7">
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-fg">
                  <Briefcase className="h-3.5 w-3.5" aria-hidden="true" />
                  <span className="font-mono">{scenario.id.slice(0, 3).toUpperCase()}-{101 + index}</span>
                  <span>·</span>
                  <span>Assigned by {scenario.manager.name}</span>
                  {isSolved && <span className="chip bg-teal-100 text-teal-600"><CheckCircle2 className="h-3.5 w-3.5" /> Resolved</span>}
                </div>
                <h2 className="mt-2 font-display text-[1.8rem] font-bold leading-tight">{task.title}</h2>
                <div className="prose prose-slate mt-3 max-w-none dark:prose-invert"><Markdown>{task.brief}</Markdown></div>
                <div className="mt-4 flex flex-wrap gap-1.5">{task.skills.map((s) => <span key={s} className="chip bg-muted text-muted-fg">{s}</span>)}</div>
              </article>

              <details className="mt-4 rounded-2xl border border-border bg-card px-5 py-3 text-sm">
                <summary className="cursor-pointer font-semibold">Schema: {dataset.title}</summary>
                <p className="mt-2 text-muted-fg">{dataset.blurb}</p>
                <ul className="mt-2 space-y-1 font-mono text-[12px]">{dataset.schema.map((line) => <li key={line} className="break-words">{line}</li>)}</ul>
                <p className="mt-3 text-muted-fg">Tip: <code className="font-mono">MATCH (n) RETURN n LIMIT 50</code> shows the whole picture.</p>
              </details>

              <div className="mt-4 overflow-hidden rounded-2xl border border-night-700 bg-night">
                <Suspense fallback={<pre className="min-h-[180px] p-4 font-mono text-[13px] text-sand">{code}</pre>}>
                  <CodeEditor value={code} onChange={onChange} language="cypher" onRun={run} minHeight="180px" ariaLabel="Cypher query editor" />
                </Suspense>
                <div className="flex flex-wrap items-center gap-2 border-t border-night-700 bg-night-800 px-3 py-2.5">
                  <Button color="action" size="sm" onClick={run} loading={running} startIcon={<Play className="h-4 w-4 fill-current" />}>Run</Button>
                  <Button color="accent" size="sm" onClick={submit} startIcon={<Send className="h-4 w-4" />}>Submit ticket</Button>
                  <Button variant="text" color="light" size="sm" onClick={() => setShowHint((v) => !v)} startIcon={<Lightbulb className="h-4 w-4" />}>Hint</Button>
                  {attempts >= 2 && !showSolution && <Button variant="text" color="light" size="sm" onClick={() => setShowSolution(true)} startIcon={<Eye className="h-4 w-4" />}>Show a solution</Button>}
                  <Button variant="text" color="light" size="sm" onClick={reset} startIcon={<RotateCcw className="h-4 w-4" />} className="ml-auto">Reset</Button>
                </div>
              </div>
              <p className="mt-1.5 text-xs text-muted-fg">Ctrl/⌘ + Enter runs. Each run starts from fresh data, so experiments never break anything.</p>

              {showHint && <div className="mt-3 rounded-xl border border-gold/40 bg-gold-100/60 px-4 py-3 text-sm dark:bg-night-700"><strong>Hint:</strong> {task.hint}</div>}
              {outcome && <div className="mt-3"><TestBanner passed={outcome.passed} message={outcome.message} /></div>}
              {showSolution && (
                <div className="mt-3 rounded-xl border border-border bg-card p-4 text-sm">
                  <p className="font-semibold">One way to solve it</p>
                  <pre className="mt-2 overflow-x-auto whitespace-pre-wrap rounded-lg bg-night p-3 font-mono text-[12.5px] text-sand">{task.solution}</pre>
                  <p className="mt-2 text-muted-fg">Type it out yourself rather than pasting. Then change one thing and predict the result before you run it.</p>
                </div>
              )}

              <div className="mt-4 min-h-[160px] overflow-hidden rounded-2xl">
                <OutputPanel result={result} live={[]} running={running} status="Running query…" />
              </div>

              <div className="mt-6 flex items-center justify-between">
                {index > 0 ? <Button variant="outlined" size="sm" onClick={() => setIndex(index - 1)} startIcon={<ArrowLeft className="h-4 w-4" />}>Previous ticket</Button> : <span />}
                {index < scenario.tasks.length - 1 && <Button size="sm" onClick={() => setIndex(index + 1)} endIcon={<ArrowRight className="h-4 w-4" />}>Next ticket</Button>}
                {index === scenario.tasks.length - 1 && solvedCount === scenario.tasks.length && <ButtonLink to="/lab" size="sm" color="accent">Placement complete: choose another</ButtonLink>}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

