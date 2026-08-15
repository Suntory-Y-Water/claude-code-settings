import type { Sentence } from './sanitize.ts';
import { type Violation, wordRules } from './rules.ts';

// 同じ指摘だけで報告が埋まると、他のルールの指摘が見えなくなる。
// severe を打ち切ると Stop hook の追跡対象から漏れ、未修正のままターンが終わる
const MAX_WARNINGS_PER_RULE = 2;

export function checkWords(sentences: Sentence[]): Violation[] {
  const result: Violation[] = [];
  for (const rule of wordRules) {
    let hits = 0;
    for (const sentence of sentences) {
      if (rule.severity === 'warning' && hits >= MAX_WARNINGS_PER_RULE) {
        break;
      }
      const match = rule.pattern.exec(sentence.text);
      if (match === null) {
        continue;
      }
      hits += 1;
      result.push({
        ruleId: rule.id,
        category: rule.category,
        severity: rule.severity,
        matched: match[0],
        sentence: sentence.text,
        good: rule.good,
      });
    }
  }
  return result;
}
