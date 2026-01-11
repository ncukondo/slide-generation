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
| 05 | [Template Loader](./completed/05-template-loader.md) | 04 | Done |
| 06 | [Basic Templates](./completed/06-basic-templates.md) | 05 | Done |

## Phase 3: Core Features（コア機能）

| # | タスク | 依存 | 状態 |
|---|--------|------|------|
| 07 | [Icon Registry & Resolver](./completed/07-icon-system.md) | 04 | Done |
| 08 | [Reference Manager Integration](./completed/08-reference-manager.md) | 04 | Done |
| 09 | [Transformer & Renderer](./completed/09-transformer-renderer.md) | 05, 07, 08 | Done |
| 10 | [Pipeline Integration](./completed/10-pipeline.md) | 09 | Done |

## Phase 4: CLI Commands（CLIコマンド）

| # | タスク | 依存 | 状態 |
|---|--------|------|------|
| 11 | [CLI Convert Command](./completed/11-cli-convert.md) | 10 | Done |
| 12 | [CLI Validate Command](./completed/12-cli-validate.md) | 03, 05 | Done |
| 13 | [CLI Templates Command](./completed/13-cli-templates.md) | 05 | Done |
| 14 | [CLI Icons Command](./completed/14-cli-icons.md) | 07 | Done |
| 15 | [CLI Init Command](./completed/15-cli-init.md) | 02 | Done |
| 16 | [CLI Watch & Preview](./completed/16-cli-watch-preview.md) | 11 | Done |

## Phase 5: Extended Templates（拡張テンプレート）

| # | タスク | 依存 | 状態 |
|---|--------|------|------|
| 17 | [Diagram Templates](./completed/17-diagram-templates.md) | 06 | Done |
| 18 | [Data Templates](./completed/18-data-templates.md) | 06 | Done |
| 19 | [Layout Templates](./completed/19-layout-templates.md) | 06 | Done |
| 20 | [Special Templates](./completed/20-special-templates.md) | 06, 08 | Done |

## Phase 6: Polish（仕上げ）

| # | タスク | 依存 | 状態 |
|---|--------|------|------|
| 21 | [E2E Tests & Documentation](./completed/21-e2e-tests-polish.md) | All | Done |

## Phase 7: AI Agent Integration（AI連携）

| # | タスク | 依存 | 状態 |
|---|--------|------|------|
| 22 | [AI Agent Integration - 基盤](./completed/22-ai-integration.md) | 15 | Done |
| 29 | [Validate LLM Format](./completed/29-validate-llm-format.md) | 12, 22 | Done |
| 23 | [Screenshot Command](./completed/23-screenshot-command.md) | 11, 22 | Done |
| 24 | [Preview Enhancements](./24-preview-enhancements.md) | 16, 13, 23 | Pending |
| 25 | [Image Management](./completed/25-image-management.md) | 19, 11 | Done |
| 26 | [Icon Enhancements](./completed/26-icon-enhancements.md) | 07, 14 | Done |
| 27 | [Source Management](./27-source-management.md) | 22, 15 | Pending |
| 28 | [Image Processing (Crop/Blur)](./28-image-processing.md) | 25 | Pending |

## Progress Summary

- **Total Tasks**: 29
- **Completed**: 25
- **In Progress**: 0
- **Pending**: 4

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                         CLI Layer                            │
│  convert | validate | templates | icons | init | watch       │
│  sources | images | screenshot | preview                     │
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
                              │
┌─────────────────────────────────────────────────────────────┐
│                   Content Management                         │
│  ┌─────────────┐  ┌─────────────┐                           │
│  │   Sources   │  │    Image    │  ← AI協働フロー対応        │
│  │   System    │  │  Management │                           │
│  └─────────────┘  └─────────────┘                           │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                    AI Integration                            │
│  CLAUDE.md | AGENT.md | Skills | Commands                    │
└─────────────────────────────────────────────────────────────┘
```

## Notes

- テストファイルは `*.test.ts` としてソースファイルと同じディレクトリに配置
- 各タスクはE2Eテストで完了を確認
- Phase 1-3 を優先的に完了させ、最小限の動作するシステムを構築

## Known Issues

- `src/icons/cache.test.ts` の "fetches again if cache expired" テストが不安定（タイミング依存）
  - 原因: 1秒TTL + 1100ms待機がテスト環境で不安定
  - 修正案: 待機時間を増やすか `vi.useFakeTimers()` を使用

- `tests/e2e/cli-watch.test.ts` がWindowsでタイムアウト
  - 原因: Windowsでのファイル監視の初期化が遅い
  - 修正案: タイムアウトを増やすか、Windowsでスキップする
