#!/usr/bin/env -S bun run --silent
import { defineHook, runHook } from 'cc-hooks-ts';
import { decideConversation } from './style-rules/conversation.ts';

const hook = defineHook({
  trigger: {
    Stop: true,
  },

  run: async (context) => {
    const reason = await decideConversation({
      sessionId: context.input.session_id,
      transcriptPath: context.input.transcript_path,
      lastAssistantMessage: context.input.last_assistant_message,
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
