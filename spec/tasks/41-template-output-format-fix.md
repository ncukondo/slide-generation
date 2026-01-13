# Task: テンプレート出力形式の修正

## Purpose

テンプレートの出力がMarpで正しくレンダリングされない問題を修正する。具体的には：
- HTMLタグ内のMarkdownがパースされない
- 画像構文がそのまま表示される
- HTMLタグがエスケープされる

## Context

- **関連仕様**: [spec/templates.md](../templates.md)
- **依存タスク**: [38-fix-empty-first-slide](./38-fix-empty-first-slide.md)
- **関連ソース**: `templates/`, `src/core/`, `src/cli/utils/marp-runner.ts`

## Key Discovery: HTML内のMarkdown解釈

**重要**: MarpはCommonMark準拠のため、HTMLタグ内のMarkdownは**空行を入れれば解釈される**。

```html
<!-- 空行あり → Markdownが解釈される -->
<div class="test">

## Heading works
- Item 1
- Item 2

</div>

<!-- 空行なし → Markdownがそのまま表示 -->
<div class="test">
## Heading as text
- Not a list
</div>
```

## Problem Analysis

### 問題1: テーブルがパースされない

**原因**: テンプレート出力のテーブルMarkdownが正しくパースされていない

### 問題2: HTMLタグのエスケープ

**現状** (`quote.002.png`):
```
<footer class="quote-attribution"> — アラン・ケイ </footer>
```

**原因**: Marpの`--html`オプションが有効でない

### 問題3: 画像が表示されない

**原因**: exampleデータの画像パスが存在しないファイルを参照

## TDD Implementation Cycle

各ステップで以下のサイクルを実行:

1. **Red**: 失敗するテストを書く
2. **Green**: テストを通す最小限の実装
3. **Refactor**: `pnpm lint && pnpm typecheck` を実行し、リファクタリング

## Implementation Steps

### Step 1: Marp実行時の--htmlオプション有効化

**Goal**: MarpでHTMLタグが許可されるようにする

**Implementation**: `src/cli/utils/marp-runner.ts`

```typescript
export function runMarp(args: string[], options?: MarpOptions): void {
  const finalArgs = [...args];

  // --html オプションを追加（テンプレートがHTMLを出力するため必須）
  if (!finalArgs.includes('--html') && !finalArgs.includes('--no-html')) {
    finalArgs.unshift('--html');
  }

  // 既存の実行ロジック
  // ...
}
```

**Test file**: `src/cli/utils/marp-runner.test.ts`

```typescript
describe('runMarp', () => {
  it('should add --html option by default', () => {
    // --html が引数に含まれることを確認
  });
});
```

### Step 2: テンプレート出力にHTMLタグ後の空行を追加

**Goal**: HTMLタグ内のMarkdownが解釈されるよう、空行を追加

**修正例**: `templates/layouts/two-column.yaml`

```yaml
output: |
  <!-- _class: two-column -->

  # {{ content.title }}

  <div class="columns">
  <div class="column left">

  {% if content.left.title %}### {{ content.left.title }}{% endif %}

  {% for item in content.left.items %}
  - {{ item }}
  {% endfor %}

  </div>
  <div class="column right">

  {% if content.right.title %}### {{ content.right.title }}{% endif %}

  {% for item in content.right.items %}
  - {{ item }}
  {% endfor %}

  </div>
  </div>
```

**ポイント**:
- `<div>`の直後に空行を入れる
- `</div>`の直前に空行を入れる
- これによりdiv内のMarkdownが解釈される

### Step 3: 影響を受けるテンプレートの修正

**修正が必要なテンプレート**:

1. **two-column.yaml** - 2カラムレイアウト
2. **three-column.yaml** - 3カラムレイアウト
3. **cycle-diagram.yaml** - サイクル図
4. **flow-chart.yaml** - フローチャート
5. **matrix.yaml** - マトリクス
6. **timeline.yaml** - タイムライン
7. **before-after.yaml** - Before/After比較
8. **hierarchy.yaml** - 階層図
9. **quote.yaml** - 引用

### Step 4: テーブルテンプレートの確認

**Goal**: テーブルMarkdownが正しく出力されていることを確認

テーブルはHTMLタグ内ではなく直接出力されるため、空行の問題は少ないが確認する。

```yaml
# templates/data/table.yaml
output: |
  <!-- _class: table-slide -->

  # {{ content.title }}

  {% if content.description %}
  *{{ content.description }}*

  {% endif %}

  | {% for header in content.headers %}{{ header }}{% if not loop.last %} | {% endif %}{% endfor %} |
  |{% for header in content.headers %}---|{% endfor %}|
  {% for row in content.rows %}| {% for cell in row %}{{ cell }}{% if not loop.last %} | {% endif %}{% endfor %} |
  {% endfor %}
```

### Step 5: 画像テンプレートのexampleをプレースホルダーに変更

**Goal**: 実際に表示可能な画像URLを使用

**Implementation**: 画像テンプレートのexampleにプレースホルダーURLを設定

```yaml
# templates/layouts/image-text.yaml
example:
  title: "製品紹介"
  image:
    src: "https://placehold.co/600x400/EEE/31343C?text=Product"
    alt: "製品の外観写真"
```

### Step 6: スクリーンショットで確認

```bash
pnpm build
node dist/cli/index.js templates screenshot two-column table quote --format ai -o /tmp/format-test
```

**Verification**:
- [ ] two-columnが2カラムレイアウトになっている
- [ ] tableがテーブルとして表示される
- [ ] quoteのHTMLがエスケープされていない

## E2E Test (必須)

**Test file**: `tests/e2e/template-output-format.test.ts`

```typescript
describe('E2E: Template output format', () => {
  it('should parse markdown inside HTML tags with blank lines', async () => {
    const pipeline = new Pipeline(config);
    await pipeline.initialize();

    const yaml = `
meta:
  title: Test
slides:
  - template: two-column
    content:
      title: "Test"
      left:
        items: ["Item 1", "Item 2"]
      right:
        items: ["Item A", "Item B"]
`;
    const result = await pipeline.runWithResult(yaml);

    // div内にul/liが含まれることを確認（Markdownが解釈された）
    // 生のMarkdown構文が残っていないことを確認
  });

  it('should not escape HTML tags when --html is enabled', async () => {
    // HTMLタグがそのまま出力されることを確認
  });
});
```

## Acceptance Criteria

- [ ] 全てのテストが通る (`pnpm test`)
- [ ] 型チェックが通る (`pnpm typecheck`)
- [ ] リントが通る (`pnpm lint`)
- [ ] E2Eテストが通る
- [ ] `templates screenshot two-column --format ai` で2カラムレイアウトが確認できる
- [ ] `templates screenshot table --format ai` でテーブルが表示される
- [ ] `templates screenshot quote --format ai` でHTMLがエスケープされていない
- [ ] HTMLタグ内のMarkdownリストが正しく解釈される

## Files Changed

- [ ] `src/cli/utils/marp-runner.ts` - --htmlオプション追加
- [ ] `src/cli/utils/marp-runner.test.ts` - テスト追加
- [ ] `templates/layouts/two-column.yaml` - HTMLタグ後に空行追加
- [ ] `templates/layouts/three-column.yaml` - HTMLタグ後に空行追加
- [ ] `templates/diagrams/cycle-diagram.yaml` - HTMLタグ後に空行追加
- [ ] `templates/diagrams/flow-chart.yaml` - HTMLタグ後に空行追加
- [ ] `templates/diagrams/matrix.yaml` - HTMLタグ後に空行追加
- [ ] `templates/diagrams/timeline.yaml` - HTMLタグ後に空行追加
- [ ] `templates/diagrams/hierarchy.yaml` - HTMLタグ後に空行追加
- [ ] `templates/layouts/before-after.yaml` - HTMLタグ後に空行追加
- [ ] `templates/special/quote.yaml` - HTMLタグ後に空行追加
- [ ] `templates/data/table.yaml` - 出力形式確認
- [ ] `templates/data/comparison-table.yaml` - 出力形式確認
- [ ] `tests/e2e/template-output-format.test.ts` - E2Eテスト新規作成

## Notes

- **重要**: HTMLタグの直後に空行を入れることでMarkdownが解釈される（CommonMark仕様）
- Marpの`--html`オプションは必須（テンプレートがHTMLを使用するため）
- テンプレート修正時は`<div>`や`<span>`の直後に必ず空行を追加
- Nunjucksの`{%- %}`（空白削除）と`{% %}`の使い分けに注意
