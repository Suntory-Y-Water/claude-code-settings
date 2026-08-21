#!/usr/bin/env python3
"""subagent-log の md へ mikke 用 frontmatter (date / updated / tags / summary) を補う。

date が無いと mikke の recent と date 順ソートが機能せず、summary が無いと検索結果が
タイトルとパスだけになり本文を開くまで当たりか判断できない。既存のキーは上書きせず、
欠けているものだけを足すので何度実行しても結果は変わらない。
"""

import argparse
import os
import re
import sys
from datetime import date
from pathlib import Path

DEFAULT_ROOT = Path.home() / ".claude" / "subagent-log"
FRONTMATTER_KEYS = ("date", "updated", "tags", "summary")
SUMMARY_MAX_CHARS = 120
DATE_IN_NAME = re.compile(r"^(\d{4}-\d{2}-\d{2})_")
USER_PREFIX = re.compile(r"^-Users-[^-]+-")
FENCE = re.compile(r"^\s*(```|~~~)")
SKIP_LINE = re.compile(r"^\s*(#{1,6}\s|>|\||-{3,}\s*$|\*{3,}\s*$|<)")
LIST_MARKER = re.compile(r"^\s*([-*+]|\d+[.)])\s+")


def strip_inline_markdown(text: str) -> str:
    text = re.sub(r"!\[[^\]]*\]\([^)]*\)", "", text)
    text = re.sub(r"\[([^\]]*)\]\([^)]*\)", r"\1", text)
    text = re.sub(r"`+([^`]*)`+", r"\1", text)
    text = re.sub(r"\*\*([^*]*)\*\*", r"\1", text)
    text = re.sub(r"(?<!\w)[*_]([^*_]+)[*_](?!\w)", r"\1", text)
    return re.sub(r"\s+", " ", text).strip()


def extract_summary(body: str) -> str:
    """本文の冒頭の散文を要約に流用する。見出し・コードブロック・表は飛ばす。

    先頭段落が「調査完了」のような一言だけのことがあるため、上限に届くまで後続の
    段落も continue して拾う。
    """
    collected: list[str] = []
    length = 0
    in_fence = False
    for line in body.splitlines():
        if FENCE.match(line):
            in_fence = not in_fence
            continue
        if in_fence or not line.strip() or SKIP_LINE.match(line):
            continue
        piece = LIST_MARKER.sub("", line).strip()
        collected.append(piece)
        length += len(piece)
        if length >= SUMMARY_MAX_CHARS:
            break

    text = strip_inline_markdown(" ".join(collected))
    if not text:
        return ""

    # 文の途中で切ると読み手が続きを補えないので、収まる範囲の句点で止める
    cut = text.rfind("。", 0, SUMMARY_MAX_CHARS + 1)
    if cut >= 20:
        return text[: cut + 1]
    if len(text) > SUMMARY_MAX_CHARS:
        return text[:SUMMARY_MAX_CHARS] + "…"
    return text


def yaml_quote(text: str) -> str:
    return '"' + text.replace("\\", "\\\\").replace('"', '\\"') + '"'


def project_tag(dir_name: str) -> str:
    name = USER_PREFIX.sub("", dir_name)
    name = re.sub(r"^dev-", "", name)
    return name.lstrip(".") or "unknown"


def note_date(path: Path) -> str:
    m = DATE_IN_NAME.match(path.name)
    if m:
        return m.group(1)
    return date.fromtimestamp(path.stat().st_mtime).isoformat()


def split_frontmatter(text: str) -> tuple[list[str], str]:
    if not text.startswith("---\n"):
        return [], text
    end = text.find("\n---\n", 4)
    if end == -1:
        return [], text
    return text[4:end].splitlines(), text[end + 5 :].lstrip("\n")


def derived_values(path: Path, root: Path, body: str) -> dict[str, str]:
    parts = path.relative_to(root).parts
    values = {
        "date": note_date(path),
        "updated": date.fromtimestamp(path.stat().st_mtime).isoformat(),
    }
    if len(parts) > 1:
        values["tags"] = "[" + project_tag(parts[0]) + "]"
    summary = extract_summary(body)
    if summary:
        values["summary"] = yaml_quote(summary)
    return values


def merge(path: Path, root: Path) -> str | None:
    """欠けている frontmatter キーを補った全文を返す。補うものが無ければ None。"""
    text = path.read_text(encoding="utf-8")
    fm_lines, body = split_frontmatter(text)
    present = {line.split(":", 1)[0].strip() for line in fm_lines if ":" in line}
    values = derived_values(path, root, body)

    missing = [k for k in FRONTMATTER_KEYS if k in values and k not in present]
    if not missing:
        return None

    merged = fm_lines + [f"{k}: {values[k]}" for k in missing]
    return "---\n" + "\n".join(merged) + "\n---\n\n" + body


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", type=Path, default=DEFAULT_ROOT)
    ap.add_argument("--file", type=Path, help="1 ファイルだけ処理する (hook 用)")
    ap.add_argument("--apply", action="store_true", help="指定しない限り dry-run")
    args = ap.parse_args()

    root: Path = args.root.expanduser().resolve()
    if not root.is_dir():
        print(f"error: ノートディレクトリが無い: {root}", file=sys.stderr)
        return 1

    if args.file:
        target = args.file.expanduser().resolve()
        if not target.is_file():
            print(f"error: ファイルが無い: {target}", file=sys.stderr)
            return 1
        targets = [target]
    else:
        targets = sorted(root.rglob("*.md"))

    updated = skipped = 0
    for path in targets:
        merged = merge(path, root)
        if merged is None:
            skipped += 1
            continue
        updated += 1
        if args.apply:
            tmp = path.with_suffix(path.suffix + ".tmp")
            tmp.write_text(merged, encoding="utf-8")
            os.replace(tmp, path)
        else:
            print(f"[dry-run] {path.relative_to(root)}")
            print(merged.split("\n---\n", 1)[0].replace("---\n", "", 1))

    mode = "補完" if args.apply else "補完予定 (dry-run)"
    print(f"{mode}: {updated}件 / 変更なし: {skipped}件")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
