import type { PlanId } from './config';
import { planAtLeast } from './config';

export type Role = 'student' | 'teacher' | 'admin';

export const ROLES: Role[] = ['student', 'teacher', 'admin'];

export type Permission =
  | 'learn' // tutorials, exercises, playground
  | 'ai.hint'
  | 'ai.tutor'
  | 'goals.manage'
  | 'exam.take'
  | 'classroom.join'
  | 'classroom.create'
  | 'classroom.manage_any'
  | 'assignment.grade'
  | 'ai.teacher_assist'
  | 'announcement.global'
  | 'users.manage'
  | 'payments.view'
  | 'audit.view'
  | 'projects.share'
  | 'capstone.submit'
  | 'capstone.review'
  | 'billing.manage'
  | 'content.pro'; // full professional tracks and Graph Lab tickets beyond the free preview

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  student: ['learn', 'ai.hint'],
  teacher: [
    'learn', 'ai.hint', 'ai.tutor', 'goals.manage', 'exam.take', 'classroom.create', 'assignment.grade', 'ai.teacher_assist',
    'projects.share', 'capstone.submit', 'capstone.review', 'content.pro',
  ],
  admin: [
    'learn', 'ai.hint', 'ai.tutor', 'goals.manage', 'exam.take', 'classroom.join', 'classroom.create', 'classroom.manage_any',
    'assignment.grade', 'ai.teacher_assist', 'announcement.global', 'users.manage', 'payments.view', 'audit.view',
    'projects.share', 'capstone.submit', 'capstone.review', 'billing.manage', 'content.pro',
  ],
};

/** Permissions unlocked for students by paid plans. */
const PLAN_PERMISSIONS: { min: PlanId; perms: Permission[] }[] = [
  { min: 'plus', perms: ['ai.tutor', 'goals.manage', 'exam.take', 'projects.share', 'content.pro'] },
  { min: 'academy', perms: ['classroom.join', 'capstone.submit'] },
];

export interface Principal {
  role: Role;
  plan: PlanId;
}

export function permissionsFor(p: Principal): Set<Permission> {
  const set = new Set<Permission>(ROLE_PERMISSIONS[p.role]);
  for (const rule of PLAN_PERMISSIONS) {
    if (planAtLeast(p.plan, rule.min)) rule.perms.forEach((perm) => set.add(perm));
  }
  return set;
}

export function can(p: Principal | null | undefined, perm: Permission): boolean {
  if (!p) return perm === 'learn' || perm === 'ai.hint';
  return permissionsFor(p).has(perm);
}

export const ROLE_HOME: Record<Role, string> = {
  student: '/dashboard',
  teacher: '/teach',
  admin: '/admin',
};
