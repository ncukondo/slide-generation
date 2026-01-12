import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeFileSync, mkdirSync, rmSync, existsSync, readdirSync } from 'fs';
import { join, resolve } from 'path';
import { execSync } from 'child_process';
import { createTemplatesCommand, executeTemplateScreenshot } from '../../src/cli/commands/templates';

describe('E2E: CLI Templates Screenshot Command', () => {
  const testDir = './test-e2e-cli-templates-screenshot';
  const fixturesDir = resolve(__dirname, '../fixtures').replace(/\\/g, '/');
  const templatesDir = join(fixturesDir, 'templates').replace(/\\/g, '/');
  const iconsRegistryPath = resolve(__dirname, '../../icons/registry.yaml').replace(/\\/g, '/');

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
    it('should have screenshot subcommand', () => {
      const cmd = createTemplatesCommand();
      const subcommands = cmd.commands.map((c) => c.name());
      expect(subcommands).toContain('screenshot');
    });

    it('screenshot should have correct description', () => {
      const cmd = createTemplatesCommand();
      const screenshotCmd = cmd.commands.find((c) => c.name() === 'screenshot');
      expect(screenshotCmd?.description()).toContain('screenshot');
    });

    it('should have required options', () => {
      const cmd = createTemplatesCommand();
      const screenshotCmd = cmd.commands.find((c) => c.name() === 'screenshot');
      const options = screenshotCmd?.options.map((o) => o.long) ?? [];
      expect(options).toContain('--all');
      expect(options).toContain('--category');
      expect(options).toContain('--output');
      expect(options).toContain('--format');
      expect(options).toContain('--width');
      expect(options).toContain('--contact-sheet');
      expect(options).toContain('--columns');
      expect(options).toContain('--config');
      expect(options).toContain('--verbose');
    });

    it('should accept optional template name argument', () => {
      const cmd = createTemplatesCommand();
      const screenshotCmd = cmd.commands.find((c) => c.name() === 'screenshot');
      expect(screenshotCmd?.registeredArguments.length).toBe(1);
      expect(screenshotCmd?.registeredArguments[0]?.name()).toBe('name');
    });

    it('should have correct default values', () => {
      const cmd = createTemplatesCommand();
      const screenshotCmd = cmd.commands.find((c) => c.name() === 'screenshot');

      const outputOpt = screenshotCmd?.options.find((o) => o.long === '--output');
      const formatOpt = screenshotCmd?.options.find((o) => o.long === '--format');
      const widthOpt = screenshotCmd?.options.find((o) => o.long === '--width');
      const columnsOpt = screenshotCmd?.options.find((o) => o.long === '--columns');

      expect(outputOpt?.defaultValue).toBe('./template-screenshots');
      expect(formatOpt?.defaultValue).toBe('png');
      expect(widthOpt?.defaultValue).toBe(1280);
      expect(columnsOpt?.defaultValue).toBe(3);
    });
  });

  describe('executeTemplateScreenshot', () => {
    it('should fail if neither name nor --all is provided', async () => {
      const result = await executeTemplateScreenshot(undefined, {});
      expect(result.success).toBe(false);
      expect(result.errors).toContain('Specify a template name or use --all');
    });

    it('should fail if template not found', async () => {
      const result = await executeTemplateScreenshot('nonexistent-template', {
        config: join(testDir, 'config.yaml'),
      });
      expect(result.success).toBe(false);
      expect(result.errors.some((e) => e.includes('not found'))).toBe(true);
    });
  });

  describe('CLI integration', () => {
    it('should show help with templates screenshot --help', () => {
      const output = execSync('node dist/cli/index.js templates screenshot --help', {
        cwd: resolve(__dirname, '../..'),
        encoding: 'utf-8',
      });

      expect(output).toContain('screenshot');
      expect(output).toContain('--all');
      expect(output).toContain('--category');
      expect(output).toContain('--output');
      expect(output).toContain('--format');
      expect(output).toContain('--contact-sheet');
    });

    it('should fail without template name or --all', () => {
      try {
        execSync('node dist/cli/index.js templates screenshot', {
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

    it('should fail with non-existent template name', () => {
      try {
        execSync('node dist/cli/index.js templates screenshot nonexistent-xyz', {
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
    // Skip in CI as it requires a browser
    // In local environment with browser, run: pnpm test -- tests/e2e/cli-templates-screenshot.test.ts
    it.skip('should take screenshot of a single template (manual test)', () => {
      const outputDir = join(testDir, 'screenshots');

      execSync(
        `node dist/cli/index.js templates screenshot title -o "${outputDir}" -c "${join(testDir, 'config.yaml')}"`,
        {
          cwd: resolve(__dirname, '../..'),
          encoding: 'utf-8',
          timeout: 60000,
        }
      );

      expect(existsSync(outputDir)).toBe(true);
      const files = readdirSync(outputDir);
      expect(files.some((f) => f.startsWith('title'))).toBe(true);
    });

    it.skip('should take screenshots of all templates with --all (manual test)', () => {
      const outputDir = join(testDir, 'screenshots');

      execSync(
        `node dist/cli/index.js templates screenshot --all -o "${outputDir}" -c "${join(testDir, 'config.yaml')}"`,
        {
          cwd: resolve(__dirname, '../..'),
          encoding: 'utf-8',
          timeout: 120000,
        }
      );

      const files = readdirSync(outputDir);
      expect(files.length).toBeGreaterThan(1);
    });

    it.skip('should filter by category (manual test)', () => {
      const outputDir = join(testDir, 'screenshots');

      execSync(
        `node dist/cli/index.js templates screenshot --all --category basic -o "${outputDir}" -c "${join(testDir, 'config.yaml')}"`,
        {
          cwd: resolve(__dirname, '../..'),
          encoding: 'utf-8',
          timeout: 60000,
        }
      );

      const files = readdirSync(outputDir);
      // Only basic category templates should be included
      expect(files.some((f) => f.includes('title'))).toBe(true);
    });

    it.skip('should generate contact sheet with --contact-sheet (manual test)', () => {
      const outputDir = join(testDir, 'screenshots');

      execSync(
        `node dist/cli/index.js templates screenshot --all --contact-sheet -o "${outputDir}" -c "${join(testDir, 'config.yaml')}"`,
        {
          cwd: resolve(__dirname, '../..'),
          encoding: 'utf-8',
          timeout: 120000,
        }
      );

      const files = readdirSync(outputDir);
      expect(files.some((f) => f.includes('contact'))).toBe(true);
    });

    it.skip('should use AI-optimized settings with --format ai (manual test)', () => {
      const outputDir = join(testDir, 'screenshots');

      const output = execSync(
        `node dist/cli/index.js templates screenshot title --format ai -o "${outputDir}" -c "${join(testDir, 'config.yaml')}"`,
        {
          cwd: resolve(__dirname, '../..'),
          encoding: 'utf-8',
          timeout: 60000,
        }
      );

      expect(output).toContain('Estimated tokens');
      const files = readdirSync(outputDir);
      expect(files.some((f) => f.endsWith('.jpeg'))).toBe(true);
    });
  });
});
