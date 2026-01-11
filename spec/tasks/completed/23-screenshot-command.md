# Task: screenshotコマンド実装

## Purpose

スライドのスクリーンショットを撮影するコマンドを実装し、AIアシスタントがスライドを視覚的に確認できるようにする。

## Context

- **関連仕様**: [spec/ai-integration.md](../ai-integration.md), [spec/cli.md](../cli.md)
- **依存タスク**: [11-cli-convert](./completed/11-cli-convert.md), [22-ai-integration](./22-ai-integration.md)
- **関連ソース**: `src/cli/commands/`

## Prerequisites

- Task 22 (AI Integration) must be completed first
- Marp CLI available as optionalDependency

## TDD Implementation Cycle

各ステップで以下のサイクルを実行:

1. **Red**: 失敗するテストを書く
2. **Green**: テストを通す最小限の実装
3. **Refactor**: `pnpm lint && pnpm typecheck` を実行し、リファクタリング

## Implementation Steps

### Step 1: コマンド基本構造の作成

**Goal**: screenshotコマンドの基本構造を作成

**Test file**: `src/cli/commands/screenshot.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { createScreenshotCommand } from './screenshot';

describe('screenshot command', () => {
  it('should create command with correct name', () => {
    const cmd = createScreenshotCommand();
    expect(cmd.name()).toBe('screenshot');
  });

  it('should have required options', () => {
    const cmd = createScreenshotCommand();
    const options = cmd.options.map(o => o.long);
    expect(options).toContain('--output');
    expect(options).toContain('--slide');
    expect(options).toContain('--width');
    expect(options).toContain('--format');
  });
});
```

**Implementation**: `src/cli/commands/screenshot.ts`

```typescript
import { Command } from 'commander';

export interface ScreenshotOptions {
  output?: string;
  slide?: number;
  width?: number;
  format?: 'png' | 'jpeg';
}

export function createScreenshotCommand(): Command {
  return new Command('screenshot')
    .description('Take screenshots of slides (requires Marp CLI)')
    .argument('<input>', 'Source YAML file')
    .option('-o, --output <path>', 'Output directory', './screenshots')
    .option('-s, --slide <number>', 'Specific slide number (1-based)', parseInt)
    .option('-w, --width <pixels>', 'Image width', parseInt, 1280)
    .option('-f, --format <fmt>', 'Image format (png/jpeg)', 'png')
    .action(async (input: string, options: ScreenshotOptions) => {
      await executeScreenshot(input, options);
    });
}
```

**Verification**:
- [ ] コマンドが正しく作成される
- [ ] オプションが正しく定義される

---

### Step 2: Marp CLI連携の実装

**Goal**: Marp CLIを呼び出してスクリーンショットを撮影

**Test file**: `src/cli/commands/screenshot.test.ts`

```typescript
describe('executeScreenshot', () => {
  it('should convert YAML to MD first', async () => {
    // Mock convert process
  });

  it('should call marp with --images option', async () => {
    // Mock marp CLI call
  });

  it('should create output directory', async () => {
    await executeScreenshot('test.yaml', { output: './test-screenshots' });
    // Verify directory exists
  });
});
```

**Implementation**: `src/cli/commands/screenshot.ts`

```typescript
import { execSync } from 'child_process';
import { mkdir } from 'fs/promises';
import { join, dirname } from 'path';

export async function executeScreenshot(
  input: string,
  options: ScreenshotOptions
): Promise<void> {
  const spinner = ora();
  const outputDir = options.output || './screenshots';

  try {
    spinner.start('Converting YAML to Markdown...');

    // 1. Convert YAML to MD (using existing convert logic)
    const mdPath = input.replace(/\.yaml$/, '.md');
    await convertToMarkdown(input, mdPath);

    spinner.text = 'Taking screenshots...';

    // 2. Create output directory
    await mkdir(outputDir, { recursive: true });

    // 3. Call Marp CLI
    const marpCmd = buildMarpCommand(mdPath, outputDir, options);
    execSync(marpCmd, { stdio: 'pipe' });

    spinner.succeed(`Screenshots saved to ${outputDir}`);
  } catch (error) {
    spinner.fail('Failed to take screenshots');
    // Handle error
  }
}

function buildMarpCommand(
  mdPath: string,
  outputDir: string,
  options: ScreenshotOptions
): string {
  const format = options.format || 'png';
  let cmd = `marp "${mdPath}" --images ${format} -o "${outputDir}"`;

  if (options.width) {
    cmd += ` --image-scale ${options.width / 1280}`;
  }

  return cmd;
}
```

**Verification**:
- [ ] YAMLからMDへの変換が行われる
- [ ] Marp CLIが正しく呼び出される
- [ ] 出力ディレクトリが作成される

---

### Step 3: 特定スライド抽出の実装

**Goal**: `--slide` オプションで特定スライドのみ撮影

**Test file**: `src/cli/commands/screenshot.test.ts`

```typescript
describe('executeScreenshot - slide option', () => {
  it('should extract specific slide', async () => {
    await executeScreenshot('test.yaml', { slide: 3 });
    // Verify only slide 3 is captured
  });
});
```

**Implementation**:

```typescript
// After Marp generates all images, filter to specific slide if requested
if (options.slide) {
  const slideNum = options.slide.toString().padStart(3, '0');
  const targetFile = `slide-${slideNum}.${format}`;
  // Keep only the requested slide, optionally rename
}
```

**Verification**:
- [ ] 特定スライドのみが出力される

---

### Step 4: CLIへの統合

**Goal**: screenshotコマンドをメインCLIに追加

**Implementation**: `src/cli/index.ts`

```typescript
import { createScreenshotCommand } from './commands/screenshot';

program.addCommand(createScreenshotCommand());
```

**Verification**:
- [ ] `slide-gen screenshot --help` が動作する

---

### Step 5: エラーハンドリング

**Goal**: Marp CLI未インストール時のエラー処理

**Test file**: `src/cli/commands/screenshot.test.ts`

```typescript
describe('executeScreenshot - error handling', () => {
  it('should show helpful message when Marp CLI is not installed', async () => {
    // Mock marp not found
  });

  it('should handle invalid input file', async () => {
    await expect(executeScreenshot('nonexistent.yaml', {}))
      .rejects.toThrow();
  });
});
```

**Implementation**:

```typescript
function checkMarpCli(): boolean {
  try {
    execSync('marp --version', { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

// In executeScreenshot:
if (!checkMarpCli()) {
  console.error(chalk.red('Marp CLI is not installed.'));
  console.error(chalk.yellow('Install with: npm install -g @marp-team/marp-cli'));
  process.exitCode = ExitCode.GeneralError;
  return;
}
```

**Verification**:
- [ ] Marp CLI未インストール時に適切なメッセージが表示される
- [ ] 無効な入力ファイルでエラーが発生する

---

## E2E Test (必須)

**Test file**: `tests/e2e/cli-screenshot.test.ts`

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdir, rm, readdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { execSync } from 'child_process';

describe('E2E: screenshot command', () => {
  const testDir = join(process.cwd(), 'test-output', 'e2e-screenshot');
  const yamlPath = join(testDir, 'test.yaml');

  beforeEach(async () => {
    await rm(testDir, { recursive: true, force: true });
    await mkdir(testDir, { recursive: true });

    // Create test YAML
    await writeFile(yamlPath, `
meta:
  title: Test
slides:
  - template: title
    content:
      title: Test Slide
  - template: content
    content:
      title: Content
      body: Hello
`);
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it('should generate screenshot files', async () => {
    const outputDir = join(testDir, 'screenshots');

    execSync(
      `node dist/cli/index.js screenshot ${yamlPath} -o ${outputDir}`,
      { stdio: 'pipe' }
    );

    const files = await readdir(outputDir);
    expect(files.length).toBeGreaterThan(0);
    expect(files.some(f => f.endsWith('.png'))).toBe(true);
  });

  it('should generate specific slide only', async () => {
    const outputDir = join(testDir, 'screenshots');

    execSync(
      `node dist/cli/index.js screenshot ${yamlPath} -o ${outputDir} --slide 1`,
      { stdio: 'pipe' }
    );

    const files = await readdir(outputDir);
    expect(files.length).toBe(1);
  });
});
```

**注意**: このE2EテストはMarp CLIがインストールされている環境でのみ動作します。CIではスキップするか、Marp CLIをインストールする必要があります。

---

## Acceptance Criteria

- [ ] 全てのテストが通る (`pnpm test`)
- [ ] 型チェックが通る (`pnpm typecheck`)
- [ ] リントが通る (`pnpm lint`)
- [ ] `slide-gen screenshot` コマンドが動作する
- [ ] `--output`, `--slide`, `--width`, `--format` オプションが動作する
- [ ] Marp CLI未インストール時に適切なエラーメッセージが表示される
- [ ] E2Eテストが通る（Marp CLI環境）

## Files Changed

- [ ] `src/cli/commands/screenshot.ts` - 新規作成
- [ ] `src/cli/commands/screenshot.test.ts` - 新規作成
- [ ] `src/cli/index.ts` - コマンド追加
- [ ] `tests/e2e/cli-screenshot.test.ts` - E2Eテスト新規作成

## Notes

### Marp CLIの依存

このコマンドはMarp CLIに依存します。Marp CLIがインストールされていない場合、明確なエラーメッセージを表示して終了します。

### 画像形式

Marp CLIは `--images png` または `--images jpeg` をサポートしています。デフォルトはPNGです。

### スライド番号

Marp CLIは `slide-001.png`, `slide-002.png` のような形式で出力します。`--slide` オプションで特定スライドを指定した場合、該当ファイルのみを残すか、別名で保存します。
