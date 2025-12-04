import { describe, expect, it } from 'bun:test';
import { Project } from 'ts-morph';
import { noInterface } from '../../scripts/typescript/linter/rules/no-interface';

describe('no-interface rule', () => {
  it('interfaceを検出する', () => {
    const project = new Project({ useInMemoryFileSystem: true });
    const sourceFile = project.createSourceFile(
      'test.ts',
      `
      interface User {
        name: string;
        age: number;
      }
      `,
    );

    const errors = noInterface(sourceFile);

    expect(errors.length).toBe(1);
    expect(errors[0]).toContain("Interface 'User' is forbidden");
    expect(errors[0]).toContain("Use 'type' alias instead");
  });

  it('複数のinterfaceを検出する', () => {
    const project = new Project({ useInMemoryFileSystem: true });
    const sourceFile = project.createSourceFile(
      'test.ts',
      `
      interface User {
        name: string;
      }

      interface Product {
        id: number;
      }
      `,
    );

    const errors = noInterface(sourceFile);

    expect(errors.length).toBe(2);
    expect(errors[0]).toContain('User');
    expect(errors[1]).toContain('Product');
  });

  it('type aliasは検出しない', () => {
    const project = new Project({ useInMemoryFileSystem: true });
    const sourceFile = project.createSourceFile(
      'test.ts',
      `
      type User = {
        name: string;
        age: number;
      };
      `,
    );

    const errors = noInterface(sourceFile);

    expect(errors.length).toBe(0);
  });
});
