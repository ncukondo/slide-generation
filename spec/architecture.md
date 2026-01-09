# システムアーキテクチャ仕様

## 概要

本システムは、YAMLソースファイルをMarp対応Markdownに変換するパイプラインとして設計されています。

## ディレクトリ構造

```
slide-generation/
├── src/
│   ├── core/
│   │   ├── parser.ts           # YAMLソースパーサー
│   │   ├── transformer.ts      # テンプレート適用・変換
│   │   ├── renderer.ts         # Marp Markdown出力生成
│   │   └── pipeline.ts         # 変換パイプライン統合
│   ├── templates/
│   │   ├── engine.ts           # Nunjucksテンプレートエンジン
│   │   ├── loader.ts           # テンプレート読み込み
│   │   └── validators.ts       # Zodスキーマ検証
│   ├── icons/
│   │   ├── registry.ts         # アイコンソース管理
│   │   ├── resolver.ts         # アイコン解決・レンダリング
│   │   └── cache.ts            # 外部アイコンキャッシュ
│   ├── references/
│   │   ├── manager.ts          # reference-manager連携
│   │   ├── extractor.ts        # 引用抽出
│   │   └── formatter.ts        # 引用フォーマット
│   ├── cli/
│   │   ├── index.ts            # CLIエントリポイント
│   │   ├── commands/           # サブコマンド
│   │   │   ├── convert.ts
│   │   │   ├── preview.ts
│   │   │   ├── templates.ts
│   │   │   └── icons.ts
│   │   └── utils.ts            # CLI ユーティリティ
│   ├── config/
│   │   ├── loader.ts           # 設定ファイル読み込み
│   │   └── schema.ts           # 設定スキーマ
│   └── index.ts                # ライブラリエントリポイント
├── templates/                   # ビルトインテンプレート
│   ├── basic/
│   ├── diagrams/
│   ├── data/
│   ├── layouts/
│   └── special/
├── themes/                      # Marpテーマ（CSS）
│   ├── default.css
│   └── academic.css
├── icons/
│   ├── registry.yaml           # アイコン設定
│   └── custom/                  # カスタムSVG
├── spec/                        # 仕様書
├── examples/                    # サンプルファイル
├── tests/                       # テスト
├── package.json
├── tsconfig.json
└── config.yaml                  # デフォルト設定
```

## コアモジュール

### Parser (`src/core/parser.ts`)

YAMLソースファイルを内部データ構造に変換します。

```typescript
interface ParsedPresentation {
  meta: PresentationMeta;
  slides: ParsedSlide[];
}

interface PresentationMeta {
  title: string;
  author?: string;
  date?: string;
  theme?: string;
  references?: ReferencesConfig;
}

interface ParsedSlide {
  template: string;
  content: Record<string, unknown>;
  class?: string;
  notes?: string;
  raw?: string;  // customテンプレート用
}

class Parser {
  parse(yamlContent: string): ParsedPresentation;
  parseFile(filePath: string): Promise<ParsedPresentation>;
}
```

### Transformer (`src/core/transformer.ts`)

各スライドにテンプレートを適用し、Markdown/HTMLを生成します。

```typescript
interface TransformContext {
  meta: PresentationMeta;
  icons: IconResolver;
  refs: ReferenceFormatter;
  slideIndex: number;
}

class Transformer {
  constructor(
    private templateEngine: TemplateEngine,
    private iconResolver: IconResolver,
    private refFormatter: ReferenceFormatter
  ) {}

  async transform(slide: ParsedSlide, context: TransformContext): Promise<string>;
  async transformAll(presentation: ParsedPresentation): Promise<string[]>;
}
```

### Renderer (`src/core/renderer.ts`)

変換されたスライドをMarp Markdown形式で出力します。

```typescript
interface RenderOptions {
  includeTheme: boolean;
  inlineStyles: boolean;
}

class Renderer {
  render(slides: string[], meta: PresentationMeta, options?: RenderOptions): string;

  // フロントマター生成
  private renderFrontMatter(meta: PresentationMeta): string;

  // スライド結合
  private joinSlides(slides: string[]): string;
}
```

### Pipeline (`src/core/pipeline.ts`)

変換プロセス全体を統合します。

```typescript
interface PipelineOptions {
  configPath?: string;
  outputPath?: string;
  watch?: boolean;
}

class Pipeline {
  constructor(private config: Config) {}

  async run(inputPath: string, options?: PipelineOptions): Promise<string>;

  // 処理ステップ
  private async parseSource(inputPath: string): Promise<ParsedPresentation>;
  private async resolveReferences(presentation: ParsedPresentation): Promise<void>;
  private async transformSlides(presentation: ParsedPresentation): Promise<string[]>;
  private async render(slides: string[], meta: PresentationMeta): Promise<string>;
}
```

## テンプレートモジュール

### TemplateEngine (`src/templates/engine.ts`)

Nunjucksベースのテンプレートエンジン。

```typescript
class TemplateEngine {
  private nunjucks: nunjucks.Environment;

  constructor() {
    this.nunjucks = new nunjucks.Environment();
    this.registerFilters();
    this.registerGlobals();
  }

  // テンプレートをレンダリング
  render(template: string, context: Record<string, unknown>): string;

  // カスタムフィルター登録
  private registerFilters(): void;

  // グローバル関数登録（icons, refs等）
  private registerGlobals(): void;
}
```

### TemplateLoader (`src/templates/loader.ts`)

テンプレート定義ファイルを読み込みます。

```typescript
interface TemplateDefinition {
  name: string;
  description: string;
  category: string;
  schema: ZodSchema;
  output: string;
  css?: string;
  example?: Record<string, unknown>;
}

class TemplateLoader {
  private templates: Map<string, TemplateDefinition>;

  async loadBuiltIn(): Promise<void>;
  async loadCustom(directory: string): Promise<void>;

  get(name: string): TemplateDefinition | undefined;
  list(): TemplateDefinition[];
  listByCategory(category: string): TemplateDefinition[];
}
```

## アイコンモジュール

### IconRegistry (`src/icons/registry.ts`)

アイコンソースとエイリアスを管理します。

```typescript
interface IconSource {
  name: string;
  type: 'web-font' | 'svg-inline' | 'svg-sprite' | 'local-svg';
  prefix: string;
  url?: string;
  path?: string;
  render?: string;
}

interface IconAlias {
  [alias: string]: string;  // alias → prefix:name
}

class IconRegistry {
  private sources: Map<string, IconSource>;
  private aliases: Map<string, string>;

  async load(configPath: string): Promise<void>;

  resolveAlias(name: string): string;
  getSource(prefix: string): IconSource | undefined;
}
```

### IconResolver (`src/icons/resolver.ts`)

アイコンをHTMLにレンダリングします。

```typescript
interface IconOptions {
  size?: string;
  color?: string;
  class?: string;
}

class IconResolver {
  constructor(
    private registry: IconRegistry,
    private cache: IconCache
  ) {}

  async render(nameOrAlias: string, options?: IconOptions): Promise<string>;

  private async renderWebFont(source: IconSource, name: string, options: IconOptions): Promise<string>;
  private async renderSvgInline(source: IconSource, name: string, options: IconOptions): Promise<string>;
  private async renderLocalSvg(source: IconSource, name: string, options: IconOptions): Promise<string>;
}
```

## 文献引用モジュール

### ReferenceManager (`src/references/manager.ts`)

reference-manager CLIと連携します。

```typescript
interface CSLItem {
  id: string;
  type: string;
  author?: { family: string; given: string }[];
  issued?: { 'date-parts': number[][] };
  title?: string;
  'container-title'?: string;
  DOI?: string;
  PMID?: string;
  // ... CSL-JSON fields
}

class ReferenceManager {
  constructor(private command: string = 'ref') {}

  async getAll(): Promise<CSLItem[]>;
  async getById(id: string): Promise<CSLItem | null>;
  async getByIds(ids: string[]): Promise<Map<string, CSLItem>>;
  async search(query: string): Promise<CSLItem[]>;
}
```

### CitationExtractor (`src/references/extractor.ts`)

テキストから引用を抽出します。

```typescript
interface ExtractedCitation {
  id: string;
  locator?: string;
  position: { start: number; end: number };
}

class CitationExtractor {
  extract(text: string): ExtractedCitation[];
  extractFromSlide(slide: ParsedSlide): ExtractedCitation[];
  extractFromPresentation(presentation: ParsedPresentation): ExtractedCitation[];
}
```

### CitationFormatter (`src/references/formatter.ts`)

引用をフォーマットします。

```typescript
interface FormatterConfig {
  locale: string;
  authorSep: string;
  identifierSep: string;
  maxAuthors: number;
  etAl: string;
  etAlJa: string;
}

class CitationFormatter {
  constructor(
    private manager: ReferenceManager,
    private config: FormatterConfig
  ) {}

  // インライン引用
  async formatInline(id: string): Promise<string>;

  // フルcitation（参考文献スライド用）
  async formatFull(id: string): Promise<string>;

  // テキスト内の引用を展開
  async expandCitations(text: string): Promise<string>;
}
```

## 設定モジュール

### ConfigLoader (`src/config/loader.ts`)

```typescript
interface Config {
  templates: {
    builtin: string;
    custom?: string;
  };
  icons: {
    registry: string;
    cache: {
      enabled: boolean;
      directory: string;
      ttl: number;
    };
  };
  references: {
    enabled: boolean;
    connection: {
      type: 'cli';
      command: string;
    };
    format: {
      // ...
    };
  };
  output: {
    theme: string;
    inlineStyles: boolean;
  };
}

class ConfigLoader {
  async load(configPath?: string): Promise<Config>;
  private merge(base: Config, override: Partial<Config>): Config;
}
```

## 変換パイプライン詳細

```
┌─────────────────────────────────────────────────────────────┐
│                      Pipeline.run()                         │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  1. Parse Source                                            │
│     - YAMLファイル読み込み                                    │
│     - 構文検証                                               │
│     - ParsedPresentation生成                                 │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  2. Collect Citations                                       │
│     - 全スライドから [@id] パターン抽出                        │
│     - 一意なIDリスト生成                                      │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  3. Resolve References                                      │
│     - reference-managerから書誌情報取得                       │
│     - 存在しないIDを警告                                      │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  4. Transform Slides (for each slide)                       │
│     a. テンプレート解決                                       │
│     b. スキーマ検証                                          │
│     c. アイコン参照解決                                       │
│     d. 引用展開                                              │
│     e. Nunjucksテンプレート適用                               │
│     f. Markdown/HTML生成                                     │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  5. Render Output                                           │
│     - フロントマター生成                                      │
│     - スライド結合（--- 区切り）                              │
│     - Marp Markdown出力                                      │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  6. Write File                                              │
│     - 出力ファイル書き込み                                    │
│     - (オプション) Marp CLI呼び出し                           │
└─────────────────────────────────────────────────────────────┘
```

## エラーハンドリング

### エラー種別

```typescript
// ベースエラークラス
class SlideGenError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
  }
}

// 具体的なエラー
class ParseError extends SlideGenError {}      // YAML構文エラー
class ValidationError extends SlideGenError {} // スキーマ検証エラー
class TemplateError extends SlideGenError {}   // テンプレート不明・レンダリングエラー
class IconError extends SlideGenError {}       // アイコン解決エラー
class ReferenceError extends SlideGenError {}  // 引用解決エラー
class ConfigError extends SlideGenError {}     // 設定エラー
```

### エラーメッセージ形式

```
Error [VALIDATION_ERROR]: Schema validation failed
  Location: slides[2] (cycle-diagram)
  Field: nodes
  Message: Array must contain at least 3 element(s)

  Hint: cycle-diagram requires 3-6 nodes

  Example:
    nodes:
      - { label: "Step 1" }
      - { label: "Step 2" }
      - { label: "Step 3" }
```

## 依存関係

```json
{
  "dependencies": {
    "yaml": "^2.x",           // YAMLパーサー
    "nunjucks": "^3.x",       // テンプレートエンジン
    "zod": "^3.x",            // スキーマ検証
    "commander": "^11.x",     // CLIフレームワーク
    "chalk": "^5.x",          // ターミナル出力色付け
    "ora": "^7.x",            // スピナー
    "globby": "^14.x",        // ファイルグロブ
    "chokidar": "^3.x"        // ファイル監視（watch用）
  },
  "devDependencies": {
    "typescript": "^5.x",
    "tsup": "^8.x",           // ビルド
    "vitest": "^1.x",         // テスト
    "@types/node": "^20.x",
    "@types/nunjucks": "^3.x"
  }
}
```

## ビルドと配布

### ビルド設定 (tsup)

```typescript
// tsup.config.ts
export default {
  entry: ['src/index.ts', 'src/cli/index.ts'],
  format: ['esm'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  outDir: 'dist',
};
```

### package.json

```json
{
  "name": "slide-generation",
  "version": "0.1.0",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "bin": {
    "slide-gen": "./dist/cli/index.js"
  },
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "files": [
    "dist",
    "templates",
    "themes",
    "icons"
  ]
}
```
