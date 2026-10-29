/**
 * Auto-spaces pencil sketches that fail the layout lint: for each failing ```sketch block it tries
 * slightly larger grid cells (cellW/cellH) and keeps the smallest change that passes. Diagrams that
 * still fail are listed for a manual fix. Run: npx tsx scripts/fit-sketches.ts [--write]
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse as parseYaml } from 'yaml';
import { lintSketch, parseSketch } from '../shared/sketch';
import { quoteProse } from '../plugins/content-parser';

const dir = join(import.meta.dirname, '../content/tracks');
const write = process.argv.includes('--write');
const BLOCK = /```sketch\n([\s\S]*?)```/g;

const setKey = (yaml: string, key: string, value: number) =>
  new RegExp(`^${key}:.*$`, 'm').test(yaml) ? yaml.replace(new RegExp(`^${key}:.*$`, 'm'), `${key}: ${value}`) : yaml.replace(/^(title:.*\n(?:caption:.*\n)?)/m, `$1${key}: ${value}\n`);

for (const f of readdirSync(dir).filter((x) => x.endsWith('.md')).sort()) {
  const src = readFileSync(join(dir, f), 'utf8');
  let changed = false;
  const out = src.replace(BLOCK, (whole, yaml: string) => {
    const spec = parseSketch(parseYaml(quoteProse(yaml)));
    if (!lintSketch(spec).length) return whole;
    const w0 = spec.cellW ?? 200;
    const h0 = spec.cellH ?? 120;
    for (let total = 5; total <= 60; total += 5)
      for (let dw = 0; dw <= total; dw += 5) {
        const dh = total - dw;
        if (!lintSketch({ ...spec, cellW: w0 + dw, cellH: h0 + dh }).length) {
          let y = yaml;
          if (dw) y = setKey(y, 'cellW', w0 + dw);
          if (dh) y = setKey(y, 'cellH', h0 + dh);
          console.log(`fixed  ${f} · ${spec.title}: cellW ${w0}→${w0 + dw}, cellH ${h0}→${h0 + dh}`);
          changed = true;
          return '```sketch\n' + y + '```';
        }
      }
    console.log(`MANUAL ${f} · ${spec.title}:\n  ${lintSketch(spec).join('\n  ')}`);
    return whole;
  });
  if (changed && write) writeFileSync(join(dir, f), out);
}
