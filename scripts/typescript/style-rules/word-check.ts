import type { Sentence } from './sanitize.ts';
import { type Violation, wordRules } from './rules.ts';

const MAX_PER_RULE = 2;

export function checkWords(sentences: Sentence[]): Violation[] {
  const result: Violation[] = [];
  for (const rule of wordRules) {
    let hits = 0;
    for (const sentence of sentences) {
      if (hits >= MAX_PER_RULE) {
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
