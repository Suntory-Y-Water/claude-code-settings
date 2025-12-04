import { Node } from 'ts-morph';
import { type RuleFunction } from '../types';

/**
 * Array<T>記法を禁止して、T[]を使用するように促すルール
 */
export const noArrayGenericNotation = ((sourceFile) => {
  const errors: string[] = [];

  sourceFile.forEachDescendant((node) => {
    // TypeReferenceでArray<T>を検出
    if (Node.isTypeReference(node)) {
      const typeName = node.getTypeName().getText();
      if (typeName === 'Array' || typeName === 'ReadonlyArray') {
        const lineNumber = node.getStartLineNumber();
        const typeText = node.getText();
        const typeArgs = node.getTypeArguments();

        if (typeArgs.length > 0) {
          const innerType = typeArgs[0]?.getText();
          const suggestion =
            typeName === 'ReadonlyArray'
              ? `readonly ${innerType}[]`
              : `${innerType}[]`;

          errors.push(
            `Line ${lineNumber}: Generic array notation '${typeText}' is forbidden. Use '${suggestion}' instead.`,
          );
        }
      }
    }
  });

  return errors;
}) satisfies RuleFunction;
