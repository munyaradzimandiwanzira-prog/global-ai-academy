import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { CheckCircle2, XCircle, Terminal, Clock } from 'lucide-react';
import type { RunResult, OutputLine } from '@/features/runners';
import { cn } from '@/lib/utils';

const GraphView = lazy(() => import('@/features/graph/GraphView'));

/**
 * Renders learner HTML in /sandbox/preview: an opaque-origin, sandboxed document with its own CSP
 * (see worker/sandbox.ts). The frame says "ready", then receives the HTML to render. A new `key`
 * per render gives every run a fresh document, so nothing leaks between runs.
 */
export function HtmlPreview({ html, onTest, onConsole, className }: { html: string; onTest?: (passed: boolean, message?: string) => void; onConsole?: (line: OutputLine) => void; className?: string }) {
  const ref = useRef<HTMLIFrameElement>(null);
  const [run, setRun] = useState(0);
  const htmlRef = useRef(html);
  useEffect(() => {
    htmlRef.current = html;
    setRun((n) => n + 1);
  }, [html]);
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.source !== ref.current?.contentWindow) return;
      if (e.data?.__gaaSandbox === 'ready') {
        // The sandbox is an opaque origin, so '*' is the only target that reaches it; the payload is the learner's own page.
        ref.current?.contentWindow?.postMessage({ __gaaSandbox: 'render', html: htmlRef.current }, '*');
        return;
      }
      if (!e.data?.__gaa) return;
      if (e.data.type === 'test') onTest?.(e.data.passed, e.data.message);
      if (e.data.type === 'out') onConsole?.({ kind: e.data.kind, text: e.data.text });
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [onTest, onConsole]);
  return (
    <iframe
      key={run}
      ref={ref}
      title="Result preview"
      sandbox="allow-scripts allow-modals"
      src="/sandbox/preview"
      className={cn('h-full min-h-[240px] w-full rounded-b-lg bg-white', className)}
    />
  );
}

export function OutputPanel({ result, live, status, running, className }: { result: RunResult | null; live: OutputLine[]; status?: string; running: boolean; className?: string }) {
  const [consoleLines, setConsoleLines] = useState<OutputLine[]>([]);
  useEffect(() => { setConsoleLines([]); }, [result]);
  const lines = running ? live : (result?.lines ?? []).filter((l) => !(result?.hideStdout && l.kind === 'stdout'));

  if (result?.html !== undefined) {
    return (
      <div className={cn('flex h-full flex-col', className)}>
        <HtmlPreview html={result.html} onConsole={(l) => setConsoleLines((p) => [...p, l])} className="flex-1" />
        {consoleLines.length > 0 && (
          <pre className="max-h-32 overflow-auto border-t border-night-700 bg-night px-3 py-2 font-mono text-xs text-sand">
            {consoleLines.map((l, i) => (
              <div key={i} className={l.kind === 'stderr' ? 'text-red-300' : ''}>{l.text}</div>
            ))}
          </pre>
        )}
      </div>
    );
  }

  return (
    <div className={cn('flex h-full flex-col bg-night text-sand', className)}>
      <div className="flex items-center justify-between border-b border-night-700 px-3 py-1.5 text-xs text-sand/60">
        <span className="flex items-center gap-1.5"><Terminal className="h-3.5 w-3.5" /> Output</span>
        {result && !running && <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {result.durationMs} ms</span>}
      </div>
      <div className="flex-1 overflow-auto p-3 font-mono text-[13px] leading-relaxed" aria-live="polite">
        {running && status && <div className="mb-1 text-gold">{status}</div>}
        {!running && !result && <div className="text-sand/40">Press Run (or Ctrl/⌘ + Enter) to see the result here.</div>}
        {lines.map((l, i) => (
          <div key={i} className={cn('whitespace-pre-wrap break-words', l.kind === 'stderr' && 'text-red-300', l.kind === 'info' && 'text-teal-400', l.kind === 'system' && 'text-sand/50')}>
            {l.text || ' '}
          </div>
        ))}
        {!running && result?.images?.map((src, i) => <img key={i} src={src} alt={`Plot ${i + 1}`} className="my-2 max-w-full rounded bg-white" />)}
        {!running && result?.graph && (
          <Suspense fallback={null}>
            <GraphView graph={result.graph} className="my-2" />
          </Suspense>
        )}
        {!running && result?.table?.map((t, ti) => (
          <div key={ti} className="my-2 overflow-x-auto rounded border border-night-700">
            <table className="w-full text-left text-xs">
              <thead className="bg-night-700 text-gold">
                <tr>{t.columns.map((c) => <th key={c} className="px-2.5 py-1.5 font-semibold">{c}</th>)}</tr>
              </thead>
              <tbody>
                {t.rows.map((r, ri) => (
                  <tr key={ri} className="border-t border-night-700">
                    {r.map((v, vi) => <td key={vi} className="px-2.5 py-1">{v === null ? <span className="text-sand/40">NULL</span> : String(v)}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="bg-night-800 px-2.5 py-1 text-[11px] text-sand/50">{t.rows.length} row{t.rows.length === 1 ? '' : 's'}</div>
          </div>
        ))}
        {!running && result?.error && <div className="mt-2 whitespace-pre-wrap rounded border border-red-400/30 bg-red-500/10 p-2 text-red-200">{result.error}</div>}
      </div>
    </div>
  );
}

export function TestBanner({ passed, message }: { passed: boolean; message?: string }) {
  return (
    <div className={cn('flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm', passed ? 'border-teal/30 bg-teal-100 text-teal-600' : 'border-red-300 bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-200')}>
      {passed ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : <XCircle className="mt-0.5 h-4 w-4 shrink-0" />}
      <div className="min-w-0">
        <div className="font-semibold">{passed ? 'All tests passed. Nicely done!' : 'Not quite yet'}</div>
        {!passed && message && <pre className="mt-1 whitespace-pre-wrap font-mono text-xs">{message}</pre>}
      </div>
    </div>
  );
}
