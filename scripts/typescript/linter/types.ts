import { SourceFile } from 'ts-morph';

// ルール関数の型定義
export type RuleFunction = (sourceFile: SourceFile) => string[];
