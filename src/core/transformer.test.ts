import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Transformer, TransformContext, TransformError } from './transformer';
import { TemplateEngine } from '../templates/engine';
import { TemplateLoader } from '../templates/loader';
import type { IconResolver } from '../icons/resolver';
import type { CitationFormatter } from '../references/formatter';
import type { ParsedSlide, PresentationMeta } from './parser';

// Mock IconResolver
const createMockIconResolver = (): IconResolver => ({
  render: vi.fn().mockResolvedValue('<span class="icon">mock-icon</span>'),
} as unknown as IconResolver);

// Mock CitationFormatter
const createMockCitationFormatter = (): CitationFormatter => ({
  formatInline: vi.fn().mockResolvedValue('(Smith, 2024)'),
  expandCitations: vi.fn().mockImplementation(async (text: string) => {
    return text.replace(/\[@(\w+)\]/g, '(Author, Year)');
  }),
} as unknown as CitationFormatter);

describe('Transformer', () => {
  let templateEngine: TemplateEngine;
  let templateLoader: TemplateLoader;
  let iconResolver: IconResolver;
  let citationFormatter: CitationFormatter;
  let transformer: Transformer;

  beforeEach(async () => {
    templateEngine = new TemplateEngine();
    templateLoader = new TemplateLoader();
    iconResolver = createMockIconResolver();
    citationFormatter = createMockCitationFormatter();

    // Load a test template
    await templateLoader.loadFromString(`
name: title
description: Title slide
category: basic
schema:
  type: object
  properties:
    title:
      type: string
    subtitle:
      type: string
  required:
    - title
output: |
  # {{ content.title }}
  {% if content.subtitle %}
  ## {{ content.subtitle }}
  {% endif %}
`);

    await templateLoader.loadFromString(`
name: content
description: Content slide
category: basic
schema:
  type: object
  properties:
    heading:
      type: string
    body:
      type: string
  required:
    - heading
output: |
  # {{ content.heading }}

  {{ content.body }}
`);

    transformer = new Transformer(
      templateEngine,
      templateLoader,
      iconResolver,
      citationFormatter
    );
  });

  describe('transform', () => {
    it('should transform a single slide', async () => {
      const slide: ParsedSlide = {
        template: 'title',
        content: {
          title: 'Welcome',
          subtitle: 'An Introduction',
        },
      };

      const context: TransformContext = {
        meta: {
          title: 'Test Presentation',
          theme: 'default',
        },
        slideIndex: 0,
        totalSlides: 1,
      };

      const result = await transformer.transform(slide, context);

      expect(result).toContain('# Welcome');
      expect(result).toContain('## An Introduction');
    });

    it('should throw error for unknown template', async () => {
      const slide: ParsedSlide = {
        template: 'nonexistent',
        content: {},
      };

      const context: TransformContext = {
        meta: { title: 'Test', theme: 'default' },
        slideIndex: 0,
        totalSlides: 1,
      };

      await expect(transformer.transform(slide, context)).rejects.toThrow(
        TransformError
      );
      await expect(transformer.transform(slide, context)).rejects.toThrow(
        'Template "nonexistent" not found'
      );
    });

    it('should throw error for content validation failure', async () => {
      const slide: ParsedSlide = {
        template: 'title',
        content: {
          // missing required 'title' field
        },
      };

      const context: TransformContext = {
        meta: { title: 'Test', theme: 'default' },
        slideIndex: 0,
        totalSlides: 1,
      };

      await expect(transformer.transform(slide, context)).rejects.toThrow(
        TransformError
      );
      await expect(transformer.transform(slide, context)).rejects.toThrow(
        'content validation failed'
      );
    });

    it('should use raw content when template is "raw"', async () => {
      const slide: ParsedSlide = {
        template: 'raw',
        content: {},
        raw: '# Custom Raw Content\n\nThis is raw markdown.',
      };

      const context: TransformContext = {
        meta: { title: 'Test', theme: 'default' },
        slideIndex: 0,
        totalSlides: 1,
      };

      const result = await transformer.transform(slide, context);

      expect(result).toBe('# Custom Raw Content\n\nThis is raw markdown.');
    });

    it('should apply CSS class when specified', async () => {
      const slide: ParsedSlide = {
        template: 'title',
        content: { title: 'Hello' },
        class: 'centered blue',
      };

      const context: TransformContext = {
        meta: { title: 'Test', theme: 'default' },
        slideIndex: 0,
        totalSlides: 1,
      };

      const result = await transformer.transform(slide, context);

      expect(result).toContain('<!-- _class: centered blue -->');
    });
  });

  describe('transformAll', () => {
    it('should transform all slides in a presentation', async () => {
      const meta: PresentationMeta = {
        title: 'Full Presentation',
        author: 'Test Author',
        theme: 'academic',
      };

      const slides: ParsedSlide[] = [
        {
          template: 'title',
          content: { title: 'Welcome', subtitle: 'Intro' },
        },
        {
          template: 'content',
          content: { heading: 'Overview', body: 'Content here' },
        },
      ];

      const results = await transformer.transformAll({ meta, slides });

      expect(results).toHaveLength(2);
      expect(results[0]).toContain('# Welcome');
      expect(results[1]).toContain('# Overview');
    });

    it('should provide correct slide index and total to context', async () => {
      // Use a template that exposes slide context
      await templateLoader.loadFromString(`
name: indexed
description: Indexed slide
category: basic
schema:
  type: object
  properties:
    text:
      type: string
output: |
  Slide {{ slide.index + 1 }} of {{ slide.total }}
  {{ content.text }}
`);

      const meta: PresentationMeta = { title: 'Test', theme: 'default' };
      const slides: ParsedSlide[] = [
        { template: 'indexed', content: { text: 'First' } },
        { template: 'indexed', content: { text: 'Second' } },
        { template: 'indexed', content: { text: 'Third' } },
      ];

      const results = await transformer.transformAll({ meta, slides });

      expect(results[0]).toContain('Slide 1 of 3');
      expect(results[1]).toContain('Slide 2 of 3');
      expect(results[2]).toContain('Slide 3 of 3');
    });
  });

  describe('icon and citation resolution', () => {
    it('should provide icons helper in template context', async () => {
      await templateLoader.loadFromString(`
name: with-icons
description: Slide with icons
category: basic
schema:
  type: object
  properties:
    iconName:
      type: string
output: |
  {{ icons.render(content.iconName) }}
`);

      const slide: ParsedSlide = {
        template: 'with-icons',
        content: { iconName: 'mdi:home' },
      };

      const context: TransformContext = {
        meta: { title: 'Test', theme: 'default' },
        slideIndex: 0,
        totalSlides: 1,
      };

      const result = await transformer.transform(slide, context);

      expect(iconResolver.render).toHaveBeenCalledWith('mdi:home', undefined);
      expect(result).toContain('mock-icon');
    });

    it('should provide refs helper for citations', async () => {
      await templateLoader.loadFromString(`
name: with-refs
description: Slide with references
category: basic
schema:
  type: object
  properties:
    text:
      type: string
output: |
  {{ refs.expand(content.text) }}
`);

      const slide: ParsedSlide = {
        template: 'with-refs',
        content: { text: 'According to [@smith2024], this is true.' },
      };

      const context: TransformContext = {
        meta: { title: 'Test', theme: 'default' },
        slideIndex: 0,
        totalSlides: 1,
      };

      const result = await transformer.transform(slide, context);

      expect(citationFormatter.expandCitations).toHaveBeenCalled();
      expect(result).toContain('(Author, Year)');
    });
  });
});
