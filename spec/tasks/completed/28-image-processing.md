# Task: Image Processing (Crop/Blur)

## Purpose

Implement image processing capabilities for slide generation, allowing automatic cropping and blur effects to be applied during the conversion process. This enables AI-assisted image adjustments as part of the collaboration workflow.

## Context

- **Related Spec**: [spec/images.md](../images.md) - Phase 4: Adjustment and Iteration
- **Dependencies**: [25-image-management](./25-image-management.md), [11-cli-convert](./completed/11-cli-convert.md)
- **Related Source**: `src/images/`, `src/cli/commands/`

## Prerequisites

- Task 25 (Image Management) must be completed first
- Image metadata system available

## TDD Implementation Cycle

For each step, follow this cycle:

1. **Red**: Write a failing test
2. **Green**: Write minimal implementation to pass the test
3. **Refactor**: Run `pnpm lint && pnpm typecheck` and refactor

## Implementation Steps

### Step 1: Image Processor Interface

**Goal**: Define the interface for image processing operations

**Test file**: `src/images/processor.test.ts`

```typescript
describe('ImageProcessor', () => {
  describe('crop', () => {
    it('should crop image with specified parameters', async () => {
      const processor = new ImageProcessor();
      const result = await processor.crop('input.jpg', {
        left: 0,
        top: 0,
        width: 800,
        height: 600
      }, 'output.jpg');

      expect(result.width).toBe(800);
      expect(result.height).toBe(600);
    });

    it('should crop percentage from edges', async () => {
      const processor = new ImageProcessor();
      const result = await processor.cropEdges('input.jpg', {
        right: 10  // Crop 10% from right edge
      }, 'output.jpg');

      expect(result.success).toBe(true);
    });
  });

  describe('blur', () => {
    it('should apply blur to specified region', async () => {
      const processor = new ImageProcessor();
      const result = await processor.blurRegion('input.jpg', {
        x: 100,
        y: 100,
        width: 50,
        height: 50,
        radius: 10
      }, 'output.jpg');

      expect(result.success).toBe(true);
    });
  });
});
```

**Implementation**: `src/images/processor.ts`

```typescript
interface CropOptions {
  left?: number;
  top?: number;
  width?: number;
  height?: number;
}

interface EdgeCropOptions {
  left?: number;   // Percentage to crop from left
  right?: number;  // Percentage to crop from right
  top?: number;    // Percentage to crop from top
  bottom?: number; // Percentage to crop from bottom
}

interface BlurRegionOptions {
  x: number;
  y: number;
  width: number;
  height: number;
  radius?: number;
}

interface ProcessResult {
  success: boolean;
  outputPath?: string;
  width?: number;
  height?: number;
  error?: string;
}

export class ImageProcessor {
  async crop(inputPath: string, options: CropOptions, outputPath: string): Promise<ProcessResult> {
    // Implementation using sharp or similar library
  }

  async cropEdges(inputPath: string, options: EdgeCropOptions, outputPath: string): Promise<ProcessResult> {
    // Crop percentage from specified edges
  }

  async blurRegion(inputPath: string, options: BlurRegionOptions, outputPath: string): Promise<ProcessResult> {
    // Apply blur to specified region
  }
}
```

**Verification**:
- [ ] Crop operation works correctly
- [ ] Edge percentage crop works correctly
- [ ] Blur region works correctly

---

### Step 2: Image Processing Schema

**Goal**: Define schema for image processing instructions in metadata

**Test file**: `src/images/processing-schema.test.ts`

```typescript
describe('Image Processing Schema', () => {
  it('should validate crop instruction', () => {
    const instruction = {
      type: 'crop',
      edges: { right: 10 }
    };
    const result = imageProcessingSchema.safeParse(instruction);
    expect(result.success).toBe(true);
  });

  it('should validate blur instruction', () => {
    const instruction = {
      type: 'blur',
      region: { x: 100, y: 100, width: 50, height: 50 }
    };
    const result = imageProcessingSchema.safeParse(instruction);
    expect(result.success).toBe(true);
  });

  it('should validate processing in image metadata', () => {
    const metadata = {
      description: 'Product photo',
      processing: [
        { type: 'crop', edges: { right: 10 } }
      ]
    };
    const result = imageMetaSchema.safeParse(metadata);
    expect(result.success).toBe(true);
  });
});
```

**Implementation**: `src/images/processing-schema.ts`

```typescript
import { z } from 'zod';

export const cropInstructionSchema = z.object({
  type: z.literal('crop'),
  edges: z.object({
    left: z.number().min(0).max(50).optional(),
    right: z.number().min(0).max(50).optional(),
    top: z.number().min(0).max(50).optional(),
    bottom: z.number().min(0).max(50).optional()
  }).optional(),
  region: z.object({
    x: z.number(),
    y: z.number(),
    width: z.number(),
    height: z.number()
  }).optional()
});

export const blurInstructionSchema = z.object({
  type: z.literal('blur'),
  region: z.object({
    x: z.number(),
    y: z.number(),
    width: z.number(),
    height: z.number()
  }),
  radius: z.number().default(10)
});

export const imageProcessingSchema = z.discriminatedUnion('type', [
  cropInstructionSchema,
  blurInstructionSchema
]);
```

**Verification**:
- [ ] Crop instruction schema validates correctly
- [ ] Blur instruction schema validates correctly
- [ ] Processing array in metadata validates correctly

---

### Step 3: Processing Integration with Convert Pipeline

**Goal**: Apply image processing during slide conversion

**Test file**: `src/images/pipeline-integration.test.ts`

```typescript
describe('Image Processing Pipeline Integration', () => {
  it('should process images with metadata instructions', async () => {
    // Setup: Create image with processing metadata
    await fs.writeFile('images/test.meta.yaml', `
description: Test image
processing:
  - type: crop
    edges:
      right: 10
`);

    const pipeline = new ConvertPipeline();
    await pipeline.convert('presentation.yaml', { processImages: true });

    // Verify processed image exists
    const processedExists = await fs.pathExists('images/.processed/test.jpg');
    expect(processedExists).toBe(true);
  });

  it('should skip processing if no instructions', async () => {
    const pipeline = new ConvertPipeline();
    const result = await pipeline.convert('presentation.yaml', { processImages: true });

    // Should use original image
    expect(result.processedImages).toBe(0);
  });
});
```

**Implementation**: Update `src/core/pipeline.ts`

```typescript
interface ConvertOptions {
  processImages?: boolean;
  imageOutputDir?: string;
}

// In Pipeline class
async processImagesIfNeeded(imageRefs: string[], options: ConvertOptions): Promise<Map<string, string>> {
  const imageMap = new Map<string, string>();

  if (!options.processImages) {
    return imageMap;
  }

  for (const imageRef of imageRefs) {
    const metaPath = imageRef.replace(/\.[^.]+$/, '.meta.yaml');
    if (await fs.pathExists(metaPath)) {
      const meta = await this.loadImageMeta(metaPath);
      if (meta.processing?.length > 0) {
        const processedPath = await this.processImage(imageRef, meta.processing);
        imageMap.set(imageRef, processedPath);
      }
    }
  }

  return imageMap;
}
```

**Verification**:
- [ ] Images with processing instructions are processed
- [ ] Images without instructions use original
- [ ] Processed images are stored in correct location

---

### Step 4: CLI Option for Image Processing

**Goal**: Add `--process-images` flag to convert command

**Test file**: `src/cli/commands/convert.test.ts`

```typescript
describe('convert command - image processing', () => {
  it('should process images with --process-images flag', async () => {
    const output = await executeConvert('presentation.yaml', {
      processImages: true
    });

    expect(output).toContain('Processed');
  });

  it('should skip processing without flag', async () => {
    const output = await executeConvert('presentation.yaml');

    expect(output).not.toContain('Processed');
  });
});
```

**Implementation**: Update `src/cli/commands/convert.ts`

```typescript
.option('--process-images', 'Apply image processing from metadata')
```

**Verification**:
- [ ] `--process-images` flag works correctly
- [ ] Default behavior (no flag) skips processing

---

### Step 5: images process CLI Command

**Goal**: Standalone command for image processing

**Test file**: `src/cli/commands/images-process.test.ts`

```typescript
describe('images process command', () => {
  it('should process single image with instructions', async () => {
    const output = await executeImagesProcess('images/photo.jpg', {
      crop: 'right:10'
    });

    expect(output).toContain('Processed');
  });

  it('should process all images in directory', async () => {
    const output = await executeImagesProcess('images/', {
      fromMeta: true
    });

    expect(output).toContain('Processed');
  });
});
```

**Implementation**: `src/cli/commands/images-process.ts`

```typescript
export function createImagesProcessCommand(): Command {
  return new Command('process')
    .description('Process images (crop, blur)')
    .argument('<path>', 'Image file or directory')
    .option('--crop <spec>', 'Crop specification (e.g., "right:10,bottom:5")')
    .option('--blur <spec>', 'Blur region (e.g., "100,100,50,50")')
    .option('--from-meta', 'Apply processing from metadata files')
    .option('--output <dir>', 'Output directory', '.processed')
    .action(async (path, options) => {
      // Implementation
    });
}
```

**Verification**:
- [ ] Single image processing works
- [ ] Directory processing works
- [ ] Crop specification parsing works
- [ ] Blur specification parsing works

---

## E2E Test

**Test file**: `tests/e2e/image-processing.test.ts`

```typescript
describe('E2E: Image Processing', () => {
  it('should crop image during conversion', async () => {
    // Setup
    await setupTestImage('test-project/images/photo.jpg');
    await fs.writeFile('test-project/images/photo.meta.yaml', `
processing:
  - type: crop
    edges:
      right: 10
`);

    // Execute
    await executeConvert('test-project/presentation.yaml', {
      processImages: true
    });

    // Verify
    const processedExists = await fs.pathExists(
      'test-project/images/.processed/photo.jpg'
    );
    expect(processedExists).toBe(true);
  });

  it('should apply blur to specified region', async () => {
    await setupTestImage('test-project/images/logo-photo.jpg');
    await fs.writeFile('test-project/images/logo-photo.meta.yaml', `
processing:
  - type: blur
    region:
      x: 800
      y: 500
      width: 100
      height: 50
`);

    await executeImagesProcess('test-project/images/logo-photo.jpg', {
      fromMeta: true
    });

    // Visual verification would be manual
    expect(true).toBe(true);
  });
});
```

**Verification**:
- [ ] E2E tests pass
- [ ] Processed images are visually correct (manual check)

---

## Acceptance Criteria

- [ ] All tests pass (`pnpm test`)
- [ ] Type check passes (`pnpm typecheck`)
- [ ] Lint passes (`pnpm lint`)
- [ ] E2E tests pass
- [ ] ImageProcessor handles crop operations
- [ ] ImageProcessor handles blur operations
- [ ] Processing instructions in metadata are validated
- [ ] Convert command supports `--process-images` flag
- [ ] `slide-gen images process` command works
- [ ] Processed images are stored in `.processed/` directory

## Files Changed

- [ ] `src/images/processor.ts` - New: Image processor
- [ ] `src/images/processing-schema.ts` - New: Processing instruction schemas
- [ ] `src/images/index.ts` - Export processor
- [ ] `src/core/pipeline.ts` - Add image processing integration
- [ ] `src/cli/commands/convert.ts` - Add `--process-images` flag
- [ ] `src/cli/commands/images.ts` - Add `process` subcommand
- [ ] `package.json` - Add `sharp` dependency (if using)

## Notes

- Use `sharp` library for image processing (fast, well-maintained)
- Processed images are stored in `.processed/` subdirectory to preserve originals
- Processing is opt-in via `--process-images` flag or explicit command
- Blur processing is for privacy/copyright concerns (hiding logos, faces, etc.)
- Crop percentage is limited to 50% max per edge for safety
