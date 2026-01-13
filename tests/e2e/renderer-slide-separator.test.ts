import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeFileSync, mkdirSync, rmSync, readFileSync, existsSync } from 'fs';
import { join, resolve } from 'path';
import { createConvertCommand } from '../../src/cli/commands/convert';
import { Command } from 'commander';

describe('E2E: Renderer slide separator', () => {
  const testDir = './test-e2e-renderer-separator';
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

  it('should not generate empty first slide', async () => {
    // Create a simple presentation with title template
    const presentation = `
meta:
  title: Test Presentation
  theme: default

slides:
  - template: title
    content:
      title: "Test Title"
      subtitle: "Test Subtitle"
`;
    const inputPath = join(testDir, 'test.yaml');
    const outputPath = join(testDir, 'output.md');
    const configPath = join(testDir, 'config.yaml');

    writeFileSync(inputPath, presentation);

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

    // Should NOT have ---\n\n--- pattern (which creates empty slide)
    expect(output).not.toMatch(/---\n\n---/);

    // The first slide content should come right after front matter
    // Front matter ends with ---, then content should follow
    const frontMatterEnd = output.indexOf('---\n', output.indexOf('---') + 1);
    const afterFrontMatter = output.substring(frontMatterEnd + 4);

    // First non-whitespace content should NOT be ---
    const firstContent = afterFrontMatter.trimStart();
    expect(firstContent.startsWith('---')).toBe(false);
  });

  it('should properly separate multiple slides', async () => {
    // Create a multi-slide presentation
    const presentation = `
meta:
  title: Multi-Slide Test
  theme: default

slides:
  - template: title
    content:
      title: "First Slide"

  - template: bullet-list
    content:
      title: "Second Slide"
      items:
        - Item 1
        - Item 2

  - template: section
    content:
      title: "Third Slide"
`;
    const inputPath = join(testDir, 'multi.yaml');
    const outputPath = join(testDir, 'multi-output.md');
    const configPath = join(testDir, 'config.yaml');

    writeFileSync(inputPath, presentation);

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

    // Count slide separators (--- between slides, not in front matter)
    // Front matter has 2 ---, slides should have (n-1) separators for n slides
    const afterFrontMatter = output.split('---').slice(2).join('---');
    const slideSeparatorCount = (afterFrontMatter.match(/\n---\n/g) || []).length;

    // 3 slides should have 2 separators between them
    expect(slideSeparatorCount).toBe(2);

    // Should NOT have empty slide pattern
    expect(output).not.toMatch(/---\n\n---/);
  });
});
