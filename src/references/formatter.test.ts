import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CitationFormatter, FormatterConfig } from './formatter';
import { ReferenceManager, CSLItem } from './manager';

// Mock ReferenceManager
vi.mock('./manager', () => ({
  ReferenceManager: vi.fn(),
}));

describe('CitationFormatter', () => {
  let formatter: CitationFormatter;
  let mockManager: {
    getById: ReturnType<typeof vi.fn>;
    getByIds: ReturnType<typeof vi.fn>;
  };

  const mockItems: Record<string, CSLItem> = {
    smith2024: {
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
    tanaka2023: {
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
    johnson2022: {
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
    singleAuthor: {
      id: 'singleAuthor',
      author: [{ family: 'Brown', given: 'Charlie' }],
      issued: { 'date-parts': [[2021]] },
      title: 'Solo work',
    },
    singleJapanese: {
      id: 'singleJapanese',
      author: [{ family: '鈴木', given: '一郎' }],
      issued: { 'date-parts': [[2021]] },
      title: '単著の論文',
    },
    threeJapanese: {
      id: 'threeJapanese',
      author: [
        { family: '佐藤', given: '太郎' },
        { family: '伊藤', given: '次郎' },
        { family: '加藤', given: '三郎' },
      ],
      issued: { 'date-parts': [[2020]] },
      title: '共著の論文',
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockManager = {
      getById: vi.fn((id: string) => Promise.resolve(mockItems[id] || null)),
      getByIds: vi.fn((ids: string[]) => {
        const map = new Map<string, CSLItem>();
        for (const id of ids) {
          if (mockItems[id]) {
            map.set(id, mockItems[id]);
          }
        }
        return Promise.resolve(map);
      }),
    };

    formatter = new CitationFormatter(
      mockManager as unknown as ReferenceManager
    );
  });

  describe('formatInline', () => {
    it('should format single author', async () => {
      const result = await formatter.formatInline('singleAuthor');

      expect(result).toBe('(Brown, 2021)');
    });

    it('should format two authors with &', async () => {
      const result = await formatter.formatInline('johnson2022');

      expect(result).toBe('(Johnson & Williams, 2022)');
    });

    it('should format three+ authors with et al.', async () => {
      const result = await formatter.formatInline('smith2024');

      expect(result).toBe('(Smith et al., 2024; PMID: 12345678)');
    });

    it('should include PMID when available', async () => {
      const result = await formatter.formatInline('smith2024');

      expect(result).toContain('PMID: 12345678');
    });

    it('should include DOI when PMID not available', async () => {
      const result = await formatter.formatInline('tanaka2023');

      expect(result).toBe('(田中・山田, 2023; DOI: 10.1234/example)');
    });

    it('should format Japanese single author', async () => {
      const result = await formatter.formatInline('singleJapanese');

      expect(result).toBe('(鈴木, 2021)');
    });

    it('should format Japanese two authors with ・', async () => {
      const result = await formatter.formatInline('tanaka2023');

      expect(result).toContain('田中・山田');
    });

    it('should format Japanese 3+ authors with ほか', async () => {
      const result = await formatter.formatInline('threeJapanese');

      expect(result).toBe('(佐藤ほか, 2020)');
    });

    it('should return placeholder for unknown reference', async () => {
      const result = await formatter.formatInline('nonexistent');

      expect(result).toBe('[nonexistent]');
    });
  });

  describe('formatFull', () => {
    it('should format full citation with PMID', async () => {
      const result = await formatter.formatFull('smith2024');

      expect(result).toContain('Smith, J., Johnson, A., & Williams, B.');
      expect(result).toContain('(2024)');
      expect(result).toContain('Effective methods in modern research');
      expect(result).toContain('*Journal of Advanced Studies*');
      expect(result).toContain('15(2)');
      expect(result).toContain('123-145');
      expect(result).toContain('PMID: 12345678');
    });

    it('should format full citation with DOI', async () => {
      const result = await formatter.formatFull('tanaka2023');

      expect(result).toContain('田中太郎, 山田花子');
      expect(result).toContain('(2023)');
      expect(result).toContain('DOI: 10.1234/example');
    });

    it('should format citation without identifier', async () => {
      const result = await formatter.formatFull('johnson2022');

      expect(result).not.toContain('PMID');
      expect(result).not.toContain('DOI');
      expect(result).toContain('Johnson, A., & Williams, B.');
    });

    it('should return placeholder for unknown reference', async () => {
      const result = await formatter.formatFull('nonexistent');

      expect(result).toBe('[nonexistent]');
    });
  });

  describe('expandCitations', () => {
    it('should expand single citation in text', async () => {
      const text = 'This is effective [@smith2024]';
      const result = await formatter.expandCitations(text);

      expect(result).toBe(
        'This is effective (Smith et al., 2024; PMID: 12345678)'
      );
    });

    it('should expand multiple citations', async () => {
      const text = 'Studies [@smith2024] and [@tanaka2023] show';
      const result = await formatter.expandCitations(text);

      expect(result).toContain('(Smith et al., 2024; PMID: 12345678)');
      expect(result).toContain('(田中・山田, 2023; DOI: 10.1234/example)');
    });

    it('should expand grouped citations', async () => {
      const text = 'Multiple studies [@smith2024; @tanaka2023]';
      const result = await formatter.expandCitations(text);

      expect(result).toBe(
        'Multiple studies (Smith et al., 2024; PMID: 12345678), (田中・山田, 2023; DOI: 10.1234/example)'
      );
    });

    it('should preserve text without citations', async () => {
      const text = 'No citations here';
      const result = await formatter.expandCitations(text);

      expect(result).toBe('No citations here');
    });

    it('should handle citation with locator (page number)', async () => {
      const text = 'Details in [@smith2024, p.42]';
      const result = await formatter.expandCitations(text);

      // Locators are kept as-is in expanded form
      expect(result).toContain('(Smith et al., 2024; PMID: 12345678)');
    });
  });

  describe('generateBibliography', () => {
    it('should generate bibliography in citation order', async () => {
      const ids = ['smith2024', 'tanaka2023', 'johnson2022'];
      const result = await formatter.generateBibliography(
        ids,
        'citation-order'
      );

      expect(result).toHaveLength(3);
      expect(result[0]).toContain('Smith');
      expect(result[1]).toContain('田中');
      expect(result[2]).toContain('Johnson');
    });

    it('should generate bibliography sorted by author', async () => {
      const ids = ['tanaka2023', 'smith2024', 'johnson2022'];
      const result = await formatter.generateBibliography(ids, 'author');

      // Johnson < Smith < 田中 (alphabetically, then Japanese)
      expect(result[0]).toContain('Johnson');
      expect(result[1]).toContain('Smith');
      expect(result[2]).toContain('田中');
    });

    it('should generate bibliography sorted by year', async () => {
      const ids = ['smith2024', 'tanaka2023', 'johnson2022'];
      const result = await formatter.generateBibliography(ids, 'year');

      // 2022 < 2023 < 2024
      expect(result[0]).toContain('Johnson');
      expect(result[1]).toContain('田中');
      expect(result[2]).toContain('Smith');
    });

    it('should skip non-existent references', async () => {
      const ids = ['smith2024', 'nonexistent', 'tanaka2023'];
      const result = await formatter.generateBibliography(
        ids,
        'citation-order'
      );

      expect(result).toHaveLength(2);
    });

    it('should return empty array for empty input', async () => {
      const result = await formatter.generateBibliography([], 'citation-order');

      expect(result).toHaveLength(0);
    });
  });

  describe('custom config', () => {
    it('should use custom author separator', async () => {
      const customConfig: FormatterConfig = {
        author: {
          maxAuthors: 2,
          etAl: ' and others',
          etAlJa: '他',
          separatorJa: '、',
        },
      };
      const customFormatter = new CitationFormatter(
        mockManager as unknown as ReferenceManager,
        customConfig
      );

      const result = await customFormatter.formatInline('smith2024');

      expect(result).toContain('and others');
    });
  });
});
