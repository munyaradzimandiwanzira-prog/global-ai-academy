import { cn } from '@/lib/utils';

/**
 * A drawn mark for each track: the track's own colour and a short monogram, set in the display face.
 * Replaces emoji icons (they render differently on every phone and read as placeholder art).
 */
const MONOGRAMS: Record<string, string> = {
  PYTHON: 'Py', HTML: '</>', CSS: 'CSS', JAVASCRIPT: 'JS', TYPESCRIPT: 'TS', REACT: 'Re', SQL: 'SQL', JAVA: 'Jv',
  KOTLIN: 'Kt', PHP: 'php', 'C++': 'C++', GIT: 'Git', 'VS CODE': 'VS', IDES: 'IDE', TERMINAL: '>_', START: 'Go',
  NETWORKING: 'Net', DEPLOY: 'Ops', SECURITY: 'Sec', BACKEND: 'API', ANDROID: 'An', IOS: 'Sw', MECHATRONICS: 'IoT',
  'DATA SCIENCE': 'DS', ML: 'ML', AI: 'AI', PROMPTS: 'Pr', 'LLM APIS': 'LLM', 'HUGGING FACE': 'HF', LANGCHAIN: 'LC',
  RAG: 'RAG', GUARDRAILS: 'GR', AGENTS: 'Ag', WORKFLOWS: 'Wf', MLOPS: 'ML Ops', KIDS: 'Kid',
};

export function monogram(short: string): string {
  const key = short.toUpperCase();
  return MONOGRAMS[key] ?? (short.length <= 3 ? short : short.slice(0, 2));
}

/** Picks ink or white text for a fill colour (WCAG relative luminance). */
export function readableOn(hex: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return '#fff';
  const n = parseInt(m[1], 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  const lum = 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
  return lum > 0.36 ? '#0C1C38' : '#FFFFFF';
}

export function TrackMark({ short, color, size = 40, className, title }: { short: string; color: string; size?: number; className?: string; title?: string }) {
  const text = monogram(short);
  const fontSize = size * (text.length >= 4 ? 0.28 : text.length === 3 ? 0.34 : 0.42);
  return (
    <span
      className={cn('inline-flex shrink-0 select-none items-center justify-center rounded-[28%] font-display font-bold leading-none', className)}
      style={{ width: size, height: size, background: color, color: readableOn(color), fontSize, letterSpacing: '-0.02em' }}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      {text}
    </span>
  );
}
