# Task: レイアウトテンプレートCSSセレクタ修正

## Purpose

レイアウトテンプレートのCSSセレクタをMarpのスコーピング機構と互換性のある形式に修正し、2カラムレイアウト等が正しく表示されるようにする。

## Context

- **関連Issue**: [#22](https://github.com/ncukondo/slide-generation/issues/22)
- **関連仕様**: [spec/templates.md](../templates.md)
- **依存タスク**: なし
- **関連ソース**: `templates/layouts/`

## Problem Analysis

### 根本原因

`<!-- _class: foo -->` で設定されたクラスは `<section>` 要素自体に付与される。しかし、現在のCSSセレクタ `.foo .container` は「foo クラスを持つ要素の**子孫**」を探すためマッチしない。

```css
/* 現在（マッチしない） */
.two-column-slide .two-column-container { display: flex; }

/* 修正後（マッチする） */
section.two-column-slide .two-column-container { display: flex; }
```

### 影響を受けるテンプレート

- `templates/layouts/two-column.yaml`
- `templates/layouts/three-column.yaml`
- `templates/layouts/image-text.yaml`
- `templates/layouts/before-after.yaml`
- `templates/layouts/gallery.yaml`
- `templates/layouts/image-caption.yaml`
- `templates/layouts/image-full.yaml`

## Implementation Steps

### Step 1: 各テンプレートのCSS修正

**Goal**: 全レイアウトテンプレートのCSSセレクタを `section.class` 形式に修正

**修正パターン**:

```yaml
# 修正前
css: |
  .two-column-slide .two-column-container {
    display: flex;
  }

# 修正後
css: |
  section.two-column-slide .two-column-container {
    display: flex;
  }
```

**対象ファイルと修正箇所**:

1. `two-column.yaml`: `.two-column-slide` → `section.two-column-slide`
2. `three-column.yaml`: `.three-column-slide` → `section.three-column-slide`
3. `image-text.yaml`: `.image-text-slide` → `section.image-text-slide`
4. `before-after.yaml`: `.before-after-slide` → `section.before-after-slide`
5. `gallery.yaml`: `.gallery-slide` → `section.gallery-slide`
6. `image-caption.yaml`: `.image-caption-slide` → `section.image-caption-slide`
7. `image-full.yaml`: `.image-full-slide` → `section.image-full-slide`

### Step 2: Visual Regression Test

**Goal**: 修正後のテンプレートが正しく表示されることを確認

**コマンド**:

```bash
pnpm build
node dist/cli/index.js templates screenshot two-column three-column image-text before-after gallery image-caption image-full --format png -o /tmp/layout-test
```

**確認項目**:

- [ ] `two-column`: 左右に分割された2カラムレイアウト
- [ ] `three-column`: 3カラムレイアウト
- [ ] `image-text`: 画像とテキストが横並び
- [ ] `before-after`: Before/Afterの比較レイアウト
- [ ] `gallery`: グリッド状の画像配置
- [ ] `image-caption`: 画像とキャプションのレイアウト
- [ ] `image-full`: フルスクリーン背景画像

## Acceptance Criteria

- [ ] 全レイアウトテンプレートのCSSセレクタが `section.class` 形式に修正されている
- [ ] `templates screenshot` で全テンプレートのレイアウトが正しく表示される
- [ ] 既存のテストが通る (`pnpm test`)
- [ ] 型チェックが通る (`pnpm typecheck`)

## Files Changed

- [ ] `templates/layouts/two-column.yaml`
- [ ] `templates/layouts/three-column.yaml`
- [ ] `templates/layouts/image-text.yaml`
- [ ] `templates/layouts/before-after.yaml`
- [ ] `templates/layouts/gallery.yaml`
- [ ] `templates/layouts/image-caption.yaml`
- [ ] `templates/layouts/image-full.yaml`

## Notes

- 単純な文字列置換で修正可能
- Visual testで確認することで、CSS以外の問題も検出可能
