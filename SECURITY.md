# Security

## Reporting a vulnerability

Email **munyaradzimandiwanzira@gmail.com** with the subject `SECURITY`, steps to reproduce and the impact you expect. Please don't open a public GitHub issue, and don't access other people's data while testing. We aim to reply within 3 working days and to fix confirmed high-severity issues within 14 days.

## How the platform is protected

Mapped to the OWASP Top 10 (2025) and OWASP ASVS level 2. The code that enforces each control is listed so it can be reviewed.

| Area | Control | Where |
|---|---|---|
| Access control | Every API route checks the signed-in user and RBAC permission; every record lookup is scoped to its owner or classroom | `worker/app.ts`, `shared/rbac.ts`, `worker/routes/*` |
| Paywall | Locked lessons never ship to the browser; full text only from the Worker for entitled users | `worker/routes/content.ts`, `plugins/content-parser.ts` |
| Passwords | PBKDF2-SHA256 + salt; rejected if found in known breaches (k-anonymity, NIST 800-63B) | `worker/lib/crypto.ts`, `worker/lib/password-policy.ts` |
| Two-step login | TOTP (RFC 6238) with replay protection + one-use recovery codes; secrets AES-256-GCM encrypted at rest; **required for admins** (an admin without it acts as a learner) | `worker/lib/mfa.ts`, `worker/lib/totp.ts`, `worker/lib/secretbox.ts`, `worker/lib/session.ts` |
| Sessions | Random 256-bit token, only its SHA-256 stored; HttpOnly + Secure + SameSite=Lax; admin sessions end after 12 h; all sessions revoked on password reset / two-step enrolment; users can sign out devices | `worker/lib/session.ts`, `worker/routes/account.ts` |
| CSRF | Same-origin `Origin`/`Referer` check on every state-changing request | `worker/lib/session.ts` |
| Brute force & bots | D1 rate limits on sign-in (per IP and per account), sign-up, reset, codes, AI and payments; optional Cloudflare Turnstile | `worker/lib/ratelimit.ts`, `worker/lib/turnstile.ts` |
| Injection | Parameterised D1 queries only; zod validation on every input; links limited to http(s) | `shared/schemas.ts` |
| XSS & content security | Strict CSP on the site (no `unsafe-eval`; third-party scripts only from Pyodide, Turnstile and Cloudflare Web Analytics); learner HTML runs in a separate opaque-origin sandbox page with its own CSP | `public/_headers`, `worker/sandbox.ts` |
| Code runners | Learner/shared code runs in Web Workers that cannot call this site (fetch/XHR same-origin blocked, no nested workers) | `src/features/runners/network-guard.ts` |
| AI (OWASP LLM Top 10) | Learner text fenced as data, delimiter tags neutralised; per-user daily quotas plus a site-wide daily circuit breaker; chat size capped | `worker/lib/prompts.ts`, `worker/lib/ai-quota.ts` |
| Payments | Paynow notifications verified by SHA-512 hash (constant-time) and amount check; idempotent settlement | `worker/lib/paynow.ts`, `worker/routes/payments.ts` |
| Leaderboard integrity | XP only for activities that exist in the course build; Kids Zone capped daily | `worker/routes/me.ts` |
| Privacy | Consent at sign-up (guardian for under-18s); self-service data export and account erasure | `worker/routes/account.ts`, `src/pages/Legal.tsx` |
| Supply chain | Exact-pinned dependencies, `npm audit` gate in CI, Dependabot, CodeQL | `.github/` |
| Audit trail | Sign-ins, failures, role changes, payments, two-step changes, exports and deletions logged | `audit_log` table |

## Secrets

Never in Git. Set with `npx wrangler secret put NAME` (or `.dev.vars` locally, git-ignored).

| Secret | Purpose | Rotation |
|---|---|---|
| `MFA_KEY` | Encrypts two-step-login secrets (32 random bytes, base64) | Rotating it disables everyone's two-step login (they must enrol again). Only rotate if leaked; reset users' MFA from the admin panel. |
| `OPENAI_API_KEY`, `BREVO_API_KEY`, `PAYNOW_*`, `TURNSTILE_SECRET_KEY` | Providers | Rotate in the provider's dashboard, then `wrangler secret put`. |
| `ADMIN_EMAILS` | Who becomes admin after verifying their email | Edit and re-put. |

## Incident response

1. **Contain** – disable the affected account(s) in Admin → Users (signs them out), rotate any exposed secret, and if needed pause the Worker route in Cloudflare.
2. **Assess** – check `audit_log`, Cloudflare Workers logs and Security Events; decide what data was affected.
3. **Recover** – fix the cause; restore data if needed with D1 Time Travel (`npx wrangler d1 time-travel restore …`).
4. **Notify** – under Zimbabwe's Cyber and Data Protection Act, tell POTRAZ and affected learners without undue delay when personal data is breached.
5. **Learn** – write a short post-mortem and add a test for the failure.

Backups: Cloudflare D1 keeps point-in-time history (30 days on the Workers Paid plan, 7 days on Free). For an offline copy run `bash scripts/backup-db.sh` (contains personal data — store encrypted).

## Accepted risks (reviewed October 2026)

- **PBKDF2 at 100,000 iterations** — the maximum Cloudflare Workers allows (OWASP suggests 600,000). Compensated by breach checks, rate limits, Turnstile and two-step login.
- **react-router-dom 6.30** — advisories GHSA-wrjc-x8rr-h8h6 (open redirect via `\`) and GHSA-337j-9hxr-rhxg (SSR only). Not exploitable here: `safeNext()` rejects backslashes and protocol-relative paths, and the site doesn't use SSR. Upgrade to v7 when Dependabot proposes a settled release.
- **vitest 3 / @tailwindcss/typography** — dev/build-time advisories that never run in production.
- **Sign-up reveals whether an email is registered** — kept for usability; rate-limited and protected by Turnstile.
