#!/usr/bin/env -S bun run --silent
import { defineHook, runHook } from 'cc-hooks-ts';
import { decideStop } from './style-rules/decide.ts';

const hook = defineHook({
  trigger: {
    Stop: true,
  },

  run: async (context) => {
    const reason = await decideStop({
      sessionId: context.input.session_id,
      stopHookActive: context.input.stop_hook_active,
    });
    if (reason === undefined) {
      return context.success();
    }

    return context.json({
      event: 'Stop',
      output: {
        decision: 'block',
        reason,
      },
    });
  },
});

if (import.meta.main) {
  await runHook(hook);
}
