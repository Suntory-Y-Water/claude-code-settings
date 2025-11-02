#!/usr/bin/env -S bun run --silent
import { defineHook, runHook, type ToolSchema } from 'cc-hooks-ts';
import { extname } from 'pathe';
import { existsSync, readFileSync } from 'node:fs';
import type { TranscriptEntry } from '../types/claude-output';
import { $ } from 'bun';

/**
 * TypeScript型チェックコマンド (`tsc --noEmit`) の実行結果を表す型
 */
type CmdResult = {
  /** プロセス終了コード (0: 成功, その他: エラー, null: 実行時エラー) */
  code: number | null;
  /** 標準出力の内容（通常は空） */
  stdout: string;
  /** 標準エラー出力の内容（型エラーメッセージなど） */
  stderr: string;
};

/**
 * Serenaのツール入力パラメータの型
 */
type SerenaInput = {
  /** 編集するシンボル */
  name_path: string;
  /** 編集対象ファイルの相対パス */
  relative_path: string;
  /** 編集内容 */
  body: string;
};

declare module 'cc-hooks-ts' {
  interface ToolSchema {
    mcp__serena__insert_after_symbol: {
      input: SerenaInput;
    };
    mcp__serena__insert_before_symbol: {
      input: SerenaInput;
    };
    mcp__serena__replace_symbol_body: {
      input: SerenaInput;
    };
  }
}

export const TYPE_SCRIPT_EXTENSIONS = ['.ts', '.tsx', '.cts', '.mts'];

/**
 * TypeScriptの型チェックを実行する
 * @returns 型チェックの結果
 */
export async function runTypeCheck(): Promise<CmdResult> {
  const proc = await $`bun tsc --noEmit`.nothrow().quiet();

  return {
    code: proc.exitCode,
    stdout: proc.stdout.toString(),
    stderr: proc.stderr.toString(),
  };
}

/**
 * ファイルパスが指定された拡張子パターンと一致するかチェックする
 * @param path - チェック対象のファイルパス
 * @param patterns - 拡張子パターンの配列
 */
export function isTypeScriptFile(path: string, patterns: string[]) {
  return patterns.includes(extname(path));
}

/**
 * ツールがTypeScriptファイル編集対象かどうかを判定する
 * @param toolName - 使用されたツール名
 * @returns TypeScriptファイル編集ツールかどうか
 */
export function isTypeScriptEditTool(toolName: keyof ToolSchema): boolean {
  return (
    toolName === 'Edit' ||
    toolName === 'MultiEdit' ||
    toolName === 'Write' ||
    // Serena関連のツールもTypeScript編集に含める
    toolName === 'mcp__serena__insert_after_symbol' ||
    toolName === 'mcp__serena__insert_before_symbol' ||
    toolName === 'mcp__serena__replace_symbol_body'
  );
}

/**
 * transcriptを確認して最新ユーザーメッセージ以降でTypeScriptファイルの編集があったかチェックする
 * @param transcriptPath - transcriptファイルのパス
 * @returns TypeScriptファイルの編集があったかどうか
 */
export function hasTypeScriptEdits(transcriptPath: string): boolean {
  if (!existsSync(transcriptPath)) {
    return false;
  }

  try {
    const content = readFileSync(transcriptPath, 'utf-8');
    const lines = content
      .split('\n')
      .filter((line) => line.trim())
      .reverse();

    // 最新のユーザーメッセージのタイムスタンプを見つける
    const lastUserTimestamp = (() => {
      for (const line of lines) {
        try {
          const msg: TranscriptEntry = JSON.parse(line);
          if (
            msg.type === 'user' &&
            !msg.message.content.startsWith('Stop hook feedback:')
          ) {
            return msg.timestamp;
          }
        } catch {
          // JSONパースエラーを無視
        }
      }
    })();

    if (!lastUserTimestamp) {
      return false;
    }

    // 最新ユーザーメッセージ以降のassistantメッセージでTypeScript編集をチェック
    for (const line of lines.reverse()) {
      try {
        const msg: TranscriptEntry = JSON.parse(line);
        if (msg.type === 'assistant' && msg.timestamp > lastUserTimestamp) {
          for (const content of msg.message.content) {
            if (
              content.type === 'tool_use' &&
              content.name &&
              isTypeScriptEditTool(content.name)
            ) {
              // file_path または relative_path のいずれかをチェック
              const filePath =
                content.input?.file_path || content.input?.relative_path;
              if (
                filePath &&
                isTypeScriptFile(filePath, TYPE_SCRIPT_EXTENSIONS)
              ) {
                return true;
              }
            }
          }
        }
      } catch {
        // JSONパースエラーを無視
      }
    }

    return false;
  } catch {
    return false;
  }
}

export const typecheckHook = defineHook({
  trigger: {
    Stop: true,
  },

  run: async (c) => {
    const transcriptPath = c.input.transcript_path;

    // このセッションでTypeScriptファイルの編集がなかった場合はスキップ
    const hasEdits = hasTypeScriptEdits(transcriptPath);

    if (!hasEdits) {
      return c.success();
    }

    const result = await runTypeCheck();

    if (result.code === 0) {
      return c.success({
        messageForUser: 'Type check passed: tsc --noEmit',
      });
    }

    // 型エラーが発生した場合、Claudeに修正を指示
    const errorOutput =
      result.stdout || result.stderr || 'No error output captured';
    const errorMessage = `\x1b[31mTypeScript errors found. Fix the following errors:\x1b[0m\n\n${errorOutput}\n\n\x1b[31mUse correct types to resolve these errors.\x1b[0m`;

    return c.blockingError(errorMessage);
  },
});

if (process.env.NODE_ENV !== 'test') {
  await runHook(typecheckHook);
}
