const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

/** True only when the request itself is served from this machine (never on Cloudflare). */
export function isLocalRequest(requestUrl: string): boolean {
  return LOCAL_HOSTS.has(new URL(requestUrl).hostname);
}

/**
 * Public base URL for links in emails and payment redirects. Uses APP_URL, except when APP_URL
 * still points at localhost but the app is deployed — then the deployed origin is the only correct
 * answer (e.g. a first deploy to *.workers.dev before APP_URL is configured).
 */
export function appBase(requestUrl: string, appUrl: string): string {
  const configured = new URL(appUrl);
  if (LOCAL_HOSTS.has(configured.hostname) && !isLocalRequest(requestUrl)) return new URL(requestUrl).origin;
  return configured.origin;
}
