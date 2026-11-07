// Sends malformed input to every API route, as a guest and as an admin, and fails on any 5xx.
// Usage: node tests/e2e-api-fuzz.mjs routes.json admin-cookies.json   (local only)
import fs from 'node:fs';
const B = process.env.BASE || 'http://127.0.0.1:8787';
if (!/127\.0\.0\.1|localhost/.test(B)) throw new Error('Local only.');
const [,, routesFile, cookieFile] = process.argv;
const routes = JSON.parse(fs.readFileSync(routesFile, 'utf8'));
const [{ name, value }] = JSON.parse(fs.readFileSync(cookieFile, 'utf8'));
const SKIP = /\/auth\/logout|\/account$|\/account\/delete|\/mcp|\/sessions\/revoke-all|\/auth\/sessions/;
const bodies = [undefined, '{', '[]', 'null', '{"a":1}', JSON.stringify({ name: 1, email: [], title: {}, code: 5, amountCents: 'x', message: 'x'.repeat(200000) }), JSON.stringify({ id: "' OR 1=1 --", q: '%', key: '{"id":1}' })];
const ids = ['x', '00000000-0000-0000-0000-000000000000', "1' OR '1'='1", '%2e%2e%2f'];
let bad = 0, n = 0;
for (const [method, path] of routes) {
  if (SKIP.test(path)) continue;
  for (const id of ids) {
    const p = path.replace(/:\w+/g, id);
    for (const who of ['guest', 'admin']) {
      for (const body of method === 'GET' || method === 'DELETE' ? [undefined] : bodies) {
        n++;
        const r = await fetch(B + p + (method === 'GET' ? '?q=%27&limit=-1&offset=abc&days=99999&status=zz' : ''), {
          method, body, headers: { origin: B, 'content-type': 'application/json', ...(who === 'admin' ? { cookie: `${name}=${value}` } : {}) },
        }).catch((e) => ({ status: 599, text: async () => String(e) }));
        if (r.status >= 500 && !(r.status === 503 && /not configured|not enabled|Paynow|payments are not/i.test(await r.clone?.().text?.() ?? ''))) {
          bad++;
          console.log(`  ${r.status} ${who} ${method} ${p} body=${String(body).slice(0, 40)} → ${(await r.text()).slice(0, 160)}`);
        }
      }
    }
    if (!/:\w+/.test(path)) break;
  }
}
console.log(`\n${n} requests, ${bad} server errors`);
process.exit(bad ? 1 : 0);
