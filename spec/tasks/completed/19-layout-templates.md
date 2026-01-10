# Task: Layout Templates

## Purpose

レイアウト系テンプレート（two-column, three-column, image-text, gallery）を実装する。

## Context

- **関連仕様**: [spec/templates.md](../templates.md) - レイアウト (layouts/)
- **依存タスク**: [06-basic-templates](./completed/06-basic-templates.md)
- **関連ソース**: `templates/layouts/`, `src/templates/validators.ts`

## Prerequisites

### JSON Schema `oneOf` サポート

レイアウトテンプレートでは、コンテンツフィールドが「文字列または配列」を受け入れる必要がある。
これを実現するため、`validators.ts` の `jsonSchemaToZod` 関数を拡張して `oneOf` をサポートする。

**対象ファイル**: `src/templates/validators.ts`

**実装内容**:
- `JsonSchema` インターフェースに `oneOf` プロパティを追加
- `jsonSchemaToZod` 関数で `oneOf` を `z.union()` に変換

**テスト**: `src/templates/validators.test.ts` に oneOf のテストケースを追加

## Templates

### two-column
- 2カラムレイアウト
- 左右のコンテンツ（文字列または配列）
- 幅比率の調整（例: 60:40）

### three-column
- 3カラムレイアウト
- 各カラムにタイトル、アイコン、コンテンツ
- 2〜4カラム対応

### image-text
- 画像＋テキスト
- 画像位置（左/右）
- キャプション、alt テキスト

### gallery
- 画像ギャラリー
- グリッドレイアウト（列数指定可能）
- 各画像にキャプション、alt テキスト

## Implementation Steps

### Step 1: oneOf サポートの実装
1. `src/templates/validators.ts` を修正
   - `JsonSchema` に `oneOf?: JsonSchema[]` を追加
   - `jsonSchemaToZod` で `oneOf` を処理
2. `src/templates/validators.test.ts` にテスト追加
3. テスト実行・確認

### Step 2: レイアウトテンプレートの実装
1. `tests/templates/layouts.test.ts` 作成（TDD: Red）
2. テンプレートファイル作成:
   - `tests/fixtures/templates/layouts/two-column.yaml`
   - `tests/fixtures/templates/layouts/three-column.yaml`
   - `tests/fixtures/templates/layouts/image-text.yaml`
   - `tests/fixtures/templates/layouts/gallery.yaml`
3. テスト実行・確認（TDD: Green）
4. 必要に応じてリファクタリング

### Step 3: E2E テスト
1. 全テスト実行
2. lint / typecheck 確認

## Acceptance Criteria

- [x] `oneOf` スキーマがサポートされる
- [x] 各レイアウトテンプレートが読み込まれる
- [x] スキーマ検証が正しく動作する
- [x] テンプレートレンダリングが正しく動作する
- [x] 全テストがパスする
- [x] lint / typecheck エラーがない

## Files Changed

- `src/templates/validators.ts` - oneOf サポート追加
- `src/templates/validators.test.ts` - oneOf テスト追加
- `tests/fixtures/templates/layouts/two-column.yaml` - 新規
- `tests/fixtures/templates/layouts/three-column.yaml` - 新規
- `tests/fixtures/templates/layouts/image-text.yaml` - 新規
- `tests/fixtures/templates/layouts/gallery.yaml` - 新規
- `tests/templates/layouts.test.ts` - 新規
