import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { join } from 'path';
import { mkdir, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { randomUUID } from 'crypto';
import { Command } from 'commander';
import { createPreviewCommand, PreviewOptions } from './preview';

describe('preview command', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = join(tmpdir(), `slide-gen-preview-test-${randomUUID()}`);
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  describe('createPreviewCommand', () => {
    it('should create a commander command', () => {
      const cmd = createPreviewCommand();
      expect(cmd).toBeInstanceOf(Command);
      expect(cmd.name()).toBe('preview');
    });

    it('should have correct options', () => {
      const cmd = createPreviewCommand();
      const options = cmd.options;
      const optionNames = options.map((o) => o.long);
      expect(optionNames).toContain('--port');
      expect(optionNames).toContain('--watch');
    });

    it('should have port default value', () => {
      const cmd = createPreviewCommand();
      const portOption = cmd.options.find((o) => o.long === '--port');
      expect(portOption!.defaultValue).toBe('8080');
    });

    it('should accept input argument', () => {
      const cmd = createPreviewCommand();
      expect(cmd.registeredArguments.length).toBe(1);
      expect(cmd.registeredArguments[0]!.name()).toBe('input');
    });
  });

  describe('option parsing', () => {
    it('should parse port as number', () => {
      const cmd = createPreviewCommand();
      const portOption = cmd.options.find((o) => o.short === '-p');
      expect(portOption).toBeDefined();
    });

    it('should accept watch flag', () => {
      const cmd = createPreviewCommand();
      const watchOption = cmd.options.find((o) => o.short === '-w');
      expect(watchOption).toBeDefined();
    });
  });
});

describe('preview command - execution', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = join(tmpdir(), `slide-gen-preview-test-${randomUUID()}`);
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it('should require input file to exist', async () => {
    const { executePreview } = await import('./preview');
    const nonExistentPath = join(testDir, 'nonexistent.yaml');

    const result = await executePreview(nonExistentPath, {
      signal: AbortSignal.abort(),
    });

    expect(result.success).toBe(false);
    expect(result.errors.some((e) => e.includes('not found'))).toBe(true);
  });

  it('should check for marp-cli availability', { timeout: 10000 }, async () => {
    const { checkMarpCliAvailable } = await import('./preview');
    const available = await checkMarpCliAvailable();
    // Result depends on whether marp-cli is installed
    expect(typeof available).toBe('boolean');
  });

  it('should generate temporary markdown file path', async () => {
    const { getTempOutputPath } = await import('./preview');
    const inputPath = '/path/to/presentation.yaml';
    const tempPath = getTempOutputPath(inputPath);

    expect(tempPath).toContain('presentation');
    expect(tempPath).toContain('.md');
  });
});

describe('preview command - marp integration', () => {
  it('should build correct marp command for preview', async () => {
    const { buildMarpCommand } = await import('./preview');
    const options: PreviewOptions = {
      port: 3000,
    };

    const cmd = buildMarpCommand('/path/to/slides.md', options);

    expect(cmd).toContain('marp');
    expect(cmd).toContain('--preview');
    expect(cmd).toContain('-p');
    expect(cmd).toContain('3000');
  });

  it('should include watch flag when specified', async () => {
    const { buildMarpCommand } = await import('./preview');
    const options: PreviewOptions = {
      port: 8080,
      watch: true,
    };

    const cmd = buildMarpCommand('/path/to/slides.md', options);

    expect(cmd).toContain('--watch');
  });
});
