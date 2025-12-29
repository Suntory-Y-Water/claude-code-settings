#!/usr/bin/env -S bun run --silent
import { runHook } from 'cc-hooks-ts';
import { createLintHook } from './factory';
import { ruleRegistry } from './rules';

const hook = createLintHook(ruleRegistry);

await runHook(hook);
