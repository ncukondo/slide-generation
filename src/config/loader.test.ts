import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ConfigLoader } from './loader';
import { writeFileSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';

describe('ConfigLoader', () => {
  const testDir = './test-config-tmp';

  beforeEach(() => {
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it('should load config from file', async () => {
    const configPath = join(testDir, 'config.yaml');
    writeFileSync(configPath, 'output:\n  theme: "custom"');

    const loader = new ConfigLoader();
    const config = await loader.load(configPath);

    expect(config.output.theme).toBe('custom');
  });

  it('should return default config when file not found', async () => {
    const loader = new ConfigLoader();
    const config = await loader.load('./nonexistent.yaml');

    expect(config.output.theme).toBe('default');
  });

  it('should merge configs with priority', async () => {
    const configPath = join(testDir, 'config.yaml');
    writeFileSync(configPath, 'output:\n  theme: "custom"');

    const loader = new ConfigLoader();
    const config = await loader.load(configPath);

    // File config overrides default
    expect(config.output.theme).toBe('custom');
    // Default is preserved for unspecified fields
    expect(config.output.inlineStyles).toBe(false);
  });

  it('should return default config when called without path', async () => {
    const loader = new ConfigLoader();
    const config = await loader.load();

    expect(config.output.theme).toBe('default');
    expect(config.templates.builtin).toBe('./templates');
  });

  it('should throw on invalid YAML', async () => {
    const configPath = join(testDir, 'config.yaml');
    writeFileSync(configPath, 'invalid: yaml: content:');

    const loader = new ConfigLoader();
    await expect(loader.load(configPath)).rejects.toThrow();
  });

  it('should throw on invalid config structure', async () => {
    const configPath = join(testDir, 'config.yaml');
    writeFileSync(configPath, 'templates:\n  builtin: 123');

    const loader = new ConfigLoader();
    await expect(loader.load(configPath)).rejects.toThrow();
  });
});
