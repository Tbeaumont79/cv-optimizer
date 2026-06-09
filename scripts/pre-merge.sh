#!/usr/bin/env bash
# scripts/pre-merge.sh — Gate qualité local AVANT merge d'une PR.
#
# Pourquoi : tant que les GitHub Actions hébergées sont bloquées au niveau
# facturation (toggle owner-only sur le compte, voir docs/ci-gate.md), ce script
# EST le gate obligatoire. Il rejoue à l'identique les jobs de .github/workflows/ci.yml
# (lint · typecheck · build · test, + health check live Postgres en option).
#
# Aucune PR sensible — en particulier le moteur de matching honnête (THI-124) — ne
# doit merger sans une exécution VERTE de ce script.
#
# Usage :
#   bash scripts/pre-merge.sh           # checks rapides (lint/typecheck/build/test)
#   bash scripts/pre-merge.sh --health  # + boot Nuxt + probe /api/health (Postgres requis)
#
# Sortie : code 0 = vert (mergeable) ; non-zéro = rouge (ne pas merger).

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

WITH_HEALTH=0
[ "${1:-}" = "--health" ] && WITH_HEALTH=1

step() { printf "\n\033[1;34m▶ %s\033[0m\n" "$1"; }
ok()   { printf "\033[1;32m✓ %s\033[0m\n" "$1"; }

step "Install (frozen lockfile)"
pnpm install --frozen-lockfile
ok "install"

step "Lint"
pnpm lint
ok "lint"

step "Typecheck"
pnpm typecheck
ok "typecheck"

step "Build"
pnpm build
ok "build"

step "Test (dont garde-fou provenance : item sans provenance → rejeté)"
pnpm test
ok "test"

if [ "$WITH_HEALTH" = "1" ]; then
  step "Health check live (Postgres requis : pnpm db:up)"
  export DATABASE_URL="${DATABASE_URL:-postgresql://cvo:cvo@localhost:5432/cvo?schema=public}"
  pnpm --filter @cvo/app prisma:migrate:deploy
  node apps/app/.output/server/index.mjs &
  SRV_PID=$!
  trap 'kill $SRV_PID 2>/dev/null || true' EXIT
  healthy=0
  for _ in $(seq 1 30); do
    if curl -fs http://localhost:3000/api/health > /tmp/cvo-health.json; then healthy=1; break; fi
    sleep 2
  done
  [ "$healthy" = "1" ] || { echo "Server never became healthy"; exit 1; }
  echo "Health response:"; cat /tmp/cvo-health.json; echo
  grep -q '"db":"up"' /tmp/cvo-health.json
  grep -q '"status":"ok"' /tmp/cvo-health.json
  ok "health (db up + status ok)"
fi

printf "\n\033[1;32m═══ GATE VERT — PR mergeable ═══\033[0m\n"
