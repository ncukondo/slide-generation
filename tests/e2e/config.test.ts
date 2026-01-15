import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ConfigLoader } from '../../src/config/loader';
import { writeFileSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';

describe('E2E: Config System', () => {
  const testDir = './test-e2e-config';

  beforeEach(() => {
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it('should load and merge config from real files', async () => {
    const configContent = `
templates:
  builtin: "./my-templates"
  custom: "./custom-templates"

icons:
  registry: "./my-icons/registry.yaml"
  fetched: "./my-icons/fetched"

references:
  enabled: true
  connection:
    command: "my-ref"

output:
  theme: "academic"
  inlineStyles: true
`;
    writeFileSync(join(testDir, 'config.yaml'), configContent);

    const loader = new ConfigLoader();
    const found = await loader.findConfig(testDir);
    expect(found).toBeDefined();

    const config = await loader.load(found!);

    expect(config.templates.builtin).toBe('./my-templates');
    expect(config.templates.custom).toBe('./custom-templates');
    expect(config.icons.fetched).toBe('./my-icons/fetched');
    expect(config.references.connection.command).toBe('my-ref');
    expect(config.output.theme).toBe('academic');
  });

  it('should handle malformed YAML gracefully', async () => {
    writeFileSync(join(testDir, 'config.yaml'), 'invalid: yaml: content:');

    const loader = new ConfigLoader();
    await expect(loader.load(join(testDir, 'config.yaml'))).rejects.toThrow();
  });

  it('should apply defaults for partial config', async () => {
    const configContent = `
output:
  theme: "minimal"
`;
    writeFileSync(join(testDir, 'config.yaml'), configContent);

    const loader = new ConfigLoader();
    const config = await loader.load(join(testDir, 'config.yaml'));

    // User specified value
    expect(config.output.theme).toBe('minimal');

    // Default values
    expect(config.templates.builtin).toBe('./templates');
    expect(config.icons.registry).toBe('./icons/registry.yaml');
    expect(config.icons.fetched).toBe('./icons/fetched');
    expect(config.references.enabled).toBe(true);
    expect(config.references.connection.type).toBe('cli');
    expect(config.references.format.locale).toBe('ja-JP');
    expect(config.output.inlineStyles).toBe(false);
  });

  it('should work with slide-gen.yaml file', async () => {
    const configContent = `
output:
  theme: "slide-gen-theme"
`;
    writeFileSync(join(testDir, 'slide-gen.yaml'), configContent);

    const loader = new ConfigLoader();
    const found = await loader.findConfig(testDir);

    expect(found).toBe(join(testDir, 'slide-gen.yaml'));

    const config = await loader.load(found!);
    expect(config.output.theme).toBe('slide-gen-theme');
  });

  it('should handle empty config file', async () => {
    writeFileSync(join(testDir, 'config.yaml'), '');

    const loader = new ConfigLoader();
    const config = await loader.load(join(testDir, 'config.yaml'));

    // All defaults should be applied
    expect(config.output.theme).toBe('default');
    expect(config.templates.builtin).toBe('./templates');
  });

  it('should handle config with only comments', async () => {
    const configContent = `
# This is a comment
# output:
#   theme: "commented"
`;
    writeFileSync(join(testDir, 'config.yaml'), configContent);

    const loader = new ConfigLoader();
    const config = await loader.load(join(testDir, 'config.yaml'));

    // All defaults should be applied
    expect(config.output.theme).toBe('default');
  });

  it('should reject invalid type for config values', async () => {
    const configContent = `
references:
  format:
    maxAuthors: "not-a-number"
`;
    writeFileSync(join(testDir, 'config.yaml'), configContent);

    const loader = new ConfigLoader();
    await expect(loader.load(join(testDir, 'config.yaml'))).rejects.toThrow();
  });

  it('should handle deeply nested partial config', async () => {
    const configContent = `
references:
  format:
    maxAuthors: 5
`;
    writeFileSync(join(testDir, 'config.yaml'), configContent);

    const loader = new ConfigLoader();
    const config = await loader.load(join(testDir, 'config.yaml'));

    // User specified nested value
    expect(config.references.format.maxAuthors).toBe(5);

    // Other nested defaults preserved
    expect(config.references.format.locale).toBe('ja-JP');
    expect(config.references.format.authorSep).toBe(', ');
    expect(config.references.format.etAl).toBe('et al.');
    expect(config.references.enabled).toBe(true);
    expect(config.references.connection.type).toBe('cli');
  });
});
