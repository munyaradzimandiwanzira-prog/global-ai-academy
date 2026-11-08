/**
 * Class-wide signals for the teacher dashboard: who is active, who has onboarded, how tests are
 * going, who needs a nudge and what to reteach next. Everything is computed from learning records
 * the teacher is already allowed to see (no Zuva chats).
 */
import type { ClassInsights } from '@shared/tests';
import type { RosterStudent } from '@shared/teaching';

const DAY = 86_400_000;
const isoDay = (t: number) => new Date(t).toISOString().slice(0, 10);
const human = (s: string) => s.replace(/[_-]+/g, ' ').replace(/^\w/, (m) => m.toUpperCase());

export async function classInsights(db: D1Database, teacherId: string, roster: RosterStudent[]): Promise<ClassInsights> {
  const ids = roster.map((r) => r.id);
  const today = Date.now();
  const from = isoDay(today - 13 * DAY);
  const days = Array.from({ length: 14 }, (_, i) => isoDay(today - (13 - i) * DAY));
  const weekAgo = isoDay(today - 7 * DAY);
  const empty: ClassInsights = {
    activity: days.map((day) => ({ day, learners: 0, events: 0 })),
    funnel: [{ step: 'Joined', n: 0 }, { step: 'Started learning', n: 0 }, { step: 'Active this week', n: 0 }, { step: 'Handed in work', n: 0 }],
    tests: [], flags: [], reteach: [], skills: [],
  };
  if (!ids.length) return empty;
  // D1 caps bound parameters per statement; a roster this big is chunked.
  const chunks: string[][] = [];
  for (let i = 0; i < ids.length; i += 80) chunks.push(ids.slice(i, i + 80));

  const activityRows: { day: string; user_id: string; n: number; source: string }[] = [];
  const rush = new Map<string, number>();
  const skillRows: { course: string; skill: string; mastery: number; n: number }[] = [];
  const handedIn = new Set<string>();
  for (const part of chunks) {
    const qs = part.map(() => '?').join(',');
    const [act, fast, skills, hand] = await Promise.all([
      db.prepare(
        `SELECT day, user_id, COUNT(*) AS n, source FROM (
           SELECT substr(updated_at,1,10) AS day, user_id, 'lessons' AS source FROM progress WHERE user_id IN (${qs}) AND updated_at >= ?
           UNION ALL SELECT substr(updated_at,1,10), user_id, 'practice' FROM activity WHERE user_id IN (${qs}) AND updated_at >= ?
           UNION ALL SELECT substr(created_at,1,10), user_id, 'english' FROM esl_attempts WHERE user_id IN (${qs}) AND created_at >= ?
           UNION ALL SELECT substr(created_at,1,10), user_id, 'maths' FROM maths_attempts WHERE user_id IN (${qs}) AND created_at >= ?
           UNION ALL SELECT substr(submitted_at,1,10), student_id, 'tests' FROM test_attempts WHERE student_id IN (${qs}) AND submitted_at >= ?
         ) GROUP BY day, user_id, source`,
      ).bind(...part, from, ...part, from, ...part, from, ...part, from, ...part, from).all<{ day: string; user_id: string; n: number; source: string }>(),
      // Rushing: many quick wrong answers in the last fortnight across the guided courses.
      db.prepare(
        `SELECT user_id, COUNT(*) AS n FROM (
           SELECT user_id FROM esl_attempts WHERE user_id IN (${qs}) AND created_at >= ? AND correct = 0 AND ms IS NOT NULL AND ms < 1500
           UNION ALL SELECT user_id FROM maths_attempts WHERE user_id IN (${qs}) AND created_at >= ? AND correct = 0 AND ms IS NOT NULL AND ms < 1500
         ) GROUP BY user_id`,
      ).bind(...part, from, ...part, from).all<{ user_id: string; n: number }>(),
      db.prepare(
        `SELECT 'English' AS course, skill, AVG(mastery) AS mastery, COUNT(*) AS n FROM esl_skills WHERE user_id IN (${qs}) AND attempts >= 3 GROUP BY skill
         UNION ALL SELECT 'Maths', skill, AVG(mastery), COUNT(*) FROM maths_skills WHERE user_id IN (${qs}) AND attempts >= 3 GROUP BY skill`,
      ).bind(...part, ...part).all<{ course: string; skill: string; mastery: number; n: number }>(),
      db.prepare(
        `SELECT student_id AS id FROM test_attempts WHERE student_id IN (${qs}) AND status IN ('submitted','marked')
         UNION SELECT su.user_id FROM submissions su WHERE su.user_id IN (${qs})`,
      ).bind(...part, ...part).all<{ id: string }>().catch(() => ({ results: [] as { id: string }[] })),
    ]);
    activityRows.push(...act.results);
    for (const r of fast.results) rush.set(r.user_id, Number(r.n));
    skillRows.push(...skills.results);
    for (const r of hand.results) handedIn.add(r.id);
  }

  const activity = days.map((day) => {
    const rows = activityRows.filter((r) => r.day === day);
    return { day, learners: new Set(rows.map((r) => r.user_id)).size, events: rows.reduce((n, r) => n + Number(r.n), 0) };
  });
  const activeIds = new Set(activityRows.filter((r) => r.day >= weekAgo).map((r) => r.user_id));
  const started = roster.filter((r) => r.lastActiveDay || r.lessonsDone || r.kidsStars || activityRows.some((a) => a.user_id === r.id));

  // Tests: the last eight published, oldest first, for a trend line.
  const tests = await db.prepare(
    `SELECT t.id, t.title, t.due_at, t.published_at,
       (SELECT COUNT(*) FROM teacher_test_targets g WHERE g.test_id = t.id) AS assigned,
       (SELECT COUNT(*) FROM test_attempts a WHERE a.test_id = t.id AND a.status IN ('submitted','marked')) AS submitted,
       (SELECT AVG(a.score * 100.0 / a.max_score) FROM test_attempts a WHERE a.test_id = t.id AND a.status IN ('submitted','marked') AND a.max_score > 0) AS avg
     FROM teacher_tests t WHERE t.teacher_id = ? AND t.published_at IS NOT NULL ORDER BY t.published_at DESC LIMIT 8`,
  ).bind(teacherId).all<{ id: string; title: string; due_at: string | null; published_at: string; assigned: number; submitted: number; avg: number | null }>();

  // Per learner: overdue papers and their average on this teacher's tests.
  const perLearner = await db.prepare(
    `SELECT g.student_id AS id,
       SUM(CASE WHEN t.due_at IS NOT NULL AND t.due_at < ? AND (a.status IS NULL OR a.status = 'started') THEN 1 ELSE 0 END) AS overdue,
       AVG(CASE WHEN a.status IN ('submitted','marked') AND a.max_score > 0 THEN a.score * 100.0 / a.max_score END) AS avg,
       SUM(CASE WHEN a.status IN ('submitted','marked') THEN 1 ELSE 0 END) AS done
     FROM teacher_test_targets g JOIN teacher_tests t ON t.id = g.test_id AND t.teacher_id = ?
     LEFT JOIN test_attempts a ON a.test_id = g.test_id AND a.student_id = g.student_id
     GROUP BY g.student_id`,
  ).bind(new Date().toISOString(), teacherId).all<{ id: string; overdue: number; avg: number | null; done: number }>();
  const byId = new Map(perLearner.results.map((r) => [r.id, r]));

  const flags: ClassInsights['flags'] = [];
  for (const r of roster) {
    const t = byId.get(r.id);
    const reasons: ClassInsights['flags'][number]['reasons'] = [];
    if (t && t.overdue > 0) reasons.push({ kind: 'overdue', text: `${t.overdue} overdue ${t.overdue === 1 ? 'test' : 'tests'} not handed in` });
    if (r.assignmentsOpen >= 2) reasons.push({ kind: 'overdue', text: `${r.assignmentsOpen} assignments still open` });
    if (t?.avg != null && t.done >= 1 && t.avg < 50) reasons.push({ kind: 'low', text: `Averaging ${Math.round(t.avg)}% on your tests` });
    if (!started.includes(r)) reasons.push({ kind: 'onboarding', text: 'Joined but hasn’t started yet' });
    else if (!activeIds.has(r.id) && (!r.lastActiveDay || r.lastActiveDay < weekAgo)) reasons.push({ kind: 'inactive', text: r.lastActiveDay ? `Not active since ${r.lastActiveDay}` : 'No activity yet' });
    if ((rush.get(r.id) ?? 0) >= 10) reasons.push({ kind: 'rushing', text: `${rush.get(r.id)} very quick wrong answers in two weeks: may be guessing` });
    if (reasons.length) flags.push({ id: r.id, name: r.name, reasons });
  }
  const weight = { overdue: 4, low: 3, rushing: 2, inactive: 2, onboarding: 1 } as const;
  flags.sort((a, b) => b.reasons.reduce((n, x) => n + weight[x.kind], 0) - a.reasons.reduce((n, x) => n + weight[x.kind], 0));

  // What to reteach: the hardest questions on recent tests, from marks actually earned.
  const reteach: ClassInsights['reteach'] = [];
  for (const t of tests.results.slice(0, 4)) {
    const row = await db.prepare('SELECT questions FROM teacher_tests WHERE id = ?').bind(t.id).first<{ questions: string }>();
    const qs = JSON.parse(row?.questions ?? '[]') as { id: string; q: string; marks: number }[];
    const marks = await db.prepare("SELECT marks FROM test_attempts WHERE test_id = ? AND status IN ('submitted','marked')").bind(t.id).all<{ marks: string }>();
    if (marks.results.length < 2) continue;
    for (const q of qs) {
      let got = 0, n = 0;
      for (const m of marks.results) { const v = (JSON.parse(m.marks || '{}') as Record<string, { m: number }>)[q.id]; if (v) { got += v.m; n++; } }
      if (n >= 2) { const pct = Math.round((got / (n * q.marks)) * 100); if (pct < 60) reteach.push({ testId: t.id, test: t.title, question: q.q, pct }); }
    }
  }
  reteach.sort((a, b) => a.pct - b.pct);

  const skills = skillRows
    .map((s) => ({ course: s.course, skill: human(s.skill), mastery: Math.round(Number(s.mastery) * 100), learners: Number(s.n) }))
    .sort((a, b) => a.mastery - b.mastery);

  return {
    activity,
    funnel: [
      { step: 'Joined', n: roster.length },
      { step: 'Started learning', n: started.length },
      { step: 'Active this week', n: roster.filter((r) => activeIds.has(r.id) || (r.lastActiveDay && r.lastActiveDay >= weekAgo)).length },
      { step: 'Handed in work', n: roster.filter((r) => handedIn.has(r.id)).length },
    ],
    tests: tests.results.reverse().map((t) => ({ id: t.id, title: t.title, averagePct: t.avg == null ? null : Math.round(t.avg), handInPct: t.assigned ? Math.round((t.submitted / t.assigned) * 100) : 0 })),
    flags: flags.slice(0, 12),
    reteach: reteach.slice(0, 5),
    skills: skills.slice(0, 8),
  };
}
