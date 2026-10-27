import { describe, expect, it } from 'vitest';
import { appBase, isLocalRequest } from '../worker/lib/urls';

describe('appBase / isLocalRequest', () => {
  it('uses APP_URL when it is configured for production', () => {
    expect(appBase('https://global-ai-academy.x.workers.dev/api/auth/forgot', 'https://globalaiacademy.co.zw/')).toBe('https://globalaiacademy.co.zw');
  });
  it('falls back to the deployed origin when APP_URL was left at localhost', () => {
    expect(appBase('https://global-ai-academy.x.workers.dev/api/x', 'http://localhost:5173')).toBe('https://global-ai-academy.x.workers.dev');
  });
  it('keeps localhost in local development', () => {
    expect(appBase('http://localhost:5173/api/x', 'http://localhost:5173')).toBe('http://localhost:5173');
  });
  it('decides "local" from the request host, never from config, so deployed sites cannot leak reset links', () => {
    expect(isLocalRequest('http://127.0.0.1:8787/api/x')).toBe(true);
    expect(isLocalRequest('https://localhost.evil.example/api/x')).toBe(false);
    expect(isLocalRequest('https://global-ai-academy.x.workers.dev/api/x')).toBe(false);
  });
});
