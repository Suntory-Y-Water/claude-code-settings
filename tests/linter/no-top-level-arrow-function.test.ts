import { describe, expect, it } from 'bun:test';
import { Project } from 'ts-morph';
import { noTopLevelArrowFunction } from '../../scripts/typescript/linter/rules/no-top-level-arrow-function';

describe('no-top-level-arrow-function rule', () => {
  it('Topレベルのアロー関数を検出する', () => {
    const project = new Project({ useInMemoryFileSystem: true });
    const sourceFile = project.createSourceFile(
      'test.ts',
      `
      const greet = (name: string) => {
        return \`Hello, \${name}\`;
      };
      `,
    );

    const errors = noTopLevelArrowFunction(sourceFile);

    expect(errors.length).toBe(1);
    expect(errors[0]).toContain(
      "Top-level arrow function 'greet' is forbidden",
    );
    expect(errors[0]).toContain("Use 'function' declaration");
  });

  it('exportされたTopレベルのアロー関数を検出する', () => {
    const project = new Project({ useInMemoryFileSystem: true });
    const sourceFile = project.createSourceFile(
      'test.ts',
      `
      export const greet = (name: string) => {
        return \`Hello, \${name}\`;
      };
      `,
    );

    const errors = noTopLevelArrowFunction(sourceFile);

    expect(errors.length).toBe(1);
    expect(errors[0]).toContain('greet');
  });

  it('複数のTopレベルアロー関数を検出する', () => {
    const project = new Project({ useInMemoryFileSystem: true });
    const sourceFile = project.createSourceFile(
      'test.ts',
      `
      const add = (a: number, b: number) => a + b;
      const subtract = (a: number, b: number) => a - b;
      `,
    );

    const errors = noTopLevelArrowFunction(sourceFile);

    expect(errors.length).toBe(2);
    expect(errors[0]).toContain('add');
    expect(errors[1]).toContain('subtract');
  });

  it('function宣言は検出しない', () => {
    const project = new Project({ useInMemoryFileSystem: true });
    const sourceFile = project.createSourceFile(
      'test.ts',
      `
      function greet(name: string) {
        return \`Hello, \${name}\`;
      }
      `,
    );

    const errors = noTopLevelArrowFunction(sourceFile);

    expect(errors.length).toBe(0);
  });

  it('関数内のアロー関数は検出しない', () => {
    const project = new Project({ useInMemoryFileSystem: true });
    const sourceFile = project.createSourceFile(
      'test.ts',
      `
      function process() {
        const mapper = (x: number) => x * 2;
        return [1, 2, 3].map(mapper);
      }
      `,
    );

    const errors = noTopLevelArrowFunction(sourceFile);

    expect(errors.length).toBe(0);
  });
});
