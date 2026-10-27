/**
 * Validates every track and prints a summary. Run with: npx tsx scripts/check-content.ts
 * (also enforced by the test suite and at build time).
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseTrack, toCatalogEntry } from '../plugins/content-parser';

const dir = join(import.meta.dirname, '../content/tracks');
let failed = 0;
let lessons = 0;
for (const f of readdirSync(dir).filter((x) => x.endsWith('.md')).sort()) {
  try {
    const t = parseTrack(readFileSync(join(dir, f), 'utf8'), f);
    const c = toCatalogEntry(t);
    lessons += c.lessons.length;
    console.log(`✓ ${f.padEnd(26)} ${String(c.lessons.length).padStart(3)} lessons  ${String(c.exerciseCount).padStart(3)} ex  ${String(c.challengeCount).padStart(3)} ch  ${String(c.quizCount).padStart(3)} quiz`);
  } catch (e) {
    failed++;
    console.log(`✗ ${f}: ${(e as Error).message}`);
  }
}
console.log(`\n${lessons} lessons total, ${failed} file(s) with errors`);
process.exit(failed ? 1 : 0);
