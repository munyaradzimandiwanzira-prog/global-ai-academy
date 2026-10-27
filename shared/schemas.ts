import { z } from 'zod';

const email = z.string().trim().toLowerCase().email('Enter a valid email address').max(254);
const password = z
  .string()
  .min(8, 'Use at least 8 characters')
  .max(128, 'Use at most 128 characters')
  .refine((v) => /[A-Za-z]/.test(v) && /\d/.test(v), 'Use at least one letter and one number');

export const levelSchema = z.enum(['kids', 'beginner', 'intermediate', 'advanced']);

export const signupSchema = z.object({
  name: z.string().trim().min(2, 'Enter your name').max(80),
  email,
  password,
  level: levelSchema.default('beginner'),
  city: z.string().trim().max(60).optional(),
  // Teachers request elevated access; an admin approves it.
  wantsToTeach: z.boolean().optional(),
});

export const loginSchema = z.object({ email, password: z.string().min(1, 'Enter your password').max(128) });
export const forgotSchema = z.object({ email });
export const resetSchema = z.object({ token: z.string().min(20).max(200), password });
export const verifySchema = z.object({ token: z.string().min(20).max(200) });

export const profileSchema = z.object({
  name: z.string().trim().min(2).max(80),
  city: z.string().trim().max(60).nullable().optional(),
  school: z.string().trim().max(120).nullable().optional(),
  bio: z.string().trim().max(500).nullable().optional(),
  level: levelSchema,
});

export const changePasswordSchema = z.object({ current: z.string().min(1).max(128), next: password });

export const progressSchema = z.object({
  trackId: z.string().min(1).max(60),
  lessonSlug: z.string().min(1).max(80),
  status: z.enum(['started', 'completed']),
});

export const activitySchema = z.object({
  kind: z.enum(['exercise', 'challenge', 'quiz', 'kids']),
  refId: z.string().min(1).max(160),
  trackId: z.string().max(60).optional(),
  passed: z.boolean(),
  score: z.number().min(0).max(100).optional(),
  code: z.string().max(20000).optional(),
});

export const goalSchema = z.object({
  title: z.string().trim().min(3).max(120),
  kind: z.enum(['lessons_per_week', 'finish_track', 'minutes_per_day']),
  target: z.number().int().min(1).max(500),
  trackId: z.string().max(60).nullable().optional(),
  deadline: z.string().date().nullable().optional(),
});

export const hintSchema = z.object({
  task: z.string().max(4000),
  code: z.string().max(12000),
  language: z.string().max(20),
  error: z.string().max(4000).optional(),
  attempt: z.number().int().min(1).max(10).default(1),
  lessonTitle: z.string().max(200).optional(),
});

export const tutorSchema = z.object({
  trackId: z.string().max(60).optional(),
  lessonTitle: z.string().max(200).optional(),
  lessonExcerpt: z.string().max(6000).optional(),
  messages: z
    .array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().min(1).max(4000) }))
    .min(1)
    .max(24),
});

export const runSchema = z.object({
  language: z.enum(['java', 'kotlin', 'php', 'cpp', 'c', 'swift', 'go', 'bash']),
  code: z.string().min(1).max(20000),
  stdin: z.string().max(4000).optional(),
});

export const classroomSchema = z.object({
  name: z.string().trim().min(3).max(100),
  description: z.string().trim().max(1000).optional().default(''),
  level: levelSchema.default('beginner'),
  trackIds: z.array(z.string().max(60)).max(30).default([]),
});

export const joinClassSchema = z.object({ code: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{6}$/, 'Codes are 6 letters or digits') });

export const assignmentSchema = z.object({
  title: z.string().trim().min(3).max(150),
  instructions: z.string().trim().min(10).max(10000),
  language: z.string().max(20).default('python'),
  starterCode: z.string().max(10000).optional().default(''),
  rubric: z.string().max(4000).optional().default(''),
  dueAt: z.string().datetime({ offset: true }).nullable().optional(),
  maxScore: z.number().int().min(1).max(1000).default(100),
});

export const submissionSchema = z.object({
  code: z.string().max(30000).optional().default(''),
  text: z.string().max(10000).optional().default(''),
});

export const gradeSchema = z.object({
  score: z.number().min(0).max(1000),
  feedback: z.string().max(5000).optional().default(''),
});

export const announcementSchema = z.object({
  title: z.string().trim().min(3).max(150),
  body: z.string().trim().min(3).max(5000),
});

export const messageSchema = z.object({ body: z.string().trim().min(1).max(2000) });

export const assistSchema = z.object({
  topic: z.string().trim().min(3).max(300),
  level: levelSchema,
  language: z.string().max(20).default('python'),
});

export const examSubmitSchema = z.object({
  attemptId: z.string().min(10).max(64),
  answers: z.record(z.string(), z.number().int().min(0).max(10)),
});

const promoCode = z.string().trim().toUpperCase().regex(/^[A-Z0-9-]{3,24}$/, 'Codes use 3–24 letters, digits or dashes');

export const checkoutSchema = z.object({
  plan: z.enum(['plus', 'academy']),
  period: z.enum(['monthly', 'yearly']),
  method: z.enum(['web', 'ecocash', 'onemoney']).default('web'),
  phone: z.string().regex(/^0\d{9}$/, 'Use a local number like 0771234567').optional(),
  promoCode: promoCode.optional(),
});

export const promoQuoteSchema = z.object({
  code: promoCode,
  plan: z.enum(['plus', 'academy']),
  period: z.enum(['monthly', 'yearly']),
});

export const promoCreateSchema = z.object({
  code: promoCode,
  percentOff: z.number().int().min(1).max(100),
  plans: z.array(z.enum(['plus', 'academy'])).min(1).default(['plus', 'academy']),
  periods: z.array(z.enum(['monthly', 'yearly'])).min(1).default(['monthly', 'yearly']),
  maxUses: z.number().int().min(1).max(100000).nullable().optional(),
  expiresAt: z.string().date().nullable().optional(),
  description: z.string().trim().max(200).optional().default(''),
});

export const waitlistSchema = z.object({
  name: z.string().trim().max(80).optional().default(''),
  email,
  plan: z.enum(['premium']).default('premium'),
  note: z.string().trim().max(1000).optional().default(''),
});

export const scholarshipSchema = z.object({
  email,
  plan: z.enum(['plus', 'academy']),
  months: z.number().int().min(1).max(36),
  label: z.enum(['Full scholarship', 'Merit scholarship', 'Community grant', 'Strategic partner', 'Staff benefit', 'Beta tester']),
  reason: z.string().trim().max(500).optional().default(''),
});

const url = z.string().trim().max(500).url('Enter a full link starting with https://').refine((v) => /^https?:\/\//i.test(v), 'Links must start with http:// or https://');
const optionalUrl = z.union([url, z.literal('')]).optional().default('');

export const liveSessionSchema = z.object({
  title: z.string().trim().min(3).max(150),
  description: z.string().trim().max(2000).optional().default(''),
  startsAt: z.string().datetime({ offset: true }),
  minutes: z.number().int().min(15).max(480).default(60),
  meetingUrl: optionalUrl,
  recordingUrl: optionalUrl,
});

export const sessionNotesSchema = z.object({
  notes: z.string().trim().min(20, 'Paste at least a few lines of notes or transcript').max(30000),
  recordingUrl: optionalUrl,
});

export const projectSchema = z.object({
  title: z.string().trim().min(1).max(100),
  language: z.string().min(1).max(20),
  code: z.string().max(60000),
  shared: z.boolean().optional(),
});

export const capstoneSchema = z.object({
  title: z.string().trim().min(3).max(150),
  careerId: z.string().max(60).nullable().optional(),
  summary: z.string().trim().max(4000).optional().default(''),
  stack: z.string().trim().max(300).optional().default(''),
  repoUrl: optionalUrl,
  demoUrl: optionalUrl,
  status: z.enum(['planning', 'building', 'review', 'completed']).default('planning'),
});

export const capstoneReviewSchema = z.object({
  feedback: z.string().trim().min(3).max(5000),
  grade: z.number().int().min(0).max(100).nullable().optional(),
  status: z.enum(['building', 'review', 'completed']),
});

export const adminUserUpdateSchema = z.object({
  role: z.enum(['student', 'teacher', 'admin']).optional(),
  plan: z.enum(['free', 'plus', 'academy']).optional(),
  planMonths: z.number().int().min(1).max(36).optional(),
  disabled: z.boolean().optional(),
});

export const contactSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email,
  subject: z.string().trim().min(3).max(150),
  body: z.string().trim().min(10).max(5000),
});

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
