#!/bin/bash
# Run all scanner modes and optionally upload results to the app dashboard.
# Usage: ./scan_all.sh [--upload]
# Env vars: SCANNER_SECRET, APP_URL (required only with --upload)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
SCANNER_SECRET=${SCANNER_SECRET:-""}
APP_URL=${APP_URL:-"http://localhost:3000"}
UPLOAD=0
for arg in "$@"; do
  [ "$arg" = "--upload" ] && UPLOAD=1
done

echo "========================================"
echo "  \$100M AI Sales Team Security Scanner"
echo "  Run: $TIMESTAMP"
echo "========================================"

# Activate Python venv (installed by npm run scan:setup)
# shellcheck source=/dev/null
source "$SCRIPT_DIR/venv/bin/activate"

# ── 1. Static scan ─────────────────────────────────────────────────────────────
echo ""
echo "[1/3] Running static code analysis..."
set +e
python "$SCRIPT_DIR/static/run_static.py"
STATIC_EXIT=$?
set -e

# ── 2. Adversarial tests ───────────────────────────────────────────────────────
echo ""
echo "[2/3] Running adversarial test suite..."
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
set +e
(cd "$PROJECT_ROOT" && npm run scan:adversarial)
ADVERSARIAL_EXIT=$?
set -e

# ── 3. Prompt / AI security audit ─────────────────────────────────────────────
echo ""
echo "[3/3] Running AI security audit..."
set +e
(cd "$PROJECT_ROOT" && npm run audit:ai-security)
AUDIT_EXIT=$?
set -e

# ── Summary ────────────────────────────────────────────────────────────────────
if [ $STATIC_EXIT -ne 0 ] || [ $ADVERSARIAL_EXIT -ne 0 ] || [ $AUDIT_EXIT -ne 0 ]; then
  STATUS="fail"
else
  STATUS="pass"
fi

pass_or_fail() { [ "$1" -eq 0 ] && echo "PASS" || echo "FAIL"; }

echo ""
echo "========================================"
echo "  FINAL RESULT: $STATUS"
echo "  Static:       $(pass_or_fail $STATIC_EXIT)"
echo "  Adversarial:  $(pass_or_fail $ADVERSARIAL_EXIT)"
echo "  Prompt Audit: $(pass_or_fail $AUDIT_EXIT)"
echo "========================================"

# ── Optional: upload to dashboard ─────────────────────────────────────────────
if [ "$UPLOAD" -eq 1 ] && [ -n "$SCANNER_SECRET" ]; then
  echo ""
  echo "Uploading results to $APP_URL ..."
  curl -sf -X POST "$APP_URL/api/security/scan-results" \
    -H "Content-Type: application/json" \
    -H "X-Scanner-Secret: $SCANNER_SECRET" \
    -d "{
      \"scanType\": \"full\",
      \"runId\": \"manual-$TIMESTAMP\",
      \"status\": \"$STATUS\",
      \"findings\": {},
      \"criticalCount\": 0,
      \"warnCount\": 0,
      \"passCount\": 0,
      \"triggeredBy\": \"manual\"
    }" && echo "Uploaded." || echo "Upload failed (non-fatal)."
fi

[ "$STATUS" = "pass" ] && exit 0 || exit 1
