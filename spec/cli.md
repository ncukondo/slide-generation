# CLIインターフェース仕様

## 概要

`slide-gen` コマンドは、YAMLソースファイルからMarp対応Markdownへの変換を行うCLIツールです。

## インストール

```bash
# グローバルインストール
npm install -g slide-generation

# または npx で直接実行
npx slide-generation convert presentation.yaml
```

## 基本構文

```bash
slide-gen <command> [options]
```

## コマンド一覧

| コマンド | 説明 |
|---------|------|
| `convert` | ソースファイルをMarp Markdownに変換 |
| `preview` | プレビュー（Marp連携） |
| `watch` | ファイル監視して自動変換 |
| `templates` | テンプレート管理 |
| `icons` | アイコン管理 |
| `init` | プロジェクト初期化 |
| `validate` | ソースファイル検証 |

---

## convert

ソースファイルをMarp Markdownに変換します。

### 構文

```bash
slide-gen convert <input> [options]
```

### オプション

| オプション | 短縮形 | 説明 | デフォルト |
|-----------|--------|------|-----------|
| `--output <path>` | `-o` | 出力ファイルパス | `<input>.md` |
| `--config <path>` | `-c` | 設定ファイルパス | `config.yaml` |
| `--theme <name>` | `-t` | テーマ名 | `default` |
| `--no-references` | | 引用処理を無効化 | |
| `--format <fmt>` | `-f` | 出力形式 (md/pdf/html/pptx) | `md` |

### 例

```bash
# 基本変換
slide-gen convert presentation.yaml

# 出力先指定
slide-gen convert presentation.yaml -o output/slides.md

# PDF出力（Marp CLI連携）
slide-gen convert presentation.yaml -f pdf -o slides.pdf

# テーマ指定
slide-gen convert presentation.yaml -t academic

# 引用無効化
slide-gen convert presentation.yaml --no-references
```

### 出力

```
Converting presentation.yaml...
  ✓ Parsed 8 slides
  ✓ Resolved 5 references
  ✓ Processed icons
  ✓ Applied templates
  ✓ Generated output

Output: presentation.md
```

---

## preview

ブラウザでプレビューを表示します（Marp CLI連携）。

### 構文

```bash
slide-gen preview <input> [options]
```

### オプション

| オプション | 短縮形 | 説明 | デフォルト |
|-----------|--------|------|-----------|
| `--port <number>` | `-p` | プレビューサーバーのポート | `8080` |
| `--watch` | `-w` | ファイル変更を監視 | `false` |

### 例

```bash
# プレビュー
slide-gen preview presentation.yaml

# ポート指定 + 監視モード
slide-gen preview presentation.yaml -p 3000 -w
```

---

## watch

ファイルを監視して変更時に自動変換します。

### 構文

```bash
slide-gen watch <input> [options]
```

### オプション

| オプション | 短縮形 | 説明 | デフォルト |
|-----------|--------|------|-----------|
| `--output <path>` | `-o` | 出力ファイルパス | `<input>.md` |
| `--debounce <ms>` | | 変更検出の遅延 | `300` |

### 例

```bash
slide-gen watch presentation.yaml -o output/slides.md
```

### 出力

```
Watching presentation.yaml...
[12:34:56] Changed: presentation.yaml
[12:34:56] Converting...
[12:34:57] ✓ Output: output/slides.md
```

---

## templates

テンプレートの一覧表示・情報取得を行います。

### サブコマンド

#### list

```bash
slide-gen templates list [options]
```

| オプション | 説明 |
|-----------|------|
| `--category <cat>` | カテゴリでフィルタ |
| `--format <fmt>` | 出力形式 (table/json/llm) |

```bash
# 全テンプレート一覧
slide-gen templates list

# カテゴリ別
slide-gen templates list --category diagrams

# AI向け形式
slide-gen templates list --format llm
```

出力例：

```
Templates:

basic/
  title           タイトルスライド
  section         セクション区切り
  bullet-list     箇条書き
  numbered-list   番号付きリスト

diagrams/
  cycle-diagram   循環図（3-6要素）
  flow-chart      フローチャート
  hierarchy       階層図・組織図
  matrix          2x2マトリクス
  timeline        タイムライン
  ...
```

#### info

```bash
slide-gen templates info <name> [options]
```

| オプション | 説明 |
|-----------|------|
| `--format <fmt>` | 出力形式 (text/json/llm) |

```bash
# テンプレート詳細
slide-gen templates info cycle-diagram

# AI向け形式（プロンプトに使用可能）
slide-gen templates info cycle-diagram --format llm
```

出力例：

```
Template: cycle-diagram
Description: 循環図（3〜6要素対応）
Category: diagrams

Schema:
  title (string, required)
    スライドタイトル

  nodes (array[3-6], required)
    循環図のノード
    - label (string, required): ノードのラベル
    - icon (string, optional): アイコン参照
    - color (string, optional): ノードの色 (#RRGGBB)
    - description (string, optional): 説明文

Example:
  - template: cycle-diagram
    content:
      title: "PDCAサイクル"
      nodes:
        - { label: "Plan", icon: "planning", color: "#4CAF50" }
        - { label: "Do", icon: "action", color: "#2196F3" }
        - { label: "Check", icon: "analysis", color: "#FF9800" }
        - { label: "Act", icon: "improvement", color: "#9C27B0" }
```

#### example

```bash
slide-gen templates example <name>
```

テンプレートのサンプルYAMLを出力します。

```bash
slide-gen templates example cycle-diagram > sample-cycle.yaml
```

---

## icons

アイコンの検索・プレビューを行います。

### サブコマンド

#### list

```bash
slide-gen icons list [options]
```

| オプション | 説明 |
|-----------|------|
| `--source <name>` | ソースでフィルタ |
| `--aliases` | エイリアスのみ表示 |

```bash
# 全アイコンソース一覧
slide-gen icons list

# エイリアス一覧
slide-gen icons list --aliases

# 特定ソースのアイコン
slide-gen icons list --source custom
```

#### search

```bash
slide-gen icons search <query>
```

```bash
slide-gen icons search "arrow"
```

出力例：

```
Search results for "arrow":

Aliases:
  improvement → mi:trending_up

Material Icons (mi:):
  mi:arrow_back
  mi:arrow_forward
  mi:arrow_upward
  mi:arrow_downward
  mi:trending_up

Heroicons (hero:):
  hero:arrow-left
  hero:arrow-right
  hero:arrow-up
  hero:arrow-down
```

#### preview

```bash
slide-gen icons preview <name> [options]
```

| オプション | 説明 |
|-----------|------|
| `--format <fmt>` | 出力形式 (svg/html) |
| `--size <size>` | サイズ |
| `--color <color>` | 色 |

```bash
# SVG出力
slide-gen icons preview planning > icon.svg

# HTML出力
slide-gen icons preview mi:home --format html

# オプション付き
slide-gen icons preview planning --size 48px --color "#FF5722"
```

---

## init

新規プロジェクトを初期化します。

### 構文

```bash
slide-gen init [directory] [options]
```

### オプション

| オプション | 説明 |
|-----------|------|
| `--template <name>` | 初期テンプレート |
| `--no-examples` | サンプルファイルを作成しない |

### 例

```bash
# カレントディレクトリに初期化
slide-gen init

# 指定ディレクトリに初期化
slide-gen init my-presentation

# サンプルなしで初期化
slide-gen init --no-examples
```

### 生成されるファイル

```
my-presentation/
├── config.yaml          # 設定ファイル
├── presentation.yaml    # サンプルソース
├── themes/
│   └── custom.css       # カスタムテーマ
└── icons/
    └── custom/          # カスタムアイコン用
```

---

## validate

ソースファイルを検証します（変換は行わない）。

### 構文

```bash
slide-gen validate <input> [options]
```

### オプション

| オプション | 説明 |
|-----------|------|
| `--strict` | 警告もエラーとして扱う |
| `--format <fmt>` | 出力形式 (text/json) |

### 例

```bash
slide-gen validate presentation.yaml
```

### 出力例（成功）

```
Validating presentation.yaml...

✓ YAML syntax valid
✓ Meta section valid
✓ 8 slides validated
✓ All templates found
✓ All icons resolved
✓ 5 references found

Validation passed!
```

### 出力例（エラー）

```
Validating presentation.yaml...

✓ YAML syntax valid
✓ Meta section valid
✗ Slide 3 (cycle-diagram): nodes must have at least 3 items
⚠ Slide 5: Unknown icon 'custom:missing'
⚠ Reference not found: @unknown2024

Validation failed with 1 error and 2 warnings
```

---

## グローバルオプション

全コマンドで使用可能なオプション：

| オプション | 短縮形 | 説明 |
|-----------|--------|------|
| `--help` | `-h` | ヘルプを表示 |
| `--version` | `-V` | バージョンを表示 |
| `--verbose` | `-v` | 詳細出力 |
| `--quiet` | `-q` | 出力を抑制 |
| `--no-color` | | カラー出力を無効化 |

---

## 設定ファイル

### 検索順序

1. `--config` オプションで指定されたパス
2. カレントディレクトリの `config.yaml`
3. カレントディレクトリの `slide-gen.yaml`
4. ホームディレクトリの `~/.slide-gen/config.yaml`
5. デフォルト設定

### 設定ファイル例

```yaml
# config.yaml

templates:
  builtin: "./templates"      # ビルトインテンプレート
  custom: "./my-templates"    # カスタムテンプレート

icons:
  registry: "./icons/registry.yaml"
  cache:
    enabled: true
    directory: ".cache/icons"
    ttl: 86400

references:
  enabled: true
  connection:
    type: cli
    command: "ref"
  format:
    locale: "ja-JP"

output:
  theme: "default"
  inline_styles: false
```

---

## 終了コード

| コード | 意味 |
|--------|------|
| 0 | 成功 |
| 1 | 一般的なエラー |
| 2 | 引数・オプションエラー |
| 3 | ファイル読み込みエラー |
| 4 | 検証エラー |
| 5 | 変換エラー |
| 6 | reference-manager連携エラー |

---

## 使用例シナリオ

### 基本的な変換ワークフロー

```bash
# 1. プロジェクト初期化
slide-gen init my-presentation
cd my-presentation

# 2. ソースファイル編集
vim presentation.yaml

# 3. 検証
slide-gen validate presentation.yaml

# 4. 変換
slide-gen convert presentation.yaml -o slides.md

# 5. プレビュー
slide-gen preview slides.md
```

### 監視モードでの開発

```bash
# ターミナル1: 監視モード
slide-gen watch presentation.yaml -o slides.md

# ターミナル2: プレビュー
marp --preview slides.md
```

### AI連携でのテンプレート情報取得

```bash
# 使用可能なテンプレート一覧をAIに提供
slide-gen templates list --format llm

# 特定テンプレートの詳細をAIに提供
slide-gen templates info cycle-diagram --format llm
```

### 一括変換（CI/CD用）

```bash
# 複数ファイルを変換
for f in presentations/*.yaml; do
  slide-gen convert "$f" -f pdf -o "output/$(basename "$f" .yaml).pdf"
done
```
