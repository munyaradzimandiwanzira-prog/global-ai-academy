import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { Play, RotateCcw, Copy, Share2, Keyboard, Server } from 'lucide-react';
import { toast } from 'sonner';
import { compressToEncodedURIComponent } from 'lz-string';
import { useQuery } from '@tanstack/react-query';
import type { RunLanguage } from '@shared/content';
import { isBrowserRunnable, LANGUAGE_LABELS } from '@/features/runners';
import { OutputPanel } from './OutputPanel';
import { useRunner } from './useRunner';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Spinner } from '@/components/ui';

const CodeEditor = lazy(() => import('./CodeEditor'));

export function EditorFallback({ height = '260px' }: { height?: string }) {
  return (
    <div className="flex items-center justify-center bg-night" style={{ minHeight: height }}>
      <Spinner className="text-sand/60" label="Loading editor…" />
    </div>
  );
}

export function useRemoteRunner() {
  return useQuery({ queryKey: ['runner'], queryFn: () => api.get<{ remote: boolean }>('/api/ai/runner'), staleTime: Infinity }).data?.remote ?? false;
}

interface PlaygroundProps {
  language: RunLanguage;
  initialCode: string;
  expectedOutput?: string;
  /** Full-height layout for the standalone playground page. */
  fullscreen?: boolean;
  height?: string;
  onCodeChange?: (code: string) => void;
  autoRun?: boolean;
}

/** The "Try it Yourself" editor: code on the left, result on the right. */
export function Playground({ language, initialCode, expectedOutput, fullscreen, height = '320px', onCodeChange, autoRun }: PlaygroundProps) {
  const [code, setCode] = useState(initialCode);
  const [stdin, setStdin] = useState('');
  const [showStdin, setShowStdin] = useState(false);
  const { run, reset, running, status, live, result } = useRunner(language);
  const remote = useRemoteRunner();
  const runnable = isBrowserRunnable(language) || remote;

  useEffect(() => {
    setCode(initialCode);
    reset();
  }, [initialCode, language, reset]);

  const handleRun = useCallback(() => {
    if (!runnable) return;
    void run(code, { stdin });
  }, [run, code, stdin, runnable]);

  useEffect(() => {
    if (autoRun && runnable && (language === 'html' || language === 'css')) void run(initialCode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRun, initialCode, language]);

  const share = async () => {
    const url = `${location.origin}/playground?lang=${language}#code=${compressToEncodedURIComponent(code)}`;
    await navigator.clipboard.writeText(url);
    toast.success('Shareable link copied');
  };

  const editorHeight = fullscreen ? '100%' : height;

  return (
    <div className={cn('overflow-hidden rounded-xl border border-night-700 bg-night shadow-lift', fullscreen && 'flex h-full flex-col rounded-none border-0')}>
      <div className="flex flex-wrap items-center gap-2 border-b border-night-700 bg-night-800 px-3 py-2">
        <button onClick={handleRun} disabled={running || !runnable} className="btn-run btn-sm" title="Run (Ctrl/⌘ + Enter)">
          <Play className="h-3.5 w-3.5 fill-current" /> {running ? 'Running…' : 'Run'}
        </button>
        <span className="rounded bg-night-700 px-2 py-0.5 font-mono text-[11px] text-sand/70">{LANGUAGE_LABELS[language]}</span>
        {!isBrowserRunnable(language) && <span className="flex items-center gap-1 text-[11px] text-sand/50"><Server className="h-3 w-3" /> {remote ? 'runs on server' : 'server runner off'}</span>}
        <div className="ml-auto flex items-center gap-1">
          {!['html', 'css', 'sql', 'cypher'].includes(language) && (
            <button onClick={() => setShowStdin((s) => !s)} className={cn('rounded p-1.5 text-sand/60 hover:bg-night-700 hover:text-sand', showStdin && 'text-gold')} title="Program input (stdin)" aria-pressed={showStdin}>
              <Keyboard className="h-4 w-4" />
            </button>
          )}
          <button onClick={() => { setCode(initialCode); reset(); }} className="rounded p-1.5 text-sand/60 hover:bg-night-700 hover:text-sand" title="Reset code">
            <RotateCcw className="h-4 w-4" />
          </button>
          <button onClick={() => { void navigator.clipboard.writeText(code); toast.success('Code copied'); }} className="rounded p-1.5 text-sand/60 hover:bg-night-700 hover:text-sand" title="Copy code">
            <Copy className="h-4 w-4" />
          </button>
          <button onClick={share} className="rounded p-1.5 text-sand/60 hover:bg-night-700 hover:text-sand" title="Copy share link">
            <Share2 className="h-4 w-4" />
          </button>
        </div>
      </div>
      {showStdin && (
        <div className="border-b border-night-700 bg-night-800 px-3 py-2">
          <label className="mb-1 block text-[11px] font-medium text-sand/60" htmlFor="stdin">Input — one value per line, used by input()</label>
          <textarea id="stdin" value={stdin} onChange={(e) => setStdin(e.target.value)} rows={2} className="w-full rounded bg-night px-2 py-1 font-mono text-xs text-sand outline-none ring-1 ring-night-700 focus:ring-teal" />
        </div>
      )}
      <div className={cn('grid md:grid-cols-2', fullscreen && 'min-h-0 flex-1')}>
        <div className={cn('min-w-0 border-night-700 md:border-r', fullscreen && 'min-h-[300px] overflow-auto')}>
          <Suspense fallback={<EditorFallback height={height} />}>
            <CodeEditor
              value={code}
              onChange={(v) => { setCode(v); onCodeChange?.(v); }}
              language={language}
              onRun={handleRun}
              height={editorHeight}
              minHeight={fullscreen ? undefined : '180px'}
            />
          </Suspense>
        </div>
        <div className={cn('min-w-0 border-t border-night-700 md:border-t-0', fullscreen ? 'min-h-[260px]' : '')} style={fullscreen ? undefined : { height }}>
          {runnable ? (
            <OutputPanel result={result} live={live} status={status} running={running} className="h-full" />
          ) : (
            <div className="flex h-full flex-col bg-night p-4 text-sm text-sand/80">
              <p className="mb-2 font-medium text-gold">Expected output</p>
              <pre className="flex-1 overflow-auto whitespace-pre-wrap rounded bg-night-800 p-3 font-mono text-[13px]">{expectedOutput ?? 'Run this program in your own IDE to see the output.'}</pre>
              <p className="mt-3 text-xs text-sand/50">{LANGUAGE_LABELS[language]} runs on our server runner, which is not switched on yet. Install the tools from the setup lesson to run it locally.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
