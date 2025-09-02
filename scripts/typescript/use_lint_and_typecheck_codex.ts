#!/usr/bin/env -S bun run --silent
import { defineHook, runHook } from "cc-hooks-ts";

type CmdResult = {
  code: number;
  stdout: string;
  stderr: string;
};

async function runTypeCheck(): Promise<CmdResult> {
  const cwd = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
  const proc = Bun.spawn(["npx", "tsc", "--noEmit"], {
    cwd,
    stdout: "pipe",
    stderr: "pipe",
    env: process.env,
  });

  const [code, stdout, stderr] = await Promise.all([
    proc.exited,
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);

  return { code, stdout, stderr };
}

const hook = defineHook({
  trigger: { Stop: true },
  run: async (c) => {
    const { code, stdout, stderr } = await runTypeCheck();

    if (code === 0) {
      return c.success({
        messageForUser: "Type check passed (npx tsc --noEmit)",
      });
    }

    return c.nonBlockingError(
      `Type check failed (exit ${code}).\n${stderr || stdout}`
    );
  },
});

await runHook(hook);
