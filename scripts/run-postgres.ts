/**
 * Runs every PostgreSQL code block and challenge in the content on real Postgres (PGlite + pgvector),
 * exactly as the browser runner does, and checks each challenge's reference solution matches.
 * Run: npx tsx scripts/run-postgres.ts
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { vector } from '@electric-sql/pglite-pgvector';
import { parseTrack } from '../plugins/content-parser';
import { resetDatabase, type PgDataset } from '../src/features/runners/postgres-seed';
import { POSTGRES_SOLUTIONS } from '../tests/solutions/postgres_solutions';

/** Blocks that are meant to fail, to show an error to the learner. */
const EXPECTED_ERRORS = new Set(['postgresql:tables:run2']);

const dir = join(import.meta.dirname, '../content/tracks');
const pg = await PGlite.create({ extensions: { vector } });
const datasetOf = (code: string): PgDataset => (/^\s*--\s*dataset:\s*empty\b/im.test(code) ? 'empty' : 'zim');
const rowsOf = async (sql: string, dataset: PgDataset) => {
  await resetDatabase(pg, dataset);
  const res = await pg.exec(sql, { rowMode: 'array' });
  const last = res.filter((r) => r.fields.length).pop();
  return JSON.stringify(last?.rows ?? []);
};

let blocks = 0, challenges = 0, problems = 0;
for (const f of readdirSync(dir).filter((x) => x.endsWith('.md')).sort()) {
  const track = parseTrack(readFileSync(join(dir, f), 'utf8'), f);
  for (const lesson of track.lessons) {
    for (const b of lesson.blocks) {
      if (b.type === 'run' && b.lang === 'postgres') {
        blocks++;
        try {
          await rowsOf(b.code, datasetOf(b.code));
          if (EXPECTED_ERRORS.has(b.id)) { problems++; console.log(`✗ ${b.id}: expected an error but it ran`); }
        } catch (e) {
          if (!EXPECTED_ERRORS.has(b.id)) { problems++; console.log(`✗ ${b.id} (${b.title ?? ''}): ${(e as Error).message}`); }
        }
      }
      if (b.type === 'challenge' && b.challenge.lang === 'postgres') {
        challenges++;
        const c = b.challenge;
        try {
          const expected = await rowsOf(c.tests, datasetOf(c.tests));
          if (expected === '[]') { problems++; console.log(`✗ ${c.id}: the checker query returns no rows`); }
          const solution = POSTGRES_SOLUTIONS[c.id];
          if (!solution) { problems++; console.log(`✗ ${c.id}: no reference solution`); continue; }
          const got = await rowsOf(solution, datasetOf(solution));
          if (got !== expected) { problems++; console.log(`✗ ${c.id}: solution differs\n   expected ${expected.slice(0, 200)}\n   got      ${got.slice(0, 200)}`); }
        } catch (e) {
          problems++; console.log(`✗ ${c.id}: ${(e as Error).message}`);
        }
      }
    }
  }
}
await pg.close();
console.log(`checked ${blocks} postgres blocks and ${challenges} challenges, ${problems} problems`);
process.exit(problems ? 1 : 0);
