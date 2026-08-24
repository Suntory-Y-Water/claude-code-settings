# claude code settings

## mikke

`subagent-log/` を検索する Markdown ノート検索 CLI。ラッパーは
`scripts/mikke/mikke-log.ts` (`mikke-log.sh` 経由で呼ぶ)、設定は `mikke.toml`。

### バージョンの使い分け

| 環境 | バージョン |
| --- | --- |
| semantic / hybrid 検索を使うマシン | 0.3.0 (+semantic) |
| それ以外 | 0.2.0 |

0.3.0 の semantic feature は次の 2 つを別途用意する必要があり、どちらも欠けると
`mikke semantic` / `mikke embed` がファイル不在で失敗する。

- `.mikke/embeddings/` の埋め込み (`embeddings.safetensors` と `metadata.json`)。
  `.mikke/` は gitignore しているので clone しただけでは存在しない。
- 埋め込みモデル `intfloat/multilingual-e5-small` (`config.json` / `tokenizer.json` /
  `model.safetensors`)。初回の `mikke embed` が HuggingFace から
  `~/.cache/huggingface/hub` へ取得する。

これらを揃えられないマシンでは、`mikke.toml` の `[semantic] enabled` を切るのではなく
0.2.0 を入れる。`mikke hybrid` は埋め込みが無ければ BM25 のみへ degrade するため、
0.3.0 のまま埋め込み未構築で運用しても hybrid は動くが semantic は動かない。

### セットアップ

```sh
# 1. mikke 本体を PATH の通った場所 (例: ~/.local/bin) へ入れる
mikke --version   # 0.3.0 (+semantic) / 0.2.0 を確認

# 2. index を構築
mikke --root ~/.claude index

# 3. semantic を使う場合のみ (モデルの初回ダウンロードが走る)
mikke --root ~/.claude embed
```
