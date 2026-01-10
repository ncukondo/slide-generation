import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeFileSync, mkdirSync, rmSync, readFileSync, existsSync } from 'fs';
import { join, resolve } from 'path';
import { createConvertCommand } from '../../src/cli/commands/convert';
import { Command } from 'commander';

describe('E2E: Performance Tests', () => {
  const testDir = './test-e2e-performance';
  const fixturesDir = resolve(__dirname, '../fixtures');
  const templatesDir = join(fixturesDir, 'templates');
  const iconsRegistryPath = resolve(__dirname, '../../icons/registry.yaml');

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

  it('should handle large presentation (100 slides) within acceptable time', async () => {
    // Generate a 100-slide presentation
    const slides: string[] = [];

    // Add title slide
    slides.push(`
  - template: title
    content:
      title: Large Presentation Test
      subtitle: 100 Slides
      author: Performance Test`);

    // Add various slide types
    const templates = [
      {
        type: 'bullet-list',
        content: `
      title: Bullet List Slide
      items:
        - Point 1
        - Point 2
        - Point 3`,
      },
      {
        type: 'numbered-list',
        content: `
      title: Numbered List Slide
      items:
        - Step 1
        - Step 2
        - Step 3`,
      },
      {
        type: 'section',
        content: `
      title: Section Title
      subtitle: Section Subtitle`,
      },
      {
        type: 'two-column',
        content: `
      title: Two Column Layout
      left:
        - Left item 1
        - Left item 2
      right:
        - Right item 1
        - Right item 2
      ratio: "50:50"`,
      },
      {
        type: 'table',
        content: `
      title: Data Table
      headers: ["Col A", "Col B", "Col C"]
      rows:
        - ["Data 1", "Data 2", "Data 3"]
        - ["Data 4", "Data 5", "Data 6"]`,
      },
      {
        type: 'quote',
        content: `
      title: Quote Slide
      text: "This is a test quote for performance testing."
      author: "Test Author"`,
      },
    ];

    // Fill to 100 slides
    for (let i = 0; i < 99; i++) {
      const template = templates[i % templates.length];
      slides.push(`
  - template: ${template.type}
    content:${template.content}`);
    }

    const presentation = `
meta:
  title: Large Presentation
  author: Performance Test

slides:${slides.join('')}
`;

    const inputPath = join(testDir, 'large.yaml');
    writeFileSync(inputPath, presentation);

    const outputPath = join(testDir, 'large.md');
    const configPath = join(testDir, 'config.yaml');

    const program = new Command();
    program.addCommand(createConvertCommand());

    const startTime = performance.now();

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

    const endTime = performance.now();
    const duration = endTime - startTime;

    // Should complete within 10 seconds
    expect(duration).toBeLessThan(10000);

    // Verify output was generated
    expect(existsSync(outputPath)).toBe(true);

    const output = readFileSync(outputPath, 'utf-8');

    // Should have correct number of slide separators (at least 99 separators for 100 slides)
    const separators = output.split('\n---\n');
    expect(separators.length).toBeGreaterThanOrEqual(99);

    // Log performance metrics
    console.log(`Performance: 100 slides converted in ${duration.toFixed(0)}ms`);
    console.log(`Output size: ${(output.length / 1024).toFixed(1)}KB`);
  });

  it('should handle repeated conversions efficiently', async () => {
    const presentation = `
meta:
  title: Repeated Conversion Test

slides:
  - template: title
    content:
      title: Test
      author: Test

  - template: bullet-list
    content:
      title: Points
      items:
        - Point 1
        - Point 2
`;

    const inputPath = join(testDir, 'repeated.yaml');
    writeFileSync(inputPath, presentation);
    const configPath = join(testDir, 'config.yaml');

    const iterations = 10;
    const times: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const outputPath = join(testDir, `repeated-${i}.md`);

      const program = new Command();
      program.addCommand(createConvertCommand());

      const startTime = performance.now();

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

      const duration = performance.now() - startTime;
      times.push(duration);
    }

    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    const maxTime = Math.max(...times);

    // Average should be under 500ms
    expect(avgTime).toBeLessThan(500);

    // Max should be under 1000ms
    expect(maxTime).toBeLessThan(1000);

    console.log(`Repeated conversion (${iterations}x):`);
    console.log(`  Average: ${avgTime.toFixed(0)}ms`);
    console.log(`  Max: ${maxTime.toFixed(0)}ms`);
    console.log(`  Min: ${Math.min(...times).toFixed(0)}ms`);
  });

  it('should handle complex nested content efficiently', async () => {
    const presentation = `
meta:
  title: Complex Nested Test

slides:
  - template: bullet-list
    content:
      title: Nested Lists
      items:
        - Parent item 1
        - nested:
            title: Parent item 2
            items:
              - Child A
              - Child B
              - nested:
                  title: Child C
                  items:
                    - Grandchild 1
                    - Grandchild 2
        - Parent item 3
        - nested:
            title: Parent item 4
            items:
              - Child D
              - Child E

  - template: hierarchy
    content:
      title: Deep Hierarchy
      root:
        label: Level 0
        children:
          - label: Level 1-A
            children:
              - label: Level 2-A
              - label: Level 2-B
          - label: Level 1-B
            children:
              - label: Level 2-C
              - label: Level 2-D
                children:
                  - label: Level 3-A
                  - label: Level 3-B

  - template: flow-chart
    content:
      title: Long Flow
      direction: horizontal
      steps:
        - { label: "Start", type: "start" }
        - { label: "Step 1", type: "process" }
        - { label: "Step 2", type: "process" }
        - { label: "Step 3", type: "process" }
        - { label: "Step 4", type: "process" }
        - { label: "Step 5", type: "process" }
        - { label: "End", type: "end" }
`;

    const inputPath = join(testDir, 'complex.yaml');
    writeFileSync(inputPath, presentation);

    const outputPath = join(testDir, 'complex.md');
    const configPath = join(testDir, 'config.yaml');

    const program = new Command();
    program.addCommand(createConvertCommand());

    const startTime = performance.now();

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

    const duration = performance.now() - startTime;

    // Complex content should still be fast
    expect(duration).toBeLessThan(1000);

    expect(existsSync(outputPath)).toBe(true);

    const output = readFileSync(outputPath, 'utf-8');

    // Verify nested content rendered
    expect(output).toContain('Nested Lists');
    expect(output).toContain('Child A');
    expect(output).toContain('Deep Hierarchy');
    expect(output).toContain('Level 3-A');

    console.log(`Complex content converted in ${duration.toFixed(0)}ms`);
  });
});
