import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeFileSync, mkdirSync, rmSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { createConvertCommand } from '../../src/cli/commands/convert';
import { Command } from 'commander';

describe('CLI: Convert Command', () => {
  const testDir = './test-cli-convert';
  const templatesDir = join(testDir, 'templates');
  const iconsDir = join(testDir, 'icons');

  beforeEach(() => {
    mkdirSync(testDir, { recursive: true });
    mkdirSync(templatesDir, { recursive: true });
    mkdirSync(iconsDir, { recursive: true });

    // Create minimal templates for testing (YAML format)
    const titleTemplate = `
name: title
description: Title slide
category: basic
schema:
  type: object
  properties:
    title:
      type: string
    subtitle:
      type: string
  required:
    - title
output: |
  # {{ content.title }}
  {% if content.subtitle %}{{ content.subtitle }}{% endif %}
`;
    mkdirSync(join(templatesDir, 'basic'), { recursive: true });
    writeFileSync(join(templatesDir, 'basic', 'title.yaml'), titleTemplate);

    const bulletTemplate = `
name: bullet-list
description: Bullet list slide
category: basic
schema:
  type: object
  properties:
    title:
      type: string
    items:
      type: array
  required:
    - title
    - items
output: |
  # {{ content.title }}
  {% for item in content.items %}
  - {{ item }}
  {% endfor %}
`;
    writeFileSync(join(templatesDir, 'basic', 'bullet-list.yaml'), bulletTemplate);

    // Create minimal icon registry
    const registry = `
sources: []
aliases: {}
`;
    writeFileSync(join(iconsDir, 'registry.yaml'), registry);

    // Create config file pointing to local templates/icons
    const configContent = `
templates:
  builtin: "${templatesDir}"

icons:
  registry: "${join(iconsDir, 'registry.yaml')}"

references:
  enabled: false
`;
    writeFileSync(join(testDir, 'config.yaml'), configContent);
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it('should create a convert command', () => {
    const cmd = createConvertCommand();
    expect(cmd.name()).toBe('convert');
  });

  it('should have correct options', () => {
    const cmd = createConvertCommand();
    const options = cmd.options;

    const optionNames = options.map((o) => o.long);
    expect(optionNames).toContain('--output');
    expect(optionNames).toContain('--config');
    expect(optionNames).toContain('--theme');
    expect(optionNames).toContain('--verbose');
  });

  it('should convert a basic YAML file', async () => {
    const presentation = `
meta:
  title: "Test Presentation"
slides:
  - template: title
    content:
      title: "Hello World"
      subtitle: "A test subtitle"
`;
    const inputPath = join(testDir, 'test.yaml');
    writeFileSync(inputPath, presentation);

    const outputPath = join(testDir, 'output.md');
    const configPath = join(testDir, 'config.yaml');

    // Create a program and add the convert command
    const program = new Command();
    program.addCommand(createConvertCommand());

    // Parse the command
    await program.parseAsync([
      'node',
      'test',
      'convert',
      inputPath,
      '-o',
      outputPath,
      '-c',
      configPath,
    ]);

    // Verify output file was created
    expect(existsSync(outputPath)).toBe(true);

    const output = readFileSync(outputPath, 'utf-8');
    expect(output).toContain('marp: true');
    expect(output).toContain('Hello World');
  });

  it('should handle file not found error', async () => {
    const program = new Command();
    program.exitOverride();
    program.configureOutput({
      writeErr: () => {},
      writeOut: () => {},
    });
    program.addCommand(createConvertCommand());

    const nonExistentPath = join(testDir, 'nonexistent.yaml');
    const outputPath = join(testDir, 'output.md');
    const configPath = join(testDir, 'config.yaml');

    let errorThrown = false;
    try {
      await program.parseAsync([
        'node',
        'test',
        'convert',
        nonExistentPath,
        '-o',
        outputPath,
        '-c',
        configPath,
      ]);
    } catch (error) {
      errorThrown = true;
    }

    // The command should handle errors gracefully
    expect(errorThrown || !existsSync(outputPath)).toBe(true);
  });

  it('should generate default output path when not specified', async () => {
    const presentation = `
meta:
  title: "Default Output Test"
slides:
  - template: title
    content:
      title: "Test"
`;
    const inputPath = join(testDir, 'slides.yaml');
    writeFileSync(inputPath, presentation);

    const configPath = join(testDir, 'config.yaml');

    const program = new Command();
    program.addCommand(createConvertCommand());

    await program.parseAsync([
      'node',
      'test',
      'convert',
      inputPath,
      '-c',
      configPath,
    ]);

    // Default output should be slides.md
    const defaultOutputPath = join(testDir, 'slides.md');
    expect(existsSync(defaultOutputPath)).toBe(true);
  });

  it('should handle multiple slides', async () => {
    const presentation = `
meta:
  title: "Multi-Slide"
slides:
  - template: title
    content:
      title: "First Slide"
  - template: bullet-list
    content:
      title: "Second Slide"
      items:
        - "Item 1"
        - "Item 2"
`;
    const inputPath = join(testDir, 'multi.yaml');
    writeFileSync(inputPath, presentation);

    const outputPath = join(testDir, 'multi.md');
    const configPath = join(testDir, 'config.yaml');

    const program = new Command();
    program.addCommand(createConvertCommand());

    await program.parseAsync([
      'node',
      'test',
      'convert',
      inputPath,
      '-o',
      outputPath,
      '-c',
      configPath,
    ]);

    const output = readFileSync(outputPath, 'utf-8');
    expect(output).toContain('First Slide');
    expect(output).toContain('Second Slide');
    expect(output).toContain('Item 1');
    expect(output).toContain('Item 2');
    // Should have slide separators
    expect(output).toContain('---');
  });
});
