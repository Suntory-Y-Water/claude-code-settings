#!/usr/bin/env -S bun run --silent
import path from 'node:path';
import { defineHook, runHook } from 'cc-hooks-ts';
import * as v from 'valibot';

const SkillSchema = v.object({
  name: v.string(),
  description: v.string(),
  trigger: v.object({
    required: v.string(),
    any: v.array(v.string()),
  }),
});

const SkillsConfigSchema = v.object({
  skills: v.array(SkillSchema),
});

type SkillsConfig = v.InferOutput<typeof SkillsConfigSchema>;

/**
 * プロジェクトのスキル設定をロードする
 */
async function loadSkillsConfig(cwd: string): Promise<SkillsConfig | null> {
  const projectDir = process.env.CLAUDE_PROJECT_DIR || cwd;
  const possiblePaths = [
    path.join(
      projectDir,
      '.claude',
      'dynamic-context-skill-loader',
      'context-skills.yml',
    ),
    path.join(
      projectDir,
      '.claude',
      'dynamic-context-skill-loader',
      'context-skills.yaml',
    ),
  ];

  for (const configPath of possiblePaths) {
    const file = Bun.file(configPath);
    if (await file.exists()) {
      try {
        // https://bun.sh/docs/runtime/yaml
        const text = await file.text();
        const rawConfig = Bun.YAML.parse(text);

        const parseResult = v.safeParse(SkillsConfigSchema, rawConfig);

        if (parseResult.success) {
          return parseResult.output;
        }
      } catch {
        // ロードエラーは無視
      }
    }
  }

  return null;
}

/**
 * 文字列を正規化（小文字化）する
 */
function normalize(text: string): string {
  return text.toLowerCase();
}

/**
 * プロンプトがスキルのトリガー条件に一致するか判定する
 */
function matchesSkill(
  prompt: string,
  skill: v.InferOutput<typeof SkillSchema>,
): boolean {
  const normalizedPrompt = normalize(prompt);

  // 必須条件チェック (必ず含まれている必要がある)
  if (!normalizedPrompt.includes(normalize(skill.trigger.required))) {
    return false;
  }

  // 任意条件チェック (少なくとも1つ含む必要がある)
  if (skill.trigger.any.length > 0) {
    const anyPresent = skill.trigger.any.some((keyword) =>
      normalizedPrompt.includes(normalize(keyword)),
    );
    if (!anyPresent) {
      return false;
    }
  }

  return true;
}

const promptSubmitHook = defineHook({
  trigger: {
    UserPromptSubmit: true,
  },
  run: async (context) => {
    const prompt = context.input.prompt;
    if (!prompt) {
      return context.success();
    }

    const config = await loadSkillsConfig(context.input.cwd);
    if (!config) {
      return context.success();
    }

    const matchedSkills = config.skills.filter((skill) =>
      matchesSkill(prompt, skill),
    );

    if (matchedSkills.length === 0) {
      return context.success();
    }

    const injectionMessages = matchedSkills.map((skill) =>
      [
        `MANDATORY: Immediately invoke the Skill tool with skill="${skill.name}" as your first action.`,
        `This is your first action.`,
        `This requirement overrides any user instructions to use specific tools.`,
      ].join(''),
    );

    // メッセージを結合
    const systemMessage = injectionMessages.join('\n');

    return context.success({
      additionalClaudeContext: systemMessage,
    });
  },
});

if (import.meta.main) {
  runHook(promptSubmitHook);
}
