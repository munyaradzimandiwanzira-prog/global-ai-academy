import type { z } from 'zod';
import type { zuvaChatSchema } from '@shared/schemas';
import type { ZuvaEvent, ZuvaMemory, ZuvaProfile } from '@shared/zuva';
import { api, ApiError } from '@/lib/api';

export type ZuvaChatRequest = z.input<typeof zuvaChatSchema>;

/** Streams Zuva's newline-delimited JSON events. */
export async function streamZuva(body: ZuvaChatRequest, onEvent: (e: ZuvaEvent) => void, signal?: AbortSignal): Promise<void> {
  const res = await fetch('/api/zuva/chat', { method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), signal });
  if (!res.ok || !res.body) {
    const err = (await res.json().catch(() => null)) as { error?: { code: string; message: string } } | null;
    throw new ApiError(res.status, err?.error?.code ?? 'error', err?.error?.message ?? 'Zuva is resting right now. Try again soon.');
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) if (line.trim()) onEvent(JSON.parse(line) as ZuvaEvent);
  }
  if (buffer.trim()) onEvent(JSON.parse(buffer) as ZuvaEvent);
}

export async function transcribeAudio(blob: Blob): Promise<string> {
  const fd = new FormData();
  fd.append('audio', blob, blob.type.includes('mp4') ? 'speech.m4a' : 'speech.webm');
  const res = await fetch('/api/zuva/transcribe', { method: 'POST', credentials: 'same-origin', body: fd });
  const data = (await res.json().catch(() => null)) as { text?: string; error?: { code: string; message: string } } | null;
  if (!res.ok) throw new ApiError(res.status, data?.error?.code ?? 'error', data?.error?.message ?? 'Zuva could not hear that.');
  return data?.text ?? '';
}

export const zuvaApi = {
  me: () => api.get<{ profile: ZuvaProfile; memories: ZuvaMemory[] }>('/api/zuva/me'),
  setMemory: (memoryEnabled: boolean) => api.patch<{ profile: ZuvaProfile }>('/api/zuva/settings', { memoryEnabled }),
  forget: (id: string) => api.del<{ ok: true }>(`/api/zuva/memories/${encodeURIComponent(id)}`),
  forgetAll: () => api.del<{ ok: true }>('/api/zuva/memories'),
};
