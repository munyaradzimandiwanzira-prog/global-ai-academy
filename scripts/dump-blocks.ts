/** Dumps runnable blocks for a set of languages as JSON (used by the language verifiers). */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseTrack } from '../plugins/content-parser';
const [out, ...langs] = process.argv.slice(2);
const dir = join(import.meta.dirname, '../content/tracks');
const blocks: unknown[] = [];
for (const f of readdirSync(dir).filter((x) => x.endsWith('.md'))) {
  const t = parseTrack(readFileSync(join(dir, f), 'utf8'), f);
  for (const l of t.lessons) for (const b of l.blocks) {
    if (b.type === 'run' && langs.includes(b.lang)) blocks.push({ kind: 'run', id: b.id, lang: b.lang, code: b.code, output: b.output ?? null });
    if (b.type === 'challenge' && langs.includes(b.challenge.lang)) blocks.push({ kind: 'challenge', id: b.challenge.id, lang: b.challenge.lang, code: b.challenge.starter, tests: b.challenge.tests, output: b.challenge.expectedOutput ?? null });
  }
}
writeFileSync(out!, JSON.stringify(blocks));
