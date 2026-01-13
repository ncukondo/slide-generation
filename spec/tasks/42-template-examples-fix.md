# Task: テンプレートexampleデータの修正

## Purpose

テンプレート定義ファイルの`example`セクションにあるデータの不備を修正する。これにより、`templates screenshot`コマンドが全テンプレートで正常に動作するようになる。

## Context

- **関連仕様**: [spec/templates.md](../templates.md)
- **依存タスク**:
  - [40-icon-rendering-fix](./40-icon-rendering-fix.md) - アイコン修正
  - [41-template-output-format-fix](./41-template-output-format-fix.md) - 出力形式修正
- **関連ソース**: `templates/`

## Problem Analysis

### 問題1: hierarchyテンプレートのアイコン形式

**現状**:
```yaml
icon: "user"  # エラー: プレフィックス形式ではない
```

**修正後**:
```yaml
icon: "mi:person"  # 正しい形式
```

### 問題2: 画像パスが存在しないファイルを参照

**影響を受けるテンプレート**:
- `image-text.yaml` - `product-photo.png`
- `image-full.yaml` - `hero-image.jpg`
- `image-caption.yaml` - `architecture-diagram.png`
- `gallery.yaml` - `product1.png`, etc.
- `before-after.yaml` - `before.jpg`, `after.jpg`

### 問題3: アイコン参照の形式不統一

一部のテンプレートでエイリアス、一部でプレフィックス形式が混在。統一が必要。

## Implementation Steps

### Step 1: hierarchyテンプレートのicon修正

**Goal**: アイコン参照を正しいプレフィックス形式に修正

**Implementation**: `templates/diagrams/hierarchy.yaml`

```yaml
example:
  title: "組織図"
  root:
    label: "CEO"
    icon: "mi:person"
    color: "#1976D2"
    children:
      - label: "CTO"
        icon: "mi:computer"
        color: "#388E3C"
        children:
          - { label: "開発部" }
          - { label: "インフラ部" }
      - label: "CFO"
        icon: "mi:account_balance"
        color: "#F57C00"
        children:
          - { label: "経理部" }
          - { label: "財務部" }
      - label: "COO"
        icon: "mi:business"
        color: "#7B1FA2"
        children:
          - { label: "営業部" }
          - { label: "マーケ部" }
```

### Step 2: cycle-diagramのアイコン確認

**確認**: エイリアスが`icons/registry.yaml`に定義されているか

```yaml
# icons/registry.yaml
aliases:
  planning: "mi:event_note"
  action: "mi:play_arrow"
  analysis: "mi:analytics"
  improvement: "mi:trending_up"
```

エイリアスが定義されていれば現状のままでOK。未定義ならプレフィックス形式に変更。

### Step 3: three-columnのアイコン修正

**Implementation**: `templates/layouts/three-column.yaml`

```yaml
example:
  title: "3つのポイント"
  columns:
    - title: "ポイント1"
      icon: "mi:lightbulb"
      content: "最初のポイントの説明"
    - title: "ポイント2"
      icon: "mi:trending_up"
      content: "2番目のポイントの説明"
    - title: "ポイント3"
      icon: "mi:check_circle"
      content: "3番目のポイントの説明"
```

### Step 4: 画像テンプレートのプレースホルダー設定

**Goal**: 全ての画像テンプレートでプレースホルダーURLを使用

**Implementation**: `templates/layouts/image-text.yaml`

```yaml
example:
  title: "製品紹介"
  image:
    src: "https://placehold.co/600x400/EEE/31343C?text=Product+Image"
    alt: "製品の外観写真"
  description: "新製品のデザイン"
  points:
    - "高品質な素材を使用"
    - "エルゴノミクスデザイン"
    - "3年保証付き"
```

**Implementation**: `templates/layouts/image-full.yaml`

```yaml
example:
  image:
    src: "https://placehold.co/1280x720/31343C/EEE?text=Full+Screen+Image"
    alt: "フルスクリーン画像"
  title: "Project Site"
```

**Implementation**: `templates/layouts/image-caption.yaml`

```yaml
example:
  title: "システム構成"
  image:
    src: "https://placehold.co/800x500/E3F2FD/1565C0?text=Architecture+Diagram"
    alt: "システムアーキテクチャ図"
  caption: "図1: マイクロサービスアーキテクチャの全体像"
```

**Implementation**: `templates/layouts/gallery.yaml`

```yaml
example:
  title: "製品ラインナップ"
  images:
    - src: "https://placehold.co/400x300/4CAF50/FFF?text=Product+A"
      caption: "スタンダードモデル"
    - src: "https://placehold.co/400x300/2196F3/FFF?text=Product+B"
      caption: "プロフェッショナルモデル"
    - src: "https://placehold.co/400x300/9C27B0/FFF?text=Product+C"
      caption: "エンタープライズモデル"
```

**Implementation**: `templates/layouts/before-after.yaml`

```yaml
example:
  title: "リノベーション結果"
  before:
    image:
      src: "https://placehold.co/500x350/9E9E9E/FFF?text=Before"
    label: "改修前 (2023年1月)"
  after:
    image:
      src: "https://placehold.co/500x350/4CAF50/FFF?text=After"
    label: "改修後 (2024年3月)"
```

### Step 5: flow-chartのアイコン修正

**Implementation**: `templates/diagrams/flow-chart.yaml`

```yaml
example:
  title: "承認フロー"
  steps:
    - type: start
      label: "申請"
      icon: "mi:description"
    - type: process
      label: "上司確認"
      icon: "mi:person"
    - type: decision
      label: "承認？"
      icon: "mi:thumb_up"
      yes: "完了"
      no: "差し戻し"
    - type: process
      label: "差し戻し"
      icon: "mi:replay"
    - type: end
      label: "完了"
      icon: "mi:done_all"
```

### Step 6: 全テンプレートの一括確認

```bash
pnpm build
node dist/cli/index.js templates screenshot --all --format ai -o /tmp/all-templates-test
```

**Verification**:
- [ ] 全テンプレートがエラーなく完了
- [ ] 各スクリーンショットを目視確認

## E2E Test (必須)

**Test file**: `tests/e2e/template-examples.test.ts`

```typescript
import { TemplateLoader } from '../../src/templates';
import { executeTemplateScreenshot } from '../../src/cli/commands/templates';
import { tmpdir } from 'os';
import { join } from 'path';

describe('E2E: Template examples validation', () => {
  it('should generate screenshots for all templates without errors', async () => {
    const result = await executeTemplateScreenshot(undefined, {
      all: true,
      format: 'ai',
      output: join(tmpdir(), 'template-test'),
    });

    expect(result.success).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should have valid icon references in hierarchy template', async () => {
    const templateLoader = new TemplateLoader();
    await templateLoader.loadBuiltIn('./templates');

    const hierarchy = templateLoader.get('hierarchy');
    expect(hierarchy?.example?.root?.icon).toMatch(/^mi:/);
  });
});
```

## Acceptance Criteria

- [ ] 全てのテストが通る (`pnpm test`)
- [ ] 型チェックが通る (`pnpm typecheck`)
- [ ] リントが通る (`pnpm lint`)
- [ ] E2Eテストが通る
- [ ] `templates screenshot --all --format ai` が全テンプレートでエラーなく完了
- [ ] hierarchyのアイコンが正しい形式（`mi:person`等）
- [ ] 画像テンプレートにプレースホルダーURLが設定されている
- [ ] three-column, flow-chartのアイコンがプレフィックス形式

## Files Changed

- [ ] `templates/diagrams/hierarchy.yaml` - アイコン形式修正
- [ ] `templates/diagrams/cycle-diagram.yaml` - アイコン確認（必要に応じて修正）
- [ ] `templates/diagrams/flow-chart.yaml` - アイコン形式修正
- [ ] `templates/layouts/three-column.yaml` - アイコン形式修正
- [ ] `templates/layouts/image-text.yaml` - プレースホルダーURL
- [ ] `templates/layouts/image-full.yaml` - プレースホルダーURL
- [ ] `templates/layouts/image-caption.yaml` - プレースホルダーURL
- [ ] `templates/layouts/gallery.yaml` - プレースホルダーURL
- [ ] `templates/layouts/before-after.yaml` - プレースホルダーURL
- [ ] `tests/e2e/template-examples.test.ts` - E2Eテスト新規作成

## Notes

- プレースホルダー画像サービスは`https://placehold.co/`を使用
  - 形式: `https://placehold.co/{width}x{height}/{bg-color}/{text-color}?text={text}`
- オフライン環境ではプレースホルダー画像が表示されないが許容
- アイコンはタスク40完了後にSVGとして表示される
- エイリアス使用の場合は`icons/registry.yaml`に定義があることを確認
