interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
  APP_NAME: string;
  APP_URL: string;
  OPENAI_MODEL: string;
  ADMIN_EMAILS: string;
  EMAIL_FROM: string;
  JUDGE0_URL: string;
  // Secrets
  OPENAI_API_KEY?: string;
  BREVO_API_KEY?: string;
  PAYNOW_INTEGRATION_ID?: string;
  PAYNOW_INTEGRATION_KEY?: string;
  JUDGE0_API_KEY?: string;
}
