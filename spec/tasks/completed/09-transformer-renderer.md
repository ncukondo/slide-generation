# Task: Transformer & Renderer

## Purpose

Transformerでスライドにテンプレートを適用し、RendererでMarp Markdown形式の出力を生成する。

## Context

- **関連仕様**: [spec/architecture.md](../architecture.md)
- **依存タスク**: [05-template-loader](./05-template-loader.md), [07-icon-system](./07-icon-system.md), [08-reference-manager](./08-reference-manager.md)
- **関連ソース**: `src/core/`

## Implementation Steps

### Step 1: Transformer

**Goal**: 各スライドにテンプレートを適用してHTMLを生成

```typescript
// src/core/transformer.ts
interface TransformContext {
  meta: PresentationMeta;
  icons: IconResolver;
  refs: CitationFormatter;
  slideIndex: number;
  totalSlides: number;
}

export class Transformer {
  constructor(
    private templateEngine: TemplateEngine,
    private templateLoader: TemplateLoader,
    private iconResolver: IconResolver,
    private refFormatter: CitationFormatter
  ) {}

  async transform(slide: ParsedSlide, context: TransformContext): Promise<string>;
  async transformAll(presentation: ParsedPresentation): Promise<string[]>;
}
```

**Tests**:
- 単一スライドの変換
- テンプレート不明時のエラー
- コンテンツ検証エラー
- アイコン・引用の解決

### Step 2: Renderer

**Goal**: 変換されたスライドをMarp Markdown形式で結合

```typescript
// src/core/renderer.ts
interface RenderOptions {
  includeTheme: boolean;
  inlineStyles: boolean;
}

export class Renderer {
  render(slides: string[], meta: PresentationMeta, options?: RenderOptions): string;

  private renderFrontMatter(meta: PresentationMeta): string;
  private joinSlides(slides: string[]): string;
  private renderSpeakerNotes(notes: string): string;
}
```

**Output Format**:
```markdown
---
marp: true
theme: academic
---

# Slide 1 Content

---

# Slide 2 Content

<!--
Speaker notes here
-->

---

# Slide 3 Content
```

**Tests**:
- フロントマターの生成
- スライドの結合（`---`区切り）
- 発表者ノートの埋め込み
- テーマの適用

## E2E Test

- 完全なプレゼンテーションの変換
- Marp CLIでの出力検証（手動）

## Acceptance Criteria

- [ ] スライドが正しく変換される
- [ ] Marp互換のMarkdownが生成される
- [ ] フロントマターが正しく生成される
- [ ] 発表者ノートが正しく埋め込まれる

## Files Changed

- [ ] `src/core/transformer.ts` - 新規作成
- [ ] `src/core/renderer.ts` - 新規作成
- [ ] `src/core/transformer.test.ts` - 新規作成
- [ ] `src/core/renderer.test.ts` - 新規作成
