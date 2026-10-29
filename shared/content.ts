import type { SketchSpec } from './sketch';

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
  | 'postgres'
  | 'java'
  | 'kotlin'
  | 'php'
  | 'cpp'
  | 'c'
  | 'swift'
  | 'bash'
  | 'go'
  | 'cypher'
  | 'text';

export type TrackCategory =
  | 'start'
  | 'languages'
  | 'web'
  | 'frameworks'
  | 'databases'
  | 'maths-data'
  | 'ai'
  | 'agentic'
  | 'mobile'
  | 'cloud'
  | 'tools'
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
  /** Professional track: only the first `preview` lessons are free; the rest need `content.pro`. */
  premium?: boolean;
  preview?: number;
}

export const DEFAULT_PREVIEW_LESSONS = 3;

/** Whether lesson number `index` (0-based) of a track is behind the paywall. */
export const isLockedLesson = (meta: Pick<TrackMeta, 'premium' | 'preview'>, index: number) =>
  !!meta.premium && index >= (meta.preview ?? DEFAULT_PREVIEW_LESSONS);

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
  | { type: 'quiz'; id: string; questions: QuizQuestion[]; /** exam-only questions are not shown in the lesson */ examOnly?: boolean }
  | { type: 'sketch'; sketch: SketchSpec };

/** Separator between alternative accepted exercise answers. */
export const ANSWER_ALT = '\u0001';

export interface Lesson {
  slug: string;
  title: string;
  blocks: Block[];
  minutes: number;
  /** Set in the public bundle for paywalled lessons: blocks are empty and come from /api/content. */
  locked?: boolean;
  /** Opening paragraph shown above the paywall. */
  teaser?: string;
}

export interface Track {
  meta: TrackMeta;
  lessons: Lesson[];
}

export interface CatalogTrack extends TrackMeta {
  lessons: {
    slug: string; title: string; minutes: number; hasChallenge: boolean; hasExercise: boolean;
    challengeId?: string; challengeTitle?: string; difficulty?: Challenge['difficulty'];
    locked?: boolean;
  }[];
  totalMinutes: number;
  challengeCount: number;
  exerciseCount: number;
  quizCount: number;
}

export const CATEGORY_LABELS: Record<TrackCategory, string> = {
  start: 'Start here',
  languages: 'Programming languages',
  web: 'Web development',
  frameworks: 'Frameworks & libraries',
  databases: 'Databases',
  'maths-data': 'Mathematics & data',
  ai: 'AI & machine learning',
  agentic: 'Agentic AI',
  mobile: 'Mobile apps',
  cloud: 'Cloud, DevOps & security',
  tools: 'Developer tools',
  hardware: 'Hardware & robotics',
  kids: 'Kids & teens',
};

/** Short names for the category bar under the header. */
export const CATEGORY_SHORT: Record<TrackCategory, string> = {
  start: 'Start here',
  languages: 'Languages',
  web: 'Web',
  frameworks: 'Frameworks',
  databases: 'Databases',
  'maths-data': 'Maths & data',
  ai: 'AI & ML',
  agentic: 'Agentic AI',
  mobile: 'Mobile',
  cloud: 'Cloud & DevOps',
  tools: 'Tools',
  hardware: 'Hardware',
  kids: 'Kids',
};

/** One line on what each category is for, so a newcomer can choose without opening every track. */
export const CATEGORY_BLURBS: Record<TrackCategory, string> = {
  start: 'New to coding? Begin here: how computers, code and this site work, in under an hour.',
  languages: 'General-purpose languages you write programs in, from Python to C++.',
  web: 'Build websites and web apps: structure, style, behaviour and the server behind them.',
  frameworks: 'Libraries that do the heavy lifting once you know a language.',
  databases: 'Store and query data: SQL, PostgreSQL with vectors, and graph databases.',
  'maths-data': 'The statistics, maths and data skills underneath AI and analysis.',
  ai: 'How models learn, how to use them through APIs, and how to run them in production.',
  agentic: 'Systems where models plan, call tools and act: agents, MCP and workflows.',
  mobile: 'Apps for Android and iPhone.',
  cloud: 'Ship, connect and protect software: deployment, networks and security.',
  tools: 'The everyday tools of a developer: code editors, the terminal and Git.',
  hardware: 'Electronics, sensors and robots you program.',
  kids: 'Games and first steps for young learners.',
};

export const CATEGORY_ORDER: TrackCategory[] = ['start', 'languages', 'web', 'frameworks', 'databases', 'maths-data', 'ai', 'agentic', 'mobile', 'cloud', 'tools', 'hardware', 'kids'];

export const LEVEL_LABELS: Record<Level, string> = {
  kids: 'Kids',
  beginner: 'Entry level',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
};

/** Languages that execute fully in the browser (no server needed). */
export const BROWSER_LANGUAGES: RunLanguage[] = ['python', 'javascript', 'typescript', 'html', 'css', 'sql', 'postgres'];

/** Languages executed through the optional Judge0 server runner. */
export const REMOTE_LANGUAGES: RunLanguage[] = ['java', 'kotlin', 'php', 'cpp', 'c', 'swift', 'go', 'bash'];
