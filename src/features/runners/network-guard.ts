/**
 * Learner code (and code from shared projects) runs in Web Workers. A worker created by this page
 * shares the page's origin, so without a guard it could call the site's own API with the visitor's
 * session cookie — e.g. a booby-trapped shared project that deletes your projects when you press Run.
 *
 * `installNetworkGuard` runs inside the worker *before* any untrusted code and:
 *  - makes fetch / XMLHttpRequest refuse same-origin URLs (cross-origin package CDNs still work,
 *    which Pyodide needs; the page CSP limits those to an allow-list anyway);
 *  - removes WebSocket, EventSource and nested Worker constructors (a nested worker would start
 *    with fresh, unguarded globals).
 * Every override is non-writable and non-configurable, and is applied on the prototype that owns the
 * original too, so `WorkerGlobalScope.prototype.fetch.call(self, …)` cannot reach the real one.
 *
 * The function must stay self-contained (no imports or outer variables): the JavaScript runner
 * injects it as source text via `NETWORK_GUARD_SOURCE`.
 */
export function installNetworkGuard(): void {
  const g = self as unknown as Record<string, unknown> & { location: { origin: string } };
  const origin = g.location.origin;
  const message = 'Requests to this website are blocked inside the code runner.';
  const isSameOrigin = (input: unknown): boolean => {
    try {
      const raw = typeof input === 'object' && input !== null && 'url' in input ? String((input as { url: unknown }).url) : String(input);
      return new URL(raw, `${origin}/`).origin === origin;
    } catch {
      return true; // unparseable: refuse rather than guess
    }
  };
  const lock = (target: object, key: string, value: unknown) => {
    try {
      Object.defineProperty(target, key, { value, writable: false, configurable: false, enumerable: false });
    } catch {
      /* already locked */
    }
  };

  const realFetch = (g.fetch as typeof fetch).bind(self);
  const guardedFetch = (input: Parameters<typeof fetch>[0], init?: RequestInit) =>
    isSameOrigin(input) ? Promise.reject(new TypeError(message)) : realFetch(input, init);
  for (let proto: object | null = self; proto; proto = Object.getPrototypeOf(proto)) {
    if (Object.prototype.hasOwnProperty.call(proto, 'fetch')) lock(proto, 'fetch', guardedFetch);
  }
  lock(self, 'fetch', guardedFetch);

  type XhrLike = { prototype: { open: (this: unknown, ...args: unknown[]) => void } };
  const Xhr = g.XMLHttpRequest as XhrLike | undefined;
  if (Xhr) {
    const open = Xhr.prototype.open;
    lock(Xhr.prototype, 'open', function (this: unknown, method: string, url: string | URL, ...rest: unknown[]) {
      if (isSameOrigin(url)) throw new TypeError(message);
      return open.call(this, method, url, ...rest);
    });
  }

  for (const name of ['WebSocket', 'EventSource', 'Worker', 'SharedWorker']) lock(self, name, undefined);
}

export const NETWORK_GUARD_SOURCE = `(${installNetworkGuard.toString()})();`;
