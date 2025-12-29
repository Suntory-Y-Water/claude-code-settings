import { Node } from 'ts-morph';
import type { RuleFunction } from '../types';

/**
 * as型アサーションを禁止するルール（テストファイルは除外）
 * 注意: このルールはfactoryでファイルパスによる除外が必要
 */
export const noTypeAssertion = ((sourceFile) => {
  const errors: string[] = [];

  sourceFile.forEachDescendant((node) => {
    // AsExpression（as型アサーション）を検出
    if (Node.isAsExpression(node)) {
      const lineNumber = node.getStartLineNumber();
      const expression = node.getExpression().getText();
      const type = node.getType().getText();
      errors.push(
        `Line ${lineNumber}: Type assertion 'as' is forbidden. Expression '${expression}' asserted as '${type}'.`,
      );
    }
  });

  return errors;
}) satisfies RuleFunction;
