# Task: Special Templates

## Purpose

特殊テンプレート（quote, code-block, bibliography, custom）を実装する。

## Context

- **関連仕様**: [spec/templates.md](../templates.md) - 特殊 (special/)
- **依存タスク**: [06-basic-templates](./completed/06-basic-templates.md), [08-reference-manager](./completed/08-reference-manager.md)
- **関連ソース**: `templates/special/`

## Templates

### quote
- 引用スライド
- 引用元表示（著者、ソース）
- スタイリング（blockquote形式）

### code-block
- コードブロック
- シンタックスハイライト（言語指定）
- ファイル名表示
- 行番号オプション

### bibliography
- 参考文献スライド
- 手動参照リスト
- 自動生成オプション
- ソート機能

### custom
- カスタム（直接記述）
- raw Markdown
- 完全な自由度
- CSSクラス指定

## Implementation Steps

### Step 1: テスト作成
1. `tests/templates/special.test.ts` 作成（TDD: Red）

### Step 2: テンプレートファイル作成
1. `tests/fixtures/templates/special/quote.yaml`
2. `tests/fixtures/templates/special/code-block.yaml`
3. `tests/fixtures/templates/special/bibliography.yaml`
4. `tests/fixtures/templates/special/custom.yaml`

### Step 3: テスト実行・確認
1. テスト実行（TDD: Green）
2. lint / typecheck 確認

## Acceptance Criteria

- [x] 引用が適切にスタイリングされる
- [x] コードブロックが正しく表示される
- [x] 参考文献リストが表示される
- [x] カスタムテンプレートが動作する
- [x] 全テストがパスする
- [x] lint / typecheck エラーがない

## Files Changed

- `tests/fixtures/templates/special/quote.yaml` - 新規
- `tests/fixtures/templates/special/code-block.yaml` - 新規
- `tests/fixtures/templates/special/bibliography.yaml` - 新規
- `tests/fixtures/templates/special/custom.yaml` - 新規
- `tests/templates/special.test.ts` - 新規
