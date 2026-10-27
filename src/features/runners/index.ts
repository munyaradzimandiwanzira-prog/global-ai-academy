import type { RunLanguage } from '@shared/content';
import { api } from '@/lib/api';
import { compareOutput, type OutputLine, type RunOptions, type RunResult } from './types';

export * from './types';

export const isBrowserRunnable = (lang: RunLanguage) => ['python', 'javascript', 'typescript', 'html', 'css', 'sql'].includes(lang);

async function runRemote(lang: RunLanguage, code: string, opts: RunOptions): Promise<RunResult> {
  const started = performance.now();
  opts.onStatus?.('Compiling and running on the server…');
  const r = await api.post<{ stdout: string; stderr: string; status: string; ok: boolean }>('/api/ai/run', { language: lang, code, stdin: opts.stdin });
  const lines: OutputLine[] = [
    ...r.stdout.split('\n').map((text) => ({ kind: 'stdout' as const, text })),
    ...(r.stderr ? r.stderr.split('\n').map((text) => ({ kind: 'stderr' as const, text })) : []),
  ];
  return { ok: r.ok, lines, error: r.ok ? undefined : `${r.status}${r.stderr ? `\n${r.stderr}` : ''}`, durationMs: Math.round(performance.now() - started) };
}

/** Single entry point used by every editor in the app. */
export async function runCode(lang: RunLanguage, code: string, opts: RunOptions = {}): Promise<RunResult> {
  let result: RunResult;
  switch (lang) {
    case 'python': {
      const { runPython } = await import('./python');
      result = await runPython(code, opts);
      break;
    }
    case 'javascript':
    case 'typescript': {
      const { runJavaScript } = await import('./javascript');
      result = await runJavaScript(code, { ...opts, typescript: lang === 'typescript' });
      break;
    }
    case 'sql': {
      const { runSql } = await import('./sql');
      result = await runSql(code, opts);
      break;
    }
    case 'html':
    case 'css': {
      const { runHtml } = await import('./html');
      result = await runHtml(code, { ...opts, lang });
      break;
    }
    default:
      result = await runRemote(lang, code, opts);
  }
  // Output-matching challenges (any language) are checked here.
  if (opts.expectedOutput != null && !opts.tests && lang !== 'html' && lang !== 'css') {
    const stdout = result.lines.filter((l) => l.kind === 'stdout').map((l) => l.text).join('\n');
    result.test = result.error ? { passed: false, message: result.error } : compareOutput(stdout, opts.expectedOutput);
  }
  return result;
}
