import { type RuleFunction } from '../types';
import { maxParams } from './max-params';
import { noInterface } from './no-interface';

export const ruleRegistry = {
  'no-interface': noInterface,
  'max-params': maxParams,
} satisfies Record<string, RuleFunction>;
