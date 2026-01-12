# Task: Bibliography Auto-Generation

## Purpose

`bibliography` テンプレートで `autoGenerate: true` を指定した場合、プレゼンテーション内の全引用から参考文献リストを自動生成する。

## Context

- **関連仕様**: [spec/references.md](../references.md) - 参考文献スライド
- **依存タスク**: [08-reference-manager](./completed/08-reference-manager.md), [10-pipeline](./completed/10-pipeline.md), [20-special-templates](./completed/20-special-templates.md)
- **関連ソース**: `src/core/pipeline.ts`, `src/references/formatter.ts`, `templates/special/bibliography.yaml`

## Background

現在の `bibliography` テンプレートは手動で `references` 配列を指定する必要がある。AI連携ワークフローでは、プレゼンテーション全体から引用を自動収集し、参考文献リストを自動生成する機能が必要。

## TDD Implementation Cycle

各ステップで以下のサイクルを実行:

1. **Red**: 失敗するテストを書く
2. **Green**: テストを通す最小限の実装
3. **Refactor**: `pnpm lint && pnpm typecheck` を実行し、リファクタリング

## Implementation Steps

### Step 1: Bibliography Generator Module

**Goal**: 引用IDリストから参考文献リストを生成するモジュール

**Test file**: `src/references/bibliography.test.ts`

```typescript
import { describe, it, expect, vi } from 'vitest';
import { BibliographyGenerator } from './bibliography';

describe('BibliographyGenerator', () => {
  const mockManager = {
    getByIds: vi.fn().mockResolvedValue(new Map([
      ['smith2024', {
        id: 'smith2024',
        author: [{ family: 'Smith', given: 'John' }],
        issued: { 'date-parts': [[2024]] },
        title: 'Test Article',
        'container-title': 'Test Journal',
        PMID: '12345678',
      }],
      ['tanaka2023', {
        id: 'tanaka2023',
        author: [{ family: '田中', given: '太郎' }],
        issued: { 'date-parts': [[2023]] },
        title: '日本語論文',
        'container-title': '学術誌',
        DOI: '10.1234/example',
      }],
    ])),
  };

  describe('generate', () => {
    it('should generate bibliography entries from citation IDs', async () => {
      const generator = new BibliographyGenerator(mockManager as any);
      const result = await generator.generate(['smith2024', 'tanaka2023']);

      expect(result.entries).toHaveLength(2);
      expect(result.entries[0]).toContain('Smith');
      expect(result.entries[0]).toContain('2024');
      expect(result.entries[0]).toContain('PMID: 12345678');
    });

    it('should sort by citation-order by default', async () => {
      const generator = new BibliographyGenerator(mockManager as any);
      const result = await generator.generate(['tanaka2023', 'smith2024']);

      expect(result.entries[0]).toContain('田中');
      expect(result.entries[1]).toContain('Smith');
    });

    it('should sort by author when specified', async () => {
      const generator = new BibliographyGenerator(mockManager as any);
      const result = await generator.generate(
        ['tanaka2023', 'smith2024'],
        { sort: 'author' }
      );

      expect(result.entries[0]).toContain('Smith');
      expect(result.entries[1]).toContain('田中');
    });

    it('should sort by year when specified', async () => {
      const generator = new BibliographyGenerator(mockManager as any);
      const result = await generator.generate(
        ['smith2024', 'tanaka2023'],
        { sort: 'year' }
      );

      expect(result.entries[0]).toContain('2023');
      expect(result.entries[1]).toContain('2024');
    });

    it('should handle missing references gracefully', async () => {
      const mockManagerWithMissing = {
        getByIds: vi.fn().mockResolvedValue(new Map([
          ['smith2024', { id: 'smith2024', title: 'Test' }],
        ])),
      };

      const generator = new BibliographyGenerator(mockManagerWithMissing as any);
      const result = await generator.generate(['smith2024', 'missing2024']);

      expect(result.entries).toHaveLength(1);
      expect(result.missing).toEqual(['missing2024']);
    });
  });
});
```

**Implementation**: `src/references/bibliography.ts`

```typescript
import { ReferenceManager, CSLItem } from './manager';
import { CitationFormatter } from './formatter';

export interface BibliographyOptions {
  sort?: 'citation-order' | 'author' | 'year';
  style?: 'full' | 'compact';
}

export interface BibliographyResult {
  entries: string[];
  missing: string[];
  items: CSLItem[];
}

export class BibliographyGenerator {
  constructor(
    private manager: ReferenceManager,
    private formatter?: CitationFormatter
  ) {}

  async generate(
    citationIds: string[],
    options?: BibliographyOptions
  ): Promise<BibliographyResult> {
    // Implementation
  }
}
```

**Verification**:
- [ ] テストが失敗することを確認
- [ ] 実装後、テストが通ることを確認
- [ ] `pnpm lint && pnpm typecheck` が通ることを確認

### Step 2: Update Bibliography Template Schema

**Goal**: `autoGenerate` プロパティをサポート

**Test file**: `src/templates/schemas.test.ts` (追加テスト)

```typescript
describe('bibliography template schema', () => {
  it('should accept autoGenerate: true', () => {
    const content = {
      title: 'References',
      autoGenerate: true,
      sort: 'author',
    };

    const result = bibliographySchema.safeParse(content);
    expect(result.success).toBe(true);
  });

  it('should accept manual references array', () => {
    const content = {
      title: 'References',
      references: [
        { authors: 'Smith, J.', year: 2024, title: 'Test' },
      ],
    };

    const result = bibliographySchema.safeParse(content);
    expect(result.success).toBe(true);
  });
});
```

**Implementation**: Update `templates/special/bibliography.yaml` and schema

```yaml
# templates/special/bibliography.yaml
schema:
  content:
    type: object
    properties:
      title:
        type: string
        default: "References"
      autoGenerate:
        type: boolean
        default: false
        description: "Auto-generate from all citations in presentation"
      sort:
        type: string
        enum: [citation-order, author, year]
        default: citation-order
      references:
        type: array
        description: "Manual reference entries (ignored if autoGenerate is true)"
```

**Verification**:
- [ ] スキーマが両方のモードを受け入れる
- [ ] `autoGenerate` と `references` の両方が指定された場合、`autoGenerate` が優先

### Step 3: Pipeline Integration

**Goal**: Pipelineで `autoGenerate: true` の bibliography を自動処理

**Test file**: `src/core/pipeline.test.ts` (追加テスト)

```typescript
describe('Pipeline - bibliography auto-generation', () => {
  it('should auto-populate bibliography when autoGenerate is true', async () => {
    const presentation = {
      meta: { title: 'Test' },
      slides: [
        {
          template: 'bullet-list',
          content: {
            title: 'Content',
            items: ['Reference [@smith2024]', 'Another [@tanaka2023]'],
          },
        },
        {
          template: 'bibliography',
          content: {
            title: 'References',
            autoGenerate: true,
            sort: 'author',
          },
        },
      ],
    };

    const result = await pipeline.process(presentation);

    // Bibliography slide should contain auto-generated entries
    const bibSlide = result.slides[1];
    expect(bibSlide.content.entries).toContain('Smith');
    expect(bibSlide.content.entries).toContain('田中');
  });

  it('should preserve manual references when autoGenerate is false', async () => {
    const presentation = {
      meta: { title: 'Test' },
      slides: [
        {
          template: 'bibliography',
          content: {
            title: 'References',
            references: [{ authors: 'Manual, A.', year: 2024, title: 'Manual Entry' }],
          },
        },
      ],
    };

    const result = await pipeline.process(presentation);
    expect(result.slides[0].content.references).toHaveLength(1);
  });
});
```

**Implementation**: `src/core/pipeline.ts`

```typescript
// Add bibliography auto-generation step after citation collection
private async processBibliography(
  slides: TransformedSlide[],
  citations: string[]
): Promise<TransformedSlide[]> {
  return slides.map(slide => {
    if (slide.template === 'bibliography' && slide.content.autoGenerate) {
      const generator = new BibliographyGenerator(this.referenceManager);
      const result = await generator.generate(citations, {
        sort: slide.content.sort,
      });
      return {
        ...slide,
        content: {
          ...slide.content,
          entries: result.entries,
          _autoGenerated: true,
        },
      };
    }
    return slide;
  });
}
```

**Verification**:
- [ ] `autoGenerate: true` で参考文献が自動生成される
- [ ] ソート順が反映される
- [ ] 手動指定モードが維持される

### Step 4: Template Rendering Update

**Goal**: 自動生成されたエントリをレンダリング

**Test file**: `tests/e2e/bibliography.test.ts`

```typescript
describe('E2E: Bibliography rendering', () => {
  it('should render auto-generated bibliography', async () => {
    const yaml = `
meta:
  title: Test
slides:
  - template: bullet-list
    content:
      title: Content
      items:
        - "See [@smith2024]"
  - template: bibliography
    content:
      title: References
      autoGenerate: true
`;

    const result = await convert(yaml);

    expect(result).toContain('# References');
    // Should contain formatted bibliography entries
  });
});
```

**Verification**:
- [ ] Marp Markdownに参考文献が正しく出力される
- [ ] 番号付けが正しい
- [ ] スタイリングが適用される

## E2E Test

**Test file**: `tests/e2e/bibliography-auto.test.ts`

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execSync } from 'child_process';
import { writeFileSync, mkdirSync, rmSync, readFileSync } from 'fs';
import { join } from 'path';

describe('E2E: Bibliography auto-generation', () => {
  const testDir = join(__dirname, 'fixtures', 'bibliography-test');

  beforeEach(() => {
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it('should auto-generate bibliography from citations', async () => {
    const yamlContent = `
meta:
  title: Test Presentation
slides:
  - template: bullet-list
    content:
      title: Introduction
      items:
        - "According to [@smith2024], this is important"
        - "See also [@tanaka2023]"
  - template: bibliography
    content:
      title: References
      autoGenerate: true
      sort: author
`;
    writeFileSync(join(testDir, 'test.yaml'), yamlContent);

    // Note: This test requires reference-manager to be available
    // or should mock the reference-manager responses
    const result = execSync(
      `node dist/cli.js convert ${join(testDir, 'test.yaml')} -o ${join(testDir, 'output.md')}`,
      { encoding: 'utf-8' }
    );

    const output = readFileSync(join(testDir, 'output.md'), 'utf-8');
    expect(output).toContain('# References');
  });
});
```

**Verification**:
- [ ] 実際のファイルI/Oでテストが通る
- [ ] reference-manager連携が動作する
- [ ] 出力Markdownが正しい

## Acceptance Criteria

- [ ] 全てのテストが通る (`pnpm test`)
- [ ] 型チェックが通る (`pnpm typecheck`)
- [ ] リントが通る (`pnpm lint`)
- [ ] E2Eテストが通る
- [ ] `autoGenerate: true` で参考文献が自動生成される
- [ ] 3種類のソート順が動作する
- [ ] 手動指定モードが引き続き動作する
- [ ] 存在しない引用は警告を出してスキップ

## Files Changed

- [ ] `src/references/bibliography.ts` - 新規作成
- [ ] `src/references/bibliography.test.ts` - 新規作成
- [ ] `src/references/index.ts` - エクスポート追加
- [ ] `src/core/pipeline.ts` - bibliography処理追加
- [ ] `src/core/pipeline.test.ts` - テスト追加
- [ ] `templates/special/bibliography.yaml` - スキーマ更新
- [ ] `tests/e2e/bibliography-auto.test.ts` - 新規作成

## Notes

- reference-managerが利用できない場合は `autoGenerate` を無視して空のリストを生成
- パフォーマンス: 引用収集は既存の Pipeline 処理を再利用
- 互換性: 手動 `references` 配列との後方互換性を維持
