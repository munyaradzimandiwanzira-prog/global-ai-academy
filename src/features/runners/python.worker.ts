/// <reference lib="webworker" />
/**
 * Pyodide (CPython compiled to WebAssembly) running in a dedicated worker so that
 * long-running or infinite loops never freeze the page — the host simply terminates us.
 */
declare const self: DedicatedWorkerGlobalScope;

import { installNetworkGuard } from './network-guard';

// Before Pyodide or any learner code exists: no requests back to this site from Python.
installNetworkGuard();

const PYODIDE_VERSION = '0.29.4';
const INDEX_URL = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;

interface Pyodide {
  runPythonAsync(code: string, opts?: { globals?: unknown }): Promise<unknown>;
  loadPackagesFromImports(code: string, opts?: { messageCallback?: (m: string) => void }): Promise<void>;
  setStdout(opts: { batched: (s: string) => void }): void;
  setStderr(opts: { batched: (s: string) => void }): void;
  globals: { get(name: string): unknown; set(name: string, v: unknown): void };
  toPy(v: unknown): unknown;
}

let pyodidePromise: Promise<Pyodide> | null = null;

const HARNESS = String.raw`
import sys, io, json, traceback, builtins

class _Tee(io.TextIOBase):
    def __init__(self, buf, real):
        self.buf, self.real = buf, real
    def write(self, s):
        self.buf.write(s); self.real.write(s); return len(s)
    def flush(self):
        self.real.flush()

def _friendly(exc):
    if isinstance(exc, SyntaxError):
        line = f"line {exc.lineno}" if exc.lineno else "your code"
        detail = (exc.text or "").rstrip()
        caret = ""
        if detail and exc.offset:
            caret = "\n    " + " " * (exc.offset - 1) + "^"
        return f"{type(exc).__name__} on {line}: {exc.msg}" + (f"\n    {detail.strip()}{caret}" if detail else "")
    frames = [f for f in traceback.extract_tb(exc.__traceback__) if f.filename == "main.py"]
    where = f" (line {frames[-1].lineno})" if frames else ""
    return f"{type(exc).__name__}{where}: {exc}"

def __gaa_run(src, tests, stdin_lines):
    ns = {"__name__": "__main__"}
    buf = io.StringIO()
    real = sys.stdout
    lines = list(stdin_lines)
    def _input(prompt=""):
        print(prompt, end="")
        if not lines:
            raise EOFError("input() needs a value — type it into the Input box before running.")
        v = lines.pop(0)
        print(v)
        return v
    ns["input"] = _input
    result = {"ok": True, "error": None, "test": None, "images": []}
    sys.stdout = _Tee(buf, real)
    try:
        exec(compile(src, "main.py", "exec"), ns)
    except SystemExit:
        pass
    except BaseException as e:
        result["ok"] = False
        result["error"] = _friendly(e)
    finally:
        sys.stdout = real
    if "matplotlib" in sys.modules:
        try:
            import matplotlib.pyplot as plt, base64
            for num in plt.get_fignums():
                b = io.BytesIO()
                plt.figure(num).savefig(b, format="png", dpi=110, bbox_inches="tight")
                result["images"].append("data:image/png;base64," + base64.b64encode(b.getvalue()).decode())
            plt.close("all")
        except Exception:
            pass
    if tests:
        if not result["ok"]:
            result["test"] = {"passed": False, "message": "Your code raised an error before the tests could run:\n" + result["error"]}
        else:
            ns["output"] = buf.getvalue()
            try:
                exec(compile(tests, "tests.py", "exec"), ns)
                result["test"] = {"passed": True}
            except AssertionError as e:
                result["test"] = {"passed": False, "message": str(e) or "A test failed."}
            except BaseException as e:
                result["test"] = {"passed": False, "message": f"{type(e).__name__}: {e}"}
    return json.dumps(result)
`;

async function getPyodide(): Promise<Pyodide> {
  if (!pyodidePromise) {
    pyodidePromise = (async () => {
      self.postMessage({ type: 'status', status: 'Downloading Python (first run only, ~8 MB)…' });
      const mod = (await import(/* @vite-ignore */ `${INDEX_URL}pyodide.mjs`)) as { loadPyodide: (o: object) => Promise<Pyodide> };
      const py = await mod.loadPyodide({ indexURL: INDEX_URL });
      py.setStdout({ batched: (s) => self.postMessage({ type: 'out', kind: 'stdout', text: s }) });
      py.setStderr({ batched: (s) => self.postMessage({ type: 'out', kind: 'stderr', text: s }) });
      await py.runPythonAsync(HARNESS);
      return py;
    })();
    pyodidePromise.catch(() => {
      pyodidePromise = null;
    });
  }
  return pyodidePromise;
}

self.onmessage = async (e: MessageEvent<{ type: 'run' | 'warm'; code?: string; tests?: string; stdin?: string }>) => {
  const msg = e.data;
  try {
    const py = await getPyodide();
    if (msg.type === 'warm') {
      self.postMessage({ type: 'warm' });
      return;
    }
    const code = msg.code ?? '';
    await py.loadPackagesFromImports(code + '\n' + (msg.tests ?? ''), {
      messageCallback: (m) => self.postMessage({ type: 'status', status: m }),
    });
    self.postMessage({ type: 'started' });
    const runner = py.globals.get('__gaa_run') as (a: string, b: string, c: unknown) => string;
    const stdinLines = (msg.stdin ?? '').split('\n').filter((l, i, arr) => l !== '' || i < arr.length - 1);
    const json = runner(code, msg.tests ?? '', py.toPy(stdinLines));
    self.postMessage({ type: 'done', result: JSON.parse(json) });
  } catch (err) {
    self.postMessage({ type: 'done', result: { ok: false, error: `Python could not start: ${(err as Error).message}. Check your internet connection and try again.`, images: [] } });
  }
};
