import type { PlanId } from './config';
import type { Role } from './rbac';
import type { Level } from './content';

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  role: Role;
  plan: PlanId;
  planExpiresAt: string | null;
  level: Level;
  city: string | null;
  school: string | null;
  bio: string | null;
  xp: number;
  streak: number;
  avatarColor: string;
  createdAt: string;
  pendingTeacherRequest?: boolean;
  /** True until the learner has used their one free Plus trial. */
  trialAvailable: boolean;
  /** Two-step login is switched on for this account. */
  mfaEnabled: boolean;
  /**
   * Admin account that has not set up two-step login yet. Until it does, the session acts with
   * learner permissions only, so a stolen password alone can never reach the admin tools.
   */
  mfaSetupRequired?: boolean;
}

export interface ProgressRow {
  trackId: string;
  lessonSlug: string;
  status: 'started' | 'completed';
  updatedAt: string;
}

export interface ActivityRow {
  kind: 'exercise' | 'challenge' | 'quiz' | 'kids';
  refId: string;
  trackId: string | null;
  passed: boolean;
  score: number | null;
  attempts: number;
  updatedAt: string;
}

export interface Goal {
  id: string;
  title: string;
  kind: 'lessons_per_week' | 'finish_track' | 'minutes_per_day';
  target: number;
  trackId: string | null;
  deadline: string | null;
  createdAt: string;
  completedAt: string | null;
  current?: number;
}

export interface Certificate {
  id: string;
  trackId: string;
  trackTitle: string;
  name: string;
  score: number;
  issuedAt: string;
}

export interface Classroom {
  id: string;
  name: string;
  description: string;
  level: Level;
  trackIds: string[];
  joinCode?: string;
  teacherId: string;
  teacherName: string;
  memberCount: number;
  createdAt: string;
  archived: boolean;
}

export interface Assignment {
  id: string;
  classroomId: string;
  title: string;
  instructions: string;
  language: string;
  starterCode: string;
  rubric: string;
  dueAt: string | null;
  maxScore: number;
  createdAt: string;
  submissionCount?: number;
  mySubmission?: Submission | null;
}

export interface AiFeedback {
  score: number;
  pass: boolean;
  strengths: string[];
  improvements: string[];
  summary: string;
}

export interface Submission {
  id: string;
  assignmentId: string;
  userId: string;
  userName?: string;
  code: string;
  text: string;
  status: 'submitted' | 'graded';
  score: number | null;
  aiFeedback: AiFeedback | null;
  teacherFeedback: string | null;
  submittedAt: string;
  gradedAt: string | null;
}

export interface Announcement {
  id: string;
  classroomId: string | null;
  authorName: string;
  title: string;
  body: string;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  role: Role;
  body: string;
  createdAt: string;
}

export interface ApiErrorBody {
  error: { code: string; message: string; fields?: Record<string, string> };
}

export interface Project {
  id: string;
  title: string;
  language: string;
  code: string;
  shareSlug: string | null;
  createdAt: string;
  updatedAt: string;
  authorName?: string;
}

export interface Capstone {
  id: string;
  careerId: string | null;
  title: string;
  summary: string;
  stack: string;
  repoUrl: string;
  demoUrl: string;
  status: 'planning' | 'building' | 'review' | 'completed';
  feedback: string | null;
  grade: number | null;
  createdAt: string;
  updatedAt: string;
  learnerName?: string;
  mentorName?: string | null;
}

export interface SessionSummary {
  summary: string;
  topics: string[];
  endedAt: string;
  keyPoints: { point: string; by: string }[];
  actionItems: string[];
  questionsToRevisit: string[];
}

export interface LiveSession {
  id: string;
  classroomId: string;
  title: string;
  description: string;
  startsAt: string;
  minutes: number;
  meetingUrl: string;
  recordingUrl: string;
  notes?: string;
  summary: SessionSummary | null;
  createdAt: string;
}

export interface LearnerReport {
  id: string;
  createdAt: string;
  content: {
    overview: string;
    strengths: string[];
    gaps: { area: string; evidence: string; severity: 'low' | 'medium' | 'high' }[];
    plan: { nextTwoWeeks: string[]; thisMonth: string[]; longTerm: string };
    suggestedLessons: string[];
    atRisk: boolean;
  };
}

export interface PromoCode {
  code: string;
  percentOff: number;
  plans: string[];
  periods: string[];
  maxUses: number | null;
  used: number;
  expiresAt: string | null;
  active: boolean;
  description: string;
  createdAt: string;
}

export interface Scholarship {
  id: string;
  userName: string;
  userEmail: string;
  plan: 'plus' | 'academy';
  label: string;
  reason: string;
  months: number;
  startsAt: string;
  expiresAt: string;
  grantedBy: string;
  revoked: boolean;
}

export interface WaitlistEntry {
  id: string;
  name: string;
  email: string;
  plan: string;
  note: string;
  createdAt: string;
}

export interface MfaStatus {
  /** The site has an encryption key configured, so two-step login can be switched on. */
  available: boolean;
  enabled: boolean;
  enabledAt: string | null;
  /** Admin accounts must keep it on. */
  required: boolean;
  recoveryCodesLeft: number;
}

export interface AccountSession {
  /** Opaque handle (not the cookie or its hash) used to sign this device out. */
  id: string;
  createdAt: string;
  userAgent: string;
  current: boolean;
}
