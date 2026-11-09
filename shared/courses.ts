/** Teacher-built courses: course → units → lessons, each lesson with an optional auto-marked check. */
import { z } from 'zod';
import { questionSchema, type Question } from './tests';

export const COURSE_COLORS = ['teal', 'gold', 'ink', 'clay'] as const;
export type CourseColor = (typeof COURSE_COLORS)[number];

export const courseSchema = z.object({
  title: z.string().trim().min(2).max(120),
  summary: z.string().trim().max(600).default(''),
  subject: z.string().trim().max(60).default(''),
  audience: z.string().trim().max(60).default(''),
  color: z.enum(COURSE_COLORS).default('teal'),
});
export const unitSchema = z.object({ title: z.string().trim().min(1).max(120) });

/** Lesson checks are marked the moment a learner answers, so written answers aren't allowed. */
export const checkSchema = questionSchema.refine((x) => x.type !== 'long', 'Lesson checks use multiple choice, numbers or short answers.');

/** Only YouTube and Vimeo links, shown through their privacy-friendly players. */
export function videoEmbed(url: string | null | undefined): string | null {
  if (!url) return null;
  let u: URL;
  try { u = new URL(url); } catch { return null; }
  if (u.protocol !== 'https:') return null;
  const host = u.hostname.replace(/^www\.|^m\./, '');
  let id: string | null = null;
  if (host === 'youtu.be') id = u.pathname.slice(1);
  else if (host === 'youtube.com' || host === 'youtube-nocookie.com') id = u.searchParams.get('v') ?? (/^\/(embed|shorts|live)\/([\w-]+)/.exec(u.pathname)?.[2] ?? null);
  if (id && /^[\w-]{6,20}$/.test(id)) return `https://www.youtube-nocookie.com/embed/${id}?rel=0`;
  if (host === 'vimeo.com' || host === 'player.vimeo.com') {
    const v = /(\d{6,12})/.exec(u.pathname)?.[1];
    if (v) return `https://player.vimeo.com/video/${v}?dnt=1`;
  }
  return null;
}

export const lessonSchema = z.object({
  title: z.string().trim().min(1).max(120),
  body: z.string().max(20_000).default(''),
  videoUrl: z.string().trim().max(300).nullable().optional().refine((v) => !v || videoEmbed(v) != null, 'Use a YouTube or Vimeo link.'),
  minutes: z.number().int().min(1).max(180).default(15),
  checks: z.array(checkSchema).max(12).default([]),
});
export type LessonInput = z.infer<typeof lessonSchema>;

export const reorderSchema = z.object({ ids: z.array(z.string().max(40)).min(1).max(200) });
export const shareSchema = z.object({ classroomIds: z.array(z.string().max(40)).max(50).default([]), studentIds: z.array(z.string().max(40)).max(500).default([]) });
export const draftLessonSchema = z.object({ title: z.string().trim().min(2).max(120), notes: z.string().trim().max(1500).default(''), minutes: z.number().int().min(5).max(90).default(20) });

export interface CourseSummary {
  id: string; title: string; summary: string; subject: string; audience: string; color: CourseColor;
  publishedAt: string | null; updatedAt: string; units: number; lessons: number; learners: number;
}
export interface TeacherLesson { id: string; unitId: string; title: string; body: string; videoUrl: string | null; minutes: number; checks: Question[]; position: number }
export interface CourseDetail {
  course: CourseSummary;
  units: { id: string; title: string; lessons: { id: string; title: string; minutes: number; checks: number; hasVideo: boolean }[] }[];
  access: { classes: { id: string; name: string }[]; learners: { id: string; name: string }[] };
  progress: { studentId: string; name: string; done: number; avgPct: number | null; lastAt: string | null }[];
}

export interface LearnerCourseCard { id: string; title: string; summary: string; subject: string; color: CourseColor; teacher: string; lessons: number; done: number }
export interface LearnerCourse {
  course: LearnerCourseCard & { audience: string };
  units: { id: string; title: string; lessons: { id: string; title: string; minutes: number; done: boolean; pct: number | null }[] }[];
}
export interface LearnerLesson {
  id: string; title: string; body: string; video: string | null; minutes: number;
  checks: (Omit<Question, 'answer' | 'accept' | 'rubric'> & { options?: string[] })[];
  done: { score: number | null; max: number | null; review: { id: string; got: number; marks: number; answer: string }[] } | null;
  prev: { id: string; title: string } | null; next: { id: string; title: string } | null;
  courseTitle: string;
}
