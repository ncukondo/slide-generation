# Task: Screenshot AI Optimization

## Purpose

AIがスライドを視覚的にレビューする際のトークン消費を最適化し、効率的なフィードバックループを実現する。

## Context

- **関連仕様**: [spec/ai-integration.md](../ai-integration.md), [spec/cli.md](../cli.md)
- **依存タスク**: [23-screenshot-command](./completed/23-screenshot-command.md)
- **関連ソース**: `src/cli/commands/screenshot.ts`

## Background

### 現状の問題

1. **トークン消費が大きい**: デフォルト幅1280pxの画像は約1,229トークン/枚を消費
2. **複数スライドのレビューが非効率**: 10スライドで約12,000トークンを消費
3. **AI向けの最適化オプションがない**: 手動で`--width`を指定する必要がある

### Claude APIの画像トークン消費

- 計算式: `(width * height) / 750` トークン
- 1280x720 (16:9): 約1,229トークン
- 640x360 (16:9): 約307トークン（約75%削減）
- コンタクトシート (4枚を1枚に): 効率的な一覧表示が可能

## Design

### オプション設計

既存の`--format`パターンを踏襲し、一貫性のあるインターフェースを提供：

```bash
slide-gen screenshot <input> [options]
```

| Option | Short | Description | Default |
|--------|-------|-------------|---------|
| `--output <path>` | `-o` | Output directory | `./screenshots` |
| `--slide <number>` | `-s` | Specific slide only (1-based) | All slides |
| `--width <pixels>` | `-w` | Image width | `1280` |
| `--format <fmt>` | `-f` | Output format (png/jpeg/ai) | `png` |
| `--contact-sheet` | | Generate contact sheet | `false` |
| `--columns <num>` | | Contact sheet columns | `2` |
| `--quality <num>` | `-q` | JPEG quality (1-100) | `80` |

### `--format ai` の動作

AI向けに最適化された出力を生成：

1. **画像サイズ**: 640px幅（約75%トークン削減）
2. **出力形式**: JPEG（さらにファイルサイズ削減）
3. **品質**: 80%（視認性を維持しつつサイズ削減）
4. **出力情報**: AIが読み込みやすいパス情報を表示

```bash
# AI最適化モード
slide-gen screenshot presentation.yaml --format ai

# 出力例
Screenshots saved (AI-optimized):
  ./screenshots/presentation.001.jpeg (640x360, 45KB)
  ./screenshots/presentation.002.jpeg (640x360, 52KB)
  ./screenshots/presentation.003.jpeg (640x360, 38KB)

Estimated tokens: ~921 (3 images)

To review in Claude Code:
  Read ./screenshots/presentation.001.jpeg
```

### `--contact-sheet` の動作

複数スライドを1枚のタイル画像に結合：

```bash
# コンタクトシート生成
slide-gen screenshot presentation.yaml --contact-sheet

# カラム数指定
slide-gen screenshot presentation.yaml --contact-sheet --columns 3

# AI最適化 + コンタクトシート
slide-gen screenshot presentation.yaml --format ai --contact-sheet
```

**出力例**:

```
Contact sheet saved:
  ./screenshots/presentation-contact.png (1280x1440, 4 slides)

To review in Claude Code:
  Read ./screenshots/presentation-contact.png
```

### 出力形式の比較

| Format | Width | Quality | Est. Tokens/slide | Use Case |
|--------|-------|---------|-------------------|----------|
| `png` | 1280 | Lossless | ~1,229 | 人間向け、高品質 |
| `jpeg` | 1280 | 80% | ~1,229 | ファイルサイズ削減 |
| `ai` | 640 | 80% (JPEG) | ~307 | AI向け、トークン最適化 |

### コンタクトシートのレイアウト

```
┌─────────────────────────────────────┐
│  ┌─────────┐  ┌─────────┐          │
│  │ Slide 1 │  │ Slide 2 │  (2 cols)│
│  └─────────┘  └─────────┘          │
│  ┌─────────┐  ┌─────────┐          │
│  │ Slide 3 │  │ Slide 4 │          │
│  └─────────┘  └─────────┘          │
└─────────────────────────────────────┘
```

- デフォルト: 2カラム
- 最大: 4カラム
- スライド番号を各サムネイルに表示

## TDD Implementation Cycle

各ステップで以下のサイクルを実行:

1. **Red**: 失敗するテストを書く
2. **Green**: テストを通す最小限の実装
3. **Refactor**: `pnpm lint && pnpm typecheck` を実行し、リファクタリング

## Implementation Steps

### Step 1: オプション拡張

**Goal**: `--format ai`, `--contact-sheet`, `--columns`, `--quality` オプションを追加

**Test file**: `src/cli/commands/screenshot.test.ts`

```typescript
describe('screenshot command options', () => {
  it('should accept --format ai option', () => {
    const cmd = createScreenshotCommand();
    const options = cmd.options.map(o => o.long);
    expect(options).toContain('--format');
  });

  it('should accept --contact-sheet option', () => {
    const cmd = createScreenshotCommand();
    const options = cmd.options.map(o => o.long);
    expect(options).toContain('--contact-sheet');
  });

  it('should accept --columns option', () => {
    const cmd = createScreenshotCommand();
    const options = cmd.options.map(o => o.long);
    expect(options).toContain('--columns');
  });

  it('should accept --quality option', () => {
    const cmd = createScreenshotCommand();
    const options = cmd.options.map(o => o.long);
    expect(options).toContain('--quality');
  });
});
```

**Implementation**: `src/cli/commands/screenshot.ts`

```typescript
export interface ScreenshotOptions {
  output?: string;
  slide?: number;
  width?: number;
  format?: 'png' | 'jpeg' | 'ai';
  config?: string;
  verbose?: boolean;
  contactSheet?: boolean;
  columns?: number;
  quality?: number;
}
```

**Verification**:
- [ ] 新オプションが正しく定義される
- [ ] オプションのデフォルト値が正しい

---

### Step 2: AI最適化モード実装

**Goal**: `--format ai` でAI向け最適化を適用

**Test file**: `src/cli/commands/screenshot.test.ts`

```typescript
describe('AI optimization mode', () => {
  it('should set width to 640 for ai format', () => {
    const args = buildMarpCommandArgs('test.md', './out', { format: 'ai' });
    expect(args).toContain('--image-scale');
    // 640 / 1280 = 0.5
    const scaleIndex = args.indexOf('--image-scale');
    expect(args[scaleIndex + 1]).toBe('0.5');
  });

  it('should use jpeg for ai format', () => {
    const args = buildMarpCommandArgs('test.md', './out', { format: 'ai' });
    expect(args).toContain('jpeg');
  });
});
```

**Implementation**:

```typescript
export function buildMarpCommandArgs(
  markdownPath: string,
  outputDir: string,
  options: ScreenshotOptions
): string[] {
  // AI format uses optimized settings
  const isAiFormat = options.format === 'ai';
  const imageFormat = isAiFormat ? 'jpeg' : (options.format || 'png');
  const width = isAiFormat ? 640 : (options.width || 1280);

  const args = ['--images', imageFormat];

  if (width !== 1280) {
    const scale = width / 1280;
    args.push('--image-scale', String(scale));
  }

  // JPEG quality (Marp CLI uses --jpeg-quality)
  if (imageFormat === 'jpeg') {
    const quality = options.quality || 80;
    args.push('--jpeg-quality', String(quality));
  }

  args.push('-o', outputDir);
  args.push(markdownPath);

  return args;
}
```

**Verification**:
- [ ] `--format ai` で640px幅になる
- [ ] `--format ai` でJPEG出力になる
- [ ] `--quality` オプションが反映される

---

### Step 3: トークン推定表示

**Goal**: AI最適化モード時にトークン消費の推定値を表示

**Test file**: `src/cli/commands/screenshot.test.ts`

```typescript
describe('token estimation', () => {
  it('should calculate tokens for 640x360 image', () => {
    const tokens = estimateTokens(640, 360);
    expect(tokens).toBe(307); // (640 * 360) / 750
  });

  it('should calculate total tokens for multiple slides', () => {
    const total = estimateTotalTokens(640, 360, 5);
    expect(total).toBe(1535); // 307 * 5
  });
});
```

**Implementation**:

```typescript
/**
 * Estimate Claude API token consumption for an image
 * Formula: (width * height) / 750
 */
export function estimateTokens(width: number, height: number): number {
  return Math.ceil((width * height) / 750);
}

/**
 * Estimate total tokens for multiple images
 */
export function estimateTotalTokens(
  width: number,
  height: number,
  count: number
): number {
  return estimateTokens(width, height) * count;
}
```

**Verification**:
- [ ] トークン推定値が正しく計算される
- [ ] 複数スライドの合計が正しい

---

### Step 4: コンタクトシート生成

**Goal**: `--contact-sheet` オプションで複数スライドを1枚に結合

**Test file**: `src/cli/commands/screenshot.test.ts`

```typescript
describe('contact sheet', () => {
  it('should generate contact sheet from slide images', async () => {
    const slides = [
      { path: 'slide.001.png', index: 1 },
      { path: 'slide.002.png', index: 2 },
      { path: 'slide.003.png', index: 3 },
      { path: 'slide.004.png', index: 4 },
    ];

    const result = await generateContactSheet(slides, {
      outputPath: 'contact.png',
      columns: 2,
    });

    expect(result.success).toBe(true);
    expect(result.outputPath).toBe('contact.png');
  });

  it('should calculate grid dimensions', () => {
    const dims = calculateGridDimensions(6, 2);
    expect(dims.rows).toBe(3);
    expect(dims.columns).toBe(2);
  });
});
```

**Implementation**: `src/cli/commands/screenshot.ts`

```typescript
import sharp from 'sharp';

export interface ContactSheetOptions {
  outputPath: string;
  columns: number;
  slideWidth?: number;
  slideHeight?: number;
  padding?: number;
  showNumbers?: boolean;
}

export interface ContactSheetResult {
  success: boolean;
  outputPath?: string;
  error?: string;
}

/**
 * Calculate grid dimensions for contact sheet
 */
export function calculateGridDimensions(
  slideCount: number,
  columns: number
): { rows: number; columns: number } {
  const rows = Math.ceil(slideCount / columns);
  return { rows, columns };
}

/**
 * Generate contact sheet from slide images
 */
export async function generateContactSheet(
  slides: Array<{ path: string; index: number }>,
  options: ContactSheetOptions
): Promise<ContactSheetResult> {
  const { columns, padding = 10, showNumbers = true } = options;
  const slideWidth = options.slideWidth || 640;
  const slideHeight = options.slideHeight || 360;

  const { rows } = calculateGridDimensions(slides.length, columns);

  const canvasWidth = columns * slideWidth + (columns + 1) * padding;
  const canvasHeight = rows * slideHeight + (rows + 1) * padding;

  // Create canvas and composite images
  const composites: sharp.OverlayOptions[] = [];

  for (let i = 0; i < slides.length; i++) {
    const slide = slides[i]!;
    const col = i % columns;
    const row = Math.floor(i / columns);

    const x = padding + col * (slideWidth + padding);
    const y = padding + row * (slideHeight + padding);

    // Resize slide image
    const resized = await sharp(slide.path)
      .resize(slideWidth, slideHeight, { fit: 'contain' })
      .toBuffer();

    composites.push({
      input: resized,
      left: x,
      top: y,
    });

    // Add slide number overlay if requested
    if (showNumbers) {
      const numberOverlay = await createNumberOverlay(slide.index, slideWidth);
      composites.push({
        input: numberOverlay,
        left: x,
        top: y + slideHeight - 30,
      });
    }
  }

  // Create final image
  await sharp({
    create: {
      width: canvasWidth,
      height: canvasHeight,
      channels: 4,
      background: { r: 245, g: 245, b: 245, alpha: 1 },
    },
  })
    .composite(composites)
    .png()
    .toFile(options.outputPath);

  return {
    success: true,
    outputPath: options.outputPath,
  };
}

/**
 * Create slide number overlay
 */
async function createNumberOverlay(
  number: number,
  width: number
): Promise<Buffer> {
  const svg = `
    <svg width="${width}" height="30">
      <rect width="${width}" height="30" fill="rgba(0,0,0,0.6)"/>
      <text x="10" y="22" font-family="sans-serif" font-size="16" fill="white">
        Slide ${number}
      </text>
    </svg>
  `;
  return Buffer.from(svg);
}
```

**Verification**:
- [ ] グリッド計算が正しい
- [ ] 画像が正しく配置される
- [ ] スライド番号が表示される

---

### Step 5: 出力メッセージの最適化

**Goal**: AIが利用しやすい出力メッセージを生成

**Test file**: `src/cli/commands/screenshot.test.ts`

```typescript
describe('AI-friendly output', () => {
  it('should format output for AI consumption', () => {
    const output = formatAiOutput({
      files: ['slide.001.jpeg', 'slide.002.jpeg'],
      width: 640,
      height: 360,
      outputDir: './screenshots',
    });

    expect(output).toContain('Estimated tokens');
    expect(output).toContain('Read ./screenshots/slide.001.jpeg');
  });
});
```

**Implementation**:

```typescript
export interface AiOutputOptions {
  files: string[];
  width: number;
  height: number;
  outputDir: string;
}

/**
 * Format output message for AI consumption
 */
export function formatAiOutput(options: AiOutputOptions): string {
  const { files, width, height, outputDir } = options;
  const tokensPerImage = estimateTokens(width, height);
  const totalTokens = tokensPerImage * files.length;

  const lines: string[] = [
    'Screenshots saved (AI-optimized):',
    '',
  ];

  for (const file of files) {
    lines.push(`  ${join(outputDir, file)}`);
  }

  lines.push('');
  lines.push(`Estimated tokens: ~${totalTokens} (${files.length} images)`);
  lines.push('');
  lines.push('To review in Claude Code:');
  lines.push(`  Read ${join(outputDir, files[0]!)}`);

  return lines.join('\n');
}
```

**Verification**:
- [ ] トークン推定値が表示される
- [ ] Claude Code用のコマンドが表示される

---

### Step 6: CLI統合

**Goal**: 全オプションをCLIに統合

**Implementation**: `src/cli/commands/screenshot.ts`

```typescript
export function createScreenshotCommand(): Command {
  return new Command('screenshot')
    .description('Take screenshots of slides (requires Marp CLI)')
    .argument('<input>', 'Source YAML file')
    .option('-o, --output <path>', 'Output directory', './screenshots')
    .option('-s, --slide <number>', 'Specific slide number (1-based)', parseInt)
    .option('-w, --width <pixels>', 'Image width', parseInt, 1280)
    .option('-f, --format <fmt>', 'Output format (png/jpeg/ai)', 'png')
    .option('-q, --quality <num>', 'JPEG quality (1-100)', parseInt, 80)
    .option('--contact-sheet', 'Generate contact sheet')
    .option('--columns <num>', 'Contact sheet columns', parseInt, 2)
    .option('-c, --config <path>', 'Config file path')
    .option('-v, --verbose', 'Verbose output')
    .action(async (input: string, options: ScreenshotOptions) => {
      await executeScreenshot(input, options);
    });
}
```

**Verification**:
- [ ] `slide-gen screenshot --help` で全オプションが表示される
- [ ] 各オプションが正しく動作する

---

## E2E Test (必須)

**Test file**: `tests/e2e/cli-screenshot-ai.test.ts`

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdir, rm, readdir, writeFile, stat } from 'fs/promises';
import { join } from 'path';
import { execSync } from 'child_process';

describe('E2E: screenshot AI optimization', () => {
  const testDir = join(process.cwd(), 'test-output', 'e2e-screenshot-ai');
  const yamlPath = join(testDir, 'test.yaml');

  beforeEach(async () => {
    await rm(testDir, { recursive: true, force: true });
    await mkdir(testDir, { recursive: true });

    await writeFile(yamlPath, `
meta:
  title: Test
slides:
  - template: title
    content:
      title: Test Slide 1
  - template: bullet-list
    content:
      title: Content
      items:
        - Item 1
        - Item 2
  - template: section
    content:
      title: Section
  - template: bullet-list
    content:
      title: More Content
      items:
        - Item 3
`);
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it('should generate AI-optimized screenshots', async () => {
    const outputDir = join(testDir, 'screenshots');

    execSync(
      `node dist/cli/index.js screenshot ${yamlPath} -o ${outputDir} --format ai`,
      { stdio: 'pipe' }
    );

    const files = await readdir(outputDir);
    expect(files.some(f => f.endsWith('.jpeg'))).toBe(true);

    // Check file size is smaller than default
    const firstFile = files.find(f => f.endsWith('.jpeg'))!;
    const fileStat = await stat(join(outputDir, firstFile));
    // AI-optimized should be smaller
    expect(fileStat.size).toBeLessThan(500000); // Less than 500KB
  });

  it('should generate contact sheet', async () => {
    const outputDir = join(testDir, 'screenshots');

    execSync(
      `node dist/cli/index.js screenshot ${yamlPath} -o ${outputDir} --contact-sheet`,
      { stdio: 'pipe' }
    );

    const files = await readdir(outputDir);
    expect(files.some(f => f.includes('contact'))).toBe(true);
  });

  it('should show token estimation for AI format', async () => {
    const outputDir = join(testDir, 'screenshots');

    const output = execSync(
      `node dist/cli/index.js screenshot ${yamlPath} -o ${outputDir} --format ai`,
      { encoding: 'utf-8' }
    );

    expect(output).toContain('Estimated tokens');
  });
});
```

## Acceptance Criteria

- [ ] 全てのテストが通る (`pnpm test`)
- [ ] 型チェックが通る (`pnpm typecheck`)
- [ ] リントが通る (`pnpm lint`)
- [ ] `--format ai` でトークン最適化された画像が生成される
- [ ] `--contact-sheet` でコンタクトシートが生成される
- [ ] トークン推定値が表示される
- [ ] E2Eテストが通る（Marp CLI環境）

## Files Changed

### Screenshot機能拡張
- [ ] `src/cli/commands/screenshot.ts` - オプション追加、AI最適化実装
- [ ] `src/cli/commands/screenshot.test.ts` - テスト追加
- [ ] `tests/e2e/cli-screenshot-ai.test.ts` - E2Eテスト新規作成
- [ ] `spec/cli.md` - ドキュメント更新

### AI教示ドキュメント（発見性の確保）
- [ ] `src/cli/templates/ai/claude-md.ts` - **Visual Reviewセクション追加（Layer 1）**
- [ ] `src/cli/templates/ai/commands/slide-review.ts` - **新設Slash Command（Layer 2）**
- [ ] `src/cli/templates/ai/commands/index.ts` - export追加
- [ ] `src/cli/templates/ai/commands/slide-screenshot.ts` - ワークフロー説明強化
- [ ] `src/cli/templates/ai/skill-md.ts` - Visual Feedback Loopセクション追加
- [ ] `src/cli/templates/ai/references/workflows-ref.ts` - 視覚的レビューフロー追加

## Notes

### sharp依存の追加

コンタクトシート生成には`sharp`パッケージを使用：

```bash
pnpm add sharp
pnpm add -D @types/sharp
```

### Marp CLIのJPEG品質オプション

Marp CLI は `--jpeg-quality` オプションをサポート（v4.0.0以降）。

### トークン消費の目安

| Scenario | Images | Est. Tokens |
|----------|--------|-------------|
| Full review (10 slides, default) | 10 | ~12,290 |
| Full review (10 slides, AI mode) | 10 | ~3,070 |
| Contact sheet (10 slides) | 1 | ~3,000 |
| Single slide review (AI mode) | 1 | ~307 |

### AI向けワークフローの推奨

1. **初回レビュー**: `--contact-sheet` で全体を俯瞰
2. **詳細レビュー**: `--format ai --slide N` で特定スライドを確認
3. **最終確認**: `--format ai` で全スライドを確認

---

## AI教示: Visual Feedback Loop

### 問題1: ワークフローが明示されていない

AIがスライドを作成・調整する際、視覚的フィードバックを得ながら反復的に改善するワークフローが明示されていない。

### 問題2: ドキュメントの発見性（Discoverability）

現状のドキュメント構造では、AIが視覚レビューのワークフローにたどり着く保証がない：

```
現状の読み込みフロー:
  CLAUDE.md → 「SKILLがある」と知る → SKILL.md読む？（任意）
                                        ↓
                                   references/workflows.md？（ほぼ読まれない）
```

### 解決策: 3層構造で確実に誘導

```
┌─────────────────────────────────────────────────────────────┐
│ Layer 1: CLAUDE.md（エントリーポイント）                      │
│ 「スライドを作成・編集したら必ず視覚レビューを実行」と明記      │
│ → /slide-review コマンドへの誘導                             │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ Layer 2: /slide-review（新設Slash Command）                  │
│ 視覚レビューの具体的な手順を実行                              │
│ → screenshot撮影 → Read → 問題特定 → 修正                   │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ Layer 3: SKILL.md + workflows-ref.md                        │
│ 詳細なワークフロー、チェックリスト、ベストプラクティス         │
└─────────────────────────────────────────────────────────────┘
```

### CLAUDE.md への追加内容（Layer 1）

```markdown
## Important: Visual Review

**After creating or editing slides, always run visual review:**

\`\`\`bash
/slide-review
\`\`\`

Or manually:
1. \`slide-gen screenshot presentation.yaml --format ai\`
2. \`Read ./screenshots/presentation.001.jpeg\`
3. Check layout, text overflow, visual balance
4. Edit and repeat until satisfied

This ensures slides look correct before delivery.
```

### 新設 /slide-review コマンド（Layer 2）

**File**: `src/cli/templates/ai/commands/slide-review.ts`

```typescript
export function generateSlideReviewCommand(): string {
  return `Review slides visually and iterate on improvements.

## Workflow

1. **Take AI-optimized screenshots**:
   \`\`\`bash
   slide-gen screenshot $ARGUMENTS --format ai
   \`\`\`
   If no argument: \`slide-gen screenshot presentation.yaml --format ai\`

2. **Review each slide image**:
   \`\`\`
   Read ./screenshots/presentation.001.jpeg
   Read ./screenshots/presentation.002.jpeg
   ...
   \`\`\`

3. **Check for issues**:
   - Text overflow or awkward wrapping
   - Poor visual balance (too empty / too cluttered)
   - Icon appropriateness
   - Color contrast and readability
   - Diagram clarity

4. **Report findings** to user with specific slide numbers

5. **If issues found**, edit presentation.yaml and repeat from step 1

## Quick Overview

For a quick overview of all slides:
\`\`\`bash
slide-gen screenshot presentation.yaml --contact-sheet
Read ./screenshots/presentation-contact.png
\`\`\`

## Token Efficiency

Always use \`--format ai\` for ~75% token reduction:
- Default: ~1,229 tokens/slide
- AI mode: ~307 tokens/slide
`;
}
```

### Files Changed（追加）

```
- src/cli/templates/ai/commands/slide-review.ts - 新設Slash Command
- src/cli/templates/ai/commands/index.ts - export追加
- src/cli/templates/ai/claude-md.ts - Visual Reviewセクション追加
```

### 解決策の詳細

AI向けドキュメント（SKILL.md、workflows-ref.ts）に「Visual Feedback Loop」セクションを追加し、具体的な手順を示す。

### SKILL.md への追加内容

```markdown
## Visual Feedback Loop

After creating or modifying slides, use this workflow to review and iterate:

### Step 1: Take Screenshot
\`\`\`bash
# AI-optimized format (recommended)
slide-gen screenshot presentation.yaml --format ai

# Or contact sheet for overview
slide-gen screenshot presentation.yaml --contact-sheet
\`\`\`

### Step 2: Review Images
Use the Read tool to view the generated screenshots:
\`\`\`
Read ./screenshots/presentation.001.jpeg
\`\`\`

### Step 3: Identify Issues
Look for:
- Layout problems (text overflow, alignment)
- Visual balance (too much/little content)
- Icon and color appropriateness
- Readability of text and diagrams

### Step 4: Make Adjustments
Edit presentation.yaml to fix identified issues.

### Step 5: Repeat
Take new screenshots and verify improvements.

### Example Iteration Cycle

1. Create initial slides
2. \`slide-gen screenshot presentation.yaml --format ai --slide 3\`
3. \`Read ./screenshots/presentation.003.jpeg\`
4. Notice: "Title text is too long, wrapping awkwardly"
5. Edit presentation.yaml to shorten title
6. \`slide-gen screenshot presentation.yaml --format ai --slide 3\`
7. \`Read ./screenshots/presentation.003.jpeg\`
8. Verify fix, move to next slide
```

### workflows-ref.ts への追加内容

```markdown
## Visual Review Flow

### When to Use Visual Review

- After initial slide creation
- When adjusting layouts or styling
- Before final delivery
- When user reports visual issues

### Quick Review Workflow

1. **Generate screenshots**:
   \`\`\`bash
   slide-gen screenshot presentation.yaml --format ai
   \`\`\`

2. **Review each slide**:
   \`\`\`
   Read ./screenshots/presentation.001.jpeg
   Read ./screenshots/presentation.002.jpeg
   ...
   \`\`\`

3. **Document issues** found in each slide

4. **Make batch edits** to presentation.yaml

5. **Regenerate and verify**:
   \`\`\`bash
   slide-gen screenshot presentation.yaml --format ai
   \`\`\`

### Contact Sheet Review

For quick overview of all slides:

1. **Generate contact sheet**:
   \`\`\`bash
   slide-gen screenshot presentation.yaml --contact-sheet
   \`\`\`

2. **Review overview**:
   \`\`\`
   Read ./screenshots/presentation-contact.png
   \`\`\`

3. **Identify slides needing attention**

4. **Deep dive on specific slides**:
   \`\`\`bash
   slide-gen screenshot presentation.yaml --format ai --slide 5
   \`\`\`

### Common Visual Issues to Check

| Issue | What to Look For | Fix |
|-------|------------------|-----|
| Text overflow | Text cut off or wrapped | Shorten text, use bullet-list |
| Empty space | Large blank areas | Add content or use different template |
| Cluttered | Too much content | Split into multiple slides |
| Poor contrast | Hard to read text | Adjust colors in theme |
| Icon mismatch | Icon doesn't fit context | Search for better icon |
```

### slide-screenshot.ts への追加内容

```markdown
Take screenshots of slides for AI review.

## Command

\`\`\`bash
slide-gen screenshot $ARGUMENTS
\`\`\`

If no argument provided:
\`\`\`bash
slide-gen screenshot presentation.yaml --format ai
\`\`\`

## Options

- \`--format ai\`: AI-optimized output (640px, JPEG, token-efficient)
- \`--slide <number>\`: Screenshot specific slide only
- \`--contact-sheet\`: Generate overview of all slides
- \`--width <pixels>\`: Image width (default: 1280, ai mode: 640)
- \`--output <dir>\`: Output directory

## Visual Feedback Workflow

1. Take screenshot: \`slide-gen screenshot presentation.yaml --format ai\`
2. Review image: \`Read ./screenshots/presentation.001.jpeg\`
3. Identify issues (layout, text, icons)
4. Edit presentation.yaml
5. Repeat until satisfied

## Token Efficiency

Use \`--format ai\` to reduce token consumption by ~75%:
- Default (1280px): ~1,229 tokens/slide
- AI mode (640px): ~307 tokens/slide
```

### spec/cli.md への追記内容

```markdown
## screenshot

Takes screenshots of slides (Marp CLI integration).

### Options

| Option | Short | Description | Default |
|--------|-------|-------------|---------|
| `--output <path>` | `-o` | Output directory | `./screenshots` |
| `--slide <number>` | `-s` | Specific slide only (1-based) | All slides |
| `--width <pixels>` | `-w` | Image width | `1280` |
| `--format <fmt>` | `-f` | Output format (png/jpeg/ai) | `png` |
| `--quality <num>` | `-q` | JPEG quality (1-100) | `80` |
| `--contact-sheet` | | Generate contact sheet | `false` |
| `--columns <num>` | | Contact sheet columns | `2` |

### AI Optimization Mode

Use `--format ai` for token-efficient screenshots optimized for AI review:

```bash
# AI-optimized screenshots (640px width, JPEG)
slide-gen screenshot presentation.yaml --format ai

# Contact sheet for overview
slide-gen screenshot presentation.yaml --contact-sheet

# Combined: AI-optimized contact sheet
slide-gen screenshot presentation.yaml --format ai --contact-sheet
```

The AI format:
- Uses 640px width (75% token reduction)
- Outputs JPEG format
- Shows estimated token consumption
- Provides Claude Code read commands
```
