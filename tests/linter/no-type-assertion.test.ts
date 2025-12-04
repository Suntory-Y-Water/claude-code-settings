import { describe, expect, it } from 'bun:test';
import { Project } from 'ts-morph';
import { noTypeAssertion } from '../../scripts/typescript/linter/rules/no-type-assertion';

describe('no-type-assertion rule', () => {
  it('as型アサーションを検出する', () => {
    const project = new Project({ useInMemoryFileSystem: true });
    const sourceFile = project.createSourceFile(
      'test.ts',
      `
      const data = { name: "test" } as User;
      `,
    );

    const errors = noTypeAssertion(sourceFile);

    expect(errors.length).toBe(1);
    expect(errors[0]).toContain("Type assertion 'as' is forbidden");
    expect(errors[0]).toContain('asserted as');
  });

  it('複数のas型アサーションを検出する', () => {
    const project = new Project({ useInMemoryFileSystem: true });
    const sourceFile = project.createSourceFile(
      'test.ts',
      `
      const user = { name: "Alice" } as User;
      const product = { id: 1 } as Product;
      `,
    );

    const errors = noTypeAssertion(sourceFile);

    expect(errors.length).toBe(2);
  });

  it('通常の型注釈は検出しない', () => {
    const project = new Project({ useInMemoryFileSystem: true });
    const sourceFile = project.createSourceFile(
      'test.ts',
      `
      const name: string = "test";
      const age: number = 25;
      `,
    );

    const errors = noTypeAssertion(sourceFile);

    expect(errors.length).toBe(0);
  });

  it('関数の戻り値の型注釈は検出しない', () => {
    const project = new Project({ useInMemoryFileSystem: true });
    const sourceFile = project.createSourceFile(
      'test.ts',
      `
      function getName(): string {
        return "test";
      }
      `,
    );

    const errors = noTypeAssertion(sourceFile);

    expect(errors.length).toBe(0);
  });
});
