import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { join } from 'path';
import { mkdir, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { randomUUID } from 'crypto';
import { createScreenshotCommand, ScreenshotOptions } from './screenshot';

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

    expect(outputOpt?.defaultValue).toBe('./screenshots');
    expect(formatOpt?.defaultValue).toBe('png');
    expect(widthOpt?.defaultValue).toBe(1280);
  });
});

describe('screenshot command - marp integration', () => {
  it('should build correct marp command for images', async () => {
    const { buildMarpCommand } = await import('./screenshot');
    const options: ScreenshotOptions = {
      format: 'png',
    };

    const cmd = buildMarpCommand('/path/to/slides.md', '/output', options);

    expect(cmd).toContain('marp');
    expect(cmd).toContain('--images');
    expect(cmd).toContain('png');
  });

  it('should support jpeg format', async () => {
    const { buildMarpCommand } = await import('./screenshot');
    const options: ScreenshotOptions = {
      format: 'jpeg',
    };

    const cmd = buildMarpCommand('/path/to/slides.md', '/output', options);

    expect(cmd).toContain('--images');
    expect(cmd).toContain('jpeg');
  });

  it('should apply image scale based on width', async () => {
    const { buildMarpCommand } = await import('./screenshot');
    const options: ScreenshotOptions = {
      width: 1920,
      format: 'png',
    };

    const cmd = buildMarpCommand('/path/to/slides.md', '/output', options);

    expect(cmd).toContain('--image-scale');
    expect(cmd).toContain('1.5'); // 1920/1280 = 1.5
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
