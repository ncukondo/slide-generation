import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { join } from 'path';
import { mkdir, rm, writeFile, readFile } from 'fs/promises';
import { Pipeline, PipelineError } from './pipeline';
import type { Config } from '../config/schema';

const fixturesPath = join(__dirname, '../../tests/fixtures');
const templatesPath = join(fixturesPath, 'templates');
const presentationsPath = join(fixturesPath, 'presentations');

const testConfig: Config = {
  templates: {
    builtin: templatesPath,
  },
  icons: {
    registry: './icons/registry.yaml',
    fetched: './icons/fetched',
  },
  references: {
    enabled: false,
    connection: {
      type: 'cli' as const,
      command: 'ref',
    },
    format: {
      locale: 'ja-JP',
      authorSep: ', ',
      identifierSep: '; ',
      maxAuthors: 2,
      etAl: 'et al.',
      etAlJa: 'ほか',
    },
  },
  output: {
    theme: 'default',
    inlineStyles: false,
  },
};

describe('E2E: Pipeline', () => {
  let pipeline: Pipeline;
  let tempDir: string;

  beforeEach(async () => {
    pipeline = new Pipeline(testConfig);
    await pipeline.initialize();
    tempDir = join(__dirname, '../../.tmp-e2e-test');
    await mkdir(tempDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  describe('complete presentation conversion', () => {
    it('should convert a complete presentation to Marp markdown', async () => {
      const inputPath = join(presentationsPath, 'simple.yaml');
      const outputPath = join(tempDir, 'output.md');

      const result = await pipeline.runWithResult(inputPath, { outputPath });

      // Verify output structure
      expect(result.output).toContain('---');
      expect(result.output).toContain('marp: true');
      expect(result.slideCount).toBe(3);

      // Verify file was written
      const fileContent = await readFile(outputPath, 'utf-8');
      expect(fileContent).toBe(result.output);

      // Verify the output has proper Marp structure
      const sections = result.output.split('---');
      expect(sections.length).toBeGreaterThan(3); // frontmatter + slides
    });

    it('should generate valid Marp frontmatter', async () => {
      const inputPath = join(presentationsPath, 'simple.yaml');
      const result = await pipeline.runWithResult(inputPath);

      // Extract frontmatter
      const frontmatterMatch = result.output.match(/^---\n([\s\S]*?)\n---/);
      expect(frontmatterMatch).not.toBeNull();

      const frontmatter = frontmatterMatch![1];
      expect(frontmatter).toContain('marp: true');
      expect(frontmatter).toContain('title: Simple Presentation');
      expect(frontmatter).toContain('author: Test Author');
      expect(frontmatter).toContain('theme: default');
    });

    it('should transform slides using templates', async () => {
      const inputPath = join(presentationsPath, 'simple.yaml');
      const result = await pipeline.runWithResult(inputPath);

      // Check for title slide content
      expect(result.output).toContain('Welcome');
      expect(result.output).toContain('A simple test presentation');

      // Check for bullet list content
      expect(result.output).toContain('Key Points');
      expect(result.output).toContain('First point');
      expect(result.output).toContain('Second point');
      expect(result.output).toContain('Third point');

      // Check for section content
      expect(result.output).toContain('Summary');
    });
  });

  describe('error handling', () => {
    it('should handle missing references gracefully when disabled', async () => {
      // Create a simple presentation without citation macros
      const testPresentation = `
meta:
  title: No Citations Test
  theme: default

slides:
  - template: title
    content:
      title: Simple Slide
`;
      const inputPath = join(tempDir, 'no-citations.yaml');
      await writeFile(inputPath, testPresentation);

      // With references disabled, the presentation should be generated
      const result = await pipeline.runWithResult(inputPath);

      expect(result.output).toBeDefined();
      expect(result.slideCount).toBe(1);
      expect(result.citations).toEqual([]);
    });

    it('should report validation errors with context', async () => {
      const inputPath = join(presentationsPath, 'invalid.yaml');

      try {
        await pipeline.run(inputPath);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(PipelineError);
        const pipelineError = error as PipelineError;
        expect(pipelineError.stage).toBeDefined();
      }
    });

    it('should provide clear error for non-existent template', async () => {
      const inputPath = join(presentationsPath, 'invalid.yaml');

      try {
        await pipeline.run(inputPath);
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(PipelineError);
      }
    });
  });

  describe('custom presentation', () => {
    it('should handle a dynamically created presentation', async () => {
      // Create a test presentation file
      const testPresentation = `
meta:
  title: Dynamic Test
  author: CI Bot
  theme: default

slides:
  - template: title
    content:
      title: Generated Title
      subtitle: From E2E Test

  - template: bullet-list
    content:
      title: Test Items
      items:
        - Item A
        - Item B
`;
      const inputPath = join(tempDir, 'dynamic.yaml');
      await writeFile(inputPath, testPresentation);

      const result = await pipeline.runWithResult(inputPath);

      expect(result.slideCount).toBe(2);
      expect(result.output).toContain('Dynamic Test');
      expect(result.output).toContain('Generated Title');
      expect(result.output).toContain('Item A');
      expect(result.output).toContain('Item B');
    });

    it('should handle raw template', async () => {
      const testPresentation = `
meta:
  title: Raw Content Test
  theme: default

slides:
  - template: raw
    raw: |
      # Custom Markdown

      This is **raw** content with _formatting_.

      - List item 1
      - List item 2
`;
      const inputPath = join(tempDir, 'raw-test.yaml');
      await writeFile(inputPath, testPresentation);

      const result = await pipeline.runWithResult(inputPath);

      expect(result.slideCount).toBe(1);
      expect(result.output).toContain('# Custom Markdown');
      expect(result.output).toContain('**raw**');
      expect(result.output).toContain('_formatting_');
    });
  });

  describe('speaker notes', () => {
    it('should include speaker notes in output', async () => {
      const testPresentation = `
meta:
  title: Notes Test
  theme: default

slides:
  - template: title
    content:
      title: Slide with Notes
    notes: |
      This is a speaker note.
      It can have multiple lines.
`;
      const inputPath = join(tempDir, 'notes-test.yaml');
      await writeFile(inputPath, testPresentation);

      const result = await pipeline.runWithResult(inputPath);

      expect(result.output).toContain('<!--');
      expect(result.output).toContain('This is a speaker note.');
      expect(result.output).toContain('It can have multiple lines.');
      expect(result.output).toContain('-->');
    });
  });

  describe('warnings collection', () => {
    it('should collect warnings during processing', async () => {
      const inputPath = join(presentationsPath, 'simple.yaml');
      const result = await pipeline.runWithResult(inputPath);

      // With all features working, there should be no warnings
      expect(Array.isArray(result.warnings)).toBe(true);
    });
  });
});
