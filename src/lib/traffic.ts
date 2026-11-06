import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

const KEY = 'gaa:vid';

/** A random id for this tab session only. The server hashes it with the day, so it can't follow anyone. */
function visitorId() {
  try {
    let v = sessionStorage.getItem(KEY);
    if (!v) { v = Array.from(crypto.getRandomValues(new Uint8Array(12)), (b) => b.toString(36).padStart(2, '0')).join('').slice(0, 20); sessionStorage.setItem(KEY, v); }
    return v;
  } catch {
    return Math.random().toString(36).slice(2, 14).padEnd(12, '0');
  }
}

/** Counts a page view on every route change. Respects Do Not Track; skipped in dev and for bots server-side. */
export function usePageViews() {
  const { pathname } = useLocation();
  const first = useRef(true);
  useEffect(() => {
    if (import.meta.env.DEV || navigator.doNotTrack === '1' || (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl) return;
    // Only the first view of a session carries the referrer: later ones are internal navigation.
    const r = first.current ? document.referrer : '';
    first.current = false;
    const t = setTimeout(() => {
      void fetch('/api/t', { method: 'POST', keepalive: true, credentials: 'same-origin', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ p: pathname, r, v: visitorId() }) }).catch(() => {});
    }, 300);
    return () => clearTimeout(t);
  }, [pathname]);
}
