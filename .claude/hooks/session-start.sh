#!/bin/bash
set -euo pipefail

# Only run in remote (cloud) sessions
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

# ── gh CLI ────────────────────────────────────────────────────────────────────
# apt repo is blocked in this environment; install from the GitHub release binary.
# GH_TOKEN env var (set in Claude Code session settings) gives gh auth automatically.
GH_VERSION="2.63.2"
if ! command -v gh &>/dev/null; then
  echo "[hook] Installing gh CLI v${GH_VERSION}..."
  curl -sL "https://github.com/cli/cli/releases/download/v${GH_VERSION}/gh_${GH_VERSION}_linux_amd64.tar.gz" \
    -o /tmp/gh.tar.gz
  tar -xzf /tmp/gh.tar.gz -C /tmp/
  sudo cp "/tmp/gh_${GH_VERSION}_linux_amd64/bin/gh" /usr/local/bin/gh
  rm -rf /tmp/gh.tar.gz "/tmp/gh_${GH_VERSION}_linux_amd64"
  echo "[hook] gh $(gh --version | head -1) installed"
else
  echo "[hook] gh already present: $(gh --version | head -1)"
fi

# Report auth status (non-fatal — GH_TOKEN may not be set yet)
if [ -n "${GH_TOKEN:-}" ]; then
  gh auth status 2>&1 || true
else
  echo "[hook] GH_TOKEN not set — gh installed but unauthenticated (add GH_TOKEN to session env vars)"
fi

# ── foofoo app dependencies ───────────────────────────────────────────────────
# Required for: E2E webServer (expo start --web), typecheck, and any app scripts.
echo "[hook] Checking foofoo app node_modules..."
cd "${CLAUDE_PROJECT_DIR}/foofoo"
npm install --prefer-offline --silent
echo "[hook] foofoo app dependencies ready"

# ── foofoo-tests dependencies ─────────────────────────────────────────────────
echo "[hook] Checking foofoo-tests node_modules..."
cd "${CLAUDE_PROJECT_DIR}/foofoo-tests"
npm install --prefer-offline --silent
echo "[hook] foofoo-tests dependencies ready"
