import {
  antithesisRatioThreshold,
  documentRule,
  plainEndings,
  politeEndings,
  type Violation,
} from './rules.ts';
import type { Sentence } from './sanitize.ts';
import { loadTokenizer } from './tokenizer.ts';

const MAX_EXAMPLES = 3;

function body(sentence: string): string {
  return sentence.replace(/[。！？]+$/, '');
}

function endingOf(
  sentence: string,
  endings: readonly string[],
): string | undefined {
  const trimmed = body(sentence);
  return endings.find((ending) => trimmed.endsWith(ending));
}

function proseSentences(sentences: Sentence[]): Sentence[] {
  return sentences.filter(
    (sentence) => sentence.kind === 'prose' && /[。]$/.test(sentence.text),
  );
}

function checkEndingRepeat(prose: Sentence[]): Violation[] {
  const rule = documentRule('sentence-ending-repeat');
  const result: Violation[] = [];
  let runEnding: string | undefined;
  let run: Sentence[] = [];

  const flush = () => {
    if (runEnding !== undefined && run.length >= rule.threshold) {
      result.push({
        ruleId: rule.id,
        category: rule.category,
        severity: rule.severity,
        matched: `「${runEnding}」で終わる文が ${run.length} 連続`,
        sentence: run.map((sentence) => sentence.text).join(' / '),
        good: rule.good,
      });
    }
    run = [];
    runEnding = undefined;
  };

  for (const sentence of prose) {
    const ending = endingOf(sentence.text, politeEndings);
    if (ending === undefined || ending !== runEnding) {
      flush();
    }
    if (ending !== undefined) {
      runEnding = ending;
      run.push(sentence);
    }
  }
  flush();
  return result.slice(0, MAX_EXAMPLES);
}

function checkStyleMix(prose: Sentence[]): Violation[] {
  const rule = documentRule('polite-plain-mixed');
  const polite: Sentence[] = [];
  const plain: Sentence[] = [];
  for (const sentence of prose) {
    if (endingOf(sentence.text, politeEndings) !== undefined) {
      polite.push(sentence);
      continue;
    }
    if (endingOf(sentence.text, plainEndings) !== undefined) {
      plain.push(sentence);
    }
  }
  if (polite.length === 0 || plain.length === 0) {
    return [];
  }
  const minority = polite.length <= plain.length ? polite : plain;
  return [
    {
      ruleId: rule.id,
      category: rule.category,
      severity: rule.severity,
      matched: `敬体 ${polite.length} 文 / 常体 ${plain.length} 文`,
      sentence: minority
        .slice(0, MAX_EXAMPLES)
        .map((sentence) => sentence.text)
        .join(' / '),
      good: rule.good,
    },
  ];
}

// 「AではなくB」と「AだけでなくBも」を同じ対句として数える。比率の閾値が
// 両方をまとめて校正されているため、片方だけ数えると閾値と噛み合わない
const ANTITHESIS_PATTERNS = [/ではなく/gu, /だけでなく.{0,10}も/gu];

function antithesisCount(text: string): number {
  return ANTITHESIS_PATTERNS.reduce(
    (total, pattern) => total + (text.match(pattern)?.length ?? 0),
    0,
  );
}

function checkDewanaku(prose: Sentence[]): Violation[] {
  const rule = documentRule('dewanaku-overuse');
  const hits = prose.filter((sentence) => antithesisCount(sentence.text) > 0);
  const count = prose.reduce(
    (total, sentence) => total + antithesisCount(sentence.text),
    0,
  );
  const ratio = prose.length === 0 ? 0 : count / prose.length;
  if (count < rule.threshold || ratio < antithesisRatioThreshold) {
    return [];
  }
  return [
    {
      ruleId: rule.id,
      category: rule.category,
      severity: rule.severity,
      matched: `対句が ${count} 回(地の文 ${prose.length} 文)`,
      sentence: hits
        .slice(0, MAX_EXAMPLES)
        .map((sentence) => sentence.text)
        .join(' / '),
      good: rule.good,
    },
  ];
}

async function checkTaigendome(prose: Sentence[]): Promise<Violation[]> {
  const rule = documentRule('taigendome');
  if (prose.length === 0) {
    return [];
  }
  const tokenizer = await loadTokenizer();
  const hits = prose.filter((sentence) => {
    const tokens = tokenizer.tokenize(body(sentence.text));
    return tokens.at(-1)?.pos === '名詞';
  });
  if (hits.length < rule.threshold) {
    return [];
  }
  return [
    {
      ruleId: rule.id,
      category: rule.category,
      severity: rule.severity,
      matched: `体言止めが ${hits.length} 文`,
      sentence: hits
        .slice(0, MAX_EXAMPLES)
        .map((sentence) => sentence.text)
        .join(' / '),
      good: rule.good,
    },
  ];
}

export async function checkDocument(
  sentences: Sentence[],
): Promise<Violation[]> {
  const prose = proseSentences(sentences);
  return [
    ...checkEndingRepeat(prose),
    ...checkStyleMix(prose),
    ...checkDewanaku(prose),
    ...(await checkTaigendome(prose)),
  ];
}
