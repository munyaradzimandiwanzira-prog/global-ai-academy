// End-to-end checks for teacher courses, announcements, parent contacts and parent reports.
// Needs the built worker on wrangler dev with a local D1 and the OpenAI mock (scripts/dev-mock.sh).
// It changes roles directly in the local D1 (never run it against production).
import { execSync } from 'node:child_process';

const BASE = process.env.BASE_URL ?? 'http://127.0.0.1:8787';
if (!/127\.0\.0\.1|localhost/.test(BASE)) throw new Error('Local only.');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  ok  ', m); } else { fail++; console.log('  FAIL', m); } };
const sql = (q) => JSON.parse(execSync(`npx wrangler d1 execute global_ai_academy --local --persist-to .wrangler/state --json --command ${JSON.stringify(q)}`, { stdio: ['ignore', 'pipe', 'ignore'] }).toString())[0].results;
function client(opts = {}) {
  let cookie = '';
  return async (method, path, body) => {
    const r = await fetch(BASE + path, { method, headers: { 'content-type': 'application/json', ...(opts.noOrigin ? {} : { origin: BASE }), cookie }, body: body ? JSON.stringify(body) : undefined });
    const sc = r.headers.get('set-cookie'); if (sc) cookie = sc.split(';')[0];
    const text = await r.text(); let j = null; try { j = JSON.parse(text); } catch { j = text; }
    return { s: r.status, j };
  };
}
const id = Date.now();
const signup = (c, name, email, extra = {}) => c('POST', '/api/auth/signup', { name, email, password: 'Passw0rd1x', acceptTerms: true, ...extra });
const teacher = client(), other = client(), kid = client(), kid2 = client(), kid3 = client(), outsider = client(), anon = client(), mailbox = client({ noOrigin: true });

let r = await signup(teacher, 'Rudo Teacher', `rudo${id}@example.com`);
const teacherId = r.j.user.id;
sql(`UPDATE users SET role='teacher' WHERE id='${teacherId}'`);
r = await signup(other, 'Other Teacher', `oth2${id}@example.com`);
sql(`UPDATE users SET role='teacher', teacher_listed=0 WHERE id='${r.j.user.id}'`);
const classId = (await teacher('POST', '/api/classrooms', { name: `Form 1 Blue ${id % 1000}` })).j.id;
const invite = (await teacher('POST', '/api/teach/invites', { label: 'F1', classroomId: classId })).j.invite;
const kidId = (await signup(kid, 'Tendai Moyo', `t2${id}@example.com`, { inviteCode: invite.code })).j.user.id;
const kid2Id = (await signup(kid2, 'Nyasha Banda', `n2${id}@example.com`, { inviteCode: invite.code })).j.user.id;
// A learner linked to the teacher but not in the class.
const invite2 = (await teacher('POST', '/api/teach/invites', { label: 'solo' })).j.invite;
const kid3Id = (await signup(kid3, 'Farai Solo', `f2${id}@example.com`, { inviteCode: invite2.code })).j.user.id;
const outsiderId = (await signup(outsider, 'Out Sider', `o2${id}@example.com`)).j.user.id;

// ── Tests for chosen learners ───────────────────────────────────────────
const testId = (await teacher('POST', '/api/tests', { title: 'Solo check', kind: 'homework', questions: [{ id: 'q1', type: 'numeric', q: '2+2', answer: '4', marks: 1 }] })).j.id;
ok((await teacher('POST', `/api/tests/${testId}/publish`, { classroomId: null, studentIds: [kid3Id, outsiderId] })).s === 403, 'cannot set a test for a learner who is not yours');
r = await teacher('POST', `/api/tests/${testId}/publish`, { classroomId: null, studentIds: [kid3Id, kidId] });
ok(r.s === 200 && r.j.assigned === 2, 'sets a test for chosen learners only');
ok((await kid2('GET', `/api/tests/${testId}/take`)).s === 404, 'a classmate who was not chosen cannot open it');

// ── Parents and guardians ───────────────────────────────────────────────
r = await kid('POST', '/api/messages/guardians/me', { name: 'Mai Moyo', email: `mai${id}@example.com`, relation: 'parent' });
ok(r.s === 201 && r.j.guardian.addedBy === 'learner', 'a learner adds a parent in Settings');
ok((await kid('POST', '/api/messages/guardians/me', { name: 'Mai Moyo', email: `mai${id}@example.com` })).s === 409, 'the same email cannot be added twice');
ok((await kid('POST', '/api/messages/guardians/me', { name: 'Me', email: `t2${id}@example.com` })).s === 400, "a learner's own email is refused");
r = await teacher('POST', `/api/messages/guardians/${kid2Id}`, { name: 'Baba Banda', email: `baba${id}@example.com`, relation: 'guardian' });
ok(r.s === 201 && r.j.guardian.addedBy === 'teacher', 'a teacher adds a guardian for their learner');
ok((await kid2('GET', '/api/notifications')).j.notifications.some((n) => n.kind === 'guardian'), 'the learner is told when a teacher adds a contact');
ok((await other('POST', `/api/messages/guardians/${kid2Id}`, { name: 'X', email: `x${id}@example.com` })).s === 404, "another teacher cannot add contacts for someone else's learner");
ok((await outsider('GET', `/api/messages/guardians/${kidId}`)).s === 404, "a learner cannot read another learner's contacts");
r = await kid2('GET', '/api/messages/guardians/me');
ok(r.j.guardians.length === 1 && r.j.guardians[0].email === `baba${id}@example.com`, 'the learner sees contacts their teacher added');

// ── Announcements ───────────────────────────────────────────────────────
ok((await kid('POST', '/api/messages/announcements', { title: 'Hi', body: 'Hello', classroomId: classId })).s === 403, 'learners cannot send announcements');
ok((await other('POST', '/api/messages/announcements', { title: 'Hi', body: 'Hello', classroomId: classId })).s === 404, "another teacher cannot message someone else's class");
r = await teacher('POST', '/api/messages/announcements', { title: 'No class on Friday', body: 'We meet again on Monday.\nBring your books.', classroomId: classId, toParents: true });
ok(r.s === 201 && r.j.learners === 2 && r.j.parentEmails === 2, 'announcement to a class, also emailed to both parents');
r = await teacher('POST', '/api/messages/announcements', { title: 'Well done Farai', body: 'Great work this week.', studentIds: [kid3Id] });
ok(r.s === 201 && r.j.learners === 1 && r.j.parentEmails === 0, 'announcement to one chosen learner');
r = await kid('GET', '/api/messages/inbox');
ok(r.s === 200 && r.j.unread === 1 && r.j.announcements[0].title === 'No class on Friday', 'learner inbox shows it as unread');
ok((await kid3('GET', '/api/messages/inbox')).j.announcements.every((a) => a.title !== 'No class on Friday'), 'learners outside the class do not get it');
await kid('POST', '/api/messages/inbox/read', {});
ok((await kid('GET', '/api/messages/inbox')).j.unread === 0, 'opening the inbox marks it read');
r = await teacher('GET', '/api/messages/announcements');
ok(r.j.announcements.find((a) => a.title === 'No class on Friday')?.read === 1, 'teacher sees how many have read it');

// ── Unsubscribe ─────────────────────────────────────────────────────────
const [g] = sql(`SELECT unsub_token FROM guardians WHERE student_id='${kid2Id}'`);
r = await anon('GET', `/api/messages/unsubscribe/${g.unsub_token}`);
ok(r.s === 200 && r.j.learner === 'Nyasha' && !r.j.unsubscribed, 'unsubscribe page knows who it is for');
r = await mailbox('POST', `/api/messages/unsubscribe/${g.unsub_token}`, {});
ok(r.s === 200, 'one-click unsubscribe works without an Origin header (mail providers)');
ok((await anon('POST', '/api/messages/unsubscribe/not-a-real-token-at-all', {})).s === 404, 'a wrong token does nothing');
r = await teacher('POST', '/api/messages/announcements', { title: 'Trip', body: 'Bring a hat.', classroomId: classId, toParents: true });
ok(r.j.parentEmails === 1, 'unsubscribed parents get no more emails');

// ── Parent report ───────────────────────────────────────────────────────
r = await teacher('POST', '/api/messages/parent-reports/preview', { studentId: kidId, message: 'Tendai is a pleasure to teach.' });
ok(r.s === 201 && r.j.content.learner === 'Tendai' && r.j.content.summary && r.j.guardians.length === 1, 'teacher previews a parent report written from learning records');
ok(r.j.content.tests.some((t) => t.title === 'Solo check'), 'the report lists tests set by this teacher');
ok(!JSON.stringify(r.j.content).includes('@example.com'), 'the report carries no email addresses');
const report = r.j;
ok((await other('POST', '/api/messages/parent-reports/preview', { studentId: kidId })).s === 404, "another teacher cannot report on someone else's learner");
const token = report.url.split('/').pop();
r = await anon('GET', `/api/messages/report/${token}`);
ok(r.s === 200 && r.j.content.teacherMessage === 'Tendai is a pleasure to teach.', 'a parent opens the report from the link without signing in');
r = await teacher('POST', `/api/messages/parent-reports/${report.id}/send`, {});
ok(r.s === 200 && r.j.sentTo === 1, 'the report is emailed to the parent');
ok((await teacher('POST', `/api/messages/parent-reports/${report.id}/send`, {})).s === 409, 'a report is sent only once');
r = await teacher('GET', `/api/messages/parent-reports?student=${kidId}`);
ok(r.j.reports[0].sentTo === 1 && r.j.reports[0].viewedAt, 'teacher sees it was sent and opened');
sql(`UPDATE parent_reports SET expires_at='2000-01-01T00:00:00Z' WHERE id='${report.id}'`);
ok((await anon('GET', `/api/messages/report/${token}`)).s === 404, 'an expired report link stops working');

// ── Courses ─────────────────────────────────────────────────────────────
ok((await kid('POST', '/api/courses', { title: 'Mine' })).s === 403, 'learners cannot make courses');
r = await teacher('POST', '/api/courses', { title: 'Science: Energy', subject: 'Science', audience: 'Form 1', summary: 'Kinds of energy.' });
const courseId = r.j.id;
ok(r.s === 201, 'teacher creates a course');
let d = (await teacher('GET', `/api/courses/${courseId}`)).j;
ok(d.units.length === 1, 'a new course starts with one unit');
const unit1 = d.units[0].id;
ok((await other('GET', `/api/courses/${courseId}`)).s === 404, "another teacher cannot open it");
ok((await teacher('POST', `/api/courses/${courseId}/publish`, { publish: true })).s === 400, 'cannot publish an empty course');
r = await teacher('POST', '/api/courses/draft-lesson', { courseId, title: 'What is energy?', notes: 'Use a bicycle', minutes: 20 });
ok(r.s === 200 && r.j.body.includes('##') && r.j.checks.length === 3 && r.j.checks.every((c) => c.type !== 'long'), 'Zuva drafts a lesson with auto-marked checks only');
const drafted = r.j;
r = await teacher('POST', `/api/courses/${courseId}/units/${unit1}/lessons`, { title: 'What is energy?', body: drafted.body, videoUrl: 'https://youtu.be/dQw4w9WgXcQ', minutes: 20, checks: drafted.checks });
ok(r.s === 201, 'teacher adds the lesson');
const l1 = r.j.id;
ok((await teacher('POST', `/api/courses/${courseId}/units/${unit1}/lessons`, { title: 'Bad', videoUrl: 'https://evil.example/v.mp4' })).s === 400, 'only YouTube or Vimeo videos are accepted');
ok((await teacher('POST', `/api/courses/${courseId}/units/${unit1}/lessons`, { title: 'Bad', checks: [{ id: 'x', type: 'long', q: 'Explain', rubric: 'whatever', marks: 2 }] })).s === 400, 'lesson checks cannot be written answers');
const l2 = (await teacher('POST', `/api/courses/${courseId}/units/${unit1}/lessons`, { title: 'Saving energy', body: 'Switch off lights.', minutes: 10 })).j.id;
const unit2 = (await teacher('POST', `/api/courses/${courseId}/units`, { title: 'Unit 2: Heat' })).j.id;
const l3 = (await teacher('POST', `/api/courses/${courseId}/units/${unit2}/lessons`, { title: 'Hot and cold', body: '## Heat', minutes: 15 })).j.id;
ok((await teacher('POST', `/api/courses/${courseId}/units/${unit1}/lessons/reorder`, { ids: [l2, l1] })).s === 200, 'lessons can be reordered');
ok((await teacher('POST', `/api/courses/${courseId}/units/${unit1}/lessons/reorder`, { ids: [l2] })).s === 400, 'a reorder must include every lesson');
await teacher('POST', `/api/courses/${courseId}/units/${unit1}/lessons/reorder`, { ids: [l1, l2] });
ok((await teacher('PUT', `/api/courses/${courseId}/share`, { classroomIds: [classId], studentIds: [outsiderId] })).s === 403, "cannot share with someone who isn't your learner");
r = await teacher('PUT', `/api/courses/${courseId}/share`, { classroomIds: [classId], studentIds: [kid3Id] });
ok(r.s === 200 && r.j.learners === 3, 'shared with a class and one more learner');
ok((await kid('GET', `/api/courses/mine/${courseId}`)).s === 404, 'learners cannot open a draft course');
ok((await kid('GET', '/api/courses/mine/list')).j.courses.length === 0, 'a draft is not on the learner list');
ok((await teacher('POST', `/api/courses/${courseId}/publish`, { publish: true })).s === 200, 'teacher publishes');
ok((await kid3('GET', '/api/notifications')).j.notifications.some((n) => n.link === `/my-courses/${courseId}`), 'learners are told about the new course');
r = await kid('GET', '/api/courses/mine/list');
ok(r.j.courses.length === 1 && r.j.courses[0].lessons === 3 && r.j.courses[0].teacher === 'Rudo Teacher', 'the course is on the learner list');
ok((await outsider('GET', `/api/courses/mine/${courseId}`)).s === 404, 'a learner without access cannot open it');
r = await kid('GET', `/api/courses/mine/${courseId}`);
ok(r.j.units.length === 2 && r.j.units[0].lessons[0].id === l1, 'units and lessons in order');
r = await kid('GET', `/api/courses/mine/${courseId}/lessons/${l1}`);
const leak = JSON.stringify(r.j.checks);
ok(r.s === 200 && r.j.video?.startsWith('https://www.youtube-nocookie.com/embed/') && !leak.includes('"answer"') && !leak.includes('accept'), 'lesson opens with a privacy-friendly video and no answers');
ok(r.j.next?.id === l2 && r.j.prev === null, 'next and previous lessons');
r = await kid('POST', `/api/courses/mine/${courseId}/lessons/${l1}/complete`, { answers: { c1: 0, c2: '2', c3: 'Potential' } });
ok(r.s === 200 && r.j.score === 3 && r.j.max === 3, 'the quick check marks itself');
r = await kid('POST', `/api/courses/mine/${courseId}/lessons/${l1}/complete`, { answers: { c1: 1, c2: '5', c3: 'no' } });
ok(r.j.score === 0, 'a retry is marked too…');
r = await kid('GET', `/api/courses/mine/${courseId}/lessons/${l1}`);
ok(r.j.done?.score === 3, '…but the best score is kept');
await kid('POST', `/api/courses/mine/${courseId}/lessons/${l2}/complete`, {});
// Teacher previews do not create progress.
await teacher('POST', `/api/courses/mine/${courseId}/lessons/${l3}/complete`, {});
d = (await teacher('GET', `/api/courses/${courseId}`)).j;
const p = d.progress.find((x) => x.studentId === kidId);
ok(p?.done === 2 && p.avgPct === 100, 'teacher sees each learner’s progress');
ok(d.progress.find((x) => x.studentId === kid2Id)?.done === 0 && !d.progress.some((x) => x.studentId === teacherId), 'learners who haven’t started show; teacher previews don’t count');
// A new class member gets the course automatically.
const kid4 = client();
const kid4Id = (await signup(kid4, 'New Kid', `k4${id}@example.com`, { inviteCode: invite.code })).j.user.id;
ok((await kid4('GET', '/api/courses/mine/list')).j.courses.length === 1, 'someone who joins the class later gets the course too');
r = await teacher('POST', '/api/messages/parent-reports/preview', { studentId: kidId });
ok(r.j.content.courses.some((x) => x.title === 'Science: Energy' && x.done === 2), 'parent report includes course progress');
ok((await teacher('POST', `/api/courses/${courseId}/publish`, { publish: false })).s === 200 && (await kid('GET', `/api/courses/mine/${courseId}`)).s === 404, 'unpublishing hides it from learners');
ok((await teacher('DELETE', `/api/courses/${courseId}`)).s === 200 && sql(`SELECT COUNT(*) AS n FROM teacher_lessons WHERE course_id='${courseId}'`)[0].n === 0, 'deleting a course removes its lessons');
void kid4Id;

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
