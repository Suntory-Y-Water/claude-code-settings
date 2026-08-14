import { describe, expect, it } from 'bun:test';
import { micromark } from 'micromark';
import { gfm, gfmHtml } from 'micromark-extension-gfm';
import { brokenByEdit, renderBodyDiff } from './md-to-html.ts';
import type { Annotation } from './md-to-html/shared.ts';

function toHtml(body: string): string {
  return micromark(body, {
    extensions: [gfm()],
    htmlExtensions: [gfmHtml()],
  });
}

function createAnnotation(overrides: Partial<Annotation> = {}): Annotation {
  return {
    id: 'test-id',
    exact: '',
    prefix: '',
    suffix: '',
    comment: 'テストコメント',
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('編集によるコメント位置の劣化検知', () => {
  it('編集前は見つかっていた引用が見つからなくなった場合、対象に含まれること', () => {
    const previousBody = 'これは元の文章です。';
    const body = 'これは新しい文章です。';
    const annotation = createAnnotation({ exact: '元の文章' });

    const result = brokenByEdit(previousBody, body, [annotation]);

    expect(result).toEqual([annotation]);
  });

  it('編集で位置を再特定するしかなくなった引用も、対象に含まれること', () => {
    const previousBody = '前の文脈です。元の引用文です。後の文脈です。';
    const body = '前の文脈です。新しい引用文です。後の文脈です。';
    const annotation = createAnnotation({
      exact: '元の引用文',
      prefix: '前の文脈です',
      suffix: '後の文脈です',
    });

    const result = brokenByEdit(previousBody, body, [annotation]);

    expect(result).toEqual([annotation]);
  });

  it('編集前から既に見つからなかった引用は、対象に含まれないこと', () => {
    const previousBody = 'まったく関係のない文章です。';
    const body = 'これも関係ない文章です。';
    const annotation = createAnnotation({ exact: '存在しない引用' });

    const result = brokenByEdit(previousBody, body, [annotation]);

    expect(result).toEqual([]);
  });

  it('編集の影響を受けなかった引用は、対象に含まれないこと', () => {
    const previousBody = '不変の文章はここにあります。';
    const body = '不変の文章はここにあります。追加した文章です。';
    const annotation = createAnnotation({
      exact: '不変の文章はここにあります',
    });

    const result = brokenByEdit(previousBody, body, [annotation]);

    expect(result).toEqual([]);
  });

  it('比較対象の前回内容がない場合、何も対象にしないこと', () => {
    const body = 'これは文章です。';
    const annotation = createAnnotation({ exact: 'これは文章です' });

    const result = brokenByEdit(undefined, body, [annotation]);

    expect(result).toEqual([]);
  });

  it('複数のコメントのうち、劣化したものだけが対象になること', () => {
    const previousBody = 'これは元の文章です。不変の文章はここにあります。';
    const body =
      'これは新しい文章です。不変の文章はここにあります。追加した文章です。';
    const degraded = createAnnotation({ id: 'degraded', exact: '元の文章' });
    const unaffected = createAnnotation({
      id: 'unaffected',
      exact: '不変の文章はここにあります',
    });

    const result = brokenByEdit(previousBody, body, [degraded, unaffected]);

    expect(result).toEqual([degraded]);
  });
});

describe('視覚差分の生成', () => {
  it('比較の基準がない初回の変換では、差分を出さないこと', () => {
    const body = 'これは本文です。';

    const result = renderBodyDiff(undefined, body, toHtml(body));

    expect(result).toBeUndefined();
  });

  it('基準から内容が変わっていない場合、差分を出さないこと', () => {
    const previousBody = 'これは本文です。';
    const body = 'これは本文です。';

    const result = renderBodyDiff(previousBody, body, toHtml(body));

    expect(result).toBeUndefined();
  });

  it('内容が変わった場合、追加された箇所が印で囲まれること', () => {
    const previousBody = 'これは本文です。';
    const body = 'これは本文です。ADDEDWORD。';

    const result = renderBodyDiff(previousBody, body, toHtml(body));

    expect(result).toContain('<ins');
    expect(result?.match(/<ins[^>]*>(.*?)<\/ins>/)?.[1]).toContain('ADDEDWORD');
  });

  it('内容が変わった場合、削除された箇所が印で囲まれること', () => {
    const previousBody = 'これは本文です。REMOVEDWORD。';
    const body = 'これは本文です。';

    const result = renderBodyDiff(previousBody, body, toHtml(body));

    expect(result).toContain('<del');
    expect(result?.match(/<del[^>]*>(.*?)<\/del>/)?.[1]).toContain(
      'REMOVEDWORD',
    );
  });
});
