# Project Overview

- Purpose: Claude Code settings to streamline development tasks by automating confirmations and providing reusable commands, roles, and hooks. Repository is intended to be cloned into `~/.claude` and referenced by the Claude Code client.
- Stack: TypeScript (ESNext, ESM), Bash, Node.js (CommonJS for `scripts/statusline.js`), Bun present (`bun.lock`), Biome for lint/format via `biome.json`. External tools used by hooks: `jq`, `grep`, `sed`, `tac`, `rg`.
- MCP: `.mcp.json` configures `context7` MCP server via `npx @upstash/context7-mcp@latest`.
- Key configs: `tsconfig.json` (strict, noEmit, bundler resolution), `biome.json` (formatter and linter rules), `package.json` (private, ESM, deps: `cc-hooks-ts`, `pathe`, peer `typescript`).

## Structure
- `scripts/`: Hook and utility scripts
  - `hook_pre_commands.sh`: PreToolUse hook; blocks disallowed shell commands based on `scripts/hook_pre_commands_rules.json`.
  - `hook_stop_words.sh`: Inspects latest assistant message in transcript; blocks if prohibited phrases per `scripts/hook_stop_words_rules.json` appear.
  - `hook_pre_commands_rules.json`: Rule set; example blocks `curl`/`wget` with message to use MCP.
  - `hook_stop_words_rules.json`: Rule sets for speculation/alternatives/improvements/additional work/recommendations.
  - `statusline.js`: Prints model, cwd, and token usage percent by scanning `~/.claude/projects/<session_id>.jsonl`.
  - `typescript/no_restricted_edit.ts`: `cc-hooks-ts` PreToolUse to deny edits inserting `any`/`unknown` assertions/annotations for TS-family extensions.
  - `typescript/use_lint_and_typecheck.ts`: Placeholder (empty).
- `commands/`: Reusable prompt commands (`*.md`).
- `agents/roles/`: Role presets (`security.md`, `reviewer.md`).
- `.serena/`: Serena project config and memories store.
- `README.md`: Setup and migration notes.
- `AGENTS.md`: Operational principles and coding guidelines.

## Entry/Run
- This is a settings repo; no app runtime. Hooks are invoked by the Claude Code client configuration (`settings.json` in the client) and MCP.
- Node script `scripts/statusline.js` can be exercised manually via stdin JSON (see suggested commands).

## Unknowns
- Test suite: None found.
- CI: Not present.
- Exact client wiring for hooks (settings.json) is external to this repo.
