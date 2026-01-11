# Task: AI Agent連携 - 基盤

## Purpose

Claude Code、OpenCode、Cursor、Codex等のAIコーディングアシスタントが`slide-gen`ツールを自然言語で操作できるようにするための基盤を構築する。

## Context

- **関連仕様**: [spec/ai-integration.md](../ai-integration.md)
- **依存タスク**: [15-cli-init](./completed/15-cli-init.md)
- **関連ソース**: `src/cli/commands/init.ts`

## Design Principles

1. **AgentSkills形式を中心に構成**: 複数のAI Agentで共通利用可能
2. **単一Agent構成**: Sub-agentは使用せず、シンプルな構成を維持
3. **英語でのファイル記述**: トークン効率を最大化
4. **段階的開示（Progressive Disclosure）**: 必要に応じて詳細を読み込み

## TDD Implementation Cycle

各ステップで以下のサイクルを実行:

1. **Red**: 失敗するテストを書く
2. **Green**: テストを通す最小限の実装
3. **Refactor**: `pnpm lint && pnpm typecheck` を実行し、リファクタリング

## Implementation Steps

### Step 1: AI-GUIDE.md の作成

**Goal**: リポジトリ直下にAI Agent向けガイドファイルを作成（英語）

**Implementation**: `AI-GUIDE.md` (リポジトリ直下)

```markdown
# slide-gen AI Guide

This file is for AI assistants (Claude Code, OpenCode, Cursor, Codex, etc.).

## Quick Start

### 1. Initialize Project

\`\`\`bash
npx @ncukondo/slide-generation init my-presentation
cd my-presentation
\`\`\`

### 2. Available Commands

| Command | Description |
|---------|-------------|
| `slide-gen convert <input>` | Convert YAML to Marp Markdown |
| `slide-gen validate <input>` | Validate source file |
| `slide-gen templates list` | List templates |
| `slide-gen icons search <query>` | Search icons |
| `slide-gen screenshot <input>` | Take screenshots |

...（spec/ai-integration.mdの内容に従う）
```

**Verification**:
- [ ] AI-GUIDE.md がリポジトリ直下に存在する
- [ ] 英語で記述されている
- [ ] 必要な情報（コマンド一覧、ワークフロー、YAML形式）が含まれている

---

### Step 2: InitOptions の拡張

**Goal**: initコマンドに `--no-ai-config` と `--skip-marp-install` オプションを追加

**Test file**: `src/cli/commands/init.test.ts`

```typescript
describe('init command - AI config option', () => {
  it('should accept --no-ai-config option', () => {
    const cmd = createInitCommand();
    // オプションの存在確認
  });

  it('should accept --skip-marp-install option', () => {
    const cmd = createInitCommand();
    // オプションの存在確認
  });
});
```

**Implementation**: `src/cli/commands/init.ts`

```typescript
export interface InitOptions {
  template?: string;
  examples?: boolean;
  aiConfig?: boolean;        // 追加
  skipMarpInstall?: boolean; // 追加
}

export function createInitCommand(): Command {
  return new Command('init')
    // ...
    .option('--no-ai-config', 'Do not create AI assistant config files')
    .option('--skip-marp-install', 'Skip Marp CLI installation prompt')
    // ...
}
```

**Verification**:
- [ ] `--no-ai-config` オプションが認識される
- [ ] `--skip-marp-install` オプションが認識される

---

### Step 3: AI設定ファイル生成ロジックの実装

**Goal**: executeInit関数を拡張してAI設定ファイルを生成

**Test file**: `src/cli/commands/init.test.ts`

```typescript
describe('executeInit - AI config', () => {
  // AgentSkills
  it('should generate .skills/slide-assistant/SKILL.md', async () => {
    await executeInit(testDir, {});
    const content = await readFile(
      join(testDir, '.skills', 'slide-assistant', 'SKILL.md'),
      'utf-8'
    );
    expect(content).toContain('name: slide-assistant');
    expect(content).toContain('slide-gen');
  });

  // Claude Code
  it('should generate CLAUDE.md', async () => {
    await executeInit(testDir, {});
    const content = await readFile(join(testDir, 'CLAUDE.md'), 'utf-8');
    expect(content).toContain('slide-gen');
  });

  it('should generate .claude/commands/', async () => {
    await executeInit(testDir, {});
    const commands = await readdir(join(testDir, '.claude', 'commands'));
    expect(commands).toContain('slide-create.md');
    expect(commands).toContain('slide-validate.md');
    expect(commands).toContain('slide-preview.md');
  });

  // OpenCode
  it('should generate AGENTS.md', async () => {
    await executeInit(testDir, {});
    const content = await readFile(join(testDir, 'AGENTS.md'), 'utf-8');
    expect(content).toContain('slide-gen');
  });

  it('should generate .opencode/agent/slide.md', async () => {
    await executeInit(testDir, {});
    const content = await readFile(
      join(testDir, '.opencode', 'agent', 'slide.md'),
      'utf-8'
    );
    expect(content).toContain('mode: subagent');
  });

  // Cursor
  it('should generate .cursorrules', async () => {
    await executeInit(testDir, {});
    const content = await readFile(join(testDir, '.cursorrules'), 'utf-8');
    expect(content).toContain('slide-gen');
  });

  // Skip option
  it('should skip AI config with --no-ai-config', async () => {
    await executeInit(testDir, { aiConfig: false });
    await expect(access(join(testDir, 'CLAUDE.md'))).rejects.toThrow();
    await expect(access(join(testDir, '.skills'))).rejects.toThrow();
  });

  // No overwrite
  it('should not overwrite existing CLAUDE.md', async () => {
    await mkdir(testDir, { recursive: true });
    await writeFile(join(testDir, 'CLAUDE.md'), '# Existing');
    await executeInit(testDir, {});
    const content = await readFile(join(testDir, 'CLAUDE.md'), 'utf-8');
    expect(content).toBe('# Existing');
  });
});
```

**Implementation**: `src/cli/commands/init.ts`

```typescript
import {
  generateSkillMd,
  generateClaudeMd,
  generateAgentsMd,
  generateOpenCodeAgent,
  generateTemplatesRef,
  generateWorkflowsRef,
  generateSlideCreateCommand,
  generateSlideValidateCommand,
  generateSlidePreviewCommand,
  generateSlideScreenshotCommand,
  generateSlideThemeCommand,
} from '../templates/ai';

async function generateAiConfig(targetDir: string): Promise<void> {
  // Create directories
  await mkdir(join(targetDir, '.skills', 'slide-assistant', 'references'), { recursive: true });
  await mkdir(join(targetDir, '.skills', 'slide-assistant', 'scripts'), { recursive: true });
  await mkdir(join(targetDir, '.claude', 'commands'), { recursive: true });
  await mkdir(join(targetDir, '.opencode', 'agent'), { recursive: true });

  // Generate AgentSkills (共通)
  await writeFileIfNotExists(
    join(targetDir, '.skills', 'slide-assistant', 'SKILL.md'),
    generateSkillMd()
  );
  await writeFileIfNotExists(
    join(targetDir, '.skills', 'slide-assistant', 'references', 'templates.md'),
    generateTemplatesRef()
  );
  await writeFileIfNotExists(
    join(targetDir, '.skills', 'slide-assistant', 'references', 'workflows.md'),
    generateWorkflowsRef()
  );

  // Generate Claude Code files
  await writeFileIfNotExists(join(targetDir, 'CLAUDE.md'), generateClaudeMd());

  // Generate commands
  const commandGenerators = {
    'slide-create': generateSlideCreateCommand,
    'slide-validate': generateSlideValidateCommand,
    'slide-preview': generateSlidePreviewCommand,
    'slide-screenshot': generateSlideScreenshotCommand,
    'slide-theme': generateSlideThemeCommand,
  };
  for (const [name, generator] of Object.entries(commandGenerators)) {
    await writeFileIfNotExists(
      join(targetDir, '.claude', 'commands', `${name}.md`),
      generator()
    );
  }

  // Generate OpenCode files
  await writeFileIfNotExists(join(targetDir, 'AGENTS.md'), generateAgentsMd());
  await writeFileIfNotExists(
    join(targetDir, '.opencode', 'agent', 'slide.md'),
    generateOpenCodeAgent()
  );

  // Generate Cursor files (same as AGENTS.md)
  await writeFileIfNotExists(join(targetDir, '.cursorrules'), generateAgentsMd());
}
```

**Verification**:
- [ ] 全てのAI設定ファイルが生成される
- [ ] 既存ファイルは上書きされない
- [ ] --no-ai-config で生成をスキップできる
- [ ] 全てのファイルが英語で記述されている

---

### Step 4: テンプレート内容の実装

**Goal**: 各テンプレートファイルの内容を生成する関数を実装（ファイル単位で分離）

**Directory**: `src/cli/templates/ai/`

#### 4.1 メインテンプレート

**File**: `src/cli/templates/ai/skill-md.ts`
```typescript
/**
 * Generate SKILL.md content for AgentSkills
 */
export function generateSkillMd(): string {
  return `---
name: slide-assistant
description: Assists with slide creation using slide-gen CLI...
allowed-tools: Read Write Edit Bash Glob Grep
---

# Slide Assistant
...`;
}
```

**File**: `src/cli/templates/ai/claude-md.ts`
```typescript
/**
 * Generate CLAUDE.md content for Claude Code
 */
export function generateClaudeMd(): string { ... }
```

**File**: `src/cli/templates/ai/agents-md.ts`
```typescript
/**
 * Generate AGENTS.md content for OpenCode
 */
export function generateAgentsMd(): string { ... }
```

**File**: `src/cli/templates/ai/opencode-agent.ts`
```typescript
/**
 * Generate .opencode/agent/slide.md content
 */
export function generateOpenCodeAgent(): string { ... }
```

#### 4.2 リファレンステンプレート

**File**: `src/cli/templates/ai/references/templates-ref.ts`
```typescript
/**
 * Generate references/templates.md content
 * Contains detailed template parameter reference
 */
export function generateTemplatesRef(): string {
  return `# Template Reference

## Basic Templates

### title
Full-screen title slide.
- \`title\`: Main title (required)
- \`subtitle\`: Subtitle (optional)
- \`author\`: Author name (optional)

### bullet-list
Slide with bullet points.
- \`title\`: Slide title (required)
- \`items\`: Array of strings (required)

### two-column
Two-column layout.
- \`title\`: Slide title (required)
- \`left\`: Left column content (required)
- \`right\`: Right column content (required)

## Diagram Templates

### cycle-diagram
Circular process diagram (3-6 nodes).
- \`title\`: Slide title (required)
- \`nodes\`: Array of {label, icon?, color?} (required)

### flow-diagram
Linear flow diagram.
- \`title\`: Slide title (required)
- \`steps\`: Array of {label, icon?, description?} (required)

## Image Templates

### image-full
Full-screen background image.
- \`image\`: Image path (required)
- \`title\`: Overlay title (optional)
- \`overlay\`: none|dark|light|gradient (optional)

### image-text
Image with text side by side.
- \`title\`: Slide title (required)
- \`image\`: Image path (required)
- \`image_position\`: left|right (optional, default: left)
- \`items\` or \`text\`: Content (required)

## Run \`slide-gen templates list --format llm\` for full list.
`;
}
```

**File**: `src/cli/templates/ai/references/workflows-ref.ts`
```typescript
/**
 * Generate references/workflows.md content
 * Contains source collection and image collaboration workflows
 */
export function generateWorkflowsRef(): string {
  return `# Workflow Reference

## Source Collection Flow

### Pattern A: Directory Exploration
When user has materials in a directory:
1. Ask for directory path
2. Scan with Glob tool
3. Read and classify files
4. Summarize and confirm with user
5. Create sources/sources.yaml

### Pattern B: Supplement Mode
When user has partial materials:
1. Read provided file/text
2. Analyze content
3. Identify missing information
4. Ask supplementary questions
5. Create sources/sources.yaml

### Pattern C: Interview Mode
When user has no materials:
1. Ask basic questions (purpose, audience, duration)
2. Deep-dive based on purpose
3. Propose slide structure
4. Iterate based on feedback
5. Create sources/sources.yaml

## Image Collaboration Flow

### Phase 1: Requirement Derivation
Analyze presentation scenario to identify needed images.

### Phase 2: Image Request
Generate specific image requests with:
- Purpose and context
- Recommended specifications
- File naming convention

### Phase 3: Verification
After user provides images:
1. Visual inspection (Read tool)
2. Check metadata if available
3. Verify compliance and permissions
4. Provide feedback

### Phase 4: Iteration
Handle adjustments (cropping, replacement) as needed.
`;
}
```

#### 4.3 Scripts

**File**: `src/cli/templates/ai/scripts/validate-sh.ts`
```typescript
/**
 * Generate validate.sh script content
 */
export function generateValidateSh(): string {
  return `#!/bin/bash
# Validate presentation YAML file

INPUT=\${1:-presentation.yaml}

if [ ! -f "$INPUT" ]; then
  echo "Error: File not found: $INPUT"
  exit 1
fi

slide-gen validate "$INPUT"
EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
  echo "✓ Validation passed"
else
  echo "✗ Validation failed"
fi

exit $EXIT_CODE
`;
}
```

#### 4.4 コマンドテンプレート

**File**: `src/cli/templates/ai/commands/slide-create.ts`
```typescript
/**
 * Generate .claude/commands/slide-create.md content
 */
export function generateSlideCreateCommand(): string { ... }
```

（他のコマンドも同様）

#### 4.4 エクスポート集約

**File**: `src/cli/templates/ai/index.ts`
```typescript
// Main templates
export { generateSkillMd } from './skill-md';
export { generateClaudeMd } from './claude-md';
export { generateAgentsMd } from './agents-md';
export { generateOpenCodeAgent } from './opencode-agent';

// References
export * from './references';

// Commands
export * from './commands';
```

**Verification**:
- [ ] 各ファイルが単一のテンプレート関数をエクスポートしている
- [ ] index.tsで全てがまとめてエクスポートされている
- [ ] 生成されたファイルの内容がspec/ai-integration.mdに準拠している
- [ ] YAMLフロントマター（Skills）が正しい形式
- [ ] 全て英語で記述されている

---

### Step 5: Marp CLI対話的インストール

**Goal**: init時にMarp CLIのインストールを提案・実行

**Test file**: `src/cli/commands/init.test.ts`

```typescript
describe('Marp CLI installation', () => {
  it('should detect if Marp CLI is installed', () => {
    const result = isMarpCliInstalled();
    expect(typeof result).toBe('boolean');
  });

  it('should detect package manager', () => {
    const pm = detectPackageManager();
    expect(['npm', 'pnpm', 'yarn']).toContain(pm);
  });

  it('should skip prompt with --skip-marp-install', async () => {
    await executeInit(testDir, { skipMarpInstall: true });
    // Verify no prompt was shown
  });
});
```

**Implementation**: `src/cli/commands/init.ts`

```typescript
function isMarpCliInstalled(): boolean {
  try {
    execSync('npx marp --version', { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

function detectPackageManager(): string {
  if (existsSync('pnpm-lock.yaml')) return 'pnpm';
  if (existsSync('yarn.lock')) return 'yarn';
  return 'npm';
}

async function promptMarpCliInstall(): Promise<boolean> {
  if (isMarpCliInstalled()) {
    return true;
  }

  console.log(chalk.yellow('\nMarp CLI is recommended for full features:'));
  console.log('  • Preview slides in browser');
  console.log('  • Take screenshots for AI review');
  console.log('  • Export to PDF/HTML/PPTX');
  console.log(chalk.dim('\nMarp CLI is not currently installed.\n'));

  // Interactive prompt...
}
```

**Verification**:
- [ ] Marp CLI未インストール時にプロンプトが表示される
- [ ] Yを選択するとインストールが実行される
- [ ] nを選択するとスキップされる
- [ ] --skip-marp-install でプロンプトをスキップできる

---

### Step 6: README.md更新

**Goal**: README.mdにAI連携機能の説明を追加

**Verification**:
- [ ] README.mdにAI連携の説明が含まれている

---

## E2E Test (必須)

**Test file**: `tests/e2e/cli-init-ai.test.ts`

```typescript
describe('E2E: init command with AI config', () => {
  it('should generate all AI config files', async () => {
    execSync(`node dist/cli/index.js init ${testDir}`);

    // AgentSkills
    expect(existsSync(join(testDir, '.skills', 'slide-assistant', 'SKILL.md'))).toBe(true);

    // Claude Code
    expect(existsSync(join(testDir, 'CLAUDE.md'))).toBe(true);
    expect(existsSync(join(testDir, '.claude', 'commands', 'slide-create.md'))).toBe(true);

    // OpenCode
    expect(existsSync(join(testDir, 'AGENTS.md'))).toBe(true);
    expect(existsSync(join(testDir, '.opencode', 'agent', 'slide.md'))).toBe(true);

    // Cursor
    expect(existsSync(join(testDir, '.cursorrules'))).toBe(true);
  });

  it('should skip AI config with --no-ai-config', async () => {
    execSync(`node dist/cli/index.js init ${testDir} --no-ai-config`);
    expect(existsSync(join(testDir, 'CLAUDE.md'))).toBe(false);
    expect(existsSync(join(testDir, '.skills'))).toBe(false);
  });
});
```

---

## Acceptance Criteria

- [ ] 全てのテストが通る (`pnpm test`)
- [ ] 型チェックが通る (`pnpm typecheck`)
- [ ] リントが通る (`pnpm lint`)
- [ ] E2Eテストが通る
- [ ] AI-GUIDE.md がリポジトリ直下に存在する（英語）
- [ ] `slide-gen init` で全てのAI設定ファイルが生成される
  - [ ] `.skills/slide-assistant/SKILL.md` (AgentSkills形式)
  - [ ] `CLAUDE.md`, `.claude/commands/*.md` (Claude Code)
  - [ ] `AGENTS.md`, `.opencode/agent/slide.md` (OpenCode)
  - [ ] `.cursorrules` (Cursor)
- [ ] 全てのAI向けファイルが英語で記述されている
- [ ] `--no-ai-config` オプションでAI設定をスキップできる
- [ ] 既存ファイルは上書きされない
- [ ] Marp CLI未インストール時にインストール確認が表示される
- [ ] `--skip-marp-install` でインストール確認をスキップできる

## Files Changed

- [ ] `AI-GUIDE.md` - 新規作成（リポジトリ直下）
- [ ] `src/cli/commands/init.ts` - AI設定生成・Marp CLIインストールロジック追加
- [ ] `src/cli/commands/init.test.ts` - テスト追加
- [ ] `src/cli/templates/ai/index.ts` - エクスポート集約
- [ ] `src/cli/templates/ai/skill-md.ts` - SKILL.mdテンプレート
- [ ] `src/cli/templates/ai/claude-md.ts` - CLAUDE.mdテンプレート
- [ ] `src/cli/templates/ai/agents-md.ts` - AGENTS.mdテンプレート
- [ ] `src/cli/templates/ai/opencode-agent.ts` - OpenCodeエージェントテンプレート
- [ ] `src/cli/templates/ai/references/index.ts` - リファレンスエクスポート
- [ ] `src/cli/templates/ai/references/templates-ref.ts` - テンプレートリファレンス
- [ ] `src/cli/templates/ai/references/workflows-ref.ts` - ワークフローリファレンス
- [ ] `src/cli/templates/ai/scripts/index.ts` - スクリプトエクスポート
- [ ] `src/cli/templates/ai/scripts/validate-sh.ts` - validate.shスクリプト
- [ ] `src/cli/templates/ai/commands/index.ts` - コマンドエクスポート
- [ ] `src/cli/templates/ai/commands/slide-create.ts` - slide-createコマンド
- [ ] `src/cli/templates/ai/commands/slide-validate.ts` - slide-validateコマンド
- [ ] `src/cli/templates/ai/commands/slide-preview.ts` - slide-previewコマンド
- [ ] `src/cli/templates/ai/commands/slide-screenshot.ts` - slide-screenshotコマンド
- [ ] `src/cli/templates/ai/commands/slide-theme.ts` - slide-themeコマンド
- [ ] `tests/e2e/cli-init-ai.test.ts` - E2Eテスト新規作成
- [ ] `README.md` - AI連携説明追加
- [ ] `package.json` - optionalDependencies追加（Marp CLI）

## Source Template Structure

```
src/cli/templates/ai/
├── index.ts                      # 全てをまとめてエクスポート
├── skill-md.ts                   # .skills/slide-assistant/SKILL.md
├── claude-md.ts                  # CLAUDE.md
├── agents-md.ts                  # AGENTS.md
├── opencode-agent.ts             # .opencode/agent/slide.md
├── references/
│   ├── index.ts
│   ├── templates-ref.ts          # references/templates.md
│   └── workflows-ref.ts          # references/workflows.md
├── scripts/
│   ├── index.ts
│   └── validate-sh.ts            # scripts/validate.sh
└── commands/
    ├── index.ts
    ├── slide-create.ts           # .claude/commands/slide-create.md
    ├── slide-validate.ts
    ├── slide-preview.ts
    ├── slide-screenshot.ts
    └── slide-theme.ts
```

## Generated File Structure (by slide-gen init)

```
my-presentation/
├── .skills/
│   └── slide-assistant/
│       ├── SKILL.md              # AgentSkills (common)
│       ├── references/
│       │   ├── templates.md
│       │   └── workflows.md
│       └── scripts/
│           └── validate.sh
├── .claude/
│   └── commands/
│       ├── slide-create.md
│       ├── slide-validate.md
│       ├── slide-preview.md
│       ├── slide-screenshot.md
│       └── slide-theme.md
├── .opencode/
│   └── agent/
│       └── slide.md
├── AGENTS.md                     # OpenCode
├── CLAUDE.md                     # Claude Code
├── .cursorrules                  # Cursor
├── config.yaml
└── presentation.yaml
```
