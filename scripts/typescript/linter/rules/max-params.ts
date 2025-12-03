import {
  ArrowFunction,
  FunctionDeclaration,
  MethodDeclaration,
  Node,
} from 'ts-morph';
import { type RuleFunction } from '../types';

type FunctionCheckTarget =
  | FunctionDeclaration
  | MethodDeclaration
  | ArrowFunction;

// ヘルパー関数の引数型定義
type CheckArgs = {
  node: FunctionCheckTarget;
  name: string;
};

/**
 * 関数の引数が二個以上あるときに、オブジェクト形式に修正を促すルール
 */
export const maxParams = ((sourceFile) => {
  const errors: string[] = [];

  // 修正: 引数をオブジェクト形式に変更
  const check = ({ node, name }: CheckArgs) => {
    const params = node.getParameters();
    if (params.length >= 2) {
      errors.push(
        `Line ${node.getStartLineNumber()}: Function '${name}' has ${params.length} arguments. Functions with 2+ arguments must use a single object argument.`,
      );
    }
  };

  sourceFile.forEachDescendant((node) => {
    if (Node.isFunctionDeclaration(node)) {
      check({ node, name: node.getName() || 'Anonymous function' });
    } else if (Node.isMethodDeclaration(node)) {
      check({ node, name: node.getName() });
    } else if (Node.isArrowFunction(node)) {
      const parent = node.getParent();
      if (Node.isVariableDeclaration(parent)) {
        check({ node, name: parent.getName() });
      }
    }
  });

  return errors;
}) satisfies RuleFunction;
