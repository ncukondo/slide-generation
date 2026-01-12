# Task: Sources References Tracking

## Purpose

`sources/sources.yaml` に参照追跡セクションを追加し、AI エージェントが引用の状態（pending/added/existing）を管理できるようにする。

## Context

- **関連仕様**: [spec/references.md](../references.md) - Tracking Reference Needs in sources.yaml
- **依存タスク**: [27-source-management](./completed/27-source-management.md), [30-validate-references](./30-validate-references.md)
- **関連ソース**: `src/sources/`

## Background

AI Agent Collaboration Workflow では、引用の必要性分析後、不足している引用を追跡する必要がある。sources.yaml に references セクションを追加し、各引用の状態を管理する。

## TDD Implementation Cycle

各ステップで以下のサイクルを実行:

1. **Red**: 失敗するテストを書く
2. **Green**: テストを通す最小限の実装
3. **Refactor**: `pnpm lint && pnpm typecheck` を実行し、リファクタリング

## Implementation Steps

### Step 1: References Schema Extension

**Goal**: sources.yaml スキーマに references セクションを追加

**Test file**: `src/sources/schema.test.ts` (追加テスト)

```typescript
import { describe, it, expect } from 'vitest';
import { sourcesSchema, ReferenceItem, ReferencesSection } from './schema';

describe('sources.yaml references schema', () => {
  it('should accept references section', () => {
    const sources = {
      project: {
        name: 'Test',
        created: '2025-01-01',
      },
      references: {
        status: {
          required: 3,
          found: 2,
          pending: 1,
        },
        items: [
          {
            id: 'smith2024',
            status: 'added',
            slide: 3,
            purpose: 'Support accuracy claim',
            added_date: '2025-01-10',
          },
          {
            id: 'pending-study',
            status: 'pending',
            slide: 5,
            purpose: 'Cost reduction evidence',
            requirement: 'required',
            suggested_search: ['cost reduction AI healthcare'],
          },
        ],
      },
    };

    const result = sourcesSchema.safeParse(sources);
    expect(result.success).toBe(true);
  });

  it('should validate reference item status', () => {
    const item: ReferenceItem = {
      id: 'test2024',
      status: 'pending',
      slide: 1,
      purpose: 'Test',
    };

    expect(['pending', 'added', 'existing']).toContain(item.status);
  });

  it('should require slide and purpose for each item', () => {
    const invalidItem = {
      id: 'test2024',
      status: 'pending',
      // missing slide and purpose
    };

    const schema = referenceItemSchema;
    const result = schema.safeParse(invalidItem);
    expect(result.success).toBe(false);
  });
});
```

**Implementation**: `src/sources/schema.ts`

```typescript
import { z } from 'zod';

export const referenceItemSchema = z.object({
  id: z.string(),
  status: z.enum(['pending', 'added', 'existing']),
  slide: z.number(),
  purpose: z.string(),
  requirement: z.enum(['required', 'recommended']).optional(),
  added_date: z.string().optional(),
  suggested_search: z.array(z.string()).optional(),
  notes: z.string().optional(),
});

export const referencesStatusSchema = z.object({
  required: z.number().default(0),
  found: z.number().default(0),
  pending: z.number().default(0),
});

export const referencesSectionSchema = z.object({
  status: referencesStatusSchema.optional(),
  items: z.array(referenceItemSchema).default([]),
});

export type ReferenceItem = z.infer<typeof referenceItemSchema>;
export type ReferencesSection = z.infer<typeof referencesSectionSchema>;

// Update main sources schema
export const sourcesSchema = z.object({
  project: projectSchema,
  context: contextSchema.optional(),
  sources: z.array(sourceItemSchema).optional(),
  references: referencesSectionSchema.optional(),  // NEW
  missing: z.array(missingItemSchema).optional(),
});
```

**Verification**:
- [ ] スキーマが正しく定義される
- [ ] バリデーションが動作する
- [ ] 型が正しくエクスポートされる

### Step 2: References Manager for Sources

**Goal**: sources.yaml の references セクションを操作するマネージャー

**Test file**: `src/sources/references-tracker.test.ts`

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { ReferencesTracker } from './references-tracker';

describe('ReferencesTracker', () => {
  let tracker: ReferencesTracker;

  beforeEach(() => {
    tracker = new ReferencesTracker();
  });

  describe('addPending', () => {
    it('should add a pending reference', () => {
      tracker.addPending({
        id: 'needed2024',
        slide: 3,
        purpose: 'Support claim',
        requirement: 'required',
        suggested_search: ['AI accuracy meta-analysis'],
      });

      const items = tracker.getItems();
      expect(items).toHaveLength(1);
      expect(items[0].status).toBe('pending');
      expect(items[0].id).toBe('needed2024');
    });
  });

  describe('markAdded', () => {
    it('should update pending to added', () => {
      tracker.addPending({
        id: 'needed2024',
        slide: 3,
        purpose: 'Support claim',
      });

      tracker.markAdded('needed2024', 'smith2024');

      const items = tracker.getItems();
      expect(items[0].status).toBe('added');
      expect(items[0].id).toBe('smith2024');
      expect(items[0].added_date).toBeDefined();
    });
  });

  describe('markExisting', () => {
    it('should mark reference as existing in library', () => {
      tracker.markExisting({
        id: 'smith2024',
        slide: 5,
        purpose: 'Background reference',
      });

      const items = tracker.getItems();
      expect(items[0].status).toBe('existing');
    });
  });

  describe('getStatus', () => {
    it('should calculate status summary', () => {
      tracker.addPending({ id: 'a', slide: 1, purpose: 'test', requirement: 'required' });
      tracker.addPending({ id: 'b', slide: 2, purpose: 'test', requirement: 'required' });
      tracker.markExisting({ id: 'c', slide: 3, purpose: 'test' });

      const status = tracker.getStatus();
      expect(status.required).toBe(2);
      expect(status.pending).toBe(2);
      expect(status.found).toBe(1);
    });
  });

  describe('getPending', () => {
    it('should return only pending items', () => {
      tracker.addPending({ id: 'a', slide: 1, purpose: 'test' });
      tracker.markExisting({ id: 'b', slide: 2, purpose: 'test' });

      const pending = tracker.getPending();
      expect(pending).toHaveLength(1);
      expect(pending[0].id).toBe('a');
    });
  });

  describe('toYaml', () => {
    it('should serialize to YAML-compatible object', () => {
      tracker.addPending({ id: 'a', slide: 1, purpose: 'test' });

      const yaml = tracker.toYaml();
      expect(yaml.status).toBeDefined();
      expect(yaml.items).toHaveLength(1);
    });
  });
});
```

**Implementation**: `src/sources/references-tracker.ts`

```typescript
import { ReferenceItem, ReferencesSection } from './schema';

export interface PendingReference {
  id: string;
  slide: number;
  purpose: string;
  requirement?: 'required' | 'recommended';
  suggested_search?: string[];
  notes?: string;
}

export interface ExistingReference {
  id: string;
  slide: number;
  purpose: string;
}

export class ReferencesTracker {
  private items: ReferenceItem[] = [];

  constructor(initial?: ReferencesSection) {
    if (initial?.items) {
      this.items = [...initial.items];
    }
  }

  addPending(ref: PendingReference): void {
    this.items.push({
      ...ref,
      status: 'pending',
    });
  }

  markAdded(pendingId: string, actualId: string): void {
    const item = this.items.find(i => i.id === pendingId);
    if (item) {
      item.id = actualId;
      item.status = 'added';
      item.added_date = new Date().toISOString().split('T')[0];
    }
  }

  markExisting(ref: ExistingReference): void {
    this.items.push({
      ...ref,
      status: 'existing',
    });
  }

  getItems(): ReferenceItem[] {
    return [...this.items];
  }

  getPending(): ReferenceItem[] {
    return this.items.filter(i => i.status === 'pending');
  }

  getStatus(): { required: number; found: number; pending: number } {
    const required = this.items.filter(i => i.requirement === 'required').length;
    const pending = this.items.filter(i => i.status === 'pending').length;
    const found = this.items.filter(i => i.status !== 'pending').length;
    return { required, found, pending };
  }

  toYaml(): ReferencesSection {
    return {
      status: this.getStatus(),
      items: this.items,
    };
  }
}
```

**Verification**:
- [ ] 全てのメソッドが動作する
- [ ] 状態遷移が正しい
- [ ] YAML出力が正しい

### Step 3: Integration with Sources Manager

**Goal**: 既存の SourcesManager に references 操作を統合

**Test file**: `src/sources/manager.test.ts` (追加テスト)

```typescript
describe('SourcesManager - references', () => {
  it('should load references from sources.yaml', async () => {
    const yaml = `
project:
  name: Test
  created: "2025-01-01"
references:
  items:
    - id: smith2024
      status: existing
      slide: 3
      purpose: Test
`;
    writeFileSync(join(testDir, 'sources/sources.yaml'), yaml);

    const manager = new SourcesManager(testDir);
    await manager.load();

    const refs = manager.getReferences();
    expect(refs.items).toHaveLength(1);
  });

  it('should save references to sources.yaml', async () => {
    const manager = new SourcesManager(testDir);
    await manager.load();

    manager.addPendingReference({
      id: 'needed2024',
      slide: 5,
      purpose: 'Support claim',
    });

    await manager.save();

    const content = readFileSync(
      join(testDir, 'sources/sources.yaml'),
      'utf-8'
    );
    expect(content).toContain('needed2024');
    expect(content).toContain('pending');
  });
});
```

**Implementation**: `src/sources/manager.ts`

```typescript
import { ReferencesTracker } from './references-tracker';

export class SourcesManager {
  private referencesTracker: ReferencesTracker;

  async load(): Promise<void> {
    // ... existing load logic
    this.referencesTracker = new ReferencesTracker(data.references);
  }

  getReferences(): ReferencesSection {
    return this.referencesTracker.toYaml();
  }

  addPendingReference(ref: PendingReference): void {
    this.referencesTracker.addPending(ref);
  }

  markReferenceAdded(pendingId: string, actualId: string): void {
    this.referencesTracker.markAdded(pendingId, actualId);
  }

  markReferenceExisting(ref: ExistingReference): void {
    this.referencesTracker.markExisting(ref);
  }

  async save(): Promise<void> {
    // Include references in saved data
    const data = {
      ...this.data,
      references: this.referencesTracker.toYaml(),
    };
    // ... save logic
  }
}
```

**Verification**:
- [ ] 既存の SourcesManager と統合される
- [ ] load/save が正しく動作する

### Step 4: CLI Sources Status Enhancement

**Goal**: `slide-gen sources status` で references 状態を表示

**Test file**: `src/cli/commands/sources.test.ts` (追加テスト)

```typescript
describe('sources status - references', () => {
  it('should display references status', async () => {
    // Setup sources.yaml with references
    const result = await runSourcesStatus(testDir);

    expect(result).toContain('References');
    expect(result).toContain('pending');
  });
});
```

**Implementation**: `src/cli/commands/sources.ts`

```typescript
// Add to status output
if (sources.references) {
  const refs = sources.references;
  console.log('\nReferences:');
  console.log(`  Required: ${refs.status?.required ?? 0}`);
  console.log(`  Found: ${refs.status?.found ?? 0}`);
  console.log(`  Pending: ${refs.status?.pending ?? 0}`);

  if (refs.items.some(i => i.status === 'pending')) {
    console.log('\n  ⚠ Pending references:');
    refs.items
      .filter(i => i.status === 'pending')
      .forEach(i => {
        console.log(`    - ${i.id} (Slide ${i.slide}): ${i.purpose}`);
      });
  }
}
```

**Verification**:
- [ ] ステータス表示に references が含まれる
- [ ] pending がある場合に警告表示

## E2E Test

**Test file**: `tests/e2e/sources-references.test.ts`

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execSync } from 'child_process';
import { writeFileSync, readFileSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';

describe('E2E: sources references tracking', () => {
  const testDir = join(__dirname, 'fixtures', 'sources-refs-test');

  beforeEach(() => {
    rmSync(testDir, { recursive: true, force: true });
    mkdirSync(join(testDir, 'sources'), { recursive: true });
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it('should track references in sources.yaml', async () => {
    // Create initial sources.yaml
    const initialYaml = `
project:
  name: Test Presentation
  created: "2025-01-10"
`;
    writeFileSync(join(testDir, 'sources/sources.yaml'), initialYaml);

    // This would be done by AI agent, but we simulate it
    const updatedYaml = `
project:
  name: Test Presentation
  created: "2025-01-10"
references:
  status:
    required: 2
    found: 1
    pending: 1
  items:
    - id: smith2024
      status: existing
      slide: 3
      purpose: "AI accuracy claim"
    - id: pending-cost-study
      status: pending
      slide: 5
      purpose: "Cost reduction evidence"
      requirement: required
      suggested_search:
        - "AI healthcare cost reduction"
`;
    writeFileSync(join(testDir, 'sources/sources.yaml'), updatedYaml);

    // Run sources status
    const result = execSync(
      `node dist/cli.js sources status`,
      { cwd: testDir, encoding: 'utf-8' }
    );

    expect(result).toContain('References');
    expect(result).toContain('Pending: 1');
  });

  it('should display pending references in status', async () => {
    const yaml = `
project:
  name: Test
  created: "2025-01-10"
references:
  items:
    - id: needed-study
      status: pending
      slide: 3
      purpose: "Support main claim"
`;
    writeFileSync(join(testDir, 'sources/sources.yaml'), yaml);

    const result = execSync(
      `node dist/cli.js sources status`,
      { cwd: testDir, encoding: 'utf-8' }
    );

    expect(result).toContain('needed-study');
    expect(result).toContain('Slide 3');
  });
});
```

**Verification**:
- [ ] 実際のCLI実行でテストが通る
- [ ] sources.yaml が正しく読み書きされる

## Acceptance Criteria

- [ ] 全てのテストが通る (`pnpm test`)
- [ ] 型チェックが通る (`pnpm typecheck`)
- [ ] リントが通る (`pnpm lint`)
- [ ] E2Eテストが通る
- [ ] sources.yaml に references セクションが追加できる
- [ ] pending/added/existing の状態管理ができる
- [ ] `slide-gen sources status` で references 状態が表示される
- [ ] スキーマバリデーションが動作する

## Files Changed

- [ ] `src/sources/schema.ts` - references スキーマ追加
- [ ] `src/sources/schema.test.ts` - テスト追加
- [ ] `src/sources/references-tracker.ts` - 新規作成
- [ ] `src/sources/references-tracker.test.ts` - 新規作成
- [ ] `src/sources/manager.ts` - references 統合
- [ ] `src/sources/manager.test.ts` - テスト追加
- [ ] `src/sources/index.ts` - エクスポート追加
- [ ] `src/cli/commands/sources.ts` - ステータス表示追加
- [ ] `tests/e2e/sources-references.test.ts` - 新規作成

## Notes

- AI エージェントは直接 sources.yaml を編集することで references を管理
- slide-gen CLI は読み取りと表示のみ（書き込みは AI が担当）
- 将来的に `slide-gen references add-pending` などのコマンド追加も検討可能
