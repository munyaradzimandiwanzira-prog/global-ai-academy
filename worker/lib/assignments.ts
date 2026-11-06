/**
 * Who each assignment is for, and how far each learner has got with it.
 *
 * Lesson and Kids Zone assignments complete themselves: a lesson counts once the learner marks it
 * complete, a Kids Zone level once they earn a star. Code and written tasks count when submitted
 * (and graded when the teacher grades them).
 */
import type { AssignmentKind } from '@shared/teaching';
import { KID_LEVELS, levelHref } from '@shared/kids-curriculum';
import { lessonExists } from './catalog';

export type WorkStatus = 'open' | 'done' | 'submitted' | 'graded';

export interface AssignmentLite {
  id: string; classroom_id: string; classroom_name: string; teacher_name: string; title: string; kind: AssignmentKind;
  resource: string; due_at: string | null; max_score: number; created_at: string;
}

const KIDS = new Map(KID_LEVELS.map((l) => [l.key, l]));

/** Validates a resource for its kind. Returns an error message, or null when fine. */
export function resourceProblem(kind: AssignmentKind, resource: string): string | null {
  if (kind === 'lesson') {
    const [track, lesson] = resource.split('/');
    return track && lesson && lessonExists(track, lesson) ? null : 'Choose a lesson from the course list.';
  }
  if (kind === 'kids') return KIDS.has(resource) ? null : 'Choose a Kids Zone level.';
  return null;
}

/** Where a learner goes to do the work. */
export function workHref(a: Pick<AssignmentLite, 'id' | 'kind' | 'resource'>): string {
  if (a.kind === 'lesson' && a.resource) return `/learn/${a.resource}?assignment=${a.id}`;
  if (a.kind === 'kids' && KIDS.has(a.resource)) return levelHref(KIDS.get(a.resource)!);
  return `/assignments/${a.id}`;
}

/**
 * Status of each (assignment, learner) pair for the given classrooms, honouring per-learner targets.
 * Four queries however many learners, so it stays cheap for a whole roster.
 */
export async function workMatrix(db: D1Database, classroomIds: string[], studentIds?: string[]) {
  const out = new Map<string, { a: AssignmentLite; status: WorkStatus; score: number | null }[]>();
  if (!classroomIds.length) return out;
  const cq = classroomIds.map(() => '?').join(',');
  const [assignments, targets, members] = await Promise.all([
    db.prepare(
      `SELECT a.id, a.classroom_id, c.name AS classroom_name, u.name AS teacher_name, a.title, a.kind, a.resource, a.due_at, a.max_score, a.created_at
       FROM assignments a JOIN classrooms c ON c.id = a.classroom_id JOIN users u ON u.id = c.teacher_id
       WHERE a.classroom_id IN (${cq}) ORDER BY a.created_at DESC LIMIT 500`,
    ).bind(...classroomIds).all<AssignmentLite>(),
    db.prepare(`SELECT t.assignment_id, t.user_id FROM assignment_targets t JOIN assignments a ON a.id = t.assignment_id WHERE a.classroom_id IN (${cq})`).bind(...classroomIds).all<{ assignment_id: string; user_id: string }>(),
    db.prepare(`SELECT classroom_id, user_id FROM classroom_members WHERE classroom_id IN (${cq})`).bind(...classroomIds).all<{ classroom_id: string; user_id: string }>(),
  ]);
  const wanted = studentIds ? new Set(studentIds) : null;
  const byAssignment = new Map<string, Set<string>>();
  for (const t of targets.results) (byAssignment.get(t.assignment_id) ?? byAssignment.set(t.assignment_id, new Set()).get(t.assignment_id)!).add(t.user_id);
  const membersOf = new Map<string, string[]>();
  for (const m of members.results) (membersOf.get(m.classroom_id) ?? membersOf.set(m.classroom_id, []).get(m.classroom_id)!).push(m.user_id);

  const pairs: { a: AssignmentLite; uid: string }[] = [];
  for (const a of assignments.results) {
    const audience = byAssignment.get(a.id) ?? new Set(membersOf.get(a.classroom_id) ?? []);
    for (const uid of audience) if (!wanted || wanted.has(uid)) pairs.push({ a, uid });
  }
  if (!pairs.length) return out;
  const uids = [...new Set(pairs.map((p) => p.uid))];
  const uq = uids.map(() => '?').join(',');
  const aids = [...new Set(pairs.map((p) => p.a.id))];
  const [subs, lessons, kids] = await Promise.all([
    db.prepare(`SELECT assignment_id, user_id, status, score FROM submissions WHERE assignment_id IN (${aids.map(() => '?').join(',')}) AND user_id IN (${uq})`).bind(...aids, ...uids).all<{ assignment_id: string; user_id: string; status: 'submitted' | 'graded'; score: number | null }>(),
    db.prepare(`SELECT user_id, track_id || '/' || lesson_slug AS ref FROM progress WHERE status = 'completed' AND user_id IN (${uq})`).bind(...uids).all<{ user_id: string; ref: string }>(),
    db.prepare(`SELECT user_id, ref_id FROM activity WHERE kind = 'kids' AND passed = 1 AND user_id IN (${uq})`).bind(...uids).all<{ user_id: string; ref_id: string }>(),
  ]);
  const sub = new Map(subs.results.map((s) => [`${s.assignment_id}|${s.user_id}`, s]));
  const doneLessons = new Set(lessons.results.map((l) => `${l.user_id}|${l.ref}`));
  const doneKids = new Set(kids.results.map((k) => `${k.user_id}|${k.ref_id}`));
  for (const { a, uid } of pairs) {
    const s = sub.get(`${a.id}|${uid}`);
    let status: WorkStatus = 'open';
    if (s) status = s.status;
    else if (a.kind === 'lesson' && doneLessons.has(`${uid}|${a.resource}`)) status = 'done';
    else if (a.kind === 'kids' && doneKids.has(`${uid}|${a.resource}`)) status = 'done';
    (out.get(uid) ?? out.set(uid, []).get(uid)!).push({ a, status, score: s?.score ?? null });
  }
  return out;
}

/** Classrooms a learner belongs to. */
export async function classroomsOf(db: D1Database, userId: string) {
  const r = await db.prepare('SELECT classroom_id FROM classroom_members WHERE user_id = ?').bind(userId).all<{ classroom_id: string }>();
  return r.results.map((x) => x.classroom_id);
}

/** Learner ids an assignment is for (its targets, or the whole class). */
export async function audienceOf(db: D1Database, assignmentId: string, classroomId: string): Promise<string[]> {
  const t = await db.prepare('SELECT user_id FROM assignment_targets WHERE assignment_id = ?').bind(assignmentId).all<{ user_id: string }>();
  if (t.results.length) return t.results.map((x) => x.user_id);
  const m = await db.prepare('SELECT user_id FROM classroom_members WHERE classroom_id = ?').bind(classroomId).all<{ user_id: string }>();
  return m.results.map((x) => x.user_id);
}
