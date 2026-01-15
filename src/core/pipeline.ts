import { writeFile } from 'fs/promises';
import { Parser, type ParsedPresentation, type ParsedSlide } from './parser';
import { Transformer } from './transformer';
import { Renderer, type RenderOptions } from './renderer';
import { TemplateEngine } from '../templates/engine';
import { TemplateLoader, CSSCollector } from '../templates';
import { IconRegistryLoader } from '../icons/registry';
import { IconResolver } from '../icons/resolver';
import { ReferenceManager, type CSLItem } from '../references/manager';
import { CitationExtractor } from '../references/extractor';
import { CitationFormatter } from '../references/formatter';
import {
  BibliographyGenerator,
  type BibliographyOptions,
} from '../references/bibliography';
import type { Config } from '../config/schema';

/**
 * Options for the Pipeline
 */
export interface PipelineOptions {
  /** Custom config path override */
  configPath?: string;
  /** Output file path (if not specified, returns string only) */
  outputPath?: string;
  /** Enable verbose/progress output */
  verbose?: boolean;
}

/**
 * Result of a pipeline run
 */
export interface PipelineResult {
  /** Generated Marp markdown */
  output: string;
  /** Citation IDs found in the presentation */
  citations: string[];
  /** Warnings generated during processing */
  warnings: string[];
  /** Number of slides processed */
  slideCount: number;
}

/**
 * Error thrown when pipeline processing fails
 */
export class PipelineError extends Error {
  constructor(
    message: string,
    public stage: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'PipelineError';
  }
}

/**
 * Pipeline orchestrates the full YAML to Marp markdown conversion
 *
 * Stages:
 * 1. Parse Source - Load and validate YAML
 * 2. Collect Citations - Extract citation IDs from all slides
 * 3. Resolve References - Fetch bibliography data
 * 4. Transform Slides - Apply templates and resolve icons/citations
 * 5. Render Output - Generate final Marp markdown
 */
export class Pipeline {
  private parser: Parser;
  private templateEngine: TemplateEngine;
  private templateLoader: TemplateLoader;
  private iconRegistry: IconRegistryLoader;
  private iconResolver: IconResolver;
  private referenceManager: ReferenceManager;
  private citationExtractor: CitationExtractor;
  private citationFormatter: CitationFormatter;
  private bibliographyGenerator: BibliographyGenerator;
  private transformer: Transformer;
  private renderer: Renderer;
  private cssCollector: CSSCollector;
  private warnings: string[] = [];

  constructor(private config: Config) {
    // Initialize all components
    this.parser = new Parser();
    this.templateEngine = new TemplateEngine();
    this.templateLoader = new TemplateLoader();
    this.iconRegistry = new IconRegistryLoader();
    this.iconResolver = new IconResolver(this.iconRegistry, {
      fetchedDir: config.icons.fetched,
    });
    this.referenceManager = new ReferenceManager(
      config.references.connection.command
    );
    this.citationExtractor = new CitationExtractor();
    this.citationFormatter = new CitationFormatter(
      this.referenceManager,
      {
        author: {
          maxAuthors: config.references.format.maxAuthors,
          etAl: config.references.format.etAl,
          etAlJa: config.references.format.etAlJa,
        },
        inline: {
          authorSep: config.references.format.authorSep,
          identifierSep: config.references.format.identifierSep,
        },
      }
    );
    this.bibliographyGenerator = new BibliographyGenerator(this.referenceManager);
    this.transformer = new Transformer(
      this.templateEngine,
      this.templateLoader,
      this.iconResolver,
      this.citationFormatter
    );
    this.renderer = new Renderer();
    this.cssCollector = new CSSCollector(this.templateLoader);
  }

  /**
   * Run the full conversion pipeline
   */
  async run(inputPath: string, options?: PipelineOptions): Promise<string> {
    this.warnings = [];

    try {
      // Stage 1: Parse Source
      let presentation = await this.parseSource(inputPath);

      // Stage 2: Collect Citations
      const citationIds = this.collectCitations(presentation);

      // Stage 3: Resolve References
      await this.resolveReferences(citationIds);

      // Stage 3.5: Process Bibliography auto-generation
      presentation = await this.processBibliography(presentation, citationIds);

      // Stage 4: Transform Slides
      const transformedSlides = await this.transformSlides(presentation);

      // Stage 5: Render Output
      const output = this.render(transformedSlides, presentation);

      // Write output file if specified
      if (options?.outputPath) {
        await writeFile(options.outputPath, output, 'utf-8');
      }

      return output;
    } catch (error) {
      if (error instanceof PipelineError) {
        throw error;
      }
      throw new PipelineError(
        error instanceof Error ? error.message : 'Unknown error',
        'unknown',
        error
      );
    }
  }

  /**
   * Run the full pipeline with detailed result
   */
  async runWithResult(
    inputPath: string,
    options?: PipelineOptions
  ): Promise<PipelineResult> {
    this.warnings = [];

    try {
      // Stage 1: Parse Source
      let presentation = await this.parseSource(inputPath);

      // Stage 2: Collect Citations
      const citationIds = this.collectCitations(presentation);

      // Stage 3: Resolve References
      await this.resolveReferences(citationIds);

      // Stage 3.5: Process Bibliography auto-generation
      presentation = await this.processBibliography(presentation, citationIds);

      // Stage 4: Transform Slides
      const transformedSlides = await this.transformSlides(presentation);

      // Stage 5: Render Output
      const output = this.render(transformedSlides, presentation);

      // Write output file if specified
      if (options?.outputPath) {
        await writeFile(options.outputPath, output, 'utf-8');
      }

      return {
        output,
        citations: citationIds,
        warnings: this.warnings,
        slideCount: presentation.slides.length,
      };
    } catch (error) {
      if (error instanceof PipelineError) {
        throw error;
      }
      throw new PipelineError(
        error instanceof Error ? error.message : 'Unknown error',
        'unknown',
        error
      );
    }
  }

  /**
   * Initialize the pipeline by loading templates and icon registry
   */
  async initialize(): Promise<void> {
    try {
      // Load built-in templates
      await this.templateLoader.loadBuiltIn(this.config.templates.builtin);

      // Load custom templates if specified
      if (this.config.templates.custom) {
        await this.templateLoader.loadCustom(this.config.templates.custom);
      }

      // Load icon registry
      await this.iconRegistry.load(this.config.icons.registry);
    } catch (error) {
      throw new PipelineError(
        `Failed to initialize pipeline: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'initialize',
        error
      );
    }
  }

  /**
   * Get collected warnings
   */
  getWarnings(): string[] {
    return [...this.warnings];
  }

  // --- Private Stage Methods ---

  /**
   * Stage 1: Parse the YAML source file
   */
  private async parseSource(inputPath: string): Promise<ParsedPresentation> {
    try {
      return await this.parser.parseFile(inputPath);
    } catch (error) {
      throw new PipelineError(
        `Failed to parse source file: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'parse',
        error
      );
    }
  }

  /**
   * Stage 2: Collect all citation IDs from the presentation
   */
  private collectCitations(presentation: ParsedPresentation): string[] {
    const citations = this.citationExtractor.extractFromPresentation(presentation);
    return this.citationExtractor.getUniqueIds(citations);
  }

  /**
   * Stage 3: Resolve references from the reference manager
   */
  private async resolveReferences(ids: string[]): Promise<Map<string, CSLItem>> {
    if (!this.config.references.enabled || ids.length === 0) {
      return new Map();
    }

    // Check if reference-manager CLI is available
    const isAvailable = await this.referenceManager.isAvailable();
    if (!isAvailable) {
      this.warnings.push(
        'reference-manager CLI is not available. ' +
          'Install it to enable citation features: npm install -g @ncukondo/reference-manager'
      );
      return new Map();
    }

    try {
      const items = await this.referenceManager.getByIds(ids);

      // Warn about missing references
      for (const id of ids) {
        if (!items.has(id)) {
          this.warnings.push(`Reference not found: ${id}`);
        }
      }

      return items;
    } catch (error) {
      // Non-fatal: log warning and continue
      this.warnings.push(
        `Failed to resolve references: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      return new Map();
    }
  }

  /**
   * Stage 4: Transform all slides using templates
   */
  private async transformSlides(
    presentation: ParsedPresentation
  ): Promise<string[]> {
    try {
      return await this.transformer.transformAll(presentation);
    } catch (error) {
      throw new PipelineError(
        `Failed to transform slides: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'transform',
        error
      );
    }
  }

  /**
   * Stage 5: Render the final Marp markdown
   */
  private render(
    slides: string[],
    presentation: ParsedPresentation
  ): string {
    try {
      // Collect notes from slides
      const notes = presentation.slides.map((slide) => slide.notes);

      // Collect template names used in the presentation
      const templateNames = presentation.slides.map((slide) => slide.template);

      // Collect CSS from used templates
      const templateCss = this.cssCollector.collect(templateNames);

      const renderOptions: RenderOptions = {
        includeTheme: true,
        notes,
        ...(templateCss ? { templateCss } : {}),
      };

      return this.renderer.render(slides, presentation.meta, renderOptions);
    } catch (error) {
      throw new PipelineError(
        `Failed to render output: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'render',
        error
      );
    }
  }

  /**
   * Process bibliography slides with autoGenerate: true
   * Populates references array from collected citations
   */
  private async processBibliography(
    presentation: ParsedPresentation,
    citationIds: string[]
  ): Promise<ParsedPresentation> {
    if (!this.config.references.enabled || citationIds.length === 0) {
      return presentation;
    }

    // Check if any slides have autoGenerate: true
    const hasBibliographyAutoGenerate = presentation.slides.some(
      (slide) =>
        slide.template === 'bibliography' &&
        slide.content?.['autoGenerate'] === true
    );

    if (!hasBibliographyAutoGenerate) {
      return presentation;
    }

    // Check if reference-manager CLI is available
    const isAvailable = await this.referenceManager.isAvailable();
    if (!isAvailable) {
      // Warning already added in resolveReferences, just return
      return presentation;
    }

    // Update bibliography slides
    try {
      const updatedSlides = await Promise.all(
        presentation.slides.map(async (slide) => {
          if (
            slide.template === 'bibliography' &&
            slide.content?.['autoGenerate'] === true
          ) {
            // Get sort option from slide content
            const sort =
              (slide.content['sort'] as BibliographyOptions['sort']) ||
              'citation-order';

            // Generate bibliography with the correct sort option directly
            const result = await this.bibliographyGenerator.generate(
              citationIds,
              { sort }
            );

            // Warn about missing references
            for (const id of result.missing) {
              this.warnings.push(`Bibliography: reference not found: ${id}`);
            }

            // Convert CSL items to template-compatible format
            const references = result.items.map((item) => ({
              id: item.id,
              authors: this.formatAuthorsForTemplate(item.author),
              title: item.title || '',
              year: this.getYear(item),
              journal: item['container-title'],
              volume: item.volume,
              pages: item.page,
              doi: item.DOI,
              url: item.URL,
            }));

            return {
              ...slide,
              content: {
                ...slide.content,
                references,
                _autoGenerated: true,
                _generatedEntries: result.entries,
              },
            } as ParsedSlide;
          }
          return slide;
        })
      );

      return {
        ...presentation,
        slides: updatedSlides,
      };
    } catch (error) {
      // Non-fatal: log warning and return original presentation
      this.warnings.push(
        `Failed to auto-generate bibliography: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      return presentation;
    }
  }

  /**
   * Format authors for template-compatible format
   */
  private formatAuthorsForTemplate(
    authors: CSLItem['author']
  ): string[] | undefined {
    if (!authors || authors.length === 0) {
      return undefined;
    }

    return authors.map((a) => {
      const initial = a.given ? `${a.given.charAt(0)}.` : '';
      return initial ? `${a.family}, ${initial}` : a.family;
    });
  }

  /**
   * Get year from CSL item
   */
  private getYear(item: CSLItem): number | undefined {
    const dateParts = item.issued?.['date-parts'];
    if (dateParts && dateParts[0] && dateParts[0][0]) {
      return dateParts[0][0];
    }
    return undefined;
  }
}
