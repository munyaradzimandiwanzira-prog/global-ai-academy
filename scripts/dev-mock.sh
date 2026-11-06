#!/usr/bin/env bash
# Runs the built worker on :8787 with a local D1 and a scripted OpenAI stand-in on :9911 (no real AI calls).
# Usage: npm run build && bash scripts/dev-mock.sh   (then node tests/e2e-teaching.mjs)
set -euo pipefail
cd "$(dirname "$0")/.."
node tests/mock/openai-mock.mjs > /tmp/gaa-openai-mock.log 2>&1 &
{ grep -v "^OPENAI_API_KEY\|^OPENAI_BASE_URL" .dev.vars 2>/dev/null || true; printf "OPENAI_API_KEY=test\nOPENAI_BASE_URL=http://127.0.0.1:9911\n"; } > dist/global_ai_academy/.dev.vars
npx wrangler d1 migrations apply global_ai_academy --local --persist-to .wrangler/state
exec npx wrangler dev -c dist/global_ai_academy/wrangler.json --local --port 8787 --persist-to .wrangler/state
