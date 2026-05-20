#!/usr/bin/env bash
# Deploy Windward Financial CRM to Render.
#
# This script mirrors scripts/deploy.sh (Railway) but targets Render. It
# triggers a deploy for one or more services via the Render REST API.
#
# Usage:
#   scripts/deploy-render.sh                  # deploy api, public, and web
#   scripts/deploy-render.sh api              # api only
#   scripts/deploy-render.sh public web       # explicit list
#
# First-time setup:
#   1. In the Render dashboard, click "New +" → "Blueprint" and point it at
#      this repo. Render will read render.yaml and create the database plus
#      three web services (windward-api, windward-web, windward-public).
#   2. Fill in the `sync: false` env vars (SMTP creds, ANTHROPIC_API_KEY,
#      QUO_API_KEY, VITE_API_URL, PUBLIC_API_URL, etc.) on each service.
#   3. Create an API key at https://dashboard.render.com/u/settings#api-keys
#      and export it as RENDER_API_KEY.
#   4. Grab each service's ID (srv-…) from its dashboard URL and export:
#        RENDER_API_SERVICE_ID, RENDER_WEB_SERVICE_ID, RENDER_PUBLIC_SERVICE_ID
#      (or pass them inline when running this script).
#
# Optional:
#   RENDER_CLEAR_CACHE=1   # pass clearCache=clear to force a clean rebuild
#   RENDER_BRANCH=main     # deploy a specific branch (defaults to service's)

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

API_SERVICE_ID="${RENDER_API_SERVICE_ID:-}"
WEB_SERVICE_ID="${RENDER_WEB_SERVICE_ID:-}"
PUBLIC_SERVICE_ID="${RENDER_PUBLIC_SERVICE_ID:-}"

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

command -v curl >/dev/null 2>&1 || fatal "curl not found"
command -v jq   >/dev/null 2>&1 || fatal "jq not found (brew install jq / apt-get install jq)"

[[ -n "${RENDER_API_KEY:-}" ]] \
  || fatal "RENDER_API_KEY not set. Create one at https://dashboard.render.com/u/settings#api-keys"

# Verify the key works and print the owner for a sanity check.
WHOAMI=$(curl -fsS -H "Authorization: Bearer $RENDER_API_KEY" \
  "https://api.render.com/v1/owners?limit=1" 2>/dev/null || true)
if [[ -z "$WHOAMI" ]] || ! echo "$WHOAMI" | jq -e '.[0].owner.name' >/dev/null 2>&1; then
  fatal "Render API key rejected. Check RENDER_API_KEY."
fi
ok "Render auth: $(echo "$WHOAMI" | jq -r '.[0].owner.name')"

# ── Helpers ───────────────────────────────────────────────────────────

CLEAR_CACHE="${RENDER_CLEAR_CACHE:-0}"
BRANCH="${RENDER_BRANCH:-}"

trigger_deploy() {
  local label="$1" svc_id="$2"

  if [[ -z "$svc_id" ]]; then
    fatal "Service id for '$label' is empty. Export RENDER_${label^^}_SERVICE_ID (srv-…)."
  fi

  local body
  body=$(jq -nc \
    --arg clear "$CLEAR_CACHE" \
    --arg branch "$BRANCH" \
    '{} + (if $clear == "1" then {clearCache:"clear"} else {} end)
        + (if $branch != ""  then {branch:$branch}      else {} end)')

  info "Deploying $label ($svc_id)..."
  local resp http_code
  resp=$(curl -sS -o /tmp/render-deploy.$$ -w '%{http_code}' \
    -X POST "https://api.render.com/v1/services/$svc_id/deploys" \
    -H "Authorization: Bearer $RENDER_API_KEY" \
    -H "Content-Type: application/json" \
    -d "$body") || true
  http_code="$resp"

  if [[ "$http_code" != "201" && "$http_code" != "200" ]]; then
    warn "HTTP $http_code from Render:"
    cat /tmp/render-deploy.$$ >&2 || true
    rm -f /tmp/render-deploy.$$
    fatal "Deploy request failed for $label"
  fi

  local deploy_id
  deploy_id=$(jq -r '.id // empty' </tmp/render-deploy.$$)
  rm -f /tmp/render-deploy.$$
  ok "Triggered $label deploy${deploy_id:+ ($deploy_id)}"
  printf '   https://dashboard.render.com/web/%s/deploys/%s\n' "$svc_id" "$deploy_id"
}

# ── Main ──────────────────────────────────────────────────────────────

targets=("$@")
if (( ${#targets[@]} == 0 )); then
  targets=(api public web)
fi

for t in "${targets[@]}"; do
  case "$t" in
    api)    trigger_deploy api    "$API_SERVICE_ID"    ;;
    public) trigger_deploy public "$PUBLIC_SERVICE_ID" ;;
    web)    trigger_deploy web    "$WEB_SERVICE_ID"    ;;
    *) fatal "Unknown target: $t (expected api, public, or web)" ;;
  esac
done

echo
ok "All deploys triggered. Dashboard: https://dashboard.render.com/"
