import { Node } from 'ts-morph';
import { type RuleFunction } from '../types';

/**
 * Topレベルのアロー関数を禁止して、function宣言を使用するように促すルール
 */
export const noTopLevelArrowFunction = ((sourceFile) => {
  const errors: string[] = [];

  // トップレベルの変数宣言文を取得
  sourceFile.getVariableStatements().forEach((statement) => {
    statement.getDeclarations().forEach((declaration) => {
      const initializer = declaration.getInitializer();

      // イニシャライザがアロー関数の場合
      if (initializer && Node.isArrowFunction(initializer)) {
        const lineNumber = declaration.getStartLineNumber();
        const name = declaration.getName();
        errors.push(
          `Line ${lineNumber}: Top-level arrow function '${name}' is forbidden. Use 'function' declaration or 'export function' instead.`,
        );
      }
    });
  });

  return errors;
}) satisfies RuleFunction;
