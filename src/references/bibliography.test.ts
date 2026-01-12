import { describe, it, expect, vi } from 'vitest';
import { BibliographyGenerator } from './bibliography';
import type { ReferenceManager, CSLItem } from './manager';

describe('BibliographyGenerator', () => {
  const createMockManager = (items: Map<string, CSLItem>) => ({
    getByIds: vi.fn().mockResolvedValue(items),
    isAvailable: vi.fn().mockResolvedValue(true),
    getAll: vi.fn(),
    getById: vi.fn(),
  });

  const sampleItems = new Map<string, CSLItem>([
    [
      'smith2024',
      {
        id: 'smith2024',
        author: [{ family: 'Smith', given: 'John' }],
        issued: { 'date-parts': [[2024]] },
        title: 'Test Article',
        'container-title': 'Test Journal',
        PMID: '12345678',
      },
    ],
    [
      'tanaka2023',
      {
        id: 'tanaka2023',
        author: [{ family: '田中', given: '太郎' }],
        issued: { 'date-parts': [[2023]] },
        title: '日本語論文',
        'container-title': '学術誌',
        DOI: '10.1234/example',
      },
    ],
  ]);

  describe('generate', () => {
    it('should generate bibliography entries from citation IDs', async () => {
      const mockManager = createMockManager(sampleItems);
      const generator = new BibliographyGenerator(
        mockManager as unknown as ReferenceManager
      );

      const result = await generator.generate(['smith2024', 'tanaka2023']);

      expect(result.entries).toHaveLength(2);
      expect(result.entries[0]).toContain('Smith');
      expect(result.entries[0]).toContain('2024');
      expect(result.entries[0]).toContain('PMID: 12345678');
    });

    it('should return items in the result', async () => {
      const mockManager = createMockManager(sampleItems);
      const generator = new BibliographyGenerator(
        mockManager as unknown as ReferenceManager
      );

      const result = await generator.generate(['smith2024', 'tanaka2023']);

      expect(result.items).toHaveLength(2);
      expect(result.items[0]?.id).toBe('smith2024');
      expect(result.items[1]?.id).toBe('tanaka2023');
    });

    it('should sort by citation-order by default', async () => {
      const mockManager = createMockManager(sampleItems);
      const generator = new BibliographyGenerator(
        mockManager as unknown as ReferenceManager
      );

      const result = await generator.generate(['tanaka2023', 'smith2024']);

      expect(result.entries[0]).toContain('田中');
      expect(result.entries[1]).toContain('Smith');
    });

    it('should sort by author when specified', async () => {
      const mockManager = createMockManager(sampleItems);
      const generator = new BibliographyGenerator(
        mockManager as unknown as ReferenceManager
      );

      const result = await generator.generate(['tanaka2023', 'smith2024'], {
        sort: 'author',
      });

      // Smith comes before 田中 in alphabetical order
      expect(result.entries[0]).toContain('Smith');
      expect(result.entries[1]).toContain('田中');
    });

    it('should sort by year when specified', async () => {
      const mockManager = createMockManager(sampleItems);
      const generator = new BibliographyGenerator(
        mockManager as unknown as ReferenceManager
      );

      const result = await generator.generate(['smith2024', 'tanaka2023'], {
        sort: 'year',
      });

      // 2023 comes before 2024
      expect(result.entries[0]).toContain('2023');
      expect(result.entries[1]).toContain('2024');
    });

    it('should handle missing references gracefully', async () => {
      const partialItems = new Map<string, CSLItem>([
        [
          'smith2024',
          {
            id: 'smith2024',
            author: [{ family: 'Smith', given: 'John' }],
            issued: { 'date-parts': [[2024]] },
            title: 'Test Article',
          },
        ],
      ]);
      const mockManager = createMockManager(partialItems);

      const generator = new BibliographyGenerator(
        mockManager as unknown as ReferenceManager
      );
      const result = await generator.generate(['smith2024', 'missing2024']);

      expect(result.entries).toHaveLength(1);
      expect(result.missing).toEqual(['missing2024']);
    });

    it('should return empty arrays for empty input', async () => {
      const mockManager = createMockManager(new Map());
      const generator = new BibliographyGenerator(
        mockManager as unknown as ReferenceManager
      );

      const result = await generator.generate([]);

      expect(result.entries).toEqual([]);
      expect(result.items).toEqual([]);
      expect(result.missing).toEqual([]);
    });

    it('should deduplicate citation IDs', async () => {
      const mockManager = createMockManager(sampleItems);
      const generator = new BibliographyGenerator(
        mockManager as unknown as ReferenceManager
      );

      const result = await generator.generate([
        'smith2024',
        'smith2024',
        'tanaka2023',
      ]);

      expect(result.entries).toHaveLength(2);
      expect(result.items).toHaveLength(2);
    });
  });
});
