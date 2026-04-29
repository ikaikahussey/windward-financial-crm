#!/usr/bin/env bash
# Deploy Windward Financial CRM to Railway from your local machine.
#
# Usage:
#   scripts/deploy.sh                   # deploy all three services
#   scripts/deploy.sh api               # api only
#   scripts/deploy.sh public web        # explicit list
#
# Auth: run `railway login` first (opens your browser), OR export RAILWAY_TOKEN
# (account or project token from Railway dashboard).
#
# Optional env vars — if set, the script propagates them to the Railway service
# before running `railway up`:
#   API service:    REBUILD_WEBHOOK_URL
#   Public service: PUBLIC_API_URL, PUBLIC_SITE_URL, PUBLIC_NLG_LOGIN_URL,
#                   BUILD_DATABASE_URL
#   Web service:    VITE_API_URL
#
# Service names are read from RAILWAY_API_SERVICE / RAILWAY_PUBLIC_SERVICE /
# RAILWAY_WEB_SERVICE if set, otherwise default to "api" / "public" / "web".
#
# Project ID + environment can be overridden with RAILWAY_PROJECT_ID and
# RAILWAY_ENVIRONMENT — defaults match the existing Railway project.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PROJECT_ID="${RAILWAY_PROJECT_ID:-6fbf7793-fe4e-4225-82c0-54defd227c2c}"
ENVIRONMENT="${RAILWAY_ENVIRONMENT:-production}"

API_SERVICE="${RAILWAY_API_SERVICE:-api}"
PUBLIC_SERVICE="${RAILWAY_PUBLIC_SERVICE:-public}"
WEB_SERVICE="${RAILWAY_WEB_SERVICE:-web}"

c_blue=$(printf '\033[34m')
c_green=$(printf '\033[32m')
c_red=$(printf '\033[31m')
c_yellow=$(printf '\033[33m')
c_reset=$(printf '\033[0m')

info()  { printf '%s→ %s%s\n' "$c_blue" "$*" "$c_reset"; }
ok()    { printf '%s✓ %s%s\n' "$c_green" "$*" "$c_reset"; }
warn()  { printf '%s! %s%s\n' "$c_yellow" "$*" "$c_reset"; }
fatal() { printf '%s✗ %s%s\n' "$c_red" "$*" "$c_reset" >&2; exit 1; }

# ── Pre-flight checks ─────────────────────────────────────────────────

command -v railway >/dev/null 2>&1 || fatal "railway CLI not found. Install with: npm i -g @railway/cli"

TOKEN_TYPE=""
if railway whoami >/dev/null 2>&1; then
  WHOAMI=$(railway whoami 2>&1 || true)
  if echo "$WHOAMI" | grep -qiE "project token|environment token"; then
    TOKEN_TYPE="project"
  else
    TOKEN_TYPE="account"
  fi
  ok "Railway auth: $TOKEN_TYPE token ($(echo "$WHOAMI" | head -1))"
else
  fatal "Not logged in. Run 'railway login' (opens browser) or export RAILWAY_TOKEN."
fi

# ── Helpers ───────────────────────────────────────────────────────────

# link <service> — only needed for account tokens
link_service() {
  local svc="$1"
  if [[ "$TOKEN_TYPE" == "account" ]]; then
    railway link --project "$PROJECT_ID" --environment "$ENVIRONMENT" --service "$svc" >/dev/null 2>&1 \
      || fatal "railway link failed for service '$svc' — does it exist in the project?"
  fi
}

# set_var <service> <KEY> <VALUE> — no-op if VALUE is empty
set_var() {
  local svc="$1" key="$2" val="${3:-}"
  if [[ -n "$val" ]]; then
    info "  setting $key on $svc"
    railway variables --service "$svc" --set "$key=$val" >/dev/null
  fi
}

# up_service <service> <package-dir>
up_service() {
  local svc="$1" dir="$2"
  info "Deploying $svc from $dir/..."
  link_service "$svc"
  ( cd "$dir" && railway up --service "$svc" --ci ) || fatal "railway up failed for $svc"
  ok "Triggered build for $svc"
}

deploy_api() {
  link_service "$API_SERVICE"
  set_var "$API_SERVICE" REBUILD_WEBHOOK_URL "${REBUILD_WEBHOOK_URL:-}"
  up_service "$API_SERVICE" packages/api
}

deploy_public() {
  link_service "$PUBLIC_SERVICE"
  set_var "$PUBLIC_SERVICE" PUBLIC_API_URL       "${PUBLIC_API_URL:-}"
  set_var "$PUBLIC_SERVICE" PUBLIC_SITE_URL      "${PUBLIC_SITE_URL:-}"
  set_var "$PUBLIC_SERVICE" PUBLIC_NLG_LOGIN_URL "${PUBLIC_NLG_LOGIN_URL:-}"
  set_var "$PUBLIC_SERVICE" BUILD_DATABASE_URL   "${BUILD_DATABASE_URL:-}"
  up_service "$PUBLIC_SERVICE" packages/public
}

deploy_web() {
  link_service "$WEB_SERVICE"
  set_var "$WEB_SERVICE" VITE_API_URL "${VITE_API_URL:-}"
  up_service "$WEB_SERVICE" packages/web
}

# ── Main ──────────────────────────────────────────────────────────────

targets=("$@")
if (( ${#targets[@]} == 0 )); then
  targets=(api public web)
fi

for t in "${targets[@]}"; do
  case "$t" in
    api)    deploy_api ;;
    public) deploy_public ;;
    web)    deploy_web ;;
    *) fatal "Unknown target: $t (expected api, public, or web)" ;;
  esac
done

echo
ok "All deploys triggered. Watch progress:"
printf '   %s\n' "https://railway.com/project/${PROJECT_ID}"
