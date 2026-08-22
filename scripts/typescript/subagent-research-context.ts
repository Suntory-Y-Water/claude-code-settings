#!/usr/bin/env -S bun run --silent
import { defineHook, runHook } from 'cc-hooks-ts';
import { projectTag } from '../mikke/project-tag';

const TARGET_AGENT_TYPES = new Set(['Explore', 'general-purpose']);

function researchContext(projectDir: string): string {
  const tag = projectTag(projectDir);
  return [
    '実装について調査するよう依頼されている場合は、次の手順を必ず守ること:',
    `1. 現在のプロジェクトタグは \`${tag}\`。新しい調査を始める前に、\`mikke-log find --project "${tag}" <調査語>\` で過去のサブエージェント調査ログを検索する`,
    `2. 意味検索が必要なら \`mikke-log hybrid --project "${tag}" "<調べたいこと>"\` を使う`,
    '3. `mikke-log` が返す `path` は実行環境で解決済みの絶対パスなので、そのまま読み込む',
    '4. 関連するログがあれば、その内容を確認してから不足分だけを調査する',
  ].join('\n');
}

const hook = defineHook({
  trigger: {
    SubagentStart: true,
  },

  run: (context) => {
    if (!TARGET_AGENT_TYPES.has(context.input.agent_type)) {
      return context.success();
    }

    const projectDir = process.env.CLAUDE_PROJECT_DIR ?? context.input.cwd;

    return context.json({
      event: 'SubagentStart',
      output: {
        hookSpecificOutput: {
          hookEventName: 'SubagentStart',
          additionalContext: researchContext(projectDir),
        },
      },
    });
  },
});

if (import.meta.main) {
  await runHook(hook);
}
