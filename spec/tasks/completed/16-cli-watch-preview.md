# Task: CLI Watch & Preview Commands

## Purpose

`slide-gen watch` と `slide-gen preview` コマンドを実装し、開発ワークフローを支援する。

## Context

- **関連仕様**: [spec/cli.md](../cli.md) - watch/previewセクション
- **依存タスク**: [11-cli-convert](./11-cli-convert.md)
- **関連ソース**: `src/cli/commands/`

## Watch Command

```bash
slide-gen watch <input> [-o <output>] [--debounce <ms>]
```

- chokidarを使用したファイル監視
- 変更検出時に自動変換
- デバウンス処理

## Preview Command

```bash
slide-gen preview <input> [-p <port>] [-w]
```

- Marp CLIとの連携
- ブラウザでのプレビュー
- 監視モード対応

## Acceptance Criteria

- [ ] ファイル変更の検出
- [ ] 自動変換の実行
- [ ] Marp CLIとの連携
- [ ] エラー時の継続動作
