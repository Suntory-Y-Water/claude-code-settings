import { describe, expect, test } from 'bun:test';
import { runStyleCheck, severeViolations } from './check.ts';
import { type Violation, type WordRuleId, wordRules } from './rules.ts';

function check(source: string, writtenText?: string): Promise<Violation[]> {
  return runStyleCheck({ source, writtenText });
}

function ofRule(violations: Violation[], ruleId: string): Violation[] {
  return violations.filter((violation) => violation.ruleId === ruleId);
}

const wordRuleIds: Set<string> = new Set(wordRules.map((rule) => rule.id));

function wordViolations(violations: Violation[]): Violation[] {
  return violations.filter((violation) => wordRuleIds.has(violation.ruleId));
}

// 語ルールと 1 対 1 で対応させる。例文の無いルールを足すと型検査が落ちる
const hitCases = {
  'empty-adjective-emphasis': ['型定義は不可欠である。', '不可欠'],
  'empty-adjective-coverage': ['多角的な検討を行う。', '多角的'],
  'front-facing': ['この前提を正面から回収する。', '正面から回収する'],
  dash: ['設計—実装の順で進める。', '—'],
  kikimasu: ['この設定が効きます。', '効きます'],
  preview: ['本章では設計を扱う。', '本章では'],
  summary: ['まとめると、原因は設定である。', 'まとめると'],
  explore: ['この問題を探求する。', '探求する'],
  'empty-verb-dig': ['原因を掘り下げる。', '掘り下げる'],
  'empty-verb-touch': ['失敗例に触れる。', '触れる'],
  'connective-frame': ['この設定において問題が起きる。', 'において'],
  'connective-additive': ['また、実行時間を測った。', 'また、'],
  'weak-hedge': ['これは速いと言えるだろう。', 'と言えるだろう'],
  'empty-emphasis': ['これは非常に速い。', '非常に'],
  masani: ['まさにその通りである。', 'まさに'],
  'jargon-trap': ['これは設定の罠である。', '罠'],
  'jargon-technique': ['これは便利なテクである。', 'テク'],
  dismissive: ['この案はカスである。', 'カス'],
  'calm-down': [
    '少し冷静になって考えると、原因は設定である。',
    '少し冷静になって考えると',
  ],
} as const satisfies Record<WordRuleId, readonly [string, string]>;

const hitRows: [string, string, string][] = Object.entries(hitCases).map(
  ([ruleId, [sentence, matched]]) => [ruleId, sentence, matched],
);

const missCases: [WordRuleId, string][] = [
  ['front-facing', '正面から取り組む。'],
  ['dash', '設計-実装の順で進める。'],
  ['kikimasu', 'この設定は効きません。'],
  ['preview', 'ここでは設定を確認する。'],
  ['connective-additive', 'また会う日まで待つ。'],
  ['connective-additive', 'これはまた、別の話である。'],
  ['jargon-technique', 'これは便利なテクニックである。'],
  ['dismissive', 'カスタム設定を使う。'],
];

describe('語のルール', () => {
  test.each(
    hitRows,
  )('%s の語を地の文に書いた時、検出されること', async (ruleId, sentence, matched) => {
    const violations = await check(sentence);

    expect(ofRule(violations, ruleId)[0]?.matched).toBe(matched);
  });

  test.each(
    missCases,
  )('%s の除外に当たる語を書いた時、検出されないこと', async (ruleId, sentence) => {
    const violations = await check(sentence);

    expect(ofRule(violations, ruleId)).toEqual([]);
  });

  test('禁止語を含まない地の文からは、語の指摘が出ないこと', async () => {
    const source = [
      'この関数は設定ファイルを読み込む。',
      '見つからない場合は既定値を返す。',
    ].join('\n');

    const violations = await check(source);

    expect(wordViolations(violations)).toEqual([]);
  });

  test('指摘に検出語・該当文・書き直し方が揃うこと', async () => {
    const violations = await check('型定義は不可欠である。');

    expect(violations[0]).toMatchObject({
      severity: 'severe',
      matched: '不可欠',
      sentence: '型定義は不可欠である。',
    });
    expect(violations[0]?.good).not.toBe('');
  });

  test('同じ severe が 3 文に当たる時、打ち切らずに全て報告すること', async () => {
    const source = [
      '型定義は不可欠である。',
      '設定ファイルは不可欠である。',
      '疎通確認は不可欠である。',
    ].join('\n\n');

    const violations = await check(source);

    expect(ofRule(violations, 'empty-adjective-emphasis')).toHaveLength(3);
  });

  test('同じ warning が 3 文に当たる時、2 文で打ち切ること', async () => {
    const source = [
      'この処理は非常に速い。',
      'あの処理も非常に軽い。',
      'どの処理も非常に短い。',
    ].join('\n\n');

    const violations = await check(source);

    expect(ofRule(violations, 'empty-emphasis')).toHaveLength(2);
  });
});

describe('検査しない箇所', () => {
  test('コードブロックの中に禁止語があっても検出しないこと', async () => {
    const source = [
      '本文です。',
      '```ts',
      'const label = "不可欠";',
      '```',
    ].join('\n');

    const violations = await check(source);

    expect(ofRule(violations, 'empty-adjective-emphasis')).toEqual([]);
  });

  test('インラインコードで囲んだ禁止語を検出しないこと', async () => {
    const violations = await check('設定の名前は `不可欠` と書く。');

    expect(ofRule(violations, 'empty-adjective-emphasis')).toEqual([]);
  });

  test('URL に含まれる記号を検出しないこと', async () => {
    const violations = await check('詳細は https://example.com/a—b にある。');

    expect(ofRule(violations, 'dash')).toEqual([]);
  });

  test('ファイルパスで終わる文を体言止めとしないこと', async () => {
    const violations = await check('保存先は ~/.claude/style-check。');

    expect(ofRule(violations, 'taigendome')).toEqual([]);
  });

  test('フロントマターの中を検出しないこと', async () => {
    const source = ['---', 'title: 不可欠な話', '---', '本文です。'].join('\n');

    const violations = await check(source);

    expect(ofRule(violations, 'empty-adjective-emphasis')).toEqual([]);
  });

  test('HTML コメントの中を検出しないこと', async () => {
    const source = ['<!--', '不可欠なメモ', '-->', '本文です。'].join('\n');

    const violations = await check(source);

    expect(ofRule(violations, 'empty-adjective-emphasis')).toEqual([]);
  });

  test('本文中の水平線より後も検査されること', async () => {
    const source = ['前の文です。', '---', '型定義は不可欠である。'].join('\n');

    const violations = await check(source);

    expect(ofRule(violations, 'empty-adjective-emphasis')).toHaveLength(1);
  });

  test('日本語を含まないファイルは検査しないこと', async () => {
    const source = ['# Setup', '', 'Run the installer — then reboot.'].join(
      '\n',
    );

    const violations = await check(source);

    expect(violations).toEqual([]);
  });
});

describe('書いた範囲での絞り込み', () => {
  const source = ['型定義は不可欠である。', '結果を保存する。'].join('\n');

  test('差し替えた断片に無い語は報告しないこと', async () => {
    const violations = await check(source, '結果を保存する。');

    expect(wordViolations(violations)).toEqual([]);
  });

  test('差し替えた断片にある語は報告すること', async () => {
    const violations = await check(source, '型定義は不可欠である。');

    expect(ofRule(violations, 'empty-adjective-emphasis')).toHaveLength(1);
  });

  test('文書全体の集計は差し替えた断片で絞り込まないこと', async () => {
    const polite = [
      '設定を検索します。',
      '結果を保存します。',
      '一覧を表示します。',
    ].join('\n');

    const violations = await check(polite, '一覧を表示します。');

    expect(ofRule(violations, 'sentence-ending-repeat')).toHaveLength(1);
  });
});

describe('文末の重複', () => {
  test('敬体の同じ文末が 3 文続いた時、連続した文が示されること', async () => {
    const source = [
      '設定を検索します。',
      '結果を保存します。',
      '一覧を表示します。',
    ].join('\n');

    const violations = await check(source);

    const hit = ofRule(violations, 'sentence-ending-repeat')[0];
    expect(hit?.matched).toContain('3 連続');
    expect(hit?.sentence).toContain('一覧を表示します。');
  });

  test('敬体の同じ文末が 2 文で途切れる時、指摘されないこと', async () => {
    const source = ['設定を検索します。', '結果を保存します。'].join('\n');

    const violations = await check(source);

    expect(ofRule(violations, 'sentence-ending-repeat')).toEqual([]);
  });

  test('箇条書きの行は文末の連続に数えないこと', async () => {
    const source = [
      '- 設定を検索します。',
      '- 結果を保存します。',
      '- 一覧を表示します。',
    ].join('\n');

    const violations = await check(source);

    expect(ofRule(violations, 'sentence-ending-repeat')).toEqual([]);
  });

  test('常体の同じ文末が続いても指摘されないこと', async () => {
    const source = [
      '設定を検索する。',
      '結果を保存する。',
      '一覧を表示する。',
    ].join('\n');

    const violations = await check(source);

    expect(ofRule(violations, 'sentence-ending-repeat')).toEqual([]);
  });
});

describe('敬体と常体の混在', () => {
  test('敬体と常体が混ざる時、少ない方の文が示されること', async () => {
    const source = [
      '設定を検索します。',
      '結果を保存する。',
      '一覧を表示する。',
    ].join('\n');

    const violations = await check(source);

    const hit = ofRule(violations, 'polite-plain-mixed')[0];
    expect(hit?.matched).toContain('敬体 1 文 / 常体 2 文');
    expect(hit?.sentence).toBe('設定を検索します。');
  });

  test('敬体だけの時、指摘されないこと', async () => {
    const source = ['設定を検索します。', '結果を保存しました。'].join('\n');

    const violations = await check(source);

    expect(ofRule(violations, 'polite-plain-mixed')).toEqual([]);
  });

  test('常体だけの時、指摘されないこと', async () => {
    const source = ['設定を検索する。', '結果を保存した。'].join('\n');

    const violations = await check(source);

    expect(ofRule(violations, 'polite-plain-mixed')).toEqual([]);
  });

  test('見出し・箇条書き・表・引用の文体は数えないこと', async () => {
    const source = [
      '# 設定を検索します。',
      '- 結果を保存します。',
      '| 一覧を表示します。 |',
      '> 記録を残します。',
      '本文を書く。',
    ].join('\n');

    const violations = await check(source);

    expect(ofRule(violations, 'polite-plain-mixed')).toEqual([]);
  });
});

describe('「ではなく」の多用', () => {
  const line = (index: number) => `${index} 番は A ではなく B を選ぶ。`;

  test('1 ファイルに 4 回出た時、回数と該当文が示されること', async () => {
    const source = [line(1), line(2), line(3), line(4)].join('\n');

    const violations = await check(source);

    const hit = ofRule(violations, 'dewanaku-overuse')[0];
    expect(hit?.matched).toContain('4 回');
    expect(hit?.sentence).toContain(line(1));
  });

  test('3 回までは指摘されないこと', async () => {
    const source = [line(1), line(2), line(3)].join('\n');

    const violations = await check(source);

    expect(ofRule(violations, 'dewanaku-overuse')).toEqual([]);
  });

  test('1 文に 2 回出た場合も 2 回として数えること', async () => {
    const twice = 'A ではなく B、C ではなく D を選ぶ。';
    const source = [twice, twice].join('\n');

    const violations = await check(source);

    expect(ofRule(violations, 'dewanaku-overuse')[0]?.matched).toContain(
      '4 回',
    );
  });

  test('見出し・箇条書き・表・引用の「ではなく」は数えないこと', async () => {
    const source = [
      `# ${line(1)}`,
      `- ${line(2)}`,
      `| ${line(3)} |`,
      `> ${line(4)}`,
    ].join('\n');

    const violations = await check(source);

    expect(ofRule(violations, 'dewanaku-overuse')).toEqual([]);
  });
});

describe('体言止め', () => {
  test('地の文が名詞で終わる時、該当文が示されること', async () => {
    const violations = await check('原因はロックの競合。');

    expect(ofRule(violations, 'taigendome')[0]?.sentence).toBe(
      '原因はロックの競合。',
    );
  });

  test('述語で言い切る文は指摘されないこと', async () => {
    const violations = await check('原因はロックが競合したことである。');

    expect(ofRule(violations, 'taigendome')).toEqual([]);
  });

  test('箇条書きの体言止めは指摘されないこと', async () => {
    const violations = await check('- 原因はロックの競合。');

    expect(ofRule(violations, 'taigendome')).toEqual([]);
  });
});

describe('重大度', () => {
  test('重大なルールに当たった文だけが重大として取り出せること', async () => {
    const source = ['型定義は不可欠である。', 'これは非常に速い。'].join('\n');

    const severe = severeViolations(await check(source));

    expect(severe.map((violation) => violation.sentence)).toEqual([
      '型定義は不可欠である。',
    ]);
  });

  test('文書全体の集計は重大にならないこと', async () => {
    const source = [
      '設定を検索します。',
      '結果を保存します。',
      '一覧を表示します。',
    ].join('\n');

    const severe = severeViolations(await check(source));

    expect(severe).toEqual([]);
  });
});
