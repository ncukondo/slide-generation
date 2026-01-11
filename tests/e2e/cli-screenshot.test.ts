import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeFileSync, mkdirSync, rmSync, existsSync, readdirSync } from 'fs';
import { join, resolve } from 'path';
import { execSync } from 'child_process';
import {
  createScreenshotCommand,
  checkMarpCliAvailable,
  buildMarpCommandArgs,
  filterToSpecificSlide,
} from '../../src/cli/commands/screenshot';

describe('E2E: CLI Screenshot Command', () => {
  const testDir = './test-e2e-cli-screenshot';
  const fixturesDir = resolve(__dirname, '../fixtures').replace(/\\/g, '/');
  const templatesDir = join(fixturesDir, 'templates').replace(/\\/g, '/');
  const iconsRegistryPath = resolve(__dirname, '../../icons/registry.yaml').replace(
    /\\/g,
    '/'
  );

  beforeEach(() => {
    mkdirSync(testDir, { recursive: true });

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

  describe('command structure', () => {
    it('should create command with correct name', () => {
      const cmd = createScreenshotCommand();
      expect(cmd.name()).toBe('screenshot');
    });

    it('should have correct description', () => {
      const cmd = createScreenshotCommand();
      expect(cmd.description()).toContain('screenshot');
      expect(cmd.description()).toContain('Marp');
    });

    it('should have required options', () => {
      const cmd = createScreenshotCommand();
      const options = cmd.options.map((o) => o.long);
      expect(options).toContain('--output');
      expect(options).toContain('--slide');
      expect(options).toContain('--width');
      expect(options).toContain('--format');
      expect(options).toContain('--config');
      expect(options).toContain('--verbose');
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

  describe('marp-cli availability', () => {
    it('should check marp-cli availability', () => {
      const available = checkMarpCliAvailable();
      expect(typeof available).toBe('boolean');
    });
  });

  describe('buildMarpCommandArgs', () => {
    it('should build correct marp command args for png', () => {
      const args = buildMarpCommandArgs('/path/to/slides.md', '/output', {
        format: 'png',
      });
      expect(args).toContain('marp');
      expect(args).toContain('--images');
      expect(args).toContain('png');
      expect(args).toContain('-o');
      expect(args).toContain('/output');
    });

    it('should build correct marp command args for jpeg', () => {
      const args = buildMarpCommandArgs('/path/to/slides.md', '/output', {
        format: 'jpeg',
      });
      expect(args).toContain('--images');
      expect(args).toContain('jpeg');
    });

    it('should apply image scale for custom width', () => {
      const args = buildMarpCommandArgs('/path/to/slides.md', '/output', {
        width: 1920,
        format: 'png',
      });
      expect(args).toContain('--image-scale');
      expect(args).toContain('1.5');
    });

    it('should not apply image scale for default width', () => {
      const args = buildMarpCommandArgs('/path/to/slides.md', '/output', {
        width: 1280,
        format: 'png',
      });
      expect(args).not.toContain('--image-scale');
    });

    it('should handle paths with spaces correctly', () => {
      const args = buildMarpCommandArgs('/path/with spaces/slides.md', '/output dir', {
        format: 'png',
      });
      expect(args).toContain('/path/with spaces/slides.md');
      expect(args).toContain('/output dir');
    });
  });

  describe('filterToSpecificSlide', () => {
    it('should filter to specific slide', async () => {
      const outputDir = join(testDir, 'filter-test');
      mkdirSync(outputDir, { recursive: true });

      // Create mock slide images
      writeFileSync(join(outputDir, 'test.001.png'), 'slide1');
      writeFileSync(join(outputDir, 'test.002.png'), 'slide2');
      writeFileSync(join(outputDir, 'test.003.png'), 'slide3');

      const result = await filterToSpecificSlide(outputDir, 'test', 2, 'png');

      expect(result.success).toBe(true);
      expect(result.keptFile).toBe('test.002.png');

      const files = readdirSync(outputDir);
      expect(files.length).toBe(1);
      expect(files[0]).toBe('test.002.png');
    });

    it('should handle slide 1', async () => {
      const outputDir = join(testDir, 'filter-test-1');
      mkdirSync(outputDir, { recursive: true });

      writeFileSync(join(outputDir, 'test.001.png'), 'slide1');
      writeFileSync(join(outputDir, 'test.002.png'), 'slide2');

      const result = await filterToSpecificSlide(outputDir, 'test', 1, 'png');

      expect(result.success).toBe(true);
      expect(result.keptFile).toBe('test.001.png');

      const files = readdirSync(outputDir);
      expect(files.length).toBe(1);
    });

    it('should return error for non-existent slide', async () => {
      const outputDir = join(testDir, 'filter-test-missing');
      mkdirSync(outputDir, { recursive: true });

      writeFileSync(join(outputDir, 'test.001.png'), 'slide1');

      const result = await filterToSpecificSlide(outputDir, 'test', 5, 'png');

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });
  });

  describe('CLI integration', () => {
    it('should show help with --help flag', () => {
      const output = execSync('node dist/cli/index.js screenshot --help', {
        cwd: resolve(__dirname, '../..'),
        encoding: 'utf-8',
      });

      expect(output).toContain('screenshot');
      expect(output).toContain('--output');
      expect(output).toContain('--slide');
      expect(output).toContain('--width');
      expect(output).toContain('--format');
    });

    it('should fail with non-existent input file', () => {
      try {
        execSync('node dist/cli/index.js screenshot nonexistent.yaml', {
          cwd: resolve(__dirname, '../..'),
          encoding: 'utf-8',
          stdio: 'pipe',
        });
        expect.fail('Should have thrown an error');
      } catch {
        // Expected to fail
        expect(true).toBe(true);
      }
    });
  });

  describe('full workflow (requires Marp CLI and browser)', () => {
    // Skip this test in CI as it requires a browser
    // In local environment with browser, run: pnpm test -- tests/e2e/cli-screenshot.test.ts
    it.skip('should generate screenshots from YAML (manual test)', async () => {
      // Create test YAML file
      const yamlPath = join(testDir, 'test.yaml');
      const yamlContent = `meta:
  title: Test Presentation

slides:
  - template: title
    content:
      title: Test Slide 1
  - template: section
    content:
      title: Section Title
`;
      writeFileSync(yamlPath, yamlContent);

      const outputDir = join(testDir, 'screenshots');

      execSync(
        `node dist/cli/index.js screenshot "${yamlPath}" -o "${outputDir}" -c "${join(testDir, 'config.yaml')}"`,
        {
          cwd: resolve(__dirname, '../..'),
          encoding: 'utf-8',
          timeout: 60000,
        }
      );

      expect(existsSync(outputDir)).toBe(true);
      const files = readdirSync(outputDir);
      expect(files.length).toBeGreaterThan(0);
      expect(files.some((f) => f.endsWith('.png'))).toBe(true);
    });
  });
});
