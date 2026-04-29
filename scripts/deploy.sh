#!/usr/bin/env bash
# Deploy Windward Financial CRM to Railway.
#
# Usage:
#   scripts/deploy.sh                   # deploy all three services
#   scripts/deploy.sh api               # api only
#   scripts/deploy.sh public            # astro public site only
#   scripts/deploy.sh web               # admin crm only
#   scripts/deploy.sh api public web    # explicit list
#
# Auth: either run `railway login` first, OR export RAILWAY_TOKEN
# (project token from the Railway dashboard).
#
# Service names are read from RAILWAY_API_SERVICE / RAILWAY_PUBLIC_SERVICE /
# RAILWAY_WEB_SERVICE if set, otherwise fall back to "api" / "public" / "web".

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

API_SERVICE="${RAILWAY_API_SERVICE:-api}"
PUBLIC_SERVICE="${RAILWAY_PUBLIC_SERVICE:-public}"
WEB_SERVICE="${RAILWAY_WEB_SERVICE:-web}"

require_auth() {
  if ! railway whoami >/dev/null 2>&1; then
    echo "✗ Not logged in to Railway." >&2
    echo "  Run 'railway login' (interactive) or export RAILWAY_TOKEN=<project token>." >&2
    exit 1
  fi
}

require_link() {
  if ! railway status >/dev/null 2>&1; then
    echo "✗ This repo is not linked to a Railway project." >&2
    echo "  Run 'railway link' from the repo root and pick the project." >&2
    exit 1
  fi
}

deploy_api() {
  echo "→ Deploying API ($API_SERVICE)…"
  if [[ -n "${REBUILD_WEBHOOK_URL:-}" ]]; then
    railway variables --service "$API_SERVICE" --set "REBUILD_WEBHOOK_URL=$REBUILD_WEBHOOK_URL"
  fi
  ( cd packages/api && railway up --service "$API_SERVICE" --detach )
}

deploy_public() {
  echo "→ Deploying public Astro site ($PUBLIC_SERVICE)…"
  local args=()
  [[ -n "${PUBLIC_API_URL:-}" ]]      && args+=( --set "PUBLIC_API_URL=$PUBLIC_API_URL" )
  [[ -n "${PUBLIC_SITE_URL:-}" ]]     && args+=( --set "PUBLIC_SITE_URL=$PUBLIC_SITE_URL" )
  [[ -n "${PUBLIC_NLG_LOGIN_URL:-}" ]] && args+=( --set "PUBLIC_NLG_LOGIN_URL=$PUBLIC_NLG_LOGIN_URL" )
  [[ -n "${BUILD_DATABASE_URL:-}" ]]  && args+=( --set "BUILD_DATABASE_URL=$BUILD_DATABASE_URL" )
  if (( ${#args[@]} > 0 )); then
    railway variables --service "$PUBLIC_SERVICE" "${args[@]}"
  fi
  ( cd packages/public && railway up --service "$PUBLIC_SERVICE" --detach )
}

deploy_web() {
  echo "→ Deploying admin CRM ($WEB_SERVICE)…"
  ( cd packages/web && railway up --service "$WEB_SERVICE" --detach )
}

require_auth
require_link

targets=("$@")
if (( ${#targets[@]} == 0 )); then
  targets=(api public web)
fi

for t in "${targets[@]}"; do
  case "$t" in
    api)    deploy_api ;;
    public) deploy_public ;;
    web)    deploy_web ;;
    *) echo "Unknown target: $t (expected api, public, or web)" >&2; exit 1 ;;
  esac
done

echo "✓ Done. Check the Railway dashboard for build logs."
