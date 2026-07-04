#!/bin/bash
# Claude Code が子プロセスに渡す session_id。hook 側 JSON の session_id と同一。
set -euo pipefail

if [[ -z "${CLAUDE_CODE_SESSION_ID:-}" ]]; then
  exit 1
fi

echo "$CLAUDE_CODE_SESSION_ID"
