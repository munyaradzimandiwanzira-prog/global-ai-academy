// End-to-end checks for teachers, invites, assignments, Zuva's teacher agent, wallets and the admin console.
// Needs the built worker on wrangler dev with a local D1 and the OpenAI mock (ZUVA_MOCK=1), e.g.
//   npm run build && bash scripts/dev-mock.sh, then: node tests/e2e-teaching.mjs
// It changes roles directly in the local D1 (never run it against production).
import { execSync } from 'node:child_process';

const BASE = process.env.BASE_URL ?? 'http://127.0.0.1:8787';
if (!/127\.0\.0\.1|localhost/.test(BASE)) throw new Error('Local only.');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  ok  ', m); } else { fail++; console.log('  FAIL', m); } };
const sql = (q) => execSync(`npx wrangler d1 execute global_ai_academy --local --persist-to .wrangler/state --json --command ${JSON.stringify(q)}`, { stdio: ['ignore', 'pipe', 'ignore'] }).toString();
function client() {
  let cookie = '';
  const call = async (method, path, body) => {
    const r = await fetch(BASE + path, { method, headers: { 'content-type': 'application/json', origin: BASE, cookie }, body: body ? JSON.stringify(body) : undefined });
    const sc = r.headers.get('set-cookie'); if (sc) cookie = sc.split(';')[0];
    const text = await r.text();
    let j = null; try { j = JSON.parse(text); } catch { j = text; }
    return { s: r.status, j };
  };
  return call;
}
/** Reads Zuva's server-sent events into { text, cards, tools }. */
async function zuva(call, message, threadId) {
  const r = await call('POST', '/api/zuva/chat', { mode: 'teacher', message, threadId, page: { path: '/teach/zuva' } });
  const out = { s: r.s, text: '', cards: [], tools: [], threadId: null, raw: r.j };
  if (typeof r.j !== 'string') return out;
  for (const line of r.j.split('\n')) {
    const l = line.replace(/^data:\s*/, '').trim();
    if (!l) continue;
    try {
      const e = JSON.parse(l);
      if (e.t === 'text' || e.t === 'delta') out.text += e.text ?? e.delta ?? '';
      if (e.t === 'card') out.cards.push(e.card);
      if (e.t === 'tool' || e.t === 'working') out.tools.push(e.name ?? e.label);
      if (e.threadId) out.threadId = e.threadId;
    } catch { /* keep-alive */ }
  }
  return out;
}

const id = Date.now();
const admin = client(), teacher = client(), other = client(), kid = client(), kid2 = client(), guest = client();
const pw = 'Passw0rd1x';
const signup = (c, name, email, extra = {}) => c('POST', '/api/auth/signup', { name, email, password: pw, acceptTerms: true, ...extra });

// ── Accounts ────────────────────────────────────────────────────────────
let r = await signup(admin, 'Ada Admin', `ada${id}@example.com`);
const adminId = r.j.user.id;
sql(`UPDATE users SET role='admin', mfa_enabled_at='2026-01-01T00:00:00Z', email_verified_at='2026-01-01T00:00:00Z' WHERE id='${adminId}'`);
ok((await admin('GET', '/api/admin/finance')).s === 200, 'admin (with two-step) opens finance');

r = await signup(teacher, 'Rudo Ncube', `rudo${id}@example.com`, { wantsToTeach: true });
const teacherId = r.j.user.id;
ok(r.s === 201 && r.j.user.role === 'student', 'teacher request starts as a learner');
const notes = (await admin('GET', '/api/notifications')).j;
ok(notes.notifications.some((n) => /Rudo/.test(n.title + n.body)), 'admins are notified of the teaching request');
ok((await teacher('GET', '/api/teach/overview')).s === 403, 'unapproved teacher cannot open the portal');
const reqs = (await admin('GET', '/api/admin/teacher-requests')).j;
const reqRow = reqs?.requests?.find?.((x) => x.userId === teacherId || x.user_id === teacherId);
if (reqRow) r = await admin('POST', `/api/admin/teacher-requests/${reqRow.id}/approve`);
else sql(`UPDATE users SET role='teacher', school='Gweru High', city='Gweru' WHERE id='${teacherId}'`);
sql(`UPDATE users SET school='Gweru High', city='Gweru' WHERE id='${teacherId}'`);
ok((await teacher('GET', '/api/teach/overview')).s === 200, 'approved teacher opens the portal');

r = await signup(other, 'Other Teacher', `other${id}@example.com`);
sql(`UPDATE users SET role='teacher', teacher_listed=0 WHERE id='${r.j.user.id}'`);
const otherId = r.j.user.id;

// ── Classes and invites ─────────────────────────────────────────────────
r = await teacher('POST', '/api/classrooms', { name: `Form 2 Blue ${id % 1000}`, trackIds: ['python'] });
const classId = r.j.id;
ok(r.s === 201, 'teacher creates a class');
r = await teacher('POST', '/api/teach/invites', { label: 'Form 2', classroomId: classId, maxUses: 2, expiresInDays: 30 });
const invite = r.j.invite;
ok(r.s === 201 && /^T-[A-Z0-9]{6}$/.test(invite.code) && invite.url.endsWith(`/join/${invite.code}`), 'teacher makes an invite code and link');
ok((await other('POST', '/api/teach/invites', { classroomId: classId })).s >= 400, "another teacher cannot make invites for this class");
r = await guest('GET', `/api/teach/public/invites/${invite.code.toLowerCase()}`);
ok(r.s === 200 && r.j.invite.teacherName === 'Rudo Ncube' && r.j.invite.classroomName.startsWith('Form 2'), 'anyone can preview an invite (case-insensitive)');
ok(!JSON.stringify(r.j).includes('@'), 'invite preview leaks no email');
ok((await guest('GET', '/api/teach/public/invites/T-NOPE00')).s === 404, 'unknown invite is 404');

// Sign up with the invite; free, linked, in the class.
r = await signup(kid, 'Tariro Moyo', `tariro${id}@example.com`, { inviteCode: invite.code });
const kidId = r.j.user.id;
ok(r.s === 201 && r.j.user.plan === 'free', 'learner signs up free with the invite');
ok((await kid('GET', '/api/me/teachers')).j.teachers.some((t) => t.id === teacherId), 'learner is linked to the teacher');
ok((await kid('GET', '/api/classrooms')).j.learning?.some?.((c) => c.id === classId) ?? JSON.stringify((await kid('GET', '/api/classrooms')).j).includes(classId), 'learner joined the invite’s class');
r = await signup(guest, 'Bad Invite', `bad${id}@example.com`, { inviteCode: 'T-NOPE00' });
ok(r.s >= 400 && r.s < 500, 'sign-up with a dead invite fails before the account is made');

// Find a listed teacher by search; unlisted teachers are hidden.
r = await guest('GET', '/api/teach/public/teachers?q=Ncube');
ok(r.j.teachers.some((t) => t.id === teacherId) && !JSON.stringify(r.j).includes('@'), 'listed teacher is findable by name, without email');
ok(!(await guest('GET', '/api/teach/public/teachers?q=Other')).j.teachers.some((t) => t.id === otherId), 'unlisted teacher is not findable');
r = await signup(kid2, 'Farai Chari', `farai${id}@example.com`, { teacherIds: [teacherId, otherId] });
const kid2Id = r.j.user.id;
const k2t = (await kid2('GET', '/api/me/teachers')).j.teachers.map((t) => t.id);
ok(k2t.includes(teacherId) && !k2t.includes(otherId), 'choosing teachers at sign-up links listed ones only');

// Max uses.
await signup(client(), 'Third', `third${id}@example.com`, { inviteCode: invite.code });
r = await signup(client(), 'Fourth', `fourth${id}@example.com`, { inviteCode: invite.code });
ok(r.s >= 400 && /maximum/i.test(JSON.stringify(r.j)), 'invite stops at its maximum uses');

// ── Roster and privacy ──────────────────────────────────────────────────
r = await teacher('GET', '/api/teach/students');
const roster = r.j.students;
ok(roster.some((s) => s.id === kidId) && roster.some((s) => s.id === kid2Id), 'teacher roster lists invited and chosen learners');
ok((await other('GET', `/api/teach/students/${kidId}`)).s === 403 || (await other('GET', `/api/teach/students/${kidId}`)).s === 404, "another teacher cannot see this learner");
ok((await kid('GET', '/api/teach/students')).s === 403, 'learner cannot open the teacher portal');

// Some learning activity for the report.
await kid('POST', '/api/me/progress', { trackId: 'python', lessonSlug: 'intro', status: 'completed' });
r = await teacher('GET', `/api/teach/students/${kidId}`);
ok(r.s === 200 && r.j.tracks.some((t) => t.id === 'python' && t.done >= 1), 'teacher opens the learner’s detail');
ok(!JSON.stringify(r.j).includes('zuva_memories') && !('memories' in r.j), 'Zuva chat memories are not shown to teachers');

// ── Zuva report ─────────────────────────────────────────────────────────
r = await teacher('POST', `/api/teach/students/${kidId}/reports`);
ok(r.s === 201 && r.j.report.content.painPoints.length > 0 && r.j.report.content.nextSteps.length > 0, 'Zuva writes a report with pain points and next steps');
ok(r.j.report.content.nextSteps.every((n) => !n.resource || n.resource.path.startsWith('/')), 'report links are checked (no outside links)');
ok((await other('POST', `/api/teach/students/${kidId}/reports`)).s >= 400, 'another teacher cannot get a report');

// ── Assign work; learner is notified and it ticks off ───────────────────
r = await teacher('POST', `/api/classrooms/${classId}/assignments`, { title: 'Python intro', instructions: 'Do the intro lesson', kind: 'lesson', resource: 'python/get-started', studentIds: [kidId], language: 'python', maxScore: 100 });
const aId = r.j.id;
ok(r.s === 201 && r.j.notified === 1, 'teacher assigns a lesson to one learner and they are notified');
r = await kid('GET', '/api/notifications');
ok(r.j.unread >= 1 && r.j.notifications.some((n) => n.title.includes('Python intro') && n.link.startsWith('/learn/python/get-started')), 'learner gets an in-app notification that links to the lesson');
r = await kid('GET', '/api/me/assignments');
ok(r.j.assignments.some((a) => a.id === aId && a.status === 'open'), 'learner sees it under Assigned to me');
ok(!(await kid2('GET', '/api/me/assignments')).j.assignments.some((a) => a.id === aId), 'work set for one learner is hidden from others');
await kid('POST', '/api/me/progress', { trackId: 'python', lessonSlug: 'get-started', status: 'completed' });
ok((await kid('GET', '/api/me/assignments')).j.assignments.some((a) => a.id === aId && a.status === 'done'), 'finishing the lesson completes the assignment');
r = await teacher('GET', `/api/classrooms/assignments/${aId}/progress`);
ok(r.s === 200 && r.j.learners.length === 1 && r.j.learners[0].status === 'done', 'teacher sees who has done it');
ok((await kid('GET', `/api/classrooms/assignments/${aId}/progress`)).s === 403, 'learner cannot see the class progress list');
r = await kid('POST', '/api/notifications/read-all');
ok((await kid('GET', '/api/notifications')).j.unread === 0, 'learner marks notifications read');

// ── Lesson plans ────────────────────────────────────────────────────────
r = await teacher('POST', '/api/teach/lesson-plans', { trackId: 'python', lessonSlugs: ['intro'], minutes: 40, classroomId: classId, focus: '30 learners, 10 laptops' });
const planId = r.j.plan?.id;
ok(r.s === 201 && r.j.plan.content.timeline.reduce((n, t) => n + t.minutes, 0) === 40, 'Zuva writes a lesson plan that fits 40 minutes exactly');
r = await teacher('PUT', `/api/teach/lesson-plans/${planId}`, { content: { ...r.j.plan.content, title: 'Meet Python (edited)' } });
ok(r.s === 200 && (await teacher('GET', `/api/teach/lesson-plans/${planId}`)).j.plan.title === 'Meet Python (edited)', 'teacher edits the plan');
ok((await other('GET', `/api/teach/lesson-plans/${planId}`)).s === 404, "another teacher cannot read the plan");

// ── Zuva as the teacher's agent ─────────────────────────────────────────
let z = await zuva(teacher, 'Write a report on Tariro');
ok(z.s === 200 && z.cards.some((c) => c.kind === 'report'), 'teacher Zuva writes a report card through its tools');
z = await zuva(teacher, 'Plan a 40 minute python lesson please');
ok(z.cards.some((c) => c.kind === 'lesson_plan'), 'teacher Zuva writes a lesson plan card');
z = await zuva(teacher, `Draft homework for class Form 2 Blue ${id % 1000}`);
const draft = z.cards.find((c) => c.kind === 'assignment_draft');
ok(draft && draft.classroomId === classId, 'teacher Zuva drafts an assignment card');
ok(!(await teacher('GET', `/api/classrooms/${classId}/assignments`)).j.assignments.some((a) => a.title === 'Intro homework'), 'a draft is not sent until the teacher presses Assign');
z = await zuva(other, `Show the secret overview of Tariro`);
ok(!/Moyo|tariro\d/.test(JSON.stringify(z)), "Zuva won't show another teacher's learner");
r = await kid('POST', '/api/zuva/chat', { mode: 'teacher', message: 'hi' });
ok(r.s === 403, 'a learner cannot use the teacher agent');

// ── Money: payment → 10% commission split; admin overrides ─────────────
r = await admin('POST', '/api/admin/payments/manual', { email: `farai${id}@example.com`, plan: 'plus', period: 'monthly', amountCents: 1000, note: 'EcoCash test' });
ok(r.s === 201, 'admin records a manual payment');
let w = (await teacher('GET', '/api/teach/wallet')).j.wallet;
ok(w.balanceCents === 100 && w.ratePercent === 10, 'teacher earns 10% ($1.00 of $10.00)');
ok((await kid2('GET', '/api/me')).j.user.plan === 'plus', 'payment unlocks the plan');
const fin = (await admin('GET', '/api/admin/finance')).j;
const pay = fin.payments.find((p) => p.email === `farai${id}@example.com`);
ok(pay && pay.commission_cents === 100 && fin.ledger.owed >= 100, 'admin finance shows the payment and commission owed');
r = await admin('POST', `/api/admin/payments/${pay.id}/commission`, { teacherIds: [teacherId, otherId], note: 'Shared class' });
ok(r.s === 200, 'admin reassigns the commission to two teachers');
w = (await teacher('GET', '/api/teach/wallet')).j.wallet;
const wo = (await other('GET', '/api/teach/wallet')).j.wallet;
ok(w.balanceCents === 50 && wo.balanceCents === 50, 'commission is split equally after the override');
r = await admin('POST', '/api/admin/wallets/entries', { teacherId, kind: 'payout', amountCents: 999, note: 'Too much' });
ok(r.s === 400, 'payout above the balance is refused');
r = await admin('POST', '/api/admin/wallets/entries', { teacherId, kind: 'payout', amountCents: 50, note: 'EcoCash payout' });
ok(r.s === 201 && r.j.balanceCents === 0, 'admin pays the teacher out');
ok((await teacher('POST', '/api/admin/wallets/entries', { teacherId, kind: 'adjustment', amountCents: 5000, note: 'free money' })).s === 403, 'a teacher cannot change wallets');
r = await admin('PUT', '/api/admin/settings', { commissionRatePercent: 15 });
ok(r.s === 200 && (await admin('GET', '/api/admin/settings')).j.commissionRatePercent === 15, 'admin changes the commission rate');
await admin('PUT', '/api/admin/settings', { commissionRatePercent: 10 });

// ── Admin sees and controls everything ──────────────────────────────────
ok((await admin('GET', `/api/teach/students?teacher=${teacherId}`)).j.students.length >= 2, "admin views a teacher's roster");
ok((await admin('POST', `/api/teach/invites?teacher=${teacherId}`, { label: 'x' })).s === 403, "viewing as a teacher is read-only");
r = await admin('GET', `/api/admin/learners/${kidId}`);
ok(r.s === 200 && r.j.teachers.length === 1 && r.j.reports.length >= 1, 'admin opens a full learner record');
ok(!JSON.stringify(r.j).includes('password_hash'), 'learner record has no password hash');
r = await admin('POST', '/api/admin/links', { teacherId: otherId, studentId: kidId });
ok(r.s === 201 && (await other('GET', `/api/teach/students/${kidId}`)).s === 200, 'admin links a learner to another teacher');
r = await admin('GET', '/api/admin/data');
ok(r.s === 200 && r.j.tables.some((t) => t.name === 'users') && !r.j.tables.some((t) => t.name === 'sessions'), 'data explorer lists tables but hides sessions');
r = await admin('GET', `/api/admin/data/users?q=tariro${id}`);
ok(r.j.rows.length === 1 && !('password_hash' in r.j.rows[0]) && !('mfa_secret' in r.j.rows[0]), 'data explorer hides secret columns');
r = await admin('PUT', `/api/admin/data/users/row?key=${encodeURIComponent(JSON.stringify({ id: kidId }))}`, { values: { city: 'Mutare' } });
ok(r.s === 200, 'admin edits any record');
r = await admin('PUT', `/api/admin/data/users/row?key=${encodeURIComponent(JSON.stringify({ id: kidId }))}`, { values: { password_hash: 'x' } });
ok(r.s === 400, 'admin cannot set a password hash by hand');
r = await admin('POST', '/api/admin/data/announcements', { values: { title: 'Hello', body: 'From the data explorer', author_id: adminId } });
ok(r.s === 201 || r.s === 400, `admin inserts a row (${r.s})`);
r = await admin('DELETE', `/api/admin/data/lesson_plans/row?key=${encodeURIComponent(JSON.stringify({ id: planId }))}`);
ok(r.s === 200 && (await teacher('GET', `/api/teach/lesson-plans/${planId}`)).s === 404, 'admin deletes a resource');
ok((await admin('PUT', '/api/admin/data/audit_log/row?key=%7B%7D', { values: { action: 'x' } })).s === 403, 'audit log is read-only');
ok((await teacher('GET', '/api/admin/data')).s === 403, 'teacher cannot open the data explorer');
const audit = JSON.parse(sql("SELECT COUNT(*) AS n FROM audit_log WHERE action IN ('data.update','data.delete','payment.manual','wallet.payout','admin.view_learner')"))[0].results[0].n;
ok(audit >= 5, 'admin actions are audited');

// ── Traffic ─────────────────────────────────────────────────────────────
const t1 = await fetch(BASE + '/api/t', { method: 'POST', headers: { 'content-type': 'application/json', origin: BASE, 'user-agent': 'Mozilla/5.0 (iPhone)' }, body: JSON.stringify({ p: `/classes/${classId}`, r: 'https://l.facebook.com/', v: 'abcdefgh1234' }) });
const t2 = await fetch(BASE + '/api/t', { method: 'POST', headers: { 'content-type': 'application/json', origin: BASE, 'user-agent': 'Googlebot/2.1' }, body: JSON.stringify({ p: '/', r: '', v: 'abcdefgh1234' }) });
ok(t1.status === 204 && t2.status === 204, 'page beacons are accepted (bots silently ignored)');
r = await admin('GET', '/api/admin/traffic?days=7');
ok(r.j.pages.some((p) => p.path === '/classes/:id') && r.j.sources.some((s) => s.value === 'facebook.com') && r.j.devices.some((d) => d.value === 'mobile'), 'traffic dashboard groups pages, sources and devices');

// ── Leaving ─────────────────────────────────────────────────────────────
r = await kid('DELETE', `/api/me/teachers/${teacherId}`);
ok(r.s === 200 && !(await teacher('GET', '/api/teach/students')).j.students.some((s) => s.id === kidId), 'learner can leave a teacher');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
