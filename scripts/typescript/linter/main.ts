#!/usr/bin/env -S bun run --silent
import { runHook } from 'cc-hooks-ts';
import { ruleRegistry } from './rules';
import { createLintHook } from './factory';

const hook = createLintHook(ruleRegistry);

await runHook(hook);
