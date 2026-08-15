import { describe, expect, test } from 'bun:test';
import { formatReport, formatStopReport } from './report.ts';
import type { Violation } from './rules.ts';

const severe: Violation = {
  ruleId: 'empty-adjective-emphasis',
  category: '空虚な形容',
  severity: 'severe',
  matched: '不可欠',
  sentence: '型定義は不可欠である。',
  good: '何が無いと何ができなくなるかを書く',
};

const warning: Violation = {
  ruleId: 'empty-emphasis',
  category: '空虚な強調',
  severity: 'warning',
  matched: '非常に',
  sentence: 'これは非常に速い。',
  good: '数値か比較対象を書く',
};

describe('差し戻しの文面', () => {
  test('重大と警告の件数が示されること', () => {
    const report = formatReport('/a/b.md', [warning, severe]);

    expect(report).toContain('重大 1 件 / 警告 1 件');
    expect(report).toContain(`該当文: ${severe.sentence}`);
    expect(report).toContain(`書き直し方: ${warning.good}`);
  });

  test('重大が先に並ぶこと', () => {
    const report = formatReport('/a/b.md', [warning, severe]);

    expect(report.indexOf('[重大]')).toBeLessThan(report.indexOf('[警告]'));
  });

  test('語だけの置換を禁じる指示が入ること', () => {
    const report = formatReport('/a/b.md', [severe]);

    expect(report).toContain('検出語だけを別の語に置き換える直し方は禁止です');
  });

  test('指摘が多い時、打ち切って省略件数が示されること', () => {
    const many = Array.from({ length: 30 }, (_, index) => ({
      ...warning,
      sentence: `${index + 1} 番の文です。`,
    }));

    const report = formatReport('/a/b.md', many);

    expect(report).toContain('件は省略しました。');
    expect(report).not.toContain('30 番の文です。');
  });
});

describe('ターン終了時の文面', () => {
  test('ファイルごとの該当文が並ぶこと', () => {
    const report = formatStopReport([
      { filePath: '/a/b.md', sentences: [severe.sentence] },
    ]);

    expect(report).toContain('/a/b.md');
    expect(report).toContain(`該当文: ${severe.sentence}`);
  });
});
