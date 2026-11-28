import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseTrack, toCatalogEntry } from '../plugins/content-parser';
import { buildMenus, menuOfTrack, MENU_SPECS } from '../src/components/layout/learning-menu';
import type { CatalogTrack } from '../shared/content';

const dir = join(__dirname, '../content/tracks');
const catalog: CatalogTrack[] = readdirSync(dir)
  .filter((f) => f.endsWith('.md'))
  .map((f) => toCatalogEntry(parseTrack(readFileSync(join(dir, f), 'utf8'), f)));
const menus = buildMenus(catalog);
const placed = menus.flatMap((m) => m.sections.flatMap((s) => s.tracks.map((t) => t.id)));

describe('learning menu', () => {
  it('lists AI/ML Learning first and Cambridge second', () => {
    expect(MENU_SPECS.map((m) => m.id).slice(0, 2)).toEqual(['aiml', 'cambridge']);
  });

  it('puts every track except Start here and Kids in exactly one dropdown', () => {
    const expected = catalog.filter((t) => t.category !== 'start' && t.category !== 'kids').map((t) => t.id).sort();
    expect([...placed].sort()).toEqual(expected);
    expect(new Set(placed).size).toBe(placed.length);
  });

  it('gathers every AI, data and agentic track under AI/ML Learning', () => {
    const aiml = menus.find((m) => m.id === 'aiml')!;
    const ids = new Set(aiml.sections.flatMap((s) => s.tracks.map((t) => t.id)));
    for (const t of catalog.filter((x) => ['ai', 'agentic', 'maths-data'].includes(x.category))) expect(ids.has(t.id), t.id).toBe(true);
    for (const id of ['hugging-face', 'langchain', 'pydantic']) expect(menuOfTrack(menus, id)).toBe('aiml');
  });

  it('names only tracks that exist or are planned, and drops empty sections', () => {
    for (const m of menus) for (const s of m.sections) expect(s.tracks.length).toBeGreaterThan(0);
    expect(menuOfTrack(menus, 'python')).toBe('coding');
    expect(menuOfTrack(menus, 'android')).toBe('apps');
  });
});
