#!/usr/bin/env bash
# Deploy Global AI Academy to Cloudflare from your own computer.
#
#   bash scripts/deploy.sh
#
# 1. Signs you in to Cloudflare in your browser (only the first time).
# 2. Applies any new database migrations to the production D1 database.
# 3. Builds and deploys the Worker.
# 4. Uploads secrets found in .dev.vars (values are piped, never printed).
set -euo pipefail
cd "$(dirname "$0")/.."

say() { printf '\n\033[1;36m▶ %s\033[0m\n' "$*"; }

say "Updating code and dependencies"
git pull --ff-only 2>/dev/null || echo "(skipped git pull)"
npm install --no-audit --no-fund

say "Checking Cloudflare sign-in"
if ! npx wrangler whoami 2>/dev/null | grep -q "associated with the email"; then
  echo "A browser window will open. Click Allow to let Wrangler deploy to your Cloudflare account."
  npx wrangler login
fi

say "Applying database migrations (production)"
CI=true npx wrangler d1 migrations apply global_ai_academy --remote

say "Building and deploying"
npm run deploy

say "Uploading secrets from .dev.vars"
put_secret() {
  local name="$1" value
  value="$(grep -E "^${name}=" .dev.vars 2>/dev/null | head -1 | cut -d= -f2- || true)"
  if [ -n "${value}" ]; then
    printf '%s' "${value}" | npx wrangler secret put "${name}" >/dev/null && echo "  ✓ ${name}"
  else
    echo "  – ${name} not set in .dev.vars (skipped)"
  fi
}
for s in ADMIN_EMAILS OPENAI_API_KEY BREVO_API_KEY PAYNOW_INTEGRATION_ID PAYNOW_INTEGRATION_KEY JUDGE0_API_KEY; do
  put_secret "$s"
done

say "Done"
echo "Live at https://skurulearning.com  ·  health: https://skurulearning.com/api/health"
