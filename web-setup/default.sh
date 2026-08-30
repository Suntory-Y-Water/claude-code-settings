#!/bin/bash
set -u

# rtk: PreToolUse フックが全 Bash 呼び出しで叩くので PATH 非依存にする
(
  curl -fsSL https://raw.githubusercontent.com/rtk-ai/rtk/refs/heads/master/install.sh | sh
  ln -sf "$HOME/.local/bin/rtk" /usr/local/bin/rtk
) &

(
  git clone --depth 1 https://github.com/Suntory-N-Water/claude-code-settings.git /tmp/cc-settings
  mkdir -p "$HOME/.claude"
  cp -a /tmp/cc-settings/. "$HOME/.claude/"
  cd "$HOME/.claude" && bun install

  claude plugin marketplace add Suntory-N-Water/suntory-n-water-marketplace || true
  claude plugin marketplace add anthropics/claude-plugins-official || true
  claude plugin install -y general-dev-skills@suntory-n-water-marketplace || true
  claude plugin install -y mattpocock-skills@claude-plugins-official || true
) &

wait
exit 0
