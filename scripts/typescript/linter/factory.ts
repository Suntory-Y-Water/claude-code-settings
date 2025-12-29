import * as fs from 'node:fs';
import * as path from 'node:path';
import { defineHook } from 'cc-hooks-ts';
import { Project } from 'ts-morph';
import * as v from 'valibot';
import type { RuleFunction } from './types';

const configSchema = v.object({
  rules: v.record(v.string(), v.union([v.literal('error'), v.literal('off')])),
});

// ファクトリー関数: ルール一覧(registry)を受け取ってHook定義を返す
export function createLintHook(registry: Record<string, RuleFunction>) {
  return defineHook({
    trigger: {
      PostToolUse: { Write: true, Edit: true },
    },
    run: (c) => {
      const filePath = c.input.tool_response.filePath;
      // TypeScriptファイル以外、またはテストファイルは対象外
      if (
        !/\.(ts|tsx|mts|cts)$/.test(filePath) ||
        /\.(test|spec)\.(ts|tsx|mts|cts)$/.test(filePath)
      ) {
        return c.success();
      }

      const userConfigPath = path.resolve(
        import.meta.dir,
        '../../../claude-lint.json',
      );
      const projectConfigPath = path.resolve(process.cwd(), 'claude-lint.json');

      const configPath = fs.existsSync(projectConfigPath)
        ? projectConfigPath
        : userConfigPath;

      // 設定ファイルがあれば読み込む、なければ空の設定とする
      const config = (() => {
        if (!fs.existsSync(configPath)) {
          return null;
        }
        try {
          const rawJson = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
          return v.parse(configSchema, rawJson);
        } catch {
          return null;
        }
      })();

      // 実行ルールの決定
      // デフォルト: レジストリにある全ルールを対象とする
      const allRuleNames = Object.keys(registry);

      // 設定ファイルで "off" になっているものだけを除外する
      const activeRuleNames = allRuleNames.filter((name) => {
        if (!config) {
          return true; // 設定なしなら全部ON
        }
        const setting = config.rules[name];
        return setting !== 'off'; // "off" 以外なら実行
      });

      if (activeRuleNames.length === 0) {
        return c.success();
      }

      const project = new Project({ skipAddingFilesFromTsConfig: true });

      const sourceFile = (() => {
        try {
          return project.addSourceFileAtPath(filePath);
        } catch {
          return null;
        }
      })();

      if (!sourceFile) {
        return c.success();
      }

      const allErrors: string[] = [];

      activeRuleNames.forEach((name) => {
        const rule = registry[name];
        if (rule) {
          allErrors.push(...rule(sourceFile));
        }
      });

      if (allErrors.length > 0) {
        return c.json({
          event: 'PostToolUse',
          output: {
            decision: 'block',
            reason: `Coding convention violations in '${filePath}':\n\n${allErrors.join('\n')}`,
            hookSpecificOutput: {
              hookEventName: 'PostToolUse',
            },
          },
        });
      }

      return c.success();
    },
  });
}
