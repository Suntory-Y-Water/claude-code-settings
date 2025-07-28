## 安全で段階的なコードリファクタリングを実施し、SOLID 原則の遵守状況を評価します

安全で段階的なコードリファクタリングを実施し、SOLID 原則の遵守状況を評価します。

### 使い方

```bash
# 複雑なコードの特定とリファクタリング計画
find . -name "*.js" -exec wc -l {} + | sort -rn | head -10
「大きなファイルをリファクタリングして複雑度を削減してください」

# 重複コードの検出と統合
grep -r "function processUser" . --include="*.js"
「重複した関数を Extract Method で共通化してください」

# SOLID 原則違反の検出
grep -r "class.*Service" . --include="*.js" | head -10
「これらのクラスが単一責任の原則に従っているか評価してください」
```

### 基本例

```bash
# 長いメソッドの検出
grep -A 50 "function" src/*.js | grep -B 50 -A 50 "return" | wc -l
"50 行以上のメソッドを Extract Method で分割してください"

# 条件分岐の複雑度
grep -r "if.*if.*if" . --include="*.js"
"ネストした条件文を Strategy パターンで改善してください"

# コードの臭いの検出
grep -r "TODO\|FIXME\|HACK" . --exclude-dir=node_modules
"技術的負債となっているコメントを解決してください"
```

### リファクタリング技法

#### Extract Method（メソッド抽出）

```javascript
// Before: 長大なメソッド
function processOrder(order) {
  // 50 行の複雑な処理
}

// After: 責任分離
function processOrder(order) {
  validateOrder(order);
  calculateTotal(order);
  saveOrder(order);
}
```

#### Replace Conditional with Polymorphism

```javascript
// Before: switch 文
function getPrice(user) {
  switch (user.type) {
    case "premium":
      return basPrice * 0.8;
    case "regular":
      return basePrice;
  }
}

// After: Strategy パターン
class PremiumPricing {
  calculate(basePrice) {
    return basePrice * 0.8;
  }
}
```

### SOLID 原則チェック

```
S - Single Responsibility
├─ 各クラスが単一の責任を持つ
├─ 変更理由が 1 つに限定される
└─ 責任の境界が明確

O - Open/Closed
├─ 拡張に対して開かれている
├─ 修正に対して閉じている
└─ 新機能追加時の既存コード保護

L - Liskov Substitution
├─ 派生クラスの置換可能性
├─ 契約の遵守
└─ 期待される動作の維持

I - Interface Segregation
├─ 適切な粒度のインターフェース
├─ 使用しないメソッドへの依存回避
└─ 役割別インターフェース定義

D - Dependency Inversion
├─ 抽象への依存
├─ 具象実装からの分離
└─ 依存性注入の活用
```

### リファクタリング手順

1. **現状分析**

   - 複雑度測定（循環的複雑度）
   - 重複コード検出
   - 依存関係の分析

2. **段階的実行**

   - 小さなステップ（15-30 分単位）
   - 各変更後のテスト実行
   - 頻繁なコミット

3. **品質確認**
   - テストカバレッジ維持
   - パフォーマンス測定
   - コードレビュー

### よくあるコードの臭い

- **God Object**: 過度に多くの責務を持つクラス
- **Long Method**: 50 行を超える長いメソッド
- **Duplicate Code**: 同じロジックの重複
- **Large Class**: 300 行を超える大きなクラス
- **Long Parameter List**: 4 個以上のパラメータ

### 自動化支援

使用しているパッケージマネージャーによって異なるため、以下は npm の例

```bash
# 静的解析
npx complexity-report src/
sonar-scanner

# コードフォーマット
npm run lint:fix
prettier --write src/

# テスト実行
npm test
npm run test:coverage
```

### 注意事項

- **機能変更の禁止**: 外部動作を変えない
- **テストファースト**: リファクタリング前にテスト追加
- **段階的アプローチ**: 一度に大きな変更をしない
- **継続的検証**: 各ステップでのテスト実行

## 責務駆動リファクタリング（改訂版）

機械的な分割ではなく、変更理由の分析と SOLID 原則に基づく真の責務分離を実施します。

### 変更理由分析（Why Change Analysis）

リファクタリング前に必ず以下を分析：

```
このコード/クラス/関数はなぜ変更されるか？
├─ ビジネスルール変更
├─ UI要件変更
├─ データ形式変更
├─ 外部API変更
└─ パフォーマンス要件変更
```

### 責務分離の正しい基準

#### ❌ 避けるべき分割基準

- 行数（50 行以上など）
- 処理順序（step1, step2 など）
- 技術的分類（validation, business, data など）

#### ✅ 正しい分割基準

- **変更理由の違い**：異なる理由で変更される処理は分離
- **抽象化レベルの違い**：高レベル処理と低レベル詳細は分離
- **ドメイン概念の違い**：異なるビジネス概念は分離

### 凝集度評価

```
高凝集度の特徴：
├─ 関連するデータと操作が一箇所にある
├─ 関数間で共通のデータを操作
└─ 単一の概念的責務を表現

低凝集度の兆候：
├─ 無関係な機能が混在
├─ 関数間でデータ共有がない
└─ 複数の概念的責務が存在
```

### リファクタリング例（責務ベース）

#### Wrong: 機械的分割

```javascript
// ❌ 処理順序による分割（責務混在）
function loginToService(page) {
  fillForm(page); // UI操作
  submitForm(page); // UI操作
  waitForSuccess(page); // UI操作
}
```

#### Right: 責務による分離

```typescript
// ✅ 責務による分離

// 責務：認証情報管理
type AuthCredentials = {
  email: string;
  password: string;
};

/**
 * 認証情報を環境変数から取得する
 * @returns 認証に必要な情報
 * @throws {Error} 必要な環境変数が設定されていない場合
 */
function getAuthCredentials(): AuthCredentials {
  // 実装
}

// 責務：ページ操作
/**
 * ログインページでフォーム操作を実行する
 * @param page - 操作対象のページ
 * @param credentials - 入力する認証情報
 */
async function executeLoginForm(
  page: Page,
  credentials: AuthCredentials
): Promise<void> {
  // 実装
}

// 責務：ログイン状態検証
/**
 * ログインが成功したかを判定する
 * @param page - 検証対象のページ
 * @returns ログイン成功の場合true
 */
async function validateLoginSuccess(page: Page): Promise<boolean> {
  // 実装
}
```

## TypeScript コーディング規約

### 型定義規約

#### type を使用（interface 禁止）

```typescript
// ✅ 推奨
type UserData = {
  id: string;
  name: string;
};

// ❌ 禁止
interface UserData {
  id: string;
  name: string;
}
```

#### any 型禁止

```typescript
// ❌ 禁止
function process(data: any): any {
  return data;
}

// ✅ 推奨
function process<T>(data: T): T {
  return data;
}

// または具体的な型を指定
function processUser(data: UserData): ProcessedUser {
  // 実装
}
```

### JSDoc コメント規約

すべての関数に以下を含む JSDoc を記載：

````typescript
/**
 * 関数の目的と動作を1行で説明
 * @param paramName - パラメータの説明（型情報は含めない）
 * @returns 戻り値の説明
 * @throws {ErrorType} エラーが発生する条件
 * @example
 * ```typescript
 * const result = functionName(param);
 * ```
 */
function functionName(paramName: ParamType): ReturnType {
  // 実装
}
````

### 関数ベース設計

#### クラス禁止・関数推奨

```typescript
// ❌ 禁止
class UserService {
  private config: Config;

  constructor(config: Config) {
    this.config = config;
  }

  process(user: User): void {
    // 実装
  }
}

// ✅ 推奨
type Config = {
  apiUrl: string;
};

/**
 * ユーザー情報を処理する
 * @param user - 処理対象のユーザー
 * @param config - 処理に必要な設定
 */
function processUser(user: User, config: Config): void {
  // 実装
}

// または依存注入パターン
type UserProcessor = (user: User) => void;

/**
 * ユーザー処理関数を作成する
 * @param config - 処理設定
 * @returns 設定済みの処理関数
 */
function createUserProcessor(config: Config): UserProcessor {
  return (user: User) => {
    // 実装
  };
}
```

### 質問駆動分析チェックリスト

コード作成前に以下を自問：

1. **責務特定**

   - この関数が変更される理由は何か？
   - 複数の変更理由があるか？

2. **境界設定**

   - どこで責務が切り替わるか？
   - この処理は本当に一緒であるべきか？

3. **依存関係**
   - なぜこの依存が必要か？
   - 抽象化できる箇所はないか？
