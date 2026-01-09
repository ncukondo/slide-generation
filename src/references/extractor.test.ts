import { describe, it, expect } from 'vitest';
import { CitationExtractor, ExtractedCitation } from './extractor';
import { ParsedSlide, ParsedPresentation } from '../core/parser';

describe('CitationExtractor', () => {
  const extractor = new CitationExtractor();

  describe('extract', () => {
    it('should extract single citation', () => {
      const text = 'This is effective [@smith2024]';
      const citations = extractor.extract(text);

      expect(citations).toHaveLength(1);
      expect(citations[0]).toEqual({
        id: 'smith2024',
        locator: undefined,
        position: { start: 18, end: 30 },
      });
    });

    it('should extract citation with page number', () => {
      const text = 'See [@smith2024, p.42] for details';
      const citations = extractor.extract(text);

      expect(citations).toHaveLength(1);
      expect(citations[0]).toEqual({
        id: 'smith2024',
        locator: 'p.42',
        position: { start: 4, end: 22 },
      });
    });

    it('should extract multiple citations in brackets', () => {
      const text = 'Multiple studies [@smith2024; @tanaka2023] show';
      const citations = extractor.extract(text);

      expect(citations).toHaveLength(2);
      expect(citations[0].id).toBe('smith2024');
      expect(citations[1].id).toBe('tanaka2023');
    });

    it('should extract citation with complex locator', () => {
      const text = 'As noted [@johnson2022, pp.10-15, fig.2]';
      const citations = extractor.extract(text);

      expect(citations).toHaveLength(1);
      expect(citations[0].id).toBe('johnson2022');
      expect(citations[0].locator).toBe('pp.10-15, fig.2');
    });

    it('should extract multiple separate citations', () => {
      const text =
        'First [@smith2024] and second [@tanaka2023] citations';
      const citations = extractor.extract(text);

      expect(citations).toHaveLength(2);
      expect(citations[0].id).toBe('smith2024');
      expect(citations[1].id).toBe('tanaka2023');
    });

    it('should return empty array for text without citations', () => {
      const text = 'No citations here';
      const citations = extractor.extract(text);

      expect(citations).toHaveLength(0);
    });

    it('should handle hyphenated citation IDs', () => {
      const text = 'Reference [@smith-jones2024]';
      const citations = extractor.extract(text);

      expect(citations).toHaveLength(1);
      expect(citations[0].id).toBe('smith-jones2024');
    });

    it('should handle underscore in citation IDs', () => {
      const text = 'Reference [@smith_2024]';
      const citations = extractor.extract(text);

      expect(citations).toHaveLength(1);
      expect(citations[0].id).toBe('smith_2024');
    });

    it('should handle multiple citations with locators', () => {
      const text = 'Studies [@smith2024, p.42; @tanaka2023, ch.3] show';
      const citations = extractor.extract(text);

      expect(citations).toHaveLength(2);
      expect(citations[0]).toMatchObject({ id: 'smith2024', locator: 'p.42' });
      expect(citations[1]).toMatchObject({ id: 'tanaka2023', locator: 'ch.3' });
    });
  });

  describe('extractFromSlide', () => {
    it('should extract citations from slide content items', () => {
      const slide: ParsedSlide = {
        template: 'bullet-list',
        content: {
          title: 'Title with [@ref1]',
          items: ['First item [@smith2024]', 'Second item [@tanaka2023]'],
        },
      };

      const citations = extractor.extractFromSlide(slide);

      expect(citations).toHaveLength(3);
      expect(citations.map((c) => c.id)).toContain('ref1');
      expect(citations.map((c) => c.id)).toContain('smith2024');
      expect(citations.map((c) => c.id)).toContain('tanaka2023');
    });

    it('should extract citations from nested content', () => {
      const slide: ParsedSlide = {
        template: 'quote',
        content: {
          text: 'A quoted text',
          source: '@smith2024',
        },
      };

      const citations = extractor.extractFromSlide(slide);

      expect(citations).toHaveLength(1);
      expect(citations[0].id).toBe('smith2024');
    });

    it('should extract citations from notes', () => {
      const slide: ParsedSlide = {
        template: 'title',
        content: { title: 'Title' },
        notes: 'See [@ref1] for more info',
      };

      const citations = extractor.extractFromSlide(slide);

      expect(citations).toHaveLength(1);
      expect(citations[0].id).toBe('ref1');
    });

    it('should deduplicate citations from same slide', () => {
      const slide: ParsedSlide = {
        template: 'bullet-list',
        content: {
          items: ['First [@smith2024]', 'Second [@smith2024]'],
        },
      };

      const citations = extractor.extractFromSlide(slide);

      // Should deduplicate by id
      const uniqueIds = [...new Set(citations.map((c) => c.id))];
      expect(uniqueIds).toHaveLength(1);
      expect(uniqueIds[0]).toBe('smith2024');
    });
  });

  describe('extractFromPresentation', () => {
    it('should extract citations from all slides', () => {
      const presentation: ParsedPresentation = {
        meta: { title: 'Test Presentation', theme: 'default' },
        slides: [
          {
            template: 'title',
            content: { title: 'Title [@intro2024]' },
          },
          {
            template: 'bullet-list',
            content: { items: ['Item [@smith2024]', 'Item [@tanaka2023]'] },
          },
        ],
      };

      const citations = extractor.extractFromPresentation(presentation);

      expect(citations).toHaveLength(3);
      expect(citations.map((c) => c.id)).toContain('intro2024');
      expect(citations.map((c) => c.id)).toContain('smith2024');
      expect(citations.map((c) => c.id)).toContain('tanaka2023');
    });

    it('should deduplicate citations across slides', () => {
      const presentation: ParsedPresentation = {
        meta: { title: 'Test', theme: 'default' },
        slides: [
          {
            template: 'bullet-list',
            content: { items: ['[@smith2024]'] },
          },
          {
            template: 'bullet-list',
            content: { items: ['[@smith2024] again'] },
          },
        ],
      };

      const citations = extractor.extractFromPresentation(presentation);
      const uniqueIds = [...new Set(citations.map((c) => c.id))];

      expect(uniqueIds).toHaveLength(1);
    });

    it('should return unique citation IDs in order of appearance', () => {
      const presentation: ParsedPresentation = {
        meta: { title: 'Test', theme: 'default' },
        slides: [
          {
            template: 'bullet-list',
            content: { items: ['[@first]', '[@second]', '[@first]'] },
          },
        ],
      };

      const citations = extractor.extractFromPresentation(presentation);
      const ids = citations.map((c) => c.id);

      // First occurrences in order
      expect(ids[0]).toBe('first');
      expect(ids[1]).toBe('second');
    });
  });

  describe('getUniqueIds', () => {
    it('should return unique citation IDs in order', () => {
      const text = 'Text [@b] and [@a] and [@b] again';
      const citations = extractor.extract(text);
      const uniqueIds = extractor.getUniqueIds(citations);

      expect(uniqueIds).toEqual(['b', 'a']);
    });
  });
});
