export interface PageInput {
  title: string;
  contentHtml: string;
  diffHtml: string | undefined;
  clientJs: string;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const STYLE = `
:root {
  color-scheme: light dark;
  --bg: #ffffff;
  --fg: #1f2328;
  --border: #d1d9e0;
  --code-bg: #f6f8fa;
  --link: #0969da;
  --quote: #59636e;
  --mark-bg: rgba(255, 213, 79, 0.45);
  --mark-selected: rgba(255, 170, 0, 0.65);
  --ins-bg: #dafbe1;
  --del-bg: #ffebe9;
}
@media (prefers-color-scheme: dark) {
  :root {
    --bg: #0d1117;
    --fg: #e6edf3;
    --border: #3d444d;
    --code-bg: #161b22;
    --link: #4493f8;
    --quote: #9198a1;
    --mark-bg: rgba(187, 128, 9, 0.4);
    --mark-selected: rgba(210, 153, 34, 0.7);
    --ins-bg: rgba(46, 160, 67, 0.3);
    --del-bg: rgba(248, 81, 73, 0.3);
  }
}
body {
  background: var(--bg);
  color: var(--fg);
  font-family: system-ui, -apple-system, "Hiragino Sans", sans-serif;
  line-height: 1.7;
  margin: 0;
  padding: 2rem 1.25rem 4rem;
  overflow-wrap: break-word;
}
html { scroll-behavior: smooth; }
#layout {
  display: grid;
  grid-template-columns: 200px minmax(0, 700px) 320px;
  gap: 2.5rem;
  max-width: 1300px;
  margin: 0 auto;
  justify-content: center;
}
#side-panel { grid-column: 1; grid-row: 1; }
#content, #diff { grid-column: 2; grid-row: 1; }
#comment-panel { grid-column: 3; grid-row: 1; }
@media (max-width: 980px) {
  #layout { grid-template-columns: minmax(0, 1fr); }
  #content, #diff, #comment-panel, #side-panel { grid-column: 1; grid-row: auto; }
  #comment-panel, #side-panel { position: static; max-height: none; }
}
h1, h2, h3, h4, h5, h6 {
  line-height: 1.35;
  margin: 1.8em 0 0.6em;
  scroll-margin-top: 1rem;
}
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
/* Shiki は文字色だけを CSS 変数で出力する。背景はページ側の --code-bg を使う */
.shiki, .shiki span { color: var(--shiki-light); }
@media (prefers-color-scheme: dark) {
  .shiki, .shiki span { color: var(--shiki-dark); }
}
.shiki .line { display: inline-block; min-width: 100%; }
pre.mermaid { text-align: center; }
pre.mermaid svg { max-width: 100%; height: auto; }
/* 描画前は図の定義がそのまま見えるため、コードブロックとして体裁を整える */
pre.mermaid:not([data-processed]) {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.875em;
  text-align: left;
}
blockquote { margin: 1em 0; padding: 0 1em; color: var(--quote); border-left: 4px solid var(--border); }
table { border-collapse: collapse; display: block; overflow-x: auto; }
th, td { border: 1px solid var(--border); padding: 0.4em 0.8em; }
th { background: var(--code-bg); }
img { max-width: 100%; height: auto; }
hr { border: 0; border-top: 1px solid var(--border); margin: 2em 0; }
ul, ol { padding-left: 1.6em; }
li input[type="checkbox"] { margin-right: 0.4em; }

#view-toolbar {
  max-width: 1300px;
  margin: 0 auto 1.5rem;
  display: flex;
  gap: 0.5rem;
}
#view-toolbar button {
  padding: 0.35em 1.1em;
  border: 1px solid var(--border);
  background: var(--bg);
  color: var(--fg);
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
}
#view-toolbar button.active {
  background: var(--code-bg);
  font-weight: 600;
}

#diff ins { background: var(--ins-bg); text-decoration: none; }
#diff del { background: var(--del-bg); }

#side-panel {
  position: sticky;
  top: 1rem;
  align-self: start;
  max-height: calc(100vh - 2rem);
  overflow-y: auto;
  font-size: 0.85rem;
}
#side-panel h2 {
  font-size: 1rem;
  border-bottom: 1px solid var(--border);
  padding-bottom: 0.3em;
  margin: 0 0 0.8em;
}
#toc ul, #diff-nav ul { list-style: none; padding: 0; margin: 0; }
#toc li { margin: 0.25em 0; }
#toc .toc-level-h2 { padding-left: 1em; }
#toc .toc-level-h3 { padding-left: 2em; }
#toc a { color: var(--fg); text-decoration: none; }
#toc a:hover { color: var(--link); }
.diff-nav-item {
  display: flex;
  gap: 0.5em;
  align-items: baseline;
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 0.35em 0.55em;
  margin-bottom: 0.5em;
  cursor: pointer;
}
.diff-nav-item:hover { border-color: var(--link); }
.diff-nav-kind {
  flex-shrink: 0;
  border-radius: 4px;
  padding: 0 0.4em;
  font-size: 0.78rem;
}
.diff-nav-ins { background: var(--ins-bg); }
.diff-nav-del { background: var(--del-bg); }
.diff-nav-mixed { background: var(--mark-bg); }
.diff-flash { animation: diff-flash 1.5s ease-out; }
@keyframes diff-flash {
  0% { box-shadow: 0 0 0 3px var(--link); }
  100% { box-shadow: 0 0 0 3px transparent; }
}

mark.annotation-mark {
  background: var(--mark-bg);
  color: inherit;
  border-radius: 2px;
  cursor: pointer;
}
mark.annotation-mark.selected { background: var(--mark-selected); }

#comment-panel {
  position: sticky;
  top: 1rem;
  align-self: start;
  max-height: calc(100vh - 2rem);
  overflow-y: auto;
  font-size: 0.85rem;
}
#comment-panel h2 {
  font-size: 1rem;
  border-bottom: 1px solid var(--border);
  padding-bottom: 0.3em;
  margin: 0 0 0.8em;
}
#comment-note { color: var(--quote); margin-bottom: 0.8em; }
#comment-list { padding: 0; margin: 0; }
.comment-card {
  list-style: none;
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 0.6rem 0.75rem;
  margin-bottom: 0.6rem;
  cursor: pointer;
}
.comment-card.selected { border-color: var(--link); }
.comment-card.comment-missing { opacity: 0.6; }
.comment-card blockquote {
  margin: 0 0 0.4rem;
  padding: 0 0 0 0.6em;
  border-left: 3px solid var(--border);
  color: var(--quote);
}
.comment-card p { margin: 0 0 0.4rem; white-space: pre-wrap; }
.comment-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: var(--quote);
  font-size: 0.78rem;
}
.comment-delete {
  border: 1px solid var(--border);
  background: none;
  color: var(--quote);
  border-radius: 4px;
  padding: 0.1em 0.6em;
  cursor: pointer;
  font-size: 0.78rem;
}
.comment-delete:hover { color: #d1242f; border-color: #d1242f; }

#annotate-button {
  position: absolute;
  z-index: 10;
  border: 1px solid var(--border);
  background: var(--bg);
  color: var(--fg);
  border-radius: 6px;
  padding: 0.3em 0.8em;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  font-size: 0.85rem;
}
.comment-popover {
  position: absolute;
  z-index: 20;
  width: 300px;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 0.75rem;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
}
.comment-popover textarea {
  width: 100%;
  box-sizing: border-box;
  background: var(--code-bg);
  color: var(--fg);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 0.5em;
  font: inherit;
  font-size: 0.9rem;
  resize: vertical;
}
.comment-popover-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 0.5rem;
}
.comment-popover-actions button {
  border: 1px solid var(--border);
  background: var(--bg);
  color: var(--fg);
  border-radius: 6px;
  padding: 0.3em 0.9em;
  cursor: pointer;
  font-size: 0.85rem;
}
.comment-popover-actions button.primary {
  background: var(--link);
  border-color: var(--link);
  color: #ffffff;
}
`;

export function renderPage(input: PageInput): string {
  const toolbar =
    input.diffHtml === undefined
      ? ''
      : `<nav id="view-toolbar">
<button type="button" id="view-content-btn" class="active">本文</button>
<button type="button" id="view-diff-btn">前回との差分</button>
</nav>`;
  const diffSection =
    input.diffHtml === undefined
      ? ''
      : `<main id="diff" hidden>
${input.diffHtml}
</main>`;
  return `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(input.title)}</title>
<style>${STYLE}</style>
</head>
<body>
${toolbar}
<div id="layout">
<aside id="side-panel">
<nav id="toc"><h2>目次</h2></nav>
<nav id="diff-nav" hidden><h2>変更箇所</h2></nav>
</aside>
<main id="content">
${input.contentHtml}
</main>
${diffSection}
<aside id="comment-panel">
<h2>コメント</h2>
<div id="comment-note"></div>
<ul id="comment-list"></ul>
</aside>
</div>
<script type="module">
${input.clientJs}
</script>
</body>
</html>
`;
}
