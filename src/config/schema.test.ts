import { describe, it, expect } from 'vitest';
import { configSchema } from './schema';

describe('configSchema', () => {
  it('should validate a complete config', () => {
    const config = {
      templates: { builtin: './templates' },
      icons: { registry: './icons/registry.yaml' },
      references: { enabled: true },
      output: { theme: 'default' },
    };
    expect(() => configSchema.parse(config)).not.toThrow();
  });

  it('should apply defaults for missing optional fields', () => {
    const config = {};
    const parsed = configSchema.parse(config);
    expect(parsed.output.theme).toBe('default');
  });

  it('should reject invalid config', () => {
    const config = { templates: { builtin: 123 } }; // should be string
    expect(() => configSchema.parse(config)).toThrow();
  });

  it('should apply all default values correctly', () => {
    const parsed = configSchema.parse({});

    // templates defaults
    expect(parsed.templates.builtin).toBe('./templates');
    expect(parsed.templates.custom).toBeUndefined();

    // icons defaults
    expect(parsed.icons.registry).toBe('./icons/registry.yaml');
    expect(parsed.icons.cache.enabled).toBe(true);
    expect(parsed.icons.cache.directory).toBe('.cache/icons');
    expect(parsed.icons.cache.ttl).toBe(86400);

    // references defaults
    expect(parsed.references.enabled).toBe(true);
    expect(parsed.references.connection.type).toBe('cli');
    expect(parsed.references.connection.command).toBe('ref');
    expect(parsed.references.format.locale).toBe('ja-JP');
    expect(parsed.references.format.authorSep).toBe(', ');
    expect(parsed.references.format.identifierSep).toBe('; ');
    expect(parsed.references.format.maxAuthors).toBe(2);
    expect(parsed.references.format.etAl).toBe('et al.');
    expect(parsed.references.format.etAlJa).toBe('ほか');

    // output defaults
    expect(parsed.output.theme).toBe('default');
    expect(parsed.output.inlineStyles).toBe(false);
  });

  it('should allow partial config with deep nesting', () => {
    const config = {
      icons: {
        cache: {
          enabled: false,
        },
      },
    };
    const parsed = configSchema.parse(config);

    expect(parsed.icons.cache.enabled).toBe(false);
    expect(parsed.icons.cache.directory).toBe('.cache/icons'); // default preserved
  });

  it('should validate type constraints', () => {
    // Invalid cache ttl type
    expect(() =>
      configSchema.parse({
        icons: { cache: { ttl: 'invalid' } },
      })
    ).toThrow();

    // Invalid maxAuthors type
    expect(() =>
      configSchema.parse({
        references: { format: { maxAuthors: 'two' } },
      })
    ).toThrow();

    // Invalid inlineStyles type
    expect(() =>
      configSchema.parse({
        output: { inlineStyles: 'yes' },
      })
    ).toThrow();
  });
});
