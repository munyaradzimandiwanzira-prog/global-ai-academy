import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseTrack } from '../plugins/content-parser';
const dir = join(import.meta.dirname, '../content/tracks');
const out: unknown[] = [];
for (const f of readdirSync(dir).filter((x) => x.endsWith('.md'))) {
  const t = parseTrack(readFileSync(join(dir, f), 'utf8'), f);
  for (const l of t.lessons) for (const b of l.blocks) {
    if (b.type === 'run' && b.lang === 'python') out.push({ kind: 'run', id: b.id, code: b.code, output: b.output });
    if (b.type === 'challenge' && b.challenge.lang === 'python') out.push({ kind: 'challenge', id: b.challenge.id, code: b.challenge.starter, tests: b.challenge.tests, expected: b.challenge.expectedOutput });
  }
}
writeFileSync(process.argv[2]!, JSON.stringify(out));
