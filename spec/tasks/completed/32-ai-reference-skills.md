# Task: AI Reference Skills & Commands

## Purpose

AI エージェントが学術文献を効果的に扱うためのスキル定義とコマンドを作成する。シナリオ分析、引用必要性の判断、文献収集のワークフローを定義。

## Context

- **関連仕様**: [spec/references.md](../references.md) - AI Agent Collaboration Workflow
- **依存タスク**: [22-ai-integration](./completed/22-ai-integration.md), [30-validate-references](./30-validate-references.md)
- **関連ソース**: `src/cli/templates/ai/`

## Background

spec/references.md に AI Agent Collaboration Workflow を定義した。これを実際に AI エージェントが使用できるよう、スキル定義ファイルとコマンドテンプレートを作成する必要がある。

## Implementation Steps

### Step 1: Reference Skill Definition

**Goal**: `.skills/slide-assistant/references/` にリファレンス関連スキルを定義

**File**: `src/cli/templates/ai/references/skill-references.ts`

```typescript
export function generateReferenceSkillMd(): string {
  return `## Reference Management Skill

### When to Invoke

Use this skill when:
- Creating academic or research presentations
- User mentions needing citations or references
- Scenario contains statistical claims or research findings
- User provides literature (URL, PDF, DOI, PMID)

### Citation Requirement Analysis

Analyze scenario/script for statements requiring citations:

| Statement Type | Requirement | Example |
|---------------|-------------|---------|
| Statistical claims | Required | "Accuracy exceeds 90%" |
| Research findings | Required | "Studies show that..." |
| Methodology references | Required | "Using the XYZ method" |
| Comparative claims | Recommended | "Better than conventional" |
| Historical facts | Recommended | "First introduced in 2020" |
| General knowledge | Not required | "AI is widely used" |

### Workflow

#### Phase 1: Analyze Content
1. Read scenario/script thoroughly
2. Identify statements requiring citations
3. Categorize as Required or Recommended
4. Note the slide number and exact statement

#### Phase 2: Search Existing Library
\`\`\`bash
# List all references
ref list --format json

# Search by keyword
ref search "diagnostic accuracy" --format json
\`\`\`

#### Phase 3: Match or Request

**If found in library:**
- Confirm relevance with user
- Insert \`[@id]\` citation in YAML

**If not found:**
- Present clear request to user
- Specify what type of source is needed
- Provide suggested search terms

#### Phase 4: Add New References

From user-provided input:

\`\`\`bash
# From PMID
ref add pmid:38941256

# From DOI
ref add "10.1038/s41591-024-xxxxx"

# From ISBN
ref add "ISBN:978-4-00-000000-0"

# From BibTeX file
ref add paper.bib
\`\`\`

#### Phase 5: Insert Citations

Update presentation.yaml:
\`\`\`yaml
items:
  - "This claim is supported [@smith2024]"
\`\`\`

### Extracting from Non-Standard Input

#### URL Patterns
- PubMed: Extract PMID from \`pubmed.ncbi.nlm.nih.gov/XXXXXXXX\`
- DOI: Extract from \`doi.org/10.XXXX/XXXXX\`
- Publisher sites: Fetch page, extract DOI from metadata

#### PDF Files
1. Read PDF file
2. Extract DOI from first page or metadata
3. If not found, extract title and search databases

#### Free Text
1. Parse author, year, journal information
2. Search PubMed/CrossRef
3. Present candidates for user confirmation

### User Communication Templates

**Analyzing content:**
\`\`\`
I've analyzed your scenario and identified citation needs:

📚 Required Citations (N)
━━━━━━━━━━━━━━━━━━━━━━━━
1. Slide X: '[statement]'
   → Needs: [type of source]

📖 Recommended Citations (M)
━━━━━━━━━━━━━━━━━━━━━━━━
...

Let me check your reference library...
\`\`\`

**Requesting references:**
\`\`\`
I need your help finding references:

[REQUIRED] Reference 1: [Topic]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Purpose: Support claim '[statement]' on Slide X

Ideal source type:
• [type1]
• [type2]

Suggested search terms:
• [term1]
• [term2]

How to provide:
A) DOI or PMID (e.g., 'PMID: 38941256')
B) URL (PubMed, journal site, etc.)
C) PDF file
D) Manual citation details
\`\`\`

**Confirming addition:**
\`\`\`
✓ Reference added successfully:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Citation key: [@id]
Authors: ...
Title: '...'
Journal: ...
Year: XXXX

I'll use this for Slide X.
\`\`\`
`;
}
```

**Verification**:
- [ ] スキル定義が生成される
- [ ] ワークフローが明確に記述されている
- [ ] コマンド例が含まれている

### Step 2: Claude Command for References

**Goal**: `.claude/commands/slide-references.md` を生成

**File**: `src/cli/templates/ai/commands/slide-references.ts`

```typescript
export function generateSlideReferencesCommand(): string {
  return `Manage references and citations for the presentation.

## Available Actions

### 1. Analyze - Find citation needs
Analyze the scenario/content for statements that need citations.

### 2. Search - Find in library
Search existing reference-manager library for relevant papers.

### 3. Add - Add new reference
Add a reference from PMID, DOI, URL, or file.

### 4. List - Show all references
List all references currently in the library.

## Usage

### Analyze scenario for citation needs:
\`\`\`bash
# First, read the presentation
cat presentation.yaml

# Then analyze content for citation requirements
\`\`\`
Report statements needing citations with slide numbers.

### Search library:
\`\`\`bash
ref search "keyword" --format json
ref list --format json
\`\`\`

### Add reference:
\`\`\`bash
# From PMID
ref add pmid:38941256

# From DOI
ref add "10.1038/s41591-024-xxxxx"

# From URL (extract identifier first)
# PubMed URL → extract PMID
# DOI URL → extract DOI

# From file
ref add paper.bib
ref add export.ris
\`\`\`

### Validate citations:
\`\`\`bash
slide-gen validate presentation.yaml
\`\`\`

## Notes

- Always check library before requesting new references
- Extract PMID/DOI from URLs before adding
- Report missing citations with suggested search terms
- Update presentation.yaml with [@id] format
`;
}
```

**Verification**:
- [ ] コマンドが生成される
- [ ] 使用例が含まれている

### Step 3: Integrate into Init Command

**Goal**: `slide-gen init` でリファレンススキルファイルを生成

**Test file**: `src/cli/commands/init.test.ts` (追加テスト)

```typescript
describe('init command - reference skills', () => {
  it('should generate reference skill files', async () => {
    await runInit(testDir);

    expect(existsSync(join(testDir, '.skills/slide-assistant/references/skill.md'))).toBe(true);
    expect(existsSync(join(testDir, '.claude/commands/slide-references.md'))).toBe(true);
  });

  it('should include reference workflow in SKILL.md', async () => {
    await runInit(testDir);

    const skillContent = readFileSync(
      join(testDir, '.skills/slide-assistant/SKILL.md'),
      'utf-8'
    );
    expect(skillContent).toContain('Reference');
    expect(skillContent).toContain('ref add');
  });
});
```

**Implementation**: `src/cli/commands/init.ts`

```typescript
// Add to AI config generation
const referenceSkill = generateReferenceSkillMd();
writeFileIfNotExists(
  join(dir, '.skills/slide-assistant/references/skill.md'),
  referenceSkill
);

const referencesCommand = generateSlideReferencesCommand();
writeFileIfNotExists(
  join(dir, '.claude/commands/slide-references.md'),
  referencesCommand
);
```

**Verification**:
- [ ] `slide-gen init` でファイルが生成される
- [ ] 既存ファイルを上書きしない
- [ ] SKILL.md にリファレンスセクションが含まれる

### Step 4: Update Main SKILL.md

**Goal**: メインの SKILL.md にリファレンス関連情報を追加

**File**: `src/cli/templates/ai/skill-md.ts` (更新)

```typescript
// Add to SKILL.md content
## Reference Management

For academic presentations, manage citations and references:

1. **Analyze** content for citation needs
2. **Search** existing library: \`ref search\`
3. **Add** new references: \`ref add pmid:XXX\`
4. **Validate** citations: \`slide-gen validate\`

See \`.skills/slide-assistant/references/skill.md\` for detailed workflow.

### Quick Commands

\`\`\`bash
# Search library
ref search "keyword" --format json

# Add from PMID
ref add pmid:38941256

# Add from DOI
ref add "10.1038/xxxxx"

# Validate citations
slide-gen validate presentation.yaml
\`\`\`
```

**Verification**:
- [ ] SKILL.md にリファレンスセクションが追加される
- [ ] クイックコマンドが含まれる

## E2E Test

**Test file**: `tests/e2e/init-references.test.ts`

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execSync } from 'child_process';
import { existsSync, readFileSync, rmSync, mkdirSync } from 'fs';
import { join } from 'path';

describe('E2E: init reference skills', () => {
  const testDir = join(__dirname, 'fixtures', 'init-refs-test');

  beforeEach(() => {
    rmSync(testDir, { recursive: true, force: true });
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it('should generate reference skill files on init', () => {
    execSync(`node dist/cli.js init ${testDir} --skip-marp-install`, {
      encoding: 'utf-8',
    });

    // Check reference skill exists
    const refSkillPath = join(testDir, '.skills/slide-assistant/references/skill.md');
    expect(existsSync(refSkillPath)).toBe(true);

    const content = readFileSync(refSkillPath, 'utf-8');
    expect(content).toContain('Reference Management');
    expect(content).toContain('ref add');
  });

  it('should generate slide-references command', () => {
    execSync(`node dist/cli.js init ${testDir} --skip-marp-install`, {
      encoding: 'utf-8',
    });

    const cmdPath = join(testDir, '.claude/commands/slide-references.md');
    expect(existsSync(cmdPath)).toBe(true);

    const content = readFileSync(cmdPath, 'utf-8');
    expect(content).toContain('Manage references');
  });

  it('should include references in main SKILL.md', () => {
    execSync(`node dist/cli.js init ${testDir} --skip-marp-install`, {
      encoding: 'utf-8',
    });

    const skillPath = join(testDir, '.skills/slide-assistant/SKILL.md');
    const content = readFileSync(skillPath, 'utf-8');

    expect(content).toContain('Reference');
    expect(content).toContain('ref search');
  });
});
```

**Verification**:
- [ ] 実際の `slide-gen init` でファイルが生成される
- [ ] 内容が仕様通り

## Acceptance Criteria

- [ ] 全てのテストが通る (`pnpm test`)
- [ ] 型チェックが通る (`pnpm typecheck`)
- [ ] リントが通る (`pnpm lint`)
- [ ] E2Eテストが通る
- [ ] `.skills/slide-assistant/references/skill.md` が生成される
- [ ] `.claude/commands/slide-references.md` が生成される
- [ ] メイン SKILL.md にリファレンスセクションが含まれる
- [ ] ワークフローが明確に記述されている
- [ ] コマンド例が含まれている

## Files Changed

- [ ] `src/cli/templates/ai/references/skill-references.ts` - 新規作成
- [ ] `src/cli/templates/ai/references/index.ts` - 新規作成
- [ ] `src/cli/templates/ai/commands/slide-references.ts` - 新規作成
- [ ] `src/cli/templates/ai/skill-md.ts` - リファレンスセクション追加
- [ ] `src/cli/templates/ai/index.ts` - エクスポート追加
- [ ] `src/cli/commands/init.ts` - ファイル生成追加
- [ ] `src/cli/commands/init.test.ts` - テスト追加
- [ ] `tests/e2e/init-references.test.ts` - 新規作成

## Notes

- スキル定義は英語で記述（トークン効率のため）
- コマンド例は実際に動作するものを使用
- ユーザーコミュニケーションテンプレートを含める
- 非定型入力（URL、PDF等）の処理方法を明記
