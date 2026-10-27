# Deploying Global AI Academy to Cloudflare

Everything runs on Cloudflare's free tier: one **Worker** serves the API and the React app, and **D1** (serverless SQLite) is the database. Budget about 15 minutes for the first deploy.

## 0. Prerequisites

- Node.js 20+ and a free Cloudflare account
- From the project folder: `npm install`

## 1. Sign in and create the database

```bash
npx wrangler login
npx wrangler d1 create global_ai_academy
```

Copy the `database_id` it prints into `wrangler.jsonc`, replacing `00000000-0000-0000-0000-000000000000`. Then create the tables:

```bash
npm run db:migrate:remote
```

## 2. Add secrets

Secrets are encrypted by Cloudflare and never appear in code or Git. Each command asks you to paste the value.

```bash
npx wrangler secret put OPENAI_API_KEY          # required for Coach Zuva, Professor Zuva and teacher AI tools
npx wrangler secret put BREVO_API_KEY           # verification, password-reset and waitlist emails (Brevo → SMTP & API → API keys)
npx wrangler secret put PAYNOW_INTEGRATION_ID   # optional: Paynow (EcoCash, OneMoney, cards)
npx wrangler secret put PAYNOW_INTEGRATION_KEY
npx wrangler secret put JUDGE0_API_KEY          # optional: server-side Java/Kotlin/C++/PHP runner
```

Without a secret, its feature switches off gracefully. The app still works and tells learners what isn't available yet. `GET /api/health` shows which features are on.

## 3. Deploy

```bash
npm run deploy
```

The site is live at `https://global-ai-academy.<your-subdomain>.workers.dev`. Sign up with an address listed in `ADMIN_EMAILS` (in `wrangler.jsonc`) to become the first admin automatically.

## 4. Set your public URL

Edit `vars` in `wrangler.jsonc`, then run `npm run deploy` again:

| Var | Set to |
|---|---|
| `APP_URL` | Your public address, e.g. `https://globalaiacademy.co.zw`. Email links and Paynow redirects use it. Until it's set, the app uses the address it was reached on. |
| `EMAIL_FROM` | A sender verified in Brevo. It is set to `munyaradzimandiwanzira@gmail.com`, which is verified on your Brevo account today. Move to an address on your own domain once the domain is authenticated (better inbox placement). |
| `ADMIN_EMAILS` | Comma-separated emails that become admins when they sign up |
| `OPENAI_MODEL` | Defaults to `gpt-4.1-mini` (good quality per dollar) |
| `JUDGE0_URL` | Your Judge0 endpoint, if you use one |

## 5. Custom domain (optional)

1. Add your domain to Cloudflare (Websites → Add a site) and point its nameservers to Cloudflare. For `.co.zw`, ask your registrar to change the nameservers.
2. Workers & Pages → **global-ai-academy** → Settings → Domains & Routes → **Add custom domain**.
3. Set `APP_URL` to that domain and deploy again.

## 6. Paynow

1. In the Paynow merchant dashboard, create an integration and copy its **Integration ID** and **Integration Key** into the secrets above.
2. The app sends Paynow these URLs automatically on each payment:
   - Result (webhook): `https://<your-domain>/api/payments/paynow/result`
   - Return: `https://<your-domain>/billing/return`
3. Paynow integrations start in **test mode**. Make a test payment, then ask Paynow to activate live mode.

Webhooks are checked with Paynow's SHA-512 hash and the paid amount must match before a plan is extended. Learners can also pay by mobile money directly on the pricing page (express checkout).

## 7. Email (Brevo)

Your Brevo account already has `munyaradzimandiwanzira@gmail.com` as a verified sender, so email works as soon as `BREVO_API_KEY` is set. For the best deliverability, later:

1. Authenticate your own domain in Brevo (SPF, DKIM and DMARC records in Cloudflare DNS).
2. Set `EMAIL_FROM` to an address on that domain and deploy again.

## Updating

```bash
npm test && npm run deploy
```

Migrations so far: `0001_init.sql` (core) and `0002_growth.sql` (waitlist, promo codes, trials, scholarships, live sessions, projects, capstones, learner reports). `npm run db:migrate:remote` applies whichever are missing. New migrations go in `migrations/` as `0003_*.sql` and are applied with `npm run db:migrate:remote` **before** deploying the code that needs them.

**Rollback:** `npx wrangler rollback` restores the previous version immediately.

## Continuous deployment (optional)

`.github/workflows/ci.yml` type-checks, tests and builds every push. To deploy automatically from `main`:

1. Create a Cloudflare API token from the "Edit Cloudflare Workers" template.
2. Add it as the `CLOUDFLARE_API_TOKEN` repository secret in GitHub.

## Operations

- **Logs:** `npx wrangler tail`, or Workers → Observability in the dashboard.
- **Backups:** D1 Time Travel restores to any minute in the last 30 days: `npx wrangler d1 time-travel restore global_ai_academy --timestamp=<ISO time>`.
- **Database console:** `npx wrangler d1 execute global_ai_academy --remote --command "SELECT COUNT(*) FROM users"`.
- **Free-tier headroom:** Workers allows 100k requests a day. D1 allows 5 GB, 5M row reads and 100k writes a day. Code runs in learners' browsers, so it costs nothing on the server.
