/**
 * End-to-end: for every web challenge, type the reference solution into the real challenge editor,
 * press "Run & check" and require the "All tests passed" banner. Then confirm the starter fails.
 * Usage: node tests/e2e-challenges.cjs [baseUrl]
 */
const { chromium } = require('playwright');
const solutions = require('./solutions/web_solutions.json');
const base = process.argv[2] || 'http://localhost:5173';

async function runChallenge(page, code) {
  const section = page.locator('section[aria-label="Coding challenge"]').first();
  if (code !== null) {
    const editor = section.locator('.cm-content').first();
    await editor.click();
    await page.keyboard.press('ControlOrMeta+A');
    await page.keyboard.press('Delete');
    await page.keyboard.insertText(code);
  }
  await section.getByRole('button', { name: /Run & check/ }).click();
  const pass = section.getByText('All tests passed');
  const fail = section.getByText('Not quite yet');
  await Promise.race([pass.waitFor({ timeout: 15000 }), fail.waitFor({ timeout: 15000 })]).catch(() => {});
  return (await pass.count()) > 0;
}

(async () => {
  const browser = await chromium.launch();
  let failures = 0;
  for (const [id, { path, code }] of Object.entries(solutions)) {
    const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
    await page.goto(base + path, { waitUntil: 'networkidle' });
    await page.locator('section[aria-label="Coding challenge"]').first().waitFor();
    const starterPasses = await runChallenge(page, null);
    await page.reload({ waitUntil: 'networkidle' });
    const solutionPasses = await runChallenge(page, code);
    const ok = solutionPasses && !starterPasses;
    if (!ok) failures++;
    console.log(`${ok ? '✓' : '✗'} ${id}  solution=${solutionPasses ? 'pass' : 'FAIL'}  starter=${starterPasses ? 'PASSES(bad)' : 'fails'}`);
    await page.close();
  }
  await browser.close();
  process.exit(failures ? 1 : 0);
})();
