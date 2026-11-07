// Second batch of real-browser flows: trial, projects, Graph Lab, challenges, class discussion and live
// sessions, two-step login (enrol, sign in with a code), data export and account deletion.
// Run like tests/e2e-ui.cjs (local only; changes roles in the local D1).
const { chromium } = require('playwright');
const { execSync } = require('child_process');
const crypto = require('crypto');
const B = process.env.BASE || 'http://127.0.0.1:8787';
if (!/127\.0\.0\.1|localhost/.test(B)) throw new Error('Local only.');
const sql = (q) => JSON.parse(execSync(`npx wrangler d1 execute global_ai_academy --local --persist-to .wrangler/state --json --command ${JSON.stringify(q)}`, { stdio: ['ignore', 'pipe', 'ignore'] }).toString())[0].results;
const id = Date.now();
const results = [];
let browser;

/** RFC 6238 code for a base32 secret, as an authenticator app would show it. */
function totp(secret, t = Date.now()) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = '';
  for (const ch of secret.replace(/[\s=]/g, '').toUpperCase()) bits += alphabet.indexOf(ch).toString(2).padStart(5, '0');
  const key = Buffer.from(bits.match(/.{8}/g).map((b) => parseInt(b, 2)));
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(t / 30000)));
  const h = crypto.createHmac('sha1', key).update(counter).digest();
  const o = h[h.length - 1] & 15;
  return String(((h.readUInt32BE(o) & 0x7fffffff) % 1e6)).padStart(6, '0');
}

async function actor(name, width = 1280) {
  const ctx = await browser.newContext({ viewport: { width, height: 900 }, acceptDownloads: true });
  await ctx.addInitScript(() => { window.confirm = () => true; });
  const page = await ctx.newPage();
  page.errors = [];
  page.on('pageerror', (e) => page.errors.push(`pageerror: ${e.message.slice(0, 200)}`));
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|cloudflareinsights/.test(m.text())) page.errors.push(`console: ${m.text().slice(0, 200)}`); });
  page.on('response', (r) => { if (r.status() >= 500) page.errors.push(`http ${r.status()} ${r.url().replace(B, '')}`); });
  page.name = name;
  return page;
}
async function step(page, name, fn) {
  const before = page.errors.length;
  try {
    await fn();
    await page.waitForTimeout(150);
    const errs = page.errors.slice(before);
    results.push({ name: `${page.name}: ${name}`, ok: !errs.length, detail: errs.join(' | ') });
  } catch (e) {
    results.push({ name: `${page.name}: ${name}`, ok: false, detail: `${String(e.message).split('\n')[0].slice(0, 260)} ${page.errors.slice(before).join(' | ')}` });
    await page.screenshot({ path: `/tmp/ui2-fail-${results.length}.png` }).catch(() => {});
  }
}
const go = (page, path) => page.goto(B + path, { waitUntil: 'networkidle' });
const toast = (page, re) => page.locator('[data-sonner-toast]').filter({ hasText: re }).first().waitFor({ timeout: 10000 });
async function signup(page, name, email) {
  await go(page, '/signup');
  await page.getByLabel('Full name').fill(name);
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill('Passw0rd1x');
  await page.locator('input[type=checkbox]').last().check();
  await page.getByRole('button', { name: 'Create account' }).click();
  await page.waitForURL((u) => !/signup/.test(u.pathname), { timeout: 15000 });
}

(async () => {
  browser = await chromium.launch();
  const me = await actor('learner');
  const email = `ui2-${id}@example.com`;
  await step(me, 'sign up', () => signup(me, 'Nyasha Dube', email));
  const uid = sql(`SELECT id FROM users WHERE email='${email}'`)[0].id;
  sql(`UPDATE users SET email_verified_at='2026-01-01T00:00:00Z' WHERE id='${uid}'`);

  await step(me, 'start the free Plus trial', async () => {
    await go(me, '/pricing');
    await me.getByRole('button', { name: /Try Plus free/ }).click();
    await me.waitForTimeout(1500);
    if (sql(`SELECT plan FROM users WHERE id='${uid}'`)[0].plan !== 'plus') throw new Error('plan not plus');
  });
  await step(me, 'save a playground project and find it in Projects', async () => {
    await go(me, '/playground?lang=python');
    await me.getByRole('button', { name: 'Save as project' }).click();
    const dlg = me.getByRole('dialog');
    if (await dlg.count()) { await dlg.getByRole('textbox').first().fill('Borehole maths'); await dlg.getByRole('button', { name: /Save/ }).last().click(); }
    await me.waitForTimeout(1200);
    await go(me, '/projects');
    await me.getByText('Borehole maths').first().waitFor({ timeout: 8000 });
  });
  await step(me, 'run a Graph Lab query and submit a ticket', async () => {
    await go(me, '/lab/skuru-onboarding');
    await me.getByRole('button', { name: /^Run$/ }).first().click();
    await me.waitForTimeout(2500);
    await me.getByRole('button', { name: 'Submit ticket' }).click();
    await me.waitForTimeout(1500);
  });
  await step(me, 'check a code challenge', async () => {
    await go(me, '/challenges');
    const link = me.locator('a[href*="#challenge"]').first();
    await link.click();
    await me.getByRole('button', { name: /Run & check/ }).first().click();
    await me.waitForTimeout(8000);
  });

  // Class discussion and live sessions with a teacher.
  const t = await actor('teacher');
  await step(t, 'sign up (teacher)', () => signup(t, 'Tendai Sibanda', `ui2-t${id}@example.com`));
  const tid = sql(`SELECT id FROM users WHERE email='ui2-t${id}@example.com'`)[0].id;
  sql(`UPDATE users SET role='teacher', email_verified_at='2026-01-01T00:00:00Z' WHERE id='${tid}'`);
  let room;
  await step(t, 'create a class, post an announcement, schedule a session', async () => {
    const r = await t.request.post(B + '/api/classrooms', { headers: { origin: B }, data: { name: 'Form 4 Blue', trackIds: ['python'] } });
    room = (await r.json()).id;
    const code = sql(`SELECT join_code FROM classrooms WHERE id='${room}'`)[0].join_code;
    await me.request.post(B + '/api/classrooms/join', { headers: { origin: B }, data: { code } });
    await go(t, `/classes/${room}`);
    await t.getByLabel('Title').first().fill('Welcome');
    await t.getByLabel('Message').first().fill('Welcome to Form 4 Blue. Bring your laptops on Monday.');
    await t.getByRole('button', { name: 'Post' }).click();
    await t.waitForTimeout(800);
    await go(t, `/classes/${room}?tab=sessions`);
    await t.getByRole('button', { name: /Schedule a live session/ }).click();
    await t.getByLabel('Title').fill('Loops live');
    await t.getByLabel('Starts').fill(new Date(Date.now() + 864e5).toISOString().slice(0, 16));
    await t.getByLabel('Meeting link').fill('https://meet.google.com/abc-defg-hij');
    await t.getByRole('button', { name: 'Schedule' }).click();
    await t.getByText('Loops live').first().waitFor({ timeout: 8000 });
  });
  await step(me, 'see the announcement and session, and post in the discussion', async () => {
    await go(me, `/classes/${room}`);
    await me.getByText(/Bring your laptops/).first().waitFor();
    await go(me, '/dashboard');
    await me.getByText('Loops live').first().waitFor({ timeout: 8000 });
    await go(me, `/classes/${room}?tab=discussion`);
    await me.getByPlaceholder('Write a message…').fill('Thank you, see you Monday!');
    await me.getByRole('button', { name: 'Send' }).click();
    await me.getByText('Thank you, see you Monday!').first().waitFor({ timeout: 8000 });
  });

  // Two-step login.
  let secret;
  await step(me, 'turn on two-step login', async () => {
    await go(me, '/settings#security');
    await me.getByRole('button', { name: 'Turn on two-step login' }).click();
    await me.getByLabel('Confirm your password').fill('Passw0rd1x');
    await me.getByRole('button', { name: 'Continue' }).click();
    secret = (await me.locator('code.select-all').first().innerText()).replace(/\s/g, '');
    await me.getByLabel('6-digit code').fill(totp(secret));
    await me.getByRole('button', { name: 'Turn on' }).click();
    await me.getByLabel('Recovery codes').waitFor({ timeout: 8000 });
    await me.getByRole('button', { name: /I’ve saved them/ }).click();
  });
  await step(me, 'sign out and back in with a code', async () => {
    await me.context().clearCookies();
    await go(me, '/login');
    await me.getByLabel('Email').fill(email);
    await me.getByLabel('Password', { exact: true }).fill('Passw0rd1x');
    await me.getByRole('button', { name: 'Sign in' }).click();
    const code = me.getByLabel(/code/i).first();
    await code.waitFor({ timeout: 8000 });
    // A code can be used once: wait for the next 30-second window after the one used to switch it on.
    await me.waitForTimeout(30000 - (Date.now() % 30000) + 500);
    await code.fill(totp(secret));
    await me.getByRole('button', { name: /Verify|Sign in|Continue/ }).first().click();
    await me.waitForURL((u) => !/login/.test(u.pathname), { timeout: 10000 });
  });
  await step(me, 'download my data', async () => {
    await go(me, '/settings');
    const [dl] = await Promise.all([me.waitForEvent('download', { timeout: 10000 }), me.getByRole('link', { name: 'Download my data' }).click()]);
    const p = await dl.path();
    const data = JSON.parse(require('fs').readFileSync(p, 'utf8'));
    if (!data.account && !data.user) throw new Error('export has no account');
  });
  await step(me, 'delete my account', async () => {
    await go(me, '/settings');
    await me.getByRole('button', { name: /Delete my account/ }).first().click();
    await me.getByLabel('Password').last().fill('Passw0rd1x');
    const codeBox = me.getByLabel('Code from your app');
    if (await codeBox.count()) { await me.waitForTimeout(30000 - (Date.now() % 30000) + 500); await codeBox.last().fill(totp(secret)); }
    await me.getByLabel('Type DELETE to confirm').fill('DELETE');
    await me.getByRole('button', { name: /Delete/ }).last().click();
    await me.waitForTimeout(2000);
    const row = sql(`SELECT deleted_at, email FROM users WHERE id='${uid}'`)[0];
    if (row && !row.deleted_at && row.email === email) throw new Error('account still there');
  });

  await browser.close();
  for (const r of results) console.log(r.ok ? '  ok  ' : '  FAIL', r.name, r.ok ? '' : `→ ${r.detail}`);
  const bad = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - bad} passed, ${bad} failed`);
  process.exit(bad ? 1 : 0);
})().catch(async (e) => { console.error(e); await browser?.close(); process.exit(1); });
