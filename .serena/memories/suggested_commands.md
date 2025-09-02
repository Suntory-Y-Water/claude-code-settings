# Suggested Commands

## Setup
- Clone (for fresh setup): `git clone https://github.com/Suntory-Y-Water/claude-code-settings.git ~/.claude`
- Verify tools: `node -v && bun -v || true && jq --version && rg --version`

## Type Check
- `tsc -p tsconfig.json --noEmit`

## Lint / Format (Biome)
- Lint: `biome check .`
- Format (write): `biome format --write .`
- If Biome not installed: `npx @biomejs/biome@latest check .`

## Scripts: Hooks and Utilities
- Status line demo:
  - `echo '{"model":{"display_name":"Test"},"workspace":{"current_dir":"/tmp"},"session_id":"demo"}' | node scripts/statusline.js`
- Pre-command hook demo (blocks curl/wget). Input expects JSON like:
  - `echo '{"tool_name":"Bash","tool_input":{"command":"curl https://example.com"}}' | bash scripts/hook_pre_commands.sh`
- Stop-words hook demo (requires transcript path):
  - `echo '{"transcript_path":"/path/to/session.jsonl"}' | bash scripts/hook_stop_words.sh`
- TypeScript edit restriction hook (invoked by Claude Code). For manual run, use a TS runtime (e.g., Bun):
  - `bun scripts/typescript/no_restricted_edit.ts` (expects hook context on stdin from the client)

## Utilities
- Search files: `rg "pattern"`
- List tree (top): `ls -la`

## Notes
- Hooks are normally wired by the Claude Code client via its `settings.json` and run automatically; manual runs above are for sanity checks only.
