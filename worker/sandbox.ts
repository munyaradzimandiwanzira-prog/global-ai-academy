/**
 * The HTML/CSS/JS preview frame for lessons and the playground.
 *
 * Learner pages need things the main site must never allow (inline scripts, eval for Babel/JSX,
 * React from unpkg). Serving the preview as its own document lets it carry its own, looser CSP
 * while the main site keeps a strict one — a srcdoc iframe would inherit the main policy instead.
 *
 * Safety:
 *  - `sandbox` in the CSP makes this document an opaque origin even if opened directly in a tab,
 *    so learner code can never read skurulearning.com cookies, storage or API responses.
 *  - It only renders HTML sent by its own parent frame, which must be skurulearning.com.
 */
const SANDBOX_CSP = [
  'sandbox allow-scripts allow-modals',
  "default-src 'none'",
  "script-src 'unsafe-inline' 'unsafe-eval' https://unpkg.com https://cdn.jsdelivr.net",
  "style-src 'unsafe-inline' https://fonts.googleapis.com https://unpkg.com https://cdn.jsdelivr.net",
  'font-src https://fonts.gstatic.com data:',
  'img-src data: blob: https:',
  'media-src data: blob: https:',
  'connect-src https:',
  "form-action 'none'",
  "base-uri 'none'",
  "frame-ancestors 'self'",
].join('; ');

// The bootstrap waits for HTML from the embedding page, then replaces itself with it.
const BOOTSTRAP = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Preview</title></head><body><script>
(function () {
  if (window.parent === window) { document.body.textContent = 'This page only works inside Global AI Academy.'; return; }
  window.addEventListener('message', function onMessage(e) {
    if (e.source !== window.parent || !e.data || e.data.__gaaSandbox !== 'render' || typeof e.data.html !== 'string') return;
    window.removeEventListener('message', onMessage);
    document.open(); document.write(e.data.html); document.close();
  });
  window.parent.postMessage({ __gaaSandbox: 'ready' }, '*');
})();
</script></body></html>`;

export function sandboxResponse(): Response {
  return new Response(BOOTSTRAP, {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'content-security-policy': SANDBOX_CSP,
      'x-content-type-options': 'nosniff',
      'referrer-policy': 'no-referrer',
      'cache-control': 'public, max-age=3600',
    },
  });
}
