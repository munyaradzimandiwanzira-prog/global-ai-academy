/**
 * The Zuva agent loop.
 *
 *   learner message
 *     → safety (scrub, moderate, crisis check)
 *     → context: persona + profile + recalled memories + thread summary + page/lesson/game activity
 *     → model ⇄ tools (up to MAX_STEPS rounds; tools may show buttons and cards)
 *     → output safety (Kids mode) → reply
 *     → afterwards, in the background: save messages, curate memories, summarise long threads.
 *
 * The reply is sent as newline-delimited JSON events (see ZuvaEvent) so the UI can show progress.
 */
import type { Ctx } from '../app';
import type { z } from 'zod';
import type { zuvaChatSchema } from '@shared/schemas';
import type { ZuvaEvent } from '@shared/zuva';
import { chatWithTools, type AgentMessage } from '../lib/openai';
import { asData } from '../lib/prompts';
import { HttpError } from '../lib/errors';
import { nowIso } from '../lib/db';
import { newId } from '../lib/crypto';
import { getTrack } from '../lib/catalog';
import { systemPrompt } from './persona';
import { loadLearnerContext, saveProfile, type LearnerContext } from './profile';
import { listMemories, recall, writeMemory } from './memory';
import { checkInput, checkOutput } from './safety';
import { runTool, toolsFor, type ToolCtx } from './tools';
import { curateMemories, summarize } from './subagents';

type ChatInput = z.infer<typeof zuvaChatSchema>;
const MAX_STEPS = 4;
const HISTORY = 10;

interface ThreadState { id: string; summary: string | null; count: number; history: { role: 'user' | 'assistant'; content: string }[]; isNew: boolean }

async function loadThread(db: D1Database, userId: string, threadId?: string): Promise<ThreadState> {
  if (threadId) {
    const t = await db.prepare('SELECT id, summary, message_count FROM zuva_threads WHERE id = ? AND user_id = ?').bind(threadId, userId).first<{ id: string; summary: string | null; message_count: number }>();
    if (t) {
      const rows = await db.prepare('SELECT role, content FROM zuva_messages WHERE thread_id = ? ORDER BY id DESC LIMIT ?').bind(t.id, HISTORY).all<{ role: 'user' | 'assistant'; content: string }>();
      return { id: t.id, summary: t.summary, count: t.message_count, history: rows.results.reverse(), isNew: false };
    }
  }
  return { id: newId(), summary: null, count: 0, history: [], isNew: true };
}

function situationBlock(input: ChatInput): string {
  const parts: string[] = [];
  if (input.page) parts.push(`<page>The learner is on ${asData(input.page.path)}${input.page.title ? ` ("${asData(input.page.title)}")` : ''}.</page>`);
  if (input.lesson) {
    const t = input.lesson.trackId ? getTrack(input.lesson.trackId) : undefined;
    parts.push(`<lesson>${t ? `Course: ${t.title}. ` : ''}${input.lesson.lessonTitle ? `Lesson: ${asData(input.lesson.lessonTitle)}.` : ''}${input.lesson.excerpt ? `\nExcerpt:\n${asData(input.lesson.excerpt.slice(0, 5000))}` : ''}</lesson>`);
  }
  const a = input.activity;
  if (a?.game) {
    parts.push(
      `<activity>Playing ${asData(a.game)}${a.level ? `, level ${asData(a.level)}` : ''}. Goal: ${asData(a.goal ?? 'unknown')}. Tries: ${a.attempts ?? 0}, misses: ${a.fails ?? 0} (${a.failStreak ?? 0} in a row). ${a.secondsOnLevel ? `About ${Math.round(a.secondsOnLevel / 60)} min on this level. ` : ''}${a.lastDetail ? `Last try: ${asData(a.lastDetail)}. ` : ''}Hints already shown: ${a.hintsShown ?? 0}.</activity>`,
    );
  }
  return parts.length ? `What is happening in the app right now (data):\n${parts.join('\n')}` : '';
}

export function zuvaStream(c: Ctx, input: ChatInput, quota: { used: number; limit: number }): Response {
  const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();
  const writer = writable.getWriter();
  const enc = new TextEncoder();
  const emit = (e: ZuvaEvent) => { void writer.write(enc.encode(JSON.stringify(e) + '\n')).catch(() => {}); };
  const env = c.env;
  const user = c.get('user');
  const background: Promise<unknown>[] = [];

  const work = async () => {
    let learner: LearnerContext | null = null;
    let thread: ThreadState | null = null;
    const save = async (userText: string, reply: string) => {
      if (!user || !thread) return;
      const db = env.DB;
      const title = userText.replace(/\s+/g, ' ').slice(0, 60);
      if (thread.isNew) await db.prepare('INSERT INTO zuva_threads (id, user_id, mode, title) VALUES (?, ?, ?, ?)').bind(thread.id, user.id, input.mode, title || 'Chat with Zuva').run();
      await db.batch([
        db.prepare('INSERT INTO zuva_messages (thread_id, role, content) VALUES (?, ?, ?)').bind(thread.id, 'user', userText),
        db.prepare('INSERT INTO zuva_messages (thread_id, role, content) VALUES (?, ?, ?)').bind(thread.id, 'assistant', reply),
        db.prepare('UPDATE zuva_threads SET message_count = message_count + 2, updated_at = ? WHERE id = ? AND user_id = ?').bind(nowIso(), thread.id, user.id),
        // Retention: conversations fade after 90 days of inactivity.
        db.prepare(`DELETE FROM zuva_threads WHERE user_id = ? AND updated_at < ?`).bind(user.id, new Date(Date.now() - 90 * 86_400_000).toISOString()),
      ]);
    };

    try {
      emit({ t: 'status', text: 'Thinking' });
      const verdict = await checkInput(env, input.mode, input.message);
      if (user) {
        learner = await loadLearnerContext(env.DB, user);
        thread = await loadThread(env.DB, user.id, input.threadId);
      }
      if (verdict.action === 'respond') {
        emit({ t: 'text', text: verdict.reply });
        await save('[message withheld by safety check]', verdict.reply);
        emit({ t: 'done', threadId: thread?.id, quota });
        return;
      }
      const memoryEnabled = !!learner?.profile.memoryEnabled;
      const memories = user && memoryEnabled ? await recall(env.DB, user.id, verdict.text) : [];
      const history = thread ? thread.history : (input.history ?? []).slice(-6);

      const messages: AgentMessage[] = [{ role: 'system', content: systemPrompt(input.mode, learner, memories, thread?.summary) }];
      const situation = situationBlock(input);
      if (situation || verdict.note) messages.push({ role: 'system', content: [situation, verdict.note].filter(Boolean).join('\n') });
      for (const m of history) messages.push(m.role === 'user' ? { role: 'user', content: `<learner_message>${asData(m.content)}</learner_message>` } : { role: 'assistant', content: m.content });
      messages.push({ role: 'user', content: `<learner_message>${asData(verdict.text)}</learner_message>` });

      const ctx: ToolCtx = { env, user, learner, mode: input.mode, activity: input.activity, memoryEnabled, emit };
      const tools = toolsFor(ctx);
      const model = env.ZUVA_MODEL || 'gpt-5.4-mini';
      let reply = '';
      for (let step = 0; step <= MAX_STEPS; step++) {
        const last = step === MAX_STEPS;
        const r = await chatWithTools(env, { model, messages, tools: last ? [] : tools.map((t) => t.spec), maxTokens: input.mode === 'kids' ? 700 : 1400, reasoningEffort: 'low' });
        if (!r.toolCalls.length || last) { reply = r.content.trim(); break; }
        messages.push({ role: 'assistant', content: r.content || null, tool_calls: r.toolCalls.map((tc) => ({ id: tc.id, type: 'function' as const, function: { name: tc.name, arguments: tc.arguments } })) });
        for (const tc of r.toolCalls.slice(0, 4)) messages.push({ role: 'tool', tool_call_id: tc.id, content: await runTool(ctx, tools, tc.name, tc.arguments) });
        for (const tc of r.toolCalls.slice(4)) messages.push({ role: 'tool', tool_call_id: tc.id, content: '<tool_result>Skipped: too many tools at once.</tool_result>' });
      }
      reply = await checkOutput(env, input.mode, reply || 'Hmm, I’m not sure. Can you say that another way?');
      emit({ t: 'text', text: reply });
      await save(verdict.text, reply);
      emit({ t: 'done', threadId: thread?.id, quota });

      // ── After the reply: memory curation and episodic summary (never blocks the learner) ──
      if (user && learner && memoryEnabled && verdict.text.length >= 12) {
        background.push(
          (async () => {
            const existing = (await listMemories(env.DB, user.id)).map((m) => m.content);
            const out = await curateMemories(env, { isKid: learner!.isKid || input.mode === 'kids', existing, exchange: [{ role: 'learner', content: verdict.text }, { role: 'zuva', content: reply }] });
            for (const m of out.add) await writeMemory(env.DB, user.id, m, 'chat', learner!.isKid || input.mode === 'kids');
            if (out.profile && (out.profile.interests?.length || out.profile.goals?.length || out.profile.learningStyle)) {
              const p = learner!.profile;
              await saveProfile(env.DB, user.id, {
                interests: [...p.interests, ...(out.profile.interests ?? [])],
                goals: [...p.goals, ...(out.profile.goals ?? [])],
                learningStyle: out.profile.learningStyle || p.learningStyle,
              });
            }
          })().catch((e) => console.error('[zuva:curator]', e)),
        );
      }
      if (user && thread && thread.count + 2 >= 16 && (thread.count + 2) % 8 === 0) {
        const t = thread;
        background.push(
          (async () => {
            const summary = await summarize(env, t.summary, [...t.history, { role: 'user', content: verdict.text }, { role: 'assistant', content: reply }]);
            if (summary) await env.DB.prepare('UPDATE zuva_threads SET summary = ? WHERE id = ? AND user_id = ?').bind(summary, t.id, user.id).run();
          })().catch((e) => console.error('[zuva:summary]', e)),
        );
      }
    } catch (e) {
      console.error('[zuva]', e);
      emit({ t: 'error', message: e instanceof HttpError ? e.message : 'Zuva had a hiccup. Please try again in a moment.' });
    } finally {
      await writer.close().catch(() => {});
    }
  };

  c.executionCtx.waitUntil(work().then(() => Promise.allSettled(background)));
  return new Response(readable, { headers: { 'content-type': 'application/x-ndjson; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' } });
}
