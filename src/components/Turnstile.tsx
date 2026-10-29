import { useCallback, useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

/**
 * Cloudflare Turnstile ("I am human" check). Renders nothing until the site key is configured
 * on the server (GET /api/auth/config), so forms keep working in development and before setup.
 * Usage: const bot = useTurnstile('login'); … {bot.widget} … send bot.token; call bot.reset() after a failed submit.
 */

interface TurnstileApi {
  render(el: HTMLElement, opts: Record<string, unknown>): string;
  reset(id: string): void;
  remove(id: string): void;
}
declare global {
  interface Window { turnstile?: TurnstileApi }
}

const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
let scriptPromise: Promise<void> | null = null;
const loadScript = () =>
  (scriptPromise ??= new Promise<void>((resolve, reject) => {
    const s = document.createElement('script');
    s.src = SCRIPT_SRC;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => {
      scriptPromise = null;
      reject(new Error('Turnstile failed to load'));
    };
    document.head.appendChild(s);
  }));

export function useTurnstile(action: 'signup' | 'login' | 'forgot') {
  const config = useQuery({ queryKey: ['auth-config'], queryFn: () => api.get<{ turnstileSiteKey: string | null }>('/api/auth/config'), staleTime: Infinity });
  const siteKey = config.data?.turnstileSiteKey ?? null;
  const [token, setToken] = useState<string | undefined>();
  const box = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);

  useEffect(() => {
    if (!siteKey || !box.current) return;
    let cancelled = false;
    loadScript()
      .then(() => {
        if (cancelled || !box.current || !window.turnstile) return;
        widgetId.current = window.turnstile.render(box.current, {
          sitekey: siteKey,
          action,
          theme: document.documentElement.classList.contains('dark') ? 'dark' : 'light',
          size: 'flexible',
          callback: (t: string) => setToken(t),
          'expired-callback': () => setToken(undefined),
          'error-callback': () => setToken(undefined),
        });
      })
      .catch(() => { /* the server reports a clear error if the token is missing */ });
    return () => {
      cancelled = true;
      if (widgetId.current && window.turnstile) window.turnstile.remove(widgetId.current);
      widgetId.current = null;
    };
  }, [siteKey, action]);

  const reset = useCallback(() => {
    setToken(undefined);
    if (widgetId.current && window.turnstile) window.turnstile.reset(widgetId.current);
  }, []);

  const widget = siteKey ? <div ref={box} className="min-h-[65px]" /> : null;
  return { widget, token, reset, enabled: !!siteKey };
}
