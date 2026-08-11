import { defineHook } from 'cc-hooks-ts';

const NOTIFY_MESSAGE = 'Claude Code が確認/許可を待っています';

function buildTerminalSequence(message: string): string {
  const osc9 = `\x1b]9;${message}\x07`;
  const osc777 = `\x1b]777;notify;Claude Code;${message}\x07`;
  const bel = '\x07';
  return `${osc9}${osc777}${bel}`;
}

const hook = defineHook({
  trigger: {
    PreToolUse: {
      AskUserQuestion: true,
    },
    PermissionRequest: true,
  },

  run: (c) => {
    const terminalSequence = buildTerminalSequence(NOTIFY_MESSAGE);

    if (c.input.hook_event_name === 'PreToolUse') {
      return c.json({
        event: 'PreToolUse',
        output: { terminalSequence },
      });
    }

    return c.json({
      event: 'PermissionRequest',
      output: { terminalSequence },
    });
  },
});

if (import.meta.main) {
  const { runHook } = await import('cc-hooks-ts');
  await runHook(hook);
}
