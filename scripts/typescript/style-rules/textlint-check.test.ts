import { describe, expect, test } from 'bun:test';
import { runStyleCheck } from './check.ts';
import {
  isFileScopedRuleId,
  type TextlintRuleId,
  textlintRules,
  type Violation,
} from './rules.ts';

function check(source: string): Promise<Violation[]> {
  return runStyleCheck({ source });
}

function ofRule(violations: Violation[], ruleId: string): Violation[] {
  return violations.filter((violation) => violation.ruleId === ruleId);
}

// textlint 側のルールと 1 対 1 で対応させる。例文の無いルールを足すと型検査が落ちる
const hitCases = {
  'no-ai-list-formatting': ['- ✅ 完了した項目', '✅'],
  'no-ai-emphasis-patterns': ['# **重要なお知らせ**', '強調の書式'],
  'no-ai-hype-expressions': ['革命的な技術を投入する。', '革命的な'],
  'no-ai-colon-continuation': ['実行します:\n\n- 項目', '実行します'],
  'ai-tech-writing-guideline': [
    '設定を操作する必要があります。',
    '簡潔性/冗長な義務表現',
  ],
} as const satisfies Record<TextlintRuleId, readonly [string, string]>;

const hitRows: [string, string, string][] = Object.entries(hitCases).map(
  ([ruleId, [source, matched]]) => [ruleId, source, matched],
);

describe('textlint のルール', () => {
  test.each(
    hitRows,
  )('%s に当たる書き方をした時、検出されること', async (ruleId, source, matched) => {
    const violations = await check(source);

    expect(ofRule(violations, ruleId)[0]?.matched).toBe(matched);
  });

  test('リストの太字とコロンは SKILL.md の標準形なので検出しないこと', async () => {
    const violations = await check('- **項目**: 説明を書く');

    expect(violations).toEqual([]);
  });

  test('名詞で終わるコロンは自然な日本語として検出しないこと', async () => {
    const violations = await check('使用方法:\n\n- 項目');

    expect(ofRule(violations, 'no-ai-colon-continuation')).toEqual([]);
  });

  test('同じ行に複数の文がある時、該当する文だけを指摘すること', async () => {
    const violations = await check(
      '設定を操作する必要があります。必要に応じてグループ化します。',
    );

    expect(ofRule(violations, 'ai-tech-writing-guideline')).toContainEqual(
      expect.objectContaining({
        matched: '具体性/曖昧な条件表現',
        sentence: '必要に応じてグループ化します。',
      }),
    );
  });

  test('文書全体のサマリは該当文を持たないので報告しないこと', async () => {
    const violations = await check(
      [
        '設定を操作する必要があります。',
        '値を確認することができます。',
        'まず最初に手順を読みます。',
      ].join('\n\n'),
    );

    expect(
      violations.every((violation) => !violation.matched.includes('品質分析')),
    ).toBe(true);
  });

  test('同じルールが 3 文に当たる時、2 文で打ち切ること', async () => {
    const source = [
      '革命的な技術を投入する。',
      '究極の体験を提供する。',
      '世界初の仕組みを載せる。',
    ].join('\n\n');

    const violations = await check(source);

    expect(ofRule(violations, 'no-ai-hype-expressions')).toHaveLength(2);
  });

  test('指摘に検出内容・該当文・書き直し方が揃うこと', async () => {
    const violations = await check('革命的な技術を投入する。');

    expect(ofRule(violations, 'no-ai-hype-expressions')[0]).toMatchObject({
      severity: 'warning',
      matched: '革命的な',
      sentence: '革命的な技術を投入する。',
    });
  });

  test('ファイル全体を見る規則として、再送の抑制対象になること', async () => {
    for (const ruleId of Object.keys(textlintRules) as TextlintRuleId[]) {
      expect(isFileScopedRuleId(ruleId)).toBe(true);
    }
  });

  test('日本語を含まない文書には textlint をかけないこと', async () => {
    const violations = await check('# **Important Notice**\n\n- ✅ done\n');

    expect(violations).toEqual([]);
  });
});
