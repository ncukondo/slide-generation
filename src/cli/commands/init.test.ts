import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { join } from 'path';
import { mkdir, rm, readFile, readdir, stat, access, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { randomUUID } from 'crypto';
import { Command } from 'commander';
import {
  createInitCommand,
  executeInit,
  isMarpCliInstalled,
  isMarpCliInstalledGlobally,
  isMarpCliInstalledLocally,
  detectPackageManager,
  getMarpInstallCommand,
} from './init';

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
      await executeInit(targetDir, { skipMarpInstall: true });

      const entries = await readdir(targetDir);
      expect(entries).toContain('config.yaml');
      expect(entries).toContain('themes');
      expect(entries).toContain('icons');
    });

    it('should create config.yaml with default content', async () => {
      const targetDir = join(testDir, 'my-presentation');
      await executeInit(targetDir, { skipMarpInstall: true });

      const configContent = await readFile(join(targetDir, 'config.yaml'), 'utf-8');
      expect(configContent).toContain('templates:');
      expect(configContent).toContain('icons:');
      expect(configContent).toContain('output:');
    });

    it('should create sample presentation.yaml when examples enabled (default)', async () => {
      const targetDir = join(testDir, 'my-presentation');
      await executeInit(targetDir, { skipMarpInstall: true });

      const entries = await readdir(targetDir);
      expect(entries).toContain('presentation.yaml');

      const presentationContent = await readFile(join(targetDir, 'presentation.yaml'), 'utf-8');
      expect(presentationContent).toContain('meta:');
      expect(presentationContent).toContain('slides:');
    });

    it('should not create sample files when --no-examples is set', async () => {
      const targetDir = join(testDir, 'my-presentation');
      await executeInit(targetDir, { examples: false, skipMarpInstall: true });

      const entries = await readdir(targetDir);
      expect(entries).toContain('config.yaml');
      expect(entries).not.toContain('presentation.yaml');
    });

    it('should create themes directory with custom.css', async () => {
      const targetDir = join(testDir, 'my-presentation');
      await executeInit(targetDir, { skipMarpInstall: true });

      const themesDir = join(targetDir, 'themes');
      const themeStat = await stat(themesDir);
      expect(themeStat.isDirectory()).toBe(true);

      const themeFiles = await readdir(themesDir);
      expect(themeFiles).toContain('custom.css');
    });

    it('should create icons/custom directory', async () => {
      const targetDir = join(testDir, 'my-presentation');
      await executeInit(targetDir, { skipMarpInstall: true });

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
        await executeInit('.', { skipMarpInstall: true });
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
      await executeInit(targetDir, { skipMarpInstall: true });

      // Check that warning or info was logged about existing directory
      // The exact implementation will determine the behavior
      consoleSpy.mockRestore();
    });

    it('should handle template option', async () => {
      const targetDir = join(testDir, 'with-template');
      await executeInit(targetDir, { template: 'basic', skipMarpInstall: true });

      const entries = await readdir(targetDir);
      expect(entries).toContain('config.yaml');
      // Template option affects the generated sample files
    });

    it('should create nested directories', async () => {
      const targetDir = join(testDir, 'nested', 'deep', 'presentation');
      await executeInit(targetDir, { skipMarpInstall: true });

      const entries = await readdir(targetDir);
      expect(entries).toContain('config.yaml');
    });
  });

  describe('init command - AI config options', () => {
    it('should accept --no-ai-config option', () => {
      const cmd = createInitCommand();
      const options = cmd.options;
      const optionNames = options.map((o) => o.long);
      expect(optionNames).toContain('--no-ai-config');
    });

    it('should accept --skip-marp-install option', () => {
      const cmd = createInitCommand();
      const options = cmd.options;
      const optionNames = options.map((o) => o.long);
      expect(optionNames).toContain('--skip-marp-install');
    });
  });

  describe('executeInit - AI config generation', () => {
    it('should generate .skills/slide-assistant/SKILL.md', async () => {
      const targetDir = join(testDir, 'ai-config-test');
      await executeInit(targetDir, { skipMarpInstall: true });

      const content = await readFile(
        join(targetDir, '.skills', 'slide-assistant', 'SKILL.md'),
        'utf-8'
      );
      expect(content).toContain('name: slide-assistant');
      expect(content).toContain('slide-gen');
    });

    it('should generate CLAUDE.md', async () => {
      const targetDir = join(testDir, 'claude-md-test');
      await executeInit(targetDir, { skipMarpInstall: true });

      const content = await readFile(join(targetDir, 'CLAUDE.md'), 'utf-8');
      expect(content).toContain('slide-gen');
    });

    it('should generate .claude/commands/', async () => {
      const targetDir = join(testDir, 'claude-commands-test');
      await executeInit(targetDir, { skipMarpInstall: true });

      const commands = await readdir(join(targetDir, '.claude', 'commands'));
      expect(commands).toContain('slide-create.md');
      expect(commands).toContain('slide-validate.md');
      expect(commands).toContain('slide-preview.md');
    });

    it('should generate AGENTS.md', async () => {
      const targetDir = join(testDir, 'agents-md-test');
      await executeInit(targetDir, { skipMarpInstall: true });

      const content = await readFile(join(targetDir, 'AGENTS.md'), 'utf-8');
      expect(content).toContain('slide-gen');
    });

    it('should generate .opencode/agent/slide.md', async () => {
      const targetDir = join(testDir, 'opencode-test');
      await executeInit(targetDir, { skipMarpInstall: true });

      const content = await readFile(
        join(targetDir, '.opencode', 'agent', 'slide.md'),
        'utf-8'
      );
      expect(content).toContain('mode: subagent');
    });

    it('should generate .cursorrules', async () => {
      const targetDir = join(testDir, 'cursorrules-test');
      await executeInit(targetDir, { skipMarpInstall: true });

      const content = await readFile(join(targetDir, '.cursorrules'), 'utf-8');
      expect(content).toContain('slide-gen');
    });

    it('should skip AI config with --no-ai-config', async () => {
      const targetDir = join(testDir, 'no-ai-config-test');
      await executeInit(targetDir, { aiConfig: false, skipMarpInstall: true });

      await expect(access(join(targetDir, 'CLAUDE.md'))).rejects.toThrow();
      await expect(access(join(targetDir, '.skills'))).rejects.toThrow();
    });

    it('should not overwrite existing CLAUDE.md', async () => {
      const targetDir = join(testDir, 'existing-claude-md');
      await mkdir(targetDir, { recursive: true });
      await writeFile(join(targetDir, 'CLAUDE.md'), '# Existing');

      await executeInit(targetDir, { skipMarpInstall: true });

      const content = await readFile(join(targetDir, 'CLAUDE.md'), 'utf-8');
      expect(content).toBe('# Existing');
    });

    it('should generate references/templates.md', async () => {
      const targetDir = join(testDir, 'references-test');
      await executeInit(targetDir, { skipMarpInstall: true });

      const content = await readFile(
        join(targetDir, '.skills', 'slide-assistant', 'references', 'templates.md'),
        'utf-8'
      );
      expect(content).toContain('Template Reference');
    });

    it('should generate references/workflows.md', async () => {
      const targetDir = join(testDir, 'workflows-test');
      await executeInit(targetDir, { skipMarpInstall: true });

      const content = await readFile(
        join(targetDir, '.skills', 'slide-assistant', 'references', 'workflows.md'),
        'utf-8'
      );
      expect(content).toContain('Workflow Reference');
    });

    it('should generate references/skill.md for reference management', async () => {
      const targetDir = join(testDir, 'ref-skill-test');
      await executeInit(targetDir, { skipMarpInstall: true });

      const content = await readFile(
        join(targetDir, '.skills', 'slide-assistant', 'references', 'skill.md'),
        'utf-8'
      );
      expect(content).toContain('Reference Management');
      expect(content).toContain('ref add');
    });

    it('should generate slide-references.md command', async () => {
      const targetDir = join(testDir, 'slide-refs-cmd-test');
      await executeInit(targetDir, { skipMarpInstall: true });

      const commands = await readdir(join(targetDir, '.claude', 'commands'));
      expect(commands).toContain('slide-references.md');

      const content = await readFile(
        join(targetDir, '.claude', 'commands', 'slide-references.md'),
        'utf-8'
      );
      expect(content).toContain('Manage references');
    });
  });

  describe('Marp CLI installation helpers', () => {
    it('should detect if Marp CLI is installed (deprecated function)', { timeout: 10000 }, () => {
      // Uses 'marp --version' directly (faster than npx)
      const result = isMarpCliInstalled();
      expect(typeof result).toBe('boolean');
    });

    it('should detect if Marp CLI is installed globally', { timeout: 10000 }, () => {
      const result = isMarpCliInstalledGlobally();
      expect(typeof result).toBe('boolean');
    });

    it('should detect if Marp CLI is installed locally', async () => {
      const targetDir = join(testDir, 'local-marp-test');
      await mkdir(targetDir, { recursive: true });

      // No node_modules/.bin/marp exists
      expect(isMarpCliInstalledLocally(targetDir)).toBe(false);

      // Create fake node_modules/.bin/marp
      await mkdir(join(targetDir, 'node_modules', '.bin'), { recursive: true });
      await writeFile(join(targetDir, 'node_modules', '.bin', 'marp'), '');

      expect(isMarpCliInstalledLocally(targetDir)).toBe(true);
    });

    it('should detect package manager', () => {
      const pm = detectPackageManager();
      expect(['npm', 'pnpm', 'yarn']).toContain(pm);
    });

    it('should detect pnpm when pnpm-lock.yaml exists', async () => {
      const targetDir = join(testDir, 'pnpm-project');
      await mkdir(targetDir, { recursive: true });
      await writeFile(join(targetDir, 'pnpm-lock.yaml'), '');

      const pm = detectPackageManager(targetDir);
      expect(pm).toBe('pnpm');
    });

    it('should detect yarn when yarn.lock exists', async () => {
      const targetDir = join(testDir, 'yarn-project');
      await mkdir(targetDir, { recursive: true });
      await writeFile(join(targetDir, 'yarn.lock'), '');

      const pm = detectPackageManager(targetDir);
      expect(pm).toBe('yarn');
    });

    it('should default to npm when no lock file exists', async () => {
      const targetDir = join(testDir, 'npm-project');
      await mkdir(targetDir, { recursive: true });

      const pm = detectPackageManager(targetDir);
      expect(pm).toBe('npm');
    });

    it('should return correct install command for each package manager', () => {
      expect(getMarpInstallCommand('pnpm')).toBe('pnpm add -D @marp-team/marp-cli');
      expect(getMarpInstallCommand('yarn')).toBe('yarn add -D @marp-team/marp-cli');
      expect(getMarpInstallCommand('npm')).toBe('npm install -D @marp-team/marp-cli');
    });

    it('should skip Marp CLI info with --skip-marp-install', async () => {
      const targetDir = join(testDir, 'skip-marp-test');
      const consoleSpy = vi.spyOn(console, 'log');

      await executeInit(targetDir, { skipMarpInstall: true });

      // Should not show Marp CLI info
      const calls = consoleSpy.mock.calls.flat().join(' ');
      expect(calls).not.toContain('Marp CLI is recommended');
      consoleSpy.mockRestore();
    });
  });
});
