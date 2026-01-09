# Task: Pipeline Integration

## Purpose

変換パイプライン全体を統合し、YAMLソースからMarp Markdownへのエンドツーエンド変換を実現する。

## Context

- **関連仕様**: [spec/architecture.md](../architecture.md) - 変換パイプライン詳細
- **依存タスク**: [09-transformer-renderer](./09-transformer-renderer.md)
- **関連ソース**: `src/core/`

## Implementation Steps

### Step 1: Pipeline Class

```typescript
// src/core/pipeline.ts
interface PipelineOptions {
  configPath?: string;
  outputPath?: string;
}

export class Pipeline {
  constructor(private config: Config) {}

  async run(inputPath: string, options?: PipelineOptions): Promise<string>;

  // Processing stages
  private async parseSource(inputPath: string): Promise<ParsedPresentation>;
  private async collectCitations(presentation: ParsedPresentation): Promise<string[]>;
  private async resolveReferences(ids: string[]): Promise<Map<string, CSLItem>>;
  private async transformSlides(presentation: ParsedPresentation): Promise<string[]>;
  private async render(slides: string[], meta: PresentationMeta): Promise<string>;
}
```

### Step 2: Pipeline Stages

**Stage 1: Parse Source**
- YAMLファイル読み込み
- 構文検証
- ParsedPresentation生成

**Stage 2: Collect Citations**
- 全スライドから`[@id]`パターン抽出
- 一意なIDリスト生成

**Stage 3: Resolve References**
- reference-managerから書誌情報取得
- 存在しないIDを警告

**Stage 4: Transform Slides**
- テンプレート解決
- スキーマ検証
- アイコン参照解決
- 引用展開
- Nunjucksテンプレート適用

**Stage 5: Render Output**
- フロントマター生成
- スライド結合（`---`区切り）
- Marp Markdown出力

### Step 3: Error Handling

```typescript
class PipelineError extends Error {
  constructor(
    message: string,
    public stage: string,
    public details?: unknown
  ) {
    super(message);
  }
}
```

## E2E Test

```typescript
describe('E2E: Pipeline', () => {
  it('should convert complete presentation', async () => {
    // 実際のYAMLファイルを読み込み
    // 実際のテンプレートを使用
    // Marp Markdownを出力
    // 出力がMarp CLIで処理可能か確認
  });

  it('should handle missing references gracefully', async () => {
    // 存在しない引用キーがあっても変換を完了
    // 警告を出力
  });

  it('should report validation errors clearly', async () => {
    // 不正なコンテンツに対してエラーメッセージ
    // エラー位置（スライド番号）を含む
  });
});
```

## Acceptance Criteria

- [ ] YAMLからMarp Markdownへの完全な変換
- [ ] 各ステージでの適切なエラーハンドリング
- [ ] 進捗情報の出力（オプション）
- [ ] 出力がMarp CLIで処理可能

## Files Changed

- [ ] `src/core/pipeline.ts` - 新規作成
- [ ] `src/core/pipeline.test.ts` - 新規作成
- [ ] `tests/e2e/pipeline.test.ts` - 新規作成
