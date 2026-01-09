# アイコン・ピクトグラム管理仕様

## 概要

本システムは、複数のアイコンソースを統一的に管理し、スライド内で簡単に参照・使用できる仕組みを提供します。

## アイコンソースの種類

| ソースタイプ | 説明 | 例 |
|-------------|------|-----|
| `web-font` | Webフォントベースのアイコン | Material Icons, Font Awesome |
| `svg-sprite` | SVGスプライトシート | Heroicons, Feather Icons |
| `svg-inline` | インラインSVG（CDN） | Iconify |
| `local-svg` | ローカルSVGファイル | カスタムアイコン |

## アイコンレジストリ

アイコンの設定は `icons/registry.yaml` で管理します：

```yaml
# icons/registry.yaml

# アイコンソース定義
sources:
  # Material Icons（Webフォント）
  - name: material-icons
    type: web-font
    url: "https://fonts.googleapis.com/icon?family=Material+Icons"
    prefix: "mi"
    render: |
      <span class="material-icons" style="{{ style }}">{{ name }}</span>

  # Heroicons（SVG CDN）
  - name: heroicons
    type: svg-inline
    url: "https://unpkg.com/heroicons@2.0.0/24/outline/{name}.svg"
    prefix: "hero"

  # Iconify（汎用SVG CDN）
  - name: iconify
    type: svg-inline
    url: "https://api.iconify.design/{set}/{name}.svg"
    prefix: "iconify"

  # カスタムアイコン（ローカル）
  - name: custom
    type: local-svg
    path: "./icons/custom/"
    prefix: "custom"

# エイリアス定義（意味的な名前 → 実際のアイコン）
aliases:
  # アクション系
  planning: "mi:event_note"
  action: "mi:play_arrow"
  analysis: "mi:analytics"
  improvement: "mi:trending_up"

  # ステータス系
  success: "mi:check_circle"
  warning: "mi:warning"
  error: "mi:error"
  info: "mi:info"

  # オブジェクト系
  document: "mi:description"
  folder: "mi:folder"
  database: "mi:storage"
  settings: "mi:settings"

  # カスタム
  logo: "custom:company-logo"

# カラーパレット
colors:
  primary: "#1976D2"
  secondary: "#424242"
  accent: "#FF4081"
  success: "#4CAF50"
  warning: "#FF9800"
  danger: "#F44336"
  info: "#2196F3"

# デフォルト設定
defaults:
  size: "24px"
  color: "currentColor"
```

## アイコン参照方法

### ソースファイル内での参照

```yaml
# エイリアス経由（推奨）
icon: planning

# 直接指定（プレフィックス:アイコン名）
icon: mi:home
icon: hero:arrow-right
icon: iconify:mdi:account
icon: custom:my-icon

# オプション付き
icon:
  name: planning
  size: 32px
  color: "#FF5722"
```

### テンプレート内での参照

```nunjucks
{# 基本使用 #}
{{ icons.render("planning") }}

{# オプション付き #}
{{ icons.render("mi:home", { size: "32px", color: "#333" }) }}

{# 条件付き #}
{% if node.icon %}
  {{ icons.render(node.icon, { color: node.color }) }}
{% endif %}
```

## アイコン解決フロー

```
1. アイコン参照を解析
   "planning" → エイリアス検索 → "mi:event_note"
   "mi:home" → 直接解決

2. プレフィックスからソースを特定
   "mi:" → material-icons ソース

3. ソースタイプに応じてレンダリング
   - web-font: <span class="...">name</span>
   - svg-inline: SVGをフェッチしてインライン化
   - local-svg: ファイルを読み込んでインライン化

4. オプション適用（サイズ、色など）

5. HTML出力
```

## 出力形式

### Webフォント出力

```html
<span class="material-icons" style="font-size: 24px; color: #4CAF50;">
  event_note
</span>
```

### SVGインライン出力

```html
<svg class="icon icon-planning" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
  <path d="..."/>
</svg>
```

## カスタムアイコンの追加

### 1. SVGファイルを配置

```
icons/
└── custom/
    ├── company-logo.svg
    ├── custom-chart.svg
    └── special-icon.svg
```

### 2. SVGの要件

- viewBox属性を持つこと
- 固定のwidth/heightを持たないこと（またはレンダリング時に上書き）
- fill="currentColor" でカラー制御可能にすること（推奨）

```svg
<!-- icons/custom/company-logo.svg -->
<svg viewBox="0 0 24 24" fill="currentColor">
  <path d="M12 2L2 7l10 5 10-5-10-5z"/>
  <path d="M2 17l10 5 10-5"/>
</svg>
```

### 3. エイリアスの登録（オプション）

```yaml
# icons/registry.yaml
aliases:
  logo: "custom:company-logo"
```

### 4. 使用

```yaml
- template: title
  content:
    title: "プレゼンテーション"
    icon: logo  # または custom:company-logo
```

## アイコンのキャッシュ

外部SVGはビルド時にフェッチしてキャッシュします：

```yaml
# config.yaml
icons:
  cache:
    enabled: true
    directory: ".cache/icons"
    ttl: 86400  # 24時間（秒）
```

## アイコン検索・プレビュー

CLIでアイコンを検索・プレビューできます：

```bash
# エイリアス一覧
slide-gen icons list

# キーワード検索
slide-gen icons search "arrow"

# 特定ソースのアイコン一覧
slide-gen icons list --source mi

# アイコンプレビュー（SVG出力）
slide-gen icons preview planning

# アイコンプレビュー（HTML出力）
slide-gen icons preview mi:home --format html
```

## 出力例

```bash
$ slide-gen icons search "check"

Aliases:
  success → mi:check_circle

Material Icons (mi:):
  mi:check
  mi:check_box
  mi:check_circle
  mi:check_circle_outline

Heroicons (hero:):
  hero:check
  hero:check-circle
  hero:check-badge
```

## Marp出力への統合

アイコンはMarp Markdown内にHTMLとして埋め込まれます：

```markdown
---
<!-- _class: cycle-slide -->

# PDCAサイクル

<div class="cycle-container">
  <div class="cycle-node" style="--node-color: #4CAF50;">
    <span class="material-icons">event_note</span>
    <span class="node-label">Plan</span>
  </div>
  <!-- ... -->
</div>
```

必要なCSSとフォント読み込みは、テーマファイルに含めるか、Marpのフロントマターで指定します：

```yaml
# 自動生成されるフロントマター
---
marp: true
theme: custom-theme
style: |
  @import url('https://fonts.googleapis.com/icon?family=Material+Icons');
---
```
