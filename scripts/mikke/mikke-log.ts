#!/usr/bin/env bun
import { spawnSync } from 'node:child_process';
import { homedir } from 'node:os';
import { isAbsolute, join, resolve } from 'pathe';

const ALL_RESULTS_LIMIT = 10_000;
const PROJECT_FILTER_COMMANDS = new Set(['find', 'semantic', 'hybrid']);

type JsonObject = Record<string, unknown>;

function expandHome(path: string): string {
  if (path === '~') {
    return homedir();
  }
  if (path.startsWith('~/') || path.startsWith('~\\')) {
    return join(homedir(), path.slice(2));
  }
  return path;
}

function absoluteRoot(): string {
  return resolve(
    expandHome(process.env.MIKKE_LOG_ROOT ?? join(homedir(), '.claude')),
  );
}

function absolutePath(root: string, path: string): string {
  return isAbsolute(path) ? path : resolve(root, path);
}

function rewritePaths(stdout: string, root: string, json: boolean): string {
  if (json) {
    return stdout
      .split('\n')
      .map((line) => {
        if (!line) {
          return line;
        }
        const value: unknown = JSON.parse(line);
        if (
          typeof value === 'object' &&
          value !== null &&
          typeof Reflect.get(value, 'path') === 'string'
        ) {
          Reflect.set(
            value,
            'path',
            absolutePath(root, Reflect.get(value, 'path')),
          );
        }
        return JSON.stringify(value);
      })
      .join('\n');
  }

  return stdout
    .split('\n')
    .map((line) =>
      line.replace(/^(\s+path:\s+)(.+)$/, (_match, prefix, path) => {
        return `${prefix}${absolutePath(root, path)}`;
      }),
    )
    .join('\n');
}

function takeOption(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);
  if (index === -1) {
    return undefined;
  }
  const value = args[index + 1];
  if (!value || value.startsWith('--')) {
    throw new Error(`${name} には値が必要です`);
  }
  args.splice(index, 2);
  return value;
}

function takeFlag(args: string[], name: string): boolean {
  const index = args.indexOf(name);
  if (index === -1) {
    return false;
  }
  args.splice(index, 1);
  return true;
}

function takeTop(args: string[]): number | undefined {
  const raw = takeOption(args, '--top');
  if (raw === undefined) {
    return undefined;
  }
  const value = Number.parseInt(raw, 10);
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error('--top には正の整数が必要です');
  }
  return value;
}

function runMikke(root: string, args: string[]) {
  return spawnSync('mikke', ['--root', root, ...args], {
    encoding: 'utf-8',
    maxBuffer: 50 * 1024 * 1024,
  });
}

function parseJsonLines(stdout: string): JsonObject[] {
  return stdout
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line) as JsonObject);
}

function formatHits(
  command: string,
  project: string,
  meta: JsonObject,
  hits: JsonObject[],
): string {
  const order =
    meta.order === 'date'
      ? ', date 降順'
      : command === 'find'
        ? ', BM25 relevance 順'
        : '';
  const lines = [
    `${command}検索 (project: '${project}') の結果 (${hits.length}件${order}):`,
    '',
  ];

  for (const hit of hits) {
    const score =
      typeof hit.score === 'number'
        ? `  [score: ${hit.score.toFixed(4)}${typeof hit.via === 'string' ? ` via ${hit.via}` : ''}]`
        : '';
    lines.push(
      `  ${String(hit.title ?? '')} (${String(hit.date ?? '')})${score}`,
    );
    lines.push(`    path: ${String(hit.path ?? '')}`);
    lines.push(
      `    tags: ${Array.isArray(hit.tags) ? hit.tags.join(', ') : ''}`,
    );
    lines.push(
      `    summary: ${String(hit.summary || '(なし — 要約未設定。内容は path を開いて確認)')}`,
    );
    lines.push('');
  }
  return `${lines.join('\n')}\n`;
}

function addHelp(stdout: string, args: string[]): string {
  if (!args.includes('--help') && args.at(0) !== 'help') {
    return stdout;
  }
  return `${stdout.trimEnd()}\n\nmikke-log extensions:\n  検索結果の path は実行環境の絶対パスで出力する\n  find|semantic|hybrid --project <tag> ...  タグ完全一致でプロジェクトを絞る\n`;
}

function run(): number {
  const root = absoluteRoot();
  const originalArgs = process.argv.slice(2);
  const args = [...originalArgs];

  let project: string | undefined;
  try {
    project = takeOption(args, '--project');
  } catch (error) {
    process.stderr.write(`mikke-log: ${String(error)}\n`);
    return 2;
  }

  if (!project) {
    const result = runMikke(root, args);
    if (result.error) {
      process.stderr.write(`mikke-log: ${result.error.message}\n`);
      return 2;
    }
    process.stderr.write(result.stderr);
    try {
      const rewritten = rewritePaths(
        result.stdout,
        root,
        args.includes('--json'),
      );
      process.stdout.write(addHelp(rewritten, originalArgs));
    } catch (error) {
      process.stderr.write(`mikke-log: 出力の変換に失敗: ${String(error)}\n`);
      return 2;
    }
    return result.status ?? 2;
  }

  const command = args.at(0);
  if (!command || !PROJECT_FILTER_COMMANDS.has(command)) {
    process.stderr.write(
      'mikke-log: --project は find / semantic / hybrid で使用してください\n',
    );
    return 2;
  }

  const wantsJson = takeFlag(args, '--json');
  let requestedTop: number | undefined;
  try {
    if (command === 'semantic' || command === 'hybrid') {
      requestedTop = takeTop(args) ?? 5;
      args.push('--top', String(ALL_RESULTS_LIMIT));
    }
  } catch (error) {
    process.stderr.write(`mikke-log: ${String(error)}\n`);
    return 2;
  }
  args.push('--json');

  const result = runMikke(root, args);
  process.stderr.write(result.stderr);
  if (result.error) {
    process.stderr.write(`mikke-log: ${result.error.message}\n`);
    return 2;
  }
  if ((result.status ?? 2) >= 2) {
    process.stdout.write(result.stdout);
    return result.status ?? 2;
  }

  try {
    const [rawMeta, ...rawHits] = parseJsonLines(result.stdout);
    const meta = rawMeta ?? { type: 'meta', command };
    let hits = rawHits.filter(
      (hit) => Array.isArray(hit.tags) && hit.tags.includes(project),
    );
    if (requestedTop !== undefined) {
      hits = hits.slice(0, requestedTop);
    }
    hits = hits.map((hit) => ({
      ...hit,
      path:
        typeof hit.path === 'string' ? absolutePath(root, hit.path) : hit.path,
    }));
    meta.count = hits.length;

    if (wantsJson) {
      process.stdout.write(
        `${[meta, ...hits].map((value) => JSON.stringify(value)).join('\n')}\n`,
      );
    } else {
      process.stdout.write(formatHits(command, project, meta, hits));
    }
    return hits.length > 0 ? 0 : 1;
  } catch (error) {
    process.stderr.write(`mikke-log: JSON出力の処理に失敗: ${String(error)}\n`);
    return 2;
  }
}

if (import.meta.main) {
  process.exitCode = run();
}
