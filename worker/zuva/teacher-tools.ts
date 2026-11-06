/**
 * Zuva's tools in teacher mode. Every tool runs as the signed-in teacher and can only reach that
 * teacher's own classes and learners (rosterFor / assertCanSeeStudent). Tools that would change
 * what learners see (assignments) only prepare a draft card: the teacher confirms in the UI.
 */
import type { AssignmentDraftCard } from '@shared/zuva';
import { KID_LEVELS, levelHref } from '@shared/kids-curriculum';
import { kidGame } from '@shared/kids-games';
import type { AssignmentKind, RosterStudent } from '@shared/teaching';
import type { CatalogTrack } from '@shared/content';
import { allTracks, getTrack } from '../lib/catalog';
import { badRequest } from '../lib/errors';
import { rosterFor, studentDetail } from '../lib/students';
import { assertCanSeeStudent, isAdmin } from '../lib/teaching';
import { resourceProblem } from '../lib/assignments';
import { makeLessonPlan, makeStudentReport } from '../routes/teach';
import { obj, str, type ToolCtx, type ZuvaTool } from './tool-kit';

const first = (name: string) => name.split(/\s+/)[0] ?? name;
const norm = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim();

function teacherOf(ctx: ToolCtx) {
  if (!ctx.user || (ctx.user.role !== 'teacher' && ctx.user.role !== 'admin')) throw badRequest('Teacher tools need a teacher account.');
  return ctx.user;
}

/** Finds one of this teacher's learners by id, full name or a unique first name. */
async function findStudent(ctx: ToolCtx, who: string): Promise<RosterStudent | string> {
  const roster = await rosterFor(ctx.env.DB, teacherOf(ctx).id);
  const q = norm(who);
  if (!q) return 'Say which learner.';
  const exact = roster.filter((r) => r.id === who || norm(r.name) === q);
  if (exact.length === 1) return exact[0]!;
  const partial = roster.filter((r) => norm(r.name).includes(q) || norm(first(r.name)) === q);
  if (partial.length === 1) return partial[0]!;
  if (partial.length > 1) return `More than one learner matches "${who}": ${partial.slice(0, 6).map((r) => `${r.name} (id ${r.id})`).join(', ')}. Ask the teacher which one.`;
  return `No learner called "${who}" is in this teacher's classes or invites.`;
}

async function findClass(ctx: ToolCtx, which: string) {
  const t = teacherOf(ctx);
  const rows = await ctx.env.DB.prepare('SELECT id, name FROM classrooms WHERE teacher_id = ? AND archived_at IS NULL').bind(t.id).all<{ id: string; name: string }>();
  const q = norm(which);
  const hit = rows.results.find((r) => r.id === which) ?? rows.results.find((r) => norm(r.name) === q) ?? (rows.results.filter((r) => norm(r.name).includes(q)).length === 1 ? rows.results.find((r) => norm(r.name).includes(q)) : undefined);
  if (hit) return hit;
  if (rows.results.length === 1 && !q) return rows.results[0]!;
  throw badRequest(rows.results.length ? `Say which class: ${rows.results.map((r) => r.name).join(', ')}.` : 'This teacher has no active classes yet. Create one on the Classes page first.');
}

/** Turns "/learn/python/lists", "python/lists", "/kids/launch?level=2" or "launch:2" into a resource. */
function resolveResource(kind: AssignmentKind, raw: string): { resource: string; title: string } {
  const v = raw.trim();
  if (kind === 'lesson') {
    const m = v.replace(/^\/?learn\//, '').split(/[?#]/)[0]!.split('/');
    const track = getTrack(m[0] ?? '');
    const lesson = track?.lessons.find((l) => l.slug === m[1]);
    if (!track || !lesson) throw badRequest(`"${raw}" is not a lesson. Use search_lessons to find the lesson path.`);
    return { resource: `${track.id}/${lesson.slug}`, title: `${track.title}: ${lesson.title}` };
  }
  if (kind === 'kids') {
    const level = KID_LEVELS.find((l) => l.key === v || levelHref(l) === v);
    if (!level) throw badRequest(`"${raw}" is not a Kids Zone level. Use list_kids_games with a stage to find level links.`);
    return { resource: level.key, title: `${kidGame(level.game)!.title}: ${level.name} (Stage ${level.stage})` };
  }
  return { resource: '', title: '' };
}

function findTrack(which: string): CatalogTrack | undefined {
  const q = norm(which);
  const all = allTracks() as CatalogTrack[];
  return getTrack(which) ?? all.find((t) => norm(t.title) === q) ?? (q ? all.find((t) => norm(t.title).includes(q)) : undefined);
}

export const TEACHER_TOOLS: ZuvaTool[] = [
  {
    label: 'Looking at your classes',
    modes: ['teacher'],
    signedIn: true,
    spec: { name: 'list_classes', description: 'List this teacher’s active classes with learner counts, assignments set and submissions waiting to be graded.', parameters: obj({}) },
    run: async (ctx) => {
      const t = teacherOf(ctx);
      const rows = await ctx.env.DB.prepare(
        `SELECT c.id, c.name, c.level, c.track_ids,
           (SELECT COUNT(*) FROM classroom_members m WHERE m.classroom_id = c.id) AS learners,
           (SELECT COUNT(*) FROM assignments a WHERE a.classroom_id = c.id) AS assignments,
           (SELECT COUNT(*) FROM submissions s JOIN assignments a ON a.id = s.assignment_id WHERE a.classroom_id = c.id AND s.status = 'submitted') AS to_grade
         FROM classrooms c WHERE c.teacher_id = ? AND c.archived_at IS NULL ORDER BY c.created_at DESC`,
      ).bind(t.id).all<{ id: string; name: string; level: string; track_ids: string; learners: number; assignments: number; to_grade: number }>();
      if (!rows.results.length) return 'No active classes yet.';
      return JSON.stringify(rows.results.map((r) => ({ id: r.id, name: r.name, level: r.level, courses: (JSON.parse(r.track_ids) as string[]).map((x) => getTrack(x)?.title ?? x), learners: r.learners, assignments: r.assignments, toGrade: r.to_grade, page: `/classes/${r.id}` })));
    },
  },
  {
    label: 'Checking your learners',
    modes: ['teacher'],
    signedIn: true,
    spec: {
      name: 'list_students',
      description: 'List this teacher’s learners with progress: lessons done, Kids Zone stars, assignments open/done, average score, last active day. Optionally only one class, or only learners needing attention.',
      parameters: obj({ classId: { type: 'string', description: 'Class id or name (optional)' }, needsAttention: { type: 'boolean', description: 'Only inactive for 7+ days or with 2+ open assignments' } }),
    },
    run: async (ctx, args) => {
      const t = teacherOf(ctx);
      let roster = await rosterFor(ctx.env.DB, t.id);
      const cls = str(args.classId, 80);
      if (cls) { const room = await findClass(ctx, cls); roster = roster.filter((r) => r.classes.some((c) => c.id === room.id)); }
      const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString().slice(0, 10);
      if (args.needsAttention === true) roster = roster.filter((r) => r.assignmentsOpen >= 2 || !r.lastActiveDay || r.lastActiveDay < weekAgo);
      if (!roster.length) return 'No learners match.';
      return JSON.stringify(roster.slice(0, 60).map((r) => ({ id: r.id, name: r.name, level: r.level, classes: r.classes.map((c) => c.name), lessonsDone: r.lessonsDone, kidsStars: r.kidsStars, open: r.assignmentsOpen, done: r.assignmentsDone, avgScorePercent: r.avgScore, lastActive: r.lastActiveDay, streak: r.streak, paidPlan: r.paid })));
    },
  },
  {
    label: 'Reading a learner’s progress',
    modes: ['teacher'],
    signedIn: true,
    spec: { name: 'student_overview', description: 'Detailed learning data for ONE of this teacher’s learners: courses, Kids Zone stages, practice attempts, assignments and recent activity.', parameters: obj({ student: { type: 'string', description: 'Learner id or name' } }, ['student']) },
    run: async (ctx, args) => {
      const s = await findStudent(ctx, str(args.student, 80));
      if (typeof s === 'string') return s;
      const t = teacherOf(ctx);
      await assertCanSeeStudent(ctx.env.DB, t, s.id);
      const d = await studentDetail(ctx.env.DB, t.id, s.id, isAdmin(t));
      if (!d) return 'Learner not found.';
      const { email: _email, ...student } = d.student;
      return JSON.stringify({ ...d, student, page: `/teach/students/${s.id}` }).slice(0, 3800);
    },
  },
  {
    label: 'Writing a progress report',
    modes: ['teacher'],
    signedIn: true,
    spec: { name: 'student_report', description: 'Write and save a Zuva report on ONE learner: summary, strengths, pain points with evidence, next steps with links, and a note for parents. Shows a report card.', parameters: obj({ student: { type: 'string', description: 'Learner id or name' } }, ['student']) },
    run: async (ctx, args) => {
      const s = await findStudent(ctx, str(args.student, 80));
      if (typeof s === 'string') return s;
      const t = teacherOf(ctx);
      await assertCanSeeStudent(ctx.env.DB, t, s.id);
      const r = await makeStudentReport(ctx.env, t.id, t.id, s.id, isAdmin(t));
      ctx.emit({ t: 'card', card: { kind: 'report', studentId: s.id, studentName: s.name, reportId: r.id, summary: r.content.summary, painPoints: r.content.painPoints, nextSteps: r.content.nextSteps } });
      return JSON.stringify({ shownToTeacher: true, saved: true, report: r.content, page: `/teach/students/${s.id}` });
    },
  },
  {
    label: 'Drafting an assignment',
    modes: ['teacher'],
    signedIn: true,
    spec: {
      name: 'draft_assignment',
      description: 'Prepare an assignment for one class (whole class or chosen learners). It is NOT sent: the teacher sees a card and presses Assign. kind: lesson (resource = a lesson path), kids (resource = a Kids Zone level link or key), code (write and submit code), task (written answer).',
      parameters: obj({
        classId: { type: 'string', description: 'Class id or name' },
        title: { type: 'string' },
        instructions: { type: 'string', description: 'What learners should do, in plain words' },
        kind: { type: 'string', enum: ['lesson', 'kids', 'code', 'task'] },
        resource: { type: 'string', description: 'For lesson: /learn/<track>/<lesson>. For kids: /kids/<game>?level=<n>. Otherwise empty.' },
        students: { type: 'array', items: { type: 'string' }, description: 'Learner names or ids; leave empty for the whole class' },
        dueInDays: { type: 'integer', minimum: 1, maximum: 60 },
        language: { type: 'string', description: 'For code tasks, e.g. python' },
      }, ['classId', 'title', 'instructions', 'kind']),
    },
    run: async (ctx, args) => {
      const room = await findClass(ctx, str(args.classId, 80));
      const kind = (['lesson', 'kids', 'code', 'task'] as const).find((k) => k === args.kind) ?? 'task';
      const { resource, title: resourceTitle } = resolveResource(kind, str(args.resource, 200));
      const problem = resourceProblem(kind, resource);
      if (problem) return problem;
      const members = await ctx.env.DB.prepare('SELECT u.id, u.name FROM classroom_members m JOIN users u ON u.id = m.user_id WHERE m.classroom_id = ?').bind(room.id).all<{ id: string; name: string }>();
      const chosen: { id: string; name: string }[] = [];
      for (const who of (Array.isArray(args.students) ? args.students : []).slice(0, 60)) {
        const q = norm(str(who, 80));
        const m = members.results.filter((x) => x.id === who || norm(x.name) === q || norm(first(x.name)) === q);
        if (m.length !== 1) return `"${str(who, 80)}" is ${m.length ? 'ambiguous' : 'not in'} ${room.name}. Class members: ${members.results.map((x) => x.name).join(', ') || 'none yet'}.`;
        chosen.push(m[0]!);
      }
      const days = Number(args.dueInDays);
      const card: AssignmentDraftCard = {
        kind: 'assignment_draft', classroomId: room.id, classroomName: room.name, studentIds: chosen.map((x) => x.id), studentNames: chosen.map((x) => x.name),
        title: str(args.title, 150) || 'New work', instructions: str(args.instructions, 3000) || 'See the linked work.', assignmentKind: kind, resource, resourceTitle,
        language: str(args.language, 20) || 'python', dueAt: Number.isInteger(days) && days > 0 && days <= 60 ? new Date(Date.now() + days * 86_400_000).toISOString() : null,
      };
      ctx.emit({ t: 'card', card });
      return `Draft shown to the teacher for ${chosen.length ? chosen.map((x) => first(x.name)).join(', ') : `the whole of ${room.name} (${members.results.length} learners)`}. Nothing is sent until they press Assign on the card; tell them so.`;
    },
  },
  {
    label: 'Writing a lesson plan',
    modes: ['teacher'],
    signedIn: true,
    spec: {
      name: 'lesson_plan',
      description: 'Write and save a lesson plan for one session of an Academy course: objectives, timed activities, differentiation, assessment, homework and links. Shows a plan card the teacher can open, edit and print.',
      parameters: obj({
        course: { type: 'string', description: 'Course id or title, e.g. python' },
        lessons: { type: 'array', items: { type: 'string' }, description: 'Up to 5 lesson slugs or titles from that course (optional)' },
        minutes: { type: 'integer', minimum: 20, maximum: 240 },
        focus: { type: 'string', description: 'Anything the teacher asked for: class size, devices, goals' },
        classId: { type: 'string', description: 'Class id or name, to fit the plan to it (optional)' },
      }, ['course']),
    },
    run: async (ctx, args) => {
      const t = teacherOf(ctx);
      const track = findTrack(str(args.course, 80));
      if (!track) return `No course matches "${str(args.course, 80)}". Use search_lessons or get_track_outline to find it.`;
      const wanted = (Array.isArray(args.lessons) ? args.lessons : []).map((x) => norm(str(x, 120))).filter(Boolean).slice(0, 5);
      const slugs = wanted.map((w) => track.lessons.find((l) => l.slug === w || norm(l.title) === w) ?? track.lessons.find((l) => norm(l.title).includes(w))).filter(Boolean).map((l) => l!.slug);
      const room = str(args.classId, 80) ? await findClass(ctx, str(args.classId, 80)) : null;
      const minutes = Math.min(240, Math.max(20, Math.round(Number(args.minutes) || 60)));
      const plan = await makeLessonPlan(ctx.env, t.id, { trackId: track.id, lessonSlugs: [...new Set(slugs)], classroomId: room?.id ?? null, minutes, focus: str(args.focus, 600) });
      ctx.emit({ t: 'card', card: { kind: 'lesson_plan', id: plan.id, title: plan.title, trackTitle: plan.trackTitle, minutes, objectives: plan.content.objectives.slice(0, 4) } });
      return JSON.stringify({ saved: true, id: plan.id, title: plan.title, page: `/teach/plans/${plan.id}`, objectives: plan.content.objectives, timeline: plan.content.timeline.map((x) => `${x.minutes} min ${x.phase}`) });
    },
  },
  {
    label: 'Opening the course outline',
    modes: ['teacher'],
    spec: { name: 'get_track_outline', description: 'Get a course’s lessons in order, with paths, to plan teaching or pick a lesson to assign.', parameters: obj({ course: { type: 'string', description: 'Course id or title' } }, ['course']) },
    run: async (_ctx, args) => {
      const track = findTrack(str(args.course, 80));
      if (!track) return 'No course matches. Use search_lessons.';
      return JSON.stringify({ id: track.id, title: track.title, lessons: track.lessons.map((l, i) => ({ n: i + 1, title: l.title, path: `/learn/${track.id}/${l.slug}`, minutes: l.minutes })) }).slice(0, 3800);
    },
  },
];
