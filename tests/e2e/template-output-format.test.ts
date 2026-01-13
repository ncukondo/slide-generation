import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeFileSync, mkdirSync, rmSync, readFileSync, existsSync } from 'fs';
import { join, resolve } from 'path';
import { createConvertCommand } from '../../src/cli/commands/convert';
import { Command } from 'commander';
import { addHtmlOption } from '../../src/cli/utils/marp-runner';

describe('E2E: Template output format', () => {
  const testDir = './test-e2e-template-output-format';
  const templatesDir = resolve(__dirname, '../../templates').replace(/\\/g, '/');
  const iconsRegistryPath = resolve(__dirname, '../../icons/registry.yaml').replace(/\\/g, '/');

  beforeEach(() => {
    mkdirSync(testDir, { recursive: true });

    // Create config file pointing to production templates and real icons registry
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

  describe('addHtmlOption utility', () => {
    it('should add --html option when not present', () => {
      const args = ['input.md', '-o', 'output.html'];
      const result = addHtmlOption(args);
      expect(result).toContain('--html');
    });

    it('should not add --html if already present', () => {
      const args = ['--html', 'input.md', '-o', 'output.html'];
      const result = addHtmlOption(args);
      expect(result.filter((a) => a === '--html')).toHaveLength(1);
    });

    it('should not add --html if --no-html is present', () => {
      const args = ['--no-html', 'input.md', '-o', 'output.html'];
      const result = addHtmlOption(args);
      expect(result).not.toContain('--html');
      expect(result).toContain('--no-html');
    });
  });

  describe('HTML tags in template output', () => {
    it('should output HTML tags without escaping', async () => {
      const presentation = `
meta:
  title: HTML Tags Test
slides:
  - template: two-column
    content:
      title: "Two Column Test"
      left:
        - "Left item 1"
        - "Left item 2"
      right:
        - "Right item 1"
        - "Right item 2"
`;
      const inputPath = join(testDir, 'html-test.yaml');
      writeFileSync(inputPath, presentation);

      const outputPath = join(testDir, 'html-test.md');
      const configPath = join(testDir, 'config.yaml');

      const program = new Command();
      program.addCommand(createConvertCommand());

      await program.parseAsync([
        'node',
        'test',
        'convert',
        inputPath,
        '-o',
        outputPath,
        '-c',
        configPath,
      ]);

      expect(existsSync(outputPath)).toBe(true);

      const output = readFileSync(outputPath, 'utf-8');

      // HTML tags should not be escaped
      expect(output).toContain('<div');
      expect(output).toContain('</div>');
      expect(output).not.toContain('&lt;div');
      expect(output).not.toContain('&gt;');

      // Class names should be present
      expect(output).toContain('class=');
    });

    it('should output quote template with HTML footer', async () => {
      const presentation = `
meta:
  title: Quote Test
slides:
  - template: quote
    content:
      text: "The best way to predict the future is to invent it."
      author: "Alan Kay"
      source: "Xerox PARC"
`;
      const inputPath = join(testDir, 'quote-test.yaml');
      writeFileSync(inputPath, presentation);

      const outputPath = join(testDir, 'quote-test.md');
      const configPath = join(testDir, 'config.yaml');

      const program = new Command();
      program.addCommand(createConvertCommand());

      await program.parseAsync([
        'node',
        'test',
        'convert',
        inputPath,
        '-o',
        outputPath,
        '-c',
        configPath,
      ]);

      expect(existsSync(outputPath)).toBe(true);

      const output = readFileSync(outputPath, 'utf-8');

      // HTML tags should be present and not escaped
      expect(output).toContain('<blockquote');
      expect(output).toContain('<footer');
      expect(output).toContain('Alan Kay');
      expect(output).not.toContain('&lt;footer');
    });
  });

  describe('Markdown inside HTML blocks', () => {
    it('should have blank lines for Markdown image parsing in image-text template', async () => {
      const presentation = `
meta:
  title: Image Text Test
slides:
  - template: image-text
    content:
      title: "Product Overview"
      image: "product.png"
      text:
        - "Feature 1"
        - "Feature 2"
`;
      const inputPath = join(testDir, 'image-text-test.yaml');
      writeFileSync(inputPath, presentation);

      const outputPath = join(testDir, 'image-text-test.md');
      const configPath = join(testDir, 'config.yaml');

      const program = new Command();
      program.addCommand(createConvertCommand());

      await program.parseAsync([
        'node',
        'test',
        'convert',
        inputPath,
        '-o',
        outputPath,
        '-c',
        configPath,
      ]);

      expect(existsSync(outputPath)).toBe(true);

      const output = readFileSync(outputPath, 'utf-8');

      // Markdown image syntax should be present
      expect(output).toContain('![');
      expect(output).toContain('](product.png)');

      // HTML structure should be present
      expect(output).toContain('<div class="image-text-container">');
      expect(output).toContain('<div class="image-section">');
    });
  });

  describe('Table template output', () => {
    it('should output Markdown table syntax correctly', async () => {
      const presentation = `
meta:
  title: Table Test
slides:
  - template: table
    content:
      title: "Comparison Table"
      headers: ["Feature", "Plan A", "Plan B"]
      rows:
        - ["Storage", "10GB", "100GB"]
        - ["Users", "5", "Unlimited"]
`;
      const inputPath = join(testDir, 'table-test.yaml');
      writeFileSync(inputPath, presentation);

      const outputPath = join(testDir, 'table-test.md');
      const configPath = join(testDir, 'config.yaml');

      const program = new Command();
      program.addCommand(createConvertCommand());

      await program.parseAsync([
        'node',
        'test',
        'convert',
        inputPath,
        '-o',
        outputPath,
        '-c',
        configPath,
      ]);

      expect(existsSync(outputPath)).toBe(true);

      const output = readFileSync(outputPath, 'utf-8');

      // Markdown table syntax should be present
      expect(output).toContain('| Feature');
      expect(output).toContain('| Plan A');
      expect(output).toContain('| Plan B');
      expect(output).toContain('| Storage');
      expect(output).toContain('---'); // separator row
    });
  });
});
