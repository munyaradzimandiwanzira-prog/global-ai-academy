import type { OutputLine, RunOptions, RunResult } from './types';
import { NETWORK_GUARD_SOURCE } from './network-guard';

/**
 * Runs JavaScript/TypeScript in a throw-away Web Worker created from a Blob.
 * Workers have no DOM and no access to the page, and can be terminated on timeout.
 * Tests run in the same async scope after the learner's code, with `assert` and `output` available.
 */

const PRELUDE = `
const __lines = [];
const __fmt = (v, depth = 0) => {
  if (typeof v === 'string') return depth ? JSON.stringify(v) : v;
  if (v === undefined) return 'undefined';
  if (typeof v === 'function') return '[Function ' + (v.name || 'anonymous') + ']';
  if (typeof v === 'bigint') return v + 'n';
  if (typeof v === 'symbol') return v.toString();
  if (v instanceof Error) return v.name + ': ' + v.message;
  if (v instanceof Map) return 'Map(' + v.size + ') {' + [...v].map(([k, x]) => __fmt(k, 1) + ' => ' + __fmt(x, 1)).join(', ') + '}';
  if (v instanceof Set) return 'Set(' + v.size + ') {' + [...v].map((x) => __fmt(x, 1)).join(', ') + '}';
  if (Array.isArray(v)) return depth > 3 ? '[Array]' : '[ ' + v.map((x) => __fmt(x, depth + 1)).join(', ') + ' ]';
  if (v && typeof v === 'object') {
    if (depth > 3) return '[Object]';
    const entries = Object.entries(v).map(([k, x]) => (/^[A-Za-z_$][\\w$]*$/.test(k) ? k : JSON.stringify(k)) + ': ' + __fmt(x, depth + 1));
    const name = v.constructor && v.constructor.name !== 'Object' ? v.constructor.name + ' ' : '';
    return name + (entries.length ? '{ ' + entries.join(', ') + ' }' : '{}');
  }
  return String(v);
};
const __emit = (kind) => (...args) => {
  const text = args.map((a) => __fmt(a)).join(' ');
  if (kind === 'stdout') __lines.push(text);
  postMessage({ type: 'out', kind, text });
};
const console = {
  log: __emit('stdout'), info: __emit('stdout'), debug: __emit('stdout'),
  warn: __emit('stderr'), error: __emit('stderr'),
  table: (d) => __emit('stdout')(JSON.stringify(d, null, 2)),
  clear: () => {},
};
const prompt = (msg) => { const v = __stdin.shift(); __emit('stdout')((msg || '') + (v ?? '')); return v ?? null; };
const alert = (msg) => __emit('info')('[alert] ' + msg);
class AssertionError extends Error { constructor(m) { super(m); this.name = 'AssertionError'; } }
const assert = (cond, msg) => { if (!cond) throw new AssertionError(msg || 'Assertion failed'); };
assert.equal = (a, b, msg) => assert(a === b, msg || ('Expected ' + __fmt(b, 1) + ' but got ' + __fmt(a, 1)));
assert.deepEqual = (a, b, msg) => assert(JSON.stringify(a) === JSON.stringify(b), msg || ('Expected ' + __fmt(b, 1) + ' but got ' + __fmt(a, 1)));
`;

function lineOffset(src: string) {
  return src.split('\n').length;
}

async function maybeTranspile(code: string, typescript: boolean): Promise<string> {
  if (!typescript) return code;
  const { transform } = await import('sucrase');
  return transform(code, { transforms: ['typescript'], disableESTransforms: true }).code;
}

export async function runJavaScript(code: string, opts: RunOptions & { typescript?: boolean }): Promise<RunResult> {
  const started = performance.now();
  const lines: OutputLine[] = [];
  let compiled: string;
  try {
    compiled = await maybeTranspile(code, !!opts.typescript);
  } catch (e) {
    return { ok: false, lines, error: `TypeScript error: ${(e as Error).message}`, durationMs: 0 };
  }

  const stdin = JSON.stringify((opts.stdin ?? '').split('\n'));
  const header = `${NETWORK_GUARD_SOURCE}\n${PRELUDE}\nconst __stdin = ${stdin};\n(async () => {\nlet __error = null;\ntry {\n`;
  const offset = lineOffset(header) - 1;
  const testsBlock = opts.tests
    ? `\n;try { const output = __lines.join('\\n'); ${opts.tests}\n; postMessage({ type: 'test', passed: true }); } catch (t) { postMessage({ type: 'test', passed: false, message: (t && t.message) || String(t) }); }`
    : '';
  const source = `${header}${compiled}\n${testsBlock}\n} catch (e) { __error = e; postMessage({ type: 'error', name: e && e.name, message: e && e.message, stack: e && e.stack }); }\npostMessage({ type: 'done' });\n})();`;

  const blobUrl = URL.createObjectURL(new Blob([source], { type: 'text/javascript' }));
  const worker = new Worker(blobUrl);
  const timeoutMs = opts.timeoutMs ?? 5000;

  return new Promise<RunResult>((resolve) => {
    let error: string | undefined;
    let test: RunResult['test'];
    const finish = (extraError?: string) => {
      clearTimeout(timer);
      worker.terminate();
      URL.revokeObjectURL(blobUrl);
      const err = extraError ?? error;
      if (opts.tests && !test) test = { passed: false, message: err ? `Your code raised an error before the tests finished:\n${err}` : 'Tests did not run.' };
      resolve({ ok: !err, lines, error: err, test, durationMs: Math.round(performance.now() - started) });
    };
    const timer = setTimeout(
      () => finish(`Your program ran for more than ${timeoutMs / 1000} seconds and was stopped. Look for a loop that never ends.`),
      timeoutMs,
    );
    worker.onmessage = (e) => {
      const m = e.data;
      if (m.type === 'out') {
        const line: OutputLine = { kind: m.kind, text: m.text };
        lines.push(line);
        opts.onOutput?.(line);
      } else if (m.type === 'error') {
        const lineMatch = /<anonymous>:(\d+):\d+/.exec(m.stack ?? '') ?? /blob:[^:]+:[^:]+:(\d+):\d+/.exec(m.stack ?? '');
        const where = lineMatch ? ` (line ${Number(lineMatch[1]) - offset})` : '';
        error = `${m.name ?? 'Error'}${where}: ${m.message}`;
      } else if (m.type === 'test') {
        test = { passed: m.passed, message: m.message };
      } else if (m.type === 'done') {
        finish();
      }
    };
    worker.onerror = (e) => {
      e.preventDefault();
      const where = e.lineno ? ` (line ${e.lineno - offset})` : '';
      finish(`${e.message.replace(/^Uncaught /, '')}${where}`);
    };
  });
}
