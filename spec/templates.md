# テンプレートシステム仕様

## 概要

テンプレートは、スライドの構造とレイアウトを定義する再利用可能なコンポーネントです。各テンプレートは以下を含みます：

- スキーマ定義（入力データの構造）
- 出力テンプレート（Nunjucksベース）
- 関連するCSS（オプション）

## テンプレート定義ファイル

テンプレートは `templates/` ディレクトリに配置します。

```
templates/
├── basic/
│   ├── title.yaml
│   ├── bullet-list.yaml
│   ├── numbered-list.yaml
│   └── section.yaml
├── diagrams/
│   ├── cycle-diagram.yaml
│   ├── flow-chart.yaml
│   ├── hierarchy.yaml
│   ├── matrix.yaml
│   └── timeline.yaml
├── data/
│   ├── table.yaml
│   └── comparison-table.yaml
├── layouts/
│   ├── two-column.yaml
│   ├── three-column.yaml
│   ├── image-text.yaml
│   └── gallery.yaml
└── special/
    ├── quote.yaml
    ├── code-block.yaml
    ├── bibliography.yaml
    └── custom.yaml
```

## テンプレート定義形式

```yaml
# templates/diagrams/cycle-diagram.yaml

name: cycle-diagram
description: "循環図（3〜6要素対応）"
category: diagrams

# 入力スキーマ定義
schema:
  type: object
  required:
    - title
    - nodes
  properties:
    title:
      type: string
      description: "スライドタイトル"
    nodes:
      type: array
      minItems: 3
      maxItems: 6
      description: "循環図のノード"
      items:
        type: object
        required:
          - label
        properties:
          label:
            type: string
            description: "ノードのラベル"
          icon:
            type: string
            description: "アイコン参照（エイリアスまたは直接指定）"
          color:
            type: string
            pattern: "^#[0-9A-Fa-f]{6}$"
            default: "#666666"
            description: "ノードの色"
          description:
            type: string
            description: "ノードの説明文（オプション）"

# サンプルデータ（AI生成支援用）
example:
  title: "PDCAサイクル"
  nodes:
    - { label: "Plan", icon: "planning", color: "#4CAF50" }
    - { label: "Do", icon: "action", color: "#2196F3" }
    - { label: "Check", icon: "analysis", color: "#FF9800" }
    - { label: "Act", icon: "improvement", color: "#9C27B0" }

# 出力テンプレート（Nunjucks）
output: |
  ---
  <!-- _class: diagram-slide cycle-slide -->

  # {{ title }}

  <div class="cycle-container cycle-{{ nodes | length }}">
    {%- for node in nodes %}
    <div class="cycle-node" style="--node-color: {{ node.color | default('#666666') }}; --node-index: {{ loop.index0 }};">
      {%- if node.icon %}
      <span class="node-icon">{{ icons.render(node.icon) }}</span>
      {%- endif %}
      <span class="node-label">{{ node.label }}</span>
      {%- if node.description %}
      <span class="node-desc">{{ node.description }}</span>
      {%- endif %}
    </div>
    {%- endfor %}
    <svg class="cycle-arrows" viewBox="0 0 100 100">
      <!-- 矢印はCSSで描画、またはJSで動的生成 -->
    </svg>
  </div>

# 関連CSS（テーマに含める）
css: |
  .cycle-container {
    display: flex;
    justify-content: center;
    align-items: center;
    position: relative;
    width: 100%;
    height: 70%;
  }

  .cycle-node {
    position: absolute;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 1em;
    border-radius: 50%;
    background: var(--node-color);
    color: white;
    width: 120px;
    height: 120px;
    justify-content: center;
  }

  /* ノード配置（要素数に応じた角度計算） */
  .cycle-3 .cycle-node { /* 3要素の配置 */ }
  .cycle-4 .cycle-node { /* 4要素の配置 */ }
  .cycle-5 .cycle-node { /* 5要素の配置 */ }
  .cycle-6 .cycle-node { /* 6要素の配置 */ }
```

## ビルトインテンプレート一覧

### 基本 (basic/)

| テンプレート | 説明 | 必須フィールド |
|-------------|------|---------------|
| `title` | タイトルスライド | title |
| `section` | セクション区切り | title |
| `bullet-list` | 箇条書き | title, items |
| `numbered-list` | 番号付きリスト | title, items |

### 図表 (diagrams/)

| テンプレート | 説明 | 必須フィールド |
|-------------|------|---------------|
| `cycle-diagram` | 循環図（3-6要素） | title, nodes |
| `flow-chart` | フローチャート | title, steps |
| `hierarchy` | 階層図・組織図 | title, root |
| `matrix` | 2x2マトリクス | title, quadrants |
| `timeline` | タイムライン | title, events |

### データ (data/)

| テンプレート | 説明 | 必須フィールド |
|-------------|------|---------------|
| `table` | 基本テーブル | title, headers, rows |
| `comparison-table` | 比較表（強調付き） | title, items, criteria |

### レイアウト (layouts/)

| テンプレート | 説明 | 必須フィールド |
|-------------|------|---------------|
| `two-column` | 2カラム | title, left, right |
| `three-column` | 3カラム | title, columns |
| `image-text` | 画像＋テキスト | title, image, text |
| `gallery` | 画像ギャラリー | title, images |

### 特殊 (special/)

| テンプレート | 説明 | 必須フィールド |
|-------------|------|---------------|
| `quote` | 引用 | text |
| `code-block` | コードブロック | code, language |
| `bibliography` | 参考文献 | title |
| `custom` | カスタム（直接記述） | raw |

## テンプレートエンジン

### Nunjucks 拡張

テンプレート内で使用可能なカスタム関数：

```nunjucks
{# アイコンレンダリング #}
{{ icons.render("planning") }}
{{ icons.render("mi:home", { size: "24px", color: "#333" }) }}

{# 引用展開 #}
{{ refs.cite("@smith2024") }}
{{ refs.expand("テキスト [@id] を含む") }}

{# 条件付きクラス #}
<div class="{{ 'highlight' if highlighted else '' }}">

{# ループとインデックス #}
{% for item in items %}
  {{ loop.index }}: {{ item }}
{% endfor %}
```

### コンテキスト変数

テンプレートには以下の変数が渡されます：

| 変数 | 説明 |
|------|------|
| `content` | ソースファイルで定義されたコンテンツ |
| `meta` | プレゼンテーションのメタデータ |
| `icons` | アイコンヘルパー |
| `refs` | 引用ヘルパー |
| `slide` | 現在のスライド情報（インデックス等） |

## カスタムテンプレートの作成

### 1. テンプレートファイル作成

```yaml
# templates/custom/my-template.yaml
name: my-template
description: "カスタムテンプレートの説明"
category: custom

schema:
  type: object
  required:
    - title
    - content
  properties:
    title:
      type: string
    content:
      type: string

example:
  title: "サンプルタイトル"
  content: "サンプルコンテンツ"

output: |
  ---
  <!-- _class: my-template -->

  # {{ title }}

  <div class="my-content">
    {{ content }}
  </div>

css: |
  .my-template .my-content {
    /* スタイル定義 */
  }
```

### 2. テーマにCSSを追加

カスタムテンプレートのCSSは、テーマファイルに自動的にマージされるか、別途インポートします。

### 3. 使用

```yaml
slides:
  - template: my-template
    content:
      title: "タイトル"
      content: "コンテンツ"
```

## スキーマ検証

入力データはZodスキーマで検証されます：

```typescript
// 自動生成されるZodスキーマの例
const cycleDigramSchema = z.object({
  title: z.string(),
  nodes: z.array(z.object({
    label: z.string(),
    icon: z.string().optional(),
    color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#666666'),
    description: z.string().optional(),
  })).min(3).max(6),
});
```

検証エラーは具体的なメッセージとともに報告されます：

```
Error in slide 3 (cycle-diagram):
  - nodes: Array must contain at least 3 element(s)
  - nodes[0].color: Invalid color format. Expected #RRGGBB
```

## AI向けテンプレート情報出力

CLIでテンプレート情報をAI向けに出力できます：

```bash
# テンプレート一覧（LLM向け簡潔形式）
slide-gen templates list --format llm

# 特定テンプレートの詳細とサンプル
slide-gen templates info cycle-diagram --format llm
```

出力例：

```
Template: cycle-diagram
Description: 循環図（3〜6要素対応）

Required fields:
  - title (string): スライドタイトル
  - nodes (array[3-6]): 循環図のノード
    - label (string, required): ノードのラベル
    - icon (string, optional): アイコン参照
    - color (string, optional): ノードの色 (#RRGGBB形式)

Example:
```yaml
- template: cycle-diagram
  content:
    title: "PDCAサイクル"
    nodes:
      - { label: "Plan", icon: "planning", color: "#4CAF50" }
      - { label: "Do", icon: "action", color: "#2196F3" }
      - { label: "Check", icon: "analysis", color: "#FF9800" }
      - { label: "Act", icon: "improvement", color: "#9C27B0" }
```
