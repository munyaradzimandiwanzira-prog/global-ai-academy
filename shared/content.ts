/**
 * Content model shared by the build-time parser, the React app and the Worker.
 * Tracks are authored as Markdown in /content/tracks and compiled by plugins/content.ts.
 */

export type RunLanguage =
  | 'python'
  | 'javascript'
  | 'typescript'
  | 'html'
  | 'css'
  | 'sql'
  | 'java'
  | 'kotlin'
  | 'php'
  | 'cpp'
  | 'c'
  | 'swift'
  | 'bash'
  | 'go'
  | 'text';

export type TrackCategory =
  | 'start'
  | 'languages'
  | 'web'
  | 'data'
  | 'ai'
  | 'engineering'
  | 'mobile'
  | 'hardware'
  | 'kids';

export type Level = 'kids' | 'beginner' | 'intermediate' | 'advanced';

export interface TrackMeta {
  id: string;
  title: string;
  short: string; // short tab label, e.g. "PYTHON"
  category: TrackCategory;
  level: Level;
  language: RunLanguage;
  color: string;
  icon: string; // emoji
  summary: string;
  tags: string[];
  order: number;
  premium?: boolean;
}

export interface QuizQuestion {
  q: string;
  options: string[];
  answer: number;
  explain?: string;
}

export interface Challenge {
  id: string;
  title: string;
  prompt: string;
  lang: RunLanguage;
  starter: string;
  tests: string;
  /** Optional expected stdout (exact match after trimming) — used when tests are not code. */
  expectedOutput?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
}

export type Block =
  | { type: 'md'; md: string }
  | { type: 'run'; id: string; lang: RunLanguage; code: string; title?: string; output?: string }
  | { type: 'code'; lang: string; code: string }
  | { type: 'exercise'; id: string; prompt: string; lang: RunLanguage; code: string; answers: string[]; hint?: string }
  | { type: 'challenge'; challenge: Challenge }
  | { type: 'quiz'; id: string; questions: QuizQuestion[]; /** exam-only questions are not shown in the lesson */ examOnly?: boolean };

/** Separator between alternative accepted exercise answers. */
export const ANSWER_ALT = '\u0001';

export interface Lesson {
  slug: string;
  title: string;
  blocks: Block[];
  minutes: number;
}

export interface Track {
  meta: TrackMeta;
  lessons: Lesson[];
}

export interface CatalogTrack extends TrackMeta {
  lessons: {
    slug: string; title: string; minutes: number; hasChallenge: boolean; hasExercise: boolean;
    challengeId?: string; challengeTitle?: string; difficulty?: Challenge['difficulty'];
  }[];
  totalMinutes: number;
  challengeCount: number;
  exerciseCount: number;
  quizCount: number;
}

export const CATEGORY_LABELS: Record<TrackCategory, string> = {
  start: 'Start Here',
  languages: 'Programming Languages',
  web: 'Web Development',
  data: 'Data & Databases',
  ai: 'Artificial Intelligence',
  engineering: 'Engineering & DevOps',
  mobile: 'Mobile Development',
  hardware: 'Hardware & Mechatronics',
  kids: 'Kids & Teens',
};

export const CATEGORY_ORDER: TrackCategory[] = [
  'start',
  'web',
  'languages',
  'data',
  'ai',
  'engineering',
  'mobile',
  'hardware',
  'kids',
];

export const LEVEL_LABELS: Record<Level, string> = {
  kids: 'Kids',
  beginner: 'Entry level',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
};

/** Languages that execute fully in the browser (no server needed). */
export const BROWSER_LANGUAGES: RunLanguage[] = ['python', 'javascript', 'typescript', 'html', 'css', 'sql'];

/** Languages executed through the optional Judge0 server runner. */
export const REMOTE_LANGUAGES: RunLanguage[] = ['java', 'kotlin', 'php', 'cpp', 'c', 'swift', 'go', 'bash'];
