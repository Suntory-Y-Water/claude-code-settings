export type Severity = 'severe' | 'warning';

export interface WordRule {
  readonly id: string;
  readonly category: string;
  readonly severity: Severity;
  readonly pattern: RegExp;
  readonly good: string;
}

export interface DocumentRule {
  readonly category: string;
  readonly severity: Severity;
  readonly threshold: number;
  readonly good: string;
}

export interface TextlintRule {
  readonly category: string;
  readonly severity: Severity;
  readonly good: string;
}

// 語彙と閾値の一部は skill natural-japanese の scripts/lint.py の
// コーパス校正(人間 103 文書 + AI 81 文書)に合わせている。skill は
// skills-lock.json でハッシュ管理されているため、更新したら lint.py の
// FORBIDDEN_PHRASES・FORBIDDEN_PHRASES_WEAK_SIGNAL・ANTITHESIS_* の差分を見る。
// 対応時点のハッシュは 043db25ceb40d2bb1eec4e6c18605f02e2e6938773fb91cbce8381e5c1f447c5

// 照合は 1 文ずつ行い g フラグを付けない。そのため `^` は文の先頭を指す
export const wordRules = [
  {
    id: 'empty-adjective-emphasis',
    category: '空虚な形容',
    severity: 'severe',
    pattern: /核心的|鍵となる|根本的な/u,
    good: '何が無いと何ができなくなるかを書く。例:「型定義が無いと tool_input の形が決まらない」',
  },
  {
    // 「不可欠」は人間側でも一定数使われる(人間 6〜15 回 vs AI 2 回前後)ため、
    // 同じ空虚な形容でも severe には上げない
    id: 'empty-adjective-weak',
    category: '空虚な形容',
    severity: 'warning',
    pattern: /不可欠/u,
    good: '何が無いと何ができなくなるかを書く。例:「型定義が無いと tool_input の形が決まらない」',
  },
  {
    id: 'empty-adjective-coverage',
    category: '空虚な形容',
    severity: 'severe',
    pattern: /多角的|包括的|総合的/u,
    good: 'どの角度から何をいくつ見たかを書く。例:「実行時間とメモリ使用量の 2 つを測った」',
  },
  {
    id: 'front-facing',
    category: '正面から系',
    severity: 'severe',
    pattern: /正面から(?:扱う|回収する|見る|書く|立てる)/u,
    good: '姿勢の宣言を削り、動作だけ書く。例:「本章では〇〇の理論を扱う」「ここで、この前提を回収する」',
  },
  {
    id: 'dash',
    category: '記号',
    severity: 'severe',
    pattern: /[—―─]/u,
    good: '同格・補足の挿入は括弧()にする。言い換えは句点で二文に分けるか読点でつなぐ。見出しは単一の自然な句にする',
  },
  {
    id: 'kikimasu',
    category: '比喩の動詞',
    severity: 'severe',
    pattern: /効きます/u,
    good: '何がどう作用したかをそのまま書く。例:「ヘッダーが適用されています」',
  },
  {
    id: 'preview',
    category: '予告',
    severity: 'warning',
    pattern:
      /重要なのは[^。]{0,60}である|ここでは[^。]{0,60}について見ていく|本章では/u,
    good: '予告を削って主張から書く。例:「評価の中心は、正しさを誰が知っているかにある」',
  },
  {
    id: 'summary',
    category: '総括',
    severity: 'warning',
    pattern: /まとめると|要するに|に他ならない/u,
    good: '直前の言い換えだけなら削る。結論は一度だけ書く',
  },
  {
    id: 'explore',
    category: '予告',
    severity: 'warning',
    pattern: /探求する/u,
    good: '何をするかを書く。例:「〇〇の理論を扱う」',
  },
  {
    id: 'empty-verb-dig',
    category: '空虚な動詞',
    severity: 'warning',
    pattern: /掘り下げる|深掘りする|言語化する/u,
    good: '何をどう書いたかを示す。例:「実測値を 3 種類に分けて数えた」',
  },
  {
    id: 'empty-verb-touch',
    category: '空虚な動詞',
    severity: 'warning',
    pattern: /触れる|言及する/u,
    good: '何をどこまで説明するかを書く。例:「〇〇の失敗例だけを説明する」',
  },
  {
    id: 'connective-frame',
    category: '接続の型',
    severity: 'warning',
    pattern: /において|という側面から|の観点から/u,
    good: '助詞でそのまま書く。例:「この設定では」「実行時間で比べると」',
  },
  {
    id: 'connective-additive',
    category: '接続の型',
    severity: 'warning',
    pattern: /^(?:さらに|また|加えて)[、，]/u,
    good: '前の文との論理関係を示す語にする。例:「そのため」「一方」。関係が無いなら段落を分ける',
  },
  {
    id: 'weak-hedge',
    category: '弱い緩和',
    severity: 'warning',
    pattern: /と言えるだろう|かもしれない/u,
    good: '根拠があるなら断定する。推量・仮定・読者の疑念・作中人物の認識を表すときは残してよい',
  },
  {
    id: 'empty-emphasis',
    category: '空虚な強調',
    severity: 'warning',
    pattern: /非常に|極めて|大いに/u,
    good: '数値か比較対象を書く。例:「同じ処理の 3 倍速い」',
  },
  // 「まさに」は検出しない。人間の使用が多く AI の癖ではないと実測されている
  // (人間 24 回 vs AI 0 回)
  {
    id: 'jargon-trap',
    category: '過去の指摘',
    severity: 'warning',
    pattern: /罠|地雷/u,
    good: '何が起きるかをそのまま書く。例:「この設定では stdout が Claude に届かない」',
  },
  {
    id: 'jargon-technique',
    category: '過去の指摘',
    severity: 'warning',
    pattern: /テク(?![ニノス])/u,
    good: '正式名称で書く。例:「手法」「書き方」',
  },
  {
    id: 'dismissive',
    category: '過去の指摘',
    severity: 'warning',
    pattern: /カス(?![タケ])|くだらない/u,
    good: '対象を名指しして、何がどう不足しているかを書く',
  },
  {
    id: 'calm-down',
    category: '過去の指摘',
    severity: 'warning',
    pattern: /少し冷静になって考えると/u,
    good: '前置きを削って結論から書く',
  },
  {
    id: 'jargon-projection',
    category: '過去の指摘',
    severity: 'warning',
    pattern: /射影/u,
    good: 'データに何をしたかをそのまま書く。例:「jq がフィールドを絞り込んでいる」「不要な列を取り除く」。数学・グラフィックスの用語(正射影、射影変換など)は残してよい',
  },
  {
    id: 'jargon-window',
    category: '過去の指摘',
    severity: 'warning',
    pattern: /窓(?![口際辺枠]|ガラス)/u,
    good: '時間帯・期間・状態をそのまま書く。例:「設定とコードが食い違っている時間帯」「再ビルドが完了するまでの数分間」。建築や UI の実物の窓は残してよい',
  },
  {
    id: 'jargon-skip',
    category: '過去の指摘',
    severity: 'warning',
    pattern: /飛ば[さしすせそ]/u,
    good: '省略・中断・不実行をそのまま書く。例:「実行しない」「省略する」「途中で終える」。物を空中へ移動させる意味(ボールを飛ばす)は残してよい',
  },
  {
    id: 'jargon-lottery',
    category: '過去の指摘',
    severity: 'warning',
    pattern: /くじ(?![らかきくけい])/u,
    good: '確率と回数をそのまま書く。例:「実行のたびに 1.5% の確率で失敗する」「回数を重ねればいずれ失敗する」。実際の抽選・抽選機能について書く場合は残してよい',
  },
  {
    // 「焼き込む」「焼き付く」「焼き直す」は埋め込みの意味で定着しており指摘の対象外。
    // 記録媒体への書き込みと調理は後読みで外す
    id: 'jargon-burn',
    category: '過去の指摘',
    severity: 'warning',
    pattern:
      /(?<!(?:CD|DVD|BD|ROM|ディスク|イメージ|画像|写真|パン|肉|魚|芋) ?[をに] ?)焼(?:く|き(?![込付直上])|い[てた]|か(?![れ]))/u,
    good: '何をどれだけ消費するかをそのまま書く。例:「240 秒を消費する」「上限までトークンを使い切る」。記録媒体への書き込み、調理、日焼けは残してよい',
  },
] as const satisfies readonly WordRule[];

export const documentRules = {
  'sentence-ending-repeat': {
    category: '文末の重複',
    severity: 'warning',
    threshold: 3,
    good: '文末を変える。例:「〜します」「〜です」「〜になります」を混ぜる。体言止めにしない',
  },
  'polite-plain-mixed': {
    category: '文体の混在',
    severity: 'warning',
    threshold: 1,
    good: '敬体か常体のどちらかに統一する',
  },
  'dewanaku-overuse': {
    category: '対句の多用',
    severity: 'warning',
    threshold: 3,
    good: '「AではなくB」「AだけでなくBも」の対句を減らす。残す箇所には否定の根拠を一文添える',
  },
  // natural-japanese は「長文なのに体言止めが 1 つも無い」ことを AI らしさとして
  // 検出する(体言止めは人間の修辞技法という実測結果)。ここは逆向きで、
  // 体言止め自体を避けたいという好みを規則にしている
  taigendome: {
    category: '体言止め',
    severity: 'warning',
    threshold: 1,
    good: '述語で言い切る。例:「〜が原因。」→「〜が原因です。」',
  },
} as const satisfies Record<string, DocumentRule>;

// キーは preset-ai-writing の rule id と一致させる。textlint 側のメッセージは
// 「より自然な表現を検討してください」で終わり書き換え先を示さないため、good だけ
// こちらで持つ。severity は語規則と違い全て warning から始める。構造の指摘は
// 書式の好みと区別がつかず、severe にすると SKILL.md の編集が進まなくなる
export const textlintRules = {
  'no-ai-list-formatting': {
    category: 'リストの書式',
    severity: 'warning',
    good: '絵文字を消して語で書く。例:「✅ 完了」→「完了」',
  },
  'no-ai-emphasis-patterns': {
    category: '強調の書式',
    severity: 'warning',
    good: '見出しの ** を外す。強調は地の文の語にだけ使う',
  },
  'no-ai-hype-expressions': {
    category: '誇張',
    severity: 'warning',
    good: '誇張語を消して事実だけ書く。程度を示すなら数値か比較対象を添える。例:「大幅に短縮」→「1.2 秒から 0.4 秒に短縮」',
  },
  'no-ai-colon-continuation': {
    category: 'コロンの継続',
    severity: 'warning',
    good: 'コロンを消して文で言い切る。例:「実行します:」→「実行方法は次のとおりです。」。名詞で終わるコロン(「例:」「使用方法:」)は残してよい',
  },
  'ai-tech-writing-guideline': {
    category: '冗長・曖昧',
    severity: 'warning',
    good: '冗長な言い回しを削り、能動態と具体的な数値で書く。例:「操作する必要があります」→「操作します」。「必要に応じて」「適切に」は削る',
  },
} as const satisfies Record<string, TextlintRule>;

// 回数だけで判定すると長い文書ほど当たりやすい。密度が薄いうちは人間の修辞と
// 区別がつかないため、地の文に対する比率も条件にする
export const antithesisRatioThreshold = 0.02;

// 長い語尾から先に照合する。「ました」より前に「ませんでした」を置く
export const politeEndings = [
  'ませんでした',
  'ましょう',
  'ますか',
  'ません',
  'ました',
  'ます',
  'でしたか',
  'でしょう',
  'でした',
  'ですか',
  'です',
] as const;

export const plainEndings = [
  'であった',
  'である',
  'なかった',
  'だった',
  'ない',
  'だ',
  'た',
  'る',
  'う',
  'い',
] as const;

export type WordRuleId = (typeof wordRules)[number]['id'];
export type DocumentRuleId = keyof typeof documentRules;
export type TextlintRuleId = keyof typeof textlintRules;
export type RuleId = WordRuleId | DocumentRuleId | TextlintRuleId;

export interface Violation {
  ruleId: RuleId;
  category: string;
  severity: Severity;
  matched: string;
  sentence: string;
  good: string;
}

export function documentRule<Id extends DocumentRuleId>(
  id: Id,
): DocumentRule & { id: Id } {
  return { id, ...documentRules[id] };
}

export function isDocumentRuleId(id: RuleId): id is DocumentRuleId {
  return id in documentRules;
}

export function isTextlintRuleId(id: RuleId): id is TextlintRuleId {
  return id in textlintRules;
}

// ファイル全体を見て判定する規則。今回書いた範囲に関係なく当たり続けるため、
// 呼ぶ側は同じ指摘の再送を抑える
export function isFileScopedRuleId(id: RuleId): boolean {
  return isDocumentRuleId(id) || isTextlintRuleId(id);
}
