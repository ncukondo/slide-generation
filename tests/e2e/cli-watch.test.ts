import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeFileSync, mkdirSync, rmSync, readFileSync, existsSync } from 'fs';
import { join, resolve } from 'path';
import { createWatchCommand, executeWatch } from '../../src/cli/commands/watch';

describe('E2E: CLI Watch Command', () => {
  const testDir = './test-e2e-cli-watch';
  const fixturesDir = resolve(__dirname, '../fixtures');
  const templatesDir = join(fixturesDir, 'templates');
  const iconsRegistryPath = resolve(__dirname, '../../icons/registry.yaml');

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

  it('should convert file initially when watch starts', { timeout: 10000 }, async () => {
    const inputPath = join(fixturesDir, 'presentations/simple.yaml');
    const outputPath = join(testDir, 'output.md');
    const configPath = join(testDir, 'config.yaml');

    // Use abort controller to stop watch immediately after initial conversion
    const controller = new AbortController();

    // Start watch with immediate abort after 100ms to allow initial conversion
    const watchPromise = executeWatch(inputPath, {
      output: outputPath,
      config: configPath,
      signal: controller.signal,
    });

    // Wait a bit for initial conversion
    await new Promise((r) => setTimeout(r, 500));
    controller.abort();

    const result = await watchPromise;

    // Check initial conversion completed
    expect(existsSync(outputPath)).toBe(true);
    expect(result.conversionCount).toBeGreaterThanOrEqual(1);

    const output = readFileSync(outputPath, 'utf-8');
    expect(output).toContain('marp: true');
    expect(output).toContain('# Welcome');
  });

  it('should handle missing input file', async () => {
    const nonExistentPath = join(testDir, 'nonexistent.yaml');

    const result = await executeWatch(nonExistentPath, {
      signal: AbortSignal.abort(),
    });

    expect(result.success).toBe(false);
    expect(result.errors.some((e) => e.includes('not found'))).toBe(true);
  });

  it('should use default output path', async () => {
    // Create a simple presentation
    const presentation = `
meta:
  title: Watch Test
slides:
  - template: title
    content:
      title: Test
`;
    const inputPath = join(testDir, 'watch-test.yaml');
    writeFileSync(inputPath, presentation);

    const configPath = join(testDir, 'config.yaml');
    const controller = new AbortController();

    const watchPromise = executeWatch(inputPath, {
      config: configPath,
      signal: controller.signal,
    });

    await new Promise((r) => setTimeout(r, 500));
    controller.abort();

    await watchPromise;

    // Default output should be same basename with .md
    const defaultOutputPath = join(testDir, 'watch-test.md');
    expect(existsSync(defaultOutputPath)).toBe(true);
  });

  it('should create command with correct structure', () => {
    const cmd = createWatchCommand();

    expect(cmd.name()).toBe('watch');
    expect(cmd.description()).toContain('Watch');
    expect(cmd.registeredArguments.length).toBe(1);

    const options = cmd.options.map((o) => o.long);
    expect(options).toContain('--output');
    expect(options).toContain('--debounce');
    expect(options).toContain('--config');
  });
});
