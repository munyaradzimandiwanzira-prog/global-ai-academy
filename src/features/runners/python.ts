import type { OutputLine, RunOptions, RunResult } from './types';

/**
 * Manages a single long-lived Pyodide worker. If code runs past the timeout (e.g. an
 * infinite loop) the worker is terminated and a fresh one is created for the next run.
 */
let worker: Worker | null = null;
let busy = false;

function spawn(): Worker {
  worker = new Worker(new URL('./python.worker.ts', import.meta.url), { type: 'module' });
  return worker;
}

export function warmPython() {
  if (!worker) spawn().postMessage({ type: 'warm' });
}

export async function runPython(code: string, opts: RunOptions): Promise<RunResult> {
  if (busy) {
    worker?.terminate();
    worker = null;
  }
  const w = worker ?? spawn();
  busy = true;
  const started = performance.now();
  const lines: OutputLine[] = [];
  const timeoutMs = opts.timeoutMs ?? 10_000;

  return new Promise<RunResult>((resolve) => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const finish = (r: Omit<RunResult, 'lines' | 'durationMs'>) => {
      clearTimeout(timer);
      w.removeEventListener('message', onMessage);
      busy = false;
      resolve({ ...r, lines, durationMs: Math.round(performance.now() - started) });
    };
    const onMessage = (e: MessageEvent) => {
      const m = e.data;
      if (m.type === 'status') opts.onStatus?.(m.status);
      else if (m.type === 'started') {
        opts.onStatus?.('Running…');
        timer = setTimeout(() => {
          w.terminate();
          worker = null;
          finish({
            ok: false,
            error: `Your program ran for more than ${timeoutMs / 1000} seconds and was stopped. Check for a loop that never ends (for example a while loop whose condition never becomes False).`,
            test: opts.tests ? { passed: false, message: 'The program did not finish in time.' } : undefined,
          });
        }, timeoutMs);
      } else if (m.type === 'out') {
        for (const text of String(m.text).split('\n')) {
          const line: OutputLine = { kind: m.kind, text };
          lines.push(line);
          opts.onOutput?.(line);
        }
      } else if (m.type === 'done') {
        finish({ ok: m.result.ok, error: m.result.error ?? undefined, test: m.result.test ?? undefined, images: m.result.images ?? [] });
      }
    };
    w.addEventListener('message', onMessage);
    w.postMessage({ type: 'run', code, tests: opts.tests, stdin: opts.stdin });
  });
}
