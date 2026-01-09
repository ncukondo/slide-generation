# Task: Template Loader

## Purpose

テンプレート定義ファイル（YAML）を読み込み、スキーマ検証とテンプレート登録を行う。
テンプレートの一覧取得、カテゴリ別フィルタリング機能を提供する。

## Context

- **関連仕様**: [spec/templates.md](../templates.md)
- **依存タスク**: [04-template-engine](./04-template-engine.md)
- **関連ソース**: `src/templates/`

## Implementation Steps

### Step 1: Template Definition Schema

**Goal**: テンプレート定義ファイルのZodスキーマを定義

```typescript
// src/templates/loader.ts
const templateDefSchema = z.object({
  name: z.string(),
  description: z.string(),
  category: z.string(),
  schema: z.record(z.unknown()), // JSON Schema format
  example: z.record(z.unknown()).optional(),
  output: z.string(), // Nunjucks template
  css: z.string().optional(),
});
```

**Tests**:
- テンプレート定義の検証
- 必須フィールドの確認
- 不正な定義の拒否

### Step 2: Template Loader Class

**Goal**: ディレクトリからテンプレートを読み込むLoaderクラス

```typescript
export class TemplateLoader {
  private templates: Map<string, TemplateDefinition>;

  async loadBuiltIn(directory: string): Promise<void>;
  async loadCustom(directory: string): Promise<void>;

  get(name: string): TemplateDefinition | undefined;
  list(): TemplateDefinition[];
  listByCategory(category: string): TemplateDefinition[];
}
```

**Tests**:
- ビルトインテンプレートの読み込み
- カスタムテンプレートの追加
- テンプレート名での取得
- カテゴリ別フィルタリング

### Step 3: Content Schema Validation

**Goal**: テンプレートのスキーマを使用してコンテンツを検証

```typescript
export class TemplateLoader {
  validateContent(templateName: string, content: unknown): ValidationResult;
}
```

**Tests**:
- 有効なコンテンツの検証
- 必須フィールド欠落の検出
- 型エラーの検出

## E2E Test

- 実際のテンプレートファイルを読み込み
- 複数カテゴリのテンプレートを管理
- コンテンツ検証の統合テスト

## Acceptance Criteria

- [ ] YAMLテンプレート定義ファイルを読み込める
- [ ] テンプレート名での検索ができる
- [ ] カテゴリ別フィルタリングができる
- [ ] コンテンツスキーマ検証が動作する

## Files Changed

- [ ] `src/templates/loader.ts` - 新規作成
- [ ] `src/templates/loader.test.ts` - 新規作成
- [ ] `src/templates/validators.ts` - 新規作成（JSON Schema → Zod変換）
