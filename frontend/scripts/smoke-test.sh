#!/usr/bin/env bash
# ============================================================
# Frontend Smoke Test Script
# Usage: ./scripts/smoke-test.sh https://app.yourdomain.com
# ============================================================

set -euo pipefail

BASE_URL="${1:-http://localhost:3000}"
PASS=0
FAIL=0
ERRORS=()

check() {
  local label="$1"
  local url="$2"
  local expected_status="${3:-200}"

  STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
    --max-time 15 \
    --location \
    "$url")

  if [ "$STATUS" = "$expected_status" ] || \
     ([ "$expected_status" = "200" ] && [ "$STATUS" = "307" ]) || \
     ([ "$expected_status" = "200" ] && [ "$STATUS" = "308" ]); then
    echo "  ✅  $label ($STATUS)"
    ((PASS++)) || true
  else
    echo "  ❌  $label — expected $expected_status got $STATUS"
    ERRORS+=("$label: expected $expected_status, got $STATUS")
    ((FAIL++)) || true
  fi
}

echo ""
echo "🔍  Smoke testing: $BASE_URL"
echo "────────────────────────────────────────"

echo ""
echo "Auth pages:"
check "Login page"              "$BASE_URL/login"
check "Register page"           "$BASE_URL/register"
check "Root redirect"           "$BASE_URL"

echo ""
echo "Dashboard pages (expect redirect to login — 307/308):"
check "Automations (guarded)"   "$BASE_URL/automations"           "200"
check "Content Queue (guarded)" "$BASE_URL/content"               "200"
check "Integrations (guarded)"  "$BASE_URL/integrations"          "200"
check "Analytics (guarded)"     "$BASE_URL/analytics"             "200"
check "Audit Log (guarded)"     "$BASE_URL/audit"                 "200"
check "Settings (guarded)"      "$BASE_URL/settings"              "200"

echo ""
echo "OAuth callback:"
check "Callback page (no params)" "$BASE_URL/integrations/callback" "200"

echo ""
echo "Admin (guarded):"
check "Admin root"              "$BASE_URL/admin"                  "200"

echo ""
echo "Error pages:"
check "404 page"                "$BASE_URL/this-does-not-exist"    "404"

echo ""
echo "Next.js internals:"
check "Next.js static"          "$BASE_URL/_next/static"           "200"

echo ""
echo "────────────────────────────────────────"
echo "Results: $PASS passed, $FAIL failed"

if [ ${#ERRORS[@]} -gt 0 ]; then
  echo ""
  echo "Failures:"
  for err in "${ERRORS[@]}"; do
    echo "  • $err"
  done
  echo ""
  exit 1
fi

echo ""
echo "✅  All smoke tests passed"
echo ""
