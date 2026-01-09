# Task: Icon Registry & Resolver

## Purpose

アイコンレジストリの読み込みとアイコン解決機能を実装する。
エイリアス解決、複数ソースタイプ（web-font, svg-inline, local-svg）のサポート。

## Context

- **関連仕様**: [spec/icons.md](../icons.md)
- **依存タスク**: [04-template-engine](./04-template-engine.md)
- **関連ソース**: `src/icons/`

## Implementation Steps

### Step 1: Icon Registry Schema

**Goal**: アイコンレジストリ（registry.yaml）のスキーマ定義

```typescript
// src/icons/registry.ts
const iconSourceSchema = z.object({
  name: z.string(),
  type: z.enum(['web-font', 'svg-inline', 'svg-sprite', 'local-svg']),
  prefix: z.string(),
  url: z.string().optional(),
  path: z.string().optional(),
  render: z.string().optional(),
});

const iconRegistrySchema = z.object({
  sources: z.array(iconSourceSchema),
  aliases: z.record(z.string()).default({}),
  colors: z.record(z.string()).optional(),
  defaults: z.object({
    size: z.string().default('24px'),
    color: z.string().default('currentColor'),
  }).default({}),
});
```

### Step 2: Icon Registry Loader

```typescript
export class IconRegistry {
  private sources: Map<string, IconSource>;
  private aliases: Map<string, string>;

  async load(configPath: string): Promise<void>;
  resolveAlias(name: string): string;
  getSource(prefix: string): IconSource | undefined;
}
```

### Step 3: Icon Resolver

```typescript
export interface IconOptions {
  size?: string;
  color?: string;
  class?: string;
}

export class IconResolver {
  constructor(private registry: IconRegistry);

  async render(nameOrAlias: string, options?: IconOptions): Promise<string>;

  private renderWebFont(source: IconSource, name: string, options: IconOptions): string;
  private async renderSvgInline(source: IconSource, name: string, options: IconOptions): Promise<string>;
  private async renderLocalSvg(source: IconSource, name: string, options: IconOptions): Promise<string>;
}
```

### Step 4: Icon Cache

```typescript
export class IconCache {
  constructor(private cacheDir: string, private ttl: number);

  async get(key: string): Promise<string | null>;
  async set(key: string, value: string): Promise<void>;
  async clear(): Promise<void>;
}
```

## E2E Test

- 実際のレジストリファイルを読み込み
- エイリアス解決のテスト
- Web Font アイコンのレンダリング
- ローカルSVGの読み込み

## Acceptance Criteria

- [ ] レジストリYAMLファイルを読み込める
- [ ] エイリアスが解決される
- [ ] Web Fontアイコンが正しいHTMLを生成する
- [ ] ローカルSVGがインライン化される
- [ ] キャッシュが機能する

## Files Changed

- [ ] `src/icons/registry.ts` - 新規作成
- [ ] `src/icons/resolver.ts` - 新規作成
- [ ] `src/icons/cache.ts` - 新規作成
- [ ] `icons/registry.yaml` - サンプル設定
- [ ] `icons/custom/.gitkeep` - カスタムアイコン用ディレクトリ
