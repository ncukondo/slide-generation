import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeFileSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import {
  presentationSchema,
  Parser,
  ParseError,
  ValidationError,
} from './parser';

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

describe('Parser', () => {
  describe('parse', () => {
    it('should parse valid YAML string', () => {
      const yaml = `
meta:
  title: "Test Presentation"
slides:
  - template: title
    content:
      title: "Hello World"
`;
      const parser = new Parser();
      const result = parser.parse(yaml);

      expect(result.meta.title).toBe('Test Presentation');
      expect(result.slides).toHaveLength(1);
      expect(result.slides[0]?.template).toBe('title');
    });

    it('should throw ParseError for invalid YAML syntax', () => {
      const yaml = 'invalid: yaml: content:';
      const parser = new Parser();

      expect(() => parser.parse(yaml)).toThrow(ParseError);
    });

    it('should throw ValidationError for invalid schema', () => {
      const yaml = `
meta: {}
slides: []
`;
      const parser = new Parser();

      expect(() => parser.parse(yaml)).toThrow(ValidationError);
    });

    it('should provide detailed error message for validation errors', () => {
      const yaml = `
meta: {}
slides: []
`;
      const parser = new Parser();

      try {
        parser.parse(yaml);
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        expect((error as ValidationError).message).toContain(
          'Schema validation failed'
        );
      }
    });
  });

  describe('parseFile', () => {
    const testDir = './test-parser-tmp';

    beforeEach(() => {
      mkdirSync(testDir, { recursive: true });
    });

    afterEach(() => {
      rmSync(testDir, { recursive: true, force: true });
    });

    it('should parse file from path', async () => {
      const filePath = join(testDir, 'test.yaml');
      writeFileSync(
        filePath,
        `
meta:
  title: "File Test"
slides:
  - template: section
    content:
      title: "Section 1"
`
      );

      const parser = new Parser();
      const result = await parser.parseFile(filePath);

      expect(result.meta.title).toBe('File Test');
    });

    it('should throw error for nonexistent file', async () => {
      const parser = new Parser();
      await expect(parser.parseFile('./nonexistent.yaml')).rejects.toThrow(
        ParseError
      );
    });

    it('should include file path in error message for nonexistent file', async () => {
      const parser = new Parser();
      await expect(parser.parseFile('./nonexistent.yaml')).rejects.toThrow(
        /nonexistent\.yaml/
      );
    });
  });

  describe('parseWithLineInfo', () => {
    it('should track line numbers for each slide', () => {
      const yaml = `meta:
  title: "Test"
slides:
  - template: title
    content:
      title: "Slide 1"
  - template: bullet-list
    content:
      title: "Slide 2"
`;
      const parser = new Parser();
      const result = parser.parseWithLineInfo(yaml);

      expect(result.slideLines).toHaveLength(2);
      expect(result.slideLines[0]).toBe(4); // Line 4: "- template: title"
      expect(result.slideLines[1]).toBe(7); // Line 7: "- template: bullet-list"
    });

    it('should return parsed presentation data with line info', () => {
      const yaml = `meta:
  title: "Test Presentation"
slides:
  - template: section
    content:
      title: "Section 1"
`;
      const parser = new Parser();
      const result = parser.parseWithLineInfo(yaml);

      expect(result.meta.title).toBe('Test Presentation');
      expect(result.slides).toHaveLength(1);
      expect(result.slides[0]?.template).toBe('section');
      expect(result.slideLines[0]).toBe(4);
    });

    it('should handle empty slides array', () => {
      const yaml = `meta:
  title: "Empty Presentation"
slides: []
`;
      const parser = new Parser();
      const result = parser.parseWithLineInfo(yaml);

      expect(result.slideLines).toHaveLength(0);
    });

    it('should throw ParseError for invalid YAML', () => {
      // Tab character in indentation is invalid in YAML
      const yaml = "meta:\n\ttitle: Test";
      const parser = new Parser();

      expect(() => parser.parseWithLineInfo(yaml)).toThrow(ParseError);
    });

    it('should throw ValidationError for invalid schema', () => {
      const yaml = `meta: {}
slides: []
`;
      const parser = new Parser();

      expect(() => parser.parseWithLineInfo(yaml)).toThrow(ValidationError);
    });
  });
});
