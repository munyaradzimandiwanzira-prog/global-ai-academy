/**
 * What a teacher (or admin) sees about learners: the roster across invites and classes, and one
 * learner's detail. Built only from learning records (lessons, practice, Kids Zone, assignments).
 * Zuva chat memories are deliberately left out: learners were told those stay between them and Zuva.
 */
import type { RosterStudent, StudentDetail } from '@shared/teaching';
import { KID_LEVELS, STAGES } from '@shared/kids-curriculum';
import { effectivePlan, type UserRow } from './db';
import { getTrack } from './catalog';
import { eslTeacherView } from '../esl/report';
import { mathsTeacherView } from '../maths/report';
import { workMatrix } from './assignments';

interface RosterRow {
  id: string; name: string; email: string; level: string; plan: UserRow['plan']; plan_expires_at: string | null; avatar_color: string;
  xp: number; streak: number; last_active_day: string | null; linked_at: string; source: string; lessons_done: number; kids_stars: number;
}

const ROSTER_SQL = `
  WITH s AS (
    SELECT student_id AS id, created_at AS linked_at, source FROM teacher_students WHERE teacher_id = ?1
    UNION ALL
    SELECT m.user_id, m.joined_at, 'class' FROM classroom_members m JOIN classrooms c ON c.id = m.classroom_id WHERE c.teacher_id = ?1
  )
  SELECT u.id, u.name, u.email, u.level, u.plan, u.plan_expires_at, u.avatar_color, u.xp, u.streak, u.last_active_day,
         MIN(s.linked_at) AS linked_at, MIN(s.source) AS source,
         (SELECT COUNT(*) FROM progress p WHERE p.user_id = u.id AND p.status = 'completed') AS lessons_done,
         (SELECT COALESCE(SUM(CAST(ROUND(COALESCE(a.score,0) * 3.0 / 100) AS INTEGER)),0) FROM activity a WHERE a.user_id = u.id AND a.kind = 'kids') AS kids_stars
  FROM s JOIN users u ON u.id = s.id
  WHERE u.deleted_at IS NULL %WHERE%
  GROUP BY u.id ORDER BY u.name COLLATE NOCASE`;

async function teacherClassrooms(db: D1Database, teacherId: string) {
  const r = await db.prepare('SELECT id, name FROM classrooms WHERE teacher_id = ? ORDER BY created_at DESC').bind(teacherId).all<{ id: string; name: string }>();
  return r.results;
}

export async function rosterFor(db: D1Database, teacherId: string, onlyStudentId?: string): Promise<RosterStudent[]> {
  const sql = ROSTER_SQL.replace('%WHERE%', onlyStudentId ? 'AND u.id = ?2' : '');
  const stmt = db.prepare(sql);
  const rows = (await (onlyStudentId ? stmt.bind(teacherId, onlyStudentId) : stmt.bind(teacherId)).all<RosterRow>()).results;
  const classes = await teacherClassrooms(db, teacherId);
  const ids = rows.map((r) => r.id);
  const membership = new Map<string, { id: string; name: string }[]>();
  if (classes.length && ids.length) {
    const m = await db.prepare(`SELECT classroom_id, user_id FROM classroom_members WHERE classroom_id IN (${classes.map(() => '?').join(',')})`).bind(...classes.map((c) => c.id)).all<{ classroom_id: string; user_id: string }>();
    for (const x of m.results) (membership.get(x.user_id) ?? membership.set(x.user_id, []).get(x.user_id)!).push(classes.find((c) => c.id === x.classroom_id)!);
  }
  const work = await workMatrix(db, classes.map((c) => c.id), ids);
  return rows.map((r) => {
    const w = work.get(r.id) ?? [];
    const scored = w.filter((x) => x.score !== null);
    const plan = effectivePlan({ plan: r.plan, plan_expires_at: r.plan_expires_at });
    return {
      id: r.id, name: r.name, email: r.email, level: r.level, plan, paid: plan !== 'free', avatarColor: r.avatar_color, xp: r.xp, streak: r.streak,
      lastActiveDay: r.last_active_day, linkedAt: r.linked_at, source: r.source, classes: membership.get(r.id) ?? [],
      lessonsDone: Number(r.lessons_done) || 0, kidsStars: Number(r.kids_stars) || 0,
      assignmentsOpen: w.filter((x) => x.status === 'open').length, assignmentsDone: w.filter((x) => x.status !== 'open').length,
      avgScore: scored.length ? Math.round(scored.reduce((n, x) => n + (x.score! / x.a.max_score) * 100, 0) / scored.length) : null,
    };
  });
}

/** Full detail for one learner, scoped to what this teacher set (assignments from their classes). */
export async function studentDetail(db: D1Database, teacherId: string, studentId: string, asAdmin: boolean): Promise<StudentDetail | null> {
  let row: RosterStudent | undefined = (await rosterFor(db, teacherId, studentId))[0];
  const u = await db.prepare('SELECT id, name, email, level, plan, plan_expires_at, avatar_color, xp, streak, last_active_day, city, school, created_at FROM users WHERE id = ? AND deleted_at IS NULL')
    .bind(studentId).first<UserRow>();
  if (!u) return null;
  if (!row) {
    if (!asAdmin) return null;
    // Admins can open any learner, even one with no teacher.
    const plan = effectivePlan(u);
    row = { id: u.id, name: u.name, email: u.email, level: u.level, plan, paid: plan !== 'free', avatarColor: u.avatar_color, xp: u.xp, streak: u.streak, lastActiveDay: u.last_active_day, linkedAt: u.created_at, source: 'admin', classes: [], lessonsDone: 0, kidsStars: 0, assignmentsOpen: 0, assignmentsDone: 0, avgScore: null };
  }
  const since = new Date(Date.now() - 28 * 86_400_000).toISOString();
  const [progress, practice, kids, days, esl, maths] = await Promise.all([
    db.prepare("SELECT track_id, SUM(status = 'completed') AS done, MAX(updated_at) AS last FROM progress WHERE user_id = ? GROUP BY track_id ORDER BY last DESC LIMIT 12").bind(studentId).all<{ track_id: string; done: number; last: string }>(),
    db.prepare("SELECT kind, ref_id, passed, attempts, score, updated_at FROM activity WHERE user_id = ? AND kind != 'kids' ORDER BY updated_at DESC LIMIT 25").bind(studentId).all<{ kind: string; ref_id: string; passed: number; attempts: number; score: number | null; updated_at: string }>(),
    db.prepare("SELECT ref_id FROM activity WHERE user_id = ? AND kind = 'kids' AND passed = 1").bind(studentId).all<{ ref_id: string }>(),
    db.prepare(
      `SELECT day, COUNT(*) AS count FROM (
         SELECT substr(updated_at, 1, 10) AS day FROM progress WHERE user_id = ?1 AND updated_at >= ?2
         UNION ALL SELECT substr(updated_at, 1, 10) FROM activity WHERE user_id = ?1 AND updated_at >= ?2
       ) GROUP BY day ORDER BY day`,
    ).bind(studentId, since).all<{ day: string; count: number }>(),
    eslTeacherView(db, studentId).catch(() => null),
    mathsTeacherView(db, studentId).catch(() => null),
  ]);
  const doneKids = new Set(kids.results.map((k) => k.ref_id));
  const kidsByStage = STAGES.map((s) => {
    const levels = KID_LEVELS.filter((l) => l.stage === s.id);
    return { stage: s.id, done: levels.filter((l) => doneKids.has(l.key)).length, total: levels.length };
  }).filter((k) => k.done > 0);
  const topStage = kidsByStage.reduce<number | null>((m, k) => (k.done >= Math.ceil(k.total / 3) ? k.stage : m), null);

  const classIds = asAdmin
    ? (await db.prepare('SELECT classroom_id FROM classroom_members WHERE user_id = ?').bind(studentId).all<{ classroom_id: string }>()).results.map((r) => r.classroom_id)
    : (await teacherClassrooms(db, teacherId)).map((c) => c.id);
  const work = (await workMatrix(db, classIds, [studentId])).get(studentId) ?? [];
  const now = new Date().toISOString();

  return {
    student: { ...row, city: u.city, school: u.school, createdAt: u.created_at, kidsStage: topStage },
    tracks: progress.results.map((p) => {
      const t = getTrack(p.track_id);
      return { id: p.track_id, title: t?.title ?? p.track_id, done: Number(p.done) || 0, total: t?.lessons.length ?? 0, lastAt: p.last };
    }),
    kids: kidsByStage,
    practice: practice.results.map((p) => ({ kind: p.kind, ref: p.ref_id, passed: !!p.passed, attempts: p.attempts, score: p.score, at: p.updated_at })),
    assignments: work.map(({ a, status, score }) => ({
      id: a.id, title: a.title, kind: a.kind, classroomName: a.classroom_name, dueAt: a.due_at,
      status: status === 'open' && a.due_at && a.due_at < now ? 'late' : status, score, maxScore: a.max_score,
    })),
    struggles: practice.results.filter((p) => !p.passed && p.attempts >= 3).slice(0, 6).map((p) => `${p.kind} ${p.ref_id} (${p.attempts} tries)`),
    activityByDay: days.results.map((d) => ({ day: d.day, count: Number(d.count) })),
    esl,
    maths,
  };
}
