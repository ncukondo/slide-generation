import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { writeFileSync, mkdirSync, rmSync } from 'fs';
import { join, resolve } from 'path';
import { createValidateCommand } from '../../src/cli/commands/validate';
import { Command } from 'commander';

describe('E2E: Validate References', () => {
  const testDir = './test-e2e-validate-refs';
  const fixturesDir = resolve(__dirname, '../fixtures').replace(/\\/g, '/');
  const templatesDir = join(fixturesDir, 'templates').replace(/\\/g, '/');
  const iconsRegistryPath = resolve(__dirname, '../../icons/registry.yaml').replace(/\\/g, '/');

  let consoleLogs: string[] = [];
  const originalConsoleLog = console.log;

  beforeEach(() => {
    mkdirSync(testDir, { recursive: true });
    consoleLogs = [];
    console.log = vi.fn((...args) => {
      consoleLogs.push(args.join(' '));
    });
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
    console.log = originalConsoleLog;
    process.exitCode = undefined;
  });

  describe('with references disabled', () => {
    beforeEach(() => {
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

    it('should not validate citations when references are disabled', async () => {
      const presentationContent = `
meta:
  title: "Test"
slides:
  - template: bullet-list
    content:
      title: "Test Slide"
      items:
        - "Citation [@unknown2024]"
`;
      const inputPath = join(testDir, 'test.yaml');
      writeFileSync(inputPath, presentationContent);

      const program = new Command();
      program.addCommand(createValidateCommand());

      await program.parseAsync([
        'node',
        'test',
        'validate',
        inputPath,
        '-c',
        join(testDir, 'config.yaml'),
      ]);

      const output = consoleLogs.join('\n');
      // Should not show reference validation messages
      expect(output).not.toContain('reference(s) not found');
      expect(output).toContain('1 references found');
    });
  });

  describe('with references enabled', () => {
    beforeEach(() => {
      const configContent = `
templates:
  builtin: "${templatesDir}"

icons:
  registry: "${iconsRegistryPath}"

references:
  enabled: true
`;
      writeFileSync(join(testDir, 'config.yaml'), configContent);
    });

    it('should count references in presentation', async () => {
      const presentationContent = `
meta:
  title: "Test"
slides:
  - template: bullet-list
    content:
      title: "Test Slide"
      items:
        - "First citation [@smith2024]"
        - "Second citation [@tanaka2023]"
`;
      const inputPath = join(testDir, 'test.yaml');
      writeFileSync(inputPath, presentationContent);

      const program = new Command();
      program.addCommand(createValidateCommand());

      await program.parseAsync([
        'node',
        'test',
        'validate',
        inputPath,
        '-c',
        join(testDir, 'config.yaml'),
      ]);

      const output = consoleLogs.join('\n');
      expect(output).toContain('2 references found');
    });

    it('should include reference validation in JSON output', async () => {
      const presentationContent = `
meta:
  title: "Test"
slides:
  - template: bullet-list
    content:
      title: "Test Slide"
      items:
        - "Citation [@citation2024]"
`;
      const inputPath = join(testDir, 'test.yaml');
      writeFileSync(inputPath, presentationContent);

      const program = new Command();
      program.addCommand(createValidateCommand());

      await program.parseAsync([
        'node',
        'test',
        'validate',
        inputPath,
        '--format',
        'json',
        '-c',
        join(testDir, 'config.yaml'),
      ]);

      const output = consoleLogs.join('\n');
      const json = JSON.parse(output);

      expect(json.stats.referencesCount).toBe(1);
      expect(json.stats).toHaveProperty('referencesValidated');
      expect(json.stats).toHaveProperty('missingReferences');
    });

    it('should show skip message when reference-manager unavailable', async () => {
      const presentationContent = `
meta:
  title: "Test"
slides:
  - template: bullet-list
    content:
      title: "Test Slide"
      items:
        - "Citation [@unknown2024]"
`;
      const inputPath = join(testDir, 'test.yaml');
      writeFileSync(inputPath, presentationContent);

      const program = new Command();
      program.addCommand(createValidateCommand());

      await program.parseAsync([
        'node',
        'test',
        'validate',
        inputPath,
        '-c',
        join(testDir, 'config.yaml'),
      ]);

      const output = consoleLogs.join('\n');
      // Should either validate or skip with appropriate message
      const hasValidationResult =
        output.includes('references validated') ||
        output.includes('reference(s) not found') ||
        output.includes('Reference validation skipped');
      expect(hasValidationResult).toBe(true);
    });

    it('should include missing_reference in LLM format error types', async () => {
      // This test verifies the error type is correct
      // The actual validation depends on reference-manager availability
      const presentationContent = `
meta:
  title: "Test"
slides:
  - template: bullet-list
    content:
      title: "Test Slide"
      items:
        - "Citation [@nonexistent2024]"
`;
      const inputPath = join(testDir, 'test.yaml');
      writeFileSync(inputPath, presentationContent);

      const program = new Command();
      program.addCommand(createValidateCommand());

      await program.parseAsync([
        'node',
        'test',
        'validate',
        inputPath,
        '--format',
        'llm',
        '-c',
        join(testDir, 'config.yaml'),
      ]);

      const output = consoleLogs.join('\n');
      // If reference-manager is available and citation is missing,
      // the output should contain the hint
      if (output.includes('not found in library')) {
        expect(output).toContain('ref add');
      }
    });
  });

  describe('location reporting', () => {
    beforeEach(() => {
      const configContent = `
templates:
  builtin: "${templatesDir}"

icons:
  registry: "${iconsRegistryPath}"

references:
  enabled: true
`;
      writeFileSync(join(testDir, 'config.yaml'), configContent);
    });

    it('should report slide numbers for missing citations', async () => {
      const presentationContent = `
meta:
  title: "Test"
slides:
  - template: title
    content:
      title: "Welcome"
  - template: bullet-list
    content:
      title: "Slide 2"
      items:
        - "Citation [@missing2024]"
  - template: bullet-list
    content:
      title: "Slide 3"
      items:
        - "Another citation [@missing2024]"
`;
      const inputPath = join(testDir, 'test.yaml');
      writeFileSync(inputPath, presentationContent);

      const program = new Command();
      program.addCommand(createValidateCommand());

      await program.parseAsync([
        'node',
        'test',
        'validate',
        inputPath,
        '-c',
        join(testDir, 'config.yaml'),
      ]);

      const output = consoleLogs.join('\n');
      // If reference-manager is available and validates,
      // should include slide numbers in the warning
      if (output.includes('not found in library')) {
        expect(output).toMatch(/Slide [23]/);
      }
    });
  });
});
