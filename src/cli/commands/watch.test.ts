import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { join } from 'path';
import { mkdir, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { randomUUID } from 'crypto';
import { Command } from 'commander';
import { createWatchCommand, WatchResult, WatchState } from './watch';

describe('watch command', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = join(tmpdir(), `slide-gen-watch-test-${randomUUID()}`);
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  describe('createWatchCommand', () => {
    it('should create a commander command', () => {
      const cmd = createWatchCommand();
      expect(cmd).toBeInstanceOf(Command);
      expect(cmd.name()).toBe('watch');
    });

    it('should have correct options', () => {
      const cmd = createWatchCommand();
      const options = cmd.options;
      const optionNames = options.map((o) => o.long);
      expect(optionNames).toContain('--output');
      expect(optionNames).toContain('--debounce');
      expect(optionNames).toContain('--config');
    });

    it('should accept input argument', () => {
      const cmd = createWatchCommand();
      // Commander stores arguments differently
      expect(cmd.registeredArguments.length).toBe(1);
      expect(cmd.registeredArguments[0]!.name()).toBe('input');
    });
  });

  describe('WatchState', () => {
    it('should track watcher state', () => {
      const state = new WatchState();
      expect(state.isRunning).toBe(false);

      state.start();
      expect(state.isRunning).toBe(true);

      state.stop();
      expect(state.isRunning).toBe(false);
    });

    it('should track conversion count', () => {
      const state = new WatchState();
      expect(state.conversionCount).toBe(0);

      state.incrementConversion();
      expect(state.conversionCount).toBe(1);

      state.incrementConversion();
      expect(state.conversionCount).toBe(2);
    });

    it('should track last error', () => {
      const state = new WatchState();
      expect(state.lastError).toBeNull();

      const error = new Error('test error');
      state.setError(error);
      expect(state.lastError).toBe(error);

      state.clearError();
      expect(state.lastError).toBeNull();
    });
  });

  describe('WatchResult', () => {
    it('should include conversion stats', () => {
      const result: WatchResult = {
        success: true,
        conversionCount: 5,
        errors: [],
      };
      expect(result.conversionCount).toBe(5);
      expect(result.success).toBe(true);
    });

    it('should include errors when conversion fails', () => {
      const result: WatchResult = {
        success: false,
        conversionCount: 3,
        errors: ['File not found', 'Invalid YAML'],
      };
      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(2);
    });
  });
});

describe('watch command - file watching', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = join(tmpdir(), `slide-gen-watch-test-${randomUUID()}`);
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it('should require input file to exist', async () => {
    const { executeWatch } = await import('./watch');
    const nonExistentPath = join(testDir, 'nonexistent.yaml');

    const result = await executeWatch(nonExistentPath, {
      signal: AbortSignal.abort(),
    });

    expect(result.success).toBe(false);
    expect(result.errors.some((e) => e.includes('not found'))).toBe(true);
  });

  it('should use default output path based on input', async () => {
    const { getDefaultOutputPath } = await import('./watch');
    const inputPath = '/path/to/presentation.yaml';
    const outputPath = getDefaultOutputPath(inputPath);

    // Normalize path separators for cross-platform comparison
    const normalizedOutput = outputPath.replace(/\\/g, '/');
    expect(normalizedOutput).toBe('/path/to/presentation.md');
  });

  it('should respect custom debounce value', () => {
    const cmd = createWatchCommand();
    const options = cmd.options.find((o) => o.long === '--debounce');
    // Default value is stored as string since it's defined with string format
    expect(options?.defaultValue).toBe('300');
  });
});
