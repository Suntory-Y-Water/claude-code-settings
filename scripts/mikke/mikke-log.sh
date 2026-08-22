#!/bin/sh
# subagent-log を必ず対象にし、検索結果をどの cwd からも開ける絶対パスにする。
set -eu
exec bun run -i --silent "$HOME/.claude/scripts/mikke/mikke-log.ts" "$@"
