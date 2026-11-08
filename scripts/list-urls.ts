/**
 * Every public page of the site.
 *   npx tsx scripts/list-urls.ts                       one path per line (for the crawler)
 *   npx tsx scripts/list-urls.ts --sitemap public/sitemap.xml   writes the sitemap (run by `npm run build`)
 */
import { MATHS_UNITS } from '../shared/maths';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseTrack } from '../plugins/content-parser';
import { REFERENCES } from '../src/data/references';
import { CAREERS } from '../src/data/careers';
import { SCENARIOS } from '../src/features/graph/scenarios';
import { KID_GAMES } from '../shared/kids-games';
const PLAYGROUND_LANGS = ['python', 'javascript', 'typescript', 'html', 'css', 'sql', 'postgres', 'cypher', 'java', 'kotlin', 'php', 'cpp', 'c', 'swift', 'go', 'bash'];

const dir = join(import.meta.dirname, '../content/tracks');
const out = new Set<string>(['/', '/tutorials', '/exercises', '/start', '/reference', '/quiz', '/challenges', '/lab', '/careers', '/pricing', '/teachers', '/leaderboard', '/verify', '/contact', '/about', '/privacy', '/terms', '/login', '/signup', '/forgot-password', '/playground', '/kids', '/kids/curriculum', '/cambridge', '/cambridge/esl', '/cambridge/maths', ...MATHS_UNITS.map((u) => `/cambridge/maths/${u.id}`)]);
for (const f of readdirSync(dir).filter((x) => x.endsWith('.md')).sort()) {
  const t = parseTrack(readFileSync(join(dir, f), 'utf8'), f);
  out.add(`/learn/${t.meta.id}`);
  out.add(`/quiz/${t.meta.id}`);
  for (const l of t.lessons) out.add(`/learn/${t.meta.id}/${l.slug}`);
}
for (const r of REFERENCES) out.add(`/reference/${r.id}`);
for (const c of CAREERS) out.add(`/careers/${c.id}`);
for (const s of SCENARIOS) out.add(`/lab/${s.id}`);
for (const g of KID_GAMES) out.add(`/kids/${g.id}`);
for (const l of PLAYGROUND_LANGS) out.add(`/compiler/${l}`);
const at = process.argv.indexOf('--sitemap');
if (at > 0) {
  const site = 'https://skurulearning.com';
  const skip = new Set(['/login', '/signup', '/forgot-password', '/verify']);
  const esc = (x: string) => x.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${[...out].filter((u) => !skip.has(u)).map((u) => `  <url><loc>${esc(site + (u === '/' ? '' : u))}</loc></url>`).join('\n')}\n</urlset>\n`;
  writeFileSync(process.argv[at + 1]!, xml);
  console.log(`sitemap: ${out.size - skip.size} pages`);
} else {
  console.log([...out].join('\n'));
}
