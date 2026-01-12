import { describe, expect, it } from 'vitest';
import {
  sourceEntrySchema,
  sourcesYamlSchema,
  sourceTypeSchema,
  sourceStatusSchema,
  referenceItemSchema,
  referencesSectionSchema,
  type ReferenceItem,
} from './schema.js';

describe('Sources Schema', () => {
  describe('sourceTypeSchema', () => {
    it('should accept valid source types', () => {
      expect(sourceTypeSchema.safeParse('scenario').success).toBe(true);
      expect(sourceTypeSchema.safeParse('content').success).toBe(true);
      expect(sourceTypeSchema.safeParse('material').success).toBe(true);
      expect(sourceTypeSchema.safeParse('data').success).toBe(true);
      expect(sourceTypeSchema.safeParse('conversation').success).toBe(true);
    });

    it('should reject invalid source type', () => {
      expect(sourceTypeSchema.safeParse('invalid').success).toBe(false);
    });
  });

  describe('sourceStatusSchema', () => {
    it('should accept valid source statuses', () => {
      expect(sourceStatusSchema.safeParse('draft').success).toBe(true);
      expect(sourceStatusSchema.safeParse('final').success).toBe(true);
      expect(sourceStatusSchema.safeParse('reference').success).toBe(true);
      expect(sourceStatusSchema.safeParse('archived').success).toBe(true);
    });

    it('should reject invalid source status', () => {
      expect(sourceStatusSchema.safeParse('invalid').success).toBe(false);
    });
  });

  describe('sourceEntrySchema', () => {
    it('should validate source entry with required fields', () => {
      const entry = {
        id: 'product-spec',
        type: 'material',
        path: 'materials/spec.pdf',
      };
      const result = sourceEntrySchema.safeParse(entry);
      expect(result.success).toBe(true);
    });

    it('should validate source entry with all fields', () => {
      const entry = {
        id: 'product-spec',
        type: 'material',
        path: 'materials/spec.pdf',
        status: 'reference',
        origin: '~/Documents/spec.pdf',
        description: 'Product specification',
        notes: 'Some notes',
        extracted_data: ['data/spec-features.yaml'],
        decisions: ['Using this for slide 4'],
      };
      const result = sourceEntrySchema.safeParse(entry);
      expect(result.success).toBe(true);
    });

    it('should reject invalid source type', () => {
      const entry = {
        id: 'test',
        type: 'invalid',
        path: 'test.md',
      };
      const result = sourceEntrySchema.safeParse(entry);
      expect(result.success).toBe(false);
    });

    it('should reject missing required fields', () => {
      const entry = {
        id: 'test',
        type: 'material',
      };
      const result = sourceEntrySchema.safeParse(entry);
      expect(result.success).toBe(false);
    });
  });

  describe('sourcesYamlSchema', () => {
    it('should validate minimal sources.yaml', () => {
      const data = {
        project: {
          name: 'Test Project',
        },
      };
      const result = sourcesYamlSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should validate complete sources.yaml', () => {
      const data = {
        project: {
          name: 'Test Project',
          purpose: 'Testing',
          created: '2025-01-10',
          updated: '2025-01-11',
          setup_pattern: 'A',
          original_source: '~/Projects/materials/',
        },
        context: {
          objective: 'Test objective',
          audience: {
            type: 'Engineers',
            size: '10-20',
            knowledge_level: 'Technical',
            concerns: ['Implementation cost'],
          },
          key_messages: ['Message 1', 'Message 2'],
          constraints: {
            duration: '15分',
            format: 'Online',
            style: 'Formal',
          },
        },
        sources: [
          {
            id: 'brief',
            type: 'scenario',
            path: 'scenario/brief.md',
            status: 'final',
            description: 'Initial brief',
          },
          {
            id: 'product-spec',
            type: 'material',
            path: 'materials/spec.pdf',
            status: 'reference',
            origin: '~/Documents/spec.pdf',
          },
        ],
        dependencies: {
          'presentation.yaml': {
            derived_from: ['brief', 'product-spec'],
          },
        },
        missing: [
          {
            item: 'Product photo',
            needed_for: 'Slide 4',
            status: 'pending',
            notes: 'User planning to take photos',
          },
        ],
      };
      const result = sourcesYamlSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should reject missing project.name', () => {
      const data = {
        project: {},
      };
      const result = sourcesYamlSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should reject invalid setup_pattern', () => {
      const data = {
        project: {
          name: 'Test',
          setup_pattern: 'D',
        },
      };
      const result = sourcesYamlSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  describe('sources.yaml references schema', () => {
    it('should accept references section', () => {
      const sources = {
        project: {
          name: 'Test',
          created: '2025-01-01',
        },
        references: {
          status: {
            required: 3,
            found: 2,
            pending: 1,
          },
          items: [
            {
              id: 'smith2024',
              status: 'added',
              slide: 3,
              purpose: 'Support accuracy claim',
              added_date: '2025-01-10',
            },
            {
              id: 'pending-study',
              status: 'pending',
              slide: 5,
              purpose: 'Cost reduction evidence',
              requirement: 'required',
              suggested_search: ['cost reduction AI healthcare'],
            },
          ],
        },
      };

      const result = sourcesYamlSchema.safeParse(sources);
      expect(result.success).toBe(true);
    });

    it('should validate reference item status', () => {
      const item: ReferenceItem = {
        id: 'test2024',
        status: 'pending',
        slide: 1,
        purpose: 'Test',
      };

      expect(['pending', 'added', 'existing']).toContain(item.status);
    });

    it('should require slide and purpose for each item', () => {
      const invalidItem = {
        id: 'test2024',
        status: 'pending',
        // missing slide and purpose
      };

      const result = referenceItemSchema.safeParse(invalidItem);
      expect(result.success).toBe(false);
    });

    it('should accept valid reference item with all fields', () => {
      const item = {
        id: 'smith2024',
        status: 'added',
        slide: 3,
        purpose: 'Support accuracy claim',
        requirement: 'required',
        added_date: '2025-01-10',
        suggested_search: ['AI accuracy meta-analysis'],
        notes: 'Found in IEEE database',
      };

      const result = referenceItemSchema.safeParse(item);
      expect(result.success).toBe(true);
    });

    it('should reject invalid status value', () => {
      const item = {
        id: 'test2024',
        status: 'invalid',
        slide: 1,
        purpose: 'Test',
      };

      const result = referenceItemSchema.safeParse(item);
      expect(result.success).toBe(false);
    });

    it('should accept references section with empty items', () => {
      const section = {
        items: [],
      };

      const result = referencesSectionSchema.safeParse(section);
      expect(result.success).toBe(true);
    });

    it('should accept references section without status', () => {
      const section = {
        items: [
          {
            id: 'test2024',
            status: 'pending',
            slide: 1,
            purpose: 'Test',
          },
        ],
      };

      const result = referencesSectionSchema.safeParse(section);
      expect(result.success).toBe(true);
    });
  });
});
