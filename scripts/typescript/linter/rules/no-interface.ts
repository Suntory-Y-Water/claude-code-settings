import { type RuleFunction } from '../types';

/**
 * インターフェースの仕様を禁止して、type を使用するように促すルール
 */
export const noInterface = ((sourceFile) => {
  const errors: string[] = [];
  sourceFile.getInterfaces().forEach((int) => {
    errors.push(
      `Line ${int.getStartLineNumber()}: Interface '${int.getName()}' is forbidden. Use 'type' alias instead.`,
    );
  });
  return errors;
}) satisfies RuleFunction;
