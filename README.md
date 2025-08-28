# 前提

参考にしている記事 : https://wasabeef.jp/blog/claude-code-cookbook

## 注意点

Windows 環境の人は`git config core.autocrlf`を`false`にしてください

# Claude Code Cookbook

Claude Code をもっと便利に使うための設定集です。

細かい確認を省いて自動的に作業を進めてくれるので、本来やりたいことに集中できます。
コードの修正やテストの実行、ドキュメントの更新など、よくある作業は Claude Code が判断して実行します。

## 主要機能

3 つの機能で Claude Code の動作をカスタマイズできます。

- Commands: `/` で始まるカスタムコマンド
- Roles: 専門家の視点で回答するための役割設定
- Hooks: 特定のタイミングでスクリプトを自動実行

---

## 機能一覧

### Commands（カスタムコマンド）

`/commands` ディレクトリ内の Markdown ファイルとして保存されています。`/` に続けてファイル名を入力すると実行できます。

| コマンド                | 説明                                                                                     |
| :---------------------- | :--------------------------------------------------------------------------------------- |
| `/analyze-dependencies` | プロジェクトの依存関係を分析し、循環依存や構造的な問題を視覚化する。                     |
| `/analyze-performance`  | アプリケーションのパフォーマンス問題を分析し、技術的負債の観点から改善策を提案する。     |
| `/check-fact`           | プロジェクト内のコードベース、ドキュメントを参照し、与えられた情報の正誤を確認する。     |
| `/check-prompt`         | 現在のプロンプトの内容をレビューし、改善案を提示する。                                   |
| `/commit-message`       | 変更内容に基づいてコミットメッセージだけを生成する。                                     |
| `/design-patterns`      | デザインパターンに基づいた実装を提案・レビューする。                                     |
| `/explain-code`         | 選択されたコードの機能やロジックを分かりやすく説明する。                                 |
| `/fix-error`            | エラーメッセージを元に、コードの修正案を提示する。                                       |
| `/multi-role`           | 複数の役割（Role）を組み合わせて、同じ対象を並行分析し統合レポートを生成する。           |
| `/plan`                 | 実装前の計画立案モードを起動し、詳細な実装戦略を策定する。                               |
| `/refactor`             | 安全で段階的なコードリファクタリングを実施し、SOLID 原則の遵守状況を評価する。           |
| `/role-debate`          | 複数の役割（Role）で、特定のテーマについて討論させる。                                   |
| `/role-help`            | 利用可能な Role の一覧と説明を表示する。                                                 |
| `/role`                 | 指定した役割（Role）として振る舞う。                                                     |
| `/search-gemini`        | Gemini を使って Web 検索を行う。                                                         |
| `/sequential-thinking`  | Sequential Thinking MCP を使用して複雑な問題を順を追って段階的に考え、結論を導き出す。   |
| `/show-plan`            | 現在の実行計画を表示する。                                                               |
| `/smart-review`         | 高度なレビューを行い、コード品質を向上させる。                                           |
| `/spec`                 | 要求事項から、Kiro の spec-driven development に準拠した詳細な仕様書を段階的に作成する。 |
| `/style-ai-writting`    | AI が生成したような不自然な文章を検出し、修正する。                                      |
| `/task`                 | 専用エージェントを起動して、複雑な検索・調査・分析タスクを自律的に実行する。             |
| `/tech-debt`            | プロジェクトの技術的負債を分析し、優先順位付けされた改善計画を作成する。                 |
| `/update-doc-string`    | 複数言語対応のドキュメント文字列を統一的に管理・更新する。                               |
| `/update-node-deps`     | Node.js プロジェクトの依存関係を安全に更新する。                                         |

### Roles（役割設定）

`agents/roles/` ディレクトリ内の Markdown ファイルで定義されています。Claude に専門家の視点を持たせて、より的確な回答を得られます。

各ロールはサブエージェントとして独立実行することも可能です。`--agent` オプションを使用すると、メインの会話コンテキストを妨げることなく、大規模な分析や専門的な処理を並列実行できます。

| ロール              | 説明                                                                                     |
| :------------------ | :--------------------------------------------------------------------------------------- |
| `/role analyzer`    | システム分析の専門家として、コードやアーキテクチャの分析を行う。                         |
| `/role architect`   | ソフトウェアアーキテクトとして、設計に関するレビューや提案を行う。                       |
| `/role frontend`    | フロントエンドの専門家として、UI/UX やパフォーマンスに関する助言をする。                 |
| `/role mobile`      | モバイルアプリ開発の専門家として、iOS/Android のベストプラクティスに基づいた回答をする。 |
| `/role performance` | パフォーマンス最適化の専門家として、速度やメモリ使用量の改善を提案する。                 |
| `/role qa`          | QA エンジニアとして、テスト計画や品質保証の観点からレビューする。                        |
| `/role reviewer`    | コードレビュアーとして、可読性や保守性の観点からコードを評価する。                       |
| `/role security`    | セキュリティ専門家として、脆弱性やセキュリティリスクを指摘する。                         |

#### サブエージェント実行例

```bash
# 通常モード（メインコンテキストで実行）
/role security
「このプロジェクトのセキュリティチェック」

# サブエージェントモード（独立コンテキストで実行）
/role security --agent
「プロジェクト全体のセキュリティ監査を実行」

# 複数ロールの並列分析
/multi-role security,performance --agent
「システム全体のセキュリティとパフォーマンスを包括的に分析」
```

### Hooks（自動化スクリプト）

`settings.json` で設定して、開発作業を自動化できます。

| 実行スクリプト       | イベント       | 説明                                                                            |
| :------------------- | :------------- | :------------------------------------------------------------------------------ |
| `deny-check.sh`      | `PreToolUse`   | `rm -rf /` のような危険なコマンドの実行を未然に防ぐ。                           |
| `check-ai-commit.sh` | `PreToolUse`   | `git commit` でコミットメッセージに AI の署名が含まれている場合にエラーを出す。 |
| `ja-space-format.sh` | `PostToolUse`  | ファイル保存時に、日本語と英数字の間のスペースを自動で整形する。                |
| `auto-comment.sh`    | `PostToolUse`  | 新規ファイル作成時や大幅な編集時に、docstring や API ドキュメントの追加を促す。 |
| `notify-waiting`     | `Notification` | Claude がユーザーの確認を待っている時に、macOS の通知センターでお知らせする。   |
| `check-continue.sh`  | `Stop`         | タスク完了時に、継続可能なタスクがないか確認する。                              |
| `(osascript)`        | `Stop`         | 全タスク完了時に、macOS の通知センターで完了を知らせる。                        |

---

## 開発フローとコマンド使用ガイド

### 一般的な開発フローでのコマンド活用例

```mermaid
flowchart TB
    Start([タスク確認]) --> TaskType{種類は？}

    TaskType -->|新機能| Plan["/spec<br/>要件定義・設計"]
    TaskType -->|バグ修正| Fix["/fix-error<br/>エラー分析"]
    TaskType -->|リファクタリング| Refactor["/refactor<br/>改善"]
    TaskType -->|レビュー| Review["/smart-review<br/>レビュー"]

    Plan --> Design["/role architect<br/>/role-debate<br/>設計相談"]
    Design --> Implementation[実装・テスト]
    Fix --> Implementation
    Refactor --> Implementation
    Review --> Implementation

    Implementation --> Check["/smart-review<br/>品質チェック"]
    Check --> Commit["/commit-message<br/>コミット作成"]
    Commit --> PR["PR作成・レビュー"]
    PR --> CI["CI/テスト実行"]

    CI --> Status{問題あり？}
    Status -->|はい| Feedback["修正対応<br/>/fix-error"]
    Status -->|いいえ| End([完了])

    Feedback --> Implementation

    classDef commandBox fill:#e0f2fe,stroke:#0369a1,stroke-width:2px,rx:5,ry:5,color:#0c4a6e
    classDef processBox fill:#f0f9ff,stroke:#0ea5e9,stroke-width:1px,rx:5,ry:5,color:#075985
    classDef decisionBox fill:#fef3c7,stroke:#f59e0b,stroke-width:2px,rx:5,ry:5,color:#78350f
    classDef startEnd fill:#86efac,stroke:#22c55e,stroke-width:2px,rx:20,ry:20,color:#14532d

    class Plan,Fix,Refactor,Review,Design,Check,Commit,Feedback commandBox
    class Implementation,PR,CI processBox
    class TaskType,Status decisionBox
    class Start,End startEnd

    %%{init: {'theme':'base', 'themeVariables': { 'primaryColor':'#e0f2fe', 'primaryTextColor':'#0c4a6e', 'primaryBorderColor':'#0369a1', 'lineColor':'#64748b', 'secondaryColor':'#f0f9ff', 'background':'#ffffff', 'mainBkg':'#ffffff', 'fontSize': '14px'}}}%%
```

---

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

### インストール後の確認

Claude Code で基本コマンドが使えるかテストします。

```bash
# Claude Code で以下を実行
/role-help
```

### 注意事項

- クレデンシャル情報: このリポジトリには機密情報は含まれていませんが、個人の API キーなどは別途設定してください。GitHub で管理していない情報は`.gitignore`をご確認ください。
- 通知機能: 一部のスクリプトの通知機能は OS によって異なります。
- 依存関係: `jq` や `rg`（ripgrep）などのツールが必要な場合があります
