import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseTrack } from '../plugins/content-parser';
import { runCypherCode } from '../src/features/runners/cypher';
import { compareOutput } from '../src/features/runners/types';
import { CYPHER_SOLUTIONS } from './solutions/cypher_solutions';

const dir = join(__dirname, '../content/tracks');
const blocks = readdirSync(dir).filter((f) => f.endsWith('.md')).flatMap((f) => parseTrack(readFileSync(join(dir, f), 'utf8'), f).lessons.flatMap((l) => l.blocks));
const stdout = (r: Awaited<ReturnType<typeof runCypherCode>>) => r.lines.filter((l) => l.kind === 'stdout').map((l) => l.text).join('\n');

describe('Cypher lesson content', () => {
  it('every runnable Cypher example runs without errors', async () => {
    const runs = blocks.filter((b) => b.type === 'run' && b.lang === 'cypher');
    expect(runs.length).toBeGreaterThan(10);
    for (const b of runs) {
      if (b.type !== 'run') continue;
      const r = await runCypherCode(b.code);
      expect(r.error, `${b.id}: ${r.error}`).toBeUndefined();
      if (b.output != null) expect(compareOutput(stdout(r), b.output).passed, b.id).toBe(true);
    }
  });

  it('every Cypher challenge has a reference solution that passes, and the starter does not', async () => {
    const challenges = blocks.flatMap((b) => (b.type === 'challenge' && b.challenge.lang === 'cypher' ? [b.challenge] : []));
    for (const c of challenges) {
      const sol = CYPHER_SOLUTIONS[c.id];
      expect(sol, `missing solution for ${c.id}`).toBeTruthy();
      const r = await runCypherCode(sol!);
      expect(r.error, `${c.id}: ${r.error}`).toBeUndefined();
      const check = compareOutput(stdout(r), c.expectedOutput ?? '');
      expect(check.passed, `${c.id}\n${check.message}`).toBe(true);
      const starter = await runCypherCode(c.starter);
      expect(compareOutput(stdout(starter), c.expectedOutput ?? '').passed, `${c.id} starter already passes`).toBe(false);
    }
  });
});
