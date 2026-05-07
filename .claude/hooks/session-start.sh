#!/bin/bash
set -euo pipefail

# Only run in remote (Claude Code on the web) environments
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

REPO_DIR="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "$0")/../.." && pwd)}"

echo "==> Installing Python dependencies..."
PIP_CMD="pip3"
command -v pip3 >/dev/null 2>&1 || PIP_CMD="pip"
${PIP_CMD} install -q -r "${REPO_DIR}/requirements.txt" \
  || ${PIP_CMD} install --break-system-packages -q -r "${REPO_DIR}/requirements.txt"
echo "    ✓ Python packages installed"

echo "==> Ensuring Playwright browser is available..."
playwright install chromium --quiet 2>/dev/null || true
echo "    ✓ Playwright chromium ready"

echo "==> Session start complete"
