# Task: External Icon Search Command

## Purpose

Iconify APIを使って外部アイコンを検索する `icons search-external` コマンドを実装する。これにより、AI-Agentがローカルレジストリに登録されていないアイコンを検索し、適切なアイコンを発見・追加できるようになる。

## Context

- **関連仕様**: [spec/icons.md](../icons.md) - External Icon Search セクション
- **依存タスク**:
  - [14-cli-icons](./completed/14-cli-icons.md) - Icons CLIコマンド基盤
  - [26-icon-enhancements](./completed/26-icon-enhancements.md) - アイコン機能強化
- **関連ソース**:
  - `src/cli/commands/icons.ts`
  - `src/icons/fetcher.ts`

## TDD Implementation Cycle

各ステップで以下のサイクルを実行:

1. **Red**: 失敗するテストを書く
2. **Green**: テストを通す最小限の実装
3. **Refactor**: `pnpm lint && pnpm typecheck` を実行し、リファクタリング

## Implementation Steps

### Step 1: Iconify API Client

**Goal**: Iconify API を呼び出すクライアントを実装

**Test file**: `src/icons/iconify-api.test.ts`

```typescript
import { describe, it, expect, vi } from 'vitest';
import { IconifyApiClient } from './iconify-api.js';

describe('IconifyApiClient', () => {
  describe('search', () => {
    it('should search icons by query', async () => {
      const client = new IconifyApiClient();
      const results = await client.search('heart', { limit: 5 });

      expect(results.icons).toBeDefined();
      expect(results.total).toBeGreaterThan(0);
    });

    it('should filter by icon set', async () => {
      const client = new IconifyApiClient();
      const results = await client.search('heart', {
        limit: 10,
        prefixes: ['mdi']
      });

      expect(results.icons.every(icon => icon.startsWith('mdi:'))).toBe(true);
    });

    it('should handle empty results', async () => {
      const client = new IconifyApiClient();
      const results = await client.search('xyznonexistent12345', { limit: 5 });

      expect(results.icons).toEqual([]);
      expect(results.total).toBe(0);
    });

    it('should handle network errors gracefully', async () => {
      const client = new IconifyApiClient({ baseUrl: 'https://invalid.example.com' });

      await expect(client.search('heart')).rejects.toThrow();
    });
  });

  describe('getCollections', () => {
    it('should list available icon collections', async () => {
      const client = new IconifyApiClient();
      const collections = await client.getCollections();

      expect(collections).toHaveProperty('mdi');
      expect(collections).toHaveProperty('heroicons');
      expect(collections.mdi).toHaveProperty('name');
      expect(collections.mdi).toHaveProperty('total');
    });
  });
});
```

**Implementation**: `src/icons/iconify-api.ts`

```typescript
export interface SearchOptions {
  limit?: number;
  prefixes?: string[];
  start?: number;
}

export interface SearchResult {
  icons: string[];
  total: number;
  limit: number;
  start: number;
}

export interface CollectionInfo {
  name: string;
  total: number;
  author?: { name: string; url?: string };
  license?: { title: string; spdx?: string };
  samples?: string[];
  category?: string;
}

export interface IconifyApiClientOptions {
  baseUrl?: string;
  timeout?: number;
}

export class IconifyApiClient {
  private baseUrl: string;
  private timeout: number;

  constructor(options?: IconifyApiClientOptions) {
    this.baseUrl = options?.baseUrl ?? 'https://api.iconify.design';
    this.timeout = options?.timeout ?? 10000;
  }

  async search(query: string, options?: SearchOptions): Promise<SearchResult> {
    // Implementation
  }

  async getCollections(): Promise<Record<string, CollectionInfo>> {
    // Implementation
  }
}
```

**Verification**:
- [ ] テストが失敗することを確認
- [ ] 実装後、テストが通ることを確認
- [ ] `pnpm lint && pnpm typecheck` が通ることを確認

### Step 2: Search Result Formatter

**Goal**: 検索結果を各種フォーマット（table, json, llm）に変換

**Test file**: `src/icons/search-formatter.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { formatExternalSearchResults, ExternalSearchResult } from './search-formatter.js';

describe('formatExternalSearchResults', () => {
  const mockResults: ExternalSearchResult = {
    query: 'stethoscope',
    total: 3,
    icons: [
      { reference: 'healthicons:stethoscope', set: 'healthicons', name: 'stethoscope' },
      { reference: 'mdi:stethoscope', set: 'mdi', name: 'stethoscope' },
      { reference: 'fa6-solid:stethoscope', set: 'fa6-solid', name: 'stethoscope' },
    ],
  };

  it('should format as table', () => {
    const output = formatExternalSearchResults(mockResults, 'table');

    expect(output).toContain('External Icon Search');
    expect(output).toContain('stethoscope');
    expect(output).toContain('healthicons:stethoscope');
    expect(output).toContain('mdi:stethoscope');
  });

  it('should format as JSON', () => {
    const output = formatExternalSearchResults(mockResults, 'json');
    const parsed = JSON.parse(output);

    expect(parsed.query).toBe('stethoscope');
    expect(parsed.icons).toHaveLength(3);
  });

  it('should format as LLM-friendly output', () => {
    const output = formatExternalSearchResults(mockResults, 'llm');

    expect(output).toContain('# External Icon Search Results');
    expect(output).toContain('Query: stethoscope');
    expect(output).toContain('healthicons:stethoscope');
    expect(output).toContain('slide-gen icons add');
  });

  it('should handle empty results', () => {
    const emptyResults: ExternalSearchResult = {
      query: 'nonexistent',
      total: 0,
      icons: [],
    };

    const output = formatExternalSearchResults(emptyResults, 'table');
    expect(output).toContain('No icons found');
  });
});
```

**Implementation**: `src/icons/search-formatter.ts`

```typescript
export interface ExternalSearchResultIcon {
  reference: string;
  set: string;
  name: string;
  setName?: string;
  style?: string;
}

export interface ExternalSearchResult {
  query: string;
  total: number;
  icons: ExternalSearchResultIcon[];
}

export type OutputFormat = 'table' | 'json' | 'llm';

export function formatExternalSearchResults(
  results: ExternalSearchResult,
  format: OutputFormat
): string {
  // Implementation
}
```

**Verification**:
- [ ] テストが失敗することを確認
- [ ] 実装後、テストが通ることを確認
- [ ] `pnpm lint && pnpm typecheck` が通ることを確認

### Step 3: CLI search-external Command

**Goal**: `icons search-external` サブコマンドを実装

**Test file**: `src/cli/commands/icons.test.ts` (追記)

```typescript
describe('icons search-external', () => {
  it('should search external icons', async () => {
    const { stdout, exitCode } = await runCli([
      'icons', 'search-external', 'heart', '--limit', '5'
    ]);

    expect(exitCode).toBe(0);
    expect(stdout).toContain('External Icon Search');
    expect(stdout).toContain('heart');
  });

  it('should filter by icon set', async () => {
    const { stdout, exitCode } = await runCli([
      'icons', 'search-external', 'arrow', '--set', 'mdi', '--format', 'json'
    ]);

    expect(exitCode).toBe(0);
    const parsed = JSON.parse(stdout);
    expect(parsed.icons.every((i: any) => i.set === 'mdi')).toBe(true);
  });

  it('should output LLM format', async () => {
    const { stdout, exitCode } = await runCli([
      'icons', 'search-external', 'check', '--format', 'llm'
    ]);

    expect(exitCode).toBe(0);
    expect(stdout).toContain('# External Icon Search Results');
    expect(stdout).toContain('slide-gen icons add');
  });

  it('should list available prefixes', async () => {
    const { stdout, exitCode } = await runCli([
      'icons', 'search-external', '--prefixes'
    ]);

    expect(exitCode).toBe(0);
    expect(stdout).toContain('Available Icon Sets');
    expect(stdout).toContain('mdi');
    expect(stdout).toContain('heroicons');
  });

  it('should handle no results gracefully', async () => {
    const { stdout, exitCode } = await runCli([
      'icons', 'search-external', 'xyznonexistent12345'
    ]);

    expect(exitCode).toBe(0);
    expect(stdout).toContain('No icons found');
  });
});
```

**Implementation**: `src/cli/commands/icons.ts` (追記)

```typescript
interface SearchExternalOptions {
  limit?: number;
  set?: string[];
  style?: string;
  format?: 'table' | 'json' | 'llm';
  prefixes?: boolean;
  config?: string;
}

function createSearchExternalCommand(): Command {
  return new Command('search-external')
    .description('Search external icon sources (Iconify API)')
    .argument('[query]', 'Search query')
    .option('-l, --limit <n>', 'Maximum results', '20')
    .option('-s, --set <name...>', 'Filter by icon set (can specify multiple)')
    .option('--style <style>', 'Filter by style (outline/solid/fill)')
    .option('-f, --format <fmt>', 'Output format (table/json/llm)', 'table')
    .option('-p, --prefixes', 'List available icon set prefixes')
    .option('-c, --config <path>', 'Config file path')
    .action(async (query: string | undefined, options: SearchExternalOptions) => {
      // Implementation
    });
}
```

**Verification**:
- [ ] テストが失敗することを確認
- [ ] 実装後、テストが通ることを確認
- [ ] `pnpm lint && pnpm typecheck` が通ることを確認

### Step 4: Caching Support

**Goal**: API呼び出し結果のキャッシュを実装（オプション）

**Test file**: `src/icons/search-cache.test.ts`

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { SearchCache } from './search-cache.js';

describe('SearchCache', () => {
  const cacheDir = '.test-cache/icon-search';

  beforeEach(async () => {
    await fs.mkdir(cacheDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm('.test-cache', { recursive: true, force: true });
  });

  it('should cache search results', async () => {
    const cache = new SearchCache({ directory: cacheDir, ttl: 3600 });
    const data = { icons: ['mdi:heart'], total: 1 };

    await cache.set('heart', data);
    const cached = await cache.get('heart');

    expect(cached).toEqual(data);
  });

  it('should return null for expired cache', async () => {
    const cache = new SearchCache({ directory: cacheDir, ttl: 0 });
    const data = { icons: ['mdi:heart'], total: 1 };

    await cache.set('heart', data);
    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 100));
    const cached = await cache.get('heart');

    expect(cached).toBeNull();
  });

  it('should return null for missing cache', async () => {
    const cache = new SearchCache({ directory: cacheDir, ttl: 3600 });
    const cached = await cache.get('nonexistent');

    expect(cached).toBeNull();
  });
});
```

**Implementation**: `src/icons/search-cache.ts`

```typescript
export interface SearchCacheOptions {
  directory: string;
  ttl: number; // seconds
}

export class SearchCache {
  constructor(options: SearchCacheOptions) {
    // Implementation
  }

  async get<T>(key: string): Promise<T | null> {
    // Implementation
  }

  async set<T>(key: string, data: T): Promise<void> {
    // Implementation
  }
}
```

**Verification**:
- [ ] テストが失敗することを確認
- [ ] 実装後、テストが通ることを確認
- [ ] `pnpm lint && pnpm typecheck` が通ることを確認

## E2E Test (必須)

> **重要**: ユニットテストのモックは実際の使用時に失敗することがある。
> 最終ステップとしてE2Eテストを必ず実施する。

**Test file**: `src/icons/icons.e2e.test.ts` (追記)

```typescript
describe('E2E: icons search-external', () => {
  it('should search and display results from Iconify API', async () => {
    const { exitCode, stdout } = await execAsync(
      'pnpm slide-gen icons search-external heart --limit 5'
    );

    expect(exitCode).toBe(0);
    expect(stdout).toContain('heart');
    expect(stdout).toMatch(/mdi:|heroicons:|fa/);
  });

  it('should work with --set filter', async () => {
    const { exitCode, stdout } = await execAsync(
      'pnpm slide-gen icons search-external arrow --set mdi --format json'
    );

    expect(exitCode).toBe(0);
    const result = JSON.parse(stdout);
    expect(result.icons.every((i: any) => i.reference.startsWith('mdi:'))).toBe(true);
  });

  it('should output LLM-friendly format for AI agents', async () => {
    const { exitCode, stdout } = await execAsync(
      'pnpm slide-gen icons search-external check --format llm --limit 10'
    );

    expect(exitCode).toBe(0);
    expect(stdout).toContain('# External Icon Search Results');
    expect(stdout).toContain('slide-gen icons add');
  });

  it('should list available icon sets with --prefixes', async () => {
    const { exitCode, stdout } = await execAsync(
      'pnpm slide-gen icons search-external --prefixes'
    );

    expect(exitCode).toBe(0);
    expect(stdout).toContain('mdi');
    expect(stdout).toContain('Material Design Icons');
  });

  it('should complete full workflow: search -> add -> use', async () => {
    // 1. Search for icon
    const searchResult = await execAsync(
      'pnpm slide-gen icons search-external stethoscope --format json --limit 1'
    );
    expect(searchResult.exitCode).toBe(0);

    const result = JSON.parse(searchResult.stdout);
    expect(result.icons.length).toBeGreaterThan(0);

    // 2. The icon reference can be used with 'icons add'
    // (This verifies the reference format is correct)
    const iconRef = result.icons[0].reference;
    expect(iconRef).toMatch(/^[a-z0-9-]+:[a-z0-9-]+$/i);
  });
});
```

**Verification**:
- [ ] 実際のIconify APIを使用してテストが通る
- [ ] ネットワークエラー時のエラーハンドリングをテスト
- [ ] LLMフォーマット出力がAI-Agentで使用可能か確認

## Acceptance Criteria

- [ ] 全てのテストが通る (`pnpm test`)
- [ ] 型チェックが通る (`pnpm typecheck`)
- [ ] リントが通る (`pnpm lint`)
- [ ] E2Eテストが通る
- [ ] `slide-gen icons search-external <query>` でIconify APIから検索できる
- [ ] `--set` オプションで特定のアイコンセットに絞れる
- [ ] `--format llm` でAI-Agent向けフォーマットが出力される
- [ ] `--prefixes` で利用可能なアイコンセット一覧が表示される
- [ ] ネットワークエラー時に適切なエラーメッセージが表示される

## Files Changed

- [ ] `src/icons/iconify-api.ts` - 新規作成（Iconify APIクライアント）
- [ ] `src/icons/iconify-api.test.ts` - 新規作成
- [ ] `src/icons/search-formatter.ts` - 新規作成（検索結果フォーマッター）
- [ ] `src/icons/search-formatter.test.ts` - 新規作成
- [ ] `src/icons/search-cache.ts` - 新規作成（キャッシュ機能）
- [ ] `src/icons/search-cache.test.ts` - 新規作成
- [ ] `src/cli/commands/icons.ts` - search-external サブコマンド追加
- [ ] `src/cli/commands/icons.test.ts` - テスト追加
- [ ] `src/icons/icons.e2e.test.ts` - E2Eテスト追加
- [ ] `src/icons/index.ts` - エクスポート追加

## Notes

### Iconify API エンドポイント

- 検索: `GET https://api.iconify.design/search?query=<query>&limit=<limit>`
- コレクション一覧: `GET https://api.iconify.design/collections`
- 詳細ドキュメント: https://iconify.design/docs/api/

### LLM Format の設計意図

AI-Agentが検索結果を解析しやすいように:
1. YAML形式でコメント付き
2. 推奨アイコンをカテゴリ別に整理
3. 使用コマンド例を含める

### キャッシュの必要性

- Iconify APIへのリクエスト数を削減
- オフライン時の部分的なサポート
- 同じクエリの繰り返し検索を高速化

### 将来の拡張

- `--interactive` オプションでインタラクティブ選択
- SVGプレビューのターミナル表示（sixel対応端末）
- 検索履歴の保存
