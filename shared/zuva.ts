/**
 * Zuva: the Academy's AI tutor and agent. Types shared by the browser and the Worker.
 *
 * The chat endpoint streams newline-delimited JSON events, so the UI can show what Zuva is doing
 * ("looking at your progress…") while it works, then render the answer, buttons and cards.
 */
import type { Activity } from './esl';

export type ZuvaMode = 'kids' | 'learner' | 'teacher' | 'esl';

/** Something Zuva offers to do in the app. The learner always taps to accept; Zuva never navigates on its own. */
export type ZuvaAction =
  | { kind: 'open'; to: string; label: string }
  /** English course: play this text in Zuva's voice (the learner taps to hear it). */
  | { kind: 'speak'; text: string; label: string; pace: 'word' | 'early' | 'primary' | 'secondary' };

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
/** Teacher mode: an assignment Zuva drafted. Nothing is sent until the teacher presses Assign. */
export interface AssignmentDraftCard {
  kind: 'assignment_draft';
  classroomId: string; classroomName: string;
  studentIds: string[]; studentNames: string[];
  title: string; instructions: string;
  assignmentKind: 'code' | 'lesson' | 'kids' | 'task';
  resource: string; resourceTitle: string; language: string; dueAt: string | null;
}
/** Teacher mode: a saved lesson plan. */
export interface LessonPlanCard { kind: 'lesson_plan'; id: string; title: string; trackTitle: string; minutes: number; objectives: string[] }
/** Teacher mode: a saved Zuva report on a learner. */
export interface ReportCard {
  kind: 'report'; studentId: string; studentName: string; reportId: string; summary: string;
  painPoints: { area: string; evidence: string }[]; nextSteps: { action: string; why: string; resource?: { title: string; path: string } }[];
}
/** English course: a game ready to play inside the chat (from the course, or made by Zuva). */
export interface EslGameCard { kind: 'esl_game'; activity: Activity; reason?: string }
/** English course: writing marked against Cambridge-style criteria. */
export interface EslFeedbackCard {
  kind: 'esl_feedback'; title: string; wordCount: number;
  scores: { criterion: string; band: number; comment: string }[];
  corrections: { wrong: string; right: string; why: string }[];
  well: string[]; nextStep: string;
}
export type ZuvaCard = ExperimentCard | QuizCard | AssignmentDraftCard | LessonPlanCard | ReportCard | EslGameCard | EslFeedbackCard;

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
export const ZUVA_SAFE_PATHS = [/^\/teach(\/[a-z-]+(\/[A-Za-z0-9-]{1,40})?)?$/, /^\/classes(\/[A-Za-z0-9-]{1,40})?$/, /^\/assignments\/[A-Za-z0-9-]{1,40}$/, /^\/kids(\/[a-z]+)?(\?(level=\d{1,2}|challenge=[a-z]+|topic=[a-z]+|mode=[a-z]+&level=\d))?$/, /^\/learn\/[a-z0-9-]+(\/[a-z0-9-]+)?$/, /^\/tutorials$/, /^\/playground$/, /^\/exercises$/, /^\/careers(\/[a-z0-9-]+)?$/, /^\/start$/, /^\/settings$/, /^\/cambridge(\/esl(\/week\/\d{1,2})?)?$/, /^\/signup\?next=\/cambridge\/esl$/, /^\/pricing$/];
export const isSafeZuvaPath = (p: string) => ZUVA_SAFE_PATHS.some((r) => r.test(p));
