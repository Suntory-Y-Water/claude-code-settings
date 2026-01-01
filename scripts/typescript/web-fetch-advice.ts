/**
 * @fileoverview
 *   Send tips when using web fetch in Claude Code.
 *
 * @see {@link https://docs.anthropic.com/en/docs/claude-code/hooks}
 * @see {@link https://github.com/sushichan044/dotfiles/blob/main/.claude/hooks/web_fetch_advice.ts}
 */

import { extract, toMarkdown } from '@mizchi/readability';
import { defineHook } from 'cc-hooks-ts';
import { isNonEmptyString } from '../utils/empty';
import { parseGitHubUrlToGhCommand } from '../utils/github';
import { isRawContentURL } from '../utils/url';

const hook = defineHook({
  trigger: {
    PreToolUse: {
      WebFetch: true,
    },
  },

  run: async (c) => {
    const urlObj = new URL(c.input.tool_input.url);
    if (isRawContentURL(urlObj)) {
      return c.success();
    }

    const ghResult = parseGitHubUrlToGhCommand(urlObj);
    if (ghResult) {
      return c.json({
        event: 'PreToolUse',
        output: {
          hookSpecificOutput: {
            hookEventName: 'PreToolUse',
            permissionDecision: 'deny',
            permissionDecisionReason: [
              'Use the GitHub CLI instead.',
              'Suggested command:',
              '```bash',
              ghResult.command,
              '```',
              ...(isNonEmptyString(ghResult.additionalInformation)
                ? ['Additional information:', ghResult.additionalInformation]
                : []),
            ].join('\n'),
          },
        },
      });
    }

    // use markdown fetch instead of WebFetch
    const resposne = await fetch(c.input.tool_input.url);
    const html = await resposne.text();
    if (!resposne.ok) {
      // if not 200, we don't process the HTML
      return c.success();
    }
    if (
      resposne.headers
        .get('Content-Type')
        ?.toLowerCase()
        .includes('text/plain') === true
    ) {
      // if it's plain text, we don't process the HTML
      return c.success();
    }

    const content = extract(html);
    const markdown = toMarkdown(content.root);

    return c.json({
      event: 'PreToolUse',
      output: {
        hookSpecificOutput: {
          hookEventName: 'PreToolUse',
          permissionDecision: 'deny',
          permissionDecisionReason: [
            `You should not use web fetch for ${c.input.tool_input.url}.`,
            'Here is the markdown content I fetched from the page:',
            '```markdown',
            markdown,
            '```',
          ].join('\n'),
        },
        suppressOutput: true,
      },
    });
  },
});

if (import.meta.main) {
  const { runHook } = await import('cc-hooks-ts');
  await runHook(hook);
}
