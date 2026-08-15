import { readdir, stat, unlink } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';

export interface StoredEntry {
  filePath: string;
  sentences: string[];
}

export interface SessionStore {
  read(sessionId: string): Promise<StoredEntry[]>;
  write(sessionId: string, entries: StoredEntry[]): Promise<void>;
  prune(): Promise<void>;
}

const MAX_SENTENCES_PER_FILE = 20;
const PRUNE_AFTER_MS = 7 * 24 * 60 * 60 * 1000;

export function createSessionStore(root: string): SessionStore {
  const storePath = (sessionId: string): string =>
    join(root, `${sessionId.replaceAll('/', '-')}.json`);

  return {
    async read(sessionId) {
      const file = Bun.file(storePath(sessionId));
      if (!(await file.exists())) {
        return [];
      }
      try {
        const parsed: unknown = await file.json();
        return Array.isArray(parsed) ? (parsed as StoredEntry[]) : [];
      } catch {
        return [];
      }
    },

    async write(sessionId, entries) {
      await Bun.write(storePath(sessionId), JSON.stringify(entries));
    },

    async prune() {
      let names: string[];
      try {
        names = await readdir(root);
      } catch {
        return;
      }
      const limit = Date.now() - PRUNE_AFTER_MS;
      await Promise.all(
        names.map(async (name) => {
          const path = join(root, name);
          try {
            if ((await stat(path)).mtimeMs < limit) {
              await unlink(path);
            }
          } catch {
            // 他プロセスが同時に消した場合は放置してよい
          }
        }),
      );
    },
  };
}

// プロセスを起動するテストから保存先を差し替えるために環境変数を見る
export const sessionStore = createSessionStore(
  process.env.STYLE_CHECK_STORE_ROOT ??
    join(homedir(), '.claude', 'style-check'),
);

export function mergeEntry(
  entries: StoredEntry[],
  filePath: string,
  sentences: string[],
): StoredEntry[] {
  const existing = entries.find((entry) => entry.filePath === filePath);
  if (existing === undefined) {
    return [...entries, { filePath, sentences: [...new Set(sentences)] }];
  }
  const merged = [...new Set([...existing.sentences, ...sentences])];
  return entries.map((entry) =>
    entry.filePath === filePath
      ? { filePath, sentences: merged.slice(-MAX_SENTENCES_PER_FILE) }
      : entry,
  );
}
