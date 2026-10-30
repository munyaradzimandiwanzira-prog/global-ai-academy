/**
 * /api/zuva — the Zuva tutor agent.
 *   POST /chat           stream a reply (NDJSON events)
 *   POST /transcribe     speech → text for dictation (audio is never stored)
 *   GET  /me             profile + memories (what Zuva knows)
 *   PATCH /settings      switch memory on/off
 *   DELETE /memories/:id, DELETE /memories   forget one / everything
 *   GET /threads, GET /threads/:id, DELETE /threads/:id
 */
import { createRouter, body, requireUser, requirePermission, clientKey } from '../app';
import { zuvaChatSchema, zuvaSettingsSchema } from '@shared/schemas';
import { consumeAiQuota } from '../lib/ai-quota';
import { hit } from '../lib/ratelimit';
import { badRequest, notFound } from '../lib/errors';
import { audit } from '../lib/db';
import { transcribe } from '../lib/openai';
import { zuvaStream } from '../zuva/agent';
import { listMemories } from '../zuva/memory';
import { loadProfile, saveProfile } from '../zuva/profile';

const zuva = createRouter();

zuva.post('/chat', async (c) => {
  const input = await body(c, zuvaChatSchema);
  // The grown-up lesson tutor stays a Plus feature; Zuva in the Kids Zone is open to every child.
  if (input.mode === 'learner') requirePermission(c, 'ai.tutor', 'Chatting with Professor Zuva in lessons is part of Plus. Coach hints on challenges stay free.');
  const user = c.get('user');
  await hit(c.env.DB, `zuva:burst:${user?.id ?? clientKey(c)}`, 8, 60, 'Slow down a little! Wait a minute, then ask again.');
  const quota = await consumeAiQuota(c);
  return zuvaStream(c, input, quota);
});

const AUDIO_TYPES = /^audio\/(webm|ogg|mp4|mpeg|mp3|wav|x-wav|m4a|x-m4a|aac)(;.*)?$/;
const MAX_AUDIO = 4 * 1024 * 1024; // ~4 minutes of compressed speech; dictation clips are usually 5–30 s

zuva.post('/transcribe', async (c) => {
  const user = c.get('user');
  await hit(c.env.DB, `zuva:stt:${user?.id ?? clientKey(c)}`, user ? 60 : 15, 3600, 'That’s a lot of talking this hour! Try typing for a while.');
  const form = await c.req.formData().catch(() => null);
  const file = form?.get('audio');
  if (!(file instanceof File)) throw badRequest('Send the recording as "audio".');
  if (file.size > MAX_AUDIO) throw badRequest('That recording is too long. Keep it under a minute.');
  if (file.size < 800) throw badRequest('I didn’t hear anything. Hold the button and speak.');
  if (!AUDIO_TYPES.test(file.type)) throw badRequest('Unsupported audio format.');
  const ext = file.type.includes('mp4') || file.type.includes('m4a') ? 'm4a' : file.type.includes('ogg') ? 'ogg' : file.type.includes('wav') ? 'wav' : file.type.includes('mpeg') || file.type.includes('mp3') ? 'mp3' : 'webm';
  // A short vocabulary prompt helps with names and code words learners use a lot.
  const text = await transcribe(c.env, file, `speech.${ext}`, 'Zuva, Python, JavaScript, Linux, robot, binary, Harare, Bulawayo, Mhoro, Kids Zone.');
  return c.json({ text: text.slice(0, 2000) });
});

zuva.get('/me', async (c) => {
  const user = requireUser(c);
  const [profile, memories] = await Promise.all([loadProfile(c.env.DB, user.id), listMemories(c.env.DB, user.id)]);
  return c.json({ profile, memories });
});

zuva.patch('/settings', async (c) => {
  const user = requireUser(c);
  const { memoryEnabled } = await body(c, zuvaSettingsSchema);
  await saveProfile(c.env.DB, user.id, { memoryEnabled });
  if (!memoryEnabled) await c.env.DB.prepare('DELETE FROM zuva_memories WHERE user_id = ?').bind(user.id).run();
  await audit(c.env.DB, user.id, memoryEnabled ? 'zuva.memory_on' : 'zuva.memory_off', user.id);
  return c.json({ profile: await loadProfile(c.env.DB, user.id) });
});

zuva.delete('/memories/:id', async (c) => {
  const user = requireUser(c);
  const r = await c.env.DB.prepare('DELETE FROM zuva_memories WHERE id = ? AND user_id = ?').bind(c.req.param('id'), user.id).run();
  if (!r.meta.changes) throw notFound('That memory was already gone.');
  return c.json({ ok: true });
});

zuva.delete('/memories', async (c) => {
  const user = requireUser(c);
  await c.env.DB.batch([
    c.env.DB.prepare('DELETE FROM zuva_memories WHERE user_id = ?').bind(user.id),
    c.env.DB.prepare("UPDATE zuva_profiles SET interests = '[]', goals = '[]', learning_style = NULL WHERE user_id = ?").bind(user.id),
    c.env.DB.prepare('DELETE FROM zuva_threads WHERE user_id = ?').bind(user.id),
  ]);
  await audit(c.env.DB, user.id, 'zuva.forget_all', user.id);
  return c.json({ ok: true });
});

zuva.get('/threads', async (c) => {
  const user = requireUser(c);
  const rows = await c.env.DB.prepare('SELECT id, mode, title, message_count, updated_at FROM zuva_threads WHERE user_id = ? ORDER BY updated_at DESC LIMIT 20').bind(user.id).all();
  return c.json({ threads: rows.results });
});

zuva.get('/threads/:id', async (c) => {
  const user = requireUser(c);
  const t = await c.env.DB.prepare('SELECT id, mode, title FROM zuva_threads WHERE id = ? AND user_id = ?').bind(c.req.param('id'), user.id).first();
  if (!t) throw notFound('Conversation not found.');
  const rows = await c.env.DB.prepare('SELECT role, content, created_at FROM zuva_messages WHERE thread_id = ? ORDER BY id DESC LIMIT 40').bind(c.req.param('id')).all();
  return c.json({ thread: t, messages: rows.results.reverse() });
});

zuva.delete('/threads/:id', async (c) => {
  const user = requireUser(c);
  await c.env.DB.prepare('DELETE FROM zuva_threads WHERE id = ? AND user_id = ?').bind(c.req.param('id'), user.id).run();
  return c.json({ ok: true });
});

export default zuva;
