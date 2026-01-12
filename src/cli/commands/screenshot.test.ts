import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { join } from 'path';
import { mkdir, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { randomUUID } from 'crypto';
import {
  createScreenshotCommand,
  ScreenshotOptions,
  estimateTokens,
  estimateTotalTokens,
  calculateGridDimensions,
  formatAiOutput,
} from './screenshot';

describe('screenshot command', () => {
  it('should create command with correct name', () => {
    const cmd = createScreenshotCommand();
    expect(cmd.name()).toBe('screenshot');
  });

  it('should have required options', () => {
    const cmd = createScreenshotCommand();
    const options = cmd.options.map((o) => o.long);
    expect(options).toContain('--output');
    expect(options).toContain('--slide');
    expect(options).toContain('--width');
    expect(options).toContain('--format');
    expect(options).toContain('--quality');
    expect(options).toContain('--contact-sheet');
    expect(options).toContain('--columns');
  });

  it('should have input argument', () => {
    const cmd = createScreenshotCommand();
    expect(cmd.registeredArguments.length).toBe(1);
    expect(cmd.registeredArguments[0]?.name()).toBe('input');
  });

  it('should have correct default values', () => {
    const cmd = createScreenshotCommand();
    const outputOpt = cmd.options.find((o) => o.long === '--output');
    const formatOpt = cmd.options.find((o) => o.long === '--format');
    const widthOpt = cmd.options.find((o) => o.long === '--width');
    const qualityOpt = cmd.options.find((o) => o.long === '--quality');
    const columnsOpt = cmd.options.find((o) => o.long === '--columns');

    expect(outputOpt?.defaultValue).toBe('./screenshots');
    expect(formatOpt?.defaultValue).toBe('png');
    expect(widthOpt?.defaultValue).toBe(1280);
    expect(qualityOpt?.defaultValue).toBe(80);
    expect(columnsOpt?.defaultValue).toBe(2);
  });
});

describe('screenshot command - marp integration', () => {
  it('should build correct marp command args for images', async () => {
    const { buildMarpCommandArgs } = await import('./screenshot');
    const options: ScreenshotOptions = {
      format: 'png',
    };

    const args = buildMarpCommandArgs('/path/to/slides.md', '/output', options);

    // Note: 'marp' command is not included in args - it's handled by runMarp()
    expect(args).toContain('--images');
    expect(args).toContain('png');
  });

  it('should support jpeg format', async () => {
    const { buildMarpCommandArgs } = await import('./screenshot');
    const options: ScreenshotOptions = {
      format: 'jpeg',
    };

    const args = buildMarpCommandArgs('/path/to/slides.md', '/output', options);

    expect(args).toContain('--images');
    expect(args).toContain('jpeg');
  });

  it('should apply image scale based on width', async () => {
    const { buildMarpCommandArgs } = await import('./screenshot');
    const options: ScreenshotOptions = {
      width: 1920,
      format: 'png',
    };

    const args = buildMarpCommandArgs('/path/to/slides.md', '/output', options);

    expect(args).toContain('--image-scale');
    expect(args).toContain('1.5'); // 1920/1280 = 1.5
  });

  it('should not apply image scale for default width', async () => {
    const { buildMarpCommandArgs } = await import('./screenshot');
    const options: ScreenshotOptions = {
      width: 1280,
      format: 'png',
    };

    const args = buildMarpCommandArgs('/path/to/slides.md', '/output', options);

    expect(args).not.toContain('--image-scale');
  });

  it('should handle paths with spaces correctly', async () => {
    const { buildMarpCommandArgs } = await import('./screenshot');
    const options: ScreenshotOptions = {
      format: 'png',
    };

    const args = buildMarpCommandArgs('/path/with spaces/slides.md', '/output dir', options);

    // Args should contain exact paths without escaping (execFileSync handles this)
    expect(args).toContain('/path/with spaces/slides.md');
    expect(args).toContain('/output dir');
  });
});

describe('screenshot command - execution', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = join(tmpdir(), `slide-gen-screenshot-test-${randomUUID()}`);
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it('should require input file to exist', async () => {
    const { executeScreenshot } = await import('./screenshot');
    const nonExistentPath = join(testDir, 'nonexistent.yaml');

    const result = await executeScreenshot(nonExistentPath, {});

    expect(result.success).toBe(false);
    expect(result.errors.some((e) => e.includes('not found'))).toBe(true);
  });

  it('should reject non-YAML files', async () => {
    const { executeScreenshot } = await import('./screenshot');
    const txtPath = join(testDir, 'test.txt');
    await writeFile(txtPath, 'hello');

    const result = await executeScreenshot(txtPath, {});

    expect(result.success).toBe(false);
    expect(result.errors.some((e) => e.includes('Invalid file extension'))).toBe(true);
  });

  it('should accept .yml extension', async () => {
    const { executeScreenshot } = await import('./screenshot');
    const ymlPath = join(testDir, 'nonexistent.yml');

    // File doesn't exist, but extension check should pass
    const result = await executeScreenshot(ymlPath, {});

    // Should fail with "not found" (passes extension check)
    expect(result.success).toBe(false);
    expect(result.errors.some((e) => e.includes('not found'))).toBe(true);
  });

  it('should check for marp-cli availability', async () => {
    const { checkMarpCliAvailable } = await import('./screenshot');
    const available = checkMarpCliAvailable();
    expect(typeof available).toBe('boolean');
  });
});

describe('screenshot command - slide filtering', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = join(tmpdir(), `slide-gen-screenshot-filter-${randomUUID()}`);
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it('should filter specific slide from generated images', async () => {
    const { filterToSpecificSlide } = await import('./screenshot');
    const outputDir = join(testDir, 'screenshots');
    await mkdir(outputDir, { recursive: true });

    // Create mock slide images
    await writeFile(join(outputDir, 'test.001.png'), 'slide1');
    await writeFile(join(outputDir, 'test.002.png'), 'slide2');
    await writeFile(join(outputDir, 'test.003.png'), 'slide3');

    // Filter to slide 2
    const result = await filterToSpecificSlide(outputDir, 'test', 2, 'png');

    expect(result.success).toBe(true);
    expect(result.keptFile).toContain('002');

    // Check that only slide 2 remains
    const { readdir } = await import('fs/promises');
    const files = await readdir(outputDir);
    expect(files.length).toBe(1);
    expect(files[0]).toContain('002');
  });

  it('should return error if slide number is out of range', async () => {
    const { filterToSpecificSlide } = await import('./screenshot');
    const outputDir = join(testDir, 'screenshots');
    await mkdir(outputDir, { recursive: true });

    // Create only 2 slide images
    await writeFile(join(outputDir, 'test.001.png'), 'slide1');
    await writeFile(join(outputDir, 'test.002.png'), 'slide2');

    // Try to filter to non-existent slide 5
    const result = await filterToSpecificSlide(outputDir, 'test', 5, 'png');

    expect(result.success).toBe(false);
    expect(result.error).toContain('not found');
  });

  it('should handle slide number 1', async () => {
    const { filterToSpecificSlide } = await import('./screenshot');
    const outputDir = join(testDir, 'screenshots');
    await mkdir(outputDir, { recursive: true });

    await writeFile(join(outputDir, 'test.001.png'), 'slide1');
    await writeFile(join(outputDir, 'test.002.png'), 'slide2');

    const result = await filterToSpecificSlide(outputDir, 'test', 1, 'png');

    expect(result.success).toBe(true);

    const { readdir } = await import('fs/promises');
    const files = await readdir(outputDir);
    expect(files.length).toBe(1);
    expect(files[0]).toContain('001');
  });
});

describe('AI optimization mode', () => {
  it('should set width to 640 for ai format', async () => {
    const { buildMarpCommandArgs } = await import('./screenshot');
    const options: ScreenshotOptions = { format: 'ai' };
    const args = buildMarpCommandArgs('/test.md', './out', options);

    expect(args).toContain('--image-scale');
    // 640 / 1280 = 0.5
    const scaleIndex = args.indexOf('--image-scale');
    expect(args[scaleIndex + 1]).toBe('0.5');
  });

  it('should use jpeg for ai format', async () => {
    const { buildMarpCommandArgs } = await import('./screenshot');
    const options: ScreenshotOptions = { format: 'ai' };
    const args = buildMarpCommandArgs('/test.md', './out', options);

    expect(args).toContain('--images');
    expect(args).toContain('jpeg');
  });

  it('should apply jpeg quality for ai format', async () => {
    const { buildMarpCommandArgs } = await import('./screenshot');
    const options: ScreenshotOptions = { format: 'ai', quality: 90 };
    const args = buildMarpCommandArgs('/test.md', './out', options);

    expect(args).toContain('--jpeg-quality');
    expect(args).toContain('90');
  });

  it('should apply default quality 80 for ai format', async () => {
    const { buildMarpCommandArgs } = await import('./screenshot');
    const options: ScreenshotOptions = { format: 'ai' };
    const args = buildMarpCommandArgs('/test.md', './out', options);

    expect(args).toContain('--jpeg-quality');
    expect(args).toContain('80');
  });

  it('should apply jpeg quality for jpeg format', async () => {
    const { buildMarpCommandArgs } = await import('./screenshot');
    const options: ScreenshotOptions = { format: 'jpeg', quality: 70 };
    const args = buildMarpCommandArgs('/test.md', './out', options);

    expect(args).toContain('--jpeg-quality');
    expect(args).toContain('70');
  });
});

describe('token estimation', () => {
  it('should calculate tokens for 640x360 image', () => {
    // 640 * 360 = 230400, 230400 / 750 = 307.2, ceil = 308
    const tokens = estimateTokens(640, 360);
    expect(tokens).toBe(308);
  });

  it('should calculate tokens for 1280x720 image', () => {
    // 1280 * 720 = 921600, 921600 / 750 = 1228.8, ceil = 1229
    const tokens = estimateTokens(1280, 720);
    expect(tokens).toBe(1229);
  });

  it('should calculate total tokens for multiple slides', () => {
    const total = estimateTotalTokens(640, 360, 5);
    expect(total).toBe(1540); // 308 * 5
  });

  it('should return 0 for 0 slides', () => {
    const total = estimateTotalTokens(640, 360, 0);
    expect(total).toBe(0);
  });
});

describe('contact sheet - grid calculation', () => {
  it('should calculate grid dimensions for 4 slides with 2 columns', () => {
    const dims = calculateGridDimensions(4, 2);
    expect(dims.rows).toBe(2);
    expect(dims.columns).toBe(2);
  });

  it('should calculate grid dimensions for 5 slides with 2 columns', () => {
    const dims = calculateGridDimensions(5, 2);
    expect(dims.rows).toBe(3);
    expect(dims.columns).toBe(2);
  });

  it('should calculate grid dimensions for 6 slides with 3 columns', () => {
    const dims = calculateGridDimensions(6, 3);
    expect(dims.rows).toBe(2);
    expect(dims.columns).toBe(3);
  });

  it('should handle 1 slide with 2 columns', () => {
    const dims = calculateGridDimensions(1, 2);
    expect(dims.rows).toBe(1);
    expect(dims.columns).toBe(2);
  });
});

describe('contact sheet generation', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = join(tmpdir(), `slide-gen-contact-sheet-${randomUUID()}`);
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it('should generate contact sheet from slide images', async () => {
    const { generateContactSheet } = await import('./screenshot');
    const outputDir = join(testDir, 'screenshots');
    await mkdir(outputDir, { recursive: true });

    // Create simple test images (1x1 pixel red PNG)
    const sharp = (await import('sharp')).default;
    const redPixel = await sharp({
      create: { width: 640, height: 360, channels: 3, background: { r: 255, g: 0, b: 0 } },
    })
      .png()
      .toBuffer();

    const bluePixel = await sharp({
      create: { width: 640, height: 360, channels: 3, background: { r: 0, g: 0, b: 255 } },
    })
      .png()
      .toBuffer();

    await writeFile(join(outputDir, 'slide.001.png'), redPixel);
    await writeFile(join(outputDir, 'slide.002.png'), bluePixel);

    const slides = [
      { path: join(outputDir, 'slide.001.png'), index: 1 },
      { path: join(outputDir, 'slide.002.png'), index: 2 },
    ];

    const result = await generateContactSheet(slides, {
      outputPath: join(outputDir, 'contact.png'),
      columns: 2,
    });

    expect(result.success).toBe(true);
    expect(result.outputPath).toContain('contact.png');

    // Verify the contact sheet was created
    const { access } = await import('fs/promises');
    await expect(access(join(outputDir, 'contact.png'))).resolves.toBeUndefined();
  });
});

describe('AI-friendly output', () => {
  it('should format output for AI consumption', () => {
    const output = formatAiOutput({
      files: ['slide.001.jpeg', 'slide.002.jpeg'],
      width: 640,
      height: 360,
      outputDir: './screenshots',
    });

    expect(output).toContain('AI-optimized');
    expect(output).toContain('Estimated tokens');
    expect(output).toContain('~616'); // 308 * 2
    expect(output).toContain('2 images');
    // Use join for cross-platform path compatibility
    expect(output).toContain(`Read ${join('./screenshots', 'slide.001.jpeg')}`);
  });

  it('should format output for single image', () => {
    const output = formatAiOutput({
      files: ['slide.001.jpeg'],
      width: 640,
      height: 360,
      outputDir: './screenshots',
    });

    expect(output).toContain('~308'); // 308 * 1
    expect(output).toContain('1 image');
  });
});
