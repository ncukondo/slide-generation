import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { join } from 'path';
import { mkdir, rm } from 'fs/promises';
import { Pipeline, PipelineError } from './pipeline';
import type { Config } from '../config/schema';

// Mock dependencies
const mockConfig: Config = {
  templates: {
    builtin: join(__dirname, '../../tests/fixtures/templates'),
  },
  icons: {
    registry: './icons/registry.yaml',
    cache: {
      enabled: true,
      directory: '.cache/icons',
      ttl: 86400,
    },
  },
  references: {
    enabled: false, // Disable references for basic tests
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

const fixturesPath = join(__dirname, '../../tests/fixtures/presentations');

describe('Pipeline', () => {
  describe('constructor', () => {
    it('should create a Pipeline instance with config', () => {
      const pipeline = new Pipeline(mockConfig);
      expect(pipeline).toBeInstanceOf(Pipeline);
    });
  });

  describe('initialize', () => {
    it('should load templates on initialize', async () => {
      const pipeline = new Pipeline(mockConfig);
      await expect(pipeline.initialize()).resolves.not.toThrow();
    });

    it('should throw PipelineError if initialization fails', async () => {
      const badConfig = {
        ...mockConfig,
        templates: { builtin: '/nonexistent/path' },
      };
      const pipeline = new Pipeline(badConfig);

      await expect(pipeline.initialize()).rejects.toThrow(PipelineError);
    });
  });

  describe('run', () => {
    let pipeline: Pipeline;

    beforeEach(async () => {
      pipeline = new Pipeline(mockConfig);
      await pipeline.initialize();
    });

    it('should convert a simple YAML presentation to Marp markdown', async () => {
      const inputPath = join(fixturesPath, 'simple.yaml');
      const output = await pipeline.run(inputPath);

      // Check that output is a string
      expect(typeof output).toBe('string');

      // Check for Marp frontmatter
      expect(output).toContain('---');
      expect(output).toContain('marp: true');
      expect(output).toContain('title: Simple Presentation');

      // Check that slides are separated correctly
      expect(output.split('---').length).toBeGreaterThan(2);
    });

    it('should include author and theme in frontmatter', async () => {
      const inputPath = join(fixturesPath, 'simple.yaml');
      const output = await pipeline.run(inputPath);

      expect(output).toContain('author: Test Author');
      expect(output).toContain('theme: default');
    });

    it('should throw PipelineError for non-existent file', async () => {
      const inputPath = join(fixturesPath, 'nonexistent.yaml');

      await expect(pipeline.run(inputPath)).rejects.toThrow(PipelineError);

      try {
        await pipeline.run(inputPath);
      } catch (error) {
        expect((error as PipelineError).stage).toBe('parse');
      }
    });

    it('should throw PipelineError for validation errors', async () => {
      const inputPath = join(fixturesPath, 'invalid.yaml');

      await expect(pipeline.run(inputPath)).rejects.toThrow(PipelineError);
    });
  });

  describe('runWithResult', () => {
    let pipeline: Pipeline;

    beforeEach(async () => {
      pipeline = new Pipeline(mockConfig);
      await pipeline.initialize();
    });

    it('should return detailed result with slide count', async () => {
      const inputPath = join(fixturesPath, 'simple.yaml');
      const result = await pipeline.runWithResult(inputPath);

      expect(result.output).toBeDefined();
      expect(result.slideCount).toBe(3); // 3 slides in simple.yaml
      expect(result.warnings).toEqual([]);
      expect(result.citations).toEqual([]);
    });
  });

  describe('output file', () => {
    let pipeline: Pipeline;
    let tempDir: string;

    beforeEach(async () => {
      pipeline = new Pipeline(mockConfig);
      await pipeline.initialize();
      tempDir = join(__dirname, '../../.tmp-test');
      await mkdir(tempDir, { recursive: true });
    });

    afterEach(async () => {
      await rm(tempDir, { recursive: true, force: true });
    });

    it('should write output to file when outputPath is specified', async () => {
      const inputPath = join(fixturesPath, 'simple.yaml');
      const outputPath = join(tempDir, 'output.md');

      const output = await pipeline.run(inputPath, { outputPath });

      // Check that the file was created
      const { readFile } = await import('fs/promises');
      const fileContent = await readFile(outputPath, 'utf-8');
      expect(fileContent).toBe(output);
    });
  });
});

describe('PipelineError', () => {
  it('should create an error with stage information', () => {
    const error = new PipelineError('Test error', 'parse');
    expect(error.message).toBe('Test error');
    expect(error.stage).toBe('parse');
    expect(error.name).toBe('PipelineError');
  });

  it('should include optional details', () => {
    const details = { line: 10, column: 5 };
    const error = new PipelineError('Validation failed', 'transform', details);
    expect(error.details).toEqual(details);
  });

  it('should be an instance of Error', () => {
    const error = new PipelineError('Test', 'test');
    expect(error).toBeInstanceOf(Error);
  });
});
