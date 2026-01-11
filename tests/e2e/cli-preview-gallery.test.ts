import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { join, resolve } from 'path';
import { mkdir, rm, writeFile } from 'fs/promises';
import { mkdirSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { randomUUID } from 'crypto';
import { Command } from 'commander';
import { createPreviewCommand, generateGalleryHtml, collectSlideInfo, SlideInfo } from '../../src/cli/commands/preview';
import { createTemplatesCommand } from '../../src/cli/commands/templates';

describe('E2E: preview command options', () => {
  it('should have --gallery option', () => {
    const cmd = createPreviewCommand();
    const options = cmd.options.map((o) => o.long);
    expect(options).toContain('--gallery');
  });

  it('should have --slide option', () => {
    const cmd = createPreviewCommand();
    const options = cmd.options.map((o) => o.long);
    expect(options).toContain('--slide');
  });

  it('should have --port option', () => {
    const cmd = createPreviewCommand();
    const options = cmd.options.map((o) => o.long);
    expect(options).toContain('--port');
  });

  it('should have --watch option', () => {
    const cmd = createPreviewCommand();
    const options = cmd.options.map((o) => o.long);
    expect(options).toContain('--watch');
  });

  it('should accept input argument', () => {
    const cmd = createPreviewCommand();
    expect(cmd.registeredArguments.length).toBe(1);
    expect(cmd.registeredArguments[0]!.name()).toBe('input');
  });
});

describe('E2E: templates preview command', () => {
  it('should have preview subcommand', () => {
    const cmd = createTemplatesCommand();
    const previewCmd = cmd.commands.find((c) => c.name() === 'preview');
    expect(previewCmd).toBeDefined();
  });

  it('should have --all option', () => {
    const cmd = createTemplatesCommand();
    const previewCmd = cmd.commands.find((c) => c.name() === 'preview');
    const options = previewCmd?.options.map((o) => o.long);
    expect(options).toContain('--all');
  });

  it('should have --category option', () => {
    const cmd = createTemplatesCommand();
    const previewCmd = cmd.commands.find((c) => c.name() === 'preview');
    const options = previewCmd?.options.map((o) => o.long);
    expect(options).toContain('--category');
  });

  it('should accept template name argument', () => {
    const cmd = createTemplatesCommand();
    const previewCmd = cmd.commands.find((c) => c.name() === 'preview');
    expect(previewCmd?.registeredArguments[0]?.name()).toBe('name');
  });
});

describe('E2E: generateGalleryHtml', () => {
  it('should generate valid HTML with slides', () => {
    const slides: SlideInfo[] = [
      { path: 'slide1.png', title: 'Slide 1', index: 1 },
      { path: 'slide2.png', title: 'Slide 2', index: 2 },
      { path: 'slide3.png', title: 'Slide 3', index: 3 },
    ];
    const html = generateGalleryHtml(slides);

    // Check basic HTML structure
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('<html>');
    expect(html).toContain('</html>');
    expect(html).toContain('Slide Gallery');

    // Check slides are included
    expect(html).toContain('slide1.png');
    expect(html).toContain('slide2.png');
    expect(html).toContain('slide3.png');

    // Check gallery class exists
    expect(html).toContain('class="gallery"');
  });

  it('should handle empty slides array', () => {
    const html = generateGalleryHtml([]);
    expect(html).toContain('No slides');
    expect(html).toContain('gallery');
  });

  it('should include slide titles', () => {
    const slides: SlideInfo[] = [
      { path: 'test.png', title: 'Introduction', index: 1 },
    ];
    const html = generateGalleryHtml(slides);
    expect(html).toContain('Introduction');
  });

  it('should include modal for full-size viewing', () => {
    const slides: SlideInfo[] = [
      { path: 'test.png', title: 'Test', index: 1 },
    ];
    const html = generateGalleryHtml(slides);
    expect(html).toContain('modal');
    expect(html).toContain('showSlide');
    expect(html).toContain('hideSlide');
  });

  it('should include keyboard navigation', () => {
    const slides: SlideInfo[] = [
      { path: 'test.png', title: 'Test', index: 1 },
    ];
    const html = generateGalleryHtml(slides);
    expect(html).toContain('ArrowLeft');
    expect(html).toContain('ArrowRight');
    expect(html).toContain('Escape');
  });
});

describe('E2E: collectSlideInfo', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = join(tmpdir(), `slide-gen-e2e-collect-${randomUUID()}`);
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it('should collect slide info from directory', async () => {
    // Create mock screenshot files
    await writeFile(join(testDir, 'slides.001.png'), 'mock');
    await writeFile(join(testDir, 'slides.002.png'), 'mock');
    await writeFile(join(testDir, 'slides.003.png'), 'mock');

    const slides = await collectSlideInfo(testDir, 'slides', 'png');

    expect(slides).toHaveLength(3);
    expect(slides[0]!.index).toBe(1);
    expect(slides[1]!.index).toBe(2);
    expect(slides[2]!.index).toBe(3);
  });

  it('should sort slides by index', async () => {
    // Create files in random order
    await writeFile(join(testDir, 'test.003.png'), 'mock');
    await writeFile(join(testDir, 'test.001.png'), 'mock');
    await writeFile(join(testDir, 'test.002.png'), 'mock');

    const slides = await collectSlideInfo(testDir, 'test', 'png');

    expect(slides[0]!.index).toBe(1);
    expect(slides[1]!.index).toBe(2);
    expect(slides[2]!.index).toBe(3);
  });

  it('should return empty array for non-existent directory', async () => {
    const slides = await collectSlideInfo('/non/existent/path', 'test', 'png');
    expect(slides).toEqual([]);
  });

  it('should filter by base name and format', async () => {
    await writeFile(join(testDir, 'slides.001.png'), 'mock');
    await writeFile(join(testDir, 'other.001.png'), 'mock');
    await writeFile(join(testDir, 'slides.001.jpg'), 'mock');

    const slides = await collectSlideInfo(testDir, 'slides', 'png');

    expect(slides).toHaveLength(1);
    expect(slides[0]!.path).toContain('slides.001.png');
  });
});

describe('E2E: preview gallery integration', () => {
  const fixturesDir = resolve(__dirname, '../fixtures').replace(/\\/g, '/');
  const templatesDir = join(fixturesDir, 'templates').replace(/\\/g, '/');
  const iconsRegistryPath = resolve(__dirname, '../../icons/registry.yaml').replace(/\\/g, '/');
  let testDir: string;

  beforeEach(() => {
    testDir = `./test-e2e-preview-gallery-${randomUUID()}`;
    mkdirSync(testDir, { recursive: true });

    // Create config file
    const configContent = `
templates:
  builtin: "${templatesDir}"

icons:
  registry: "${iconsRegistryPath}"

references:
  enabled: false
`;
    writeFileSync(join(testDir, 'config.yaml'), configContent);
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it('should create preview command with correct structure', () => {
    const program = new Command();
    program.addCommand(createPreviewCommand());

    const previewCmd = program.commands.find((c) => c.name() === 'preview');
    expect(previewCmd).toBeDefined();
    expect(previewCmd!.description()).toContain('Preview');
  });

  it('should create templates command with preview subcommand', () => {
    const program = new Command();
    program.addCommand(createTemplatesCommand());

    const templatesCmd = program.commands.find((c) => c.name() === 'templates');
    expect(templatesCmd).toBeDefined();

    const previewSubCmd = templatesCmd!.commands.find((c) => c.name() === 'preview');
    expect(previewSubCmd).toBeDefined();
  });
});
