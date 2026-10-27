declare module 'virtual:catalog' {
  import type { CatalogTrack } from '../shared/content';
  const catalog: CatalogTrack[];
  export default catalog;
}

declare module 'virtual:quiz-bank' {
  import type { QuizQuestion } from '../shared/content';
  const bank: Record<string, (QuizQuestion & { id: string; examOnly: boolean })[]>;
  export default bank;
}

declare module '*.md?track' {
  import type { Track } from '../shared/content';
  const track: Track;
  export default track;
}
