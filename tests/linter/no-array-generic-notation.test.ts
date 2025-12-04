import { describe, expect, it } from 'bun:test';
import { Project } from 'ts-morph';
import { noArrayGenericNotation } from '../../scripts/typescript/linter/rules/no-array-generic-notation';

describe('no-array-generic-notation rule', () => {
  it('Array<T>記法を検出する', () => {
    const project = new Project({ useInMemoryFileSystem: true });
    const sourceFile = project.createSourceFile(
      'test.ts',
      `
      const users: Array<string> = [];
      `,
    );

    const errors = noArrayGenericNotation(sourceFile);

    expect(errors.length).toBe(1);
    expect(errors[0]).toContain(
      "Generic array notation 'Array<string>' is forbidden",
    );
    expect(errors[0]).toContain("Use 'string[]' instead");
  });

  it('ReadonlyArray<T>記法を検出する', () => {
    const project = new Project({ useInMemoryFileSystem: true });
    const sourceFile = project.createSourceFile(
      'test.ts',
      `
      const users: ReadonlyArray<string> = [];
      `,
    );

    const errors = noArrayGenericNotation(sourceFile);

    expect(errors.length).toBe(1);
    expect(errors[0]).toContain(
      "Generic array notation 'ReadonlyArray<string>' is forbidden",
    );
    expect(errors[0]).toContain("Use 'readonly string[]' instead");
  });

  it('複数のArray<T>記法を検出する', () => {
    const project = new Project({ useInMemoryFileSystem: true });
    const sourceFile = project.createSourceFile(
      'test.ts',
      `
      function process(items: Array<string>): Array<number> {
        return items.map(x => x.length);
      }
      `,
    );

    const errors = noArrayGenericNotation(sourceFile);

    expect(errors.length).toBe(2);
    expect(errors[0]).toContain('Array<string>');
    expect(errors[1]).toContain('Array<number>');
  });

  it('T[]記法は検出しない', () => {
    const project = new Project({ useInMemoryFileSystem: true });
    const sourceFile = project.createSourceFile(
      'test.ts',
      `
      const users: string[] = [];
      const numbers: number[] = [];
      `,
    );

    const errors = noArrayGenericNotation(sourceFile);

    expect(errors.length).toBe(0);
  });

  it('readonly T[]記法は検出しない', () => {
    const project = new Project({ useInMemoryFileSystem: true });
    const sourceFile = project.createSourceFile(
      'test.ts',
      `
      const users: readonly string[] = [];
      `,
    );

    const errors = noArrayGenericNotation(sourceFile);

    expect(errors.length).toBe(0);
  });
});
