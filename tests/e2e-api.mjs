// End-to-end API checks against a running dev server with a local D1.
// Usage: npm run dev, then: npx wrangler d1 execute global_ai_academy --local --command "DELETE FROM rate_limits" && node tests/e2e-api.mjs
const BASE = process.env.BASE_URL ?? 'http://127.0.0.1:5173';
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  ok  ', m); } else { fail++; console.log('  FAIL', m); } };
function client() {
  let cookie = '';
  return async (method, path, body) => {
    const r = await fetch(BASE + path, { method, headers: { 'content-type': 'application/json', origin: BASE, cookie }, body: body ? JSON.stringify(body) : undefined });
    const sc = r.headers.get('set-cookie'); if (sc) cookie = sc.split(';')[0];
    let j = null; try { j = await r.json(); } catch {}
    return { s: r.status, j };
  };
}
const id = Date.now();
const admin = client(), learner = client(), teacher = client(), guest = client();
// admin (ADMIN_EMAILS) signup
let r = await admin('POST', '/api/auth/signup', { name: 'Munya Admin', email: 'munyaradzimandiwanzira@gmail.com', password: 'Passw0rd!x' });
if (r.s === 409) r = await admin('POST', '/api/auth/login', { email: 'munyaradzimandiwanzira@gmail.com', password: 'Passw0rd!x' });
ok(r.j?.user?.role === 'admin', 'admin email becomes admin');
r = await learner('POST', '/api/auth/signup', { name: 'Tariro Moyo', email: `tariro${id}@example.com`, password: 'Passw0rd1', level: 'beginner' });
ok(r.s === 201 && r.j.user.role === 'student' && r.j.user.trialAvailable === true, 'learner signs up, trial available');
r = await teacher('POST', '/api/auth/signup', { name: 'Mr Dube', email: `dube${id}@example.com`, password: 'Passw0rd1', wantsToTeach: true });
const teacherId = r.j.user.id;
// RBAC
ok((await learner('GET', '/api/admin/promos')).s === 403, 'student cannot list promos');
ok((await guest('GET', '/api/admin/waitlist')).s === 401, 'guest cannot read waitlist');
ok((await learner('POST', '/api/ai/tutor', { messages: [{ role: 'user', content: 'hi' }] })).s === 403, 'free learner blocked from tutor');
// CSRF
const raw = await fetch(BASE + '/api/waitlist', { method: 'POST', headers: { 'content-type': 'application/json', origin: 'https://evil.example' }, body: '{}' });
ok(raw.status === 403, 'cross-site POST blocked');
// waitlist
r = await guest('POST', '/api/waitlist', { email: `w${id}@example.com`, name: 'Wait', note: 'mentorship' });
ok(r.s === 201, 'guest joins premium waitlist');
r = await guest('POST', '/api/waitlist', { email: `w${id}@example.com` });
ok(r.s === 200 && r.j.alreadyJoined, 'waitlist idempotent');
ok((await admin('GET', '/api/admin/waitlist')).j.entries.some((e) => e.email === `w${id}@example.com`), 'admin sees waitlist entry');
// projects (free limit 3, sharing needs Plus)
for (let i = 0; i < 3; i++) await learner('POST', '/api/projects', { title: `P${i}`, language: 'python', code: 'print(1)' });
r = await learner('POST', '/api/projects', { title: 'P4', language: 'python', code: 'x' });
ok(r.s === 402, 'free plan limited to 3 projects');
let list = (await learner('GET', '/api/projects')).j;
r = await learner('PUT', `/api/projects/${list.projects[0].id}`, { title: 'P0', language: 'python', code: 'print(2)', shared: true });
ok(r.s === 402, 'free plan cannot share');
// trial
r = await learner('POST', '/api/me/trial');
ok(r.s === 200 && r.j.user.plan === 'plus' && !r.j.user.trialAvailable, 'trial grants Plus once');
ok((await learner('POST', '/api/me/trial')).s === 409, 'second trial refused');
r = await learner('PUT', `/api/projects/${list.projects[0].id}`, { title: 'P0', language: 'python', code: 'print(2)', shared: true });
ok(r.s === 200 && r.j.project.shareSlug, 'Plus can share by link');
const slug = r.j.project.shareSlug;
r = await guest('GET', `/api/projects/shared/${slug}`);
ok(r.s === 200 && r.j.project.code === 'print(2)' && r.j.project.authorName === 'Tariro', 'guest reads shared project (first name only)');
ok((await guest('GET', `/api/projects/${list.projects[1].id}`)).s === 401, 'private project not readable by guest');
ok((await teacher('GET', `/api/projects/${list.projects[1].id}`)).s === 404, "other user cannot read someone's project");
// promo codes
r = await admin('POST', '/api/admin/promos', { code: `SCHOOL${id % 10000}`, percentOff: 25, maxUses: 5 });
ok(r.s === 201, 'admin creates promo');
r = await learner('POST', '/api/payments/quote', { code: `school${id % 10000}`, plan: 'academy', period: 'yearly' });
ok(r.s === 200 && r.j.listCents === 55000 && r.j.amountCents === 41250, 'quote: Academy yearly $550 less 25% = $412.50');
r = await learner('POST', '/api/payments/quote', { code: 'NOPE1', plan: 'plus', period: 'monthly' });
ok(r.s === 400, 'unknown promo rejected');
r = await admin('POST', '/api/admin/promos', { code: `FREE${id % 10000}`, percentOff: 100, plans: ['academy'], periods: ['monthly'] });
r = await learner('POST', '/api/payments/checkout', { plan: 'academy', period: 'monthly', promoCode: `FREE${id % 10000}` });
ok(r.s === 200 && r.j.activated, '100% promo activates Academy without payment');
ok((await learner('GET', '/api/me')).j.user.plan === 'academy', 'learner now on Academy');
r = await learner('POST', '/api/payments/checkout', { plan: 'plus', period: 'monthly' });
ok(r.s === 503, 'paid checkout reports payments not configured');
// scholarships
r = await admin('POST', '/api/admin/scholarships', { email: `dube${id}@example.com`, plan: 'plus', months: 3, label: 'Merit scholarship', reason: 'Top marks' });
ok(r.s === 201, 'admin grants scholarship');
ok((await teacher('GET', '/api/me')).j.user.plan === 'plus', 'scholarship applies plan');
// make teacher, classroom, sessions
const users = (await admin('GET', `/api/admin/users?q=dube${id}`)).j.users;
await admin('PATCH', `/api/admin/users/${users[0].id}`, { role: 'teacher' });
r = await teacher('POST', '/api/classrooms', { name: 'Form 4 CS', trackIds: ['python'] });
const room = (await teacher('GET', '/api/classrooms/' + r.j.id)).j.classroom;
ok(r.s === 201 && room.joinCode, 'teacher creates classroom');
r = await learner('POST', '/api/classrooms/join', { code: room.joinCode });
ok(r.s === 200 || r.s === 201, 'Academy learner joins class');
r = await teacher('POST', `/api/classrooms/${room.id}/sessions`, { title: 'Loops and lists', startsAt: new Date(Date.now() + 3600e3).toISOString(), minutes: 60, meetingUrl: 'https://meet.google.com/abc-defg-hij' });
ok(r.s === 201, 'teacher schedules live session');
ok((await learner('POST', `/api/classrooms/${room.id}/sessions`, { title: 'x', startsAt: new Date().toISOString() })).s === 403, 'learner cannot schedule');
r = await learner('GET', '/api/me/sessions');
ok(r.j.sessions.some((s) => s.title === 'Loops and lists'), 'learner sees session on dashboard feed');
r = await teacher('POST', `/api/classrooms/${room.id}/sessions`, { title: 'Bad', startsAt: new Date().toISOString(), meetingUrl: 'javascript:alert(1)' });
ok(r.s === 400, 'javascript: meeting links rejected');
// capstones
r = await learner('POST', '/api/capstones', { title: 'RAG tax assistant', careerId: 'ai-engineer', status: 'completed', repoUrl: 'https://github.com/x/y' });
ok(r.s === 201 && r.j.capstone.status === 'review', 'learner cannot self-complete capstone (forced to review)');
const cap = r.j.capstone;
r = await teacher('GET', '/api/capstones/review');
ok(r.j.capstones.some((c) => c.id === cap.id), "teacher sees their learner's capstone");
const outsider = client();
await outsider('POST', '/api/auth/signup', { name: 'Other Teacher', email: `outsider${id}@other.example`, password: 'Passw0rd1' });
const o = (await admin('GET', `/api/admin/users?q=outsider${id}`)).j.users[0];
await admin('PATCH', `/api/admin/users/${o.id}`, { role: 'teacher' });
ok((await outsider('POST', `/api/capstones/${cap.id}/review`, { feedback: 'hi', status: 'completed' })).s === 403, 'teacher of another class cannot review');
r = await teacher('POST', `/api/capstones/${cap.id}/review`, { feedback: 'Great work, deployed and tested.', grade: 88, status: 'completed' });
ok(r.s === 200, 'teacher signs off capstone');
const me = (await learner('GET', '/api/me')).j.user;
ok(me.xp >= 300, 'capstone awards 300 XP');
// learner report needs AI -> 503 without key
r = await teacher('POST', `/api/classrooms/${room.id}/students/${me.id}/reports`);
ok(r.s === 503 || r.s === 201, `learner report endpoint reachable (${r.s}, 503 = AI key not set)`);
ok((await learner('POST', `/api/classrooms/${room.id}/students/${me.id}/reports`)).s === 403, 'learner cannot generate reports');
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
