# Task: テンプレート作成ガイドラインとVisual Regression Test

## Purpose

カスタムテンプレート作成時のガイドライン（CSS記述ルール、HTML+Markdown記述ルール）を仕様書とAI Agentスキルに追加し、Visual regression testの徹底によりレイアウト問題を早期に検出できるようにする。

## Context

- **関連Issue**: [#22](https://github.com/ncukondo/slide-generation/issues/22)
- **関連仕様**: [spec/templates.md](../templates.md), [spec/ai-integration.md](../ai-integration.md)
- **依存タスク**: [43-layout-css-fix](./43-layout-css-fix.md)
- **関連ソース**: `src/cli/templates/ai/`

## Background

Issue #22で発覚した問題は、MarpのCSSスコーピング機構への理解不足が原因。再発防止のため：

1. **仕様書**: CSS記述ルールを明文化
2. **AI Agentスキル**: カスタムテンプレート作成ガイドラインにルールを追加
3. **Visual regression test**: テンプレート作成・修正時の確認手順を徹底

## Implementation Steps

### Step 1: spec/templates.md にガイドライン追加

**Goal**: CSS記述ルールとHTML+Markdown記述ルールを仕様書に明文化

**追加セクション**: 「## Template Writing Guidelines」

```markdown
## Template Writing Guidelines

### 1. CSS Selector Rules (Marp Scoping)

When using `<!-- _class: foo -->`, the class is added to the `<section>` element itself.
Therefore, CSS selectors must use `section.class` format.

#### Correct Pattern

```css
/* Slide class selector */
section.my-slide .container { display: flex; }

/* Child element only */
.container { padding: 1em; }
```

#### Incorrect Pattern

```css
/* This does NOT work - selector looks for descendants of .my-slide */
.my-slide .container { display: flex; }
```

### 2. HTML + Markdown Rules (CommonMark)

Markdown inside HTML tags is only parsed when there's a blank line after the opening tag.

#### Correct Pattern

```html
<div class="container">

## This heading works
- This list works

</div>
```

#### Incorrect Pattern

```html
<div class="container">
## This is plain text, not a heading
- This is plain text, not a list
</div>
```

### 3. Visual Verification (Required)

Always verify template rendering with screenshots:

```bash
slide-gen templates screenshot <template-name> --format png -o /tmp/test
```

Check:
- Layout is correct (columns, grids, flexbox)
- Markdown is parsed (headings, lists, etc.)
- No CSS silently failing
```

### Step 2: AI Agentスキルテンプレート更新

**Goal**: カスタムテンプレート作成時のガイドラインとVisual test手順をスキルに追加

**対象ファイル**: `src/cli/templates/ai/skill-md.ts`

**追加内容**:

```markdown
## Custom Template Creation

### Critical Rules

#### 1. CSS Selectors (Marp Scoping)

When using `<!-- _class: foo -->`:
- The class is added to `<section>` element itself
- CSS must use `section.foo` format, NOT `.foo`

```yaml
# Correct
output: |
  <!-- _class: my-slide -->
  <div class="container">...</div>

css: |
  section.my-slide .container { display: flex; }
```

#### 2. HTML + Markdown (CommonMark)

Markdown inside HTML is only parsed with blank lines:

```yaml
# Correct - blank line after <div>
output: |
  <div class="container">

  ## Heading works
  - List works

  </div>
```

### Visual Regression Test (Required)

After creating/modifying templates, ALWAYS verify with screenshots:

```bash
slide-gen templates screenshot <template-name> --format png -o /tmp/test
```

Check that:
- Layout is correct (columns, grids, flexbox)
- Markdown is parsed (headings, lists rendered properly)
- No CSS is silently failing
```

### Step 3: references/templates.md 更新

**Goal**: 詳細なカスタムテンプレート作成ガイドを追加

**対象ファイル**: `src/cli/templates/ai/references/templates-ref.ts`

**追加セクション**: カスタムテンプレート作成の詳細手順

### Step 4: 既存ドキュメントの整合性確認

**Goal**: spec/templates.mdの既存例が正しいパターンを示しているか確認・修正

**確認箇所**:
- 「Creating Custom Templates」セクションのCSS例
- テンプレート定義フォーマットのCSS例

## Acceptance Criteria

- [ ] spec/templates.md にCSSガイドラインセクションが追加されている
- [ ] ガイドラインに「Marp CSS Scoping」の説明がある
- [ ] 正しいパターン（`section.class`）と誤ったパターン（`.class`）の例がある
- [ ] Visual test手順が記載されている
- [ ] AI Agentスキルテンプレートにカスタムテンプレート作成ガイドが追加されている
- [ ] スキルにVisual regression test必須の記載がある
- [ ] 既存のテストが通る (`pnpm test`)

## Files Changed

- [ ] `spec/templates.md` - CSSガイドラインセクション追加
- [ ] `src/cli/templates/ai/skill-md.ts` - カスタムテンプレートガイド追加
- [ ] `src/cli/templates/ai/references/templates-ref.ts` - 詳細ガイド追加

## Notes

- ガイドラインは英語で記述（AI向けトークン効率最大化）
- Visual testはCI/CDに組み込むことも将来検討可能
- 既存のカスタムテンプレート例がある場合は、正しいパターンに修正
