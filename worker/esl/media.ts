/**
 * Zuva's voice and the picture cards, generated once and kept in D1 (media_cache).
 *
 * Safety and cost:
 *  - Speech: at most 300 characters, moderated and checked against the word filter; only the
 *    course's own text or text Zuva wrote reaches it (never raw learner input).
 *  - Pictures: only for words in the course or in a game Zuva made for a learner that passed the
 *    checks; the prompt is fixed (friendly flat illustration, no text, no real people) and only
 *    the word changes. A daily cap bounds spend on new clips and pictures; cached ones are free.
 */
import { ESL_WEEKS, RHYMES, hasBlockedWord, type Accent, type EslTier } from '@shared/esl';
import { moderate, picture, speech } from '../lib/openai';
import { sha256Hex } from '../lib/crypto';
import { hit } from '../lib/ratelimit';
import { nowIso } from '../lib/db';
import { badRequest } from '../lib/errors';

const DAY = 86_400;
export const MAX_TTS = 300;

export async function cached(db: D1Database, key: string): Promise<{ mime: string; bytes: ArrayBuffer } | null> {
  const row = await db.prepare('SELECT mime, bytes FROM media_cache WHERE key = ?').bind(key).first<{ mime: string; bytes: ArrayBuffer | number[] }>();
  if (!row) return null;
  void db.prepare('UPDATE media_cache SET hits = hits + 1, last_hit_at = ? WHERE key = ?').bind(nowIso(), key).run().catch(() => {});
  const bytes = row.bytes instanceof ArrayBuffer ? row.bytes : new Uint8Array(row.bytes).buffer;
  return { mime: row.mime, bytes };
}

export async function store(db: D1Database, key: string, kind: 'tts' | 'image' | 'text', mime: string, bytes: ArrayBuffer | Uint8Array) {
  const buf = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  // D1 rows top out at 2 MB; anything bigger is served once and not kept.
  if (buf.byteLength > 1_900_000) return;
  await db.prepare('INSERT OR IGNORE INTO media_cache (key, kind, mime, bytes, size) VALUES (?, ?, ?, ?, ?)').bind(key, kind, mime, buf, buf.byteLength).run();
}

// ── Voice ──────────────────────────────────────────────────────────────────

const ACCENTS: Record<Accent, string> = {
  gb: 'Speak with a warm, clear standard British English accent (Received Pronunciation, as used by teachers and the BBC).',
  us: 'Speak with a warm, clear General American English accent.',
};
const PACE: Record<EslTier | 'word', string> = {
  early: 'You are a gentle, joyful early-years teacher talking to a toddler. Speak slowly, with a bright, sing-song, smiling voice and little pauses between phrases. Over-articulate each word so a small child can copy it.',
  primary: 'You are a friendly, encouraging primary school teacher. Speak clearly at a slightly slower than normal pace.',
  secondary: 'You are a supportive English teacher for teenagers and young adults. Speak naturally and clearly, at a normal pace, with natural rhythm and intonation.',
  word: 'Say this single word or short phrase very clearly, once, as a teacher modelling pronunciation for a learner, with a tiny pause before it.',
};

export type VoiceLang = 'en' | 'pt-MZ';
const PT_VOICE = 'Speak in clear, warm European Portuguese as spoken by a teacher in Mozambique (Maputo): standard pronunciation, never Brazilian.';

export async function ttsKey(text: string, accent: Accent, pace: EslTier | 'word', env: Env, lang: VoiceLang = 'en') {
  // English keys keep their old shape so clips already made stay cached.
  const parts = [env.ESL_TTS_MODEL || 'gpt-4o-mini-tts', env.ESL_TTS_VOICE || 'coral', lang === 'en' ? accent : lang, pace, text];
  return `tts:${await sha256Hex(parts.join('|'))}`;
}

export async function tts(env: Env, text: string, accent: Accent, pace: EslTier | 'word', lang: VoiceLang = 'en'): Promise<{ mime: string; bytes: ArrayBuffer; cached: boolean }> {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (!clean || clean.length > MAX_TTS) throw badRequest(`Say up to ${MAX_TTS} characters at a time.`);
  if (hasBlockedWord(clean)) throw badRequest('Zuva won’t say that.');
  const key = await ttsKey(clean, accent, pace, env, lang);
  const hitC = await cached(env.DB, key);
  if (hitC) return { ...hitC, cached: true };
  await hit(env.DB, 'esl:tts:global', Number(env.ESL_TTS_DAILY_LIMIT) || 3000, DAY, 'Zuva’s voice is resting for today. Your device will read it instead.');
  const m = await moderate(env, clean);
  if (m?.flagged) throw badRequest('Zuva won’t say that.');
  const bytes = await speech(env, { text: clean, voice: env.ESL_TTS_VOICE || 'coral', instructions: `${lang === 'pt-MZ' ? PT_VOICE : ACCENTS[accent]} ${PACE[pace]} Never add words of your own${lang === 'pt-MZ' ? ' and never translate: read the text exactly as written' : ''}.` });
  await store(env.DB, key, 'tts', 'audio/mpeg', bytes);
  return { mime: 'audio/mpeg', bytes, cached: false };
}

// ── Pictures ───────────────────────────────────────────────────────────────

/** Every picture word in the course (both spellings are the same picture). */
export const COURSE_WORDS = new Set([...ESL_WEEKS.flatMap((w) => w.words.map(([x]) => x)), ...RHYMES.flat().map(([x]) => x)]);

export const pictureWord = (w: string) => w.toLowerCase().replace(/[^a-z' -]/g, '').trim().slice(0, 32);

export function picturePrompt(word: string): string {
  return [
    `A single, simple picture-dictionary illustration for young children learning English, showing: "${word}".`,
    'Friendly, colourful, flat vector style with soft rounded shapes and a plain light cream background, centred, easy to recognise at small size.',
    'Absolutely no text, letters, numbers or labels anywhere in the image (unless the word itself is a number, then show that many objects).',
    'No logos, brands, real people or famous characters. Nothing scary, violent or unsafe.',
    'If people appear, show cheerful cartoon children or adults with dark brown skin in a warm southern African setting.',
  ].join(' ');
}

export async function isPictureAllowed(db: D1Database, word: string, userId?: string | null): Promise<boolean> {
  if (COURSE_WORDS.has(word)) return true;
  if (!userId) return false;
  // A word from a game Zuva made for this learner (those passed the safety checks when created).
  const row = await db.prepare(`SELECT 1 FROM esl_generated WHERE user_id = ? AND instr(lower(spec), ?) > 0 LIMIT 1`).bind(userId, `"${word}"`).first();
  return !!row;
}

export async function image(env: Env, rawWord: string, userId?: string | null): Promise<{ mime: string; bytes: ArrayBuffer; cached: boolean }> {
  const word = pictureWord(rawWord);
  if (!word) throw badRequest('Which word?');
  const key = `img:${env.ESL_IMAGE_MODEL || 'gpt-image-2'}:${word}`;
  const c = await cached(env.DB, key);
  if (c) return { ...c, cached: true };
  if (hasBlockedWord(word) || !(await isPictureAllowed(env.DB, word, userId))) throw badRequest('There is no picture for that word.');
  await hit(env.DB, 'esl:img:global', Number(env.ESL_IMAGE_DAILY_LIMIT) || 150, DAY, 'New pictures are resting for today.');
  if (userId) await hit(env.DB, `esl:img:${userId}`, 30, DAY, 'That’s plenty of new pictures for today.');
  const m = await moderate(env, word);
  if (m?.flagged) throw badRequest('There is no picture for that word.');
  const out = await picture(env, picturePrompt(word));
  await store(env.DB, key, 'image', out.mime, out.bytes);
  return { mime: out.mime, bytes: out.bytes.buffer as ArrayBuffer, cached: false };
}
