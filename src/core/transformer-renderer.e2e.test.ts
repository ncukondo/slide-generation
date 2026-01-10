import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Parser } from './parser';
import { Transformer } from './transformer';
import { Renderer } from './renderer';
import { TemplateEngine } from '../templates/engine';
import { TemplateLoader } from '../templates/loader';
import type { IconResolver } from '../icons/resolver';
import type { CitationFormatter } from '../references/formatter';

// Mock IconResolver
const createMockIconResolver = (): IconResolver =>
  ({
    render: vi.fn().mockImplementation(async (name: string, options?: { size?: string }) => {
      const size = options?.size ?? '24px';
      return `<i class="icon icon-${name}" style="font-size: ${size}"></i>`;
    }),
  }) as unknown as IconResolver;

// Mock CitationFormatter
const createMockCitationFormatter = (): CitationFormatter =>
  ({
    formatInline: vi.fn().mockImplementation(async (id: string) => {
      return `(${id}, 2024)`;
    }),
    expandCitations: vi.fn().mockImplementation(async (text: string) => {
      return text.replace(/\[@(\w+)\]/g, '($1, 2024)');
    }),
  }) as unknown as CitationFormatter;

describe('Transformer & Renderer E2E', () => {
  let parser: Parser;
  let templateEngine: TemplateEngine;
  let templateLoader: TemplateLoader;
  let iconResolver: IconResolver;
  let citationFormatter: CitationFormatter;
  let transformer: Transformer;
  let renderer: Renderer;

  beforeEach(async () => {
    parser = new Parser();
    templateEngine = new TemplateEngine();
    templateLoader = new TemplateLoader();
    iconResolver = createMockIconResolver();
    citationFormatter = createMockCitationFormatter();
    renderer = new Renderer();

    // Load basic templates
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
description: Content slide with bullets
category: basic
schema:
  type: object
  properties:
    heading:
      type: string
    bullets:
      type: array
      items:
        type: string
  required:
    - heading
output: |
  # {{ content.heading }}

  {% for item in content.bullets %}
  - {{ item }}
  {% endfor %}
`);

    await templateLoader.loadFromString(`
name: two-column
description: Two column layout
category: layout
schema:
  type: object
  properties:
    heading:
      type: string
    left:
      type: string
    right:
      type: string
  required:
    - heading
output: |
  # {{ content.heading }}

  <div class="columns">
  <div class="column">

  {{ content.left }}

  </div>
  <div class="column">

  {{ content.right }}

  </div>
  </div>
`);

    await templateLoader.loadFromString(`
name: icon-demo
description: Slide with icons
category: demo
schema:
  type: object
  properties:
    title:
      type: string
    iconName:
      type: string
  required:
    - title
output: |
  # {{ content.title }}

  {{ icons.render(content.iconName) }}
`);

    await templateLoader.loadFromString(`
name: references-demo
description: Slide with references
category: demo
schema:
  type: object
  properties:
    title:
      type: string
    text:
      type: string
  required:
    - title
output: |
  # {{ content.title }}

  {{ refs.expand(content.text) }}
`);

    transformer = new Transformer(
      templateEngine,
      templateLoader,
      iconResolver,
      citationFormatter
    );
  });

  describe('Complete presentation workflow', () => {
    it('should parse, transform, and render a complete presentation', async () => {
      const yamlSource = `
meta:
  title: Complete Presentation
  author: Test Author
  theme: academic

slides:
  - template: title
    content:
      title: Welcome to My Presentation
      subtitle: An Introduction

  - template: content
    content:
      heading: Overview
      bullets:
        - First point
        - Second point
        - Third point
    notes: "Remember to explain each point"

  - template: two-column
    content:
      heading: Comparison
      left: |
        **Option A**
        - Pros listed here
      right: |
        **Option B**
        - Other pros here
    class: comparison-slide
`;

      // Parse
      const presentation = parser.parse(yamlSource);
      expect(presentation.meta.title).toBe('Complete Presentation');
      expect(presentation.slides).toHaveLength(3);

      // Transform
      const transformedSlides = await transformer.transformAll(presentation);
      expect(transformedSlides).toHaveLength(3);

      // Verify transformed content
      expect(transformedSlides[0]).toContain('# Welcome to My Presentation');
      expect(transformedSlides[0]).toContain('## An Introduction');

      expect(transformedSlides[1]).toContain('# Overview');
      expect(transformedSlides[1]).toContain('- First point');
      expect(transformedSlides[1]).toContain('- Second point');
      expect(transformedSlides[1]).toContain('- Third point');

      expect(transformedSlides[2]).toContain('<!-- _class: comparison-slide -->');
      expect(transformedSlides[2]).toContain('# Comparison');
      expect(transformedSlides[2]).toContain('**Option A**');
      expect(transformedSlides[2]).toContain('**Option B**');

      // Render
      const notes = presentation.slides.map((s) => s.notes);
      const output = renderer.render(transformedSlides, presentation.meta, { notes });

      // Verify final output
      expect(output).toContain('---\nmarp: true');
      expect(output).toContain('title: Complete Presentation');
      expect(output).toContain('author: Test Author');
      expect(output).toContain('theme: academic');

      // Check slide separators
      expect(output).toMatch(/---\n\n# Welcome to My Presentation/);
      expect(output).toMatch(/---\n\n# Overview/);

      // Check speaker notes
      expect(output).toContain('<!--\nRemember to explain each point\n-->');
    });

    it('should handle raw template slides', async () => {
      const yamlSource = `
meta:
  title: With Raw Slide
  theme: default

slides:
  - template: title
    content:
      title: Normal Slide

  - template: raw
    raw: |
      # Custom Raw Content

      This is completely custom markdown.

      \`\`\`javascript
      console.log('Hello');
      \`\`\`
`;

      const presentation = parser.parse(yamlSource);
      const transformedSlides = await transformer.transformAll(presentation);

      expect(transformedSlides[1]).toContain('# Custom Raw Content');
      expect(transformedSlides[1]).toContain('console.log');
    });

    it('should resolve icons in templates', async () => {
      const yamlSource = `
meta:
  title: Icon Demo
  theme: default

slides:
  - template: icon-demo
    content:
      title: With Icon
      iconName: mdi:home
`;

      const presentation = parser.parse(yamlSource);
      const transformedSlides = await transformer.transformAll(presentation);

      expect(transformedSlides[0]).toContain('icon-mdi:home');
      expect(iconResolver.render).toHaveBeenCalledWith('mdi:home', undefined);
    });

    it('should expand citations in templates', async () => {
      const yamlSource = `
meta:
  title: References Demo
  theme: default

slides:
  - template: references-demo
    content:
      title: With Citations
      text: "According to [@smith2024], this is important."
`;

      const presentation = parser.parse(yamlSource);
      const transformedSlides = await transformer.transformAll(presentation);

      expect(transformedSlides[0]).toContain('(smith2024, 2024)');
      expect(citationFormatter.expandCitations).toHaveBeenCalled();
    });

    it('should produce valid Marp output structure', async () => {
      const yamlSource = `
meta:
  title: Valid Marp Output
  author: Author
  date: 2024-01-15
  theme: gaia

slides:
  - template: title
    content:
      title: Hello World
`;

      const presentation = parser.parse(yamlSource);
      const transformedSlides = await transformer.transformAll(presentation);
      const output = renderer.render(transformedSlides, presentation.meta, {
        additionalFrontMatter: {
          paginate: true,
        },
      });

      // Front matter structure
      const lines = output.split('\n');
      expect(lines[0]).toBe('---');
      expect(lines[1]).toBe('marp: true');

      // Contains required metadata
      expect(output).toContain('title: Valid Marp Output');
      expect(output).toContain('author: Author');
      expect(output).toContain('date: 2024-01-15');
      expect(output).toContain('theme: gaia');
      expect(output).toContain('paginate: true');

      // Front matter is closed properly before slides
      // Format: ---\n[front matter]\n---\n\n---\n\n[slide content]
      expect(output).toMatch(/---\n\n---\n\n# Hello World/);
    });
  });

  describe('Error handling', () => {
    it('should throw error for unknown template', async () => {
      const yamlSource = `
meta:
  title: Test
  theme: default

slides:
  - template: nonexistent
    content: {}
`;

      const presentation = parser.parse(yamlSource);

      await expect(transformer.transformAll(presentation)).rejects.toThrow(
        'Template "nonexistent" not found'
      );
    });

    it('should throw error for invalid content', async () => {
      const yamlSource = `
meta:
  title: Test
  theme: default

slides:
  - template: title
    content:
      # missing required 'title' field
      subtitle: Only subtitle
`;

      const presentation = parser.parse(yamlSource);

      await expect(transformer.transformAll(presentation)).rejects.toThrow(
        'content validation failed'
      );
    });
  });

  describe('Edge cases', () => {
    it('should handle empty slides array', async () => {
      const yamlSource = `
meta:
  title: Empty Presentation
  theme: default
`;

      const presentation = parser.parse(yamlSource);
      const transformedSlides = await transformer.transformAll(presentation);
      const output = renderer.render(transformedSlides, presentation.meta);

      expect(transformedSlides).toHaveLength(0);
      expect(output).toContain('marp: true');
      expect(output).toContain('title: Empty Presentation');
    });

    it('should handle special characters in content', async () => {
      const yamlSource = `
meta:
  title: "Special: Characters"
  theme: default

slides:
  - template: title
    content:
      title: "Hello <World> & 'Friends'"
      subtitle: "Line1\\nLine2"
`;

      const presentation = parser.parse(yamlSource);
      const transformedSlides = await transformer.transformAll(presentation);

      expect(transformedSlides[0]).toContain('<World>');
      expect(transformedSlides[0]).toContain("'Friends'");
    });
  });
});
