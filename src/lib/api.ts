import type { ApiErrorBody } from '@shared/api-types';

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public fields?: Record<string, string>,
  ) {
    super(message);
  }
}

async function request<T>(method: string, url: string, data?: unknown, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      method,
      credentials: 'same-origin',
      headers: data !== undefined ? { 'content-type': 'application/json' } : undefined,
      body: data !== undefined ? JSON.stringify(data) : undefined,
      ...init,
    });
  } catch {
    throw new ApiError(0, 'network', 'You appear to be offline. Check your connection and try again.');
  }
  if (!res.ok) {
    let body: ApiErrorBody | null = null;
    try {
      body = (await res.json()) as ApiErrorBody;
    } catch {
      /* not JSON */
    }
    throw new ApiError(res.status, body?.error.code ?? 'error', body?.error.message ?? `Request failed (${res.status}).`, body?.error.fields);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const api = {
  get: <T>(url: string) => request<T>('GET', url),
  post: <T>(url: string, data?: unknown) => request<T>('POST', url, data ?? {}),
  put: <T>(url: string, data?: unknown) => request<T>('PUT', url, data ?? {}),
  patch: <T>(url: string, data?: unknown) => request<T>('PATCH', url, data ?? {}),
  del: <T>(url: string) => request<T>('DELETE', url),
  /** Streams a text/plain response, calling onChunk as text arrives. */
  async stream(url: string, data: unknown, onChunk: (text: string) => void, signal?: AbortSignal): Promise<void> {
    const res = await fetch(url, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(data),
      signal,
    });
    if (!res.ok || !res.body) {
      let body: ApiErrorBody | null = null;
      try {
        body = (await res.json()) as ApiErrorBody;
      } catch {
        /* ignore */
      }
      throw new ApiError(res.status, body?.error.code ?? 'error', body?.error.message ?? 'The AI tutor is unavailable.');
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      onChunk(decoder.decode(value, { stream: true }));
    }
  },
};

export const errorMessage = (e: unknown) => (e instanceof Error ? e.message : 'Something went wrong.');
