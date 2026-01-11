# Task: 画像管理機能

## Purpose

スライドで使用する画像（写真・図版）の管理機能を実装する。画像テンプレート、メタデータ管理、AI協働フローをサポートし、ユーザーとAIが効率的に画像を扱えるようにする。

## Context

- **関連仕様**: [spec/images.md](../images.md)
- **依存タスク**: [19-layout-templates](./completed/19-layout-templates.md), [11-cli-convert](./completed/11-cli-convert.md)
- **関連ソース**: `src/templates/`, `src/cli/commands/`

## TDD Implementation Cycle

各ステップで以下のサイクルを実行:

1. **Red**: 失敗するテストを書く
2. **Green**: テストを通す最小限の実装
3. **Refactor**: `pnpm lint && pnpm typecheck` を実行し、リファクタリング

## Implementation Steps

### Step 1: 画像テンプレートの追加

**Goal**: image-full, image-text, image-caption, image-grid, before-after テンプレートを実装

**Test file**: `src/templates/layouts/image-templates.test.ts`

```typescript
describe('Image Templates', () => {
  describe('image-full', () => {
    it('should render full-screen image with optional overlay', () => {
      const content = {
        image: 'images/photos/hero.jpg',
        title: 'Hero Image',
        overlay: 'dark'
      };
      const result = renderTemplate('image-full', content);
      expect(result).toContain('background-image');
      expect(result).toContain('overlay-dark');
    });
  });

  describe('image-text', () => {
    it('should render image with text side by side', () => {
      const content = {
        title: 'Title',
        image: 'images/photos/product.jpg',
        image_position: 'left',
        items: ['Item 1', 'Item 2']
      };
      const result = renderTemplate('image-text', content);
      expect(result).toContain('layout-left');
    });
  });

  describe('image-grid', () => {
    it('should render multiple images in grid', () => {
      const content = {
        title: 'Gallery',
        images: [
          { src: 'img1.jpg', caption: 'Image 1' },
          { src: 'img2.jpg', caption: 'Image 2' }
        ],
        layout: '2x1'
      };
      const result = renderTemplate('image-grid', content);
      expect(result).toContain('grid');
    });
  });

  describe('before-after', () => {
    it('should render before/after comparison', () => {
      const content = {
        title: 'Comparison',
        before: { image: 'before.jpg', label: 'Before' },
        after: { image: 'after.jpg', label: 'After' }
      };
      const result = renderTemplate('before-after', content);
      expect(result).toContain('Before');
      expect(result).toContain('After');
    });
  });
});
```

**Implementation**: `templates/layouts/image-*.yaml`

**Verification**:
- [ ] 全ての画像テンプレートが正しくレンダリングされる
- [ ] オプションパラメータが適切にデフォルト値を持つ

---

### Step 2: 画像メタデータスキーマの定義

**Goal**: 画像メタデータのZodスキーマを定義

**Test file**: `src/images/schema.test.ts`

```typescript
describe('Image Metadata Schema', () => {
  it('should validate individual metadata file', () => {
    const metadata = {
      description: 'Test image',
      captured_date: '2024-12-15',
      permissions: {
        status: 'approved',
        approved_by: 'John Doe'
      },
      tags: ['test', 'sample']
    };
    const result = individualMetadataSchema.safeParse(metadata);
    expect(result.success).toBe(true);
  });

  it('should validate directory metadata file', () => {
    const metadata = {
      _defaults: {
        permissions: { status: 'approved' }
      },
      'image1.jpg': {
        description: 'Image 1'
      }
    };
    const result = directoryMetadataSchema.safeParse(metadata);
    expect(result.success).toBe(true);
  });

  it('should reject invalid permission status', () => {
    const metadata = {
      permissions: { status: 'invalid' }
    };
    const result = individualMetadataSchema.safeParse(metadata);
    expect(result.success).toBe(false);
  });
});
```

**Implementation**: `src/images/schema.ts`

```typescript
import { z } from 'zod';

export const permissionStatusSchema = z.enum([
  'approved', 'pending', 'restricted', 'rejected'
]);

export const permissionsSchema = z.object({
  status: permissionStatusSchema,
  approved_by: z.string().optional(),
  approved_date: z.string().optional(),
  expires: z.string().nullable().optional(),
  conditions: z.array(z.string()).optional(),
  document: z.string().optional(),
  pending_contact: z.string().optional(),
});

export const creditsSchema = z.object({
  required: z.boolean().optional(),
  text: z.string().optional(),
});

export const individualMetadataSchema = z.object({
  description: z.string().optional(),
  captured_date: z.string().optional(),
  captured_by: z.string().optional(),
  location: z.string().optional(),
  subject: z.union([z.string(), z.array(z.string())]).optional(),
  permissions: permissionsSchema.optional(),
  restrictions: z.array(z.string()).optional(),
  notes: z.string().optional(),
  credits: creditsSchema.optional(),
  tags: z.array(z.string()).optional(),
});

export const directoryMetadataSchema = z.record(
  z.union([
    individualMetadataSchema,
    z.object({ _defaults: individualMetadataSchema.partial() })
  ])
);
```

**Verification**:
- [ ] 全てのメタデータフィールドが正しく検証される
- [ ] 無効なデータが拒否される

---

### Step 3: メタデータローダーの実装

**Goal**: 個別/ディレクトリメタデータを読み込むローダーを実装

**Test file**: `src/images/metadata-loader.test.ts`

```typescript
describe('ImageMetadataLoader', () => {
  it('should load individual metadata file', async () => {
    // Setup: Create test.jpg.meta.yaml
    const loader = new ImageMetadataLoader();
    const metadata = await loader.load('test.jpg');
    expect(metadata.description).toBe('Test image');
  });

  it('should load from directory metadata file', async () => {
    // Setup: Create images.yaml with test.jpg entry
    const loader = new ImageMetadataLoader();
    const metadata = await loader.load('test.jpg');
    expect(metadata.description).toBe('Test image');
  });

  it('should prioritize individual over directory metadata', async () => {
    // Setup: Create both files with different descriptions
    const loader = new ImageMetadataLoader();
    const metadata = await loader.load('test.jpg');
    expect(metadata.description).toBe('Individual description');
  });

  it('should apply directory defaults', async () => {
    const loader = new ImageMetadataLoader();
    const metadata = await loader.load('test.jpg');
    expect(metadata.permissions?.status).toBe('approved');
  });

  it('should return empty metadata if no file found', async () => {
    const loader = new ImageMetadataLoader();
    const metadata = await loader.load('nonexistent.jpg');
    expect(metadata).toEqual({});
  });
});
```

**Implementation**: `src/images/metadata-loader.ts`

```typescript
export class ImageMetadataLoader {
  constructor(private baseDir: string = 'images') {}

  async load(imagePath: string): Promise<ImageMetadata> {
    // 1. Check for individual .meta.yaml
    // 2. Check for directory images.yaml
    // 3. Apply defaults and merge
    // 4. Return metadata or empty object
  }

  async loadDirectory(dirPath: string): Promise<Map<string, ImageMetadata>> {
    // Load all metadata for images in a directory
  }
}
```

**Verification**:
- [ ] 個別メタデータファイルが正しく読み込まれる
- [ ] ディレクトリメタデータが正しく読み込まれる
- [ ] 優先順位が正しく適用される

---

### Step 4: 画像検証機能の拡張

**Goal**: validateコマンドに画像チェック機能を追加

**Test file**: `src/cli/commands/validate.test.ts`

```typescript
describe('validate command - images', () => {
  it('should check if referenced images exist', async () => {
    const result = await validatePresentation('test.yaml');
    expect(result.errors).toContain('Image not found: images/missing.jpg');
  });

  it('should warn about low resolution images', async () => {
    const result = await validatePresentation('test.yaml');
    expect(result.warnings).toContain('Low resolution: images/small.jpg');
  });

  it('should report pending permissions', async () => {
    const result = await validatePresentation('test.yaml', { checkImages: true });
    expect(result.warnings).toContain('Pending permission: customer.jpg');
  });
});
```

**Implementation**: `src/cli/commands/validate.ts`

```typescript
async function validateImages(
  presentation: Presentation,
  options: ValidateOptions
): Promise<ValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const image of extractImageReferences(presentation)) {
    // Check file exists
    // Check resolution (warning)
    // Check metadata permissions if --check-images
  }

  return { errors, warnings };
}
```

**Verification**:
- [ ] 不足画像がエラーとして検出される
- [ ] 低解像度画像が警告される
- [ ] 許可状況がチェックされる

---

### Step 5: images CLI コマンドの実装

**Goal**: `slide-gen images` サブコマンドを実装

**Test file**: `src/cli/commands/images.test.ts`

```typescript
describe('images command', () => {
  describe('images status', () => {
    it('should list image permission status', async () => {
      const output = await executeImagesStatus('presentation.yaml');
      expect(output).toContain('Approved (3)');
      expect(output).toContain('Pending (1)');
    });
  });

  describe('images request', () => {
    it('should generate missing image request list', async () => {
      const output = await executeImagesRequest('presentation.yaml');
      expect(output).toContain('missing_images:');
      expect(output).toContain('customer-site.jpg');
    });
  });
});
```

**Implementation**: `src/cli/commands/images.ts`

```typescript
export function createImagesCommand(): Command {
  const cmd = new Command('images')
    .description('Manage presentation images');

  cmd.addCommand(createImagesStatusCommand());
  cmd.addCommand(createImagesRequestCommand());

  return cmd;
}

function createImagesStatusCommand(): Command {
  return new Command('status')
    .description('Show image permission status')
    .argument('<input>', 'Presentation YAML file')
    .action(async (input) => {
      // Implementation
    });
}

function createImagesRequestCommand(): Command {
  return new Command('request')
    .description('Generate missing image request list')
    .argument('<input>', 'Presentation YAML file')
    .option('--format <format>', 'Output format (text|llm)', 'text')
    .action(async (input, options) => {
      // Implementation
    });
}
```

**Verification**:
- [ ] `images status` が許可状況を表示する
- [ ] `images request` が不足画像リストを生成する

---

### Step 6: AI向け出力フォーマット

**Goal**: AI協働フロー用の出力フォーマットを実装

**Test file**: `src/cli/commands/images.test.ts`

```typescript
describe('images command - LLM format', () => {
  it('should output YAML format for LLM', async () => {
    const output = await executeImagesRequest('test.yaml', { format: 'llm' });
    const parsed = parseYaml(output);
    expect(parsed.missing_images).toBeInstanceOf(Array);
    expect(parsed.missing_images[0]).toHaveProperty('path');
    expect(parsed.missing_images[0]).toHaveProperty('context');
  });
});
```

**Verification**:
- [ ] LLMフォーマットがYAML形式で出力される
- [ ] コンテキスト情報が含まれる

---

## E2E Test (必須)

**Test file**: `tests/e2e/images.test.ts`

```typescript
describe('E2E: Image Management', () => {
  it('should validate presentation with images', async () => {
    // Create presentation with image references
    // Run validate command
    // Check errors and warnings
  });

  it('should generate image status report', async () => {
    // Create presentation with metadata
    // Run images status command
    // Verify output format
  });

  it('should render image templates correctly', async () => {
    // Create presentation with image-text template
    // Run convert command
    // Verify output HTML
  });
});
```

**Verification**:
- [ ] 実際のファイルI/Oでテストが通る
- [ ] 画像テンプレートが正しくレンダリングされる
- [ ] メタデータが正しく読み込まれる

---

## Acceptance Criteria

- [ ] 全てのテストが通る (`pnpm test`)
- [ ] 型チェックが通る (`pnpm typecheck`)
- [ ] リントが通る (`pnpm lint`)
- [ ] E2Eテストが通る
- [ ] 画像テンプレート (image-full, image-text, image-caption, image-grid, before-after) が動作する
- [ ] 画像メタデータ（個別/.meta.yaml、ディレクトリ/images.yaml）が読み込める
- [ ] `slide-gen validate` が画像の存在・解像度・許可状況をチェックする
- [ ] `slide-gen images status` が許可状況を表示する
- [ ] `slide-gen images request --format llm` がAI向け出力を生成する

## Files Changed

- [ ] `templates/layouts/image-full.yaml` - 新規作成
- [ ] `templates/layouts/image-text.yaml` - 新規作成
- [ ] `templates/layouts/image-caption.yaml` - 新規作成
- [ ] `templates/layouts/image-grid.yaml` - 新規作成
- [ ] `templates/layouts/before-after.yaml` - 新規作成
- [ ] `src/images/schema.ts` - 新規作成
- [ ] `src/images/metadata-loader.ts` - 新規作成
- [ ] `src/images/index.ts` - 新規作成
- [ ] `src/cli/commands/images.ts` - 新規作成
- [ ] `src/cli/commands/validate.ts` - 画像検証追加
- [ ] `src/cli/index.ts` - imagesコマンド追加

## Notes

- メタデータファイルはオプション。存在しない場合は空のメタデータとして扱う
- 画像解像度チェックは警告のみ（エラーにはしない）
- AI協働フローでは、メタデータのpermissions.statusを重視
