# Task: CLI Convert Command

## Purpose

`slide-gen convert` コマンドを実装し、コマンドラインからの変換を可能にする。

## Context

- **関連仕様**: [spec/cli.md](../cli.md) - convertセクション
- **依存タスク**: [10-pipeline](./10-pipeline.md)
- **関連ソース**: `src/cli/`

## Implementation Steps

### Step 1: Convert Command

```typescript
// src/cli/commands/convert.ts
import { Command } from 'commander';
import { Pipeline } from '../../core/pipeline';

export function createConvertCommand(): Command {
  return new Command('convert')
    .description('Convert YAML source to Marp Markdown')
    .argument('<input>', 'Input YAML file')
    .option('-o, --output <path>', 'Output file path')
    .option('-c, --config <path>', 'Config file path')
    .option('-t, --theme <name>', 'Theme name')
    .option('--no-references', 'Disable reference processing')
    .option('-v, --verbose', 'Verbose output')
    .action(async (input, options) => {
      // Implementation
    });
}
```

### Step 2: Output Formatting

- 進捗表示（ora スピナー）
- 成功/エラーメッセージ（chalk）
- 変換統計（スライド数、引用数など）

```
Converting presentation.yaml...
  ✓ Parsed 8 slides
  ✓ Resolved 5 references
  ✓ Processed icons
  ✓ Applied templates
  ✓ Generated output

Output: presentation.md
```

### Step 3: Error Handling

- ファイル読み込みエラー
- 検証エラー（位置情報付き）
- 変換エラー
- 終了コードの設定

## E2E Test

```bash
# 基本変換
slide-gen convert presentation.yaml

# 出力先指定
slide-gen convert presentation.yaml -o output/slides.md

# 設定ファイル指定
slide-gen convert presentation.yaml -c custom-config.yaml
```

## Acceptance Criteria

- [ ] 基本的な変換が動作する
- [ ] オプションが正しく処理される
- [ ] エラーメッセージが分かりやすい
- [ ] 終了コードが正しく設定される

## Files Changed

- [ ] `src/cli/commands/convert.ts` - 新規作成
- [ ] `src/cli/index.ts` - コマンド追加
- [ ] `src/cli/utils.ts` - ユーティリティ関数
