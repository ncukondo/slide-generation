# Development Roadmap

このドキュメントは、slide-generation プロジェクトの実装進捗を追跡する高レベルなロードマップです。

## 開発プロセス

1. タスクファイルを `spec/tasks/` に作成
2. ROADMAP.md にリンクを追加
3. TDDサイクルに従って実装
4. 完了後、タスクファイルを `completed/` に移動

## Phase 1: Foundation（基盤）

| # | タスク | 依存 | 状態 |
|---|--------|------|------|
| 01 | [Project Setup](./completed/01-project-setup.md) | - | Done |
| 02 | [Config System](./completed/02-config-system.md) | 01 | Done |
| 03 | [YAML Parser](./completed/03-yaml-parser.md) | 02 | Done |

## Phase 2: Template System（テンプレートシステム）

| # | タスク | 依存 | 状態 |
|---|--------|------|------|
| 04 | [Template Engine](./completed/04-template-engine.md) | 03 | Done |
| 05 | [Template Loader](./05-template-loader.md) | 04 | Pending |
| 06 | [Basic Templates](./06-basic-templates.md) | 05 | Pending |

## Phase 3: Core Features（コア機能）

| # | タスク | 依存 | 状態 |
|---|--------|------|------|
| 07 | [Icon Registry & Resolver](./07-icon-system.md) | 04 | Pending |
| 08 | [Reference Manager Integration](./08-reference-manager.md) | 04 | Pending |
| 09 | [Transformer & Renderer](./09-transformer-renderer.md) | 05, 07, 08 | Pending |
| 10 | [Pipeline Integration](./10-pipeline.md) | 09 | Pending |

## Phase 4: CLI Commands（CLIコマンド）

| # | タスク | 依存 | 状態 |
|---|--------|------|------|
| 11 | [CLI Convert Command](./11-cli-convert.md) | 10 | Pending |
| 12 | [CLI Validate Command](./12-cli-validate.md) | 03, 05 | Pending |
| 13 | [CLI Templates Command](./13-cli-templates.md) | 05 | Pending |
| 14 | [CLI Icons Command](./14-cli-icons.md) | 07 | Pending |
| 15 | [CLI Init Command](./15-cli-init.md) | 02 | Pending |
| 16 | [CLI Watch & Preview](./16-cli-watch-preview.md) | 11 | Pending |

## Phase 5: Extended Templates（拡張テンプレート）

| # | タスク | 依存 | 状態 |
|---|--------|------|------|
| 17 | [Diagram Templates](./17-diagram-templates.md) | 06 | Pending |
| 18 | [Data Templates](./18-data-templates.md) | 06 | Pending |
| 19 | [Layout Templates](./19-layout-templates.md) | 06 | Pending |
| 20 | [Special Templates](./20-special-templates.md) | 06, 08 | Pending |

## Phase 6: Polish（仕上げ）

| # | タスク | 依存 | 状態 |
|---|--------|------|------|
| 21 | [E2E Tests & Documentation](./21-e2e-tests-polish.md) | All | Pending |

## Progress Summary

- **Total Tasks**: 21
- **Completed**: 4
- **In Progress**: 0
- **Pending**: 17

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                         CLI Layer                            │
│  convert | validate | templates | icons | init | watch       │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                       Pipeline                               │
│         Parse → Transform → Render → Output                  │
└─────────────────────────────────────────────────────────────┘
                              │
┌───────────────┬───────────────┬───────────────┬─────────────┐
│    Parser     │  Transformer  │   Renderer    │   Config    │
│  (YAML→AST)   │ (Template)    │  (Marp MD)    │   Loader    │
└───────────────┴───────────────┴───────────────┴─────────────┘
                              │
┌───────────────┬───────────────┬───────────────┐
│   Template    │     Icon      │   Reference   │
│    System     │    System     │    System     │
└───────────────┴───────────────┴───────────────┘
```

## Notes

- テストファイルは `*.test.ts` としてソースファイルと同じディレクトリに配置
- 各タスクはE2Eテストで完了を確認
- Phase 1-3 を優先的に完了させ、最小限の動作するシステムを構築
