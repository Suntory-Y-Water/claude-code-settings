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
    const response = await fetch(c.input.tool_input.url);
    let html = await response.text();
    if (!response.ok) {
      // if not 200, we don't process the HTML
      return c.success();
    }
    if (
      response.headers
        .get('Content-Type')
        ?.toLowerCase()
        .includes('text/plain') === true
    ) {
      // if it's plain text, we don't process the HTML
      return c.success();
    }

    let content = extract(html);
    let markdown = toMarkdown(content.root);
    // 静的ページでもたまに空のマークダウンが出力されることがある
    // その場合はPlaywrightで動的にHTMLを取得する
    if (markdown.length === 0) {
      const { fetchDynamicHtml } = await import('../utils/playwright');
      html = await fetchDynamicHtml(c.input.tool_input.url);
      content = extract(html);
      markdown = toMarkdown(content.root);
      // Playwrightでも取得できない場合は通常のWebFetchを使う
      if (markdown.length === 0) {
        return c.success();
      }
    }

    // Markdownの行数が多すぎる場合は通常のWebFetchを使う
    const MAX_MARKDOWN_LINES = 500;
    const lineCount = markdown.split('\n').length;
    if (lineCount > MAX_MARKDOWN_LINES) {
      return c.success();
    }

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
