# Task: プレビュー機能拡張

## Purpose

ユーザーがブラウザでスライド一覧やテンプレートを視覚的に確認できるようにする。

## Context

- **関連仕様**: [spec/ai-integration.md](../ai-integration.md), [spec/cli.md](../cli.md)
- **依存タスク**: [16-cli-watch-preview](./completed/16-cli-watch-preview.md), [13-cli-templates](./completed/13-cli-templates.md), [23-screenshot-command](./23-screenshot-command.md)
- **関連ソース**: `src/cli/commands/preview.ts`, `src/cli/commands/templates.ts`

## Prerequisites

- Task 23 (Screenshot Command) must be completed first
- Gallery mode uses screenshot functionality internally

## TDD Implementation Cycle

各ステップで以下のサイクルを実行:

1. **Red**: 失敗するテストを書く
2. **Green**: テストを通す最小限の実装
3. **Refactor**: `pnpm lint && pnpm typecheck` を実行し、リファクタリング

## Implementation Steps

### Step 1: preview --gallery オプション追加

**Goal**: previewコマンドにギャラリーモードを追加

**Test file**: `src/cli/commands/preview.test.ts`

```typescript
describe('preview command - gallery mode', () => {
  it('should accept --gallery option', () => {
    const cmd = createPreviewCommand();
    const options = cmd.options.map(o => o.long);
    expect(options).toContain('--gallery');
  });

  it('should accept --slide option', () => {
    const cmd = createPreviewCommand();
    const options = cmd.options.map(o => o.long);
    expect(options).toContain('--slide');
  });
});
```

**Implementation**: `src/cli/commands/preview.ts`

```typescript
export interface PreviewOptions {
  port?: number;
  watch?: boolean;
  gallery?: boolean;  // 追加
  slide?: number;     // 追加
}

export function createPreviewCommand(): Command {
  return new Command('preview')
    // ...
    .option('-g, --gallery', 'Show thumbnail gallery')
    .option('-s, --slide <number>', 'Show specific slide', parseInt)
    // ...
}
```

**Verification**:
- [ ] `--gallery` オプションが認識される
- [ ] `--slide` オプションが認識される

---

### Step 2: ギャラリーHTML生成

**Goal**: サムネイル一覧のHTMLを生成

**Test file**: `src/cli/commands/preview.test.ts`

```typescript
describe('generateGalleryHtml', () => {
  it('should generate HTML with thumbnails', () => {
    const html = generateGalleryHtml([
      { path: 'slide-001.png', title: 'Title' },
      { path: 'slide-002.png', title: 'Content' },
    ]);
    expect(html).toContain('slide-001.png');
    expect(html).toContain('slide-002.png');
    expect(html).toContain('gallery');
  });
});
```

**Implementation**: `src/cli/commands/preview.ts`

```typescript
interface SlideInfo {
  path: string;
  title: string;
  index: number;
}

function generateGalleryHtml(slides: SlideInfo[]): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <title>Slide Gallery</title>
  <style>
    .gallery { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px; padding: 16px; }
    .slide { cursor: pointer; border: 1px solid #ddd; border-radius: 8px; overflow: hidden; }
    .slide img { width: 100%; height: auto; }
    .slide-title { padding: 8px; text-align: center; font-size: 14px; }
    .modal { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); }
    .modal img { max-width: 90%; max-height: 90%; margin: auto; display: block; margin-top: 5%; }
  </style>
</head>
<body>
  <h1>Slide Gallery</h1>
  <div class="gallery">
    ${slides.map(s => `
      <div class="slide" onclick="showSlide(${s.index})">
        <img src="${s.path}" alt="Slide ${s.index}">
        <div class="slide-title">${s.title}</div>
      </div>
    `).join('')}
  </div>
  <div class="modal" id="modal" onclick="hideSlide()">
    <img id="modal-img" src="">
  </div>
  <script>
    function showSlide(index) { /* ... */ }
    function hideSlide() { /* ... */ }
  </script>
</body>
</html>
  `;
}
```

**Verification**:
- [ ] ギャラリーHTMLが正しく生成される
- [ ] サムネイルがクリック可能

---

### Step 3: ギャラリーモードの実行ロジック

**Goal**: --gallery オプション時にギャラリーを表示

**Implementation**: `src/cli/commands/preview.ts`

```typescript
async function executePreview(input: string, options: PreviewOptions): Promise<void> {
  if (options.gallery) {
    await executeGalleryPreview(input, options);
  } else {
    await executeNormalPreview(input, options);
  }
}

async function executeGalleryPreview(input: string, options: PreviewOptions): Promise<void> {
  // 1. Convert YAML to MD
  // 2. Generate screenshots (temporary)
  // 3. Generate gallery HTML
  // 4. Start server and open browser
}
```

**Verification**:
- [ ] ギャラリーモードが正しく動作する
- [ ] ブラウザで一覧が表示される

---

### Step 4: templates preview サブコマンド追加

**Goal**: テンプレートのプレビュー機能を追加

**Test file**: `src/cli/commands/templates.test.ts`

```typescript
describe('templates preview command', () => {
  it('should accept template name', () => {
    const cmd = createTemplatesCommand();
    const previewCmd = cmd.commands.find(c => c.name() === 'preview');
    expect(previewCmd).toBeDefined();
  });

  it('should accept --all option', () => {
    const cmd = createTemplatesCommand();
    const previewCmd = cmd.commands.find(c => c.name() === 'preview');
    const options = previewCmd?.options.map(o => o.long);
    expect(options).toContain('--all');
  });
});
```

**Implementation**: `src/cli/commands/templates.ts`

```typescript
function createPreviewSubcommand(): Command {
  return new Command('preview')
    .description('Preview template in browser')
    .argument('[name]', 'Template name')
    .option('--all', 'Show all templates')
    .option('--category <cat>', 'Filter by category')
    .action(async (name: string | undefined, options) => {
      await executeTemplatePreview(name, options);
    });
}
```

**Verification**:
- [ ] `slide-gen templates preview <name>` が動作する
- [ ] `slide-gen templates preview --all` が動作する

---

### Step 5: テンプレートプレビューHTML生成

**Goal**: テンプレート情報と画像を含むHTMLを生成

**Implementation**:

```typescript
async function executeTemplatePreview(
  name: string | undefined,
  options: { all?: boolean; category?: string }
): Promise<void> {
  // 1. Get template(s) to preview
  const templates = options.all
    ? await getAllTemplates(options.category)
    : [await getTemplate(name!)];

  // 2. Generate sample slides for each template
  for (const template of templates) {
    const sampleYaml = generateSampleYaml(template);
    await convertAndScreenshot(sampleYaml, template.name);
  }

  // 3. Generate preview HTML
  const html = generateTemplatePreviewHtml(templates);

  // 4. Start server and open browser
  await startPreviewServer(html, options.port);
}
```

**Verification**:
- [ ] テンプレートプレビューが表示される
- [ ] サンプル画像とパラメータ情報が含まれる

---

## E2E Test (必須)

**Test file**: `tests/e2e/cli-preview-gallery.test.ts`

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('E2E: preview gallery mode', () => {
  it('should open browser with gallery', async () => {
    // Note: This test may need to be skipped in CI
    // or use a headless browser check
  });
});

describe('E2E: templates preview', () => {
  it('should open browser with template preview', async () => {
    // Similar to above
  });
});
```

**注意**: ブラウザを開くテストはCI環境では制限があるため、HTMLの生成のみをテストするか、ヘッドレスモードで確認する。

---

## Acceptance Criteria

- [ ] 全てのテストが通る (`pnpm test`)
- [ ] 型チェックが通る (`pnpm typecheck`)
- [ ] リントが通る (`pnpm lint`)
- [ ] `slide-gen preview --gallery` でサムネイル一覧が表示される
- [ ] `slide-gen preview --slide N` で特定スライドが表示される
- [ ] `slide-gen templates preview <name>` でテンプレートプレビューが表示される
- [ ] `slide-gen templates preview --all` で全テンプレート一覧が表示される
- [ ] サムネイルクリックで拡大表示される

## Files Changed

- [ ] `src/cli/commands/preview.ts` - ギャラリーモード追加
- [ ] `src/cli/commands/preview.test.ts` - テスト追加
- [ ] `src/cli/commands/templates.ts` - previewサブコマンド追加
- [ ] `src/cli/commands/templates.test.ts` - テスト追加
- [ ] `tests/e2e/cli-preview-gallery.test.ts` - E2Eテスト新規作成

## Notes

### ギャラリーHTMLの生成

シンプルなHTMLで実装。外部依存なしでブラウザで動作するように。

### 一時ファイルの管理

ギャラリー表示用のスクリーンショットは一時ディレクトリに生成し、プレビュー終了後に削除する。

### Marp CLI依存

この機能もMarp CLIに依存します。未インストール時は適切なエラーメッセージを表示。
