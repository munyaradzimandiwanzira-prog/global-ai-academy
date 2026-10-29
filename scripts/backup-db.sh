#!/usr/bin/env bash
# Exports the production database to backups/ (git-ignored). The file contains learners' personal
# data: keep it encrypted (e.g. an encrypted disk or password manager vault), never email it, and
# delete old copies. Cloudflare also keeps point-in-time history ("Time Travel": 30 days on Workers Paid, 7 on Free):
#   npx wrangler d1 time-travel info global_ai_academy
#   npx wrangler d1 time-travel restore global_ai_academy --timestamp=2026-10-28T12:00:00Z
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p backups
chmod 700 backups
out="backups/global_ai_academy-$(date -u +%Y%m%dT%H%M%SZ).sql"
npx wrangler d1 export global_ai_academy --remote --output "$out"
chmod 600 "$out"
echo "Saved $out ($(du -h "$out" | cut -f1)). Store it encrypted and delete copies you no longer need."
