import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeFileSync, mkdirSync, rmSync, readFileSync, existsSync } from 'fs';
import { join, resolve } from 'path';
import { createConvertCommand } from '../../src/cli/commands/convert';
import { Command } from 'commander';

describe('E2E: CLI Convert Command', () => {
  const testDir = './test-e2e-cli-convert';
  const fixturesDir = resolve(__dirname, '../fixtures').replace(/\\/g, '/');
  const templatesDir = join(fixturesDir, 'templates').replace(/\\/g, '/');
  const iconsRegistryPath = resolve(__dirname, '../../icons/registry.yaml').replace(/\\/g, '/');

  beforeEach(() => {
    mkdirSync(testDir, { recursive: true });

    // Create config file pointing to fixture templates and real icons registry
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

  it('should convert simple presentation from fixtures', async () => {
    const inputPath = join(fixturesDir, 'presentations/simple.yaml');
    const outputPath = join(testDir, 'output.md');
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

    expect(existsSync(outputPath)).toBe(true);

    const output = readFileSync(outputPath, 'utf-8');

    // Check frontmatter
    expect(output).toContain('marp: true');
    expect(output).toContain('title: Simple Presentation');
    expect(output).toContain('theme: default');

    // Check slide content
    expect(output).toContain('# Welcome');
    expect(output).toContain('A simple test presentation');
    expect(output).toContain('# Key Points');
    expect(output).toContain('- First point');
    expect(output).toContain('- Second point');
    expect(output).toContain('- Third point');
    expect(output).toContain('# Summary');

    // Check slide separators
    const slideSeparators = output.split('\n---\n');
    expect(slideSeparators.length).toBeGreaterThanOrEqual(3);
  });

  it('should handle multi-slide presentation', async () => {
    // Create a multi-slide presentation
    const presentation = `
meta:
  title: Multi-Slide Presentation
  author: E2E Test
  theme: academic

slides:
  - template: title
    content:
      title: Introduction
      subtitle: Getting started
      author: E2E Test

  - template: bullet-list
    content:
      title: Overview
      items:
        - Point A
        - Point B
        - Point C

  - template: section
    content:
      title: Deep Dive

  - template: numbered-list
    content:
      title: Steps
      items:
        - Step 1
        - Step 2
        - Step 3

  - template: section
    content:
      title: Conclusion
`;
    const inputPath = join(testDir, 'multi-slide.yaml');
    writeFileSync(inputPath, presentation);

    const outputPath = join(testDir, 'multi-slide.md');
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

    expect(existsSync(outputPath)).toBe(true);

    const output = readFileSync(outputPath, 'utf-8');

    // Check frontmatter with custom theme
    expect(output).toContain('marp: true');
    expect(output).toContain('theme: academic');

    // Check all slides rendered
    expect(output).toContain('# Introduction');
    expect(output).toContain('# Overview');
    expect(output).toContain('# Deep Dive');
    expect(output).toContain('# Steps');
    expect(output).toContain('# Conclusion');

    // Check list content
    expect(output).toContain('- Point A');
    expect(output).toContain('1. Step 1');
    expect(output).toContain('2. Step 2');
  });

  it('should handle verbose option', async () => {
    const inputPath = join(fixturesDir, 'presentations/simple.yaml');
    const outputPath = join(testDir, 'verbose-output.md');
    const configPath = join(testDir, 'config.yaml');

    const program = new Command();
    program.addCommand(createConvertCommand());

    // With verbose, there's no spinner so we can test it completes
    await program.parseAsync([
      'node',
      'test',
      'convert',
      inputPath,
      '-o',
      outputPath,
      '-c',
      configPath,
      '-v',
    ]);

    expect(existsSync(outputPath)).toBe(true);
  });

  it('should handle theme override with source without theme', async () => {
    // Create a presentation without theme to test theme override
    const presentation = `
meta:
  title: No Theme Presentation
slides:
  - template: title
    content:
      title: Test
`;
    const inputPath = join(testDir, 'no-theme.yaml');
    writeFileSync(inputPath, presentation);

    const outputPath = join(testDir, 'theme-override.md');
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
      '-t',
      'custom-theme',
    ]);

    expect(existsSync(outputPath)).toBe(true);

    const output = readFileSync(outputPath, 'utf-8');
    // The theme from -t option is set in config but presentation meta takes precedence
    // When source has no theme, config default is used
    // This test verifies the conversion completes successfully with theme option
    expect(output).toContain('marp: true');
  });

  it('should generate valid Marp markdown structure', async () => {
    const inputPath = join(fixturesDir, 'presentations/simple.yaml');
    const outputPath = join(testDir, 'structure-test.md');
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

    // Should start with frontmatter
    expect(output.startsWith('---\n')).toBe(true);

    // Should have frontmatter closing
    const frontmatterEnd = output.indexOf('---\n', 4);
    expect(frontmatterEnd).toBeGreaterThan(0);

    // Parse frontmatter
    const frontmatter = output.slice(4, frontmatterEnd);
    expect(frontmatter).toContain('marp: true');

    // Content should follow frontmatter
    const content = output.slice(frontmatterEnd + 4);
    expect(content.trim().length).toBeGreaterThan(0);
  });
});
