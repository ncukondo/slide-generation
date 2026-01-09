import { describe, it, expect } from 'vitest';
import { presentationSchema } from './parser';

describe('presentationSchema', () => {
  it('should validate a minimal presentation', () => {
    const input = {
      meta: { title: 'Test Presentation' },
      slides: [{ template: 'title', content: { title: 'Hello' } }],
    };
    expect(() => presentationSchema.parse(input)).not.toThrow();
  });

  it('should validate presentation with all meta fields', () => {
    const input = {
      meta: {
        title: 'Full Presentation',
        author: 'Test Author',
        date: '2026-01-10',
        theme: 'academic',
        references: { enabled: true, style: 'author-year-pmid' },
      },
      slides: [],
    };
    expect(() => presentationSchema.parse(input)).not.toThrow();
  });

  it('should reject presentation without title', () => {
    const input = {
      meta: {},
      slides: [],
    };
    expect(() => presentationSchema.parse(input)).toThrow();
  });

  it('should validate slide with class and notes', () => {
    const input = {
      meta: { title: 'Test' },
      slides: [
        {
          template: 'bullet-list',
          content: { title: 'List', items: ['a', 'b'] },
          class: 'highlight',
          notes: 'Speaker notes here',
        },
      ],
    };
    expect(() => presentationSchema.parse(input)).not.toThrow();
  });

  it('should validate slide with raw field for custom template', () => {
    const input = {
      meta: { title: 'Test' },
      slides: [
        {
          template: 'custom',
          content: {},
          raw: '# Custom Slide\n\nSome content',
        },
      ],
    };
    expect(() => presentationSchema.parse(input)).not.toThrow();
  });

  it('should use default theme when not specified', () => {
    const input = {
      meta: { title: 'Test' },
      slides: [],
    };
    const result = presentationSchema.parse(input);
    expect(result.meta.theme).toBe('default');
  });
});
