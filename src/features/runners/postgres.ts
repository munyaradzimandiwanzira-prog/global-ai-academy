import type { RunOptions, RunResult } from './types';
import type { PgRequest, PgResponse, PgTable } from './postgres.worker';

/**
 * Runs PostgreSQL (with pgvector) in a worker. The first run downloads and starts Postgres
 * (about 5 MB compressed, then cached by the browser); later runs reuse it and take milliseconds.
 * A query that runs too long terminates the worker; the next run starts a fresh one.
 *
 * Start a code block with `-- dataset: empty` to begin from an empty database instead of the
 * Zim Traders sample data.
 */
let worker: Worker | null = null;
let warm = false;
let seq = 0;

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker(new URL('./postgres.worker.ts', import.meta.url), { type: 'module' });
    warm = false;
  }
  return worker;
}

function kill() {
  worker?.terminate();
  worker = null;
}

const FIRST_RUN_MS = 60_000;
const RUN_MS = 10_000;

function call(req: Omit<PgRequest, 'id'>, onStatus?: (s: string) => void): Promise<PgResponse> {
  const w = getWorker();
  const id = ++seq;
  if (!warm) onStatus?.('Starting PostgreSQL in your browser (first run only)…');
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      kill();
      resolve({ id, error: `Stopped after ${(warm ? RUN_MS : FIRST_RUN_MS) / 1000} seconds. Check for a query that never finishes, such as a huge generate_series or a missing join condition.` });
    }, warm ? RUN_MS : FIRST_RUN_MS);
    const onMessage = (e: MessageEvent<PgResponse>) => {
      if (e.data.id !== id) return;
      clearTimeout(timer);
      w.removeEventListener('message', onMessage);
      warm = true;
      resolve(e.data);
    };
    w.addEventListener('message', onMessage);
    w.postMessage({ ...req, id });
  });
}

const datasetOf = (code: string): PgRequest['dataset'] => (/^\s*--\s*dataset:\s*empty\b/im.test(code) ? 'empty' : 'zim');
const lastRows = (t?: PgTable[]) => JSON.stringify(t?.[t.length - 1]?.rows ?? []);

export async function runPostgres(code: string, opts: RunOptions): Promise<RunResult> {
  const started = performance.now();
  const res = await call({ code, tests: opts.tests, dataset: datasetOf(code) }, opts.onStatus);
  const error = res.error ? `PostgreSQL error: ${res.error}` : undefined;
  let test: RunResult['test'];
  if (opts.tests) {
    if (error) test = { passed: false, message: error };
    else if (res.expectedError) test = { passed: false, message: `The checker's own query failed: ${res.expectedError}` };
    else if (lastRows(res.tables) === lastRows(res.expected)) test = { passed: true };
    else {
      const got = res.tables?.[res.tables.length - 1]?.rows.length ?? 0;
      const want = res.expected?.[res.expected.length - 1]?.rows.length ?? 0;
      test = { passed: false, message: `Your last query returned ${got} row(s); the expected result has ${want}. Compare the columns, filters, ORDER BY and rounding.` };
    }
  }
  const lines = !error && !res.tables?.length ? [{ kind: 'info' as const, text: res.affected ? `Done. ${res.affected} row(s) affected.` : 'Statement ran. No rows returned.' }] : [];
  return { ok: !error, error, table: res.tables, test, lines, durationMs: Math.round(performance.now() - started) };
}
