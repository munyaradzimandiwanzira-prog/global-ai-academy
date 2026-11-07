// Drives the real UI in a browser: sign-up, lessons, code runners, quizzes, games, Zuva, teacher and admin tools.
// Run against the built worker with the OpenAI mock: npm run build && bash scripts/dev-mock.sh, then node tests/e2e-ui.cjs
// It changes roles in the local D1 directly, so it refuses to run against anything but localhost.
const { chromium } = require('playwright');
const { execSync } = require('child_process');
const B = process.env.BASE || 'http://127.0.0.1:8787';
if (!/127\.0\.0\.1|localhost/.test(B)) throw new Error('Local only.');
const ONLY = process.env.ONLY ? new RegExp(process.env.ONLY, 'i') : null;
const sql = (q) => JSON.parse(execSync(`npx wrangler d1 execute global_ai_academy --local --persist-to .wrangler/state --json --command ${JSON.stringify(q)}`, { stdio: ['ignore', 'pipe', 'ignore'] }).toString())[0].results;
const id = Date.now();
const results = [];
let browser;

/** A signed-in (or guest) browser context that records page errors and server errors. */
async function actor(name, { width = 1280 } = {}) {
  const ctx = await browser.newContext({ viewport: { width, height: width < 600 ? 844 : 900 }, ...(width < 600 ? { isMobile: true, hasTouch: true } : {}) });
  const page = await ctx.newPage();
  page.errors = [];
  page.on('pageerror', (e) => page.errors.push(`pageerror: ${e.message.slice(0, 200)}`));
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|cloudflareinsights/.test(m.text())) page.errors.push(`console: ${m.text().slice(0, 200)}`); });
  page.on('response', (r) => { if (r.status() >= 500) page.errors.push(`http ${r.status()} ${r.url().replace(B, '')}`); });
  page.name = name;
  return page;
}
async function step(page, name, fn) {
  if (ONLY && !ONLY.test(name)) return;
  const before = page.errors.length;
  try {
    await fn();
    await page.waitForTimeout(150);
    const errs = page.errors.slice(before);
    results.push({ name: `${page.name}: ${name}`, ok: !errs.length, detail: errs.join(' | ') });
  } catch (e) {
    results.push({ name: `${page.name}: ${name}`, ok: false, detail: `${String(e.message).split('\n')[0].slice(0, 260)} ${page.errors.slice(before).join(' | ')}` });
    await page.screenshot({ path: `/tmp/ui-fail-${results.length}.png` }).catch(() => {});
  }
}
const go = (page, path) => page.goto(B + path, { waitUntil: 'networkidle' });
const toast = (page, re) => page.locator('[data-sonner-toast]').filter({ hasText: re }).first().waitFor({ timeout: 8000 });
const expectText = async (page, re, timeout = 8000) => { await page.getByText(re).first().waitFor({ timeout }); };

async function signupUi(page, name, email, extra) {
  await go(page, `/signup${extra?.invite ? `?invite=${extra.invite}` : ''}`);
  await page.getByLabel('Full name').fill(name);
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill('Passw0rd1x');
  if (extra?.teach) await page.getByText(/I want to teach|I’m a teacher|I'm a teacher/).first().click();
  await page.locator('input[type=checkbox]').last().check();
  await page.getByRole('button', { name: 'Create account' }).click();
  await page.waitForURL((u) => !/signup/.test(u.pathname), { timeout: 15000 });
}

(async () => {
  browser = await chromium.launch();

  // ── Teacher signs up and is approved ──────────────────────────────────
  const teacher = await actor('teacher');
  await step(teacher, 'sign up as a teacher through the form', async () => {
    await signupUi(teacher, 'Rudo Ncube', `ui-rudo${id}@example.com`, { teach: true });
  });
  const tid = sql(`SELECT id FROM users WHERE email='ui-rudo${id}@example.com'`)[0]?.id;
  sql(`UPDATE users SET role='teacher', school='UI High ${id}', email_verified_at='2026-01-01T00:00:00Z' WHERE id='${tid}'`);
  let classId, inviteCode;
  await step(teacher, 'create a class', async () => {
    await go(teacher, '/classes');
    await teacher.getByRole('button', { name: /New class|Create class/ }).first().click();
    await teacher.getByLabel(/Class name|Name/).first().fill('Form 3 Green');
    await teacher.getByRole('button', { name: /^Create/ }).last().click();
    await teacher.waitForURL(/\/classes\/[\w-]+/, { timeout: 10000 });
    classId = teacher.url().split('/classes/')[1].split(/[?#]/)[0];
  });
  await step(teacher, 'make an invite in the portal', async () => {
    await go(teacher, '/teach/invites');
    await teacher.getByRole('button', { name: 'New invite' }).click();
    await teacher.getByLabel('Name (for you)').fill('Form 3');
    await teacher.getByLabel('Also join this class').selectOption({ label: 'Form 3 Green' });
    await teacher.getByRole('button', { name: 'Create invite' }).click();
    await toast(teacher, /Invite ready/);
    inviteCode = (await teacher.locator('span.font-mono').first().innerText()).trim();
    if (!/^T-/.test(inviteCode)) throw new Error(`bad code ${inviteCode}`);
  });

  // ── Learner joins with the link ───────────────────────────────────────
  const kid = await actor('learner', { width: 390 });
  await step(kid, 'open the invite link and sign up from it', async () => {
    await go(kid, `/join/${inviteCode}`);
    await expectText(kid, 'Join Rudo Ncube');
    await kid.getByRole('link', { name: 'Create a free account' }).click();
    await kid.waitForURL(/signup/);
    if ((await kid.getByLabel('Invite code').inputValue()) !== inviteCode) throw new Error('code not prefilled');
    await expectText(kid, /You’ll join Rudo Ncube/);
    await kid.getByLabel('Full name').fill('Tariro Moyo');
    await kid.getByLabel('Email').fill(`ui-tariro${id}@example.com`);
    await kid.getByLabel('Password', { exact: true }).fill('Passw0rd1x');
    await kid.locator('input[type=checkbox]').last().check();
    await kid.getByRole('button', { name: 'Create account' }).click();
    await kid.waitForURL((u) => !/signup/.test(u.pathname), { timeout: 15000 });
  });
  const sid = sql(`SELECT id FROM users WHERE email='ui-tariro${id}@example.com'`)[0]?.id;
  sql(`UPDATE users SET email_verified_at='2026-01-01T00:00:00Z' WHERE id='${sid}'`);
  await step(kid, 'dashboard shows the teacher', async () => {
    await go(kid, '/dashboard');
    await kid.getByRole('heading', { name: 'My teachers' }).waitFor();
    await expectText(kid, 'Rudo Ncube');
  });
  await step(kid, 'run Python in a lesson and mark it complete', async () => {
    await go(kid, '/learn/python/syntax');
    await kid.getByRole('button', { name: 'Try it yourself' }).first().click();
    const run = kid.getByRole('button', { name: /^Run$/ }).first();
    await run.waitFor({ timeout: 10000 });
    await run.click();
    await kid.locator('pre, [role=log], output').filter({ hasText: /\S/ }).first().waitFor({ timeout: 45000 });
    await kid.getByRole('button', { name: 'Mark complete' }).last().click();
    await kid.waitForTimeout(800);
  });
  await step(kid, 'take a quiz', async () => {
    await go(kid, '/quiz/python');
    const opts = kid.getByRole('radio');
    if (await opts.count()) { await opts.first().check({ force: true }); }
    else { await kid.locator('button').filter({ hasText: /\S/ }).nth(10).click(); }
  });
  await step(kid, 'run JavaScript and SQL in the online editors', async () => {
    await go(kid, '/compiler/javascript');
    await kid.getByRole('button', { name: /^Run$/ }).first().click();
    await kid.waitForTimeout(1500);
    await go(kid, '/compiler/sql');
    await kid.getByRole('button', { name: /^Run$/ }).first().click();
    await kid.locator('table').first().waitFor({ timeout: 15000 });
  });
  await step(kid, 'play a Kids Zone game', async () => {
    await go(kid, '/kids/binary-bulbs');
    const btns = kid.locator('main button');
    for (let i = 0; i < Math.min(5, await btns.count()); i++) await btns.nth(i).click({ timeout: 2000 }).catch(() => {});
  });
  await step(kid, 'open the notification bell', async () => {
    await go(kid, '/dashboard');
    await kid.getByRole('button', { name: /Notifications/ }).click();
    await kid.getByRole('dialog', { name: 'Notifications' }).waitFor();
  });
  await step(kid, 'change name in settings', async () => {
    await go(kid, '/settings');
    const name = kid.getByLabel(/Full name|Name/).first();
    await name.fill('Tariro M. Moyo');
    await kid.getByRole('button', { name: /^Save/ }).first().click();
    await toast(kid, /saved|updated/i);
  });

  // ── Teacher works with the learner ────────────────────────────────────
  await step(teacher, 'see the learner and write a Zuva report', async () => {
    await go(teacher, '/teach/students');
    await teacher.getByRole('link', { name: /Tariro/ }).first().click();
    await teacher.waitForURL(/teach\/students\//);
    await teacher.getByRole('button', { name: /report/i }).first().click();
    await expectText(teacher, /pain points|What to work on|Next steps/i, 30000);
  });
  await step(teacher, 'assign a lesson from the learner page', async () => {
    await teacher.getByRole('button', { name: /^Assign/ }).first().click();
    await teacher.getByLabel('Lesson').selectOption({ index: 3 });
    await teacher.getByRole('button', { name: 'Assign and notify' }).click();
    await toast(teacher, /Assigned/);
  });
  await step(teacher, 'plan a lesson with Zuva and edit it', async () => {
    await go(teacher, '/teach/plans');
    await teacher.getByRole('button', { name: 'New plan' }).click();
    await teacher.getByRole('button', { name: 'Write the plan' }).click();
    await teacher.waitForURL(/teach\/plans\/[\w-]+/, { timeout: 40000 });
    await teacher.getByRole('button', { name: 'Edit' }).click();
    await teacher.getByLabel('Title').fill('Meet Python, edited');
    await teacher.getByRole('button', { name: 'Save' }).click();
    await toast(teacher, /Plan saved/);
    await expectText(teacher, 'Meet Python, edited');
  });
  await step(teacher, 'ask Zuva for a report in the teacher chat', async () => {
    await go(teacher, '/teach/zuva?ask=' + encodeURIComponent('Write a report on Tariro'));
    await expectText(teacher, /Tariro/, 30000);
  });
  await step(teacher, 'write a code task in the class', async () => {
    await go(teacher, `/classes/${classId}?tab=assignments`);
    await teacher.getByRole('button', { name: /Write a code task/ }).click();
    const dialog = teacher.getByRole('dialog');
    await dialog.getByLabel(/Title/).first().fill('Print your name');
    await dialog.getByLabel(/Instructions|Brief/).first().fill('Write a program that prints your name.');
    await dialog.getByRole('button', { name: /Create|Save|Publish|Assign/ }).last().click();
    await teacher.waitForTimeout(1500);
  });

  // ── Learner does the work ─────────────────────────────────────────────
  await step(kid, 'see assigned work and get notified', async () => {
    await go(kid, '/dashboard');
    await kid.getByRole('heading', { name: 'Assigned to me' }).waitFor();
    const bell = kid.getByRole('button', { name: /Notifications, \d+ new/ });
    await bell.waitFor({ timeout: 8000 });
  });
  await step(kid, 'submit the code task', async () => {
    await go(kid, `/classes/${classId}?tab=assignments`);
    await kid.getByRole('link', { name: /Print your name/ }).click();
    await kid.waitForURL(/assignments\//);
    await kid.getByRole('button', { name: /Submit|Hand in/ }).first().click();
    await kid.waitForTimeout(2500);
  });

  // ── Admin ─────────────────────────────────────────────────────────────
  const admin = await actor('admin');
  await step(admin, 'sign up', async () => { await signupUi(admin, 'Ada Admin', `ui-ada${id}@example.com`); });
  const aid = sql(`SELECT id FROM users WHERE email='ui-ada${id}@example.com'`)[0]?.id;
  sql(`UPDATE users SET role='admin', mfa_enabled_at='2026-01-01T00:00:00Z', email_verified_at='2026-01-01T00:00:00Z' WHERE id='${aid}'`);
  await step(admin, 'record a payment by hand', async () => {
    await go(admin, '/admin/finance');
    await admin.getByRole('button', { name: 'Record a payment' }).click();
    await admin.getByLabel('Learner’s email').fill(`ui-tariro${id}@example.com`);
    await admin.getByLabel('Amount (USD)').fill('60');
    await admin.getByLabel('Note').fill('EcoCash test');
    await admin.getByRole('button', { name: 'Record payment' }).click();
    await toast(admin, /Recorded/);
  });
  await step(kid, 'chat with the Plus tutor after paying', async () => {
    await go(kid, '/learn/python/intro');
    await kid.getByRole('button', { name: /Ask the AI tutor|Zuva/ }).first().click();
    await kid.getByLabel('Message to Zuva').fill('What is a variable?');
    await kid.keyboard.press('Enter');
    await kid.locator('[aria-label="AI tutor"], [role=complementary]').filter({ hasText: /Mhoro|variable|Zuva/ }).first().waitFor({ timeout: 20000 });
    await kid.waitForTimeout(3000);
  });
  await step(teacher, 'request a payout', async () => {
    await go(teacher, '/teach/wallet');
    await teacher.getByRole('button', { name: 'Request payout' }).click();
    await teacher.getByLabel('Where to send it').fill('0771234567');
    await teacher.getByRole('button', { name: /^Request \$/ }).click();
    await toast(teacher, /Request sent/);
  });
  await step(admin, 'mark the payout paid', async () => {
    await go(admin, '/admin/finance#payouts');
    await admin.getByRole('button', { name: 'Mark as paid' }).first().click();
    await admin.getByLabel('Transaction reference').fill('MP1');
    await admin.getByRole('button', { name: /mark as paid/ }).last().click();
    await toast(admin, /Marked as paid/);
  });
  await step(admin, 'edit a record in the data explorer', async () => {
    await go(admin, `/admin/data?table=users&q=ui-tariro${id}`);
    await admin.getByRole('button', { name: 'Edit row' }).first().click();
    await admin.getByLabel(/^city/).fill('Mutare');
    await admin.getByRole('button', { name: 'Save changes' }).click();
    await toast(admin, /Saved/);
  });
  await step(admin, 'open a learner and the traffic page', async () => {
    await go(admin, `/admin/learners/${sid}`);
    await expectText(admin, 'Mutare');
    await go(admin, '/admin/traffic');
    await admin.getByRole('heading', { name: 'Traffic' }).waitFor();
  });
  await step(admin, 'approve a teacher request', async () => {
    const t2 = await actor('teacher-2');
    await signupUi(t2, 'Second Teacher', `ui-t2${id}@example.com`, { teach: true });
    await go(admin, '/admin/teachers');
    await admin.getByRole('button', { name: /Approve/ }).first().click();
    await admin.waitForTimeout(1200);
  });
  await step(admin, 'switch to dark mode', async () => {
    await admin.getByRole('button', { name: /dark|theme/i }).first().click();
    await admin.waitForTimeout(300);
  });

  // ── Guest ─────────────────────────────────────────────────────────────
  const guest = await actor('guest', { width: 390 });
  await step(guest, 'contact form', async () => {
    await go(guest, '/contact');
    await guest.getByLabel(/Name/).first().fill('Guest');
    await guest.getByLabel(/Email/).first().fill(`g${id}@example.com`);
    await guest.getByLabel(/Message/).first().fill('Hello, do you teach Python to Form 2 learners?');
    await guest.getByRole('button', { name: /Send/ }).click();
    await guest.waitForTimeout(1500);
  });
  await step(guest, 'search', async () => {
    await go(guest, '/');
    await guest.getByRole('button', { name: /Search/ }).first().click();
    await guest.keyboard.type('loops');
    await guest.waitForTimeout(800);
  });
  await step(guest, 'unknown page shows a friendly 404', async () => {
    await go(guest, '/no-such-page');
    await expectText(guest, /404|wandered off/i);
  });
  await step(guest, 'forgot password', async () => {
    await go(guest, '/forgot-password');
    await guest.getByLabel('Email').fill(`ui-tariro${id}@example.com`);
    await guest.getByRole('button', { name: /Send|Reset/ }).click();
    await guest.waitForTimeout(1200);
  });

  await browser.close();
  for (const r of results) console.log(r.ok ? '  ok  ' : '  FAIL', r.name, r.ok ? '' : `→ ${r.detail}`);
  const bad = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - bad} passed, ${bad} failed`);
  process.exit(bad ? 1 : 0);
})().catch(async (e) => { console.error(e); await browser?.close(); process.exit(1); });
