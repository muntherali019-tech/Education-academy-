#!/bin/bash
# SessionStart hook for Claude Code on the web.
# Installs Node dependencies so the dev server, build and Express API are
# ready to run as soon as the session starts.
set -euo pipefail

# Only run in the remote (Claude Code on the web) environment.
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

# Async mode: install runs in the background while the session starts, which
# reduces startup latency. Claude may begin before the install completes.
echo '{"async": true, "asyncTimeout": 300000}'

cd "$CLAUDE_PROJECT_DIR"

# Install dependencies. `npm install` (not `npm ci`) so the cached container
# state is reused on subsequent runs and the step stays idempotent.
npm install
