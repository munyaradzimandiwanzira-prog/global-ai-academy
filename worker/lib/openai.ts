import { unavailable } from './errors';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatOptions {
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  json?: boolean;
  /** Reasoning models only. Defaults to 'low': hints and short tasks need speed more than depth. */
  reasoningEffort?: 'none' | 'low' | 'medium' | 'high';
}

/** OPENAI_BASE_URL lets tests point at a local mock; production uses the real API. */
const base = (env: Env) => (env.OPENAI_BASE_URL || 'https://api.openai.com').replace(/\/$/, '');

function requireKey(env: Env): string {
  if (!env.OPENAI_API_KEY) throw unavailable('AI features are not configured yet. Ask an administrator to add the OpenAI key.');
  return env.OPENAI_API_KEY;
}

/** Reasoning-era models (gpt-5.x, o-series) take max_completion_tokens and reject a custom temperature. */
export const isReasoningModel = (model: string) => /^(gpt-5|gpt-6|o\d)/.test(model);

/** Room for hidden reasoning tokens on top of the visible answer (billed only if used). */
const REASONING_HEADROOM = 1200;

function sizing(model: string, maxTokens: number, temperature?: number, effort: ChatOptions['reasoningEffort'] = 'low') {
  return isReasoningModel(model)
    ? { max_completion_tokens: maxTokens + (effort === 'none' ? 0 : REASONING_HEADROOM), reasoning_effort: effort }
    : { max_tokens: maxTokens, temperature: temperature ?? 0.4 };
}

function payload(env: Env, opts: ChatOptions & { model?: string }, stream: boolean) {
  const model = opts.model || env.OPENAI_MODEL || 'gpt-5.4-mini';
  return JSON.stringify({
    model,
    messages: opts.messages,
    ...sizing(model, opts.maxTokens ?? 700, opts.temperature, opts.reasoningEffort),
    stream,
    ...(opts.json ? { response_format: { type: 'json_object' } } : {}),
  });
}

async function post(env: Env, body: string, url = `${base(env)}/v1/chat/completions`): Promise<Response> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { authorization: `Bearer ${requireKey(env)}`, 'content-type': 'application/json' },
    body,
  });
  if (!res.ok) {
    const detail = await res.text();
    console.error('[openai]', res.status, detail.slice(0, 500));
    if (res.status === 429) throw unavailable('The AI coach is busy right now. Try again in a minute.');
    throw unavailable('The AI coach could not answer right now. Try again shortly.');
  }
  return res;
}

export async function chat(env: Env, opts: ChatOptions & { model?: string }): Promise<string> {
  const res = await post(env, payload(env, opts, false));
  const data = (await res.json()) as { choices: { message: { content: string } }[] };
  return data.choices[0]?.message?.content ?? '';
}

export async function chatJson<T>(env: Env, opts: ChatOptions & { model?: string }): Promise<T> {
  const text = await chat(env, { ...opts, json: true });
  try {
    return JSON.parse(text) as T;
  } catch {
    throw unavailable('The AI returned an unexpected answer. Try again.');
  }
}

/** Streams plain-text deltas (OpenAI SSE → text/plain chunks) so the UI can render as it arrives. */
export async function chatStream(env: Env, opts: ChatOptions): Promise<ReadableStream<Uint8Array>> {
  const res = await post(env, payload(env, opts, true));
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = '';
  return res.body!.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        buffer += decoder.decode(chunk, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data:')) continue;
          const data = trimmed.slice(5).trim();
          if (data === '[DONE]') return;
          try {
            const delta = (JSON.parse(data) as { choices: { delta?: { content?: string } }[] }).choices[0]?.delta?.content;
            if (delta) controller.enqueue(encoder.encode(delta));
          } catch {
            /* ignore keep-alive / partial frames */
          }
        }
      },
    }),
  );
}

// ── Tool calling (the Zuva agent) ────────────────────────────────────────────
//
// Uses the Responses API, which (unlike Chat Completions) lets GPT-5.x reason while calling tools.
// Stateless: store=false, and the encrypted reasoning comes back in `items` so the next round can
// continue the same line of thought without OpenAI keeping the conversation.

export interface ToolSpec { name: string; description: string; parameters: Record<string, unknown> }
export interface ToolCall { id: string; name: string; arguments: string }
/** An opaque item returned by the model (reasoning, function call or message), passed back verbatim. */
export interface ModelItem { type: string; [k: string]: unknown }
export type AgentMessage =
  | { role: 'system' | 'user' | 'assistant'; content: string }
  | { type: 'function_call_output'; call_id: string; output: string }
  | ModelItem;
export type ReasoningEffort = 'none' | 'low' | 'medium' | 'high';

interface ResponsesOutput {
  status?: string;
  incomplete_details?: { reason?: string } | null;
  output?: (ModelItem & { call_id?: string; name?: string; arguments?: string; content?: { type: string; text?: string }[] })[];
  usage?: { input_tokens: number; output_tokens: number };
}

/** One model turn with tools available. Returns text, tool calls, and the raw items to carry forward. */
export async function chatWithTools(
  env: Env,
  opts: { model: string; messages: AgentMessage[]; tools: ToolSpec[]; maxTokens?: number; reasoningEffort?: ReasoningEffort },
): Promise<{ content: string; toolCalls: ToolCall[]; items: ModelItem[]; usage?: { input_tokens: number; output_tokens: number } }> {
  const reasoning = isReasoningModel(opts.model);
  const body = JSON.stringify({
    model: opts.model,
    input: opts.messages.map((m) => ('role' in m && m.role === 'system' ? { ...m, role: 'developer' } : m)),
    ...(opts.tools.length ? { tools: opts.tools.map((t) => ({ type: 'function', ...t, strict: false })), tool_choice: 'auto', parallel_tool_calls: true } : {}),
    max_output_tokens: opts.maxTokens ?? 1500,
    ...(reasoning ? { reasoning: { effort: opts.reasoningEffort ?? 'low' }, include: ['reasoning.encrypted_content'] } : { temperature: 0.5 }),
    store: false,
  });
  const res = await post(env, body, `${base(env)}/v1/responses`);
  const data = (await res.json()) as ResponsesOutput;
  if (data.status === 'incomplete') console.warn('[openai] incomplete response:', data.incomplete_details?.reason);
  const items = data.output ?? [];
  const content = items
    .filter((i) => i.type === 'message')
    .flatMap((i) => i.content ?? [])
    .filter((c) => c.type === 'output_text')
    .map((c) => c.text ?? '')
    .join('');
  const toolCalls = items
    .filter((i) => i.type === 'function_call')
    .map((i) => ({ id: String(i.call_id), name: String(i.name), arguments: String(i.arguments ?? '{}') }));
  return { content, toolCalls, items, usage: data.usage };
}

// ── Safety: moderation ───────────────────────────────────────────────────────

export interface ModerationResult { flagged: boolean; categories: string[] }

/** OpenAI moderation (free). Returns null when it can't be reached, so callers decide how to fail. */
export async function moderate(env: Env, input: string): Promise<ModerationResult | null> {
  if (!env.OPENAI_API_KEY) return null;
  try {
    const res = await fetch(`${base(env)}/v1/moderations`, {
      method: 'POST',
      headers: { authorization: `Bearer ${env.OPENAI_API_KEY}`, 'content-type': 'application/json' },
      body: JSON.stringify({ model: 'omni-moderation-latest', input: input.slice(0, 8000) }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { results: { flagged: boolean; categories: Record<string, boolean> }[] };
    const r = data.results[0];
    return r ? { flagged: r.flagged, categories: Object.entries(r.categories).filter(([, v]) => v).map(([k]) => k) } : null;
  } catch {
    return null;
  }
}

// ── Speech to text (dictation) ───────────────────────────────────────────────

export async function transcribe(env: Env, audio: Blob, filename: string, prompt?: string): Promise<string> {
  const form = new FormData();
  form.append('file', audio, filename);
  form.append('model', env.ZUVA_TRANSCRIBE_MODEL || 'gpt-transcribe');
  form.append('response_format', 'json');
  if (prompt) form.append('prompt', prompt);
  const res = await fetch(`${base(env)}/v1/audio/transcriptions`, {
    method: 'POST',
    headers: { authorization: `Bearer ${requireKey(env)}` },
    body: form,
  });
  if (!res.ok) {
    console.error('[openai:transcribe]', res.status, (await res.text()).slice(0, 300));
    throw unavailable('Zuva could not hear that clearly. Try again, or type instead.');
  }
  const data = (await res.json()) as { text?: string };
  return (data.text ?? '').trim();
}

// ── Text to speech and pictures (English course) ─────────────────────────────

/**
 * Spoken audio for a short text. `instructions` steers accent, pace and warmth.
 * Note: OpenAI retires its speech-endpoint models (gpt-4o-mini-tts, tts-1) on 6 January 2027;
 * the model is a setting (ESL_TTS_MODEL) and every clip is cached, so the course keeps working and
 * the browser's own voice takes over for anything new until the voice is moved to a newer model.
 */
export async function speech(env: Env, opts: { text: string; voice: string; instructions: string }): Promise<ArrayBuffer> {
  const res = await fetch(`${base(env)}/v1/audio/speech`, {
    method: 'POST',
    headers: { authorization: `Bearer ${requireKey(env)}`, 'content-type': 'application/json' },
    body: JSON.stringify({ model: env.ESL_TTS_MODEL || 'gpt-4o-mini-tts', voice: opts.voice, input: opts.text, instructions: opts.instructions, response_format: 'mp3' }),
  });
  if (!res.ok) {
    console.error('[openai:speech]', res.status, (await res.text()).slice(0, 300));
    throw unavailable('Zuva’s voice is resting. Your device will read it instead.');
  }
  return res.arrayBuffer();
}

/** One picture-card image. Returns WebP (or PNG if the model does not offer WebP). */
export async function picture(env: Env, prompt: string): Promise<{ bytes: Uint8Array; mime: string }> {
  const call = async (format: 'webp' | 'png') => fetch(`${base(env)}/v1/images/generations`, {
    method: 'POST',
    headers: { authorization: `Bearer ${requireKey(env)}`, 'content-type': 'application/json' },
    body: JSON.stringify({ model: env.ESL_IMAGE_MODEL || 'gpt-image-2', prompt, size: '1024x1024', quality: 'low', n: 1, output_format: format, ...(format === 'webp' ? { output_compression: 70 } : {}), moderation: 'auto' }),
  });
  let res = await call('webp');
  let mime = 'image/webp';
  if (res.status === 400) { res = await call('png'); mime = 'image/png'; }
  if (!res.ok) {
    console.error('[openai:image]', res.status, (await res.text()).slice(0, 300));
    throw unavailable('Pictures are resting. Here is the emoji instead.');
  }
  const data = (await res.json()) as { data?: { b64_json?: string }[] };
  const b64 = data.data?.[0]?.b64_json;
  if (!b64) throw unavailable('No picture came back.');
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return { bytes, mime };
}
