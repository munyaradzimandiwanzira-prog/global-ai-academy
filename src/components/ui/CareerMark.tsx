import { cn } from '@/lib/utils';
import { readableOn } from './TrackMark';

/** Drawn marks for career paths: a monogram on the colour of the level the path starts at. */
const CAREER_MARKS: Record<string, string> = {
  'python-engineer': 'Py', 'web-developer': 'Web', 'backend-engineer': 'API', 'java-engineer': 'Jv', 'android-engineer': 'An',
  'ios-engineer': 'iOS', 'data-scientist': 'DS', 'ml-engineer': 'ML', 'ai-engineer': 'AI', 'agentic-ai-engineer': 'Ag',
  'workflow-ai-engineer': 'Wf', 'platform-ai-engineer': 'PAI', 'lead-platform-ai-engineer': 'Lead', 'network-engineer': 'Net',
  'devops-engineer': 'Ops', 'mechatronics-engineer': 'IoT', 'kids-coder': 'Kid',
};

const LEVEL_COLOURS: Record<string, string> = { kids: '#F2B544', beginner: '#23807F', intermediate: '#D4A64A', advanced: '#142B52' };

export function CareerMark({ id, level, size = 44, className }: { id: string; level: string; size?: number; className?: string }) {
  const text = CAREER_MARKS[id] ?? id.slice(0, 2).toUpperCase();
  const bg = id.startsWith('lead-') ? '#6B3A1E' : LEVEL_COLOURS[level] ?? '#142B52';
  const fontSize = size * (text.length >= 4 ? 0.27 : text.length === 3 ? 0.33 : 0.42);
  return (
    <span aria-hidden="true" className={cn('inline-flex shrink-0 items-center justify-center rounded-full font-display font-bold leading-none', className)}
      style={{ width: size, height: size, background: bg, color: readableOn(bg), fontSize, letterSpacing: '-0.02em' }}>
      {text}
    </span>
  );
}
