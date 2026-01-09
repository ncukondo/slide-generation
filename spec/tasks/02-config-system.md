# Task: Config System

## Purpose

設定ファイル（config.yaml）の読み込み・マージ・検証機能を実装する。
複数の設定ソース（ファイル、デフォルト）を統合し、型安全な設定オブジェクトを提供する。

## Context

- **関連仕様**: [spec/cli.md](../cli.md) - 設定ファイルセクション
- **依存タスク**: [01-project-setup](./completed/01-project-setup.md)
- **関連ソース**: `src/config/`

## TDD Implementation Cycle

各ステップで以下のサイクルを実行:

1. **Red**: 失敗するテストを書く
2. **Green**: テストを通す最小限の実装
3. **Refactor**: `pnpm lint && pnpm typecheck` を実行し、リファクタリング

## Implementation Steps

### Step 1: Config Schema Definition

**Goal**: Zodを使用して設定スキーマを定義する

**Test file**: `src/config/schema.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { configSchema, type Config } from './schema';

describe('configSchema', () => {
  it('should validate a complete config', () => {
    const config = {
      templates: { builtin: './templates' },
      icons: { registry: './icons/registry.yaml' },
      references: { enabled: true },
      output: { theme: 'default' },
    };
    expect(() => configSchema.parse(config)).not.toThrow();
  });

  it('should apply defaults for missing optional fields', () => {
    const config = {};
    const parsed = configSchema.parse(config);
    expect(parsed.output.theme).toBe('default');
  });

  it('should reject invalid config', () => {
    const config = { templates: { builtin: 123 } }; // should be string
    expect(() => configSchema.parse(config)).toThrow();
  });
});
```

**Implementation**: `src/config/schema.ts`

```typescript
import { z } from 'zod';

export const configSchema = z.object({
  templates: z.object({
    builtin: z.string().default('./templates'),
    custom: z.string().optional(),
  }).default({}),

  icons: z.object({
    registry: z.string().default('./icons/registry.yaml'),
    cache: z.object({
      enabled: z.boolean().default(true),
      directory: z.string().default('.cache/icons'),
      ttl: z.number().default(86400),
    }).default({}),
  }).default({}),

  references: z.object({
    enabled: z.boolean().default(true),
    connection: z.object({
      type: z.literal('cli').default('cli'),
      command: z.string().default('ref'),
    }).default({}),
    format: z.object({
      locale: z.string().default('ja-JP'),
      authorSep: z.string().default(', '),
      identifierSep: z.string().default('; '),
      maxAuthors: z.number().default(2),
      etAl: z.string().default('et al.'),
      etAlJa: z.string().default('ほか'),
    }).default({}),
  }).default({}),

  output: z.object({
    theme: z.string().default('default'),
    inlineStyles: z.boolean().default(false),
  }).default({}),
});

export type Config = z.infer<typeof configSchema>;
```

**Verification**:
- [ ] テストが失敗することを確認
- [ ] 実装後、テストが通ることを確認
- [ ] `pnpm lint && pnpm typecheck` が通ることを確認

### Step 2: Config File Loader

**Goal**: YAMLファイルから設定を読み込む機能を実装

**Test file**: `src/config/loader.test.ts`

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ConfigLoader } from './loader';
import { writeFileSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';

describe('ConfigLoader', () => {
  const testDir = './test-config-tmp';

  beforeEach(() => {
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it('should load config from file', async () => {
    const configPath = join(testDir, 'config.yaml');
    writeFileSync(configPath, 'output:\n  theme: "custom"');

    const loader = new ConfigLoader();
    const config = await loader.load(configPath);

    expect(config.output.theme).toBe('custom');
  });

  it('should return default config when file not found', async () => {
    const loader = new ConfigLoader();
    const config = await loader.load('./nonexistent.yaml');

    expect(config.output.theme).toBe('default');
  });

  it('should merge configs with priority', async () => {
    const configPath = join(testDir, 'config.yaml');
    writeFileSync(configPath, 'output:\n  theme: "custom"');

    const loader = new ConfigLoader();
    const config = await loader.load(configPath);

    // File config overrides default
    expect(config.output.theme).toBe('custom');
    // Default is preserved for unspecified fields
    expect(config.output.inlineStyles).toBe(false);
  });
});
```

**Implementation**: `src/config/loader.ts`

```typescript
import { readFile } from 'fs/promises';
import { parse as parseYaml } from 'yaml';
import { configSchema, type Config } from './schema';

export class ConfigLoader {
  async load(configPath?: string): Promise<Config> {
    const fileConfig = await this.loadFile(configPath);
    return configSchema.parse(fileConfig);
  }

  private async loadFile(configPath?: string): Promise<unknown> {
    if (!configPath) return {};

    try {
      const content = await readFile(configPath, 'utf-8');
      return parseYaml(content) ?? {};
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return {};
      }
      throw error;
    }
  }
}
```

**Verification**:
- [ ] テストが失敗することを確認
- [ ] 実装後、テストが通ることを確認
- [ ] `pnpm lint && pnpm typecheck` が通ることを確認

### Step 3: Config Search Path

**Goal**: 複数のパスから設定ファイルを検索する機能を実装

**Test file**: `src/config/loader.test.ts` (追加)

```typescript
describe('ConfigLoader.findConfig', () => {
  it('should find config in current directory', async () => {
    const configPath = join(testDir, 'config.yaml');
    writeFileSync(configPath, 'output:\n  theme: "found"');

    const loader = new ConfigLoader();
    const found = await loader.findConfig(testDir);

    expect(found).toBe(configPath);
  });

  it('should find slide-gen.yaml as alternative', async () => {
    const configPath = join(testDir, 'slide-gen.yaml');
    writeFileSync(configPath, 'output:\n  theme: "alt"');

    const loader = new ConfigLoader();
    const found = await loader.findConfig(testDir);

    expect(found).toBe(configPath);
  });

  it('should return undefined when no config found', async () => {
    const loader = new ConfigLoader();
    const found = await loader.findConfig(testDir);

    expect(found).toBeUndefined();
  });
});
```

**Implementation**: `src/config/loader.ts` (追加)

```typescript
import { access } from 'fs/promises';
import { join } from 'path';

const CONFIG_NAMES = ['config.yaml', 'slide-gen.yaml'];

export class ConfigLoader {
  // ... existing methods ...

  async findConfig(directory: string): Promise<string | undefined> {
    for (const name of CONFIG_NAMES) {
      const path = join(directory, name);
      try {
        await access(path);
        return path;
      } catch {
        // Continue to next
      }
    }
    return undefined;
  }
}
```

**Verification**:
- [ ] テストが失敗することを確認
- [ ] 実装後、テストが通ることを確認
- [ ] `pnpm lint && pnpm typecheck` が通ることを確認

## E2E Test (必須)

**Test file**: `tests/e2e/config.test.ts`

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ConfigLoader } from '../../src/config/loader';
import { writeFileSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';

describe('E2E: Config System', () => {
  const testDir = './test-e2e-config';

  beforeEach(() => {
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it('should load and merge config from real files', async () => {
    const configContent = `
templates:
  builtin: "./my-templates"
  custom: "./custom-templates"

icons:
  registry: "./my-icons/registry.yaml"
  cache:
    enabled: false

references:
  enabled: true
  connection:
    command: "my-ref"

output:
  theme: "academic"
  inlineStyles: true
`;
    writeFileSync(join(testDir, 'config.yaml'), configContent);

    const loader = new ConfigLoader();
    const found = await loader.findConfig(testDir);
    expect(found).toBeDefined();

    const config = await loader.load(found!);

    expect(config.templates.builtin).toBe('./my-templates');
    expect(config.templates.custom).toBe('./custom-templates');
    expect(config.icons.cache.enabled).toBe(false);
    expect(config.references.connection.command).toBe('my-ref');
    expect(config.output.theme).toBe('academic');
  });

  it('should handle malformed YAML gracefully', async () => {
    writeFileSync(join(testDir, 'config.yaml'), 'invalid: yaml: content:');

    const loader = new ConfigLoader();
    await expect(loader.load(join(testDir, 'config.yaml'))).rejects.toThrow();
  });
});
```

**Verification**:
- [ ] 実際のファイルI/Oでテストが通る
- [ ] エッジケースをカバー
- [ ] エラーハンドリングをテスト

## Acceptance Criteria

- [ ] 全てのテストが通る (`pnpm test`)
- [ ] 型チェックが通る (`pnpm typecheck`)
- [ ] リントが通る (`pnpm lint`)
- [ ] E2Eテストが通る
- [ ] デフォルト値が正しく適用される
- [ ] 設定のマージが正しく動作する
- [ ] 不正な設定でエラーが発生する

## Files Changed

- [ ] `src/config/schema.ts` - 新規作成
- [ ] `src/config/schema.test.ts` - 新規作成
- [ ] `src/config/loader.ts` - 新規作成
- [ ] `src/config/loader.test.ts` - 新規作成
- [ ] `src/config/index.ts` - エクスポート
- [ ] `tests/e2e/config.test.ts` - 新規作成

## Notes

- 設定検索パスは仕様書の順序に従う: `--config` > `config.yaml` > `slide-gen.yaml` > `~/.slide-gen/config.yaml`
- ホームディレクトリの検索はPhase 1では省略可能
