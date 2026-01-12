# Task: Validate References Enhancement

## Purpose

`slide-gen validate` コマンドで引用キーの存在確認を行い、reference-managerライブラリに存在しない引用を検出・警告する。

## Context

- **関連仕様**: [spec/references.md](../references.md) - AI Agent Collaboration Workflow / Validation Integration
- **依存タスク**: [08-reference-manager](./completed/08-reference-manager.md), [12-cli-validate](./completed/12-cli-validate.md)
- **関連ソース**: `src/cli/commands/validate.ts`, `src/references/`

## Background

現在の `slide-gen validate` は引用の数をカウントするのみで、reference-managerライブラリに引用キーが存在するかの検証を行っていない。AI連携ワークフローでは、不足している引用の特定と提案が重要となる。

## TDD Implementation Cycle

各ステップで以下のサイクルを実行:

1. **Red**: 失敗するテストを書く
2. **Green**: テストを通す最小限の実装
3. **Refactor**: `pnpm lint && pnpm typecheck` を実行し、リファクタリング

## Implementation Steps

### Step 1: Reference Validator Module

**Goal**: 引用キーの存在確認を行うバリデータモジュールを作成

**Test file**: `src/references/validator.test.ts`

```typescript
import { describe, it, expect, vi } from 'vitest';
import { ReferenceValidator } from './validator';
import { ReferenceManager } from './manager';
import { CitationExtractor } from './extractor';

describe('ReferenceValidator', () => {
  describe('validateCitations', () => {
    it('should return valid result when all citations exist', async () => {
      const mockManager = {
        getByIds: vi.fn().mockResolvedValue(new Map([
          ['smith2024', { id: 'smith2024', title: 'Test' }],
          ['tanaka2023', { id: 'tanaka2023', title: 'Test 2' }],
        ])),
        isAvailable: vi.fn().mockResolvedValue(true),
      };

      const validator = new ReferenceValidator(mockManager as any);
      const result = await validator.validateCitations(['smith2024', 'tanaka2023']);

      expect(result.valid).toBe(true);
      expect(result.missing).toEqual([]);
      expect(result.found).toEqual(['smith2024', 'tanaka2023']);
    });

    it('should detect missing citations', async () => {
      const mockManager = {
        getByIds: vi.fn().mockResolvedValue(new Map([
          ['smith2024', { id: 'smith2024', title: 'Test' }],
        ])),
        isAvailable: vi.fn().mockResolvedValue(true),
      };

      const validator = new ReferenceValidator(mockManager as any);
      const result = await validator.validateCitations(['smith2024', 'unknown2024']);

      expect(result.valid).toBe(false);
      expect(result.missing).toEqual(['unknown2024']);
      expect(result.found).toEqual(['smith2024']);
    });

    it('should handle reference-manager unavailable', async () => {
      const mockManager = {
        isAvailable: vi.fn().mockResolvedValue(false),
      };

      const validator = new ReferenceValidator(mockManager as any);
      const result = await validator.validateCitations(['smith2024']);

      expect(result.valid).toBe(true); // Validation skipped
      expect(result.skipped).toBe(true);
      expect(result.reason).toContain('reference-manager');
    });
  });
});
```

**Implementation**: `src/references/validator.ts`

```typescript
import { ReferenceManager } from './manager';

export interface ValidationResult {
  valid: boolean;
  found: string[];
  missing: string[];
  skipped?: boolean;
  reason?: string;
}

export class ReferenceValidator {
  constructor(private manager: ReferenceManager) {}

  async validateCitations(citationIds: string[]): Promise<ValidationResult> {
    // Implementation
  }
}
```

**Verification**:
- [ ] テストが失敗することを確認
- [ ] 実装後、テストが通ることを確認
- [ ] `pnpm lint && pnpm typecheck` が通ることを確認

### Step 2: Integrate with Validate Command

**Goal**: `slide-gen validate` コマンドに引用検証を統合

**Test file**: `src/cli/commands/validate.test.ts` (追加テスト)

```typescript
describe('validate command - references', () => {
  it('should validate citations against reference-manager', async () => {
    // Test with mock reference-manager
  });

  it('should report missing citations in output', async () => {
    // Test warning output for missing citations
  });

  it('should include missing citations in LLM format', async () => {
    // Test --format llm output includes missing citations
  });
});
```

**Implementation**: `src/cli/commands/validate.ts`

```typescript
// Add reference validation step
// Step 6: Validate citations (if references enabled)
if (config.references?.enabled) {
  const validator = new ReferenceValidator(manager);
  const citationIds = extractCitationIds(slides);
  const result = await validator.validateCitations(citationIds);

  if (!result.valid) {
    warnings.push(...result.missing.map(id =>
      `Citation not found in library: @${id}`
    ));
  }
}
```

**Verification**:
- [ ] 既存のテストが通る
- [ ] 新しい引用検証テストが通る
- [ ] LLMフォーマットに不足引用が含まれる

### Step 3: Detailed Location Reporting

**Goal**: 不足している引用がどのスライドで使用されているかを報告

**Test file**: `src/references/validator.test.ts` (追加テスト)

```typescript
describe('validateWithLocations', () => {
  it('should report slide locations for missing citations', async () => {
    const validator = new ReferenceValidator(mockManager as any);
    const slides = [
      { content: { items: ['text [@smith2024]', 'more [@unknown2024]'] } },
      { content: { items: ['another [@unknown2024]'] } },
    ];

    const result = await validator.validateWithLocations(slides);

    expect(result.missing).toContainEqual({
      id: 'unknown2024',
      locations: [
        { slide: 1, text: 'more [@unknown2024]' },
        { slide: 2, text: 'another [@unknown2024]' },
      ],
    });
  });
});
```

**Implementation**: `src/references/validator.ts`

```typescript
export interface MissingCitation {
  id: string;
  locations: { slide: number; text: string }[];
}

export interface DetailedValidationResult extends ValidationResult {
  missingDetails: MissingCitation[];
}

export class ReferenceValidator {
  async validateWithLocations(slides: ParsedSlide[]): Promise<DetailedValidationResult>;
}
```

**Verification**:
- [ ] 位置情報が正確に報告される
- [ ] 複数箇所で使用されている場合、全て報告される

### Step 4: Suggestion Generation

**Goal**: 不足引用に対して `ref add` コマンドの提案を生成

**Test file**: `src/references/validator.test.ts` (追加テスト)

```typescript
describe('generateSuggestions', () => {
  it('should suggest ref add command for missing citations', () => {
    const validator = new ReferenceValidator(mockManager as any);
    const suggestions = validator.generateSuggestions(['unknown2024']);

    expect(suggestions).toContain('ref add --pmid <pmid>');
    expect(suggestions).toContain('ref add "<doi>"');
  });
});
```

**Verification**:
- [ ] 提案が適切に生成される
- [ ] CLIおよびLLM出力に提案が含まれる

## E2E Test

**Test file**: `tests/e2e/validate-references.test.ts`

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execSync } from 'child_process';
import { writeFileSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';

describe('E2E: validate references', () => {
  const testDir = join(__dirname, 'fixtures', 'validate-refs-test');

  beforeEach(() => {
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it('should detect missing citations and show warnings', async () => {
    const yamlContent = `
meta:
  title: Test
slides:
  - template: bullet-list
    content:
      title: Test
      items:
        - "Citation [@nonexistent2024]"
`;
    writeFileSync(join(testDir, 'test.yaml'), yamlContent);

    // Run validate command
    const result = execSync(
      `node dist/cli.js validate ${join(testDir, 'test.yaml')}`,
      { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }
    ).toString();

    expect(result).toContain('nonexistent2024');
    expect(result).toContain('not found');
  });

  it('should include missing citations in LLM format', async () => {
    // Similar test with --format llm
  });
});
```

**Verification**:
- [ ] 実際のCLI実行でテストが通る
- [ ] reference-manager未インストール時も適切に動作
- [ ] エラーメッセージがわかりやすい

## Acceptance Criteria

- [ ] 全てのテストが通る (`pnpm test`)
- [ ] 型チェックが通る (`pnpm typecheck`)
- [ ] リントが通る (`pnpm lint`)
- [ ] E2Eテストが通る
- [ ] reference-manager未インストール時はスキップして続行
- [ ] 不足引用のスライド位置が報告される
- [ ] LLMフォーマットに不足引用情報が含まれる
- [ ] `ref add` コマンドの提案が表示される

## Files Changed

- [ ] `src/references/validator.ts` - 新規作成
- [ ] `src/references/validator.test.ts` - 新規作成
- [ ] `src/references/index.ts` - エクスポート追加
- [ ] `src/cli/commands/validate.ts` - 引用検証統合
- [ ] `src/cli/commands/validate.test.ts` - テスト追加
- [ ] `tests/e2e/validate-references.test.ts` - 新規作成

## Notes

- reference-managerが利用できない場合は警告を出してスキップ（エラーにしない）
- パフォーマンス: 全引用を一括で `getByIds` で取得
- 既存の `referencesCount` 統計は維持
