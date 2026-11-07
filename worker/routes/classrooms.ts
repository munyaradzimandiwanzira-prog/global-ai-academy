import { createRouter, body, requireUser, requirePermission, type Ctx } from '../app';
import {
  classroomSchema, joinClassSchema, assignmentSchema, submissionSchema, gradeSchema,
  announcementSchema, messageSchema, assistSchema, liveSessionSchema, sessionNotesSchema,
} from '@shared/schemas';
import { aiFeedback, assignmentDraft, classInsights, learnerReport, sessionSummary } from '../lib/ai-shapes';
import type { AiFeedback, Assignment, Classroom, Submission, LiveSession, LearnerReport } from '@shared/api-types';
import { XP } from '@shared/config';
import { can } from '@shared/rbac';
import { audit, effectivePlan, nowIso, parseJson, type UserRow } from '../lib/db';
import { newId, randomCode } from '../lib/crypto';
import { badRequest, forbidden, notFound, conflict, unavailable } from '../lib/errors';
import { chatJson } from '../lib/openai';
import { consumeAiQuota } from '../lib/ai-quota';
import { asData, ASSIGNMENT_GENERATOR_PROMPT, GRADER_SYSTEM_PROMPT, INSIGHTS_PROMPT, SESSION_SUMMARY_PROMPT, LEARNER_REPORT_PROMPT } from '../lib/prompts';
import { awardXp } from '../lib/xp';
import { getTrack } from '../lib/catalog';
import { hit } from '../lib/ratelimit';
import { z } from 'zod';
import type { AssignmentKind } from '@shared/teaching';
import { appBase } from '../lib/urls';
import { canSeeStudent, linkStudent, notify } from '../lib/teaching';
import { audienceOf, resourceProblem, workHref, workMatrix } from '../lib/assignments';

const classrooms = createRouter();

interface ClassroomRow {
  id: string; name: string; description: string; level: Classroom['level']; track_ids: string; teacher_id: string;
  teacher_name: string; join_code: string; archived_at: string | null; created_at: string; member_count: number;
}

const CLASS_SELECT = `SELECT c.*, u.name AS teacher_name, (SELECT COUNT(*) FROM classroom_members m WHERE m.classroom_id = c.id) AS member_count
  FROM classrooms c JOIN users u ON u.id = c.teacher_id`;

function toClassroom(r: ClassroomRow, includeCode: boolean): Classroom {
  return {
    id: r.id, name: r.name, description: r.description, level: r.level, trackIds: parseJson<string[]>(r.track_ids, []),
    joinCode: includeCode ? r.join_code : undefined, teacherId: r.teacher_id, teacherName: r.teacher_name,
    memberCount: r.member_count, createdAt: r.created_at, archived: !!r.archived_at,
  };
}

const isManager = (user: UserRow, room: ClassroomRow) =>
  room.teacher_id === user.id || can({ role: user.role, plan: effectivePlan(user) }, 'classroom.manage_any');

async function loadRoom(c: Ctx, id: string) {
  const room = await c.env.DB.prepare(`${CLASS_SELECT} WHERE c.id = ?`).bind(id).first<ClassroomRow>();
  if (!room) throw notFound('Classroom not found.');
  return room;
}

/** Any member, the owning teacher or an admin may view. Returns whether the user manages it. */
async function access(c: Ctx, id: string) {
  const user = requireUser(c);
  const room = await loadRoom(c, id);
  if (isManager(user, room)) return { user, room, manager: true };
  const member = await c.env.DB.prepare('SELECT 1 FROM classroom_members WHERE classroom_id = ? AND user_id = ?').bind(id, user.id).first();
  if (!member) throw forbidden('You are not a member of this classroom.');
  return { user, room, manager: false };
}

async function manage(c: Ctx, id: string) {
  const ctx = await access(c, id);
  if (!ctx.manager) throw forbidden('Only the class teacher can do this.');
  return ctx;
}

// ── Classrooms ──────────────────────────────────────────────────────────────

classrooms.get('/', async (c) => {
  const user = requireUser(c);
  const teaching = await c.env.DB.prepare(`${CLASS_SELECT} WHERE c.teacher_id = ? ORDER BY c.archived_at IS NOT NULL, c.created_at DESC`).bind(user.id).all<ClassroomRow>();
  const learning = await c.env.DB.prepare(`${CLASS_SELECT} JOIN classroom_members cm ON cm.classroom_id = c.id WHERE cm.user_id = ? ORDER BY cm.joined_at DESC`).bind(user.id).all<ClassroomRow>();
  return c.json({
    teaching: teaching.results.map((r) => toClassroom(r, true)),
    learning: learning.results.map((r) => toClassroom(r, false)),
  });
});

/** Teacher dashboard: what needs attention across all classes this user teaches. */
classrooms.get('/teaching/summary', async (c) => {
  const user = requirePermission(c, 'classroom.create');
  const rows = await c.env.DB.prepare(
    `SELECT c.id, c.name,
       (SELECT COUNT(*) FROM classroom_members m WHERE m.classroom_id = c.id) AS learners,
       (SELECT COUNT(*) FROM submissions s JOIN assignments a ON a.id = s.assignment_id WHERE a.classroom_id = c.id AND s.status = 'submitted') AS to_grade,
       (SELECT COUNT(*) FROM assignments a WHERE a.classroom_id = c.id) AS assignments,
       (SELECT COUNT(*) FROM classroom_members m JOIN users u ON u.id = m.user_id WHERE m.classroom_id = c.id AND (u.last_active_day IS NULL OR u.last_active_day < date('now','-7 days'))) AS inactive
     FROM classrooms c WHERE c.teacher_id = ? AND c.archived_at IS NULL ORDER BY c.created_at DESC`,
  ).bind(user.id).all<{ id: string; name: string; learners: number; to_grade: number; assignments: number; inactive: number }>();
  return c.json({ classes: rows.results });
});

classrooms.post('/', async (c) => {
  const user = requirePermission(c, 'classroom.create', 'Only teachers can create classrooms.');
  const input = await body(c, classroomSchema);
  const trackIds = input.trackIds.filter((t) => getTrack(t));
  const id = newId();
  for (let i = 0; i < 5; i++) {
    try {
      await c.env.DB.prepare('INSERT INTO classrooms (id, name, description, level, track_ids, teacher_id, join_code) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .bind(id, input.name, input.description, input.level, JSON.stringify(trackIds), user.id, randomCode(6))
        .run();
      await audit(c.env.DB, user.id, 'classroom.create', id);
      return c.json({ id }, 201);
    } catch (e) {
      if (!String(e).includes('UNIQUE')) throw e; // join-code collision → retry
    }
  }
  throw conflict('Could not generate a unique join code. Try again.');
});

classrooms.post('/join', async (c) => {
  // Joining a teacher's class is free; paid plans unlock extra courses and features, not classes.
  const user = requireUser(c);
  await hit(c.env.DB, `join:${user.id}`, 20, 3600, 'Too many join attempts. Try again later.');
  const { code } = await body(c, joinClassSchema);
  const room = await c.env.DB.prepare('SELECT id, teacher_id, archived_at FROM classrooms WHERE join_code = ?').bind(code).first<{ id: string; teacher_id: string; archived_at: string | null }>();
  if (!room || room.archived_at) throw notFound('No active classroom uses that code. Check it with your teacher.');
  if (room.teacher_id === user.id) throw badRequest('You teach this classroom.');
  await c.env.DB.prepare('INSERT OR IGNORE INTO classroom_members (classroom_id, user_id) VALUES (?, ?)').bind(room.id, user.id).run();
  await linkStudent(c.env.DB, room.teacher_id, user.id, 'class');
  return c.json({ id: room.id });
});

classrooms.get('/:id', async (c) => {
  const { room, manager } = await access(c, c.req.param('id'));
  return c.json({ classroom: toClassroom(room, manager), manager });
});

classrooms.patch('/:id', async (c) => {
  const { user } = await manage(c, c.req.param('id'));
  const input = await body(c, classroomSchema);
  await c.env.DB.prepare('UPDATE classrooms SET name = ?, description = ?, level = ?, track_ids = ? WHERE id = ?')
    .bind(input.name, input.description, input.level, JSON.stringify(input.trackIds.filter((t) => getTrack(t))), c.req.param('id'))
    .run();
  await audit(c.env.DB, user.id, 'classroom.update', c.req.param('id'));
  return c.json({ ok: true });
});

classrooms.post('/:id/archive', async (c) => {
  const { room } = await manage(c, c.req.param('id'));
  await c.env.DB.prepare('UPDATE classrooms SET archived_at = ? WHERE id = ?').bind(room.archived_at ? null : nowIso(), room.id).run();
  return c.json({ ok: true });
});

classrooms.post('/:id/regenerate-code', async (c) => {
  const { room } = await manage(c, c.req.param('id'));
  const code = randomCode(6);
  await c.env.DB.prepare('UPDATE classrooms SET join_code = ? WHERE id = ?').bind(code, room.id).run();
  return c.json({ joinCode: code });
});

classrooms.post('/:id/leave', async (c) => {
  const user = requireUser(c);
  await c.env.DB.prepare('DELETE FROM classroom_members WHERE classroom_id = ? AND user_id = ?').bind(c.req.param('id'), user.id).run();
  return c.json({ ok: true });
});

// ── Members & progress ──────────────────────────────────────────────────────

classrooms.get('/:id/members', async (c) => {
  const { room, manager } = await access(c, c.req.param('id'));
  const trackIds = parseJson<string[]>(room.track_ids, []);
  const members = await c.env.DB.prepare(
    `SELECT u.id, u.name, u.email, u.xp, u.streak, u.avatar_color, u.last_active_day, m.joined_at
     FROM classroom_members m JOIN users u ON u.id = m.user_id WHERE m.classroom_id = ? ORDER BY u.name`,
  ).bind(room.id).all<{ id: string; name: string; email: string; xp: number; streak: number; avatar_color: string; last_active_day: string | null; joined_at: string }>();

  if (!manager) {
    return c.json({ members: members.results.map((m) => ({ id: m.id, name: m.name, avatarColor: m.avatar_color, xp: m.xp })) });
  }

  const placeholders = trackIds.map(() => '?').join(',') || "''";
  const progress = await c.env.DB.prepare(
    `SELECT p.user_id, p.track_id, COUNT(*) AS done FROM progress p
     JOIN classroom_members m ON m.user_id = p.user_id AND m.classroom_id = ?
     WHERE p.status = 'completed' AND p.track_id IN (${placeholders}) GROUP BY p.user_id, p.track_id`,
  ).bind(room.id, ...trackIds).all<{ user_id: string; track_id: string; done: number }>();
  const subs = await c.env.DB.prepare(
    `SELECT s.user_id, COUNT(*) AS submitted, AVG(s.score) AS avg_score FROM submissions s
     JOIN assignments a ON a.id = s.assignment_id WHERE a.classroom_id = ? GROUP BY s.user_id`,
  ).bind(room.id).all<{ user_id: string; submitted: number; avg_score: number | null }>();
  const assignmentCount = await c.env.DB.prepare('SELECT COUNT(*) AS n FROM assignments WHERE classroom_id = ?').bind(room.id).first<{ n: number }>();

  return c.json({
    trackIds,
    assignmentCount: assignmentCount?.n ?? 0,
    members: members.results.map((m) => ({
      id: m.id, name: m.name, email: m.email, xp: m.xp, streak: m.streak, avatarColor: m.avatar_color,
      lastActiveDay: m.last_active_day, joinedAt: m.joined_at,
      tracks: Object.fromEntries(trackIds.map((t) => {
        const done = progress.results.find((p) => p.user_id === m.id && p.track_id === t)?.done ?? 0;
        const total = getTrack(t)?.lessons.length ?? 1;
        return [t, { done, total }];
      })),
      submitted: subs.results.find((s) => s.user_id === m.id)?.submitted ?? 0,
      avgScore: subs.results.find((s) => s.user_id === m.id)?.avg_score ?? null,
    })),
  });
});

/** Put one of your own learners (linked by invite) into this class. */
classrooms.post('/:id/members', async (c) => {
  const { user, room } = await manage(c, c.req.param('id'));
  const { userId } = await body(c, z.object({ userId: z.string().max(40) }));
  if (!(await canSeeStudent(c.env.DB, { id: room.teacher_id, role: 'teacher' }, userId)) && user.role !== 'admin') throw forbidden('Invite this learner first; then you can add them to a class.');
  const r = await c.env.DB.prepare('INSERT OR IGNORE INTO classroom_members (classroom_id, user_id) VALUES (?, ?)').bind(room.id, userId).run();
  if (r.meta.changes) {
    await linkStudent(c.env.DB, room.teacher_id, userId, 'class');
    await notify(c.env, [userId], { kind: 'class_added', title: `You were added to ${room.name}`, body: `${room.teacher_name} added you to their class.`, link: `/classes/${room.id}` });
  }
  return c.json({ ok: true });
});

classrooms.delete('/:id/members/:userId', async (c) => {
  const { user, room } = await manage(c, c.req.param('id'));
  await c.env.DB.prepare('DELETE FROM classroom_members WHERE classroom_id = ? AND user_id = ?').bind(room.id, c.req.param('userId')).run();
  await audit(c.env.DB, user.id, 'classroom.remove_member', room.id, { userId: c.req.param('userId') });
  return c.json({ ok: true });
});

classrooms.post('/:id/insights', async (c) => {
  const { room } = await manage(c, c.req.param('id'));
  await consumeAiQuota(c);
  const data = await c.env.DB.prepare(
    `SELECT u.name, u.xp, u.streak, u.last_active_day,
       (SELECT COUNT(*) FROM progress p WHERE p.user_id = u.id AND p.status = 'completed') AS lessons_done,
       (SELECT AVG(s.score) FROM submissions s JOIN assignments a ON a.id = s.assignment_id WHERE s.user_id = u.id AND a.classroom_id = ?) AS avg_score,
       (SELECT COUNT(*) FROM submissions s JOIN assignments a ON a.id = s.assignment_id WHERE s.user_id = u.id AND a.classroom_id = ?) AS submitted
     FROM classroom_members m JOIN users u ON u.id = m.user_id WHERE m.classroom_id = ?`,
  ).bind(room.id, room.id, room.id).all();
  const total = await c.env.DB.prepare('SELECT COUNT(*) AS n FROM assignments WHERE classroom_id = ?').bind(room.id).first<{ n: number }>();
  const insights = classInsights(await chatJson<Record<string, unknown>>(c.env, {
    temperature: 0.2,
    maxTokens: 700,
    messages: [
      { role: 'system', content: INSIGHTS_PROMPT },
      { role: 'user', content: `Class: ${room.name} (level ${room.level}). Assignments set: ${total?.n ?? 0}. Today: ${nowIso().slice(0, 10)}.\nLearners:\n${JSON.stringify(data.results)}` },
    ],
  }));
  if (!insights.summary) throw unavailable('The AI could not summarise this class right now. Try again.');
  return c.json({ insights });
});

// ── Learner reports (AI weakness assessor) ──────────────────────────────────

classrooms.get('/:id/students/:uid/reports', async (c) => {
  const { room } = await manage(c, c.req.param('id'));
  const rows = await c.env.DB.prepare('SELECT id, content, created_at FROM learner_reports WHERE classroom_id = ? AND user_id = ? ORDER BY created_at DESC LIMIT 10')
    .bind(room.id, c.req.param('uid')).all<{ id: string; content: string; created_at: string }>();
  const reports: LearnerReport[] = rows.results.map((r) => ({ id: r.id, createdAt: r.created_at, content: learnerReport(parseJson<unknown>(r.content, null))! })).filter((r) => r.content);
  return c.json({ reports });
});

classrooms.post('/:id/students/:uid/reports', async (c) => {
  const { user, room } = await manage(c, c.req.param('id'));
  const uid = c.req.param('uid');
  const member = await c.env.DB.prepare('SELECT u.name, u.level, u.xp, u.streak, u.last_active_day FROM classroom_members m JOIN users u ON u.id = m.user_id WHERE m.classroom_id = ? AND m.user_id = ?')
    .bind(room.id, uid).first<{ name: string; level: string; xp: number; streak: number; last_active_day: string | null }>();
  if (!member) throw notFound('That learner is not in this class.');
  await consumeAiQuota(c);
  const [progress, activity, subs] = await Promise.all([
    c.env.DB.prepare("SELECT track_id, lesson_slug, status, updated_at FROM progress WHERE user_id = ? ORDER BY updated_at DESC LIMIT 60").bind(uid).all(),
    c.env.DB.prepare('SELECT kind, ref_id, track_id, passed, score, attempts FROM activity WHERE user_id = ? ORDER BY updated_at DESC LIMIT 80').bind(uid).all(),
    c.env.DB.prepare(
      `SELECT a.title, a.max_score, s.score, s.status, s.ai_feedback FROM submissions s JOIN assignments a ON a.id = s.assignment_id
       WHERE s.user_id = ? AND a.classroom_id = ? ORDER BY s.submitted_at DESC LIMIT 20`,
    ).bind(uid, room.id).all<{ title: string; max_score: number; score: number | null; status: string; ai_feedback: string | null }>(),
  ]);
  const data = {
    learner: { firstName: member.name.split(/\s+/)[0], level: member.level, xp: member.xp, streak: member.streak, lastActive: member.last_active_day },
    classTracks: parseJson<string[]>(room.track_ids, []).map((t) => getTrack(t)?.title ?? t),
    recentLessons: progress.results,
    practice: activity.results,
    assignments: subs.results.map((s) => ({ title: s.title, maxScore: s.max_score, score: s.score, status: s.status, aiImprovements: aiFeedback(parseJson<unknown>(s.ai_feedback, null))?.improvements ?? [] })),
  };
  const content = learnerReport(await chatJson<unknown>(c.env, {
    temperature: 0.2,
    maxTokens: 900,
    messages: [
      { role: 'system', content: LEARNER_REPORT_PROMPT },
      { role: 'user', content: `Class: ${room.name} (level ${room.level}). Today: ${nowIso().slice(0, 10)}.\nData:\n${JSON.stringify(data).slice(0, 14000)}` },
    ],
  }));
  if (!content) throw unavailable('The AI could not write this report right now. Try again.');
  const id = newId();
  await c.env.DB.prepare('INSERT INTO learner_reports (id, classroom_id, user_id, content, created_by) VALUES (?, ?, ?, ?, ?)')
    .bind(id, room.id, uid, JSON.stringify(content), user.id).run();
  return c.json({ report: { id, createdAt: nowIso(), content } satisfies LearnerReport }, 201);
});

// ── Live sessions ───────────────────────────────────────────────────────────

interface SessionRow {
  id: string; classroom_id: string; title: string; description: string; starts_at: string; minutes: number;
  meeting_url: string; recording_url: string; notes: string; summary: string | null; created_at: string;
}
const toSession = (r: SessionRow, manager: boolean): LiveSession => ({
  id: r.id, classroomId: r.classroom_id, title: r.title, description: r.description, startsAt: r.starts_at, minutes: r.minutes,
  meetingUrl: r.meeting_url, recordingUrl: r.recording_url, notes: manager ? r.notes : undefined,
  summary: sessionSummary(parseJson<unknown>(r.summary, null)), createdAt: r.created_at,
});

classrooms.get('/:id/sessions', async (c) => {
  const { room, manager } = await access(c, c.req.param('id'));
  const rows = await c.env.DB.prepare('SELECT * FROM live_sessions WHERE classroom_id = ? ORDER BY starts_at DESC LIMIT 100').bind(room.id).all<SessionRow>();
  return c.json({ sessions: rows.results.map((r) => toSession(r, manager)) });
});

classrooms.post('/:id/sessions', async (c) => {
  const { user, room } = await manage(c, c.req.param('id'));
  const input = await body(c, liveSessionSchema);
  const id = newId();
  await c.env.DB.prepare('INSERT INTO live_sessions (id, classroom_id, title, description, starts_at, minutes, meeting_url, recording_url, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .bind(id, room.id, input.title, input.description, new Date(input.startsAt).toISOString(), input.minutes, input.meetingUrl, input.recordingUrl, user.id)
    .run();
  await audit(c.env.DB, user.id, 'session.create', id, { classroom: room.id });
  const row = await c.env.DB.prepare('SELECT * FROM live_sessions WHERE id = ?').bind(id).first<SessionRow>();
  return c.json({ session: toSession(row!, true) }, 201);
});

classrooms.put('/:id/sessions/:sid', async (c) => {
  const { room } = await manage(c, c.req.param('id'));
  const input = await body(c, liveSessionSchema);
  const res = await c.env.DB.prepare('UPDATE live_sessions SET title = ?, description = ?, starts_at = ?, minutes = ?, meeting_url = ?, recording_url = ? WHERE id = ? AND classroom_id = ?')
    .bind(input.title, input.description, new Date(input.startsAt).toISOString(), input.minutes, input.meetingUrl, input.recordingUrl, c.req.param('sid'), room.id)
    .run();
  if (!res.meta.changes) throw notFound('Session not found.');
  return c.json({ ok: true });
});

classrooms.delete('/:id/sessions/:sid', async (c) => {
  const { room } = await manage(c, c.req.param('id'));
  await c.env.DB.prepare('DELETE FROM live_sessions WHERE id = ? AND classroom_id = ?').bind(c.req.param('sid'), room.id).run();
  return c.json({ ok: true });
});

/** Teacher pastes notes or a transcript; the AI writes the recap learners see (where the class ended, action items). */
classrooms.post('/:id/sessions/:sid/summary', async (c) => {
  const { room } = await manage(c, c.req.param('id'));
  const input = await body(c, sessionNotesSchema);
  const row = await c.env.DB.prepare('SELECT * FROM live_sessions WHERE id = ? AND classroom_id = ?').bind(c.req.param('sid'), room.id).first<SessionRow>();
  if (!row) throw notFound('Session not found.');
  await consumeAiQuota(c);
  const summary = sessionSummary(await chatJson<unknown>(c.env, {
    temperature: 0.2,
    maxTokens: 900,
    messages: [
      { role: 'system', content: SESSION_SUMMARY_PROMPT },
      { role: 'user', content: `Class: ${room.name}. Session: ${row.title} on ${row.starts_at.slice(0, 10)}.\n<notes>\n${asData(input.notes)}\n</notes>` },
    ],
  }));
  if (!summary) throw unavailable('The AI could not write the recap right now. Try again.');
  await c.env.DB.prepare('UPDATE live_sessions SET notes = ?, summary = ?, recording_url = CASE WHEN ? != \'\' THEN ? ELSE recording_url END WHERE id = ?')
    .bind(input.notes, JSON.stringify(summary), input.recordingUrl, input.recordingUrl, row.id).run();
  return c.json({ summary });
});

// ── Assignments ─────────────────────────────────────────────────────────────

interface AssignmentRow {
  id: string; classroom_id: string; title: string; instructions: string; language: string; starter_code: string;
  rubric: string; due_at: string | null; max_score: number; created_at: string; submission_count?: number;
  kind: AssignmentKind; resource: string;
}
const toAssignment = (r: AssignmentRow, studentIds?: string[]): Assignment => ({
  id: r.id, classroomId: r.classroom_id, title: r.title, instructions: r.instructions, language: r.language,
  starterCode: r.starter_code, rubric: r.rubric, dueAt: r.due_at, maxScore: r.max_score, createdAt: r.created_at,
  submissionCount: r.submission_count, kind: r.kind ?? 'code', resource: r.resource ?? '', href: workHref(r), studentIds,
});

async function targetsOf(db: D1Database, ids: string[]) {
  const map = new Map<string, string[]>();
  if (!ids.length) return map;
  const rows = await db.prepare(`SELECT assignment_id, user_id FROM assignment_targets WHERE assignment_id IN (${ids.map(() => '?').join(',')})`).bind(...ids).all<{ assignment_id: string; user_id: string }>();
  for (const r of rows.results) (map.get(r.assignment_id) ?? map.set(r.assignment_id, []).get(r.assignment_id)!).push(r.user_id);
  return map;
}

/** Checks the resource and that every chosen learner is in the class. */
async function checkAssignmentInput(db: D1Database, roomId: string, input: { kind: AssignmentKind; resource: string; studentIds: string[] }) {
  const problem = resourceProblem(input.kind, input.resource);
  if (problem) throw badRequest(problem, { resource: problem });
  const ids = [...new Set(input.studentIds)];
  if (ids.length) {
    const ok = await db.prepare(`SELECT COUNT(*) AS n FROM classroom_members WHERE classroom_id = ? AND user_id IN (${ids.map(() => '?').join(',')})`).bind(roomId, ...ids).first<{ n: number }>();
    if ((ok?.n ?? 0) !== ids.length) throw badRequest('Choose learners from this class.', { studentIds: 'Not in this class' });
  }
  return ids;
}

interface SubmissionRow {
  id: string; assignment_id: string; user_id: string; user_name?: string; code: string; text: string; status: Submission['status'];
  score: number | null; ai_feedback: string | null; teacher_feedback: string | null; submitted_at: string; graded_at: string | null;
}
const toSubmission = (r: SubmissionRow): Submission => ({
  id: r.id, assignmentId: r.assignment_id, userId: r.user_id, userName: r.user_name, code: r.code, text: r.text, status: r.status,
  score: r.score, aiFeedback: aiFeedback(parseJson<unknown>(r.ai_feedback, null)), teacherFeedback: r.teacher_feedback,
  submittedAt: r.submitted_at, gradedAt: r.graded_at,
});

classrooms.get('/:id/assignments', async (c) => {
  const { user, room, manager } = await access(c, c.req.param('id'));
  const rows = await c.env.DB.prepare(
    `SELECT a.*, (SELECT COUNT(*) FROM submissions s WHERE s.assignment_id = a.id) AS submission_count FROM assignments a WHERE a.classroom_id = ? ORDER BY a.created_at DESC`,
  ).bind(room.id).all<AssignmentRow>();
  const targets = await targetsOf(c.env.DB, rows.results.map((r) => r.id));
  if (manager) return c.json({ assignments: rows.results.map((r) => toAssignment(r, targets.get(r.id) ?? [])) });
  // Learners see whole-class work and work set for them, with its status.
  const visible = rows.results.filter((r) => !targets.has(r.id) || targets.get(r.id)!.includes(user.id));
  const status = new Map(((await workMatrix(c.env.DB, [room.id], [user.id])).get(user.id) ?? []).map((w) => [w.a.id, w.status]));
  const subs = await c.env.DB.prepare('SELECT s.* FROM submissions s JOIN assignments a ON a.id = s.assignment_id WHERE a.classroom_id = ? AND s.user_id = ?').bind(room.id, user.id).all<SubmissionRow>();
  const mine: Record<string, Submission> = Object.fromEntries(subs.results.map((s) => [s.assignment_id, toSubmission(s)]));
  return c.json({ assignments: visible.map((r) => ({ ...toAssignment(r), mySubmission: mine[r.id] ?? null, myStatus: status.get(r.id) ?? 'open' })) });
});

classrooms.post('/:id/assignments', async (c) => {
  const { user, room } = await manage(c, c.req.param('id'));
  const input = await body(c, assignmentSchema);
  return c.json(await createAssignment(c, room, user.id, input), 201);
});

/**
 * Creates an assignment, targets it, and tells each learner (in the app and by email).
 * Shared by the class page and Zuva's teacher agent (after the teacher confirms).
 */
export async function createAssignment(c: Ctx, room: { id: string; name: string }, authorId: string, input: z.infer<typeof assignmentSchema>) {
  const db = c.env.DB;
  const ids = await checkAssignmentInput(db, room.id, input);
  const id = newId();
  await db.batch([
    db.prepare('INSERT INTO assignments (id, classroom_id, title, instructions, language, starter_code, rubric, due_at, max_score, created_by, kind, resource) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .bind(id, room.id, input.title, input.instructions, input.language, input.starterCode, input.rubric, input.dueAt ?? null, input.maxScore, authorId, input.kind, input.resource),
    ...ids.map((uid) => db.prepare('INSERT INTO assignment_targets (assignment_id, user_id) VALUES (?, ?)').bind(id, uid)),
  ]);
  const audience = await audienceOf(db, id, room.id);
  const due = input.dueAt ? ` Due ${new Date(input.dueAt).toUTCString().slice(0, 16)}.` : '';
  await notify(c.env, audience, { kind: 'assignment', title: `New work: ${input.title}`, body: `Your teacher set new work in ${room.name}.${due}`, link: workHref({ id, kind: input.kind, resource: input.resource }) }, {
    email: { base: appBase(c.req.url, c.env.APP_URL), cta: 'Open the work', outro: 'You get this email because a teacher on the Academy set you work. You can see everything in your notifications.' },
    wait: (p) => c.executionCtx.waitUntil(p.catch((e) => console.error('[assign:email]', e))),
  });
  await audit(db, authorId, 'assignment.create', id, { classroom: room.id, kind: input.kind, targets: ids.length || 'class' });
  return { id, notified: audience.length };
}

async function loadAssignment(c: Ctx, assignmentId: string) {
  const a = await c.env.DB.prepare('SELECT * FROM assignments WHERE id = ?').bind(assignmentId).first<AssignmentRow>();
  if (!a) throw notFound('Assignment not found.');
  return a;
}

classrooms.get('/assignments/:aid', async (c) => {
  const a = await loadAssignment(c, c.req.param('aid'));
  const { user, manager } = await access(c, a.classroom_id);
  const targets = (await targetsOf(c.env.DB, [a.id])).get(a.id) ?? [];
  if (!manager && targets.length && !targets.includes(user.id)) throw forbidden('This work was set for other learners.');
  const mine = manager ? null : await c.env.DB.prepare('SELECT * FROM submissions WHERE assignment_id = ? AND user_id = ?').bind(a.id, user.id).first<SubmissionRow>();
  const myStatus = manager ? undefined : (((await workMatrix(c.env.DB, [a.classroom_id], [user.id])).get(user.id) ?? []).find((w) => w.a.id === a.id)?.status ?? 'open');
  return c.json({ assignment: { ...toAssignment(a, manager ? targets : undefined), mySubmission: mine ? toSubmission(mine) : null, myStatus }, manager });
});

classrooms.put('/assignments/:aid', async (c) => {
  const a = await loadAssignment(c, c.req.param('aid'));
  await manage(c, a.classroom_id);
  const input = await body(c, assignmentSchema);
  const ids = await checkAssignmentInput(c.env.DB, a.classroom_id, input);
  const db = c.env.DB;
  await db.batch([
    db.prepare('UPDATE assignments SET title = ?, instructions = ?, language = ?, starter_code = ?, rubric = ?, due_at = ?, max_score = ?, kind = ?, resource = ? WHERE id = ?')
      .bind(input.title, input.instructions, input.language, input.starterCode, input.rubric, input.dueAt ?? null, input.maxScore, input.kind, input.resource, a.id),
    db.prepare('DELETE FROM assignment_targets WHERE assignment_id = ?').bind(a.id),
    ...ids.map((uid) => db.prepare('INSERT INTO assignment_targets (assignment_id, user_id) VALUES (?, ?)').bind(a.id, uid)),
  ]);
  return c.json({ ok: true });
});

classrooms.delete('/assignments/:aid', async (c) => {
  const a = await loadAssignment(c, c.req.param('aid'));
  const { user } = await manage(c, a.classroom_id);
  await c.env.DB.prepare('DELETE FROM assignments WHERE id = ?').bind(a.id).run();
  await audit(c.env.DB, user.id, 'assignment.delete', a.id);
  return c.json({ ok: true });
});

/** AI drafts an assignment for the teacher to review (never published automatically). */
classrooms.post('/:id/assignments/draft', async (c) => {
  await manage(c, c.req.param('id'));
  requirePermission(c, 'ai.teacher_assist');
  const input = await body(c, assistSchema);
  await consumeAiQuota(c);
  const draft = assignmentDraft(await chatJson<unknown>(c.env, {
    temperature: 0.6,
    maxTokens: 1600,
    messages: [
      { role: 'system', content: ASSIGNMENT_GENERATOR_PROMPT },
      { role: 'user', content: `Topic: ${input.topic}\nLevel: ${input.level}\nLanguage: ${input.language}` },
    ],
  }));
  if (!draft.title || !draft.instructions) throw unavailable('The AI could not draft this right now. Try again.');
  return c.json({ draft: { ...draft, language: input.language } });
});

// ── Submissions ─────────────────────────────────────────────────────────────

async function aiGrade(c: Ctx, a: AssignmentRow, code: string, text: string): Promise<AiFeedback | null> {
  if (!c.env.OPENAI_API_KEY) return null;
  try {
    await consumeAiQuota(c);
    return aiFeedback(await chatJson<unknown>(c.env, {
      temperature: 0.1,
      maxTokens: 700,
      messages: [
        { role: 'system', content: GRADER_SYSTEM_PROMPT },
        {
          role: 'user',
          content: `<task>\nTitle: ${a.title}\nLanguage: ${a.language}\nInstructions:\n${asData(a.instructions)}\nRubric:\n${asData(a.rubric || '(none — use general criteria)')}\n</task>\n<student_code>\n${asData(code || '(no code)')}\n</student_code>\n<student_message>\n${asData(text || '(no written answer)')}\n</student_message>`,
        },
      ],
    }));
  } catch (e) {
    console.error('[grade] AI grading failed', e);
    return null;
  }
}

classrooms.post('/assignments/:aid/submit', async (c) => {
  const a = await loadAssignment(c, c.req.param('aid'));
  const { user, manager } = await access(c, a.classroom_id);
  if (manager) throw badRequest('Teachers cannot submit to their own assignments.');
  const targets = (await targetsOf(c.env.DB, [a.id])).get(a.id) ?? [];
  if (targets.length && !targets.includes(user.id)) throw forbidden('This work was set for other learners.');
  const input = await body(c, submissionSchema);
  if (!input.code.trim() && !input.text.trim()) throw badRequest('Add your code or a written answer before submitting.');
  const existing = await c.env.DB.prepare('SELECT status FROM submissions WHERE assignment_id = ? AND user_id = ?').bind(a.id, user.id).first<{ status: string }>();
  if (existing?.status === 'graded') throw conflict('This assignment has already been graded by your teacher.');

  const feedback = await aiGrade(c, a, input.code, input.text);
  const id = newId();
  await c.env.DB.prepare(
    `INSERT INTO submissions (id, assignment_id, user_id, code, text, ai_feedback, submitted_at) VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(assignment_id, user_id) DO UPDATE SET code = excluded.code, text = excluded.text, ai_feedback = excluded.ai_feedback, submitted_at = excluded.submitted_at`,
  ).bind(id, a.id, user.id, input.code, input.text, feedback ? JSON.stringify(feedback) : null, nowIso()).run();
  const xp = await awardXp(c.env.DB, user.id, 'assignment', a.id, XP.assignment);
  return c.json({ ok: true, aiFeedback: feedback, xpAwarded: xp });
});

classrooms.get('/assignments/:aid/submissions', async (c) => {
  const a = await loadAssignment(c, c.req.param('aid'));
  await manage(c, a.classroom_id);
  const rows = await c.env.DB.prepare('SELECT s.*, u.name AS user_name FROM submissions s JOIN users u ON u.id = s.user_id WHERE s.assignment_id = ? ORDER BY s.submitted_at DESC').bind(a.id).all<SubmissionRow>();
  return c.json({ submissions: rows.results.map(toSubmission) });
});

/** Who has done a piece of work: every learner it was set for, with their status. */
classrooms.get('/assignments/:aid/progress', async (c) => {
  const a = await loadAssignment(c, c.req.param('aid'));
  await manage(c, a.classroom_id);
  const audience = await audienceOf(c.env.DB, a.id, a.classroom_id);
  if (!audience.length) return c.json({ learners: [] });
  const [matrix, names] = await Promise.all([
    workMatrix(c.env.DB, [a.classroom_id], audience),
    c.env.DB.prepare(`SELECT id, name FROM users WHERE id IN (${audience.map(() => '?').join(',')})`).bind(...audience).all<{ id: string; name: string }>(),
  ]);
  const learners = names.results.map((u) => {
    const w = (matrix.get(u.id) ?? []).find((x) => x.a.id === a.id);
    return { id: u.id, name: u.name, status: w?.status ?? 'open', score: w?.score ?? null };
  }).sort((x, y) => x.name.localeCompare(y.name));
  return c.json({ learners });
});

classrooms.post('/submissions/:sid/grade', async (c) => {
  const sub = await c.env.DB.prepare('SELECT s.*, a.classroom_id, a.max_score FROM submissions s JOIN assignments a ON a.id = s.assignment_id WHERE s.id = ?')
    .bind(c.req.param('sid')).first<SubmissionRow & { classroom_id: string; max_score: number }>();
  if (!sub) throw notFound('Submission not found.');
  const { user } = await manage(c, sub.classroom_id);
  requirePermission(c, 'assignment.grade');
  const input = await body(c, gradeSchema);
  if (input.score > sub.max_score) throw badRequest(`Score cannot exceed ${sub.max_score}.`, { score: `Max ${sub.max_score}` });
  await c.env.DB.prepare("UPDATE submissions SET status = 'graded', score = ?, teacher_feedback = ?, graded_at = ? WHERE id = ?")
    .bind(input.score, input.feedback, nowIso(), sub.id).run();
  await audit(c.env.DB, user.id, 'submission.grade', sub.id, { score: input.score });
  await notify(c.env, [sub.user_id], { kind: 'graded', title: 'Your work was marked', body: `You scored ${input.score} out of ${sub.max_score}.${input.feedback ? ' Your teacher left feedback.' : ''}`, link: `/assignments/${sub.assignment_id}` });
  return c.json({ ok: true });
});

// ── Announcements & discussion ─────────────────────────────────────────────

classrooms.get('/:id/announcements', async (c) => {
  const { room } = await access(c, c.req.param('id'));
  const rows = await c.env.DB.prepare('SELECT a.id, a.classroom_id, a.title, a.body, a.created_at, u.name AS author_name FROM announcements a JOIN users u ON u.id = a.author_id WHERE a.classroom_id = ? ORDER BY a.created_at DESC LIMIT 50').bind(room.id).all();
  return c.json({ announcements: rows.results });
});

classrooms.post('/:id/announcements', async (c) => {
  const { user, room } = await manage(c, c.req.param('id'));
  const input = await body(c, announcementSchema);
  await c.env.DB.prepare('INSERT INTO announcements (id, classroom_id, author_id, title, body) VALUES (?, ?, ?, ?, ?)').bind(newId(), room.id, user.id, input.title, input.body).run();
  return c.json({ ok: true }, 201);
});

classrooms.get('/:id/messages', async (c) => {
  const { room } = await access(c, c.req.param('id'));
  const before = c.req.query('before') ?? '9999';
  const rows = await c.env.DB.prepare(
    'SELECT m.id, m.user_id, m.body, m.created_at, u.name AS user_name, u.role FROM messages m JOIN users u ON u.id = m.user_id WHERE m.classroom_id = ? AND m.created_at < ? ORDER BY m.created_at DESC LIMIT 50',
  ).bind(room.id, before).all();
  return c.json({ messages: rows.results.reverse() });
});

classrooms.post('/:id/messages', async (c) => {
  const { user, room } = await access(c, c.req.param('id'));
  await hit(c.env.DB, `msg:${user.id}`, 30, 60, 'You are sending messages too quickly. Slow down a little.');
  const input = await body(c, messageSchema);
  await c.env.DB.prepare('INSERT INTO messages (id, classroom_id, user_id, body) VALUES (?, ?, ?, ?)').bind(newId(), room.id, user.id, input.body).run();
  return c.json({ ok: true }, 201);
});

classrooms.delete('/:id/messages/:mid', async (c) => {
  const { user, manager } = await access(c, c.req.param('id'));
  const msg = await c.env.DB.prepare('SELECT user_id FROM messages WHERE id = ? AND classroom_id = ?').bind(c.req.param('mid'), c.req.param('id')).first<{ user_id: string }>();
  if (!msg) throw notFound();
  if (!manager && msg.user_id !== user.id) throw forbidden();
  await c.env.DB.prepare('DELETE FROM messages WHERE id = ?').bind(c.req.param('mid')).run();
  return c.json({ ok: true });
});

export default classrooms;
