/** Class announcements, parents and guardians, and progress reports for parents. */
import { z } from 'zod';

export const RELATIONS = ['parent', 'guardian', 'other'] as const;
export type Relation = (typeof RELATIONS)[number];

export const guardianSchema = z.object({
  name: z.string().trim().min(1).max(80),
  email: z.string().trim().toLowerCase().email().max(200),
  relation: z.enum(RELATIONS).default('parent'),
});

export interface Guardian { id: string; name: string; email: string; relation: Relation; addedBy: 'learner' | 'teacher' | 'admin'; unsubscribed: boolean; createdAt: string }

export const announcementSchema = z.object({
  title: z.string().trim().min(2).max(120),
  body: z.string().trim().min(2).max(4000),
  toParents: z.boolean().default(false),
  classroomId: z.string().max(40).nullable().optional(),
  studentIds: z.array(z.string().max(40)).max(500).default([]),
}).refine((x) => x.classroomId || x.studentIds.length, 'Choose a class or at least one learner.');

export interface Announcement {
  id: string; title: string; body: string; createdAt: string; classroomName: string | null;
  learners: number; read: number; toParents: boolean; parentEmails: number;
}
export interface LearnerAnnouncement { id: string; title: string; body: string; createdAt: string; teacher: string; read: boolean }

export const parentReportSchema = z.object({
  studentId: z.string().min(1).max(40),
  message: z.string().trim().max(1500).default(''),
});

/** What a parent sees. First name only, learning facts only (never Zuva chats). */
export interface ParentReportContent {
  learner: string;
  teacher: string;
  period: { from: string; to: string };
  activeDays: number;
  lessonsDone: number;
  tests: { title: string; pct: number | null; date: string | null; status: string }[];
  courses: { title: string; done: number; total: number }[];
  english: { accuracy: number | null; trend: string; unitsDone: number } | null;
  maths: { accuracy: number | null; trend: string; unitsDone: number; stage: number } | null;
  summary: string;
  strengths: string[];
  nextSteps: string[];
  homeTip: string;
  teacherMessage: string;
}

export interface ParentReportListItem { id: string; createdAt: string; sentAt: string | null; sentTo: number; viewedAt: string | null; url: string }
