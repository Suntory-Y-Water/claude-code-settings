import { describe, expect, it } from 'bun:test';
import { Project } from 'ts-morph';
import { maxParams } from '../../scripts/typescript/linter/rules/max-params';

describe('max-params rule', () => {
  it('2個以上の引数を持つ関数宣言を検出する', () => {
    const project = new Project({ useInMemoryFileSystem: true });
    const sourceFile = project.createSourceFile(
      'test.ts',
      `
      function foo(a: string, b: number) {
        return a + b;
      }
      `,
    );

    const errors = maxParams(sourceFile);

    expect(errors.length).toBe(1);
    expect(errors[0]).toContain("Function 'foo' has 2 arguments");
    expect(errors[0]).toContain('must use a single object argument');
  });

  it('1個の引数を持つ関数は検出しない', () => {
    const project = new Project({ useInMemoryFileSystem: true });
    const sourceFile = project.createSourceFile(
      'test.ts',
      `
      function foo(a: string) {
        return a;
      }
      `,
    );

    const errors = maxParams(sourceFile);

    expect(errors.length).toBe(0);
  });

  it('引数なしの関数は検出しない', () => {
    const project = new Project({ useInMemoryFileSystem: true });
    const sourceFile = project.createSourceFile(
      'test.ts',
      `
      function foo() {
        return 42;
      }
      `,
    );

    const errors = maxParams(sourceFile);

    expect(errors.length).toBe(0);
  });
});
