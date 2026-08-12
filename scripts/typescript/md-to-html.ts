#!/usr/bin/env -S bun run --silent
import { homedir } from 'node:os';
import {
  basename,
  dirname,
  extname,
  isAbsolute,
  join,
  resolve,
} from 'node:path';
import { defineHook, runHook } from 'cc-hooks-ts';
import { micromark } from 'micromark';
import { gfm, gfmHtml } from 'micromark-extension-gfm';

const OUTPUT_ROOT = join(homedir(), '.claude', 'output-html');
const TARGET_EXTENSION = '.md';
const EXCLUDED_DIR_NAMES = new Set([
  '.git',
  'node_modules',
  '.claude',
  '.github',
  '.vscode',
  '.idea',
  'dist',
  'build',
  'out',
  'target',
  'vendor',
  '.next',
  '.cache',
  'coverage',
  'tmp',
]);
const MIN_BODY_LENGTH = 800;
const IMAGE_MARKER = '![';
const IMAGE_MIME_BY_EXT: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
};

function splitFrontMatter(source: string): {
  body: string;
  title: string | undefined;
} {
  if (!/^---\r?\n/.test(source)) {
    return { body: source, title: undefined };
  }
  const lines = source.split('\n');
  for (let index = 1; index < lines.length; index++) {
    if (lines[index]?.trim() !== '---') {
      continue;
    }
    const frontMatter = lines.slice(1, index).join('\n');
    const rawTitle = frontMatter.match(/^title:\s*(.+)$/m)?.[1]?.trim();
    const title = rawTitle?.replace(/^(["'])(.*)\1$/, '$2');
    return { body: lines.slice(index + 1).join('\n'), title };
  }
  return { body: source, title: undefined };
}

function isUnderExcludedDir(filePath: string): boolean {
  return dirname(filePath)
    .split('/')
    .some((segment) => EXCLUDED_DIR_NAMES.has(segment));
}

// micromark は属性値を HTML エンティティ + パーセントエンコードで出力するため、
// ファイルパスに戻すには両方を復元する必要がある
function decodeAttributeValue(value: string): string {
  const unescaped = value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
  try {
    return decodeURIComponent(unescaped);
  } catch {
    return unescaped;
  }
}

async function toDataUri(
  src: string,
  baseDir: string,
): Promise<string | undefined> {
  if (/^(https?:|data:)/i.test(src)) {
    return undefined;
  }
  const decoded = decodeAttributeValue(src);
  const mime = IMAGE_MIME_BY_EXT[extname(decoded).toLowerCase()];
  if (!mime) {
    return undefined;
  }
  const absolutePath = isAbsolute(decoded)
    ? decoded
    : resolve(baseDir, decoded);
  const file = Bun.file(absolutePath);
  if (!(await file.exists())) {
    return undefined;
  }
  const bytes = await file.bytes();
  return `data:${mime};base64,${bytes.toBase64()}`;
}

async function embedLocalImages(
  html: string,
  baseDir: string,
): Promise<string> {
  const matches = [...html.matchAll(/(<img[^>]*?src=")([^"]*)(")/g)];
  let result = '';
  let cursor = 0;
  for (const match of matches) {
    const [whole, prefix, src, suffix] = match;
    result += html.slice(cursor, match.index);
    cursor = match.index + whole.length;
    const dataUri = await toDataUri(src ?? '', baseDir);
    result += dataUri === undefined ? whole : `${prefix}${dataUri}${suffix}`;
  }
  return result + html.slice(cursor);
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderPage(title: string, contentHtml: string): string {
  return `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(title)}</title>
<style>
:root {
  color-scheme: light dark;
  --bg: #ffffff;
  --fg: #1f2328;
  --border: #d1d9e0;
  --code-bg: #f6f8fa;
  --link: #0969da;
  --quote: #59636e;
}
@media (prefers-color-scheme: dark) {
  :root {
    --bg: #0d1117;
    --fg: #e6edf3;
    --border: #3d444d;
    --code-bg: #161b22;
    --link: #4493f8;
    --quote: #9198a1;
  }
}
body {
  background: var(--bg);
  color: var(--fg);
  font-family: system-ui, -apple-system, "Hiragino Sans", sans-serif;
  line-height: 1.7;
  max-width: 700px;
  margin: 0 auto;
  padding: 2rem 1.25rem 4rem;
  overflow-wrap: break-word;
}
h1, h2, h3, h4, h5, h6 { line-height: 1.35; margin: 1.8em 0 0.6em; }
h1 { font-size: 1.7rem; border-bottom: 1px solid var(--border); padding-bottom: 0.3em; }
h2 { font-size: 1.4rem; border-bottom: 1px solid var(--border); padding-bottom: 0.3em; }
a { color: var(--link); }
code {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.875em;
  background: var(--code-bg);
  border-radius: 4px;
  padding: 0.15em 0.35em;
}
pre { background: var(--code-bg); border-radius: 8px; padding: 1rem; overflow-x: auto; }
pre code { background: none; padding: 0; }
blockquote { margin: 1em 0; padding: 0 1em; color: var(--quote); border-left: 4px solid var(--border); }
table { border-collapse: collapse; display: block; overflow-x: auto; }
th, td { border: 1px solid var(--border); padding: 0.4em 0.8em; }
th { background: var(--code-bg); }
img { max-width: 100%; height: auto; }
hr { border: 0; border-top: 1px solid var(--border); margin: 2em 0; }
ul, ol { padding-left: 1.6em; }
li input[type="checkbox"] { margin-right: 0.4em; }
</style>
</head>
<body>
${contentHtml}
</body>
</html>
`;
}

const hook = defineHook({
  trigger: {
    PostToolUse: {
      Write: true,
      Edit: true,
    },
  },

  run: async (context) => {
    try {
      const filePath = context.input.tool_input.file_path;
      if (extname(filePath).toLowerCase() !== TARGET_EXTENSION) {
        return context.success();
      }
      if (isUnderExcludedDir(filePath)) {
        return context.success();
      }
      const mdFile = Bun.file(filePath);
      if (!(await mdFile.exists())) {
        return context.success();
      }

      const { body, title: frontMatterTitle } = splitFrontMatter(
        await mdFile.text(),
      );
      const firstLine = body
        .split('\n')
        .find((line) => line.trim() !== '')
        ?.trim();
      const headingTitle = firstLine?.match(/^#\s+(.+)/)?.[1];
      if (frontMatterTitle === undefined && headingTitle === undefined) {
        return context.success();
      }
      const trimmedBody = body.trim();
      if (
        trimmedBody.length < MIN_BODY_LENGTH &&
        !trimmedBody.includes(IMAGE_MARKER)
      ) {
        return context.success();
      }

      const contentHtml = await embedLocalImages(
        micromark(body, {
          extensions: [gfm()],
          htmlExtensions: [gfmHtml()],
        }),
        dirname(filePath),
      );
      const title =
        frontMatterTitle ??
        headingTitle ??
        basename(filePath, TARGET_EXTENSION);

      const outPath = join(
        OUTPUT_ROOT,
        dirname(filePath).replaceAll('/', '-'),
        `${basename(filePath, TARGET_EXTENSION)}.html`,
      );
      const isNewFile = !(await Bun.file(outPath).exists());
      // Bun.write は親ディレクトリを自動作成する
      await Bun.write(outPath, renderPage(title, contentHtml));

      if (!isNewFile) {
        return context.success();
      }
      return context.json({
        event: 'PostToolUse',
        output: {
          systemMessage: `Markdown を HTML に変換しました: ${Bun.pathToFileURL(outPath).href}`,
        },
      });
    } catch (err) {
      process.stderr.write(
        `[md-to-html] ${err instanceof Error ? err.message : String(err)}\n`,
      );
      return context.success();
    }
  },
});

if (import.meta.main) {
  await runHook(hook);
}
