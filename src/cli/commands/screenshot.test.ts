import { describe, it, expect } from 'vitest';
import { createScreenshotCommand } from './screenshot';

describe('screenshot command', () => {
  it('should create command with correct name', () => {
    const cmd = createScreenshotCommand();
    expect(cmd.name()).toBe('screenshot');
  });

  it('should have required options', () => {
    const cmd = createScreenshotCommand();
    const options = cmd.options.map((o) => o.long);
    expect(options).toContain('--output');
    expect(options).toContain('--slide');
    expect(options).toContain('--width');
    expect(options).toContain('--format');
  });

  it('should have input argument', () => {
    const cmd = createScreenshotCommand();
    expect(cmd.registeredArguments.length).toBe(1);
    expect(cmd.registeredArguments[0]?.name()).toBe('input');
  });

  it('should have correct default values', () => {
    const cmd = createScreenshotCommand();
    const outputOpt = cmd.options.find((o) => o.long === '--output');
    const formatOpt = cmd.options.find((o) => o.long === '--format');
    const widthOpt = cmd.options.find((o) => o.long === '--width');

    expect(outputOpt?.defaultValue).toBe('./screenshots');
    expect(formatOpt?.defaultValue).toBe('png');
    expect(widthOpt?.defaultValue).toBe(1280);
  });
});
