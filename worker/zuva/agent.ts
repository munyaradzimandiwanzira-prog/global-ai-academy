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
import { stageOf } from '@shared/kids-curriculum';
import type { UserRow } from '../lib/db';
import type { TeacherContext } from './persona';
import { eslBand, hasBlockedWord } from '@shared/esl';
import { eslSystemPrompt } from '../esl/persona';
import { eslContextBlock, loadEslContext } from '../esl/context';
import type { EslSession } from '../esl/mcp';

type ChatInput = z.infer<typeof zuvaChatSchema>;
const MAX_STEPS = 4;
const HISTORY = 10;

interface ThreadState { id: string; summary: string | null; count: number; history: { role: 'user' | 'assistant'; content: string }[]; isNew: boolean }

async function loadThread(db: D1Database, userId: string, agent: string, threadId?: string): Promise<ThreadState> {
  if (threadId) {
    const t = await db.prepare('SELECT id, summary, message_count FROM zuva_threads WHERE id = ? AND user_id = ? AND agent = ?').bind(threadId, userId, agent).first<{ id: string; summary: string | null; message_count: number }>();
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
  const st = stageOf(input.stage);
  if (st) parts.push(`<stage>The child picked Cambridge ${st.name} (usually ages ${st.ages}, ${st.grade}). Pitch words, numbers and examples to that age, and suggest levels from that stage first.</stage>`);
  return parts.length ? `What is happening in the app right now (data):\n${parts.join('\n')}` : '';
}

/** What Zuva knows about a teacher in teacher mode: their classes and how many learners. */
async function loadTeacherContext(db: D1Database, user: UserRow): Promise<TeacherContext> {
  const [classes, students] = await Promise.all([
    db.prepare('SELECT c.name, c.level, (SELECT COUNT(*) FROM classroom_members m WHERE m.classroom_id = c.id) AS learners FROM classrooms c WHERE c.teacher_id = ? AND c.archived_at IS NULL ORDER BY c.created_at DESC LIMIT 12').bind(user.id).all<{ name: string; level: string; learners: number }>(),
    db.prepare(`SELECT COUNT(*) AS n FROM (SELECT student_id FROM teacher_students WHERE teacher_id = ?1 UNION SELECT m.user_id FROM classroom_members m JOIN classrooms c ON c.id = m.classroom_id WHERE c.teacher_id = ?1)`).bind(user.id).first<{ n: number }>(),
  ]);
  return { firstName: user.name.split(/\s+/)[0] ?? user.name, school: user.school, classes: classes.results, students: students?.n ?? 0 };
}

export function zuvaStream(c: Ctx, input: ChatInput, quota: { used: number; limit: number }): Response {
  const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();
  const writer = writable.getWriter();
  const enc = new TextEncoder();
  const emit = (e: ZuvaEvent) => { void writer.write(enc.encode(JSON.stringify(e) + '\n')).catch(() => {}); };
  const env = c.env;
  const user = c.get('user');
  const background: Promise<unknown>[] = [];
  const teacherMode = input.mode === 'teacher';
  const eslMode = input.mode === 'esl';
  const agentName = teacherMode ? 'teacher' : eslMode ? 'esl' : 'tutor';
  // English learners under 13 get the children's safety rules (input scrubbing, stricter moderation).
  const eslChild = eslMode && (eslBand(input.esl?.band)?.tier !== 'secondary');
  const safetyMode = eslMode ? (eslChild ? 'kids' : 'learner') : input.mode;
  const speakerTag = teacherMode ? 'teacher_message' : 'learner_message';

  const work = async () => {
    let learner: LearnerContext | null = null;
    let thread: ThreadState | null = null;
    const save = async (userText: string, reply: string) => {
      if (!user || !thread) return;
      const db = env.DB;
      const title = userText.replace(/\s+/g, ' ').slice(0, 60);
      // The mode column predates teacher mode; teacher threads are marked by the agent column.
      if (thread.isNew) await db.prepare('INSERT INTO zuva_threads (id, user_id, mode, title, agent) VALUES (?, ?, ?, ?, ?)').bind(thread.id, user.id, safetyMode === 'kids' ? 'kids' : 'learner', title || 'Chat with Zuva', agentName).run();
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
      const verdict = await checkInput(env, safetyMode, input.message);
      if (user) {
        learner = await loadLearnerContext(env.DB, user);
        thread = await loadThread(env.DB, user.id, agentName, input.threadId);
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

      const teacher = teacherMode && user ? await loadTeacherContext(env.DB, user) : null;
      const eslIn = input.esl ?? { week: 1, band: 'starters' as const, accent: 'gb' as const };
      const eslCtx = eslMode ? await loadEslContext(env.DB, user, eslIn) : null;
      const memoryText = memories.length ? `\n\nThings you remember about this learner (use naturally, don't recite):\n<memory>\n${memories.map((m) => `- ${asData(m)}`).join('\n')}\n</memory>` : '';
      const summaryText = thread?.summary ? `\n\nSummary of this conversation so far:\n<memory>\n${asData(thread.summary)}\n</memory>` : '';
      const messages: AgentMessage[] = [{
        role: 'system',
        content: eslCtx ? `${eslSystemPrompt(eslCtx.band, eslCtx.accent)}${memoryText}${summaryText}\n\nToday's date is ${new Date().toISOString().slice(0, 10)}.` : systemPrompt(input.mode, learner, memories, thread?.summary, teacher),
      }];
      if (eslCtx) messages.push({ role: 'system', content: `What you know right now (data):\n${eslContextBlock(eslCtx, { activityId: eslIn.activityId, kind: eslIn.kind, item: eslIn.item, heard: eslIn.heard, task: eslIn.task })}` });
      const situation = eslMode ? '' : situationBlock(input);
      if (situation || verdict.note) messages.push({ role: 'system', content: [situation, verdict.note].filter(Boolean).join('\n') });
      for (const m of history) messages.push(m.role === 'user' ? { role: 'user', content: `<${speakerTag}>${asData(m.content)}</${speakerTag}>` } : { role: 'assistant', content: m.content });
      messages.push({ role: 'user', content: `<${speakerTag}>${asData(verdict.text)}</${speakerTag}>` });

      const esl: EslSession | undefined = eslCtx ? { env, user, ctx: eslCtx, memoryEnabled, emit, tainted: false } : undefined;
      const ctx: ToolCtx = { env, user, learner, mode: input.mode, activity: input.activity, stage: stageOf(input.stage)?.id, memoryEnabled, emit, esl };
      const tools = toolsFor(ctx);
      const model = env.ZUVA_MODEL || 'gpt-5.5';
      // Children get quick, short answers; grown-up learners get deeper reasoning.
      const effort = input.mode === 'kids' || eslChild ? 'low' : 'medium';
      let reply = '';
      for (let step = 0; step <= MAX_STEPS; step++) {
        const last = step === MAX_STEPS;
        const r = await chatWithTools(env, { model, messages, tools: last ? [] : tools.map((t) => t.spec), maxTokens: input.mode === 'kids' || eslChild ? 2000 : 4000, reasoningEffort: effort });
        if (!r.toolCalls.length || last) { reply = r.content.trim(); break; }
        messages.push(...r.items);
        for (const tc of r.toolCalls.slice(0, 4)) messages.push({ type: 'function_call_output', call_id: tc.id, output: await runTool(ctx, tools, tc.name, tc.arguments) });
        for (const tc of r.toolCalls.slice(4)) messages.push({ type: 'function_call_output', call_id: tc.id, output: '<tool_result>Skipped: too many tools at once.</tool_result>' });
      }
      reply = await checkOutput(env, safetyMode, reply || 'Hmm, I’m not sure. Can you say that another way?');
      // Zuva never swears, whatever it was asked: a reply with a blocked word is replaced, not shown.
      if (eslMode && hasBlockedWord(reply)) reply = 'Let’s keep our words kind and friendly. Shall we play the next game?';
      emit({ t: 'text', text: reply });
      await save(verdict.text, reply);
      emit({ t: 'done', threadId: thread?.id, quota });

      // ── After the reply: memory curation and episodic summary (never blocks the learner) ──
      // Teacher chats are about learners, so nothing is curated into memory automatically there.
      // A turn that read web content is never mined for memories (a story could carry planted "facts").
      if (user && learner && memoryEnabled && !teacherMode && !esl?.tainted && verdict.text.length >= 12) {
        background.push(
          (async () => {
            const existing = (await listMemories(env.DB, user.id)).map((m) => m.content);
            const out = await curateMemories(env, { isKid: learner!.isKid || input.mode === 'kids' || eslChild, existing, exchange: [{ role: 'learner', content: verdict.text }, { role: 'zuva', content: reply }] });
            for (const m of out.add) await writeMemory(env.DB, user.id, m, 'chat', learner!.isKid || input.mode === 'kids' || eslChild);
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
