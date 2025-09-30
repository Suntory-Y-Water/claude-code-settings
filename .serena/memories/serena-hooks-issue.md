# Serena MCPツールでHooksが発動しない問題

## やりたいこと

`no_restricted_edit.ts`フックを使用して、TypeScriptファイルで`any`/`unknown`型の使用を制限したい。
具体的には、以下のツールでの編集時にPreToolUseイベントで検証を行う:
- Claude Code標準ツール: `Edit`, `MultiEdit`
- Serena MCPツール: `mcp__serena__replace_symbol_body`, `mcp__serena__insert_after_symbol`, `mcp__serena__insert_before_symbol`

## 課題

### 動作する場合
- **Editツール**: PreToolUseフックが正常に発動し、`any`型を含む編集をブロックできる ✅

### 動作しない場合
- **Serena MCPツール**: PreToolUseフックが発動せず、`any`型を含む編集が通過してしまう ❌
- **Writeツール**: PreToolUseフックが発動しない ❌

### 検証結果

デバッグログを`no_restricted_edit.ts`に追加してテストした結果:
- Editツール使用時: ログが出力され、フックが正常に実行される
- Serena MCPツール使用時: ログが一切出力されない = `run`関数自体が呼ばれていない

## 原因

### 確認された事実

1. **Serena MCPツールのパラメータ形式**
   ```json
   {
     "name_path": "f",
     "relative_path": "scripts/typescript/typecheck.ts",
     "body": "const f: any = \"serena test\";"
   }
   ```
   - `relative_path`は相対パス形式
   - `body`にはシンボル全体が含まれる

2. **Editツールのパラメータ形式**
   ```json
   {
     "file_path": "/Users/n_okuda/.claude/scripts/typescript/typecheck.ts",
     "old_string": "...",
     "new_string": "..."
   }
   ```
   - `file_path`は絶対パス形式

3. **フック設定**
   ```typescript
   trigger: {
     PreToolUse: {
       Edit: true,
       MultiEdit: true,
       mcp__serena__insert_after_symbol: true,
       mcp__serena__insert_before_symbol: true,
       mcp__serena__replace_symbol_body: true,
     },
   }
   ```

4. **実行結果**
   - Serena MCPツール実行時、PreToolUseフックの`run`関数が呼ばれない
   - ただし、Stopフック(`use_typecheck.ts`)は正常に動作し、型エラーを検出する

## 仮説

### 仮説1: MCPツールのフック統合が未実装または不完全
Claude CodeのMCPツール統合において、PreToolUseイベントが正しく発火されていない可能性がある。
- MCPツールは標準ツールとは異なるコードパスで実行される
- PreToolUseフックのトリガー登録がMCPツールに対応していない

### 仮説2: ツール名のマッピング問題
`.mcp.json`やフックシステムにおいて、MCPツールの名前解決が正しく行われていない可能性がある。
- `mcp__serena__replace_symbol_body`という名前でトリガー登録しているが、実際のツール名が異なる
- MCPサーバー側での名前とClaude Code側での名前が一致していない

### 仮説3: Writeツールも同様の問題
Writeツールも発動しなかったことから、特定のツールカテゴリ(破壊的な書き込みを行うツール)がPreToolUseフックの対象外になっている可能性がある。
- EditツールはPreToolUse対応
- WriteツールやMCPツールはPreToolUse非対応

## 対応方針

### 短期対応
- Serena MCPツールのフック対応は現状では困難と判断
- EditツールとMultiEditツールのみを対象とする
- Writeツールのトリガー設定も削除済み

### 長期対応(要調査)
1. Claude CodeのMCPフック統合実装を調査
2. `.mcp.json`の設定を確認
3. Serena MCPサーバー側のフック対応状況を確認
4. 必要に応じてClaude Code開発チームへのissue報告を検討

## 関連ファイル
- `/Users/n_okuda/.claude/scripts/typescript/no_restricted_edit.ts`: PreToolUseフック実装
- `/Users/n_okuda/.claude/scripts/typescript/use_typecheck.ts`: Stopフック実装(こちらは正常動作)
- `/Users/n_okuda/.claude/.mcp.json`: MCP設定ファイル
- `/Users/n_okuda/.claude/projects/-Users-n-okuda--claude/3414c6e6-9369-4e0c-a50b-611c456c24e6.jsonl`: テスト実行履歴

## 参考情報
- 会話履歴では、Serena MCPツール実行後に"OK"が返されるが、その直後にStopフックで型エラーが検出される
- これは編集自体は成功しているが、PreToolUseでのチェックがスキップされていることを示す