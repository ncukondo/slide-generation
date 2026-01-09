# Task: YAML Parser

## Purpose

YAMLソースファイルを解析し、プレゼンテーションの内部データ構造（AST）に変換する。
メタデータとスライド定義を抽出し、基本的な構文検証を行う。

## Context

- **関連仕様**: [spec/source-format.md](../source-format.md)
- **依存タスク**: [02-config-system](./02-config-system.md)
- **関連ソース**: `src/core/`

## TDD Implementation Cycle

各ステップで以下のサイクルを実行:

1. **Red**: 失敗するテストを書く
2. **Green**: テストを通す最小限の実装
3. **Refactor**: `pnpm lint && pnpm typecheck` を実行し、リファクタリング

## Implementation Steps

### Step 1: Presentation Schema Definition

**Goal**: プレゼンテーションのZodスキーマを定義する

**Test file**: `src/core/parser.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { presentationSchema, type ParsedPresentation } from './parser';

describe('presentationSchema', () => {
  it('should validate a minimal presentation', () => {
    const input = {
      meta: { title: 'Test Presentation' },
      slides: [
        { template: 'title', content: { title: 'Hello' } },
      ],
    };
    expect(() => presentationSchema.parse(input)).not.toThrow();
  });

  it('should validate presentation with all meta fields', () => {
    const input = {
      meta: {
        title: 'Full Presentation',
        author: 'Test Author',
        date: '2026-01-10',
        theme: 'academic',
        references: { enabled: true, style: 'author-year-pmid' },
      },
      slides: [],
    };
    expect(() => presentationSchema.parse(input)).not.toThrow();
  });

  it('should reject presentation without title', () => {
    const input = {
      meta: {},
      slides: [],
    };
    expect(() => presentationSchema.parse(input)).toThrow();
  });

  it('should validate slide with class and notes', () => {
    const input = {
      meta: { title: 'Test' },
      slides: [
        {
          template: 'bullet-list',
          content: { title: 'List', items: ['a', 'b'] },
          class: 'highlight',
          notes: 'Speaker notes here',
        },
      ],
    };
    expect(() => presentationSchema.parse(input)).not.toThrow();
  });
});
```

**Implementation**: `src/core/parser.ts`

```typescript
import { z } from 'zod';

// Meta schema
const referencesConfigSchema = z.object({
  enabled: z.boolean().default(true),
  style: z.string().default('author-year-pmid'),
});

const metaSchema = z.object({
  title: z.string(),
  author: z.string().optional(),
  date: z.string().optional(),
  theme: z.string().default('default'),
  references: referencesConfigSchema.optional(),
});

// Slide schema
const slideSchema = z.object({
  template: z.string(),
  content: z.record(z.unknown()).default({}),
  class: z.string().optional(),
  notes: z.string().optional(),
  raw: z.string().optional(), // for custom template
});

// Presentation schema
export const presentationSchema = z.object({
  meta: metaSchema,
  slides: z.array(slideSchema).default([]),
});

export type PresentationMeta = z.infer<typeof metaSchema>;
export type ParsedSlide = z.infer<typeof slideSchema>;
export type ParsedPresentation = z.infer<typeof presentationSchema>;
```

**Verification**:
- [ ] テストが失敗することを確認
- [ ] 実装後、テストが通ることを確認
- [ ] `pnpm lint && pnpm typecheck` が通ることを確認

### Step 2: Parser Class Implementation

**Goal**: YAMLファイルをパースしてParsedPresentationを返すParserクラスを実装

**Test file**: `src/core/parser.test.ts` (追加)

```typescript
import { Parser } from './parser';

describe('Parser', () => {
  describe('parse', () => {
    it('should parse valid YAML string', () => {
      const yaml = `
meta:
  title: "Test Presentation"
slides:
  - template: title
    content:
      title: "Hello World"
`;
      const parser = new Parser();
      const result = parser.parse(yaml);

      expect(result.meta.title).toBe('Test Presentation');
      expect(result.slides).toHaveLength(1);
      expect(result.slides[0].template).toBe('title');
    });

    it('should throw ParseError for invalid YAML syntax', () => {
      const yaml = 'invalid: yaml: content:';
      const parser = new Parser();

      expect(() => parser.parse(yaml)).toThrow();
    });

    it('should throw ValidationError for invalid schema', () => {
      const yaml = `
meta: {}
slides: []
`;
      const parser = new Parser();

      expect(() => parser.parse(yaml)).toThrow(/title/);
    });
  });
});
```

**Implementation**: `src/core/parser.ts` (追加)

```typescript
import { parse as parseYaml } from 'yaml';

export class ParseError extends Error {
  constructor(message: string, public details?: unknown) {
    super(message);
    this.name = 'ParseError';
  }
}

export class ValidationError extends Error {
  constructor(message: string, public details?: unknown) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class Parser {
  parse(yamlContent: string): ParsedPresentation {
    let rawData: unknown;

    try {
      rawData = parseYaml(yamlContent);
    } catch (error) {
      throw new ParseError('Failed to parse YAML', error);
    }

    const result = presentationSchema.safeParse(rawData);

    if (!result.success) {
      throw new ValidationError(
        'Schema validation failed',
        result.error.format()
      );
    }

    return result.data;
  }
}
```

**Verification**:
- [ ] テストが失敗することを確認
- [ ] 実装後、テストが通ることを確認
- [ ] `pnpm lint && pnpm typecheck` が通ることを確認

### Step 3: File Parsing

**Goal**: ファイルパスからプレゼンテーションを読み込む機能を追加

**Test file**: `src/core/parser.test.ts` (追加)

```typescript
import { writeFileSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';

describe('Parser.parseFile', () => {
  const testDir = './test-parser-tmp';

  beforeEach(() => {
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it('should parse file from path', async () => {
    const filePath = join(testDir, 'test.yaml');
    writeFileSync(filePath, `
meta:
  title: "File Test"
slides:
  - template: section
    content:
      title: "Section 1"
`);

    const parser = new Parser();
    const result = await parser.parseFile(filePath);

    expect(result.meta.title).toBe('File Test');
  });

  it('should throw error for nonexistent file', async () => {
    const parser = new Parser();
    await expect(parser.parseFile('./nonexistent.yaml')).rejects.toThrow();
  });
});
```

**Implementation**: `src/core/parser.ts` (追加)

```typescript
import { readFile } from 'fs/promises';

export class Parser {
  // ... existing parse method ...

  async parseFile(filePath: string): Promise<ParsedPresentation> {
    try {
      const content = await readFile(filePath, 'utf-8');
      return this.parse(content);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new ParseError(`File not found: ${filePath}`);
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

## E2E Test (必須)

**Test file**: `tests/e2e/parser.test.ts`

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Parser } from '../../src/core/parser';
import { writeFileSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';

describe('E2E: Parser', () => {
  const testDir = './test-e2e-parser';

  beforeEach(() => {
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it('should parse complete presentation file', async () => {
    const content = `
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

  - template: bullet-list
    content:
      title: "背景"
      items:
        - "従来手法には課題がある [@smith2024]"
        - "近年の研究で改善が試みられている"
    notes: "ここで従来手法の問題点を説明"

  - template: cycle-diagram
    content:
      title: "提案手法の概要"
      nodes:
        - { label: "データ収集", icon: "database", color: "#4CAF50" }
        - { label: "分析", icon: "analysis", color: "#2196F3" }
        - { label: "モデル構築", icon: "model", color: "#FF9800" }
        - { label: "評価", icon: "evaluation", color: "#9C27B0" }

  - template: bibliography
    content:
      title: "参考文献"
`;
    writeFileSync(join(testDir, 'presentation.yaml'), content);

    const parser = new Parser();
    const result = await parser.parseFile(join(testDir, 'presentation.yaml'));

    expect(result.meta.title).toBe('研究発表');
    expect(result.meta.author).toBe('山田太郎');
    expect(result.meta.theme).toBe('academic');
    expect(result.meta.references?.enabled).toBe(true);
    expect(result.slides).toHaveLength(4);
    expect(result.slides[0].template).toBe('title');
    expect(result.slides[1].notes).toBe('ここで従来手法の問題点を説明');
    expect(result.slides[2].content.nodes).toHaveLength(4);
  });

  it('should handle Japanese content correctly', async () => {
    const content = `
meta:
  title: "日本語タイトル"
slides:
  - template: bullet-list
    content:
      title: "箇条書き"
      items:
        - "日本語アイテム1"
        - "日本語アイテム2"
`;
    writeFileSync(join(testDir, 'japanese.yaml'), content);

    const parser = new Parser();
    const result = await parser.parseFile(join(testDir, 'japanese.yaml'));

    expect(result.meta.title).toBe('日本語タイトル');
    expect(result.slides[0].content.items).toContain('日本語アイテム1');
  });
});
```

**Verification**:
- [ ] 実際のファイルI/Oでテストが通る
- [ ] 日本語コンテンツが正しく処理される
- [ ] エッジケースをカバー

## Acceptance Criteria

- [ ] 全てのテストが通る (`pnpm test`)
- [ ] 型チェックが通る (`pnpm typecheck`)
- [ ] リントが通る (`pnpm lint`)
- [ ] E2Eテストが通る
- [ ] 仕様書のサンプルYAMLがパースできる
- [ ] 日本語コンテンツが正しく処理される
- [ ] エラーメッセージが具体的で役立つ

## Files Changed

- [ ] `src/core/parser.ts` - 新規作成
- [ ] `src/core/parser.test.ts` - 新規作成
- [ ] `src/core/index.ts` - エクスポート
- [ ] `tests/e2e/parser.test.ts` - 新規作成

## Notes

- content フィールドは `z.record(z.unknown())` として定義し、テンプレート固有のスキーマ検証はTemplate Loaderタスクで実装
- 引用パターン `[@id]` の抽出はReference Managerタスクで実装
