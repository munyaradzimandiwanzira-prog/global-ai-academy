// Clicks around interactive pages (games, labs, editors, challenges) and reports any page crash,
// console error or server error. Usage: node tests/e2e-fuzz.cjs <urls file> [cookies.json] [width]
// Stays on the page under test: clicks that would navigate away are skipped.
const { chromium } = require('playwright');
const fs = require('fs');
const B = process.env.BASE || 'http://127.0.0.1:8787';
const [,, listFile, cookieFile, width = '1280'] = process.argv;
const urls = fs.readFileSync(listFile, 'utf8').split('\n').filter(Boolean);
const CLICKS = Number(process.env.CLICKS || 45);
const IGNORE = /cloudflareinsights|Failed to load resource|favicon/;

let seed = 7;
const rand = (n) => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed % n; };

(async () => {
  const browser = await chromium.launch();
  const w = Number(width);
  const ctx = await browser.newContext({ viewport: { width: w, height: w < 600 ? 844 : 900 }, ...(w < 600 ? { isMobile: true, hasTouch: true } : {}) });
  if (cookieFile && cookieFile !== '-') await ctx.addCookies(JSON.parse(fs.readFileSync(cookieFile, 'utf8')));
  await ctx.addInitScript(() => { window.alert = () => {}; window.confirm = () => true; window.prompt = () => 'test'; window.print = () => {}; });
  const out = [];
  for (const url of urls) {
    const page = await ctx.newPage();
    const issues = [];
    page.on('pageerror', (e) => issues.push(`pageerror: ${e.message.slice(0, 220)}`));
    page.on('console', (m) => { if (m.type() === 'error' && !IGNORE.test(m.text())) issues.push(`console: ${m.text().slice(0, 220)}`); });
    page.on('response', (r) => { if (r.status() >= 500) issues.push(`http ${r.status()} ${r.url().replace(B, '')}`); });
    try {
      await page.goto(B + url, { waitUntil: 'networkidle', timeout: 30000 });
      const start = new URL(page.url()).pathname;
      for (let i = 0; i < CLICKS; i++) {
        const targets = page.locator('main button:visible:not([disabled]), main [role=button]:visible, main input[type=checkbox]:visible, main input[type=radio]:visible, main select:visible, main canvas:visible, main input[type=text]:visible, main input[type=number]:visible, main textarea:visible');
        const n = await targets.count();
        if (!n) break;
        const el = targets.nth(rand(n));
        const tag = await el.evaluate((e) => e.tagName.toLowerCase() + (e.type ? `:${e.type}` : '')).catch(() => '');
        try {
          if (tag.startsWith('select')) { const opts = await el.locator('option').count(); if (opts) await el.selectOption({ index: rand(opts) }, { timeout: 1500 }); }
          else if (tag === 'input:text' || tag === 'textarea:textarea') await el.fill(['42', 'hello', 'print("hi")', 'ls', 'cd home', '1010', ''][rand(7)], { timeout: 1500 });
          else if (tag === 'input:number') await el.fill(String(rand(20)), { timeout: 1500 });
          else if (tag === 'canvas') { const b = await el.boundingBox(); if (b) await page.mouse.click(b.x + rand(Math.max(1, b.width | 0)), b.y + rand(Math.max(1, b.height | 0))); }
          else await el.click({ timeout: 1500 });
        } catch { /* element moved or covered: try another */ }
        await page.waitForTimeout(120);
        if (new URL(page.url()).pathname !== start) { await page.goto(B + url, { waitUntil: 'networkidle' }).catch(() => {}); }
        if (await page.getByRole('dialog').count()) await page.keyboard.press('Escape').catch(() => {});
      }
      const crashed = await page.getByText(/Something went wrong|Unexpected Application Error/).count();
      if (crashed) issues.push('error screen after clicking');
    } catch (e) { issues.push(`goto: ${String(e.message).slice(0, 160)}`); }
    out.push({ url, issues: [...new Set(issues)] });
    console.log(issues.length ? `  FAIL ${url}\n        ${[...new Set(issues)].slice(0, 4).join('\n        ')}` : `  ok   ${url}`);
    await page.close();
  }
  await browser.close();
  const bad = out.filter((r) => r.issues.length).length;
  console.log(`\n${out.length - bad} clean, ${bad} with problems`);
  process.exit(bad ? 1 : 0);
})();
