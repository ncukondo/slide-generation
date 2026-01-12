# Task: AI Workflow Templates Update

## Purpose

`slide-gen init`で生成されるAI Agent向けテンプレートファイルを更新し、AI-GUIDE.mdで定義した新しいワークフロー（初期質問によるパターン選択、再起動推奨）と整合させる。

## Context

- **関連仕様**: [spec/ai-integration.md](../ai-integration.md), [spec/sources.md](../sources.md)
- **依存タスク**: [22-ai-integration.md](./completed/22-ai-integration.md), [27-source-management.md](./completed/27-source-management.md)
- **関連ソース**: `src/cli/templates/ai/`
- **関連ドキュメント**: `AI-GUIDE.md`

## Background

AI-GUIDE.md を以下のように更新した：

1. **初期質問の追加**: AI Agentは最初にユーザーの資料状況（Pattern A/B/C）を確認する
2. **再起動推奨**: `slide-gen init`後、プロジェクトディレクトリでAI Agentを再起動することを推奨
3. **詳細ワークフロー**: Pattern A/B/Cの詳細なステップをAI-GUIDE.mdに記載

しかし、`slide-gen init`で生成される以下のファイルがこの新しいフローと整合していない：

- `.skills/slide-assistant/SKILL.md`
- `.skills/slide-assistant/references/workflows.md`

## TDD Implementation Cycle

各ステップで以下のサイクルを実行:

1. **Red**: 失敗するテストを書く
2. **Green**: テストを通す最小限の実装
3. **Refactor**: `pnpm lint && pnpm typecheck` を実行し、リファクタリング

## Implementation Steps

### Step 1: Update skill-md.ts

**Goal**: SKILL.mdテンプレートに初期質問とPattern A/B/Cワークフローを追加

**Test file**: `src/cli/templates/ai/skill-md.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { generateSkillMd } from './skill-md';

describe('generateSkillMd', () => {
  it('should include first question about materials', () => {
    const content = generateSkillMd();
    expect(content).toContain('First Question');
    expect(content).toContain('What materials do you have?');
  });

  it('should include Pattern A workflow', () => {
    const content = generateSkillMd();
    expect(content).toContain('Pattern A');
    expect(content).toContain('Explore Mode');
  });

  it('should include Pattern B workflow', () => {
    const content = generateSkillMd();
    expect(content).toContain('Pattern B');
    expect(content).toContain('Supplement Mode');
  });

  it('should include Pattern C workflow', () => {
    const content = generateSkillMd();
    expect(content).toContain('Pattern C');
    expect(content).toContain('Interview Mode');
  });

  it('should reference workflows.md for details', () => {
    const content = generateSkillMd();
    expect(content).toContain('references/workflows.md');
  });
});
```

**Implementation**: `src/cli/templates/ai/skill-md.ts`

Update the `generateSkillMd()` function to include:
1. First Question section with A/B/C pattern selection
2. Brief description of each pattern
3. Reference to workflows.md for detailed steps

**Verification**:
- [ ] テストが失敗することを確認
- [ ] 実装後、テストが通ることを確認
- [ ] `pnpm lint && pnpm typecheck` が通ることを確認

### Step 2: Update workflows-ref.ts

**Goal**: workflows.mdテンプレートに初期質問（エントリーポイント）を追加

**Test file**: `src/cli/templates/ai/references/workflows-ref.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { generateWorkflowsRef } from './workflows-ref';

describe('generateWorkflowsRef', () => {
  it('should include entry point question', () => {
    const content = generateWorkflowsRef();
    expect(content).toContain('Entry Point');
    expect(content).toContain('What materials do you have?');
  });

  it('should include detailed Pattern A steps', () => {
    const content = generateWorkflowsRef();
    expect(content).toContain('Pattern A');
    expect(content).toContain('Scan directory structure');
    expect(content).toContain('Classify files');
  });

  it('should include detailed Pattern B steps', () => {
    const content = generateWorkflowsRef();
    expect(content).toContain('Pattern B');
    expect(content).toContain('Identify what information is present');
    expect(content).toContain('Ask targeted questions');
  });

  it('should include detailed Pattern C steps', () => {
    const content = generateWorkflowsRef();
    expect(content).toContain('Pattern C');
    expect(content).toContain('Ask basic questions');
    expect(content).toContain('Propose slide structure');
  });
});
```

**Implementation**: `src/cli/templates/ai/references/workflows-ref.ts`

Update the `generateWorkflowsRef()` function to include:
1. Entry Point section with the initial question
2. More detailed steps for each pattern (aligned with AI-GUIDE.md)

**Verification**:
- [ ] テストが失敗することを確認
- [ ] 実装後、テストが通ることを確認
- [ ] `pnpm lint && pnpm typecheck` が通ることを確認

### Step 3: Verify Generated Files in Init Command

**Goal**: `slide-gen init`で生成されるファイルが正しく更新されることを確認

**Test file**: `tests/e2e/cli-init-ai-templates.test.ts`

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execSync } from 'node:child_process';
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

describe('E2E: Init AI Templates', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'slide-gen-test-'));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('should generate SKILL.md with first question', () => {
    const projectDir = join(tempDir, 'test-project');
    execSync(`node dist/cli/index.js init ${projectDir} --skip-marp-install`, {
      encoding: 'utf-8',
    });

    const skillMd = readFileSync(
      join(projectDir, '.skills', 'slide-assistant', 'SKILL.md'),
      'utf-8'
    );

    expect(skillMd).toContain('First Question');
    expect(skillMd).toContain('What materials do you have?');
  });

  it('should generate workflows.md with entry point', () => {
    const projectDir = join(tempDir, 'test-project');
    execSync(`node dist/cli/index.js init ${projectDir} --skip-marp-install`, {
      encoding: 'utf-8',
    });

    const workflowsMd = readFileSync(
      join(projectDir, '.skills', 'slide-assistant', 'references', 'workflows.md'),
      'utf-8'
    );

    expect(workflowsMd).toContain('Entry Point');
    expect(workflowsMd).toContain('Pattern A');
    expect(workflowsMd).toContain('Pattern B');
    expect(workflowsMd).toContain('Pattern C');
  });
});
```

**Verification**:
- [ ] E2Eテストが通る
- [ ] 実際に `slide-gen init` を実行して生成ファイルを確認

## Acceptance Criteria

- [ ] 全てのテストが通る (`pnpm test`)
- [ ] 型チェックが通る (`pnpm typecheck`)
- [ ] リントが通る (`pnpm lint`)
- [ ] E2Eテストが通る
- [ ] `slide-gen init`で生成されるSKILL.mdに初期質問が含まれる
- [ ] `slide-gen init`で生成されるworkflows.mdにエントリーポイントが含まれる
- [ ] 生成されるファイルの内容がAI-GUIDE.mdと整合している

## Files Changed

- [ ] `src/cli/templates/ai/skill-md.ts` - 初期質問とパターンワークフロー追加
- [ ] `src/cli/templates/ai/skill-md.test.ts` - テスト追加
- [ ] `src/cli/templates/ai/references/workflows-ref.ts` - エントリーポイント追加
- [ ] `src/cli/templates/ai/references/workflows-ref.test.ts` - テスト追加
- [ ] `tests/e2e/cli-init-ai-templates.test.ts` - E2Eテスト追加

## Notes

### AI-GUIDE.md との整合性

AI-GUIDE.md（リポジトリルート）は以下を含む：
- 初期質問（Pattern A/B/C選択）
- 各パターンの詳細ステップ
- 再起動推奨

SKILL.md（init生成）は以下を含むべき：
- 初期質問への言及（プロジェクトディレクトリで再起動後に使われるため、AI-GUIDE.mdで既に質問済みの想定）
- 各パターンの概要
- workflows.mdへの参照

workflows.md（init生成）は以下を含むべき：
- エントリーポイント（初期質問）
- 各パターンの詳細ステップ

### 設計上の考慮

1. **重複の最小化**: AI-GUIDE.mdとSKILL.md/workflows.mdの内容が重複しすぎないよう、役割を分担
   - AI-GUIDE.md: リポジトリURLから始める場合のガイド（init前）
   - SKILL.md: プロジェクトディレクトリで作業する場合のガイド（init後）

2. **Progressive Disclosure**: SKILL.mdは簡潔に、詳細はworkflows.mdに委譲
