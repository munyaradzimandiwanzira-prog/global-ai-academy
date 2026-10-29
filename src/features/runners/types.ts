import type { RunLanguage } from '@shared/content';

export type OutputLine = { kind: 'stdout' | 'stderr' | 'info' | 'system'; text: string };

export interface TestResult {
  passed: boolean;
  message?: string;
}

export interface RunResult {
  ok: boolean;
  lines: OutputLine[];
  /** Readable error (traceback trimmed to the learner's code). */
  error?: string;
  /** Present when tests were supplied. */
  test?: TestResult;
  images?: string[]; // data URLs (matplotlib figures)
  table?: { columns: string[]; rows: unknown[][] }[];
  html?: string; // rendered document for html/css
  graph?: import('@/features/graph/types').ViewGraph; // nodes and relationships returned by a Cypher query
  /** stdout is kept for output checks but not displayed (the table shows the same data). */
  hideStdout?: boolean;
  durationMs: number;
}

export interface RunOptions {
  stdin?: string;
  tests?: string;
  expectedOutput?: string;
  onOutput?: (line: OutputLine) => void;
  onStatus?: (status: string) => void;
  timeoutMs?: number;
}

export type Runner = (code: string, opts: RunOptions) => Promise<RunResult>;

export const LANGUAGE_LABELS: Record<RunLanguage, string> = {
  python: 'Python',
  javascript: 'JavaScript',
  typescript: 'TypeScript',
  html: 'HTML',
  css: 'CSS',
  sql: 'SQL',
  postgres: 'PostgreSQL',
  java: 'Java',
  kotlin: 'Kotlin',
  php: 'PHP',
  cpp: 'C++',
  c: 'C',
  swift: 'Swift',
  bash: 'Bash',
  go: 'Go',
  cypher: 'Cypher',
  text: 'Text',
};

export function compareOutput(actual: string, expected: string): TestResult {
  const norm = (s: string) => s.replace(/\r\n/g, '\n').split('\n').map((l) => l.trimEnd()).join('\n').trim();
  if (norm(actual) === norm(expected)) return { passed: true };
  return { passed: false, message: `Expected output:\n${norm(expected)}\n\nYour output:\n${norm(actual) || '(nothing printed)'}` };
}
