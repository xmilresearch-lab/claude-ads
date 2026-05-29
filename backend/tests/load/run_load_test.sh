#!/usr/bin/env bash
# Run the Locust load test in headless mode against a running API server.
#
# Prerequisites:
#   1. API running:  docker compose up  (or uvicorn main:app)
#   2. Fixtures set: python tests/load/setup_load_test.py
#
# Usage:
#   bash tests/load/run_load_test.sh [--host http://localhost:8000]

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
ENV_FILE="${PROJECT_ROOT}/.env.loadtest"

# ── Load test fixtures ─────────────────────────────────────────────────────────

if [[ ! -f "${ENV_FILE}" ]]; then
    echo "ERROR: .env.loadtest not found. Run: python tests/load/setup_load_test.py"
    exit 1
fi

# shellcheck disable=SC1090
source "${ENV_FILE}"

export LOAD_TEST_TOKEN="${LOAD_TEST_TOKEN:-}"
export LOAD_TEST_AUTOMATION_IDS="${LOAD_TEST_AUTOMATION_IDS:-}"

if [[ -z "${LOAD_TEST_TOKEN}" ]]; then
    echo "ERROR: LOAD_TEST_TOKEN is empty in .env.loadtest"
    exit 1
fi

# ── Configuration ──────────────────────────────────────────────────────────────

HOST="${1:-http://localhost:8000}"
USERS="${LOCUST_USERS:-100}"
SPAWN_RATE="${LOCUST_SPAWN_RATE:-10}"
RUN_TIME="${LOCUST_RUN_TIME:-60s}"
REPORT_DIR="${PROJECT_ROOT}/tests/load"

mkdir -p "${REPORT_DIR}"

echo "============================================================"
echo "Load Test Configuration"
echo "  Host:       ${HOST}"
echo "  Users:      ${USERS}"
echo "  Spawn rate: ${SPAWN_RATE}/s"
echo "  Duration:   ${RUN_TIME}"
echo "  Report:     ${REPORT_DIR}/load-report.html"
echo "============================================================"
echo ""

# ── Run Locust ─────────────────────────────────────────────────────────────────

cd "${PROJECT_ROOT}"

locust \
    -f tests/load/locustfile.py \
    --headless \
    --users "${USERS}" \
    --spawn-rate "${SPAWN_RATE}" \
    --run-time "${RUN_TIME}" \
    --host "${HOST}" \
    --html "${REPORT_DIR}/load-report.html" \
    --csv "${REPORT_DIR}/load-stats"

EXIT_CODE=$?

echo ""
echo "============================================================"
if [[ $EXIT_CODE -eq 0 ]]; then
    echo "Load test PASSED"
else
    echo "Load test FAILED (exit code ${EXIT_CODE})"
fi
echo "  HTML report: ${REPORT_DIR}/load-report.html"
echo "  CSV stats:   ${REPORT_DIR}/load-stats_stats.csv"
echo "============================================================"

exit $EXIT_CODE
