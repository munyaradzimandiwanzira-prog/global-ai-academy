/**
 * Teacher-made homework, tests and exams. Questions are plain JSON; marking happens on the server.
 *   mcq      choose one option                       marked exactly
 *   numeric  type a number (0,5 = 0.5, 3/4 = 0.75)   marked exactly
 *   short    a word or short phrase                  any accepted answer, ignoring case, spaces and punctuation
 *   long     a written answer                        AI-suggested mark against the rubric; the teacher confirms
 */
import { z } from 'zod';
import { answerMatches, visualSchema } from './maths';

const q = z.string().trim().min(1).max(600);
const base = { id: z.string().min(1).max(20), q, marks: z.number().int().min(1).max(20), visual: visualSchema.optional() };
export const questionSchema = z.discriminatedUnion('type', [
  z.object({ ...base, type: z.literal('mcq'), options: z.array(z.string().trim().min(1).max(200)).min(2).max(6), answer: z.number().int().min(0).max(5) }).refine((x) => x.answer < x.options.length, 'Pick the right option.'),
  z.object({ ...base, type: z.literal('numeric'), answer: z.string().trim().min(1).max(40) }),
  z.object({ ...base, type: z.literal('short'), accept: z.array(z.string().trim().min(1).max(120)).min(1).max(10) }),
  z.object({ ...base, type: z.literal('long'), rubric: z.string().trim().min(5).max(1500) }),
]);
export type Question = z.infer<typeof questionSchema>;
export type TestKind = 'homework' | 'test' | 'exam';

export const testDraftSchema = z.object({
  title: z.string().trim().min(2).max(120),
  kind: z.enum(['homework', 'test', 'exam']).default('test'),
  instructions: z.string().trim().max(2000).default(''),
  questions: z.array(questionSchema).max(60).default([]),
  timeLimitMin: z.number().int().min(1).max(300).nullable().optional(),
  showAnswers: z.boolean().default(true),
});
export type TestDraft = z.infer<typeof testDraftSchema>;

export const publishSchema = z.object({
  classroomId: z.string().max(40).nullable().optional(),
  studentIds: z.array(z.string().max(40)).max(500).default([]),
  dueAt: z.string().datetime().nullable().optional(),
}).refine((x) => x.classroomId || x.studentIds.length, 'Choose a class or at least one learner.');

/** What a learner sees while taking a test: no answers, no rubric. */
export type QuestionForLearner = Omit<Question, 'answer' | 'accept' | 'rubric'> & { type: Question['type']; options?: string[] };
export const forLearner = (x: Question): QuestionForLearner => {
  const { id, q: text, marks, type, visual } = x;
  return { id, q: text, marks, type, visual, ...(x.type === 'mcq' ? { options: x.options } : {}) } as QuestionForLearner;
};

const norm = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9.\-/ ]/g, ' ').replace(/\s+/g, ' ').trim();

/** Marks for one automatically marked answer (null for long answers, which need a rubric). */
export function autoMark(x: Question, given: unknown): number | null {
  if (x.type === 'long') return null;
  if (x.type === 'mcq') return Number(given) === x.answer ? x.marks : 0;
  const s = typeof given === 'string' ? given.trim() : typeof given === 'number' ? String(given) : '';
  if (!s) return 0;
  if (x.type === 'numeric') return answerMatches(x.answer, s) ? x.marks : 0;
  return x.accept.some((a) => norm(a) === norm(s) || answerMatches(a, s)) ? x.marks : 0;
}

export const totalMarks = (qs: Question[]) => qs.reduce((n, x) => n + x.marks, 0);

export interface TestSummary {
  id: string; title: string; kind: TestKind; classroomId: string | null; classroomName: string | null;
  questions: number; totalMarks: number; timeLimitMin: number | null; dueAt: string | null; publishedAt: string | null; createdAt: string;
  assigned: number; submitted: number; averagePct: number | null;
}
export interface TestResults {
  test: TestSummary & { instructions: string; questionList: Question[]; showAnswers: boolean };
  rows: { studentId: string; name: string; status: 'not started' | 'started' | 'submitted' | 'marked'; score: number | null; max: number | null; pct: number | null; late: boolean; submittedAt: string | null; attemptId: string | null; needsMarking: boolean }[];
  perQuestion: { id: string; q: string; type: Question['type']; marks: number; pctCorrect: number | null; answered: number }[];
}
export interface Gradebook {
  tests: { id: string; title: string; kind: TestKind; dueAt: string | null; totalMarks: number }[];
  students: { id: string; name: string; average: number | null; cells: Record<string, { pct: number | null; status: string }> }[];
}
export interface LearnerTest { id: string; title: string; kind: TestKind; teacher: string; questions: number; totalMarks: number; timeLimitMin: number | null; dueAt: string | null; status: 'to do' | 'started' | 'submitted' | 'marked'; pct: number | null }

/** Class-wide signals on the teacher dashboard (GET /api/teach/insights). */
export interface ClassInsights {
  activity: { day: string; learners: number; events: number }[];
  funnel: { step: string; n: number }[];
  tests: { id: string; title: string; averagePct: number | null; handInPct: number }[];
  flags: { id: string; name: string; reasons: { kind: 'overdue' | 'low' | 'inactive' | 'rushing' | 'onboarding'; text: string }[] }[];
  reteach: { testId: string; test: string; question: string; pct: number }[];
  skills: { course: string; skill: string; mastery: number; learners: number }[];
}
