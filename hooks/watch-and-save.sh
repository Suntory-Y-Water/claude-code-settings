#!/bin/bash

# 保存先ディレクトリ（Obsidian）
OBSIDIAN_DIR="/Users/n_okuda/dev/sui-articles/claude"
LOG_FILE="$HOME/.claude/logs/watch-and-save.log"
STATE_DIR="$HOME/.claude/logs/session-states"

# ログ関数
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

# 保存先ディレクトリが存在しない場合は作成
mkdir -p "$OBSIDIAN_DIR"
mkdir -p "$STATE_DIR"

log "監視を開始します"

while true; do
    # UUID形式のsessionファイルを検索
    find "$HOME/.claude/projects" -name "[0-9a-f]*-[0-9a-f]*-[0-9a-f]*-[0-9a-f]*-[0-9a-f]*.jsonl" -type f 2>/dev/null | while read -r SESSION_PATH; do
        if [ -f "$SESSION_PATH" ]; then
            # ファイル名からUUIDを抽出して状態ファイル名を作成
            SESSION_UUID=$(basename "$SESSION_PATH" .jsonl)
            STATE_FILE="$STATE_DIR/$SESSION_UUID.state"

            # 状態ファイルの初期化
            if [ ! -f "$STATE_FILE" ]; then
                echo "0" > "$STATE_FILE"
            fi

            # 前回処理した行数を取得
            LAST_LINE=$(cat "$STATE_FILE" 2>/dev/null || echo "0")
            CURRENT_LINES=$(wc -l < "$SESSION_PATH" | tr -d ' ')

            # 新しい行がある場合のみ処理
            if [ "$CURRENT_LINES" -gt "$LAST_LINE" ]; then
                log "新しい行を検出 ($SESSION_UUID): $((CURRENT_LINES - LAST_LINE))行"

                # 新しい行のみを処理
                tail -n +$((LAST_LINE + 1)) "$SESSION_PATH" | while IFS= read -r line; do
                    # タイムスタンプを抽出（ISO 8601形式）
                    TIMESTAMP=$(echo "$line" | jq -r '.timestamp // empty')

                    if [ -n "$TIMESTAMP" ]; then
                        # ISO 8601形式から日付部分を抽出（YYYY-MM-DD）
                        DATE=$(echo "$TIMESTAMP" | cut -d'T' -f1)

                        if [ -n "$DATE" ]; then
                            OUTPUT_FILE="$OBSIDIAN_DIR/$DATE.md"

                            # ファイルが存在しない場合はヘッダーを作成
                            if [ ! -f "$OUTPUT_FILE" ]; then
                                echo "# $DATE Claudeとの会話" > "$OUTPUT_FILE"
                                echo "" >> "$OUTPUT_FILE"
                            fi

                            # メッセージタイプを取得
                            TYPE=$(echo "$line" | jq -r '.type // empty')

                            # ユーザーメッセージの処理
                            if [ "$TYPE" = "user" ]; then
                                # message.contentが文字列の場合と配列の場合を両方処理
                                CONTENT=$(echo "$line" | jq -r '
                                    if (.message.content | type) == "string" then
                                        .message.content
                                    else
                                        .message.content[] | select(.type == "text") | .text // empty
                                    end
                                ' 2>/dev/null | sed -E 's/<[^>]+>//g' | sed '/^$/d')
                                if [ -n "$CONTENT" ]; then
                                    echo "**ユーザー**: $CONTENT" >> "$OUTPUT_FILE"
                                    echo "" >> "$OUTPUT_FILE"
                                fi
                            fi

                            # Claudeのレスポンスの処理
                            if [ "$TYPE" = "assistant" ]; then
                                # message.content配列からtextタイプのコンテンツを抽出
                                CONTENT=$(echo "$line" | jq -r '.message.content[] | select(.type == "text") | .text // empty' 2>/dev/null | sed -E 's/<[^>]+>//g' | sed '/^$/d')
                                if [ -n "$CONTENT" ]; then
                                    echo "**Claude**: $CONTENT" >> "$OUTPUT_FILE"
                                    echo "" >> "$OUTPUT_FILE"
                                fi
                            fi
                        fi
                    fi
                done

                # 処理した行数を更新
                echo "$CURRENT_LINES" > "$STATE_FILE"
            fi
        fi
    done

    # 5秒待機
    sleep 5
done
