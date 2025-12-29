import type { RuleFunction } from '../types';
import { noTopLevelArrowFunction } from './no-top-level-arrow-function';
import { noTypeAssertion } from './no-type-assertion';

export const ruleRegistry = {
  'no-top-level-arrow-function': noTopLevelArrowFunction,
  'no-type-assertion': noTypeAssertion,
} satisfies Record<string, RuleFunction>;
