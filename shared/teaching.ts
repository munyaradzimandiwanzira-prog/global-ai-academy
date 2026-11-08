/**
 * Types shared by the teacher portal, the admin console and the worker: invites, rosters,
 * student detail, Zuva reports, lesson plans, wallets and notifications.
 */

export type AssignmentKind = 'code' | 'lesson' | 'kids' | 'task';
export const ASSIGNMENT_KINDS: { id: AssignmentKind; label: string; hint: string }[] = [
  { id: 'lesson', label: 'Course lesson', hint: 'Learners complete a lesson; it ticks off automatically.' },
  { id: 'kids', label: 'Kids Zone level', hint: 'Learners play a level; it ticks off when they earn a star.' },
  { id: 'code', label: 'Coding task', hint: 'Learners write code and submit it; Zuva pre-marks it.' },
  { id: 'task', label: 'Written task', hint: 'Learners write an answer and submit it.' },
];

export interface TeacherInvite {
  id: string;
  code: string;
  label: string;
  classroomId: string | null;
  classroomName: string | null;
  maxUses: number | null;
  used: number;
  expiresAt: string | null;
  revoked: boolean;
  createdAt: string;
  /** Full sign-up link for sharing. */
  url: string;
}

/** What a student sees before joining with a code. */
export interface InvitePreview { code: string; teacherName: string; school: string | null; classroomName: string | null }

export interface ListedTeacher { id: string; name: string; school: string | null; city: string | null }

export interface MyTeacher extends ListedTeacher { since: string; source: string }

export interface RosterStudent {
  id: string;
  name: string;
  email: string;
  level: string;
  plan: string;
  paid: boolean;
  avatarColor: string;
  xp: number;
  streak: number;
  lastActiveDay: string | null;
  linkedAt: string;
  source: string;
  classes: { id: string; name: string }[];
  lessonsDone: number;
  kidsStars: number;
  assignmentsOpen: number;
  assignmentsDone: number;
  avgScore: number | null;
}

export interface StudentDetail {
  student: RosterStudent & { city: string | null; school: string | null; createdAt: string; kidsStage: number | null };
  tracks: { id: string; title: string; done: number; total: number; lastAt: string | null }[];
  kids: { stage: number; done: number; total: number }[];
  practice: { kind: string; ref: string; passed: boolean; attempts: number; score: number | null; at: string }[];
  assignments: { id: string; title: string; kind: AssignmentKind; classroomName: string; dueAt: string | null; status: 'open' | 'done' | 'submitted' | 'graded' | 'late'; score: number | null; maxScore: number }[];
  struggles: string[];
  activityByDay: { day: string; count: number }[];
  /** English as a Second Language: learning patterns only (Zuva's chats with the learner stay private). */
  esl?: EslTeacherView | null;
  /** Cambridge Maths: learning patterns only. */
  maths?: MathsTeacherView | null;
}

/** Cambridge Maths, the same learner model as English (no bands or accents; a stage instead). */
export type MathsTeacherView = Omit<EslTeacherView, 'band' | 'bandName' | 'accent' | 'week'> & { stage: number; unitsTotal: number };

export interface EslTeacherView {
  band: string; bandName: string; accent: 'gb' | 'us'; week: number;
  /** Portuguese help: whether it is on, and the share of answers that used it (last 14 days vs the 14 before). */
  supportLang: 'off' | 'pt-MZ'; supportUse: { recentRate: number | null; previousRate: number | null; answers: number } | null;
  unitsDone: number; stars: number; lastActive: string | null;
  attempts: number; accuracy: number | null; trend: 'up' | 'down' | 'steady' | 'new';
  skills: { area: string; mastery: number; attempts: number }[];
  struggles: { what: string; why: string }[];
  strengths: { what: string; why: string }[];
  slow: { title: string; avgSeconds: number }[];
  fast: { title: string; avgSeconds: number }[];
  enjoys: { title: string; why: string }[];
  avoids: { title: string; why: string }[];
  trickyWords: string[];
  notes: { id: string; area: string; note: string; suggestion: string | null; source: 'zuva' | 'weekly'; at: string }[];
}

export interface StudentReportContent {
  summary: string;
  strengths: string[];
  painPoints: { area: string; evidence: string }[];
  nextSteps: { action: string; why: string; resource?: { title: string; path: string } }[];
  /** One or two sentences a teacher can pass on to a parent. */
  parentNote: string;
  confidence: 'low' | 'medium' | 'high';
}
export interface StudentReport { id: string; createdAt: string; authorName: string; content: StudentReportContent }

export interface LessonPlanContent {
  title: string;
  overview: string;
  objectives: string[];
  priorKnowledge: string[];
  materials: string[];
  timeline: { minutes: number; phase: string; teacher: string; learners: string }[];
  differentiation: { support: string[]; stretch: string[] };
  assessment: string[];
  homework: string;
  resources: { title: string; path: string }[];
}
export interface LessonPlan { id: string; trackId: string; trackTitle: string; classroomId: string | null; title: string; content: LessonPlanContent; createdAt: string; updatedAt: string }

export type WalletKind = 'commission' | 'reversal' | 'adjustment' | 'payout';
export interface WalletEntry { id: string; kind: WalletKind; amountCents: number; note: string; studentName: string | null; paymentRef: string | null; createdAt: string }
export interface Wallet { balanceCents: number; earnedCents: number; paidOutCents: number; ratePercent: number; entries: WalletEntry[]; payingStudents: number }

/** Smallest payout a teacher can ask for, so mobile-money fees don't eat it. */
export const PAYOUT_MIN_CENTS = 500;
export const PAYOUT_METHODS = [
  { id: 'ecocash', label: 'EcoCash', hint: 'EcoCash number, e.g. 077 123 4567' },
  { id: 'onemoney', label: 'OneMoney', hint: 'OneMoney number, e.g. 071 123 4567' },
  { id: 'innbucks', label: 'InnBucks', hint: 'InnBucks number' },
  { id: 'bank', label: 'Bank transfer', hint: 'Bank, branch, account name and number' },
  { id: 'other', label: 'Other', hint: 'How you would like to be paid' },
] as const;
export type PayoutMethod = (typeof PAYOUT_METHODS)[number]['id'];
export type PayoutStatus = 'pending' | 'paid' | 'rejected' | 'cancelled';
export interface PayoutRequest {
  id: string;
  amountCents: number;
  method: PayoutMethod;
  details: string;
  note: string;
  status: PayoutStatus;
  adminNote: string;
  reference: string;
  createdAt: string;
  reviewedAt: string | null;
  /** Admin views only. */
  teacher?: { id: string; name: string; email: string; balanceCents: number };
}

export interface NotificationItem { id: string; kind: string; title: string; body: string; link: string; read: boolean; createdAt: string }

/** An assignment as a student sees it on "Assigned to me". */
export interface MyAssignment {
  id: string;
  title: string;
  kind: AssignmentKind;
  resource: string;
  /** Where to do the work: the lesson, the level, or the assignment page. */
  href: string;
  classroomId: string;
  classroomName: string;
  teacherName: string;
  dueAt: string | null;
  status: 'open' | 'done' | 'submitted' | 'graded';
  createdAt: string;
}
