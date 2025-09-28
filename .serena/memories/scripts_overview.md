# scripts/ Overview

- hook_pre_commands.sh
  - Purpose: PreToolUse approval hook for `Bash` tool invocations. Rejects if command string contains any blocked substrings.
  - Rules: `scripts/pre_commands_rules.json` (e.g., block `curl`, `wget`).
  - Dependencies: `jq`, `grep`, `sed`.
  - I/O: Reads hook JSON on stdin; returns JSON with `decision: approve|block`.

- pre_commands_rules.json
  - Structure: `{ "<ruleName>": { "commands": string[], "message": string } }`.
  - Default: "curl使うな" rule blocks `curl`/`wget` with guidance to use MCP.

- hook_stop_words.sh
  - Purpose: Block on prohibited phrases in the latest assistant message from a transcript.
  - Rules: `scripts/stop_words_rules.json` (speculation/alternatives/improvement/additional work/recommendation).
  - Dependencies: `jq`, `grep`, `sed`, `tac`.
  - I/O: stdin JSON with `transcript_path`; emits `approve|block` JSON.

- stop_words_rules.json
  - Structure: `{ "<ruleName>": { "keywords": string[], "message": string } }`.

- statusline.js
  - Purpose: Print status line `[model] <cwd> | <tokens> | <percent>`.
  - Logic: Reads `~/.claude/projects/<session_id>.jsonl` to compute last cumulative token usage; thresholds 80% compaction warning baseline.
  - Run: `echo '{"model":{"display_name":"Test"},"workspace":{"current_dir":"/tmp"},"session_id":"<id>"}' | node scripts/statusline.js`.

- typescript/no_restricted_edit.ts
  - Purpose: Deny TS edits that insert `any`/`unknown` assertions/annotations in TS files (`.ts/.tsx/.cts/.mts/.vue/.svelte/.astro`).
  - Framework: `cc-hooks-ts` with `defineHook`/`runHook`.
  - Run: `bun scripts/typescript/no_restricted_edit.ts` (normally invoked by client with hook context on stdin).

- typescript/use_lint_and_typecheck.ts
  - Status: Empty placeholder.
