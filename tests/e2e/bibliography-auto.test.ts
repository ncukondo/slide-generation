import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { exec } from 'child_process';
import { join } from 'path';
import { mkdir, rm, writeFile } from 'fs/promises';
import { Pipeline } from '../../src/core/pipeline';
import type { CSLItem } from '../../src/references';
import type { Config } from '../../src/config/schema';

vi.mock('child_process', async () => {
  const actual = await vi.importActual('child_process');
  return {
    ...actual,
    exec: vi.fn(),
  };
});

const mockExec = vi.mocked(exec);

const mockConfig: Config = {
  templates: {
    builtin: join(__dirname, '../fixtures/templates'),
  },
  icons: {
    registry: './icons/registry.yaml',
    cache: {
      enabled: true,
      directory: '.cache/icons',
      ttl: 86400,
    },
  },
  references: {
    enabled: true,
    connection: {
      type: 'cli' as const,
      command: 'ref',
    },
    format: {
      locale: 'ja-JP',
      authorSep: ', ',
      identifierSep: '; ',
      maxAuthors: 2,
      etAl: 'et al.',
      etAlJa: 'ほか',
    },
  },
  output: {
    theme: 'default',
    inlineStyles: false,
  },
};

const mockCSLItems: CSLItem[] = [
  {
    id: 'smith2024',
    author: [
      { family: 'Smith', given: 'John' },
      { family: 'Johnson', given: 'Alice' },
    ],
    issued: { 'date-parts': [[2024]] },
    title: 'Effective methods in modern research',
    'container-title': 'Journal of Advanced Studies',
    volume: '15',
    issue: '2',
    page: '123-145',
    PMID: '12345678',
  },
  {
    id: 'tanaka2023',
    author: [
      { family: '田中', given: '太郎' },
      { family: '山田', given: '花子' },
    ],
    issued: { 'date-parts': [[2023]] },
    title: '日本における研究動向の分析',
    'container-title': '学術研究誌',
    volume: '10',
    issue: '1',
    page: '50-65',
    DOI: '10.1234/example',
  },
];

type ExecCallback = (
  error: Error | null,
  stdout: string,
  stderr: string
) => void;

describe('E2E: Bibliography auto-generation', () => {
  let pipeline: Pipeline;
  let tempDir: string;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockExec.mockImplementation(((_cmd, callback) => {
      (callback as ExecCallback)(null, JSON.stringify(mockCSLItems), '');
    }) as typeof exec);

    pipeline = new Pipeline(mockConfig);
    await pipeline.initialize();

    tempDir = join(__dirname, '.tmp-bib-test');
    await mkdir(tempDir, { recursive: true });
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await rm(tempDir, { recursive: true, force: true });
  });

  describe('Auto-generation with citations', () => {
    it('should auto-generate bibliography sorted by author', async () => {
      const inputPath = join(tempDir, 'author-sort.yaml');
      const yamlContent = `
meta:
  title: Test Presentation
  author: Test Author
  theme: default
  references:
    enabled: true

slides:
  - template: bullet-list
    content:
      title: Introduction
      items:
        - "According to [@smith2024], this is important"
        - "See also [@tanaka2023]"

  - template: bibliography
    content:
      title: References
      autoGenerate: true
      sort: author
`;

      await writeFile(inputPath, yamlContent, 'utf-8');
      const result = await pipeline.runWithResult(inputPath);

      expect(result.output).toContain('References');
      expect(result.citations).toContain('smith2024');
      expect(result.citations).toContain('tanaka2023');
    });

    it('should auto-generate bibliography sorted by citation-order', async () => {
      const inputPath = join(tempDir, 'citation-order.yaml');
      const yamlContent = `
meta:
  title: Test
  author: Test Author
  theme: default
  references:
    enabled: true

slides:
  - template: bullet-list
    content:
      title: Content
      items:
        - "First [@tanaka2023]"
        - "Second [@smith2024]"

  - template: bibliography
    content:
      title: References
      autoGenerate: true
`;

      await writeFile(inputPath, yamlContent, 'utf-8');
      const result = await pipeline.runWithResult(inputPath);

      expect(result.output).toContain('References');
      // Citation order: tanaka first, then smith
      expect(result.citations[0]).toBe('tanaka2023');
      expect(result.citations[1]).toBe('smith2024');
    });

    it('should auto-generate bibliography sorted by year', async () => {
      const inputPath = join(tempDir, 'year-sort.yaml');
      const yamlContent = `
meta:
  title: Test
  author: Test Author
  theme: default
  references:
    enabled: true

slides:
  - template: bullet-list
    content:
      title: Content
      items:
        - "[@smith2024] and [@tanaka2023]"

  - template: bibliography
    content:
      title: References
      autoGenerate: true
      sort: year
`;

      await writeFile(inputPath, yamlContent, 'utf-8');
      const result = await pipeline.runWithResult(inputPath);

      expect(result.output).toContain('References');
      expect(result.citations).toContain('smith2024');
      expect(result.citations).toContain('tanaka2023');
    });
  });

  describe('Manual references', () => {
    it('should preserve manual references when autoGenerate is false', async () => {
      const inputPath = join(tempDir, 'manual-refs.yaml');
      const yamlContent = `
meta:
  title: Test
  author: Test Author
  theme: default

slides:
  - template: bibliography
    content:
      title: References
      references:
        - id: manual1
          authors:
            - "Manual, A."
          title: Manual Entry
          year: 2024
`;

      await writeFile(inputPath, yamlContent, 'utf-8');
      const result = await pipeline.runWithResult(inputPath);

      expect(result.output).toContain('References');
      expect(result.output).toContain('Manual, A.');
      expect(result.output).toContain('Manual Entry');
    });
  });

  describe('Edge cases', () => {
    it('should handle autoGenerate with no citations', async () => {
      const inputPath = join(tempDir, 'no-citations.yaml');
      const yamlContent = `
meta:
  title: Test
  author: Test Author
  theme: default

slides:
  - template: title
    content:
      title: No citations here

  - template: bibliography
    content:
      title: References
      autoGenerate: true
`;

      await writeFile(inputPath, yamlContent, 'utf-8');
      const result = await pipeline.runWithResult(inputPath);

      expect(result.output).toContain('References');
      expect(result.citations).toEqual([]);
    });

    it('should handle missing references gracefully', async () => {
      // Return only smith2024
      mockExec.mockImplementation(((_cmd, callback) => {
        (callback as ExecCallback)(
          null,
          JSON.stringify([mockCSLItems[0]]),
          ''
        );
      }) as typeof exec);

      const inputPath = join(tempDir, 'missing-ref.yaml');
      const yamlContent = `
meta:
  title: Test
  author: Test Author
  theme: default
  references:
    enabled: true

slides:
  - template: bullet-list
    content:
      title: Content
      items:
        - "[@smith2024] and [@missing2024]"

  - template: bibliography
    content:
      title: References
      autoGenerate: true
`;

      await writeFile(inputPath, yamlContent, 'utf-8');
      const result = await pipeline.runWithResult(inputPath);

      expect(result.output).toContain('References');
      expect(result.citations).toContain('smith2024');
      expect(result.citations).toContain('missing2024');
    });

    it('should warn when reference-manager is not available', async () => {
      // Mock exec to simulate unavailable reference-manager
      mockExec.mockImplementation(((_cmd, callback) => {
        const error = new Error('Command not found');
        (error as NodeJS.ErrnoException).code = 'ENOENT';
        (callback as ExecCallback)(error, '', '');
      }) as typeof exec);

      const inputPath = join(tempDir, 'unavailable-ref.yaml');
      const yamlContent = `
meta:
  title: Test
  author: Test Author
  theme: default
  references:
    enabled: true

slides:
  - template: bullet-list
    content:
      title: Content
      items:
        - "Citation [@smith2024]"
`;

      await writeFile(inputPath, yamlContent, 'utf-8');
      const result = await pipeline.runWithResult(inputPath);

      // Should have warning about reference-manager not being available
      expect(
        result.warnings.some((w) =>
          w.includes('reference-manager CLI is not available')
        )
      ).toBe(true);
      expect(result.warnings.some((w) => w.includes('npm install'))).toBe(true);
    });
  });
});
