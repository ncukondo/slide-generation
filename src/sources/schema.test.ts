import { describe, expect, it } from 'vitest';
import {
  sourceEntrySchema,
  sourcesYamlSchema,
  sourceTypeSchema,
  sourceStatusSchema,
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
});
