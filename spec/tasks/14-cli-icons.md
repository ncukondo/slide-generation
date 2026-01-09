# Task: CLI Icons Command

## Purpose

`slide-gen icons` コマンドを実装し、アイコンの検索・プレビューを可能にする。

## Context

- **関連仕様**: [spec/cli.md](../cli.md) - iconsセクション
- **依存タスク**: [07-icon-system](./07-icon-system.md)
- **関連ソース**: `src/cli/commands/`

## Subcommands

### list

```bash
slide-gen icons list [--source <name>] [--aliases]
```

### search

```bash
slide-gen icons search <query>
```

### preview

```bash
slide-gen icons preview <name> [--format <fmt>] [--size <size>] [--color <color>]
```

## Acceptance Criteria

- [ ] アイコンソース一覧表示
- [ ] エイリアス一覧表示
- [ ] キーワード検索
- [ ] SVG/HTML形式でのプレビュー出力
