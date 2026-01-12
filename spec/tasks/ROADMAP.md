# Development Roadmap

このドキュメントは、slide-generation プロジェクトの実装進捗を追跡する高レベルなロードマップです。

## 開発プロセス

1. タスクファイルを `spec/tasks/` に作成
2. ROADMAP.md にリンクを追加
3. TDDサイクルに従って実装
4. PRを作成（worktreeでの作業はここまで）
5. マージ後、mainブランチで:
   - ROADMAP.md の状態を「Done」に更新
   - タスクファイルを `completed/` に移動

### 並列作業時の注意

複数のworktreeで並列作業する場合、ROADMAP.mdやタスクファイル移動でのconflictを避けるため:

- **worktree内での作業範囲**: 実装とPR作成まで
- **mainブランチでの作業**: マージ後にROADMAP更新とcompletedへの移動を実施
- マージ順序に注意し、先にマージされたものから順次更新

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
| 24 | [Preview Enhancements](./completed/24-preview-enhancements.md) | 16, 13, 23 | Done |
| 25 | [Image Management](./completed/25-image-management.md) | 19, 11 | Done |
| 26 | [Icon Enhancements](./completed/26-icon-enhancements.md) | 07, 14 | Done |
| 27 | [Source Management](./completed/27-source-management.md) | 22, 15 | Done |
| 28 | [Image Processing (Crop/Blur)](./completed/28-image-processing.md) | 25 | Done |
| 34 | [AI Workflow Templates Update](./completed/34-ai-workflow-templates-update.md) | 22, 27 | Done |
| 35 | [Screenshot AI Optimization](./completed/35-screenshot-ai-optimization.md) | 23 | Done |
| 36 | [Screenshot Documentation Enhancement](./completed/36-screenshot-docs-enhancement.md) | 35 | Done |
| 37 | [Templates Screenshot Command](./completed/37-templates-screenshot.md) | 13, 23 | Done |

## Phase 8: Reference Collaboration（文献引用連携）

AI エージェントと協働して学術文献を管理・引用するための機能強化。

| # | タスク | 依存 | 状態 |
|---|--------|------|------|
| 30 | [Validate References](./completed/30-validate-references.md) | 08, 12 | Done |
| 31 | [Bibliography Auto-Generation](./completed/31-bibliography-auto-generation.md) | 08, 10, 20 | Done |
| 32 | [AI Reference Skills](./completed/32-ai-reference-skills.md) | 22, 30 | Done |
| 33 | [Sources References Tracking](./completed/33-sources-references-tracking.md) | 27, 30 | Done |

### Phase 8 実装順序

依存関係に基づく推奨実装順序：

```
30 (Validate References)
    ↓
31 (Bibliography Auto-Generation)  ←── 30と並行可能
    ↓
32 (AI Reference Skills)  ←── 30完了後
    ↓
33 (Sources References Tracking)  ←── 30完了後、32と並行可能
```

### 各タスクの概要

1. **30-validate-references**: `slide-gen validate` で引用キーの存在確認
2. **31-bibliography-auto-generation**: `autoGenerate: true` で参考文献リスト自動生成
3. **32-ai-reference-skills**: AI エージェント用スキル定義とコマンド
4. **33-sources-references-tracking**: sources.yaml での引用追跡

## Progress Summary

- **Total Tasks**: 37
- **Completed**: 37
- **In Progress**: 0
- **Pending**: 0

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
┌───────────────┬───────────────┬───────────────────────────┐
│   Template    │     Icon      │      Reference System     │
│    System     │    System     │  (+ AI Collaboration)     │
└───────────────┴───────────────┴───────────────────────────┘
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

- `tests/e2e/cli-watch.test.ts` がWindowsでタイムアウト
  - 原因: Windowsでのファイル監視の初期化が遅い
  - 修正案: タイムアウトを増やすか、Windowsでスキップする
