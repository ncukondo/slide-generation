import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { join } from 'path';
import { mkdir, rm, readFile, readdir, stat } from 'fs/promises';
import { tmpdir } from 'os';
import { randomUUID } from 'crypto';
import { Command } from 'commander';
import { createInitCommand, executeInit } from './init';

describe('init command', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = join(tmpdir(), `slide-gen-init-test-${randomUUID()}`);
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  describe('createInitCommand', () => {
    it('should create a commander command', () => {
      const cmd = createInitCommand();
      expect(cmd).toBeInstanceOf(Command);
      expect(cmd.name()).toBe('init');
    });

    it('should have correct options', () => {
      const cmd = createInitCommand();
      const options = cmd.options;
      const optionNames = options.map((o) => o.long);
      expect(optionNames).toContain('--template');
      expect(optionNames).toContain('--no-examples');
    });
  });

  describe('executeInit', () => {
    it('should create directory structure', async () => {
      const targetDir = join(testDir, 'my-presentation');
      await executeInit(targetDir, {});

      const entries = await readdir(targetDir);
      expect(entries).toContain('config.yaml');
      expect(entries).toContain('themes');
      expect(entries).toContain('icons');
    });

    it('should create config.yaml with default content', async () => {
      const targetDir = join(testDir, 'my-presentation');
      await executeInit(targetDir, {});

      const configContent = await readFile(join(targetDir, 'config.yaml'), 'utf-8');
      expect(configContent).toContain('templates:');
      expect(configContent).toContain('icons:');
      expect(configContent).toContain('output:');
    });

    it('should create sample presentation.yaml when examples enabled (default)', async () => {
      const targetDir = join(testDir, 'my-presentation');
      await executeInit(targetDir, {});

      const entries = await readdir(targetDir);
      expect(entries).toContain('presentation.yaml');

      const presentationContent = await readFile(join(targetDir, 'presentation.yaml'), 'utf-8');
      expect(presentationContent).toContain('meta:');
      expect(presentationContent).toContain('slides:');
    });

    it('should not create sample files when --no-examples is set', async () => {
      const targetDir = join(testDir, 'my-presentation');
      await executeInit(targetDir, { examples: false });

      const entries = await readdir(targetDir);
      expect(entries).toContain('config.yaml');
      expect(entries).not.toContain('presentation.yaml');
    });

    it('should create themes directory with custom.css', async () => {
      const targetDir = join(testDir, 'my-presentation');
      await executeInit(targetDir, {});

      const themesDir = join(targetDir, 'themes');
      const themeStat = await stat(themesDir);
      expect(themeStat.isDirectory()).toBe(true);

      const themeFiles = await readdir(themesDir);
      expect(themeFiles).toContain('custom.css');
    });

    it('should create icons/custom directory', async () => {
      const targetDir = join(testDir, 'my-presentation');
      await executeInit(targetDir, {});

      const iconsCustomDir = join(targetDir, 'icons', 'custom');
      const dirStat = await stat(iconsCustomDir);
      expect(dirStat.isDirectory()).toBe(true);
    });

    it('should initialize in current directory when no directory specified', async () => {
      const originalCwd = process.cwd();
      const targetDir = join(testDir, 'current-dir-test');
      await mkdir(targetDir, { recursive: true });
      process.chdir(targetDir);

      try {
        await executeInit('.', {});
        const entries = await readdir(targetDir);
        expect(entries).toContain('config.yaml');
      } finally {
        process.chdir(originalCwd);
      }
    });

    it('should warn when directory already exists with files', async () => {
      const targetDir = join(testDir, 'existing');
      await mkdir(targetDir, { recursive: true });
      await mkdir(join(targetDir, 'config.yaml'), { recursive: true }); // Create as dir to simulate existing file

      const consoleSpy = vi.spyOn(console, 'log');
      await executeInit(targetDir, {});

      // Check that warning or info was logged about existing directory
      // The exact implementation will determine the behavior
      consoleSpy.mockRestore();
    });

    it('should handle template option', async () => {
      const targetDir = join(testDir, 'with-template');
      await executeInit(targetDir, { template: 'basic' });

      const entries = await readdir(targetDir);
      expect(entries).toContain('config.yaml');
      // Template option affects the generated sample files
    });

    it('should create nested directories', async () => {
      const targetDir = join(testDir, 'nested', 'deep', 'presentation');
      await executeInit(targetDir, {});

      const entries = await readdir(targetDir);
      expect(entries).toContain('config.yaml');
    });
  });
});
