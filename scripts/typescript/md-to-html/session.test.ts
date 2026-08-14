import { mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'bun:test';
import { readInjectedIds, recordInjectedIds } from './session.ts';
import { OUTPUT_ROOT } from './shared.ts';

const SESSION_DIR = join(OUTPUT_ROOT, '.sessions');

function sessionFile(sanitizedId: string): string {
  return join(SESSION_DIR, `${sanitizedId}.json`);
}

const CREATED_SESSION_FILES = [
  sessionFile('__test_session__record'),
  sessionFile('__test_session__append'),
  sessionFile('__test_session__dedup'),
  sessionFile('__test_session__broken'),
  sessionFile('__test_session__mix_a'),
  sessionFile('__test_session__mix_b'),
  sessionFile('__test_session_________evil'),
];

afterAll(async () => {
  for (const path of CREATED_SESSION_FILES) {
    await rm(path, { force: true });
  }
});

describe('提示済みコメントの記録', () => {
  it('記録がない場合、提示済みのコメントがないこと', async () => {
    const sessionId = '__test_session__empty';

    const ids = await readInjectedIds(sessionId);

    expect(ids).toEqual(new Set());
  });

  it('記録した id が提示済みとして読み出せること', async () => {
    const sessionId = '__test_session__record';
    await recordInjectedIds(sessionId, ['comment-1']);

    const ids = await readInjectedIds(sessionId);

    expect(ids).toEqual(new Set(['comment-1']));
  });

  it('続けて記録した場合、先に記録した id も残っていること', async () => {
    const sessionId = '__test_session__append';
    await recordInjectedIds(sessionId, ['comment-1']);

    await recordInjectedIds(sessionId, ['comment-2']);

    const ids = await readInjectedIds(sessionId);
    expect(ids).toEqual(new Set(['comment-1', 'comment-2']));
  });

  it('同じ id を重ねて記録しても、重複せずに保たれること', async () => {
    const sessionId = '__test_session__dedup';
    await recordInjectedIds(sessionId, ['comment-1']);

    await recordInjectedIds(sessionId, ['comment-1']);

    const raw = (await Bun.file(sessionFile(sessionId)).json()) as {
      injectedIds: string[];
    };
    expect(raw.injectedIds).toEqual(['comment-1']);
  });

  it('記録ファイルが壊れている場合、提示済みのコメントがないものとして扱うこと', async () => {
    const sessionId = '__test_session__broken';
    await mkdir(SESSION_DIR, { recursive: true });
    await Bun.write(sessionFile(sessionId), '{');

    const ids = await readInjectedIds(sessionId);

    expect(ids).toEqual(new Set());
  });

  it('セッションが違う場合、記録が混ざらないこと', async () => {
    const sessionA = '__test_session__mix_a';
    const sessionB = '__test_session__mix_b';
    await recordInjectedIds(sessionA, ['comment-a']);

    await recordInjectedIds(sessionB, ['comment-b']);

    const idsA = await readInjectedIds(sessionA);
    const idsB = await readInjectedIds(sessionB);
    expect(idsA).toEqual(new Set(['comment-a']));
    expect(idsB).toEqual(new Set(['comment-b']));
  });

  it('パス区切りを含むセッション ID でも、記録先が保存ディレクトリの外に出ないこと', async () => {
    const maliciousId = '__test_session__/../../evil';
    const expectedPath = sessionFile('__test_session_________evil');

    await recordInjectedIds(maliciousId, ['comment-1']);

    expect(await Bun.file(expectedPath).exists()).toBe(true);
    expect(await Bun.file(join(OUTPUT_ROOT, 'evil.json')).exists()).toBe(false);
  });
});
