# Task: Screenshot Documentation Enhancement

## Purpose

spec/cli.md の screenshot コマンドセクションを拡充し、オプションの組み合わせ使用、コンタクトシートの詳細仕様、トークン計算式などを明確に文書化する。

## Context

- **関連仕様**: [spec/cli.md](../cli.md)
- **依存タスク**: [35-screenshot-ai-optimization](./completed/35-screenshot-ai-optimization.md)
- **関連ソース**: `src/cli/commands/screenshot.ts`

## Background

タスク35で実装された screenshot コマンドの AI 最適化機能について、仕様ドキュメントに以下の情報が不足していた：

1. **オプションの組み合わせ使用**: `--slide` + `--format ai`、`--contact-sheet` + `--format ai` など
2. **コンタクトシートの詳細仕様**: スライド番号オーバーレイ、パディング、背景色
3. **トークン計算式**: `(width × height) / 750`
4. **インストール方法**: ローカル/グローバル両対応の明記

## Implementation Steps

### Step 1: Option Combinations セクション追加

**Goal**: 全オプションが自由に組み合わせ可能であることを明記

**変更内容**:
- `--slide` + `--format ai`（特定スライド + AI最適化）
- `--slide` + `--contact-sheet`（単一スライドのコンタクトシート）
- `--width` + `--format jpeg` + `--quality`（カスタム設定）
- `--contact-sheet` + `--columns` + `--format ai`（AI最適化コンタクトシート）

### Step 2: AI Optimization Mode セクション拡充

**Goal**: トークン計算式と具体的な数値を追加

**変更内容**:
```markdown
#### Token Estimation

Token consumption is calculated using the formula:

```
tokens = (width × height) / 750
```

For a 640×360 image (AI format): ~308 tokens per image.
```

### Step 3: Contact Sheet セクション拡充

**Goal**: コンタクトシートの詳細仕様を追加

**変更内容**:
- スライド番号オーバーレイ表示
- 自動グリッドレイアウト
- パディング（10px）
- 背景色（#F5F5F5）
- AI最適化との組み合わせ説明

### Step 4: Notes セクション拡充

**Goal**: インストール方法と追加の注意事項を明記

**変更内容**:
- ローカル/グローバルインストール両対応
- コンタクトシートは常にPNG出力
- 一時ファイルの自動クリーンアップ

## Acceptance Criteria

- [x] Option Combinations セクションが追加されている
- [x] トークン計算式が文書化されている
- [x] コンタクトシートの詳細仕様が文書化されている
- [x] Marp CLI のローカル/グローバルインストール両対応が明記されている
- [x] spec/cli.md の内容が実装と一致している

## Files Changed

- [x] `spec/cli.md` - screenshot セクションの拡充
  - Option Combinations セクション追加
  - AI Optimization Mode のトークン計算式追加
  - Contact Sheet Features セクション追加
  - Notes セクションの拡充

## Summary of Changes

### Added to spec/cli.md

1. **Option Combinations** (新セクション)
   ```bash
   # Specific slide + AI optimization
   slide-gen screenshot presentation.yaml --slide 3 --format ai

   # Contact sheet with custom columns + AI optimization
   slide-gen screenshot presentation.yaml --contact-sheet --columns 4 --format ai
   ```

2. **Token Estimation** (AI Optimization Mode 内)
   - 計算式: `tokens = (width × height) / 750`
   - 640×360 画像で約308トークン

3. **Contact Sheet Features** (新サブセクション)
   - Slide number overlay
   - Automatic grid layout
   - 10px padding
   - #F5F5F5 background

4. **Notes** (拡充)
   - Local/Global Marp CLI installation
   - Contact sheet always PNG
   - Automatic temp file cleanup

## Notes

このタスクは実装変更を伴わない、ドキュメントのみの更新タスクである。
タスク35で実装された機能の仕様ドキュメントを、実装の詳細と一致させることが目的。
