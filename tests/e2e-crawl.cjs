// Crawls every page and reports console errors, failed requests, error screens, missing headings and sideways scrolling.
// Usage: npx tsx scripts/list-urls.ts > /tmp/urls.txt && node tests/e2e-crawl.cjs /tmp/urls.txt /tmp/crawl.json 390 [cookies.json]
const { chromium, devices } = require('playwright');
const fs = require('fs');
const [,, listFile, outFile, width = '390', cookieFile] = process.argv;
const B = process.env.BASE || 'http://127.0.0.1:8787';
const urls = fs.readFileSync(listFile, 'utf8').split('\n').filter(Boolean);
const IGNORE = /cloudflareinsights|challenges\.cloudflare|favicon|\/api\/t$|fonts\.g/;
(async () => {
  const browser = await chromium.launch();
  const w = Number(width);
  const ctx = await browser.newContext({ viewport: { width: w, height: w < 600 ? 844 : 900 }, ...(w < 600 ? { isMobile: true, hasTouch: true, deviceScaleFactor: 1 } : {}) });
  if (cookieFile) await ctx.addCookies(JSON.parse(fs.readFileSync(cookieFile, 'utf8')));
  const results = [];
  let i = 0;
  async function worker() {
    const page = await ctx.newPage();
    while (i < urls.length) {
      const url = urls[i++];
      const issues = [];
      const onConsole = (m) => { if (m.type() === 'error' && !IGNORE.test(m.text()) && !/Failed to load resource/.test(m.text())) issues.push(`console: ${m.text().slice(0, 240)}`); };
      const onErr = (e) => issues.push(`pageerror: ${String(e.message || e).slice(0, 240)}`);
      const onResp = (r) => { const u = r.url(); if (r.status() >= 400 && !IGNORE.test(u) && !(r.status() === 401 && /\/api\/(me|auth\/me|notifications)/.test(u))) issues.push(`http ${r.status()}: ${u.replace(B, '').slice(0, 160)}`); };
      const onFail = (r) => { if (!IGNORE.test(r.url()) && !/ERR_ABORTED/.test(r.failure()?.errorText || '')) issues.push(`reqfail: ${r.url().replace(B, '').slice(0, 160)} ${r.failure()?.errorText}`); };
      page.on('console', onConsole); page.on('pageerror', onErr); page.on('response', onResp); page.on('requestfailed', onFail);
      try {
        await page.goto(B + url, { waitUntil: 'load', timeout: 30000 });
        await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {}); await page.waitForTimeout(Number(process.env.WAIT || 600));
        const info = await page.evaluate(() => {
          const vw = window.innerWidth;
          const text = document.body.innerText;
          const wide = [];
          if (document.documentElement.scrollWidth > vw + 1) {
            for (const el of document.querySelectorAll('body *')) {
              const r = el.getBoundingClientRect();
              if (r.right > vw + 1 && r.width > 0 && getComputedStyle(el).position !== 'fixed') {
                // Skip children of horizontal scrollers (they're meant to overflow their box).
                let p = el.parentElement, scroller = false;
                while (p) { const s = getComputedStyle(p); if (/(auto|scroll|hidden)/.test(s.overflowX) && p !== document.body && p !== document.documentElement) { scroller = true; break; } p = p.parentElement; }
                if (!scroller) wide.push(`${el.tagName.toLowerCase()}.${String(el.className).slice(0, 60)} right=${Math.round(r.right)}`);
              }
              if (wide.length > 3) break;
            }
          }
          return { scrollW: document.documentElement.scrollWidth, vw, wide, title: document.title,
            errorScreen: /Something went wrong|Page not found|This page couldn’t load|Unexpected Application Error/i.test(text) ? text.slice(0, 120) : null,
            h1: document.querySelector('h1')?.textContent?.slice(0, 80) ?? null };
        });
        if (info.wide.length) issues.push(`overflow ${info.scrollW}>${info.vw}: ${info.wide.join(' | ')}`);
        if (info.errorScreen) issues.push(`error screen: ${info.errorScreen.replace(/\s+/g, ' ')}`);
        if (!info.h1) issues.push('no h1');
      } catch (e) { issues.push(`goto: ${String(e.message).slice(0, 160)}`); }
      page.off('console', onConsole); page.off('pageerror', onErr); page.off('response', onResp); page.off('requestfailed', onFail);
      results.push({ url, issues: [...new Set(issues)] });
      if (results.length % 50 === 0) process.stderr.write(`${results.length}/${urls.length}\n`);
    }
    await page.close();
  }
  await Promise.all(Array.from({ length: 5 }, worker));
  await browser.close();
  fs.writeFileSync(outFile, JSON.stringify(results, null, 1));
  const bad = results.filter((r) => r.issues.length);
  console.log(`${results.length} pages, ${bad.length} with issues`);
})();
