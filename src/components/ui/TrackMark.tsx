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

const lumOf = (rgb: number[]) => {
  const ch = rgb.map((v) => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * ch[0]! + 0.7152 * ch[1]! + 0.0722 * ch[2]!;
};
const INK = '#0C1C38';
const INK_LUM = 0.0121; // relative luminance of #0C1C38

/**
 * Fill and text colours for a track mark that pass WCAG AA (4.5:1). Uses ink or white text,
 * whichever reads better; if neither does (mid-tone brand colours such as PHP purple), the fill
 * is deepened a little until white text passes.
 */
export function markColors(hex: string): { background: string; color: string } {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return { background: hex, color: '#FFFFFF' };
  const n = parseInt(m[1]!, 16);
  let rgb = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  for (let i = 0; i < 20; i++) {
    const lum = lumOf(rgb);
    const onInk = (lum + 0.05) / (INK_LUM + 0.05);
    const onWhite = 1.05 / (lum + 0.05);
    if (onInk >= 4.5 || onWhite >= 4.5) {
      const background = i === 0 ? `#${m[1]}` : `#${rgb.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`;
      return { background, color: onInk >= onWhite ? INK : '#FFFFFF' };
    }
    rgb = rgb.map((v) => v * 0.92);
  }
  return { background: hex, color: '#FFFFFF' };
}

/** Picks whichever of ink or white has the higher contrast on a fill colour. */
export function readableOn(hex: string): string {
  return markColors(hex).color;
}

export function TrackMark({ short, color, size = 40, className, title }: { short: string; color: string; size?: number; className?: string; title?: string }) {
  const text = monogram(short);
  const fontSize = size * (text.length >= 4 ? 0.28 : text.length === 3 ? 0.34 : 0.42);
  return (
    <span
      className={cn('inline-flex shrink-0 select-none items-center justify-center rounded-[28%] font-display font-bold leading-none', className)}
      style={{ width: size, height: size, ...markColors(color), fontSize, letterSpacing: '-0.02em' }}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      {text}
    </span>
  );
}
