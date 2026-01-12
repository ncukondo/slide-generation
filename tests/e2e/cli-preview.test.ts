import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeFileSync, mkdirSync, rmSync } from 'fs';
import { join, resolve } from 'path';
import {
  createPreviewCommand,
  checkMarpCliAvailable,
  buildMarpCommand,
  getTempOutputPath,
} from '../../src/cli/commands/preview';

describe('E2E: CLI Preview Command', () => {
  const testDir = './test-e2e-cli-preview';
  const fixturesDir = resolve(__dirname, '../fixtures').replace(/\\/g, '/');
  const templatesDir = join(fixturesDir, 'templates').replace(/\\/g, '/');
  const iconsRegistryPath = resolve(__dirname, '../../icons/registry.yaml').replace(/\\/g, '/');

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

  it('should create command with correct structure', () => {
    const cmd = createPreviewCommand();

    expect(cmd.name()).toBe('preview');
    expect(cmd.description()).toContain('Preview');
    expect(cmd.registeredArguments.length).toBe(1);

    const options = cmd.options.map((o) => o.long);
    expect(options).toContain('--port');
    expect(options).toContain('--watch');
    expect(options).toContain('--config');
  });

  it('should check marp-cli availability', async () => {
    const available = await checkMarpCliAvailable();
    expect(typeof available).toBe('boolean');
  });

  it('should build correct marp command for server mode', () => {
    const cmd = buildMarpCommand('/tmp/test-dir', { port: 3000 });
    expect(cmd).toContain('marp');
    expect(cmd).toContain('--server');
    expect(cmd).toContain('-I');
    expect(cmd).toContain('/tmp/test-dir');
  });

  it('should build marp command with watch flag', () => {
    const cmd = buildMarpCommand('/tmp/test.md', { port: 8080, watch: true });
    expect(cmd).toContain('--watch');
  });

  it('should generate temp output path', () => {
    const tempPath = getTempOutputPath('/path/to/slides.yaml');
    expect(tempPath).toContain('slides');
    expect(tempPath).toContain('.md');
    expect(tempPath).toContain('slide-gen-preview');
  });

  it('should use default port of 8080', () => {
    const cmd = createPreviewCommand();
    const portOption = cmd.options.find((o) => o.long === '--port');
    expect(portOption!.defaultValue).toBe('8080');
  });
});
