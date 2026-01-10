import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeFileSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { createIconsCommand } from '../../src/cli/commands/icons';
import { Command } from 'commander';
import { vi } from 'vitest';

describe('E2E: CLI Icons Command', () => {
  const testDir = './test-e2e-cli-icons';
  const iconsDir = join(testDir, 'icons');
  const customIconsDir = join(iconsDir, 'custom');

  // Capture console output
  let consoleOutput: string[];
  const originalLog = console.log;
  const originalError = console.error;

  beforeEach(() => {
    consoleOutput = [];
    console.log = vi.fn((...args: unknown[]) => {
      consoleOutput.push(args.map(a => String(a)).join(' '));
    });
    console.error = vi.fn((...args: unknown[]) => {
      consoleOutput.push(args.map(a => String(a)).join(' '));
    });
    process.exitCode = undefined;

    // Create test directory structure
    mkdirSync(customIconsDir, { recursive: true });

    // Create a test config file
    const configContent = `
templates:
  builtin: ./templates
icons:
  registry: "${join(iconsDir, 'registry.yaml')}"
`;
    writeFileSync(join(testDir, 'config.yaml'), configContent);

    // Create a test registry file
    const registryContent = `
sources:
  - name: material-icons
    type: web-font
    prefix: mi
    url: "https://fonts.googleapis.com/icon?family=Material+Icons"
    render: '<span class="material-icons" style="{{ style }}">{{ name }}</span>'
  - name: custom
    type: local-svg
    prefix: custom
    path: "${customIconsDir}"

aliases:
  success: "mi:check_circle"
  warning: "mi:warning"
  arrow-up: "mi:arrow_upward"
  arrow-down: "mi:arrow_downward"

colors:
  primary: "#1976D2"
  success: "#4CAF50"

defaults:
  size: "24px"
  color: "currentColor"
`;
    writeFileSync(join(iconsDir, 'registry.yaml'), registryContent);

    // Create a test SVG file
    writeFileSync(
      join(customIconsDir, 'test-icon.svg'),
      `<svg viewBox="0 0 24 24" fill="currentColor">
  <circle cx="12" cy="12" r="10"/>
</svg>`
    );
  });

  afterEach(() => {
    console.log = originalLog;
    console.error = originalError;
    process.exitCode = undefined;
    rmSync(testDir, { recursive: true, force: true });
  });

  /**
   * Helper to run icons command
   */
  async function runIconsCommand(args: string[]): Promise<string> {
    consoleOutput = [];
    const program = new Command();
    program.addCommand(createIconsCommand());

    await program.parseAsync(['node', 'test', 'icons', ...args]);

    return consoleOutput.join('\n');
  }

  describe('icons list', () => {
    it('should list all icon sources', async () => {
      const configPath = join(testDir, 'config.yaml');
      const output = await runIconsCommand(['list', '-c', configPath]);

      expect(output).toContain('Icon Sources:');
      expect(output).toContain('material-icons');
      expect(output).toContain('custom');
      expect(output).toContain('mi');
      expect(output).toContain('web-font');
      expect(output).toContain('local-svg');
    });

    it('should list aliases with --aliases flag', async () => {
      const configPath = join(testDir, 'config.yaml');
      const output = await runIconsCommand(['list', '--aliases', '-c', configPath]);

      expect(output).toContain('Icon Aliases:');
      expect(output).toContain('success');
      expect(output).toContain('mi:check_circle');
      expect(output).toContain('warning');
      expect(output).toContain('mi:warning');
    });

    it('should filter by source name', async () => {
      const configPath = join(testDir, 'config.yaml');
      const output = await runIconsCommand(['list', '--source', 'mi', '-c', configPath]);

      expect(output).toContain('material-icons');
      expect(output).not.toContain('local-svg');
    });

    it('should output JSON format', async () => {
      const configPath = join(testDir, 'config.yaml');
      const output = await runIconsCommand(['list', '--format', 'json', '-c', configPath]);

      const parsed = JSON.parse(output);
      expect(parsed).toBeInstanceOf(Array);
      expect(parsed.length).toBe(2);
      expect(parsed[0]).toHaveProperty('name');
      expect(parsed[0]).toHaveProperty('prefix');
      expect(parsed[0]).toHaveProperty('type');
    });
  });

  describe('icons search', () => {
    it('should search for icons by alias name', async () => {
      const configPath = join(testDir, 'config.yaml');
      const output = await runIconsCommand(['search', 'arrow', '-c', configPath]);

      expect(output).toContain('Search results for "arrow"');
      expect(output).toContain('Aliases:');
      expect(output).toContain('arrow-up');
      expect(output).toContain('arrow-down');
    });

    it('should search for icons by source name', async () => {
      const configPath = join(testDir, 'config.yaml');
      const output = await runIconsCommand(['search', 'material', '-c', configPath]);

      expect(output).toContain('Sources:');
      expect(output).toContain('material-icons');
    });

    it('should show no results message when nothing matches', async () => {
      const configPath = join(testDir, 'config.yaml');
      const output = await runIconsCommand(['search', 'nonexistent-icon-xyz', '-c', configPath]);

      expect(output).toContain('No results found');
    });

    it('should output search results as JSON', async () => {
      const configPath = join(testDir, 'config.yaml');
      const output = await runIconsCommand(['search', 'success', '--format', 'json', '-c', configPath]);

      const parsed = JSON.parse(output);
      expect(parsed).toHaveProperty('query', 'success');
      expect(parsed).toHaveProperty('aliases');
      expect(parsed).toHaveProperty('sources');
    });
  });

  describe('icons preview', () => {
    it('should preview a web-font icon with HTML output', async () => {
      const configPath = join(testDir, 'config.yaml');
      const output = await runIconsCommand(['preview', 'mi:home', '-c', configPath]);

      expect(output).toContain('<!DOCTYPE html>');
      expect(output).toContain('Icon Preview: mi:home');
      expect(output).toContain('material-icons');
      expect(output).toContain('home');
    });

    it('should preview an alias', async () => {
      const configPath = join(testDir, 'config.yaml');
      const output = await runIconsCommand(['preview', 'success', '-c', configPath]);

      expect(output).toContain('<!DOCTYPE html>');
      expect(output).toContain('check_circle');
    });

    it('should preview a local SVG icon', async () => {
      const configPath = join(testDir, 'config.yaml');
      const output = await runIconsCommand(['preview', 'custom:test-icon', '--format', 'svg', '-c', configPath]);

      expect(output).toContain('<svg');
      expect(output).toContain('circle');
    });

    it('should apply custom size and color options', async () => {
      const configPath = join(testDir, 'config.yaml');
      const output = await runIconsCommand([
        'preview', 'mi:home',
        '--size', '48px',
        '--color', '#FF0000',
        '-c', configPath
      ]);

      expect(output).toContain('48px');
      expect(output).toContain('#FF0000');
    });

    it('should show error for invalid icon', async () => {
      const configPath = join(testDir, 'config.yaml');
      const output = await runIconsCommand(['preview', 'invalid:nonexistent', '-c', configPath]);

      expect(output).toContain('Error');
      expect(process.exitCode).toBe(1);
    });
  });
});
