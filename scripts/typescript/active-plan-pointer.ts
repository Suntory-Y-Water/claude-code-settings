#!/usr/bin/env -S bun run --silent
/**
 * @fileoverview
 *   $CLAUDE_PROJECT_DIR/.claude/plans/ 配下への Write/Edit を検知し、
 *   そのファイルパスを ${TMPDIR}/claude-active-plan/<session_id> に記録する。
 *
 *   発火タイミング: PostToolUse(Write|Edit)。判定条件は create-plan-link.ts と同一
 *   （実績のある検知ロジックに相乗りしている）。
 *
 *   NOTE: これは推測ベースの実装。「session 中に書かれた最後の plan ファイルが
 *   常に compact 復旧時に読み直すべき active plan である」という前提は未検証。
 *   複数 plan を並行して扱うセッションでは誤ったファイルを指す可能性がある。
 *   pointer file を読む userpromptsubmit-compaction-recovery.sh 側も、
 *   存在しなければ黙って何もしない fail-open 設計なので、外れても実害は
 *   「復旧ヒントが出ない」程度に留まる。
 */

import { existsSync, lstatSync, mkdirSync, writeFileSync } from 'node:fs';
import { extname, join, relative, resolve, sep } from 'node:path';
import { defineHook, runHook } from 'cc-hooks-ts';

const PLANS_SUBDIR = join('.claude', 'plans');

/** child が parent 配下にあるか判定する（create-plan-link.ts と同じ実装） */
function isWithin(parent: string, child: string): boolean {
  const relativePath = relative(parent, child);
  if (!relativePath) {
    return false;
  }
  if (relativePath.startsWith('..')) {
    return false;
  }
  if (relativePath.split(sep).includes('..')) {
    return false;
  }
  return true;
}

const hook = defineHook({
  trigger: {
    PostToolUse: {
      Write: true,
      Edit: true,
    },
  },

  run: (context) => {
    try {
      const projectDir = process.env.CLAUDE_PROJECT_DIR;
      if (!projectDir) {
        return context.success();
      }

      const filePath = (context.input.tool_input as { file_path?: string })
        .file_path;
      if (!filePath) {
        return context.success();
      }

      const absPath = resolve(filePath);
      const plansDir = resolve(projectDir, PLANS_SUBDIR);
      if (!isWithin(plansDir, absPath)) {
        return context.success();
      }
      if (extname(absPath) !== '.md') {
        return context.success();
      }

      try {
        const stat = lstatSync(absPath);
        if (stat.isSymbolicLink() || !stat.isFile()) {
          return context.success();
        }
      } catch {
        return context.success();
      }

      // 圧縮復旧 hook (userpromptsubmit-compaction-recovery.sh) が
      // ${TMPDIR:-/tmp}/claude-active-plan/<session_id> をそのパスとして期待している。
      const tmpRoot = process.env.TMPDIR || '/tmp';
      const pointerDir = join(tmpRoot, 'claude-active-plan');
      if (!existsSync(pointerDir)) {
        mkdirSync(pointerDir, { recursive: true });
      }
      writeFileSync(join(pointerDir, context.input.session_id), absPath);

      return context.success();
    } catch (err) {
      process.stderr.write(
        `[active-plan-pointer] ${err instanceof Error ? err.message : String(err)}\n`,
      );
      return context.success();
    }
  },
});

if (import.meta.main) {
  await runHook(hook);
}
