import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  CitationExtractor,
  ReferenceManager,
  CitationFormatter,
  CSLItem,
} from './index';
import { Parser } from '../core/parser';
import { exec } from 'child_process';

vi.mock('child_process', () => ({
  exec: vi.fn(),
}));

const mockExec = vi.mocked(exec);

describe('References E2E', () => {
  const mockCSLItems: CSLItem[] = [
    {
      id: 'smith2024',
      author: [
        { family: 'Smith', given: 'John' },
        { family: 'Johnson', given: 'Alice' },
        { family: 'Williams', given: 'Bob' },
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
    {
      id: 'johnson2022',
      author: [
        { family: 'Johnson', given: 'Alice' },
        { family: 'Williams', given: 'Bob' },
      ],
      issued: { 'date-parts': [[2022]] },
      title: 'A comprehensive review',
      'container-title': 'Annual Review',
      volume: '8',
      issue: '4',
      page: '200-220',
    },
  ];

  type ExecCallback = (
    error: Error | null,
    stdout: string,
    stderr: string
  ) => void;

  beforeEach(() => {
    vi.clearAllMocks();

    mockExec.mockImplementation(((_cmd, callback) => {
      (callback as ExecCallback)(null, JSON.stringify(mockCSLItems), '');
    }) as typeof exec);
  });

  describe('Full workflow: YAML → Extract → Expand → Bibliography', () => {
    it('should process a complete presentation with citations', async () => {
      // 1. Parse YAML source
      const parser = new Parser();
      const yamlContent = `
meta:
  title: "研究発表"
  references:
    enabled: true

slides:
  - template: bullet-list
    content:
      title: "先行研究"
      items:
        - "従来手法の限界 [@smith2024]"
        - "新たなアプローチ [@tanaka2023; @johnson2022]"

  - template: quote
    content:
      text: "この発見は画期的である"
      source: "@smith2024"
      page: "p.42"

  - template: bibliography
    content:
      title: "参考文献"
`;

      const presentation = parser.parse(yamlContent);

      expect(presentation.meta.title).toBe('研究発表');
      expect(presentation.slides).toHaveLength(3);

      // 2. Extract citations
      const extractor = new CitationExtractor();
      const citations = extractor.extractFromPresentation(presentation);

      const uniqueIds = extractor.getUniqueIds(citations);
      expect(uniqueIds).toContain('smith2024');
      expect(uniqueIds).toContain('tanaka2023');
      expect(uniqueIds).toContain('johnson2022');

      // 3. Setup formatter with mocked manager
      const manager = new ReferenceManager('ref');
      const formatter = new CitationFormatter(manager);

      // 4. Expand citations in slide content
      const slide1Items = presentation.slides[0]!['content']['items'] as string[];

      const expandedItem0 = await formatter.expandCitations(slide1Items[0]!);
      expect(expandedItem0).toBe(
        '従来手法の限界 (Smith et al., 2024; PMID: 12345678)'
      );

      const expandedItem1 = await formatter.expandCitations(slide1Items[1]!);
      expect(expandedItem1).toContain('(田中・山田, 2023; DOI: 10.1234/example)');
      expect(expandedItem1).toContain('(Johnson & Williams, 2022)');

      // 5. Generate bibliography
      const bibliography = await formatter.generateBibliography(
        uniqueIds,
        'citation-order'
      );

      expect(bibliography).toHaveLength(3);
      expect(bibliography[0]).toContain('Smith');
      expect(bibliography[0]).toContain('PMID: 12345678');
      expect(bibliography[1]).toContain('田中');
      expect(bibliography[1]).toContain('DOI: 10.1234/example');
      expect(bibliography[2]).toContain('Johnson');
    });
  });

  describe('CLI availability check', () => {
    it('should detect when reference-manager is available', async () => {
      mockExec.mockImplementation(((_cmd, callback) => {
        if ((_cmd as string).includes('--version')) {
          (callback as ExecCallback)(null, 'ref version 1.0.0', '');
        } else {
          (callback as ExecCallback)(null, JSON.stringify(mockCSLItems), '');
        }
      }) as typeof exec);

      const manager = new ReferenceManager('ref');
      const available = await manager.isAvailable();

      expect(available).toBe(true);
    });

    it('should detect when reference-manager is not available', async () => {
      mockExec.mockImplementation(((_cmd, callback) => {
        const error = new Error('Command not found');
        (error as NodeJS.ErrnoException).code = 'ENOENT';
        (callback as ExecCallback)(error, '', '');
      }) as typeof exec);

      const manager = new ReferenceManager('ref');
      const available = await manager.isAvailable();

      expect(available).toBe(false);
    });
  });

  describe('Edge cases', () => {
    it('should handle presentation without citations', async () => {
      const parser = new Parser();
      const yamlContent = `
meta:
  title: "No Citations"

slides:
  - template: title
    content:
      title: "Simple Title"
`;

      const presentation = parser.parse(yamlContent);
      const extractor = new CitationExtractor();
      const citations = extractor.extractFromPresentation(presentation);

      expect(citations).toHaveLength(0);
    });

    it('should handle unknown citation keys gracefully', async () => {
      const manager = new ReferenceManager('ref');
      const formatter = new CitationFormatter(manager);

      // Mock empty response for unknown ID
      mockExec.mockImplementation(((_cmd, callback) => {
        (callback as ExecCallback)(null, '[]', '');
      }) as typeof exec);

      const result = await formatter.formatInline('nonexistent');
      expect(result).toBe('[nonexistent]');
    });

    it('should handle mixed valid and invalid citations', async () => {
      // Return only smith2024
      mockExec.mockImplementation(((_cmd, callback) => {
        (callback as ExecCallback)(null, JSON.stringify([mockCSLItems[0]]), '');
      }) as typeof exec);

      const manager = new ReferenceManager('ref');
      const formatter = new CitationFormatter(manager);

      const text = 'Valid [@smith2024] and invalid [@unknown]';
      const result = await formatter.expandCitations(text);

      expect(result).toContain('(Smith et al., 2024; PMID: 12345678)');
      expect(result).toContain('[unknown]');
    });
  });

  describe('Bibliography sorting', () => {
    it('should sort by author correctly', async () => {
      mockExec.mockImplementation(((_cmd, callback) => {
        (callback as ExecCallback)(null, JSON.stringify(mockCSLItems), '');
      }) as typeof exec);

      const manager = new ReferenceManager('ref');
      const formatter = new CitationFormatter(manager);

      const bibliography = await formatter.generateBibliography(
        ['tanaka2023', 'smith2024', 'johnson2022'],
        'author'
      );

      // Johnson < Smith < 田中
      expect(bibliography[0]).toContain('Johnson');
      expect(bibliography[1]).toContain('Smith');
      expect(bibliography[2]).toContain('田中');
    });

    it('should sort by year correctly', async () => {
      mockExec.mockImplementation(((_cmd, callback) => {
        (callback as ExecCallback)(null, JSON.stringify(mockCSLItems), '');
      }) as typeof exec);

      const manager = new ReferenceManager('ref');
      const formatter = new CitationFormatter(manager);

      const bibliography = await formatter.generateBibliography(
        ['smith2024', 'tanaka2023', 'johnson2022'],
        'year'
      );

      // 2022 < 2023 < 2024
      expect(bibliography[0]).toContain('2022');
      expect(bibliography[1]).toContain('2023');
      expect(bibliography[2]).toContain('2024');
    });
  });
});
