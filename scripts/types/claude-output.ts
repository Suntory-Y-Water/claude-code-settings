import type { ToolSchema } from 'cc-hooks-ts';

/**
 * transcript JSONLファイル内の1行（1つのメッセージエントリ）を表す型
 */
export type TranscriptEntry = UserEntry | AssistantEntry | SystemEntry;

/**
 * ユーザーメッセージ
 */
type UserEntry = {
  /** メッセージタイプ ('user': ユーザーメッセージ) */
  type: 'user';
  /** ISO8601形式のタイムスタンプ (例: "2025-09-28T01:33:41.977Z") */
  timestamp: string;
  /** ユーザーメッセージの内容 */
  message: {
    /** メッセージの役割 */
    role: 'user';
    /** ユーザーの入力内容（文字列） */
    content: string;
  };
};

/**
 * アシスタントメッセージ
 */
type AssistantEntry = {
  /** メッセージタイプ ('assistant': AIメッセージ) */
  type: 'assistant';
  /** ISO8601形式のタイムスタンプ (例: "2025-09-28T01:33:41.977Z") */
  timestamp: string;
  /** アシスタントメッセージの内容 */
  message: {
    /** メッセージ内のコンテンツ要素配列（テキスト、ツール使用など） */
    content: ContentElement[];
  };
};

/**
 * システムメッセージ
 */
type SystemEntry = {
  /** メッセージタイプ ('system') */
  type: 'system';
  /** ISO8601形式のタイムスタンプ (例: "2025-09-28T01:33:41.977Z") */
  timestamp: string;
  /** システムメッセージの内容 */
  message?: {
    /** システムメッセージのコンテンツ */
    content?: ContentElement[] | string;
  };
};

/**
 * メッセージ内の個別コンテンツ要素（テキストやツール使用）を表す型
 */
type ContentElement = {
  /** コンテンツタイプ ('tool_use': ツール使用, 'text': テキスト, その他) */
  type?: 'tool_use' | 'text' | string;
  /** ツール名 ('Edit': ファイル編集, 'MultiEdit': 複数ファイル編集, その他) */
  name?: keyof ToolSchema;
  /** テキストコンテンツ ('text'タイプの場合) */
  text?: string;
  /** ツール実行時の入力パラメータ */
  input?: {
    /** 編集対象ファイルの絶対パス (例: "/path/to/file.ts") */
    file_path?: string;
    /** 編集対象ファイルの相対パス (Serena MCPツール用) */
    relative_path?: string;
  };
};

declare module 'cc-hooks-ts' {
  interface ToolSchema {
    mcp__serena__insert_after_symbol: {
      input: {
        name_path: string;
        relative_path: string;
        body: string;
      };
    };
    mcp__serena__insert_before_symbol: {
      input: {
        name_path: string;
        relative_path: string;
        body: string;
      };
    };
    mcp__serena__replace_symbol_body: {
      input: {
        name_path: string;
        relative_path: string;
        body: string;
      };
    };
  }
}
