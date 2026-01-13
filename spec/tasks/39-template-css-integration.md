# Task: テンプレートCSSのMarpテーマ統合

## Purpose

テンプレート定義ファイル内の`css`セクションがMarpテーマに統合されていないため、カスタムレイアウト（cycle-diagram, matrix, two-column等）が機能しない問題を修正する。

## Context

- **関連仕様**: [spec/templates.md](../templates.md)
- **依存タスク**: [38-fix-empty-first-slide](./38-fix-empty-first-slide.md)
- **関連ソース**: `src/templates/`, `src/core/renderer.ts`

## Problem Analysis

### 現状
- テンプレート定義に`css`セクションがあるが、生成されるMarkdownに含まれない
- Marpはカスタムテーマ経由でのみCSSを読み込む

### 影響を受けるテンプレート
- `cycle-diagram` - サイクル配置CSS
- `flow-chart` - フローチャートレイアウト
- `matrix` - 2x2グリッド
- `timeline` - タイムライン表示
- `two-column` - 2カラムレイアウト
- `three-column` - 3カラムレイアウト
- `before-after` - 左右比較レイアウト
- `hierarchy` - 階層図

## TDD Implementation Cycle

各ステップで以下のサイクルを実行:

1. **Red**: 失敗するテストを書く
2. **Green**: テストを通す最小限の実装
3. **Refactor**: `pnpm lint && pnpm typecheck` を実行し、リファクタリング

## Implementation Steps

### Step 1: CSS収集機能の追加

**Goal**: 使用されているテンプレートからCSSを収集する機能を追加

**Test file**: `src/templates/css-collector.test.ts`

```typescript
describe('CSSCollector', () => {
  it('should collect CSS from used templates', () => {
    const collector = new CSSCollector(templateLoader);
    const usedTemplates = ['cycle-diagram', 'title'];
    const css = collector.collect(usedTemplates);

    expect(css).toContain('.cycle-container');
    expect(css).not.toContain('.matrix-container'); // 未使用
  });
});
```

**Implementation**: `src/templates/css-collector.ts`

```typescript
export class CSSCollector {
  constructor(private templateLoader: TemplateLoader) {}

  collect(templateNames: string[]): string {
    const cssBlocks: string[] = [];
    for (const name of templateNames) {
      const template = this.templateLoader.get(name);
      if (template?.css) {
        cssBlocks.push(template.css);
      }
    }
    return cssBlocks.join('\n\n');
  }
}
```

**Verification**:
- [ ] テストが失敗することを確認
- [ ] 実装後、テストが通ることを確認

### Step 2: フロントマターへのスタイル注入

**Goal**: 収集したCSSをMarpフロントマターの`style`セクションに注入

**Implementation**: `src/core/renderer.ts`

```typescript
private renderFrontMatter(
  meta: PresentationMeta,
  options?: RenderOptions
): string {
  const lines: string[] = ['---', 'marp: true'];
  // ... 既存コード ...

  // テンプレートCSSを注入
  if (options?.templateCss) {
    lines.push('style: |');
    const cssLines = options.templateCss.split('\n');
    for (const line of cssLines) {
      lines.push(`  ${line}`);
    }
  }

  lines.push('---');
  return lines.join('\n');
}
```

**Verification**:
- [ ] テストが通ることを確認

### Step 3: Pipelineでの統合

**Goal**: パイプラインでCSS収集とレンダラーへの受け渡しを実装

**Implementation**: `src/core/pipeline.ts`

変換時に使用テンプレートを追跡し、レンダリング時にCSSを注入。

### Step 4: スクリーンショットで確認

**Goal**: CSSが適用されることを視覚的に確認

```bash
pnpm build
node dist/cli/index.js templates screenshot cycle-diagram matrix two-column --format ai -o /tmp/css-test
```

**Verification**:
- [ ] cycle-diagramがサイクル配置になっている
- [ ] matrixが2x2グリッドになっている
- [ ] two-columnが2カラムになっている

## E2E Test (必須)

**Test file**: `tests/e2e/template-css.test.ts`

```typescript
describe('E2E: Template CSS integration', () => {
  it('should include template CSS in output', async () => {
    // cycle-diagramテンプレートを使用するYAMLを変換
    // 出力にstyleセクションが含まれることを確認
    // .cycle-containerクラスが存在することを確認
  });
});
```

## Acceptance Criteria

- [ ] 全てのテストが通る (`pnpm test`)
- [ ] 型チェックが通る (`pnpm typecheck`)
- [ ] リントが通る (`pnpm lint`)
- [ ] E2Eテストが通る
- [ ] `templates screenshot cycle-diagram --format ai` でサイクル配置が確認できる
- [ ] `templates screenshot matrix --format ai` で2x2グリッドが確認できる
- [ ] `templates screenshot two-column --format ai` で2カラムが確認できる

## Files Changed

- [ ] `src/templates/css-collector.ts` - 新規作成
- [ ] `src/templates/css-collector.test.ts` - 新規作成
- [ ] `src/templates/index.ts` - エクスポート追加
- [ ] `src/core/renderer.ts` - フロントマターにstyle注入
- [ ] `src/core/renderer.test.ts` - テスト追加
- [ ] `src/core/pipeline.ts` - CSS収集の統合
- [ ] `tests/e2e/template-css.test.ts` - E2Eテスト新規作成

## Notes

- MarpのCSS注入は`style:`フロントマターまたは`<style>`タグで可能
- フロントマターの`style:`はYAMLマルチライン形式が必要
- テンプレートCSS同士の競合に注意（セレクタの名前空間化を検討）
