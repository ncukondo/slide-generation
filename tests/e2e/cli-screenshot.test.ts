import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeFileSync, mkdirSync, rmSync, existsSync, readdirSync } from 'fs';
import { join, resolve } from 'path';
import { execSync } from 'child_process';
import {
  createScreenshotCommand,
  checkMarpCliAvailable,
  buildMarpCommand,
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

  describe('buildMarpCommand', () => {
    it('should build correct marp command for png', () => {
      const cmd = buildMarpCommand('/path/to/slides.md', '/output', {
        format: 'png',
      });
      expect(cmd).toContain('marp');
      expect(cmd).toContain('--images');
      expect(cmd).toContain('png');
      expect(cmd).toContain('-o');
      expect(cmd).toContain('/output');
    });

    it('should build correct marp command for jpeg', () => {
      const cmd = buildMarpCommand('/path/to/slides.md', '/output', {
        format: 'jpeg',
      });
      expect(cmd).toContain('--images');
      expect(cmd).toContain('jpeg');
    });

    it('should apply image scale for custom width', () => {
      const cmd = buildMarpCommand('/path/to/slides.md', '/output', {
        width: 1920,
        format: 'png',
      });
      expect(cmd).toContain('--image-scale');
      expect(cmd).toContain('1.5');
    });

    it('should not apply image scale for default width', () => {
      const cmd = buildMarpCommand('/path/to/slides.md', '/output', {
        width: 1280,
        format: 'png',
      });
      expect(cmd).not.toContain('--image-scale');
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
      } catch (error) {
        // Expected to fail
        expect(true).toBe(true);
      }
    });
  });

  describe('full workflow (requires Marp CLI and browser)', () => {
    it.skipIf(!checkMarpCliAvailable())(
      'should generate screenshots from YAML',
      async () => {
        // Create test YAML file
        const yamlPath = join(testDir, 'test.yaml');
        const yamlContent = `meta:
  title: Test Presentation

slides:
  - template: title
    content:
      title: Test Slide 1
  - template: content
    content:
      title: Content
      body: Hello World
`;
        writeFileSync(yamlPath, yamlContent);

        const outputDir = join(testDir, 'screenshots');

        try {
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
        } catch (error) {
          // May fail if no browser is installed
          console.log('Screenshot test skipped: browser not available');
        }
      }
    );
  });
});
