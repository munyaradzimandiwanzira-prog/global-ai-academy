// End-to-end checks for teacher tests, auto-marking, the gradebook, dashboard insights and teacher requests.
// Needs the built worker on wrangler dev with a local D1 and the OpenAI mock, e.g.
//   npm run build && bash scripts/dev-mock.sh, then: node tests/e2e-tests.mjs
// It changes roles directly in the local D1 (never run it against production).
import { execSync } from 'node:child_process';

const BASE = process.env.BASE_URL ?? 'http://127.0.0.1:8787';
if (!/127\.0\.0\.1|localhost/.test(BASE)) throw new Error('Local only.');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  ok  ', m); } else { fail++; console.log('  FAIL', m); } };
const sql = (q) => execSync(`npx wrangler d1 execute global_ai_academy --local --persist-to .wrangler/state --json --command ${JSON.stringify(q)}`, { stdio: ['ignore', 'pipe', 'ignore'] }).toString();
function client() {
  let cookie = '';
  return async (method, path, body) => {
    const r = await fetch(BASE + path, { method, headers: { 'content-type': 'application/json', origin: BASE, cookie }, body: body ? JSON.stringify(body) : undefined });
    const sc = r.headers.get('set-cookie'); if (sc) cookie = sc.split(';')[0];
    const text = await r.text(); let j = null; try { j = JSON.parse(text); } catch { j = text; }
    return { s: r.status, j };
  };
}
const id = Date.now();
const pw = 'Passw0rd1x';
const signup = (c, name, email, extra = {}) => c('POST', '/api/auth/signup', { name, email, password: pw, acceptTerms: true, ...extra });
const teacher = client(), other = client(), kid = client(), kid2 = client(), outsider = client(), applicant = client();

let r = await signup(teacher, 'Chipo Dube', `chipo${id}@example.com`);
const teacherId = r.j.user.id;
sql(`UPDATE users SET role='teacher' WHERE id='${teacherId}'`);
r = await signup(other, 'Other Teacher', `oth${id}@example.com`);
sql(`UPDATE users SET role='teacher', teacher_listed=0 WHERE id='${r.j.user.id}'`);
r = await teacher('POST', '/api/classrooms', { name: `Grade 4 Gold ${id % 1000}` });
const classId = r.j.id;
const invite = (await teacher('POST', '/api/teach/invites', { label: 'G4', classroomId: classId })).j.invite;
r = await signup(kid, 'Tendai Moyo', `tendai${id}@example.com`, { inviteCode: invite.code });
const kidId = r.j.user.id;
r = await signup(kid2, 'Nyasha Banda', `nyasha${id}@example.com`, { inviteCode: invite.code });
const kid2Id = r.j.user.id;
await signup(outsider, 'Out Sider', `out${id}@example.com`);

// ── Building ────────────────────────────────────────────────────────────
ok((await kid('POST', '/api/tests', { title: 'Nope', kind: 'test', questions: [] })).s === 403, 'learners cannot make tests');
r = await teacher('POST', '/api/tests', { title: 'Fractions check', kind: 'test', questions: [] });
const testId = r.j.id;
ok(r.s === 201 && !!testId, 'teacher creates a draft');
r = await teacher('POST', '/api/tests/import/maths', { unitId: 's3-fractions3', count: 3, seed: 7 });
ok(r.s === 200 && r.j.questions.length >= 1 && r.j.questions.every((q) => q.q && q.marks >= 1), 'imports auto-markable questions from a Cambridge Maths unit');
const imported = r.j.questions ?? [];
const questions = [
  { id: 'q1', type: 'mcq', q: 'Which is bigger?', options: ['1/2', '1/4'], answer: 0, marks: 1 },
  { id: 'q2', type: 'numeric', q: 'Half of 10', answer: '5', marks: 2 },
  { id: 'q3', type: 'short', q: 'Name a shape with 3 sides', accept: ['triangle'], marks: 1 },
  { id: 'q4', type: 'long', q: 'Is the sum of two odd numbers always even? Explain.', rubric: '1 for yes, 2 for a reason that always works', marks: 3 },
  ...imported.slice(0, 2),
];
r = await teacher('PUT', `/api/tests/${testId}`, { title: 'Fractions check', kind: 'test', instructions: 'Show your thinking.', questions, timeLimitMin: 30, showAnswers: true });
ok(r.s === 200, 'teacher saves questions');
ok((await other('PUT', `/api/tests/${testId}`, { title: 'Hijack', kind: 'test', questions })).s === 404, "another teacher cannot edit it");
ok((await other('GET', `/api/tests/${testId}`)).s === 404, "another teacher cannot read results");
ok((await teacher('PUT', `/api/tests/${testId}`, { title: 'x', kind: 'test', questions: [{ id: 'z', type: 'mcq', q: 'q', options: ['a', 'b'], answer: 5, marks: 1 }] })).s === 400, 'an MCQ answer outside its options is rejected');

// ── Publishing ──────────────────────────────────────────────────────────
ok((await teacher('POST', `/api/tests/${testId}/publish`, { classroomId: null, studentIds: [r.j?.id ?? 'nobody-here'] })).s >= 400, 'cannot set a test for learners who are not yours');
r = await teacher('POST', `/api/tests/${testId}/publish`, { classroomId: classId, studentIds: [], dueAt: new Date(Date.now() - 60_000).toISOString() });
ok(r.s === 200 && r.j.assigned === 2, 'sets the test for the whole class');
const notes = (await kid('GET', '/api/notifications')).j;
ok(notes.notifications.some((n) => n.link === `/tests/${testId}`), 'learners are notified with a link');

// ── Taking ──────────────────────────────────────────────────────────────
r = await kid('GET', '/api/tests/mine/list');
ok(r.s === 200 && r.j.tests.some((t) => t.id === testId && t.status === 'to do'), 'test is on the learner list');
ok((await outsider('GET', `/api/tests/${testId}/take`)).s === 404, 'a learner who was not set it cannot open it');
r = await kid('GET', `/api/tests/${testId}/take`);
ok(r.s === 200 && r.j.done === false && r.j.questions.length === questions.length, 'learner opens the paper');
const leak = JSON.stringify(r.j.questions);
ok(!leak.includes('"answer"') && !leak.includes('accept') && !leak.includes('rubric'), 'the paper carries no answers or rubric');
ok((await kid('POST', `/api/tests/${testId}/submit`, { answers: { q1: 0 }, final: false })).j.saved === true, 'answers autosave');
const answers = { q1: 0, q2: '5', q3: 'Triangle!', q4: 'Yes, because odd plus odd always pairs up the leftovers.' };
r = await kid('POST', `/api/tests/${testId}/submit`, { answers, final: true });
ok(r.s === 200 && r.j.status === 'submitted' && r.j.score >= 4, `auto-marked on hand-in (${r.j.score}/${r.j.max}); written answer waits for the teacher`);
ok(r.j.late === true, 'handed in after the due date is marked late');
ok((await kid('POST', `/api/tests/${testId}/submit`, { answers, final: true })).s === 400, 'cannot hand in twice');
r = await kid('GET', `/api/tests/${testId}/take`);
ok(r.j.done === true && r.j.review?.find((x) => x.id === 'q4')?.provisional === true, 'review shows the written mark as not confirmed yet');

// ── Results, marking, gradebook ─────────────────────────────────────────
r = await teacher('GET', `/api/tests/${testId}`);
const row = r.j.rows.find((x) => x.studentId === kidId);
ok(r.s === 200 && row.needsMarking && r.j.rows.find((x) => x.studentId === kid2Id).status === 'not started', 'results show who to mark and who has not started');
ok(r.j.perQuestion.find((q) => q.id === 'q2').pctCorrect === 100, 'per-question % of marks');
ok((await teacher('PUT', `/api/tests/${testId}`, { title: 'Changed', kind: 'test', questions: questions.slice(0, 1) })).s >= 400, 'questions lock once someone hands in');
r = await teacher('GET', `/api/tests/${testId}/attempts/${row.attemptId}`);
ok(r.s === 200 && r.j.attempt.marks.q4?.ai === true && /reason|start/i.test(r.j.attempt.marks.q4.why), 'Zuva suggests a mark for the written answer from the rubric');
r = await teacher('POST', `/api/tests/${testId}/attempts/${row.attemptId}/mark`, { marks: { q4: 2 }, comment: 'Good reasoning!' });
ok(r.s === 200, 'teacher confirms the mark with a comment');
r = await kid('GET', `/api/tests/${testId}/take`);
ok(r.j.status === 'marked' && r.j.comment === 'Good reasoning!', 'learner sees the final mark and comment');
r = await teacher('GET', `/api/tests/gradebook?classroom=${classId}`);
ok(r.s === 200 && r.j.tests.some((t) => t.id === testId) && r.j.students.find((s) => s.id === kidId)?.cells[testId]?.pct != null, 'gradebook records the mark');
ok(r.j.students.find((s) => s.id === kid2Id)?.cells[testId]?.status === 'not started', 'gradebook shows the missing paper');

// ── Insights ────────────────────────────────────────────────────────────
r = await teacher('GET', '/api/teach/insights');
ok(r.s === 200 && r.j.activity.length === 14 && r.j.funnel[0].n === 2, 'insights: 14-day activity and onboarding funnel');
ok(r.j.funnel.find((f) => f.step === 'Handed in work').n === 1, 'funnel counts who handed in work');
ok(r.j.tests.some((t) => t.id === testId && t.handInPct === 50), 'test trend includes hand-in rate');
ok(r.j.flags.find((f) => f.id === kid2Id)?.reasons.some((x) => x.kind === 'overdue'), 'the learner who did not hand in is flagged as overdue');
ok((await kid('GET', '/api/teach/insights')).s === 403, 'learners cannot read class insights');

// ── Teacher requests from the teachers page ─────────────────────────────
r = await signup(applicant, 'Farai Applicant', `farai${id}@example.com`);
ok((await applicant('GET', '/api/me/teacher-request')).j.status === 'none', 'a new learner has no request');
ok((await applicant('POST', '/api/me/teacher-request', {})).j.status === 'pending', 'a signed-in learner can ask to teach');
ok((await applicant('POST', '/api/me/teacher-request', {})).j.status === 'pending', 'asking again does not duplicate');
ok((await teacher('GET', '/api/me/teacher-request')).j.status === 'approved', 'teachers show as approved');

// ── Cleanup of drafts ───────────────────────────────────────────────────
r = await teacher('POST', '/api/tests', { title: 'Scratch', kind: 'homework', questions: [] });
ok((await teacher('DELETE', `/api/tests/${r.j.id}`)).s === 200, 'a draft can be deleted');
ok((await teacher('DELETE', `/api/tests/${testId}`)).s >= 400, 'a published test with marks cannot be deleted');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
