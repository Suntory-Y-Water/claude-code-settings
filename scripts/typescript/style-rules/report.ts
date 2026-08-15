import type { Violation } from './rules.ts';

const MAX_ENTRIES = 8;

const SEVERITY_LABEL = { severe: '重大', warning: '警告' } as const;

// 語だけ置き換えると別の語形で同じ問題が残り、文が壊れる。丸ごと書き直させる
const REWRITE_INSTRUCTION =
  '該当文を丸ごと書き直してください。検出語だけを別の語に置き換える直し方は禁止です。';

function formatEntry(violation: Violation): string {
  return [
    `[${SEVERITY_LABEL[violation.severity]}] ${violation.category}: ${violation.matched}`,
    `  該当文: ${violation.sentence}`,
    `  書き直し方: ${violation.good}`,
  ].join('\n');
}

export function formatReport(
  filePath: string,
  violations: Violation[],
): string {
  const severe = violations.filter((entry) => entry.severity === 'severe');
  const shown = [
    ...severe,
    ...violations.filter((entry) => entry.severity === 'warning'),
  ].slice(0, MAX_ENTRIES);
  const omitted = violations.length - shown.length;

  const lines = [
    `日本語スタイル検査: ${filePath}`,
    `重大 ${severe.length} 件 / 警告 ${violations.length - severe.length} 件`,
    REWRITE_INSTRUCTION,
    '',
    ...shown.map(formatEntry),
  ];
  if (omitted > 0) {
    lines.push('', `ほか ${omitted} 件は省略しました。`);
  }
  return lines.join('\n');
}

export function formatStopReport(
  entries: { filePath: string; sentences: string[] }[],
): string {
  const lines = [
    '日本語スタイル検査の重大な指摘が未修正のまま残っています。',
    REWRITE_INSTRUCTION,
    '',
  ];
  for (const entry of entries) {
    lines.push(entry.filePath);
    for (const sentence of entry.sentences) {
      lines.push(`  該当文: ${sentence}`);
    }
  }
  return lines.join('\n');
}
