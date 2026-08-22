import { describe, expect, it, onTestFinished } from 'bun:test';
import { chmod, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { delimiter } from 'node:path';
import { join } from 'pathe';

const MIKKE_LOG = join(import.meta.dir, 'mikke-log.ts');
const KNOWLEDGE_BASE = '/home/alice/.claude';

type SearchHit = {
  title: string;
  path: string;
  tags: string[];
};

type RunOptions = {
  args: string[];
  mikkeOutput: string;
};

function jsonSearchResult(hits: SearchHit[]): string {
  const meta = {
    type: 'meta',
    command: 'find',
    count: hits.length,
    order: 'relevance',
    capped: false,
  };
  return `${[meta, ...hits].map((value) => JSON.stringify(value)).join('\n')}\n`;
}

async function createMikkeLogHarness() {
  const workspace = await mkdtemp(join(tmpdir(), 'mikke-log-test-'));
  const binDir = join(workspace, 'bin');
  const fakeMikke = join(binDir, 'mikke');
  await mkdir(binDir);
  await writeFile(
    fakeMikke,
    [
      '#!/usr/bin/env bun',
      "process.stdout.write(process.env.FAKE_MIKKE_OUTPUT ?? '');",
      '',
    ].join('\n'),
  );
  await chmod(fakeMikke, 0o755);
  onTestFinished(() => rm(workspace, { recursive: true, force: true }));

  return {
    run(options: RunOptions) {
      const processResult = Bun.spawnSync(
        ['bun', 'run', '-i', '--silent', MIKKE_LOG, ...options.args],
        {
          cwd: workspace,
          env: {
            ...process.env,
            PATH: `${binDir}${delimiter}${process.env.PATH ?? ''}`,
            MIKKE_LOG_ROOT: KNOWLEDGE_BASE,
            FAKE_MIKKE_OUTPUT: options.mikkeOutput,
          },
          stdout: 'pipe',
          stderr: 'pipe',
        },
      );
      return {
        exitCode: processResult.exitCode,
        stdout: processResult.stdout.toString(),
        stderr: processResult.stderr.toString(),
      };
    },
  };
}

describe('mikke-logで過去の調査ログを検索する', () => {
  describe('別のプロジェクトから実行する時', () => {
    it('検索結果のpathがナレッジベース配下の絶対パスで返ること', async () => {
      // Arrange
      const sut = await createMikkeLogHarness();
      const mikkeOutput = [
        "全文検索 'AIモデル' の結果 (1件, BM25 relevance 順):",
        '',
        '  モデル調査 (2026-08-20)',
        '    path: subagent-log/project-a/model.md',
        '    tags: project-a',
        '    summary: モデルの調査結果',
        '',
      ].join('\n');

      // Act
      const result = sut.run({ args: ['find', 'AIモデル'], mikkeOutput });

      // Assert
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain(
        'path: /home/alice/.claude/subagent-log/project-a/model.md',
      );
    });
  });

  describe('プロジェクトを指定する時', () => {
    it('複数プロジェクトの候補から指定したタグのログだけが返ること', async () => {
      // Arrange
      const sut = await createMikkeLogHarness();
      const mikkeOutput = jsonSearchResult([
        {
          title: '対象プロジェクトの調査',
          path: 'subagent-log/project-a/target.md',
          tags: ['project-a'],
        },
        {
          title: '別プロジェクトの調査',
          path: 'subagent-log/project-b/other.md',
          tags: ['project-b'],
        },
      ]);

      // Act
      const result = sut.run({
        args: ['find', '--project', 'project-a', 'AIモデル'],
        mikkeOutput,
      });

      // Assert
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('対象プロジェクトの調査');
      expect(result.stdout).not.toContain('別プロジェクトの調査');
    });

    it('指定したプロジェクトに該当するログがない時、終了コード1になること', async () => {
      // Arrange
      const sut = await createMikkeLogHarness();
      const mikkeOutput = jsonSearchResult([
        {
          title: '別プロジェクトの調査',
          path: 'subagent-log/project-b/other.md',
          tags: ['project-b'],
        },
      ]);

      // Act
      const result = sut.run({
        args: ['find', '--project', 'project-a', 'AIモデル'],
        mikkeOutput,
      });

      // Assert
      expect(result.exitCode).toBe(1);
      expect(result.stdout).toContain('結果 (0件');
    });

    it('JSON出力でも件数とpathが絞り込み後の値になること', async () => {
      // Arrange
      const sut = await createMikkeLogHarness();
      const mikkeOutput = jsonSearchResult([
        {
          title: '対象プロジェクトの調査',
          path: 'subagent-log/project-a/target.md',
          tags: ['project-a'],
        },
        {
          title: '別プロジェクトの調査',
          path: 'subagent-log/project-b/other.md',
          tags: ['project-b'],
        },
      ]);

      // Act
      const result = sut.run({
        args: ['find', '--project', 'project-a', 'AIモデル', '--json'],
        mikkeOutput,
      });

      // Assert
      expect(result.exitCode).toBe(0);
      expect(
        result.stdout
          .trim()
          .split('\n')
          .map((line) => JSON.parse(line)),
      ).toEqual([
        {
          type: 'meta',
          command: 'find',
          count: 1,
          order: 'relevance',
          capped: false,
        },
        {
          title: '対象プロジェクトの調査',
          path: '/home/alice/.claude/subagent-log/project-a/target.md',
          tags: ['project-a'],
        },
      ]);
    });
  });
});
