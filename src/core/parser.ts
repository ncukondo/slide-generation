import { z } from 'zod';
import { parse as parseYaml, parseDocument, isSeq, isMap, isNode, LineCounter } from 'yaml';
import { readFile } from 'fs/promises';

// References config schema
const referencesConfigSchema = z.object({
  enabled: z.boolean().default(true),
  style: z.string().default('author-year-pmid'),
});

// Meta schema
const metaSchema = z.object({
  title: z.string(),
  author: z.string().optional(),
  date: z.string().optional(),
  theme: z.string().default('default'),
  references: referencesConfigSchema.optional(),
});

// Slide schema
const slideSchema = z.object({
  template: z.string(),
  content: z.record(z.unknown()).default({}),
  class: z.string().optional(),
  notes: z.string().optional(),
  raw: z.string().optional(),
});

// Presentation schema
export const presentationSchema = z.object({
  meta: metaSchema,
  slides: z.array(slideSchema).default([]),
});

export type PresentationMeta = z.infer<typeof metaSchema>;
export type ParsedSlide = z.infer<typeof slideSchema>;
export type ParsedPresentation = z.infer<typeof presentationSchema>;

export interface ParseResultWithLines extends ParsedPresentation {
  slideLines: number[];
}

export class ParseError extends Error {
  constructor(
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ParseError';
  }
}

export class ValidationError extends Error {
  constructor(
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class Parser {
  parse(yamlContent: string): ParsedPresentation {
    let rawData: unknown;

    try {
      rawData = parseYaml(yamlContent);
    } catch (error) {
      throw new ParseError('Failed to parse YAML', error);
    }

    const result = presentationSchema.safeParse(rawData);

    if (!result.success) {
      throw new ValidationError(
        'Schema validation failed',
        result.error.format()
      );
    }

    return result.data;
  }

  async parseFile(filePath: string): Promise<ParsedPresentation> {
    let content: string;

    try {
      content = await readFile(filePath, 'utf-8');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new ParseError(`File not found: ${filePath}`);
      }
      throw new ParseError(`Failed to read file: ${filePath}`, error);
    }

    return this.parse(content);
  }

  parseWithLineInfo(yamlContent: string): ParseResultWithLines {
    const lineCounter = new LineCounter();
    const doc = parseDocument(yamlContent, { lineCounter });

    // Check for YAML parsing errors
    if (doc.errors && doc.errors.length > 0) {
      throw new ParseError('Failed to parse YAML', doc.errors);
    }

    // Extract line numbers for slides
    const slideLines: number[] = [];
    const contents = doc.contents;

    if (isMap(contents)) {
      const slidesNode = contents.get('slides', true);
      if (isSeq(slidesNode)) {
        for (const item of slidesNode.items) {
          if (isNode(item) && item.range) {
            const pos = lineCounter.linePos(item.range[0]);
            slideLines.push(pos.line);
          }
        }
      }
    }

    // Validate with schema
    const rawData = doc.toJSON();
    const result = presentationSchema.safeParse(rawData);

    if (!result.success) {
      throw new ValidationError(
        'Schema validation failed',
        result.error.format()
      );
    }

    return {
      ...result.data,
      slideLines,
    };
  }

  async parseFileWithLineInfo(filePath: string): Promise<ParseResultWithLines> {
    let content: string;

    try {
      content = await readFile(filePath, 'utf-8');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new ParseError(`File not found: ${filePath}`);
      }
      throw new ParseError(`Failed to read file: ${filePath}`, error);
    }

    return this.parseWithLineInfo(content);
  }
}
