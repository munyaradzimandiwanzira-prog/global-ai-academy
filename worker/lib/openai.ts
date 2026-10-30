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
