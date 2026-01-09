# Task: Special Templates

## Purpose

特殊テンプレート（quote, code-block, bibliography, custom）を実装する。

## Context

- **関連仕様**: [spec/templates.md](../templates.md) - 特殊 (special/)
- **依存タスク**: [06-basic-templates](./06-basic-templates.md), [08-reference-manager](./08-reference-manager.md)
- **関連ソース**: `templates/special/`

## Templates

### quote
- 引用スライド
- 引用元表示
- スタイリング

### code-block
- コードブロック
- シンタックスハイライト
- 行番号

### bibliography
- 参考文献スライド
- 自動生成
- ソート機能

### custom
- カスタム（直接記述）
- raw Markdown
- 完全な自由度

## Acceptance Criteria

- [ ] 引用が適切にスタイリングされる
- [ ] コードブロックが正しく表示される
- [ ] 参考文献が自動生成される
- [ ] カスタムテンプレートが動作する
