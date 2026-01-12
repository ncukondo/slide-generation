import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdir, rm, readdir, writeFile, stat, access } from 'fs/promises';
import { join } from 'path';
import { execSync } from 'child_process';
import { tmpdir } from 'os';
import { randomUUID } from 'crypto';

// Skip this test suite if browser is not available (requires Chrome/Edge/Firefox for Marp CLI)
// These tests require a real browser to take screenshots
const hasBrowser = (() => {
  try {
    // Check for browser availability by trying to detect common browser paths
    const { execSync } = require('child_process');

    // Try to detect Chrome/Chromium
    const browserChecks = [
      'which google-chrome',
      'which google-chrome-stable',
      'which chromium',
      'which chromium-browser',
    ];

    for (const cmd of browserChecks) {
      try {
        execSync(cmd, { stdio: 'ignore' });
        return true;
      } catch {
        // Continue checking
      }
    }

    // Also check CHROME_PATH
    if (process.env.CHROME_PATH) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
})();

describe.skipIf(!hasBrowser)('E2E: screenshot AI optimization', () => {
  let testDir: string;
  let yamlPath: string;

  beforeEach(async () => {
    testDir = join(tmpdir(), `slide-gen-screenshot-ai-e2e-${randomUUID()}`);
    await mkdir(testDir, { recursive: true });
    yamlPath = join(testDir, 'test.yaml');

    await writeFile(
      yamlPath,
      `meta:
  title: Test Presentation
slides:
  - template: title
    content:
      title: Test Slide 1
      subtitle: Subtitle
  - template: bullet-list
    content:
      title: Content
      items:
        - Item 1
        - Item 2
  - template: section
    content:
      title: Section
  - template: bullet-list
    content:
      title: More Content
      items:
        - Item 3
`
    );
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it('should generate AI-optimized screenshots', async () => {
    const outputDir = join(testDir, 'screenshots');

    const output = execSync(
      `node ${join(process.cwd(), 'dist/cli/index.js')} screenshot ${yamlPath} -o ${outputDir} --format ai`,
      { encoding: 'utf-8' }
    );

    // Check output contains AI-optimized information
    expect(output).toContain('AI-optimized');
    expect(output).toContain('Estimated tokens');

    // Check files were created
    const files = await readdir(outputDir);
    const jpegFiles = files.filter((f) => f.endsWith('.jpeg'));
    expect(jpegFiles.length).toBeGreaterThan(0);

    // Check file size is smaller than default (AI-optimized should be smaller)
    const firstFile = jpegFiles[0]!;
    const fileStat = await stat(join(outputDir, firstFile));
    // AI-optimized files should be reasonably small
    expect(fileStat.size).toBeLessThan(500000); // Less than 500KB
  });

  it('should show token estimation for AI format', async () => {
    const outputDir = join(testDir, 'screenshots');

    const output = execSync(
      `node ${join(process.cwd(), 'dist/cli/index.js')} screenshot ${yamlPath} -o ${outputDir} --format ai`,
      { encoding: 'utf-8' }
    );

    // Check token estimation is displayed
    expect(output).toContain('Estimated tokens');
    // Token count should be shown with ~ prefix
    expect(output).toMatch(/~\d+/);
    // Should mention number of images
    expect(output).toMatch(/\d+ images?/);
  });

  it('should generate contact sheet', async () => {
    const outputDir = join(testDir, 'screenshots');

    execSync(
      `node ${join(process.cwd(), 'dist/cli/index.js')} screenshot ${yamlPath} -o ${outputDir} --contact-sheet`,
      { encoding: 'utf-8' }
    );

    const files = await readdir(outputDir);
    const contactFile = files.find((f) => f.includes('contact'));
    expect(contactFile).toBeDefined();
    expect(contactFile).toContain('.png');

    // Contact sheet should exist
    await expect(access(join(outputDir, contactFile!))).resolves.toBeUndefined();
  });

  it('should support --quality option for JPEG', async () => {
    const outputDir = join(testDir, 'screenshots');

    // Generate with low quality
    execSync(
      `node ${join(process.cwd(), 'dist/cli/index.js')} screenshot ${yamlPath} -o ${outputDir} --format jpeg --quality 50`,
      { encoding: 'utf-8' }
    );

    const files = await readdir(outputDir);
    const jpegFiles = files.filter((f) => f.endsWith('.jpeg'));
    expect(jpegFiles.length).toBeGreaterThan(0);
  });

  it('should support --columns option for contact sheet', async () => {
    const outputDir = join(testDir, 'screenshots');

    execSync(
      `node ${join(process.cwd(), 'dist/cli/index.js')} screenshot ${yamlPath} -o ${outputDir} --contact-sheet --columns 3`,
      { encoding: 'utf-8' }
    );

    const files = await readdir(outputDir);
    const contactFile = files.find((f) => f.includes('contact'));
    expect(contactFile).toBeDefined();
  });

  it('should provide Claude Code read commands in AI format output', async () => {
    const outputDir = join(testDir, 'screenshots');

    const output = execSync(
      `node ${join(process.cwd(), 'dist/cli/index.js')} screenshot ${yamlPath} -o ${outputDir} --format ai`,
      { encoding: 'utf-8' }
    );

    // Should provide instructions for Claude Code
    expect(output).toContain('Read');
    expect(output).toContain('.jpeg');
  });
});
