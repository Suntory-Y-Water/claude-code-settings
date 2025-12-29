---
trigger: always_on
description: "Astro, Bun, Tailwind CSSなどの技術スタックと主要なライブラリを定義します。"
---

# コード実行時のルール

TypeScriptのファイルを編集したときは、以下の３コマンドを順番に使用して全て成功することを確認する。

失敗した場合は直ちに修正する。

1. bun run format
2. bun run lint:ai
3. bun run type-check:ai