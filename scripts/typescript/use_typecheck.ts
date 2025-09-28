#!/usr/bin/env -S bun run --silent
import { defineHook, runHook } from 'cc-hooks-ts';
import { spawn } from 'node:child_process';

type CmdResult = {
  code: number | null;
  stdout: string;
  stderr: string;
};

function runTypeCheck(): Promise<CmdResult> {
  return new Promise((resolve) => {
    const child = spawn('npx', ['tsc', '--noEmit'], {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: process.env,
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (d: Buffer) => (stdout += d.toString()));
    child.stderr.on('data', (d: Buffer) => (stderr += d.toString()));

    child.on('close', (code: number) => {
      resolve({ code, stdout, stderr });
    });
    child.on('error', (err: Error) => {
      resolve({ code: 1, stdout, stderr: String(err) });
    });
  });
}

const hook = defineHook({
  trigger: {
    PostToolUse: {
      Edit: true,
      MultiEdit: true,
    },
  },
  run: async (c) => {
    // TypeScript ファイルの編集でない場合はスキップ
    const filePath = c.input.tool_input.file_path;
    if (!filePath?.match(/\.(ts|tsx|cts|mts)$/)) {
      return c.success();
    }

    const result = await runTypeCheck();

    if (result.code === 0) {
      return c.success({
        messageForUser: 'Type check passed: npx tsc --noEmit',
      });
    }

    // Claude に型エラー修正を指示
    // 部分的に修正していると必ず型エラーが出るので
    // すべての処理が終わっている場合に型エラーを直させるようにする
    return c.json({
      event: 'PostToolUse',
      output: {
        decision: 'block',
        reason: `TypeScript errors found. Fix the following errors:\n\n${
          result.stderr || result.stdout
        }\n\nUse correct types to resolve these errors.`,
        hookSpecificOutput: {
          hookEventName: 'PostToolUse',
          additionalContext: [
            'Type checking failed.',
            'If the code you created or edited is still in progress, you can ignore this error.',
            'If the work is complete, please fix all TypeScript errors before informing the user that it is finished.',
          ].join(' '),
        },
      },
    });
  },
});

await runHook(hook);
