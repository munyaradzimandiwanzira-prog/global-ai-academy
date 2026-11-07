import { describe, expect, it } from 'vitest';
import { ACTIVITY_KINDS, ESL_BANDS, ESL_WEEKS, activitySchema, activityText, bandForAge, buildUnit, decodable, hasBlockedWord, likeness, localize, soundsOf, spokenMatch, typedMatch, type ActivityBody } from '../shared/esl';

describe('ESL curriculum', () => {
  it('has all 36 weeks of the scheme, in order, each with ten picture words', () => {
    expect(ESL_WEEKS.map((w) => w.week)).toEqual(Array.from({ length: 36 }, (_, i) => i + 1));
    for (const w of ESL_WEEKS) {
      expect(w.words).toHaveLength(10);
      for (const [word, emoji] of w.words) { expect(word).toMatch(/^[a-z][a-z ]*$/); expect(emoji.length).toBeGreaterThan(0); }
      expect(w.gaps.every((g) => g.text.includes('___') && g.options.includes(g.answer))).toBe(true);
      expect(w.story.questions.every((q) => q.options.includes(q.answer))).toBe(true);
    }
  });
  it('covers ages 2 to 20 with no gaps between bands', () => {
    for (let age = 2; age <= 20; age++) expect(ESL_BANDS.filter((b) => age >= b.minAge && age <= b.maxAge)).toHaveLength(1);
    expect(bandForAge(3).id).toBe('tiny');
    expect(bandForAge(12).id).toBe('flyers');
    expect(bandForAge(19).id).toBe('first');
  });
  it('builds valid games for every week and band, in both accents', () => {
    for (const b of ESL_BANDS) for (const w of ESL_WEEKS) for (const accent of ['gb', 'us'] as const) {
      const unit = buildUnit(w.week, b.id, accent, { name: 'Tari', age: 6 });
      expect(unit.length).toBeGreaterThanOrEqual(4);
      for (const a of unit) {
        const r = activitySchema.safeParse(a);
        if (!r.success) throw new Error(`${a.id}: ${r.error.issues.map((i) => i.path.join('.') + ' ' + i.message).join('; ')}`);
        expect(hasBlockedWord(activityText(a as ActivityBody)), a.id).toBe(false);
        if (a.kind === 'pick') for (const it of a.items) expect(it.options.some((o) => o.word === it.word)).toBe(true);
        if (a.kind === 'spell') for (const it of a.items) expect([...it.letters].sort().join('')).toBe([...it.word].sort().join(''));
        if (a.kind === 'order') for (const it of a.items) expect([...it.words].sort().join(' ')).toBe(it.sentence.replace(/[.!?]$/, '').split(/\s+/).sort().join(' '));
        if (a.kind === 'rhyme') for (const it of a.items) expect(it.options.some((o) => o.word === it.answer)).toBe(true);
      }
    }
  });
  it('gives the youngest children voice-first games and older learners writing', () => {
    const kinds = (b: Parameters<typeof buildUnit>[1]) => buildUnit(1, b, 'gb').map((a) => a.kind);
    expect(kinds('tiny')).toEqual(['echo', 'pick', 'say', 'story']);
    expect(kinds('tiny')).not.toContain('write');
    expect(kinds('little')).toContain('sound');
    expect(kinds('first')).toContain('write');
    expect(new Set(ESL_BANDS.flatMap((b) => kinds(b.id)))).toEqual(new Set(ACTIVITY_KINDS));
  });
  it('is the same each time it is opened', () => {
    expect(buildUnit(7, 'movers', 'gb')).toEqual(buildUnit(7, 'movers', 'gb'));
  });
});

describe('British and American English', () => {
  it('converts spelling, and vocabulary only in word games', () => {
    expect(localize('My favourite colour is grey.', 'us')).toBe('My favorite color is gray.');
    expect(localize('My favourite colour is grey.', 'gb')).toBe('My favourite colour is grey.');
    expect(localize('I play football.', 'us')).toBe('I play football.');
    expect(localize('football', 'us', true)).toBe('soccer');
    expect(localize('Mum said, "Come home."', 'us')).toBe('Mom said, "Come home."');
  });
  it('accepts either spelling when checking', () => {
    expect(typedMatch('colour', 'color')).toBe(true);
    expect(typedMatch('Colour', 'COLOUR')).toBe(true);
    expect(typedMatch('colour', 'colur')).toBe(false);
  });
});

describe('phonics', () => {
  it('splits words into sounds', () => {
    expect(soundsOf('cat')).toEqual(['c', 'a', 't']);
    expect(soundsOf('ship')).toEqual(['sh', 'i', 'p']);
    expect(soundsOf('fish')).toEqual(['f', 'i', 'sh']);
    expect(soundsOf('cake')).toEqual(['c', 'a_e', 'k']);
    expect(soundsOf('three')).toEqual(['th', 'r', 'ee']);
    expect(decodable('cat')).toBe(true);
    expect(decodable('breakfast')).toBe(false);
  });
});

describe('checking what a learner said', () => {
  it('finds the word inside a longer answer', () => {
    expect(spokenMatch('cat', "It's a cat!").ok).toBe(true);
    expect(spokenMatch('five', 'Five.').ok).toBe(true);
    expect(spokenMatch('five', '5').ok).toBe(true);
    expect(spokenMatch('colour', 'color').ok).toBe(true);
  });
  it('is kinder to small children and stricter with teenagers', () => {
    expect(spokenMatch('elephant', 'elefan', 'early').ok).toBe(true);
    expect(spokenMatch('elephant', 'elefan', 'secondary').ok).toBe(false);
    expect(spokenMatch('banana', 'tomato', 'early').ok).toBe(false);
  });
  it('scores whole sentences', () => {
    expect(spokenMatch('Nice to meet you', 'nice to meet you').ok).toBe(true);
    expect(likeness('hello', 'hello')).toBe(1);
  });
});

describe('word filter', () => {
  it('blocks bad words but not innocent words that contain them', () => {
    expect(hasBlockedWord('what the hell')).toBe(true);
    expect(hasBlockedWord('Hello class')).toBe(false);
    expect(hasBlockedWord('The class assignment')).toBe(false);
    expect(hasBlockedWord('Scunthorpe')).toBe(false);
  });
  it('rejects a generated game with a bad word or a broken shape', () => {
    expect(activitySchema.safeParse({ kind: 'say', items: [{ word: 'apple', emoji: '🍎' }] }).success).toBe(true);
    expect(activitySchema.safeParse({ kind: 'say', items: [{ word: '<script>', emoji: '' }] }).success).toBe(false);
    expect(activitySchema.safeParse({ kind: 'gap', items: [{ text: 'no blank here', answer: 'a', options: ['a', 'b'] }] }).success).toBe(false);
    expect(activitySchema.safeParse({ kind: 'teleport', items: [] }).success).toBe(false);
  });
});
