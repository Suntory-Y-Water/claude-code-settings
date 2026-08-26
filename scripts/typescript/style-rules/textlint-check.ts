import { dirname, join } from 'node:path';
import type { TextlintResult } from '@textlint/types';
import {
  type RuleId,
  type TextlintRuleId,
  textlintRules,
  type Violation,
} from './rules.ts';
import type { Sentence } from './sanitize.ts';

// hook は編集対象のプロジェクトを cwd にして起動する。設定と rule の解決を
// cwd に任せると別のリポジトリの .textlintrc を拾うので、この設定の場所を渡す
const ROOT = dirname(dirname(dirname(import.meta.dir)));

// 同じ規則の指摘だけで報告が埋まると他が見えなくなる。word-check と同じ上限
const MAX_PER_RULE = 2;

// 文に紐づかない文書全体のサマリ。report は文ごとに指摘をまとめるため置き場が無い
const DOCUMENT_ANALYSIS_PREFIX = '【テクニカルライティング品質分析】';

type Linter = {
  lintText(text: string, filePath: string): Promise<TextlintResult>;
};

let cached: Promise<Linter> | undefined;

// textlint 本体と辞書のロードに約 150ms かかる。静的 import にすると .ts の
// 書き込みでも払うことになるので、日本語の md に当たった時だけ読み込む
function loadLinter(): Promise<Linter> {
  cached ??= (async () => {
    const { createLinter, loadTextlintrc } = await import('textlint');
    return createLinter({
      descriptor: await loadTextlintrc({
        configFilePath: join(ROOT, '.textlintrc.json'),
        node_modulesDir: join(ROOT, 'node_modules'),
      }),
    });
  })();
  return cached;
}

// preset 経由で読むと rule id が `@textlint-ja/ai-writing/no-ai-...` になる。
// 設定の書き方で変わる前置きを外し、textlintRules のキーに合わせる
function toRuleId(reported: string): TextlintRuleId | undefined {
  const id = reported.slice(reported.lastIndexOf('/') + 1);
  return id in textlintRules ? (id as TextlintRuleId) : undefined;
}

// textlint は違反箇所を行と列で返す。既存の指摘は文を単位にしていて Stop hook も
// 文の残存で解消を見るため、sanitize 済みの文に寄せ直す。
// sanitize がマーカーを剥がすと列がずれるので、列そのものではなく列より前にある
// 句点の数で行内の何番目の文かを決める
function sentenceAt(
  source: string,
  sentences: Sentence[],
  line: number,
  column: number,
): string | undefined {
  const onLine = sentences.filter((sentence) => sentence.lineNumber === line);
  const before = (source.split('\n')[line - 1] ?? '').slice(
    0,
    Math.max(column - 1, 0),
  );
  const index = (before.match(/[。！？]/gu) ?? []).length;
  return (onLine[index] ?? onLine[0])?.text;
}

// 何が引っかかったかを短く取り出す。ガイドラインの指摘は先頭の【】が種別を、
// それ以外は「」が対象語を持つ。report は `ラベル: 直し方` の形で出すため、
// 区切りに使うコロンをラベル側に残さない
function toLabel(message: string, ruleId: TextlintRuleId): string {
  const tagged = /^【([^】]+)】([^。]*)/u.exec(message);
  if (tagged !== null) {
    return `${tagged[1]}/${tagged[2]?.replace(/が検出されました$/u, '')}`;
  }
  const quoted = /「([^」]+)」/u.exec(message);
  if (quoted?.[1] !== undefined) {
    return quoted[1].replace(/[:：]$/u, '');
  }
  // 「見出し内の太字は不要です」のような文そのものの指摘は、文書ルールと同じ
  // 粒度の短い見出しに寄せる
  return textlintRules[ruleId].category;
}

export async function checkTextlint(
  source: string,
  sentences: Sentence[],
): Promise<Violation[]> {
  const linter = await loadLinter();
  const result = await linter.lintText(source, 'style-check.md');
  const counts = new Map<RuleId, number>();
  const violations: Violation[] = [];

  for (const message of result.messages) {
    if (message.message.startsWith(DOCUMENT_ANALYSIS_PREFIX)) {
      continue;
    }
    const ruleId = toRuleId(message.ruleId);
    if (ruleId === undefined) {
      continue;
    }
    const rule = textlintRules[ruleId];
    const hits = counts.get(ruleId) ?? 0;
    if (hits >= MAX_PER_RULE) {
      continue;
    }
    const sentence = sentenceAt(
      source,
      sentences,
      message.line,
      message.column,
    );
    if (sentence === undefined) {
      continue;
    }
    counts.set(ruleId, hits + 1);
    violations.push({
      ruleId,
      category: rule.category,
      severity: rule.severity,
      matched: toLabel(message.message, ruleId),
      sentence,
      good: rule.good,
    });
  }
  return violations;
}
