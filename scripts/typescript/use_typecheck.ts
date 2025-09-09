#!/usr/bin/env -S bun run --silent
import { defineHook, runHook } from "cc-hooks-ts";
import { spawn } from "node:child_process";

type CmdResult = {
  code: number | null;
  stdout: string;
  stderr: string;
};

function runTypeCheck(): Promise<CmdResult> {
  return new Promise((resolve) => {
    const child = spawn("npx", ["tsc", "--noEmit"], {
      stdio: ["ignore", "pipe", "pipe"],
      env: process.env,
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (d: Buffer) => (stdout += d.toString()));
    child.stderr.on("data", (d: Buffer) => (stderr += d.toString()));

    child.on("close", (code: number) => {
      resolve({ code, stdout, stderr });
    });
    child.on("error", (err: Error) => {
      resolve({ code: 1, stdout, stderr: String(err) });
    });
  });
}

const hook = defineHook({
  trigger: { Stop: true },
  run: async (c) => {
    const result = await runTypeCheck();

    if (result.code === 0) {
      return c.success({
        messageForUser: "Type check passed: npx tsc --noEmit",
      });
    }

    // Do not block; surface details to the user.
    return c.nonBlockingError(
      `Type check failed (exit ${result.code}). Run 'npx tsc --noEmit' locally.\n${
        result.stderr || result.stdout
      }`
    );
  },
});

await runHook(hook);