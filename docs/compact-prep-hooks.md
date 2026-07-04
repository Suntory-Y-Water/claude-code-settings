# compact 対策フック群

Claude Code の compact(手動 `/compact` と自動 compact の両方)が「作業指示」と
「作業ログ」を混同させる問題への対策。圧縮前に判断構造とセッション状態を
state file へ退避し、圧縮直後に読み直させる。200K context 環境向けの設定。

## 構成要素

### 1. `~/.claude/skills/compact-prep/SKILL.md`

`/compact-prep` slash command。圧縮サマリーに残りにくい情報
(採用/却下した案、plan のフェーズ、worker 体制、未検証の編集など)を
`${TMPDIR}/claude-compact-state/<session_id>.md` に保存する。

session_id は `~/.claude/scripts/get-session-id.sh`(`$CLAUDE_CODE_SESSION_ID`
を echo するだけ)で取得する。取得できなければ state file を作らず停止する。

このディレクトリは `.gitignore` の `skills/` によって除外されているため、
このリポジトリには含まれない(git 管理外)。

### 2. 圧縮直後の復旧 2 段 hook

PostCompact は `additionalContext` を返せないため、marker file 経由で
次の UserPromptSubmit に指示を持ち越す。

- `hooks/compaction-recovery.sh` (PostCompact): 圧縮発生を
  `${TMPDIR}/claude-compacted/<session_id>` に記録するだけ。指示は書かない。
- `hooks/userpromptsubmit-compaction-recovery.sh` (UserPromptSubmit):
  上記 marker を検知したら one-shot で `additionalContext` に復旧指示
  (state file / plan file を読み直せ、TaskList を確認せよ、圧縮サマリーの
  next step は仮説として扱え 等)を注入し、marker を消す。

### 3. 自動 compact 回避のための閾値通知

自動 compact は宣言なしに走るため、閾値超過時にユーザー自身が
`/compact-prep` → `/compact` を打てるよう先回りで促す。

- `scripts/statusline.py`: `context_window.used_percentage` が閾値を超えたら
  `${TMPDIR}/claude-compact-warn/<session_id>` に warn marker を書く。
  cooldown marker (`claude-compact-warned/`) がある間は書かない。
  閾値は `context_window_size` を見て分岐する
  (`compact_warn_threshold()`, 200K相当は 80%、1M相当(≥700K)は 60%)。
- `hooks/userpromptsubmit-compact-prep-reminder.sh` (UserPromptSubmit):
  warn marker を検知したら「即座に `/compact-prep` を提案せよ」という
  additionalContext を注入し、warn marker を消して cooldown marker を書く。

200K 環境では自動 compact 発火点(90〜95%)までの余白が数十K トークンしか
ないため、元記事の「区切りが良いところで」ではなく「即座に」実行を促す
文言にしている。1M context (`context_window_size >= 700_000`) では逆に
60% で早めに警告し、区切りを待つ余裕を残す設計にしている。

### 4. active plan pointer (推測ベース、未検証)

`scripts/typescript/active-plan-pointer.ts` (PostToolUse Write|Edit,
`create-plan-link.ts` と同じ判定ロジックに相乗り): `.claude/plans/` 配下への
書き込みを検知し、そのパスを `${TMPDIR}/claude-active-plan/<session_id>` に
記録する。復旧 hook (2.) はこれを読んで「この plan ファイルを読み直せ」を
追加で注入する。

「session 中最後に書かれた plan ファイルが常に復旧すべき active plan である」
という前提は未検証。複数 plan を並行して扱うセッションでは外れうる。
pointer file が無い/古い場合も復旧 hook は fail-open で黙って何もしないため、
実害は「復旧ヒントが薄くなる」程度に留まる。

## marker file 一覧

| marker | 書く hook | 消す hook | 役割 |
|---|---|---|---|
| `claude-compact-warn/<sid>` | statusline.py | userpromptsubmit-compact-prep-reminder.sh | 閾値超過を1回だけ通知する |
| `claude-compact-warned/<sid>` | userpromptsubmit-compact-prep-reminder.sh | compaction-recovery.sh (PostCompact) | 二重通知防止の cooldown |
| `claude-compacted/<sid>` | compaction-recovery.sh (PostCompact) | userpromptsubmit-compaction-recovery.sh | 圧縮直後の復旧指示注入トリガー |
| `claude-active-plan/<sid>` | active-plan-pointer.ts | (消さない、上書きのみ) | 復旧時に読み直す plan ファイルの場所 |

すべて fail-open。hook が壊れても Claude Code 本体は止まらない。

## settings.json への登録

`hooks.PostCompact`, `hooks.UserPromptSubmit`, `hooks.PostToolUse` (Write|Edit
matcher に `active-plan-pointer.ts` を追加) に登録済み。設定ファイル自体は
このリポジトリでは管理していない。
