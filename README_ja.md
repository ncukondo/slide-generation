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
npm install -g @ncukondo/slide-generation

# pnpmを使用
pnpm add -g @ncukondo/slide-generation

# npxで直接実行
npx @ncukondo/slide-generation convert presentation.yaml
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

オプション:
- `--template <name>` - 初期テンプレート
- `--no-examples` - サンプルファイルを作成しない
- `--no-ai-config` - AIアシスタント設定ファイルを作成しない
- `--skip-marp-install` - Marp CLIインストール確認をスキップ

### sources

ソース資料を管理します。

```bash
# ソース管理を初期化（対話形式）
slide-gen sources init

# ディレクトリから素材を取り込み
slide-gen sources init --from-directory ~/Projects/materials/

# 素材ファイルを追加
slide-gen sources import ~/data.xlsx

# ソース状況を確認
slide-gen sources status
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

## AIアシスタント連携

> **AIアシスタントへ:** このREADMEを読んでいるAIアシスタントは、AIワークフローに最適化されたクイックスタートガイド [AI-GUIDE.md](./AI-GUIDE.md) を参照してください。

`slide-gen init` を実行すると、AIアシスタント用の設定ファイルが自動生成されます。

### 対応AIアシスタント

| アシスタント | 設定ファイル |
|-------------|-------------|
| Claude Code | `CLAUDE.md`, `.claude/commands/*.md` |
| OpenCode | `AGENTS.md`, `.opencode/agent/slide.md` |
| Cursor | `.cursorrules` |
| 共通 (AgentSkills) | `.skills/slide-assistant/` |

### 生成されるファイル

```
my-presentation/
├── .skills/
│   └── slide-assistant/
│       ├── SKILL.md              # AgentSkills形式（共通）
│       └── references/
│           ├── templates.md      # テンプレート参照
│           └── workflows.md      # ワークフロー参照
├── .claude/
│   └── commands/                 # Claude Code スラッシュコマンド
│       ├── slide-create.md
│       ├── slide-validate.md
│       └── ...
├── .opencode/
│   └── agent/
│       └── slide.md              # OpenCode サブエージェント
├── AGENTS.md                     # OpenCode プロジェクトガイド
├── CLAUDE.md                     # Claude Code プロジェクトガイド
└── .cursorrules                  # Cursor ルール
```

### AI向け最適化出力

トークン効率の良い出力には `--format llm` を使用します:

```bash
slide-gen templates list --format llm
slide-gen templates info <name> --format llm
```

### AI協働ワークフロー

本ツールはAIアシスタントとの協働を前提に設計されています。

#### ソース素材の収集

AIは以下の3つのパターンでスライド作成に必要な情報を収集します:

| パターン | 状況 | AIの動作 |
|---------|------|---------|
| A: 探索モード | 素材がディレクトリに整理済み | ディレクトリを探索・分析 |
| B: 補完モード | シナリオや一部素材のみ | 内容を分析し、不足情報をインタビュー |
| C: インタビューモード | 素材なし（ゼロから） | 対話で情報収集 |

#### 画像の準備

AIはプレゼンテーションのシナリオに基づいて:

1. 必要な画像を特定
2. 具体的な仕様を提案（構図、解像度、注意点）
3. 提供された画像をレビュー
4. フィードバックと調整を支援

詳細は `spec/sources.md` および `spec/images.md` を参照してください。

### AI設定ファイルをスキップ

AI設定ファイルを生成しない場合:

```bash
slide-gen init --no-ai-config
```

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
