import type { TemplateEngine, IconsHelper, RefsHelper } from '../templates/engine';
import type { TemplateLoader } from '../templates/loader';
import type { IconResolver } from '../icons/resolver';
import type { CitationFormatter } from '../references/formatter';
import type { ParsedSlide, ParsedPresentation, PresentationMeta } from './parser';

// Placeholder patterns for async resolution
const ICON_PLACEHOLDER_PREFIX = '___ICON_PLACEHOLDER_';
const ICON_PLACEHOLDER_SUFFIX = '___';
const REFS_CITE_PLACEHOLDER_PREFIX = '___REFS_CITE_PLACEHOLDER_';
const REFS_CITE_PLACEHOLDER_SUFFIX = '___';
const REFS_EXPAND_PLACEHOLDER_PREFIX = '___REFS_EXPAND_PLACEHOLDER_';
const REFS_EXPAND_PLACEHOLDER_SUFFIX = '___';

/**
 * Context passed to each slide transformation
 */
export interface TransformContext {
  meta: PresentationMeta;
  slideIndex: number;
  totalSlides: number;
}

/**
 * Error thrown when transformation fails
 */
export class TransformError extends Error {
  constructor(
    message: string,
    public slide?: ParsedSlide,
    public details?: unknown
  ) {
    super(message);
    this.name = 'TransformError';
  }
}

/**
 * Pending async operations collected during template rendering
 */
interface PendingOperations {
  icons: Map<string, { name: string; options: Record<string, unknown> | undefined }>;
  cites: Map<string, string>;
  expands: Map<string, string>;
}

/**
 * Transformer applies templates to slides and generates HTML content
 */
export class Transformer {
  constructor(
    private templateEngine: TemplateEngine,
    private templateLoader: TemplateLoader,
    private iconResolver: IconResolver,
    private citationFormatter: CitationFormatter
  ) {}

  /**
   * Transform a single slide using its template
   */
  async transform(slide: ParsedSlide, context: TransformContext): Promise<string> {
    // Handle raw template - return raw content directly
    if (slide.template === 'raw') {
      return slide.raw ?? '';
    }

    // Get the template definition
    const template = this.templateLoader.get(slide.template);
    if (!template) {
      throw new TransformError(
        `Template "${slide.template}" not found`,
        slide
      );
    }

    // Validate content against template schema
    const validationResult = this.templateLoader.validateContent(
      slide.template,
      slide.content
    );
    if (!validationResult.valid) {
      throw new TransformError(
        `Slide content validation failed: ${validationResult.errors?.join(', ')}`,
        slide,
        validationResult.errors
      );
    }

    // Build template context with helpers that use placeholders
    const pending: PendingOperations = {
      icons: new Map(),
      cites: new Map(),
      expands: new Map(),
    };
    const templateContext = this.buildTemplateContext(slide, context, pending);

    // Render the template (synchronous, with placeholders)
    let output = this.templateEngine.render(template.output, templateContext);

    // Resolve all async operations and replace placeholders
    output = await this.resolvePlaceholders(output, pending);

    // Add CSS class directive if specified
    if (slide.class) {
      output = `<!-- _class: ${slide.class} -->\n${output}`;
    }

    return output.trim();
  }

  /**
   * Transform all slides in a presentation
   */
  async transformAll(presentation: ParsedPresentation): Promise<string[]> {
    const results: string[] = [];
    const totalSlides = presentation.slides.length;

    for (let i = 0; i < presentation.slides.length; i++) {
      const slide = presentation.slides[i]!;
      const context: TransformContext = {
        meta: presentation.meta,
        slideIndex: i,
        totalSlides,
      };

      const transformed = await this.transform(slide, context);
      results.push(transformed);
    }

    return results;
  }

  /**
   * Build the full template context with helpers that collect async operations
   */
  private buildTemplateContext(
    slide: ParsedSlide,
    context: TransformContext,
    pending: PendingOperations
  ): Record<string, unknown> {
    let iconCounter = 0;
    let citeCounter = 0;
    let expandCounter = 0;

    // Create icons helper that returns placeholders
    const icons: IconsHelper = {
      render: (name: string, options?: Record<string, unknown>) => {
        const id = `${iconCounter++}`;
        const placeholder = `${ICON_PLACEHOLDER_PREFIX}${id}${ICON_PLACEHOLDER_SUFFIX}`;
        pending.icons.set(id, { name, options });
        return placeholder;
      },
    };

    // Create refs helper that returns placeholders
    const refs: RefsHelper = {
      cite: (id: string) => {
        const counterId = `${citeCounter++}`;
        const placeholder = `${REFS_CITE_PLACEHOLDER_PREFIX}${counterId}${REFS_CITE_PLACEHOLDER_SUFFIX}`;
        pending.cites.set(counterId, id);
        return placeholder;
      },
      expand: (text: string) => {
        const counterId = `${expandCounter++}`;
        const placeholder = `${REFS_EXPAND_PLACEHOLDER_PREFIX}${counterId}${REFS_EXPAND_PLACEHOLDER_SUFFIX}`;
        pending.expands.set(counterId, text);
        return placeholder;
      },
    };

    return {
      content: slide.content,
      meta: {
        title: context.meta.title,
        author: context.meta.author,
        theme: context.meta.theme,
      },
      slide: {
        index: context.slideIndex,
        total: context.totalSlides,
      },
      icons,
      refs,
    };
  }

  /**
   * Resolve all placeholders by executing async operations
   */
  private async resolvePlaceholders(
    output: string,
    pending: PendingOperations
  ): Promise<string> {
    // Resolve icons
    const iconResults = new Map<string, string>();
    for (const [id, { name, options }] of pending.icons) {
      const rendered = await this.iconResolver.render(
        name,
        options as { size?: string; color?: string; class?: string } | undefined
      );
      iconResults.set(id, rendered);
    }

    // Resolve citations
    const citeResults = new Map<string, string>();
    for (const [counterId, id] of pending.cites) {
      const formatted = await this.citationFormatter.formatInline(id);
      citeResults.set(counterId, formatted);
    }

    // Resolve citation expansions
    const expandResults = new Map<string, string>();
    for (const [counterId, text] of pending.expands) {
      const expanded = await this.citationFormatter.expandCitations(text);
      expandResults.set(counterId, expanded);
    }

    // Replace all placeholders
    let result = output;

    for (const [id, rendered] of iconResults) {
      const placeholder = `${ICON_PLACEHOLDER_PREFIX}${id}${ICON_PLACEHOLDER_SUFFIX}`;
      result = result.replace(placeholder, rendered);
    }

    for (const [counterId, formatted] of citeResults) {
      const placeholder = `${REFS_CITE_PLACEHOLDER_PREFIX}${counterId}${REFS_CITE_PLACEHOLDER_SUFFIX}`;
      result = result.replace(placeholder, formatted);
    }

    for (const [counterId, expanded] of expandResults) {
      const placeholder = `${REFS_EXPAND_PLACEHOLDER_PREFIX}${counterId}${REFS_EXPAND_PLACEHOLDER_SUFFIX}`;
      result = result.replace(placeholder, expanded);
    }

    return result;
  }
}
