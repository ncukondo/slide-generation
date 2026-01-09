# ソースファイル形式仕様

## 概要

ソースファイルはYAML形式を採用します。YAMLは以下の理由から選択されました：

- **階層構造の自然な表現**: インデントによるネストがスライド構造に適合
- **配列内オブジェクト**: `- { key: value }` 形式で図表ノードを簡潔に記述可能
- **AIとの親和性**: LLMはYAML生成の訓練データが豊富
- **Marpとの一貫性**: Marpのフロントマターと同じ形式

## ファイル構造

```yaml
# presentation.yaml

meta:
  title: "プレゼンテーションタイトル"
  author: "作成者名"
  date: "2026-01-09"
  theme: "corporate-blue"        # テーマ名（themes/配下）

  # 文献引用設定（オプション）
  references:
    enabled: true
    style: author-year-pmid      # 引用フォーマット

slides:
  - template: <テンプレート名>
    content:
      <テンプレート固有のコンテンツ>

  - template: <テンプレート名>
    content:
      <テンプレート固有のコンテンツ>
```

## メタデータ (`meta`)

| フィールド | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| `title` | string | Yes | プレゼンテーションタイトル |
| `author` | string | No | 作成者名 |
| `date` | string | No | 作成日・発表日 |
| `theme` | string | No | 使用するテーマ名（デフォルト: default） |
| `references` | object | No | 文献引用設定 |

### 文献引用設定 (`meta.references`)

| フィールド | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| `enabled` | boolean | No | 引用機能の有効化（デフォルト: true） |
| `style` | string | No | 引用スタイル（デフォルト: author-year-pmid） |

## スライド定義 (`slides`)

各スライドは以下の形式で定義します：

```yaml
- template: <テンプレート名>
  content:
    <コンテンツ>
  class: <追加CSSクラス>        # オプション
  notes: <発表者ノート>         # オプション
```

| フィールド | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| `template` | string | Yes | 使用するテンプレート名 |
| `content` | object | Yes | テンプレート固有のコンテンツ |
| `class` | string | No | 追加のCSSクラス |
| `notes` | string | No | 発表者ノート（Marpの `<!-- -->` として出力） |

## 基本テンプレートの例

### タイトルスライド

```yaml
- template: title
  content:
    title: "メインタイトル"
    subtitle: "サブタイトル"
    author: "発表者名"
    date: "2026年1月"
    affiliation: "所属組織"
```

### 箇条書きスライド

```yaml
- template: bullet-list
  content:
    title: "スライドタイトル"
    items:
      - "項目1"
      - "項目2 [@smith2024]"           # 引用付き
      - nested:
          title: "ネストされた項目"
          items:
            - "サブ項目A"
            - "サブ項目B"
      - "項目4"
```

### 番号付きリスト

```yaml
- template: numbered-list
  content:
    title: "手順"
    items:
      - "ステップ1"
      - "ステップ2"
      - "ステップ3"
```

### 2カラムレイアウト

```yaml
- template: two-column
  content:
    title: "比較"
    left:
      title: "オプションA"
      items:
        - "特徴1"
        - "特徴2"
    right:
      title: "オプションB"
      items:
        - "特徴1"
        - "特徴2"
```

### 循環図

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

### テーブル

```yaml
- template: table
  content:
    title: "比較表"
    headers: ["項目", "オプションA", "オプションB"]
    rows:
      - ["価格", "¥1,000", "¥2,000"]
      - ["機能", { colspan: 2, text: "両方同等" }]    # セル結合
      - ["サポート", "メール", "電話 + メール"]
    caption: "表1: オプション比較"    # オプション
```

### 引用スライド

```yaml
- template: quote
  content:
    text: "引用する文章をここに記載します。"
    source: "@smith2024"
    page: "p.42"
```

### 参考文献スライド

```yaml
- template: bibliography
  content:
    title: "参考文献"
    # 本プレゼン中で引用された文献が自動展開される
```

### カスタム（直接記述）

```yaml
- template: custom
  raw: |
    # カスタムスライド

    自由なMarkdown記述が可能です。

    - 箇条書き
    - HTMLも使用可能

    <div class="custom-element">
      カスタムHTML
    </div>
```

## 引用記法

文中での引用はPandoc互換の `[@id]` 形式を使用します：

```yaml
items:
  - "単一引用 [@smith2024]"
  - "複数引用 [@smith2024; @tanaka2023]"
  - "文中に [@johnson2022] 引用を挿入"
```

### 引用の展開結果

```
入力: "この手法は有効である [@smith2024]"
出力: "この手法は有効である (Smith et al., 2024; PMID: 12345678)"
```

詳細は [references.md](./references.md) を参照してください。

## アイコン参照

アイコンは `icon` フィールドで参照します：

```yaml
nodes:
  - { label: "計画", icon: "planning" }      # エイリアス
  - { label: "実行", icon: "mi:play_arrow" } # 直接指定
  - { label: "確認", icon: "custom:check" }  # カスタムSVG
```

詳細は [icons.md](./icons.md) を参照してください。

## 完全な例

```yaml
meta:
  title: "研究発表"
  author: "山田太郎"
  date: "2026年1月"
  theme: "academic"
  references:
    enabled: true

slides:
  - template: title
    content:
      title: "新しい手法の提案"
      subtitle: "従来手法の課題を解決するアプローチ"
      author: "山田太郎"
      affiliation: "○○大学"

  - template: bullet-list
    content:
      title: "背景"
      items:
        - "従来手法には課題がある [@smith2024]"
        - "近年の研究 [@tanaka2023; @johnson2022] で改善が試みられている"
        - "しかし根本的な解決には至っていない"

  - template: cycle-diagram
    content:
      title: "提案手法の概要"
      nodes:
        - { label: "データ収集", icon: "database", color: "#4CAF50" }
        - { label: "分析", icon: "analysis", color: "#2196F3" }
        - { label: "モデル構築", icon: "model", color: "#FF9800" }
        - { label: "評価", icon: "evaluation", color: "#9C27B0" }

  - template: table
    content:
      title: "評価結果"
      headers: ["手法", "精度", "処理時間"]
      rows:
        - ["従来手法", "85%", "10秒"]
        - ["提案手法", "92%", "3秒"]

  - template: bullet-list
    content:
      title: "結論"
      items:
        - "提案手法は従来手法より優れた性能を示した"
        - "今後は大規模データでの検証を行う"

  - template: bibliography
    content:
      title: "参考文献"
```
