import { useCallback, useRef, useState } from 'react';
import type { RunLanguage } from '@shared/content';
import { runCode, type OutputLine, type RunOptions, type RunResult } from '@/features/runners';
import { errorMessage } from '@/lib/api';

export function useRunner(language: RunLanguage) {
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState<string>();
  const [live, setLive] = useState<OutputLine[]>([]);
  const [result, setResult] = useState<RunResult | null>(null);
  const runId = useRef(0);

  const run = useCallback(
    async (code: string, opts: Omit<RunOptions, 'onOutput' | 'onStatus'> = {}) => {
      const id = ++runId.current;
      setRunning(true);
      setLive([]);
      setStatus(language === 'python' ? 'Starting Python…' : 'Running…');
      let r: RunResult;
      try {
        r = await runCode(language, code, {
          ...opts,
          onOutput: (l) => id === runId.current && setLive((p) => (p.length > 2000 ? p : [...p, l])),
          onStatus: (s) => id === runId.current && setStatus(s),
        });
      } catch (e) {
        r = { ok: false, lines: [], error: errorMessage(e), durationMs: 0 };
      }
      if (id === runId.current) {
        setResult(r);
        setRunning(false);
        setStatus(undefined);
      }
      return r;
    },
    [language],
  );

  const reset = useCallback(() => {
    runId.current++;
    setResult(null);
    setLive([]);
    setRunning(false);
  }, []);

  return { run, reset, running, status, live, result, setResult };
}
