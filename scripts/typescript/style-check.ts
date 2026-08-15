#!/usr/bin/env -S bun run --silent
import { defineHook, runHook } from 'cc-hooks-ts';
import { decideWrite } from './style-rules/decide.ts';

const hook = defineHook({
  trigger: {
    PostToolUse: {
      Write: true,
      Edit: true,
    },
  },

  run: async (context) => {
    const input = context.input.tool_input;
    const reason = await decideWrite({
      filePath: input.file_path,
      writtenText: 'content' in input ? input.content : input.new_string,
      sessionId: context.input.session_id,
    });
    if (reason === undefined) {
      return context.success();
    }

    return context.json({
      event: 'PostToolUse',
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
