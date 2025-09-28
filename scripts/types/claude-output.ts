/**
 * transcript JSONLファイル内の1行（1つのメッセージエントリ）を表す型
 */
export type TranscriptEntry = {
  /** メッセージタイプ ('user': ユーザーメッセージ, 'assistant': AIメッセージ, その他) */
  type: 'user' | 'assistant' | string;
  /** ISO8601形式のタイムスタンプ (例: "2025-09-28T01:33:41.977Z") */
  timestamp?: string;
  /** AIメッセージの場合のメッセージ内容 */
  message?: {
    /** メッセージ内のコンテンツ要素配列（テキスト、ツール使用など） */
    content?: ContentElement[];
  };
};

/**
 * メッセージ内の個別コンテンツ要素（テキストやツール使用）を表す型
 */
export type ContentElement = {
  /** コンテンツタイプ ('tool_use': ツール使用, 'text': テキスト, その他) */
  type?: 'tool_use' | 'text' | string;
  /** ツール名 ('Edit': ファイル編集, 'MultiEdit': 複数ファイル編集, その他) */
  name?: string;
  /** テキストコンテンツ ('text'タイプの場合) */
  text?: string;
  /** ツール実行時の入力パラメータ */
  input?: {
    /** 編集対象ファイルの絶対パス (例: "/path/to/file.ts") */
    file_path?: string;
  };
};
