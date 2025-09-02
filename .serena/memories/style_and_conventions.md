# Style and Conventions

## TypeScript
- TSConfig: ESNext lib/target, ESM (`"module": "Preserve"`), bundler resolution, `noEmit: true`, `strict: true`, `skipLibCheck: true`.
- Coding: Prefer function-based implementations; avoid classes in this project context (per AGENTS.md). Use `type` instead of `interface`. Arrays as `T[]`.
- Contracts: Express with function names and types. Avoid redundant runtime checks already enforced by TypeScript.
- Error handling: Do not add try/catch around library calls that don’t throw.
- Avoid: Type assertions/annotations with `any`/`unknown`; hooks actively reject such edits in TS files.

## Lint/Format (Biome)
- Formatter: 2-space indent, width 80, single quotes, semicolons always, trailing commas all.
- Linter: `recommended` rules enabled; `noUnusedImports`/`noUnusedVariables` warn. Some style rules turned off (e.g., `useTemplate`, `useImportType`). Tests under `test/` get relaxed rules.

## Shell/Node Scripts
- Bash scripts rely on `jq`, `grep`, `sed`, `tac`. Ensure POSIX-compatible behavior.
- Node script `statusline.js` is CommonJS (`require`), designed for Node >= 16.

## Authoring Guidelines
- Minimal comments; prefer self-explanatory code. Keep functions cohesive without over-fragmentation.
- Follow AGENTS.md operational principles in conversations and change proposals.
