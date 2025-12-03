import { SourceFile } from 'ts-morph';

export type RuleResult = string; // エラーメッセージ

// ルール関数の型定義
export type RuleFunction = (sourceFile: SourceFile) => RuleResult[];
