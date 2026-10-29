interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
  APP_NAME: string;
  APP_URL: string;
  OPENAI_MODEL: string;
  EMAIL_FROM: string;
  JUDGE0_URL: string;
  /** Public Turnstile site key (safe to expose). Bot checks switch on once this and the secret are set. */
  TURNSTILE_SITE_KEY?: string;
  /** Site-wide cap on AI requests per UTC day (cost circuit breaker). */
  AI_GLOBAL_DAILY_LIMIT?: string;
  // Secrets
  /** Comma-separated admin emails. A secret so who-is-admin never appears in the public repo. */
  ADMIN_EMAILS?: string;
  OPENAI_API_KEY?: string;
  BREVO_API_KEY?: string;
  PAYNOW_INTEGRATION_ID?: string;
  PAYNOW_INTEGRATION_KEY?: string;
  JUDGE0_API_KEY?: string;
  /** 32 random bytes, base64. Encrypts two-step-login secrets at rest. */
  MFA_KEY?: string;
  TURNSTILE_SECRET_KEY?: string;
}
