import { extname } from 'node:path';
import { runStyleCheck, severeViolations } from './check.ts';
import { formatReport, formatStopReport } from './report.ts';
import { toSentences } from './sanitize.ts';
import {
  mergeEntry,
  type SessionStore,
  type StoredEntry,
  sessionStore,
} from './session-store.ts';

const TARGET_EXTENSION = '.md';
// 一時ディレクトリは作業メモと引き継ぎ書の置き場であり、清書の対象ではない
const EXCLUDED_PATH_SEGMENTS = [
  '/node_modules/',
  '/.git/',
  '/plugins/cache/',
  '/scratchpad/',
  '/tmp/',
  '/var/folders/',
];

export interface WriteInput {
  filePath: string;
  // Edit は差し替えた断片だけを渡す。語の指摘を今回書いた範囲に限るため
  writtenText: string;
  sessionId: string;
}

export interface StopInput {
  sessionId: string;
  stopHookActive: boolean;
}

async function inspectWrite(
  input: WriteInput,
  store: SessionStore,
): Promise<string | undefined> {
  if (extname(input.filePath).toLowerCase() !== TARGET_EXTENSION) {
    return undefined;
  }
  if (
    EXCLUDED_PATH_SEGMENTS.some((segment) => input.filePath.includes(segment))
  ) {
    return undefined;
  }
  const file = Bun.file(input.filePath);
  if (!(await file.exists())) {
    return undefined;
  }

  const violations = await runStyleCheck({
    source: await file.text(),
    writtenText: input.writtenText,
  });
  if (violations.length === 0) {
    return undefined;
  }

  const severe = severeViolations(violations);
  if (severe.length > 0) {
    await store.prune();
    const entries = mergeEntry(
      await store.read(input.sessionId),
      input.filePath,
      severe.map((violation) => violation.sentence),
    );
    await store.write(input.sessionId, entries);
  }
  return formatReport(input.filePath, violations);
}

// PostToolUse で記録した該当文がまだファイルに残っているかだけを見る。
// 書き直されれば文ごと消えるので、再検査せずに解消を判定できる
async function unresolved(
  entry: StoredEntry,
): Promise<StoredEntry | undefined> {
  const file = Bun.file(entry.filePath);
  if (!(await file.exists())) {
    return undefined;
  }
  const current = new Set(
    toSentences(await file.text()).map((sentence) => sentence.text),
  );
  const sentences = entry.sentences.filter((sentence) => current.has(sentence));
  return sentences.length === 0
    ? undefined
    : { filePath: entry.filePath, sentences };
}

async function inspectStop(
  input: StopInput,
  store: SessionStore,
): Promise<string | undefined> {
  const entries = await store.read(input.sessionId);
  if (entries.length === 0) {
    return undefined;
  }

  // 一度止めても直らなかった時点で降参する。記録を消さないと次のターンも止め続ける
  if (input.stopHookActive) {
    await store.write(input.sessionId, []);
    return undefined;
  }

  const remaining = (await Promise.all(entries.map(unresolved))).filter(
    (entry) => entry !== undefined,
  );
  await store.write(input.sessionId, remaining);
  return remaining.length === 0 ? undefined : formatStopReport(remaining);
}

// 検査の失敗で書き込みやターンの終了を妨げない。理由は debug log にだけ残す
async function quiet(
  label: string,
  inspect: () => Promise<string | undefined>,
): Promise<string | undefined> {
  try {
    return await inspect();
  } catch (err) {
    process.stderr.write(
      `[${label}] ${err instanceof Error ? err.message : String(err)}\n`,
    );
    return undefined;
  }
}

export function decideWrite(
  input: WriteInput,
  store: SessionStore = sessionStore,
): Promise<string | undefined> {
  return quiet('style-check', () => inspectWrite(input, store));
}

export function decideStop(
  input: StopInput,
  store: SessionStore = sessionStore,
): Promise<string | undefined> {
  return quiet('style-check-stop', () => inspectStop(input, store));
}
