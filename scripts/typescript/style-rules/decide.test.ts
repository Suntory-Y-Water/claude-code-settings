import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { decideStop, decideWrite } from './decide.ts';
import { createSessionStore, type SessionStore } from './session-store.ts';

const SEVERE = '型定義は不可欠である。';
const ANOTHER_SEVERE = '多角的な検討を行う。';
const WARNING = 'これは非常に速い。';
const CLEAN = 'この関数は設定ファイルを読み込む。';
const SESSION_ID = 'test-session';

// 一時ディレクトリは検査対象から外れているため、テスト用のファイルはここに置けない
let workspace: string;
let store: SessionStore;

beforeEach(async () => {
  workspace = await mkdtemp(join(import.meta.dir, '.test-'));
  store = createSessionStore(join(workspace, 'store'));
});

afterEach(async () => {
  await rm(workspace, { recursive: true, force: true });
});

async function writeMarkdown(name: string, text: string): Promise<string> {
  const path = join(workspace, name);
  await Bun.write(path, text);
  return path;
}

function write(filePath: string, writtenText: string) {
  return decideWrite({ filePath, writtenText, sessionId: SESSION_ID }, store);
}

describe('書き込み直後の検査', () => {
  describe('検査する対象', () => {
    test('.md 以外のファイルは検査しないこと', async () => {
      const filePath = await writeMarkdown('note.txt', SEVERE);

      const reason = await write(filePath, SEVERE);

      expect(reason).toBeUndefined();
    });

    test('作業メモの置き場は検査しないこと', async () => {
      const filePath = await writeMarkdown('scratchpad/note.md', SEVERE);

      const reason = await write(filePath, SEVERE);

      expect(reason).toBeUndefined();
    });

    test('取り込んだファイルは検査しないこと', async () => {
      const filePath = await writeMarkdown('node_modules/pkg/note.md', SEVERE);

      const reason = await write(filePath, SEVERE);

      expect(reason).toBeUndefined();
    });

    test('書き込み直後にファイルが消えている時、何もしないこと', async () => {
      const reason = await write(join(workspace, 'missing.md'), SEVERE);

      expect(reason).toBeUndefined();
    });
  });

  describe('検査の結果', () => {
    test('違反が無い時、そのまま通すこと', async () => {
      const filePath = await writeMarkdown('clean.md', CLEAN);

      const reason = await write(filePath, CLEAN);

      expect(reason).toBeUndefined();
    });

    test('違反がある時、該当文と書き直し方を添えて差し戻すこと', async () => {
      const filePath = await writeMarkdown('a.md', SEVERE);

      const reason = await write(filePath, SEVERE);

      expect(reason).toContain(filePath);
      expect(reason).toContain(`[error] ${SEVERE}`);
      expect(reason).toContain('  不可欠: ');
    });

    test('差し替えた断片に含まれる語だけを報告すること', async () => {
      const filePath = await writeMarkdown('a.md', [SEVERE, CLEAN].join('\n'));

      const reason = await write(filePath, CLEAN);

      expect(reason).toBeUndefined();
    });

    test('検査中に例外が起きても、書き込みを妨げないこと', async () => {
      const blocked = createSessionStore(await writeMarkdown('blocker', 'x'));
      const filePath = await writeMarkdown('a.md', SEVERE);

      // decideWrite は例外の内容を stderr に直接書くため、
      // 差し替えないとテスト出力に想定内の診断行が混ざる
      const original = process.stderr.write;
      process.stderr.write = (() => true) as typeof process.stderr.write;
      const reason = await decideWrite(
        { filePath, writtenText: SEVERE, sessionId: SESSION_ID },
        blocked,
      ).finally(() => {
        process.stderr.write = original;
      });

      expect(reason).toBeUndefined();
    });
  });

  describe('ターン終了時への持ち越し', () => {
    test('重大な指摘があった時、該当文がセッションに記録されること', async () => {
      const filePath = await writeMarkdown('a.md', SEVERE);

      await write(filePath, SEVERE);

      expect(await store.read(SESSION_ID)).toEqual([
        { filePath, sentences: [SEVERE] },
      ]);
    });

    test('警告だけの時、記録が残らないこと', async () => {
      const filePath = await writeMarkdown('a.md', WARNING);

      await write(filePath, WARNING);

      expect(await store.read(SESSION_ID)).toEqual([]);
    });

    test('同じファイルに 2 回書き込んだ時、該当文が重複せずに積まれること', async () => {
      const filePath = await writeMarkdown('a.md', SEVERE);
      await write(filePath, SEVERE);
      const updated = [SEVERE, ANOTHER_SEVERE].join('\n');
      await Bun.write(filePath, updated);

      await write(filePath, updated);

      expect(await store.read(SESSION_ID)).toEqual([
        { filePath, sentences: [SEVERE, ANOTHER_SEVERE] },
      ]);
    });

    test('別のファイルの記録は別に積まれること', async () => {
      const first = await writeMarkdown('a.md', SEVERE);
      const second = await writeMarkdown('b.md', ANOTHER_SEVERE);
      await write(first, SEVERE);

      await write(second, ANOTHER_SEVERE);

      expect(await store.read(SESSION_ID)).toHaveLength(2);
    });
  });
});

describe('ターン終了時の確認', () => {
  function stop(stopHookActive = false) {
    return decideStop({ sessionId: SESSION_ID, stopHookActive }, store);
  }

  test('記録が無い時、そのまま終了できること', async () => {
    const reason = await stop();

    expect(reason).toBeUndefined();
  });

  test('記録した該当文がファイルに残っている時、終了させず書き直しを求めること', async () => {
    const filePath = await writeMarkdown('a.md', SEVERE);
    await write(filePath, SEVERE);

    const reason = await stop();

    expect(reason).toContain(filePath);
    expect(reason).toContain(`  ${SEVERE}`);
  });

  test('該当文が書き直されて消えている時、そのまま終了でき、記録も消えること', async () => {
    const filePath = await writeMarkdown('a.md', SEVERE);
    await write(filePath, SEVERE);
    await Bun.write(filePath, CLEAN);

    const reason = await stop();

    expect(reason).toBeUndefined();
    expect(await store.read(SESSION_ID)).toEqual([]);
  });

  test('記録したファイルごと消えている時、そのまま終了できること', async () => {
    const filePath = await writeMarkdown('a.md', SEVERE);
    await write(filePath, SEVERE);
    await rm(filePath);

    const reason = await stop();

    expect(reason).toBeUndefined();
  });

  test('差し戻し文面に載りきらない数の指摘がある時、載らなかった文も示されること', async () => {
    const body = Array.from(
      { length: 10 },
      (_, index) => `項目 ${index + 1} の設定は不可欠である。`,
    ).join('\n\n');
    const lastSentence = '項目 10 の設定は不可欠である。';
    const filePath = await writeMarkdown('a.md', body);
    expect(await write(filePath, body)).not.toContain(lastSentence);

    const reason = await stop();

    expect(reason).toContain(lastSentence);
  });

  test('一度止めても直らなかった時、記録を捨てて終了させること', async () => {
    const filePath = await writeMarkdown('a.md', SEVERE);
    await write(filePath, SEVERE);

    const reason = await stop(true);

    expect(reason).toBeUndefined();
    expect(await store.read(SESSION_ID)).toEqual([]);
  });
});
