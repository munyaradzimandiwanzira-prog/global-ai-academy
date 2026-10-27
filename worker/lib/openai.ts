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

const ENDPOINT = 'https://api.openai.com/v1/chat/completions';

function requireKey(env: Env): string {
  if (!env.OPENAI_API_KEY) throw unavailable('AI features are not configured yet. Ask an administrator to add the OpenAI key.');
  return env.OPENAI_API_KEY;
}

function payload(env: Env, opts: ChatOptions, stream: boolean) {
  return JSON.stringify({
    model: env.OPENAI_MODEL || 'gpt-4.1-mini',
    messages: opts.messages,
    temperature: opts.temperature ?? 0.4,
    max_tokens: opts.maxTokens ?? 700,
    stream,
    ...(opts.json ? { response_format: { type: 'json_object' } } : {}),
  });
}

async function post(env: Env, body: string): Promise<Response> {
  const res = await fetch(ENDPOINT, {
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

export async function chat(env: Env, opts: ChatOptions): Promise<string> {
  const res = await post(env, payload(env, opts, false));
  const data = (await res.json()) as { choices: { message: { content: string } }[] };
  return data.choices[0]?.message?.content ?? '';
}

export async function chatJson<T>(env: Env, opts: ChatOptions): Promise<T> {
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
