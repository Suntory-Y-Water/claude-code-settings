# 前提

参考にしている記事 : https://wasabeef.jp/blog/claude-code-cookbook

# Claude Code Cookbook

Claude Code をもっと便利に使うための設定集です。

細かい確認を省いて自動的に作業を進めてくれるので、本来やりたいことに集中できます。
コードの修正やテストの実行、ドキュメントの更新など、よくある作業は Claude Code が判断して実行します。

## 導入とカスタマイズ

### 導入手順

1. リポジトリをクローン: `git clone https://github.com/Suntory-Y-Water/claude-code-settings.git ~/.claude`
2. クライアントでパスを設定: Claude のクライアントで、上記ディレクトリのパスを指定します
3. パスの確認: `settings.json` 内のスクリプトパスが環境と一致しているか確認します

### カスタマイズ

- コマンドの追加: `commands/` に `.md` ファイルを追加するだけです
- ロールの追加: `agents/roles/` に `.md` ファイルを追加するだけです
- Hooks の編集: `settings.json` を編集して、自動化処理を変更できます

---

## 移行ガイド

他のユーザーがこの設定集を試すための手順です。

### 新規インストール（推奨）

既存の `.claude` ディレクトリがない場合は、直接クローンできます。

```bash
git clone https://github.com/Suntory-Y-Water/claude-code-settings.git ~/.claude
```

### 既存の `.claude` ディレクトリがある場合

既存設定をバックアップしてから完全置換します。

```bash
# 既存設定をバックアップ
mv ~/.claude ~/.claude_backup_$(date +%Y%m%d_%H%M%S)

# 新しい設定をクローン
git clone https://github.com/Suntory-Y-Water/claude-code-settings.git ~/.claude
```

### 注意事項

- クレデンシャル情報: このリポジトリには機密情報は含まれていませんが、個人の API キーなどは別途設定してください。GitHub で管理していない情報は`.gitignore`をご確認ください。
- 通知機能: 一部のスクリプトの通知機能は OS によって異なります。
- 依存関係: `jq` や `rg`（ripgrep）などのツールが必要な場合があります
