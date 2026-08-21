#!/usr/bin/env -S bun run --silent
import { mkdirSync, rmdirSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { defineHook, runHook } from 'cc-hooks-ts';
import { join } from 'pathe';

const MIKKE_ROOT = join(homedir(), '.claude');
const LOCK_DIR = join(MIKKE_ROOT, '.mikke', 'embed.lock');
const LOCK_STALE_MS = 10 * 60 * 1000;

// mikke embed は embeddings.safetensors を固定名の一時ファイル経由で書くため、
// 複数セッションが同時に走ると壊れたファイルが rename されうる。mkdir の排他性で直列化する。
function acquireLock(): boolean {
  try {
    mkdirSync(LOCK_DIR, { recursive: false });
    return true;
  } catch {
    // プロセスが落ちて残った lock を放置すると以後ずっと skip し続けるので、
    // 実行時間としてありえない古さなら削除して取り直す
    try {
      if (Date.now() - statSync(LOCK_DIR).mtimeMs < LOCK_STALE_MS) {
        return false;
      }
      rmdirSync(LOCK_DIR);
      mkdirSync(LOCK_DIR, { recursive: false });
      return true;
    } catch {
      return false;
    }
  }
}

const hook = defineHook({
  trigger: {
    Stop: true,
  },

  // settings.json の async: true でこの hook 自体がバックグラウンド実行されるため、完了まで待ってよい
  run: async (context) => {
    if (context.input.stop_hook_active) {
      return context.success();
    }

    // 別セッションが実行中なら、そちらが今回のログも拾うので何もしない
    if (!acquireLock()) {
      return context.success();
    }

    try {
      await Bun.spawn(['mikke', '--root', MIKKE_ROOT, 'embed'], {
        stdio: ['ignore', 'ignore', 'ignore'],
      }).exited;
    } catch {
      // 意味検索が最新にならないだけで、mikke find は auto_rebuild で追従する
    } finally {
      try {
        rmdirSync(LOCK_DIR);
      } catch {
        // 消せなくても LOCK_STALE_MS 経過後に次の実行が削除する
      }
    }

    return context.success();
  },
});

if (import.meta.main) {
  await runHook(hook);
}
