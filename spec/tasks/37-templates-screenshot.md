# Task: Templates Screenshot Command

## Purpose

`templates`コマンドに`screenshot`サブコマンドを追加し、テンプレートのスクリーンショットを画像ファイルとして保存できるようにする。個別テンプレート、全テンプレート、カテゴリ別のスクリーンショット、およびコンタクトシート（一覧画像）の生成をサポートする。

## Context

- **関連仕様**: [spec/cli.md](../cli.md#screenshot-1), [spec/templates.md](../templates.md#template-screenshots)
- **依存タスク**: [23-screenshot-command](./completed/23-screenshot-command.md), [13-cli-templates](./completed/13-cli-templates.md)
- **関連ソース**: `src/cli/commands/templates.ts`, `src/cli/commands/screenshot.ts`

## TDD Implementation Cycle

各ステップで以下のサイクルを実行:

1. **Red**: 失敗するテストを書く
2. **Green**: テストを通す最小限の実装
3. **Refactor**: `pnpm lint && pnpm typecheck` を実行し、リファクタリング

## Implementation Steps

### Step 1: TemplateScreenshotOptions インターフェース定義

**Goal**: スクリーンショットオプションの型定義

**Test file**: `src/cli/commands/templates.test.ts`

```typescript
describe('templates screenshot', () => {
  describe('TemplateScreenshotOptions', () => {
    it('should have required properties', () => {
      const options: TemplateScreenshotOptions = {
        all: false,
        output: './template-screenshots',
        format: 'png',
        width: 1280,
      };
      expect(options).toBeDefined();
    });
  });
});
```

**Implementation**: `src/cli/commands/templates.ts`

```typescript
export interface TemplateScreenshotOptions {
  all?: boolean;
  category?: string;
  output?: string;
  format?: 'png' | 'jpeg' | 'ai';
  width?: number;
  quality?: number;
  contactSheet?: boolean;
  columns?: number;
  config?: string;
  verbose?: boolean;
}
```

**Verification**:
- [ ] テストが失敗することを確認
- [ ] 実装後、テストが通ることを確認
- [ ] `pnpm lint && pnpm typecheck` が通ることを確認

### Step 2: createScreenshotSubcommand 関数

**Goal**: Commanderサブコマンドの作成

**Test file**: `src/cli/commands/templates.test.ts`

```typescript
describe('createScreenshotSubcommand', () => {
  it('should create a command with correct options', () => {
    const cmd = createScreenshotSubcommand();
    expect(cmd.name()).toBe('screenshot');
    expect(cmd.description()).toContain('screenshot');
  });

  it('should have --all option', () => {
    const cmd = createScreenshotSubcommand();
    const allOption = cmd.options.find(o => o.long === '--all');
    expect(allOption).toBeDefined();
  });

  it('should have --contact-sheet option', () => {
    const cmd = createScreenshotSubcommand();
    const contactOption = cmd.options.find(o => o.long === '--contact-sheet');
    expect(contactOption).toBeDefined();
  });
});
```

**Implementation**: `src/cli/commands/templates.ts`

```typescript
function createScreenshotSubcommand(): Command {
  return new Command('screenshot')
    .description('Take screenshots of templates')
    .argument('[name]', 'Template name')
    .option('-a, --all', 'Screenshot all templates')
    .option('--category <cat>', 'Filter by category')
    .option('-o, --output <path>', 'Output directory', './template-screenshots')
    .option('-f, --format <fmt>', 'Output format (png/jpeg/ai)', 'png')
    .option('-w, --width <pixels>', 'Image width', parseInt, 1280)
    .option('-q, --quality <num>', 'JPEG quality (1-100)', parseInt, 80)
    .option('--contact-sheet', 'Generate contact sheet')
    .option('--columns <num>', 'Contact sheet columns', parseInt, 3)
    .option('-c, --config <path>', 'Config file path')
    .option('-v, --verbose', 'Verbose output')
    .action(async (name, options) => {
      await executeTemplateScreenshot(name, options);
    });
}
```

**Verification**:
- [ ] テストが失敗することを確認
- [ ] 実装後、テストが通ることを確認
- [ ] `pnpm lint && pnpm typecheck` が通ることを確認

### Step 3: executeTemplateScreenshot 基本実装

**Goal**: 単一テンプレートのスクリーンショット生成

**Test file**: `src/cli/commands/templates.test.ts`

```typescript
describe('executeTemplateScreenshot', () => {
  it('should fail if neither name nor --all is provided', async () => {
    const result = await executeTemplateScreenshot(undefined, {});
    expect(result.success).toBe(false);
    expect(result.errors).toContain('Specify a template name or use --all');
  });

  it('should fail if template not found', async () => {
    const result = await executeTemplateScreenshot('nonexistent', {});
    expect(result.success).toBe(false);
  });
});
```

**Implementation**: `src/cli/commands/templates.ts`

```typescript
export interface TemplateScreenshotResult {
  success: boolean;
  errors: string[];
  outputDir?: string;
  files?: string[];
}

export async function executeTemplateScreenshot(
  name: string | undefined,
  options: TemplateScreenshotOptions
): Promise<TemplateScreenshotResult> {
  // Validation
  if (!name && !options.all) {
    return {
      success: false,
      errors: ['Specify a template name or use --all'],
    };
  }
  // ... implementation
}
```

**Verification**:
- [ ] テストが失敗することを確認
- [ ] 実装後、テストが通ることを確認
- [ ] `pnpm lint && pnpm typecheck` が通ることを確認

### Step 4: 全テンプレートスクリーンショット

**Goal**: `--all` オプションで全テンプレートのスクリーンショット生成

**Test file**: `src/cli/commands/templates.test.ts`

```typescript
describe('executeTemplateScreenshot with --all', () => {
  it('should generate screenshots for all templates', async () => {
    const result = await executeTemplateScreenshot(undefined, {
      all: true,
      output: testOutputDir,
    });
    expect(result.success).toBe(true);
    expect(result.files).toBeDefined();
    expect(result.files!.length).toBeGreaterThan(0);
  });
});
```

**Verification**:
- [ ] テストが失敗することを確認
- [ ] 実装後、テストが通ることを確認
- [ ] `pnpm lint && pnpm typecheck` が通ることを確認

### Step 5: カテゴリフィルタリング

**Goal**: `--category` オプションでカテゴリ別フィルタリング

**Test file**: `src/cli/commands/templates.test.ts`

```typescript
describe('executeTemplateScreenshot with --category', () => {
  it('should filter templates by category', async () => {
    const result = await executeTemplateScreenshot(undefined, {
      all: true,
      category: 'diagrams',
      output: testOutputDir,
    });
    expect(result.success).toBe(true);
    // Only diagram templates should be included
  });
});
```

**Verification**:
- [ ] テストが失敗することを確認
- [ ] 実装後、テストが通ることを確認
- [ ] `pnpm lint && pnpm typecheck` が通ることを確認

### Step 6: AI最適化フォーマット

**Goal**: `--format ai` オプションでAI最適化出力

**Test file**: `src/cli/commands/templates.test.ts`

```typescript
describe('executeTemplateScreenshot with --format ai', () => {
  it('should use 640px width for AI format', async () => {
    const result = await executeTemplateScreenshot('title', {
      format: 'ai',
      output: testOutputDir,
    });
    expect(result.success).toBe(true);
    // Verify image dimensions
  });

  it('should output JPEG format for AI', async () => {
    const result = await executeTemplateScreenshot('title', {
      format: 'ai',
      output: testOutputDir,
    });
    expect(result.files?.[0]).toMatch(/\.jpeg$/);
  });
});
```

**Verification**:
- [ ] テストが失敗することを確認
- [ ] 実装後、テストが通ることを確認
- [ ] `pnpm lint && pnpm typecheck` が通ることを確認

### Step 7: コンタクトシート生成

**Goal**: `--contact-sheet` オプションでコンタクトシート生成

**Test file**: `src/cli/commands/templates.test.ts`

```typescript
describe('executeTemplateScreenshot with --contact-sheet', () => {
  it('should generate contact sheet', async () => {
    const result = await executeTemplateScreenshot(undefined, {
      all: true,
      contactSheet: true,
      output: testOutputDir,
    });
    expect(result.success).toBe(true);
    // Check for templates-contact.png
    const contactFile = result.files?.find(f => f.includes('contact'));
    expect(contactFile).toBeDefined();
  });

  it('should respect --columns option', async () => {
    const result = await executeTemplateScreenshot(undefined, {
      all: true,
      contactSheet: true,
      columns: 4,
      output: testOutputDir,
    });
    expect(result.success).toBe(true);
  });
});
```

**Implementation notes**:
- 既存の `generateContactSheet` 関数を `screenshot.ts` から再利用
- テンプレート名オーバーレイを追加（スライド番号の代わりに）

**Verification**:
- [ ] テストが失敗することを確認
- [ ] 実装後、テストが通ることを確認
- [ ] `pnpm lint && pnpm typecheck` が通ることを確認

### Step 8: AI出力フォーマット

**Goal**: AI向けの出力メッセージ（トークン数推定など）

**Test file**: `src/cli/commands/templates.test.ts`

```typescript
describe('formatTemplateScreenshotOutput', () => {
  it('should show estimated tokens for AI format', () => {
    const output = formatTemplateScreenshotOutput({
      files: ['template1.jpeg', 'template2.jpeg'],
      width: 640,
      height: 360,
      outputDir: './screenshots',
      isAiFormat: true,
    });
    expect(output).toContain('Estimated tokens');
  });
});
```

**Verification**:
- [ ] テストが失敗することを確認
- [ ] 実装後、テストが通ることを確認
- [ ] `pnpm lint && pnpm typecheck` が通ることを確認

### Step 9: templatesコマンドへの統合

**Goal**: `createTemplatesCommand` にscreenshotサブコマンドを追加

**Test file**: `src/cli/commands/templates.test.ts`

```typescript
describe('createTemplatesCommand', () => {
  it('should include screenshot subcommand', () => {
    const cmd = createTemplatesCommand();
    const subcommands = cmd.commands.map(c => c.name());
    expect(subcommands).toContain('screenshot');
  });
});
```

**Implementation**: `src/cli/commands/templates.ts`

```typescript
export function createTemplatesCommand(): Command {
  const cmd = new Command('templates')
    .description('Manage and list templates');

  cmd.addCommand(createListCommand());
  cmd.addCommand(createInfoCommand());
  cmd.addCommand(createExampleCommand());
  cmd.addCommand(createPreviewSubcommand());
  cmd.addCommand(createScreenshotSubcommand()); // Add this

  return cmd;
}
```

**Verification**:
- [ ] テストが失敗することを確認
- [ ] 実装後、テストが通ることを確認
- [ ] `pnpm lint && pnpm typecheck` が通ることを確認

## E2E Test (必須)

> **重要**: ユニットテストのモックは実際の使用時に失敗することがある。
> 最終ステップとしてE2Eテストを必ず実施する。

**Test file**: `tests/e2e/cli-templates-screenshot.test.ts`

```typescript
import { execSync } from 'child_process';
import { existsSync, rmSync, readdirSync } from 'fs';
import { join } from 'path';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('E2E: templates screenshot command', () => {
  const testOutputDir = join(__dirname, 'fixtures', 'template-screenshots');
  const cli = 'npx tsx src/cli/index.ts';

  beforeEach(() => {
    rmSync(testOutputDir, { recursive: true, force: true });
  });

  afterEach(() => {
    rmSync(testOutputDir, { recursive: true, force: true });
  });

  it('should take screenshot of a single template', () => {
    execSync(`${cli} templates screenshot title -o ${testOutputDir}`, {
      encoding: 'utf-8',
    });
    expect(existsSync(testOutputDir)).toBe(true);
    const files = readdirSync(testOutputDir);
    expect(files.some(f => f.startsWith('title'))).toBe(true);
  });

  it('should take screenshots of all templates with --all', () => {
    execSync(`${cli} templates screenshot --all -o ${testOutputDir}`, {
      encoding: 'utf-8',
    });
    const files = readdirSync(testOutputDir);
    expect(files.length).toBeGreaterThan(1);
  });

  it('should filter by category', () => {
    execSync(`${cli} templates screenshot --all --category basic -o ${testOutputDir}`, {
      encoding: 'utf-8',
    });
    const files = readdirSync(testOutputDir);
    // Only basic category templates
    expect(files.some(f => f.includes('title'))).toBe(true);
  });

  it('should generate contact sheet with --contact-sheet', () => {
    execSync(`${cli} templates screenshot --all --contact-sheet -o ${testOutputDir}`, {
      encoding: 'utf-8',
    });
    const files = readdirSync(testOutputDir);
    expect(files.some(f => f.includes('contact'))).toBe(true);
  });

  it('should use AI-optimized settings with --format ai', () => {
    const output = execSync(
      `${cli} templates screenshot title --format ai -o ${testOutputDir}`,
      { encoding: 'utf-8' }
    );
    expect(output).toContain('Estimated tokens');
    const files = readdirSync(testOutputDir);
    expect(files.some(f => f.endsWith('.jpeg'))).toBe(true);
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
- [ ] `slide-gen templates screenshot <name>` で個別テンプレートのスクリーンショットが撮れる
- [ ] `slide-gen templates screenshot --all` で全テンプレートのスクリーンショットが撮れる
- [ ] `slide-gen templates screenshot --category <cat>` でカテゴリフィルタリングが機能する
- [ ] `--format ai` でAI最適化出力（640px, JPEG, トークン推定）が機能する
- [ ] `--contact-sheet` でコンタクトシートが生成される
- [ ] `--columns` でコンタクトシートの列数を指定できる

## Files Changed

- [ ] `src/cli/commands/templates.ts` - screenshotサブコマンド追加
- [ ] `src/cli/commands/templates.test.ts` - テスト追加
- [ ] `tests/e2e/cli-templates-screenshot.test.ts` - E2Eテスト新規作成

## Notes

### 既存コードの再利用

`screenshot.ts` から以下の関数を再利用・共通化を検討:
- `generateContactSheet` - コンタクトシート生成
- `estimateTokens` - トークン数推定
- `formatAiOutput` - AI向け出力フォーマット
- `buildMarpCommandArgs` - Marpコマンド引数構築

共通化する場合は `src/cli/utils/screenshot-utils.ts` への切り出しを検討。

### テンプレート名オーバーレイ

コンタクトシートでは、スライド番号の代わりにテンプレート名を表示する。
既存の `createNumberOverlay` を `createNameOverlay` として拡張または新規作成。

### 出力ファイル命名規則

- 個別: `{template-name}.{format}` (例: `cycle-diagram.png`)
- コンタクトシート: `templates-contact.png`
