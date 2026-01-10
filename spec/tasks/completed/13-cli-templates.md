# Task: CLI Templates Command

## Purpose

`slide-gen templates` コマンドを実装し、テンプレートの一覧表示・情報取得を可能にする。

## Context

- **関連仕様**: [spec/cli.md](../cli.md) - templatesセクション
- **依存タスク**: [05-template-loader](./05-template-loader.md)
- **関連ソース**: `src/cli/commands/`

## Subcommands

### list

```bash
slide-gen templates list [--category <cat>] [--format <fmt>]
```

### info

```bash
slide-gen templates info <name> [--format <fmt>]
```

### example

```bash
slide-gen templates example <name>
```

## Output Formats

- `table`: 人間向けテーブル形式
- `json`: 機械処理向けJSON
- `llm`: AI向け簡潔形式

## Acceptance Criteria

- [ ] テンプレート一覧表示
- [ ] カテゴリ別フィルタリング
- [ ] 詳細情報表示
- [ ] サンプルYAML出力
- [ ] AI向け出力形式
