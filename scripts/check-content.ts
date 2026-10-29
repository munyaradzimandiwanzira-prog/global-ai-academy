/**
 * Validates every track and prints a summary. Run with: npx tsx scripts/check-content.ts
 * (also enforced by the test suite and at build time).
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseTrack, toCatalogEntry } from '../plugins/content-parser';
import { lintSketch } from '../shared/sketch';

const dir = join(import.meta.dirname, '../content/tracks');
let failed = 0;
let lessons = 0;
let sketches = 0;
let sketchIssues = 0;
for (const f of readdirSync(dir).filter((x) => x.endsWith('.md')).sort()) {
  try {
    const t = parseTrack(readFileSync(join(dir, f), 'utf8'), f);
    const c = toCatalogEntry(t);
    lessons += c.lessons.length;
    let n = 0;
    const problems: string[] = [];
    for (const l of t.lessons)
      for (const b of l.blocks)
        if (b.type === 'sketch') {
          n++;
          for (const issue of lintSketch(b.sketch)) problems.push(`    ${l.slug} · "${b.sketch.title ?? 'untitled'}": ${issue}`);
        }
    sketches += n;
    sketchIssues += problems.length;
    console.log(`${problems.length ? '✗' : '✓'} ${f.padEnd(26)} ${String(c.lessons.length).padStart(3)} lessons  ${String(c.exerciseCount).padStart(3)} ex  ${String(c.challengeCount).padStart(3)} ch  ${String(c.quizCount).padStart(3)} quiz  ${String(n).padStart(3)} sketches`);
    problems.forEach((p) => console.log(p));
    if (problems.length) failed++;
  } catch (e) {
    failed++;
    console.log(`✗ ${f}: ${(e as Error).message}`);
  }
}
console.log(`\n${lessons} lessons total, ${sketches} sketches (${sketchIssues} layout issues), ${failed} file(s) with errors`);
process.exit(failed ? 1 : 0);
