import { describe, expect, it } from 'vitest';
import { KID_GAMES } from '../shared/kids-games';
import { KID_LEVELS, STAGES, STRANDS, levelsFor, stageRange, strandsFor } from '../shared/kids-curriculum';
import { LEVELS as MAZE } from '../src/features/kids/games/maze-engine';
import { BUG_LEVELS } from '../src/features/kids/games/bug-levels';
import { BRIDGE_LEVELS } from '../src/features/kids/games/engines/bridge';

describe('Kids Zone curriculum map', () => {
  it('maps every level of every game, and nothing else', () => {
    for (const g of KID_GAMES) expect(levelsFor(g.id).length, g.id).toBe(g.levels);
    const ids = new Set(KID_GAMES.map((g) => g.id));
    for (const l of KID_LEVELS) expect(ids.has(l.game), l.game).toBe(true);
  });
  it('matches the real level counts in the game engines', () => {
    expect(levelsFor('maze').length).toBe(MAZE.length);
    expect(levelsFor('bugs').length).toBe(BUG_LEVELS.length);
    expect(levelsFor('bridge').length).toBe(BRIDGE_LEVELS.length);
  });
  it('gives each level a unique star key, a known stage and real strands', () => {
    const keys = KID_LEVELS.map((l) => l.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const l of KID_LEVELS) {
      expect(STAGES.some((s) => s.id === l.stage)).toBe(true);
      expect(l.strands.length).toBeGreaterThan(0);
      for (const s of l.strands) expect(STRANDS[s]).toBeDefined();
      expect(l.goal).toMatch(/^I (can|know) /);
      expect(l.query).toMatch(/^\?[a-z]+=/);
    }
  });
  it('covers every primary stage with several levels', () => {
    for (const s of [1, 2, 3, 4, 5, 6] as const) expect(KID_LEVELS.filter((l) => l.stage === s).length, `stage ${s}`).toBeGreaterThanOrEqual(5);
    expect(stageRange('maze')).toEqual([1, 5]);
    expect(strandsFor('launch')).toEqual(['physics', 'earth', 'tws']);
  });
});

import { isSafeZuvaPath } from '../shared/zuva';
import { callAcademyTool } from '../worker/zuva/mcp';
import { zuvaChatSchema } from '../shared/schemas';

describe('stages in Zuva and MCP', () => {
  it('lets Zuva link to a level, and nothing looser', () => {
    for (const l of KID_LEVELS) expect(isSafeZuvaPath(`/kids/${l.game}${l.query}`), l.key).toBe(true);
    expect(isSafeZuvaPath('/kids/curriculum')).toBe(true);
    expect(isSafeZuvaPath('/kids/launch?level=3&next=https://evil.example')).toBe(false);
    expect(isSafeZuvaPath('/kids/launch?redirect=x')).toBe(false);
  });
  it('MCP lists a stage’s levels with direct links', () => {
    const r = callAcademyTool('list_kids_games', { stage: 3 });
    expect(r.text).toMatch(/^Stage 3, ages 7–8/);
    expect(r.text).toContain('/kids/launch?level=2');
    const all = callAcademyTool('list_kids_games', {});
    expect(all.text).toContain('Launch Lab: Forces and motion, Stages 2–6');
  });
  it('accepts a stage in a chat request, within range', () => {
    expect(zuvaChatSchema.safeParse({ mode: 'kids', message: 'hi', stage: 3 }).success).toBe(true);
    expect(zuvaChatSchema.safeParse({ mode: 'kids', message: 'hi', stage: 9 }).success).toBe(false);
  });
});
