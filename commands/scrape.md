---
description: プロのスクレイピング手法に基づくWebデータ抽出
argument-hint: <url> [取得項目1] [取得項目2] ...
allowed-tools: mcp__chrome-devtools, Write, Bash(mkdir:*), Bash(date:*)
---

# プロフェッショナルWebスクレイピングコマンド

## 対象
- **URL**: $1 (必須)
- **取得項目**: $2 以降の引数（例: "商品名" "価格" "URL" "画像"）

## 実装ルール

### 1. 要素の取得戦略
- `[...document.querySelectorAll("要素")]` で配列化する
- 各要素は変更可能性を考慮してユニークになるクラスや要素を選択する
- 優先順位: data属性 > ID > 意味のあるクラス名 > 構造的な探索
- 動的生成されたクラス名（ハッシュ含む）は避ける

### 2. 生データ優先
- 画面にあるデータは「生データ」として整形は行わない
- 例: 金額も「¥1,0000(税)」のままで取得
- trim()などの変換は最小限に抑える
- データの整形は利用側で行う

### 3. 柔軟な探索パターン
```javascript
// パターン1: 親要素から子要素を探索
const bookmarkItems = document.querySelectorAll('li.bookmark-item');

for (const element of bookmarkItems) {
  const titleLink = element.querySelector('.centerarticle-entry-title a');
  const title = titleLink?.textContent?.trim() || '';
  const url = titleLink?.getAttribute('href') || '';

  const usersLink = element.querySelector('.centerarticle-users a');
  const usersText = usersLink?.textContent?.trim() || '';
  const bookmarkCount = Number.parseInt(usersText.replace(/\D/g, '')) || 0;

  if (title && url) {
    articles.push({ title, url, bookmarkCount });
  }
}

// パターン2: 親要素を遡る探索
function findProductNameInParent(parentElement) {
  const productLinks = parentElement.querySelectorAll('a[href*="store.shopping"]');

  for (const productLink of productLinks) {
    const hasImage = productLink.querySelector('img');
    const linkText = productLink.textContent.trim();
    const isValidProductName = linkText.length > 10 && !hasImage;

    if (isValidProductName) {
      return linkText;
    }
  }

  return '';
}
```

### 4. スキーマ駆動開発
ユーザーが指定した取得項目を元にスキーマを生成:
```javascript
// 例: /scrape URL 商品名 価格 URL 画像
// → ユーザーの意図を解釈してスキーマを作成
const products: {
  name: string;      // "商品名" から推測
  price: string;     // "価格" から推測
  url: string;       // "URL" から推測
  imageUrl: string;  // "画像" から推測
}[] = [];

// 例: /scrape URL タイトル 著者 ブックマーク数 公開日
const articles: {
  title: string;
  author: string;
  bookmarkCount: number;
  publishedAt: string;
}[] = [];
```

**注意**: 項目名は柔軟に解釈する
- "金額", "値段", "価格" → `price`
- "タイトル", "見出し", "商品名" → `title` or `name`
- "リンク", "URL", "ページ" → `url`

## 実行フロー

### ステップ1: ページ遷移
`mcp__chrome-devtools__navigate_page` で URL $1 を開く

### ステップ2: 構造分析
`mcp__chrome-devtools__take_snapshot` でDOM構造を把握

### ステップ3: ユニークセレクタの特定
- 対象データを含む親要素を見つける
- ユニークなセレクタを特定（data-*、特定のクラス名など）
- 要素の階層関係を確認

### ステップ4: データ抽出
以下のパターンに従ってIIFEスクリプトを生成:
```javascript
(() => {
  const products = [];

  // 親要素を取得（querySelectorAllで配列化不要）
  const productItems = document.querySelectorAll('li.product-item');

  for (const element of productItems) {
    // オプショナルチェーンで安全に取得
    const titleLink = element.querySelector('.product-title a');
    const title = titleLink?.textContent?.trim() || '';
    const url = titleLink?.getAttribute('href') || '';

    // 画像URL取得
    const img = element.querySelector('img');
    const imageUrl = img?.src || '';

    // 生データのまま取得（整形しない）
    const priceElement = element.querySelector('.price');
    const price = priceElement?.textContent?.trim() || '';

    if (title && url) {
      products.push({ title, url, imageUrl, price });
    }
  }

  console.log(products);
  return products;
})();
```

### ステップ5: 結果を返却とファイル出力

**取得項目の解釈**:
- ユーザーが指定した項目（$2以降）を元にスキーマを動的に生成
- 指定がない場合は、snapshotから取得できそうな項目を推測して提案
- 例:
  - `/scrape URL 商品名 価格 URL` → `{ name, price, url }`
  - `/scrape URL タイトル 著者 公開日` → `{ title, author, publishedAt }`

**ファイル出力**:
- 作業ディレクトリの `temp/scripts/scrape-yyyy-mm-dd_hh-mm-ss.js` に保存
- タイムスタンプで一意なファイル名を生成（`date +%Y-%m-%d_%H-%M-%S`で取得）
- 相対パスで作成（開発コンテナやプロジェクトのルートに影響されない）
- ディレクトリが存在しない場合は自動作成

**出力例**:
```javascript
// temp/scripts/scrape-2025-06-01_14-30-22.js
(() => {
  // 生成されたスクレイピングコード
  const results = [];
  // ...
  console.log(results);
  return results;
})();
```
