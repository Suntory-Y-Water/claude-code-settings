# Task Completion Checklist

- Type check: `tsc -p tsconfig.json --noEmit`
- Lint: `biome check .` (or `npx @biomejs/biome check .` if not installed globally)
- Format: `biome format --write .`
- Shell scripts: ensure executable (`chmod +x scripts/*.sh` as needed)
- Sanity test:
  - For `statusline.js`: pipe a minimal JSON to verify output (see suggested_commands memory)
  - For hooks: review corresponding `*_rules.json` and confirm intended behavior
- Documentation: update `README.md`/role or command docs if behavior changes
- Version control: stage and commit with clear message; push as appropriate
