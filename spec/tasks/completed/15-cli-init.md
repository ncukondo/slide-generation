# Task: CLI Init Command

## Purpose

`slide-gen init` コマンドを実装し、新規プロジェクトの初期化を可能にする。

## Context

- **関連仕様**: [spec/cli.md](../cli.md) - initセクション
- **依存タスク**: [02-config-system](./02-config-system.md)
- **関連ソース**: `src/cli/commands/`

## Implementation

```bash
slide-gen init [directory] [--template <name>] [--no-examples]
```

## Generated Structure

```
my-presentation/
├── config.yaml          # 設定ファイル
├── presentation.yaml    # サンプルソース
├── themes/
│   └── custom.css       # カスタムテーマ
└── icons/
    └── custom/          # カスタムアイコン用
```

## Acceptance Criteria

- [x] ディレクトリ構造の生成
- [x] サンプルファイルの配置
- [x] 既存ディレクトリへの警告
