/**
 * ESL games. Every game is one of eleven kinds, described by a plain JSON "activity". The course
 * builds activities from the curriculum (buildUnit); Zuva can also create new ones on the fly,
 * which are checked against the same schema and word filter before a learner ever sees them.
 *
 *   echo   Copy Cat         Zuva says a phrase, the learner says it back            speaking
 *   say    Say What You See a picture appears, the learner names it out loud        speaking
 *   pick   Listen and Tap   Zuva says a word, the learner taps the right picture    listening
 *   sound  Sound It Out     tap each sound, blend them, say the word                phonics
 *   rhyme  Rhyme Time       which picture rhymes with this one?                     phonics
 *   spell  Spell It         build the word from letter tiles                        spelling
 *   order  Sentence Train   put the word carriages in order                        grammar
 *   gap    Fill the Gap     choose the word that completes the sentence             grammar
 *   story  Story Time       listen to (or read) a story and answer questions        listening/reading
 *   talk   Talk Time        a spoken or typed role-play with Zuva                   speaking
 *   write  Write and Check  a writing task marked by Zuva against simple criteria   writing
 */
import { z } from 'zod';
import { ESL_BANDS, ESL_WEEKS, RHYMES, eslBand, localize, spellings, type Accent, type EslBand, type EslBandId, type EslWeek, type Pic } from './esl-curriculum';

export * from './esl-curriculum';

export const ACTIVITY_KINDS = ['echo', 'say', 'pick', 'sound', 'rhyme', 'spell', 'order', 'gap', 'story', 'talk', 'write'] as const;
export type ActivityKind = (typeof ACTIVITY_KINDS)[number];

export const ACTIVITY_INFO: Record<ActivityKind, { title: string; skill: 'speaking' | 'listening' | 'phonics' | 'spelling' | 'grammar' | 'reading' | 'writing'; emoji: string; voice: boolean }> = {
  echo: { title: 'Copy Cat', skill: 'speaking', emoji: '🦜', voice: true },
  say: { title: 'Say What You See', skill: 'speaking', emoji: '🗣️', voice: true },
  pick: { title: 'Listen and Tap', skill: 'listening', emoji: '👂🏾', voice: false },
  sound: { title: 'Sound It Out', skill: 'phonics', emoji: '🔤', voice: true },
  rhyme: { title: 'Rhyme Time', skill: 'phonics', emoji: '🎵', voice: false },
  spell: { title: 'Spell It', skill: 'spelling', emoji: '✏️', voice: false },
  order: { title: 'Sentence Train', skill: 'grammar', emoji: '🚂', voice: false },
  gap: { title: 'Fill the Gap', skill: 'grammar', emoji: '🧩', voice: false },
  story: { title: 'Story Time', skill: 'reading', emoji: '📖', voice: false },
  talk: { title: 'Talk Time', skill: 'speaking', emoji: '💬', voice: true },
  write: { title: 'Write and Check', skill: 'writing', emoji: '📝', voice: false },
};

// ── Activity schema (also used to validate games Zuva creates) ─────────────

const text = (max: number) => z.string().trim().min(1).max(max);
const word = z.string().trim().min(1).max(32).regex(/^[A-Za-z][A-Za-z' -]*$/, 'Letters only');
const emoji = z.string().trim().max(16).default('');
const pic = z.object({ word, emoji });
const option = z.object({ label: text(60), emoji });

export const activitySchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('echo'), items: z.array(z.object({ text: text(120), emoji })).min(1).max(8) }),
  z.object({ kind: z.literal('say'), items: z.array(pic).min(1).max(10) }),
  z.object({ kind: z.literal('pick'), items: z.array(z.object({ word, emoji, options: z.array(pic).min(2).max(4) })).min(1).max(10) }),
  z.object({ kind: z.literal('sound'), items: z.array(z.object({ word, emoji, sounds: z.array(z.string().min(1).max(4)).min(2).max(8) })).min(1).max(8) }),
  z.object({ kind: z.literal('rhyme'), items: z.array(z.object({ word, emoji, answer: word, options: z.array(pic).min(2).max(4) })).min(1).max(8) }),
  z.object({ kind: z.literal('spell'), items: z.array(z.object({ word, emoji, letters: z.array(z.string().length(1)).min(2).max(14) })).min(1).max(10) }),
  z.object({ kind: z.literal('order'), items: z.array(z.object({ sentence: text(200), words: z.array(text(30)).min(2).max(20) })).min(1).max(8) }),
  z.object({ kind: z.literal('gap'), items: z.array(z.object({ text: text(200).refine((t) => t.includes('___'), 'Needs ___'), answer: text(40), options: z.array(text(40)).min(2).max(4) })).min(1).max(10) }),
  z.object({ kind: z.literal('story'), title: text(80), paragraphs: z.array(text(400)).min(1).max(12), questions: z.array(z.object({ q: text(200), answer: text(60), options: z.array(option).min(2).max(4) })).min(1).max(6), source: z.object({ title: text(120), url: z.string().url().max(300).optional(), licence: text(80) }).optional() }),
  z.object({ kind: z.literal('talk'), scenario: text(400), opener: text(300), goals: z.array(text(120)).min(1).max(5) }),
  z.object({ kind: z.literal('write'), prompt: text(400), minWords: z.number().int().min(5).max(400), maxWords: z.number().int().min(10).max(500), criteria: z.array(text(120)).min(1).max(5) }),
]);

export type ActivityBody = z.infer<typeof activitySchema>;
export type Activity = ActivityBody & {
  id: string;
  title: string;
  /** Spoken by Zuva before the game starts. */
  intro: string;
  /** Skill key used by the learner model, e.g. "speaking:w3". */
  skill: string;
  /** Who made it: the course, or Zuva on the fly. */
  origin: 'course' | 'zuva';
};

// ── Phonics ────────────────────────────────────────────────────────────────

const DIGRAPHS = ['tch', 'igh', 'air', 'ear', 'ure', 'sh', 'ch', 'th', 'ng', 'ck', 'ph', 'wh', 'qu', 'ee', 'oo', 'ai', 'oa', 'ar', 'or', 'ur', 'ow', 'oi', 'er', 'ay', 'ie', 'ue', 'ew', 'ou', 'aw', 'ir', 'ea', 'ss', 'll', 'ff', 'zz'];

/** Split a word into the sounds a phonics teacher would tap out: "ship" → sh-i-p. */
export function soundsOf(w: string): string[] {
  const s = w.toLowerCase().replace(/[^a-z]/g, '');
  const out: string[] = [];
  for (let i = 0; i < s.length;) {
    // A final silent e (cake, snake) belongs to the vowel before it.
    if (s[i] === 'e' && i === s.length - 1 && out.length >= 2) { out[out.length - 2] += '_e'; break; }
    const d = DIGRAPHS.find((g) => s.startsWith(g, i));
    out.push(d ?? s[i]!);
    i += d ? d.length : 1;
  }
  return out;
}

/** Short, regular words suit Sound It Out; long or tricky ones don't. */
export const decodable = (w: string) => /^[a-z]{2,6}$/.test(w) && soundsOf(w).length <= 5 && !/(ight|ough|tion|ph)/.test(w);

/** How Zuva says a sound so a child can hear it: "sh, as in ship". */
export function soundHint(sound: string): string {
  const EX: Record<string, string> = {
    a: 'apple', b: 'ball', c: 'cat', d: 'dog', e: 'egg', f: 'fish', g: 'goat', h: 'hat', i: 'insect', j: 'jam', k: 'kite', l: 'lion', m: 'mango', n: 'nose',
    o: 'orange', p: 'pen', q: 'queen', r: 'rain', s: 'sun', t: 'tree', u: 'umbrella', v: 'van', w: 'water', x: 'box', y: 'yellow', z: 'zebra',
    sh: 'ship', ch: 'chair', th: 'three', ng: 'ring', ck: 'duck', ee: 'bee', oo: 'moon', ai: 'rain', oa: 'boat', ar: 'car', or: 'fork', ow: 'cow', er: 'teacher', ay: 'day', igh: 'night', ss: 'kiss', ll: 'bell', ff: 'off', ir: 'bird', ur: 'turn', ea: 'tea', ou: 'out',
  };
  const base = sound.replace('_e', '');
  return EX[base] ? `${sound.replace('_e', '')}, as in ${EX[base]}` : sound;
}

// ── Checking answers ───────────────────────────────────────────────────────

export const normalise = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[’']/g, "'").replace(/[^a-z0-9' ]+/g, ' ').replace(/\s+/g, ' ').trim();

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0]!;
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j]!;
      prev[j] = Math.min(prev[j]! + 1, prev[j - 1]! + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1));
      diag = tmp;
    }
  }
  return prev[b.length]!;
}

/** 0–1 likeness of two phrases (character level). */
export function likeness(a: string, b: string): number {
  const x = normalise(a), y = normalise(b);
  if (!x || !y) return 0;
  return 1 - levenshtein(x, y) / Math.max(x.length, y.length);
}

const NUMBER_WORDS: Record<string, string> = { '1': 'one', '2': 'two', '3': 'three', '4': 'four', '5': 'five', '6': 'six', '7': 'seven', '8': 'eight', '9': 'nine', '10': 'ten' };

/**
 * Did the learner say the target? Speech recognisers often add words ("it's a cat"), use digits
 * ("5"), or catch the other accent's spelling, so we look for the target inside what was heard and
 * are a little forgiving with very young children.
 */
export function spokenMatch(target: string, heard: string, tier: 'early' | 'primary' | 'secondary' = 'primary'): { ok: boolean; score: number; close: boolean } {
  const words = normalise(heard).split(' ').map((w) => NUMBER_WORDS[w] ?? w).join(' ');
  const goals = spellings(target).map(normalise);
  let best = 0;
  for (const g of goals) {
    if (` ${words} `.includes(` ${g} `)) return { ok: true, score: 1, close: true };
    best = Math.max(best, likeness(g, words));
    // Compare against each window of the same number of words.
    const ws = words.split(' '), n = g.split(' ').length;
    for (let i = 0; i + n <= ws.length; i++) best = Math.max(best, likeness(g, ws.slice(i, i + n).join(' ')));
  }
  const pass = tier === 'early' ? 0.6 : tier === 'primary' ? 0.75 : 0.85;
  return { ok: best >= pass, score: Math.round(best * 100) / 100, close: best >= pass - 0.2 };
}

/** Typed answers: case and punctuation don't matter; either accent's spelling counts. */
export const typedMatch = (target: string, typed: string) => spellings(target).map(normalise).includes(normalise(typed)) || normalise(target) === normalise(typed);

// ── Building a week's games for a band ─────────────────────────────────────

/** Deterministic shuffle, so a unit looks the same each time it is opened (seeded by week and band). */
export function seededShuffle<T>(items: T[], seed: string): T[] {
  let h = 2166136261;
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0;
    const j = h % (i + 1);
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

const singleWords = (w: EslWeek) => w.words.filter(([x]) => !x.includes(' '));
const pics = (list: Pic[], accent: Accent) => list.map(([w, e]) => ({ word: localize(w, accent, true), emoji: e }));
const tokenise = (s: string) => s.replace(/[.!?]$/, '').split(/\s+/);
const fill = (s: string, name?: string, age?: number) => s.replace('{name}', name || 'Zuva').replace('{age}', age ? String(age) : 'five');

function storyFor(w: EslWeek, band: EslBand, accent: Accent): ActivityBody & { kind: 'story' } {
  const emojiOf = new Map(w.words.map(([x, e]) => [x, e]));
  return {
    kind: 'story',
    title: localize(w.story.title, accent),
    paragraphs: w.story.text.map((t) => localize(t, accent)),
    questions: w.story.questions.slice(0, band.tier === 'early' ? 1 : 2).map((q) => ({ q: localize(q.q, accent), answer: localize(q.answer, accent, true), options: q.options.map((o) => ({ label: localize(o, accent, true), emoji: emojiOf.get(o) ?? '' })) })),
  };
}

export interface UnitOptions { name?: string; age?: number }

/**
 * The games for one week at one band, in teaching order: hear and copy → recognise → produce →
 * apply → use in context. Younger bands get fewer, shorter, voice-first games.
 */
export function buildUnit(weekNo: number, bandId: EslBandId, accent: Accent, opts: UnitOptions = {}): Activity[] {
  const w = ESL_WEEKS.find((x) => x.week === weekNo);
  const band = eslBand(bandId);
  if (!w || !band) return [];
  const seed = `${w.week}:${band.id}`;
  const words = seededShuffle(singleWords(w), seed);
  const L = (s: string) => localize(s, accent);
  const out: Activity[] = [];
  const add = (body: ActivityBody, intro: string, skillTag = ACTIVITY_INFO[body.kind].skill) =>
    out.push({ ...body, id: `w${w.week}-${band.id}-${body.kind}-${out.length}`, title: ACTIVITY_INFO[body.kind].title, intro: L(intro), skill: `${skillTag}:w${w.week}`, origin: 'course' } as Activity);

  const pickItems = (n: number, opts: number) => words.slice(0, n).map((p, i) => {
    const others = seededShuffle(words.filter((x) => x[0] !== p[0]), `${seed}:${i}`).slice(0, opts - 1);
    return { word: localize(p[0], accent, true), emoji: p[1], options: seededShuffle(pics([p, ...others], accent), `${seed}:o${i}`) };
  });
  const rhymeItems = (n: number) => seededShuffle(RHYMES, seed).slice(0, n).map((fam, i) => {
    const [a, b] = seededShuffle(fam, `${seed}:r${i}`);
    const others = seededShuffle(RHYMES.filter((f) => f !== fam), `${seed}:x${i}`).slice(0, 2).map((f) => f[0]!);
    return { word: a![0], emoji: a![1], answer: b![0], options: seededShuffle(pics([b!, ...others], accent), `${seed}:ro${i}`) };
  });
  const spellItems = (n: number, maxLen: number) => words.filter(([x]) => x.length <= maxLen).slice(0, n).map(([x, e], i) => {
    const wd = localize(x, accent, true);
    return { word: wd, emoji: e, letters: seededShuffle(wd.split(''), `${seed}:s${i}`) };
  });
  const orderItems = (list: string[], n: number) => list.slice(0, n).map((s, i) => {
    const sentence = L(fill(s, opts.name, opts.age));
    return { sentence, words: seededShuffle(tokenise(sentence), `${seed}:t${i}`) };
  });
  const decod = words.filter(([x]) => decodable(x));

  switch (band.id) {
    case 'tiny':
      add({ kind: 'echo', items: w.phrases.map((p) => ({ text: L(fill(p, opts.name, opts.age)), emoji: '' })) }, 'Let’s play Copy Cat! I say it, then you say it. Ready?');
      add({ kind: 'pick', items: pickItems(4, 2) }, 'Listen carefully. Which picture did I say? Tap it!');
      add({ kind: 'say', items: pics(words.slice(0, 4), accent) }, 'What can you see? Say it out loud!');
      add(storyFor(w, band, accent), 'Story time! Snuggle up and listen.');
      break;
    case 'little':
      add({ kind: 'echo', items: w.phrases.map((p) => ({ text: L(fill(p, opts.name, opts.age)), emoji: '' })) }, 'Copy Cat time! Say it just like me.');
      add({ kind: 'pick', items: pickItems(5, 3) }, 'Listen and tap the right picture.');
      if (decod.length >= 2) add({ kind: 'sound', items: decod.slice(0, 3).map(([x, e]) => ({ word: x, emoji: e, sounds: soundsOf(x) })) }, 'Let’s sound it out. Tap each sound, then blend them together!');
      add({ kind: 'rhyme', items: rhymeItems(3) }, 'Rhyme time! Which one sounds the same at the end?');
      add({ kind: 'say', items: pics(words.slice(0, 5), accent) }, 'Say what you see!');
      add(storyFor(w, band, accent), 'Story time! Listen, then answer my question.');
      break;
    case 'starters':
      add({ kind: 'pick', items: pickItems(6, 3) }, 'Listen and tap the picture.');
      add({ kind: 'say', items: pics(words.slice(0, 6), accent) }, 'Say what you see. Speak nice and clearly!');
      add({ kind: 'spell', items: spellItems(5, 7) }, 'Spell it! Put the letters in the right order.');
      add({ kind: 'rhyme', items: rhymeItems(3) }, 'Find the rhyming word.');
      add({ kind: 'order', items: orderItems(w.sentences, 3) }, 'All aboard the Sentence Train! Put the words in order.', 'grammar');
      add(storyFor(w, band, accent), 'Read along with the story, then answer the questions.', 'reading');
      break;
    case 'movers':
    case 'flyers':
      add({ kind: 'say', items: pics(words.slice(0, 6), accent) }, 'Say each word clearly.');
      add({ kind: 'spell', items: spellItems(6, band.id === 'flyers' ? 11 : 9) }, 'Spell it!');
      add({ kind: 'order', items: orderItems(w.sentences, 4) }, 'Build the sentences.');
      add({ kind: 'gap', items: w.gaps.slice(0, band.id === 'flyers' ? 3 : 2).map((g) => ({ text: L(g.text), answer: L(g.answer), options: seededShuffle(g.options.map(L), `${seed}:g${g.answer}`) })) }, 'Fill the gap with the right word.');
      add(storyFor(w, band, accent), 'Read the story and answer the questions.', 'reading');
      add({ kind: 'talk', scenario: L(w.talk), opener: L(`Let’s talk! ${w.talk.split(':')[0]}.`), goals: ['Speak in full sentences', 'Ask at least one question'] }, 'Talk Time! Chat with me in English. You can speak or type.');
      break;
    default: {
      const [lo, hi] = band.writeWords;
      add({ kind: 'gap', items: w.gaps.map((g) => ({ text: L(g.text), answer: L(g.answer), options: seededShuffle(g.options.map(L), `${seed}:g${g.answer}`) })) }, `Grammar focus: ${w.grammar}. Choose the best option.`);
      add({ kind: 'order', items: orderItems(w.advanced, band.id === 'key' ? 2 : 3) }, 'Rebuild each sentence in the correct order.');
      add({ kind: 'echo', items: w.advanced.slice(0, 2).map((t) => ({ text: L(t), emoji: '' })) }, 'Pronunciation: listen, then read the sentence aloud with natural rhythm.');
      add(storyFor(w, band, accent), 'Read the text. Think about detail and meaning.', 'reading');
      add({ kind: 'talk', scenario: L(w.talk), opener: L(w.talk), goals: band.id === 'key' ? ['Use full sentences', 'Ask and answer questions'] : ['Give reasons for your opinions', 'Use the grammar of the week', 'Keep the conversation going'] }, 'Talk Time. Speak or type; I’ll respond like a real conversation partner and give feedback at the end.');
      add({ kind: 'write', prompt: L(w.write), minWords: lo, maxWords: hi, criteria: band.id === 'key' ? ['Answers every part of the task', 'Clear, simple sentences', 'Correct spelling and punctuation'] : ['Content: answers the task fully', 'Organisation: clear paragraphs and linking', 'Language: range and accuracy of grammar and vocabulary', 'Communicative achievement: right tone for the reader'] }, `Writing task (${lo}–${hi} words). I’ll check it against Cambridge-style criteria.`, 'writing');
    }
  }
  return out;
}

/** Number of course activities in every unit for a band (for progress bars). */
export const unitSize = (bandId: EslBandId) => buildUnit(1, bandId, 'gb').length;

// ── Words Zuva may never use in a game ───────────────────────────────────────

/**
 * A short blocklist that is checked on every word of a generated game and every story, in addition
 * to the moderation model. Kept deliberately broad (whole words only).
 */
const BLOCK = ['damn', 'hell', 'crap', 'shit', 'fuck', 'bitch', 'bastard', 'arse', 'ass', 'piss', 'dick', 'cock', 'pussy', 'slut', 'whore', 'sex', 'sexy', 'nude', 'naked', 'porn', 'kill', 'killed', 'murder', 'gun', 'guns', 'knife', 'blood', 'bloody', 'dead', 'die', 'suicide', 'drug', 'drugs', 'beer', 'wine', 'alcohol', 'cigarette', 'smoke', 'gamble', 'stupid', 'idiot', 'dumb', 'ugly', 'fat', 'retard', 'hate', 'nigger', 'nigga', 'kaffir', 'coon', 'monkey-face', 'savage', 'tribe-war', 'witch', 'devil', 'satan'];
const BLOCK_RE = new RegExp(`\\b(${BLOCK.map((w) => w.replace(/[-]/g, '\\-')).join('|')})\\b`, 'i');
/** Safe words that contain a blocked word inside (Scunthorpe problem) are fine because we match whole words. */
export const hasBlockedWord = (s: string) => BLOCK_RE.test(s);

/** Every learner-facing string inside an activity, for safety checks. */
export function activityText(a: ActivityBody): string {
  return JSON.stringify(a).replace(/"(kind|items|word|emoji|options|sounds|letters|answer|text|sentence|words|title|paragraphs|questions|q|label|source|url|licence|scenario|opener|goals|prompt|minWords|maxWords|criteria)":/g, ' ');
}

/** What the learner model has worked out about a learner (see worker/esl/model.ts). */
export interface Patterns {
  overall: { attempts: number; accuracy: number | null; lastActive: string | null; trend: 'up' | 'down' | 'steady' | 'new' };
  skills: { area: string; mastery: number; attempts: number }[];
  struggles: { what: string; why: string }[];
  strengths: { what: string; why: string }[];
  slow: { kind: string; title: string; avgSeconds: number }[];
  fast: { kind: string; title: string; avgSeconds: number }[];
  enjoys: { kind: string; title: string; why: string }[];
  avoids: { kind: string; title: string; why: string }[];
  dueWords: string[];
  trickyWords: string[];
}

export { ESL_BANDS, ESL_WEEKS };
