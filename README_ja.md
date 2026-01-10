# slide-generation

YAMLソースファイルからMarp対応Markdownを生成するCLIツールです。人間とAIの両方がプレゼンテーションを簡単に作成できるように設計されています。

## 特徴

- **YAMLベースのソースファイル** - 構造化され、可読性が高く、プログラムからの生成も容易
- **テンプレートシステム** - 様々なスライドタイプに対応した再利用可能なテンプレート
- **アイコンサポート** - Material Icons、Heroicons、カスタムアイコンに対応した組み込みアイコンレジストリ
- **文献管理連携** - reference-manager CLIとの連携による引用管理
- **監視モード** - ファイル変更時の自動変換
- **Marp互換** - 出力はMarp CLIでそのまま使用可能

## インストール

```bash
# npmを使用
npm install -g slide-generation

# pnpmを使用
pnpm add -g slide-generation

# npxで直接実行
npx slide-generation convert presentation.yaml
```

**動作要件:** Node.js >= 22.0.0

## クイックスタート

```bash
# 新規プロジェクトを初期化
slide-gen init my-presentation
cd my-presentation

# presentation.yamlを編集後、変換
slide-gen convert presentation.yaml

# ファイル変更を監視
slide-gen watch presentation.yaml

# Marp CLIでプレビュー
marp --preview presentation.md
```

## ソースファイル形式

```yaml
meta:
  title: プレゼンテーション
  author: 作成者名
  date: "2024-03-15"
  theme: default

slides:
  - template: title
    content:
      title: ようこそ
      subtitle: はじめに
      author: 作成者名

  - template: bullet-list
    content:
      title: 重要なポイント
      items:
        - 第一のポイント
        - 第二のポイント
        - 第三のポイント

  - template: section
    content:
      title: 次のセクション
```

## コマンド

### convert

YAMLソースをMarp Markdownに変換します。

```bash
slide-gen convert <input> [options]
```

オプション:
- `-o, --output <path>` - 出力ファイルパス（デフォルト: `<input>.md`）
- `-c, --config <path>` - 設定ファイルパス
- `-t, --theme <name>` - テーマ名
- `--no-references` - 引用処理を無効化
- `-v, --verbose` - 詳細出力

### validate

変換せずにソースファイルを検証します。

```bash
slide-gen validate <input> [options]
```

オプション:
- `--strict` - 警告もエラーとして扱う
- `--format <fmt>` - 出力形式（text/json）

### watch

ファイルを監視して変更時に自動変換します。

```bash
slide-gen watch <input> [options]
```

オプション:
- `-o, --output <path>` - 出力ファイルパス
- `--debounce <ms>` - デバウンス遅延（デフォルト: 300）

### templates

利用可能なテンプレートの一覧表示と詳細確認を行います。

```bash
# 全テンプレートを一覧表示
slide-gen templates list

# テンプレートの詳細を表示
slide-gen templates info <name>

# サンプルYAMLを出力
slide-gen templates example <name>
```

### icons

アイコンの検索とプレビューを行います。

```bash
# アイコンソースを一覧表示
slide-gen icons list

# アイコンを検索
slide-gen icons search <query>

# アイコンをプレビュー
slide-gen icons preview <name>
```

### init

新規プロジェクトを初期化します。

```bash
slide-gen init [directory]
```

### preview

Marp CLIでプレビューを表示します（@marp-team/marp-cliが必要）。

```bash
slide-gen preview <input> [options]
```

## 利用可能なテンプレート

### 基本（Basic）
- `title` - タイトルスライド
- `section` - セクション区切り
- `bullet-list` - 箇条書きリスト
- `numbered-list` - 番号付きリスト

### 図表（Diagrams）
- `flow-chart` - フローチャート
- `cycle-diagram` - 循環図（3〜6要素）
- `hierarchy` - 階層図・組織図
- `matrix` - 2x2マトリクス
- `timeline` - タイムライン

### データ（Data）
- `table` - 基本テーブル
- `comparison-table` - 比較表（強調表示付き）

### レイアウト（Layouts）
- `two-column` - 2カラムレイアウト
- `three-column` - 3カラムレイアウト
- `image-text` - 画像とテキスト
- `gallery` - 画像ギャラリー

### 特殊（Special）
- `quote` - 引用スライド
- `code-block` - コードブロック（シンタックスハイライト付き）
- `bibliography` - 参考文献スライド
- `custom` - カスタムMarkdownスライド

## 設定

プロジェクトに `config.yaml` を作成します:

```yaml
templates:
  builtin: "./templates"
  custom: "./my-templates"

icons:
  registry: "./icons/registry.yaml"
  cache:
    enabled: true
    ttl: 86400

references:
  enabled: true
  connection:
    type: cli
    command: "ref"

output:
  theme: "default"
```

設定ファイルの検索順序:
1. `--config` オプションで指定されたパス
2. `./config.yaml`
3. `./slide-gen.yaml`
4. `~/.slide-gen/config.yaml`

## 開発

```bash
# 依存パッケージをインストール
pnpm install

# 開発モード
pnpm dev

# ビルド
pnpm build

# テスト
pnpm test

# リント
pnpm lint

# 型チェック
pnpm typecheck
```

## ライセンス

MIT
