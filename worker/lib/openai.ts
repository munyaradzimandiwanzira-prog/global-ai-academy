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
}

/** OPENAI_BASE_URL lets tests point at a local mock; production uses the real API. */
const base = (env: Env) => (env.OPENAI_BASE_URL || 'https://api.openai.com').replace(/\/$/, '');

function requireKey(env: Env): string {
  if (!env.OPENAI_API_KEY) throw unavailable('AI features are not configured yet. Ask an administrator to add the OpenAI key.');
  return env.OPENAI_API_KEY;
}

/** Reasoning-era models (gpt-5.x, o-series) take max_completion_tokens and reject a custom temperature. */
export const isReasoningModel = (model: string) => /^(gpt-5|gpt-6|o\d)/.test(model);

function sizing(model: string, maxTokens: number, temperature?: number) {
  return isReasoningModel(model) ? { max_completion_tokens: maxTokens } : { max_tokens: maxTokens, temperature: temperature ?? 0.4 };
}

function payload(env: Env, opts: ChatOptions & { model?: string }, stream: boolean) {
  const model = opts.model || env.OPENAI_MODEL || 'gpt-4.1-mini';
  return JSON.stringify({
    model,
    messages: opts.messages,
    ...sizing(model, opts.maxTokens ?? 700, opts.temperature),
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

export interface ToolSpec { name: string; description: string; parameters: Record<string, unknown> }
export interface ToolCall { id: string; name: string; arguments: string }
export type AgentMessage =
  | { role: 'system' | 'user'; content: string }
  | { role: 'assistant'; content: string | null; tool_calls?: { id: string; type: 'function'; function: { name: string; arguments: string } }[] }
  | { role: 'tool'; tool_call_id: string; content: string };

/** One model turn with tools available. Returns either text, tool calls, or both. */
export async function chatWithTools(
  env: Env,
  opts: { model: string; messages: AgentMessage[]; tools: ToolSpec[]; maxTokens?: number; reasoningEffort?: 'none' | 'low' | 'medium' },
): Promise<{ content: string; toolCalls: ToolCall[]; usage?: { prompt_tokens: number; completion_tokens: number } }> {
  // Chat Completions rejects function tools combined with any reasoning effort other than 'none'
  // for the GPT-5.4 family, so tool-enabled turns run without reasoning; the final answer turn keeps it.
  const effort = opts.tools.length ? 'none' : opts.reasoningEffort;
  const body = JSON.stringify({
    model: opts.model,
    messages: opts.messages,
    ...(opts.tools.length ? { tools: opts.tools.map((t) => ({ type: 'function', function: t })), tool_choice: 'auto' } : {}),
    ...sizing(opts.model, opts.maxTokens ?? 900, 0.5),
    ...(isReasoningModel(opts.model) && effort ? { reasoning_effort: effort } : {}),
  });
  const res = await post(env, body);
  const data = (await res.json()) as {
    choices: { message: { content: string | null; tool_calls?: { id: string; function: { name: string; arguments: string } }[] } }[];
    usage?: { prompt_tokens: number; completion_tokens: number };
  };
  const m = data.choices[0]?.message;
  return {
    content: m?.content ?? '',
    toolCalls: (m?.tool_calls ?? []).map((c) => ({ id: c.id, name: c.function.name, arguments: c.function.arguments })),
    usage: data.usage,
  };
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
