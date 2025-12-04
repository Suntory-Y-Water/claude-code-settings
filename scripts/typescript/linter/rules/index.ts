import { type RuleFunction } from '../types';
import { maxParams } from './max-params';
import { noInterface } from './no-interface';
import { noArrayGenericNotation } from './no-array-generic-notation';
import { noTopLevelArrowFunction } from './no-top-level-arrow-function';
import { noTypeAssertion } from './no-type-assertion';

export const ruleRegistry = {
  'no-interface': noInterface,
  'max-params': maxParams,
  'no-array-generic-notation': noArrayGenericNotation,
  'no-top-level-arrow-function': noTopLevelArrowFunction,
  'no-type-assertion': noTypeAssertion,
} satisfies Record<string, RuleFunction>;
