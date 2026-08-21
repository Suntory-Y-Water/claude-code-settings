#!/bin/sh
# subagent-log を必ず対象にして mikke を実行する。
# 素の `mikke` は cwd から上方探索するため、別プロジェクト内で実行すると
# そのリポジトリを走査して .mikke/ を作ってしまう。
set -eu
exec mikke --root "${MIKKE_LOG_ROOT:-$HOME/.claude}" "$@"
