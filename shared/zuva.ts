/**
 * Zuva: the Academy's AI tutor and agent. Types shared by the browser and the Worker.
 *
 * The chat endpoint streams newline-delimited JSON events, so the UI can show what Zuva is doing
 * ("looking at your progress…") while it works, then render the answer, buttons and cards.
 */
export type ZuvaMode = 'kids' | 'learner';

/** Something Zuva offers to do in the app. The learner always taps to accept; Zuva never navigates on its own. */
export interface ZuvaAction { kind: 'open'; to: string; label: string }

export interface ExperimentMaterial { item: string; qty?: string; where: string; approxUsd?: number; substitute?: string }
export interface ExperimentCard {
  kind: 'experiment';
  id?: string;
  title: string;
  goal: string;
  ageNote?: string;
  safety: { level: 'easy' | 'helper' | 'adult'; rules: string[] };
  materials: ExperimentMaterial[];
  steps: string[];
  science: string;
  tryNext?: string;
  game?: string;
}
export interface QuizCard { kind: 'quiz'; title: string; questions: { q: string; options: string[]; answer: number; why: string }[] }
export type ZuvaCard = ExperimentCard | QuizCard;

export type ZuvaEvent =
  | { t: 'status'; text: string }
  | { t: 'tool'; name: string; label: string }
  | { t: 'text'; text: string }
  | { t: 'action'; action: ZuvaAction }
  | { t: 'card'; card: ZuvaCard }
  | { t: 'done'; threadId?: string; quota?: { used: number; limit: number } }
  | { t: 'error'; message: string };

export type MemoryKind = 'preference' | 'goal' | 'interest' | 'strength' | 'struggle' | 'progress' | 'fact';
export const MEMORY_KINDS: MemoryKind[] = ['preference', 'goal', 'interest', 'strength', 'struggle', 'progress', 'fact'];

export interface ZuvaMemory { id: string; kind: MemoryKind; content: string; source: 'chat' | 'activity' | 'user'; createdAt: string; lastUsedAt?: string | null }
export interface ZuvaProfile { interests: string[]; goals: string[]; learningStyle?: string | null; memoryEnabled: boolean }

/** What a game tells Zuva about the child's current attempt (all optional, all short). */
export interface ZuvaActivity {
  game?: string;
  level?: string;
  goal?: string;
  attempts?: number;
  fails?: number;
  failStreak?: number;
  lastDetail?: string;
  secondsOnLevel?: number;
  hintsShown?: number;
  /** The game's own scripted hints for this level, gentlest first. */
  hints?: string[];
}

/** Paths Zuva may offer as buttons. Anything else is dropped, so a model can't send learners elsewhere. */
export const ZUVA_SAFE_PATHS = [/^\/kids(\/[a-z]+)?$/, /^\/learn\/[a-z0-9-]+(\/[a-z0-9-]+)?$/, /^\/tutorials$/, /^\/playground$/, /^\/exercises$/, /^\/careers(\/[a-z0-9-]+)?$/, /^\/start$/, /^\/settings$/];
export const isSafeZuvaPath = (p: string) => ZUVA_SAFE_PATHS.some((r) => r.test(p));
