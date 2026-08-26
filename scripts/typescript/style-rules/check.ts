import { checkDocument } from './document-check.ts';
import type { Violation } from './rules.ts';
import { containsJapanese, sanitizedText, toSentences } from './sanitize.ts';
import { checkTextlint } from './textlint-check.ts';
import { checkWords } from './word-check.ts';

export interface StyleCheckInput {
  source: string;
  // Edit は差し替えた断片だけを渡す。語の指摘を今回書いた範囲に限るため
  writtenText?: string;
}

export async function runStyleCheck({
  source,
  writtenText,
}: StyleCheckInput): Promise<Violation[]> {
  const sentences = toSentences(source);
  if (!sentences.some((sentence) => containsJapanese(sentence.text))) {
    return [];
  }

  const scope =
    writtenText === undefined ? undefined : sanitizedText(writtenText);
  const words = checkWords(sentences).filter(
    (violation) => scope === undefined || scope.includes(violation.matched),
  );

  const [document, textlint] = await Promise.all([
    checkDocument(sentences),
    // textlint は markdown の構造を見るため、sanitize 前の source を渡す
    checkTextlint(source, sentences),
  ]);
  return [...words, ...document, ...textlint];
}

export function severeViolations(violations: Violation[]): Violation[] {
  return violations.filter((violation) => violation.severity === 'severe');
}
