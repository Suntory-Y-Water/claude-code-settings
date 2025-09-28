import { describe, expect, it } from 'bun:test';
import {
  hasTypeScriptEdits,
  isTypeScriptFile,
  TYPE_SCRIPT_EXTENSIONS,
} from '../scripts/typescript/use_typecheck.ts';

describe('use_typecheck.ts', () => {
  const testDataDir = './tests/data';

  describe('A. transcript解析の堅牢性', () => {
    it('transcriptファイルが存在しない場合はfalseを返す', () => {
      const nonExistentPath = `${testDataDir}/non_existent.jsonl`;
      expect(hasTypeScriptEdits(nonExistentPath)).toBe(false);
    });

    it('transcriptファイルが空の場合はfalseを返す', () => {
      const emptyPath = `${testDataDir}/transcript_empty.jsonl`;
      expect(hasTypeScriptEdits(emptyPath)).toBe(false);
    });
  });

  describe('B. 時系列制約の正確性', () => {
    it('ユーザーメッセージより後のTypeScript編集を検出する', () => {
      const tsEditPath = `${testDataDir}/transcript_with_ts_edit.jsonl`;
      expect(hasTypeScriptEdits(tsEditPath)).toBe(true);
    });

    it('TypeScript以外の編集は検出しない', () => {
      const jsEditPath = `${testDataDir}/transcript_with_js_edit.jsonl`;
      expect(hasTypeScriptEdits(jsEditPath)).toBe(false);
    });

    it('isTypeScriptFileの拡張子判定', () => {
      expect(isTypeScriptFile('/path/to/file.ts', TYPE_SCRIPT_EXTENSIONS)).toBe(
        true,
      );
      expect(
        isTypeScriptFile('/path/to/file.tsx', TYPE_SCRIPT_EXTENSIONS),
      ).toBe(true);
      expect(isTypeScriptFile('/path/to/file.js', TYPE_SCRIPT_EXTENSIONS)).toBe(
        false,
      );
      expect(
        isTypeScriptFile('/path/to/file.json', TYPE_SCRIPT_EXTENSIONS),
      ).toBe(false);
    });

    it('最新ユーザーメッセージより前のTypeScript編集は無視する', () => {
      const oldTsEditPath = `${testDataDir}/transcript_old_ts_edit.jsonl`;
      expect(hasTypeScriptEdits(oldTsEditPath)).toBe(false);
    });

    it('複数ユーザーメッセージで最新以降のTypeScript編集のみ検出', () => {
      const multipleUsersPath = `${testDataDir}/transcript_multiple_users.jsonl`;
      expect(hasTypeScriptEdits(multipleUsersPath)).toBe(true);
    });

    it('混在編集でTypeScript編集があれば検出', () => {
      const mixedEditsPath = `${testDataDir}/transcript_mixed_edits.jsonl`;
      expect(hasTypeScriptEdits(mixedEditsPath)).toBe(true);
    });
  });
});
