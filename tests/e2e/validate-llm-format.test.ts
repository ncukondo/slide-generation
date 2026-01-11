import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { writeFileSync, mkdirSync, rmSync } from 'fs';
import { join, resolve } from 'path';
import { createValidateCommand } from '../../src/cli/commands/validate';
import { Command } from 'commander';

describe('E2E: Validate --format llm', () => {
  const testDir = './test-e2e-validate-llm';
  const fixturesDir = resolve(__dirname, '../fixtures').replace(/\\/g, '/');
  const templatesDir = join(fixturesDir, 'templates').replace(/\\/g, '/');
  const iconsRegistryPath = resolve(__dirname, '../../icons/registry.yaml').replace(/\\/g, '/');

  let consoleLogs: string[] = [];
  const originalConsoleLog = console.log;

  beforeEach(() => {
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

    // Capture console.log output
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

  it('should output success message for valid file', async () => {
    const presentationContent = `
meta:
  title: "Valid Presentation"
slides:
  - template: title
    content:
      title: "Welcome"
      subtitle: "Test Presentation"
  - template: bullet-list
    content:
      title: "Overview"
      items:
        - "Item 1"
        - "Item 2"
`;
    const inputPath = join(testDir, 'valid.yaml');
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
    expect(output).toContain('Validation passed.');
    expect(output).toContain('2 slides validated.');
  });

  it('should output error with line number for unknown template', async () => {
    const presentationContent = `meta:
  title: "Invalid Presentation"
slides:
  - template: title
    content:
      title: "Welcome"
  - template: unknown-template
    content:
      title: "Error"
`;
    const inputPath = join(testDir, 'unknown-template.yaml');
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
    expect(output).toContain('Validation failed.');
    expect(output).toContain('Slide 2');
    expect(output).toContain('unknown-template');
    expect(output).toContain('Template "unknown-template" not found');
    expect(output).toContain('Hint:');
    expect(output).toContain('slide-gen templates list');
  });

  it('should include line number in error output', async () => {
    const presentationContent = `meta:
  title: "Test"
slides:
  - template: title
    content:
      title: "Slide 1"
  - template: nonexistent
    content:
      title: "Error"
`;
    const inputPath = join(testDir, 'with-line.yaml');
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
    // Should include line number (line 7 is where second slide starts)
    expect(output).toMatch(/line \d+/);
    expect(output).toContain('Slide 2');
  });

  it('should include fix example for validation errors', async () => {
    const presentationContent = `meta:
  title: "Test"
slides:
  - template: bullet-list
    content:
      title: "Missing Items"
`;
    const inputPath = join(testDir, 'missing-field.yaml');
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
    expect(output).toContain('Validation failed.');
    expect(output).toContain('bullet-list');
    // Should contain fix example
    expect(output).toContain('Fix:');
  });

  it('should separate multiple errors with ---', async () => {
    const presentationContent = `meta:
  title: "Multiple Errors"
slides:
  - template: unknown1
    content:
      title: "Error 1"
  - template: unknown2
    content:
      title: "Error 2"
`;
    const inputPath = join(testDir, 'multiple-errors.yaml');
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
    expect(output).toContain('Validation failed.');
    expect(output).toContain('unknown1');
    expect(output).toContain('unknown2');
    // Should have separator between errors
    expect(output).toContain('---');
  });
});
