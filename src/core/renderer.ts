import type { PresentationMeta } from './parser';

/**
 * Options for rendering the final Marp markdown
 */
export interface RenderOptions {
  /** Include theme in front matter (default: true) */
  includeTheme?: boolean;
  /** Speaker notes for each slide (indexed by slide position) */
  notes?: (string | undefined)[];
  /** Additional front matter properties */
  additionalFrontMatter?: Record<string, unknown>;
}

/**
 * Renderer combines transformed slides into Marp-compatible Markdown
 */
export class Renderer {
  /**
   * Render slides and metadata into final Marp markdown
   */
  render(
    slides: string[],
    meta: PresentationMeta,
    options?: RenderOptions
  ): string {
    const frontMatter = this.renderFrontMatter(meta, options);
    const slidesContent = this.joinSlides(slides, options?.notes);

    if (slides.length === 0) {
      return frontMatter;
    }

    return `${frontMatter}\n\n${slidesContent}`;
  }

  /**
   * Render the YAML front matter block
   */
  private renderFrontMatter(
    meta: PresentationMeta,
    options?: RenderOptions
  ): string {
    const lines: string[] = ['---', 'marp: true'];

    // Add title
    lines.push(`title: ${meta.title}`);

    // Add author if present
    if (meta.author) {
      lines.push(`author: ${meta.author}`);
    }

    // Add date if present
    if (meta.date) {
      lines.push(`date: ${meta.date}`);
    }

    // Add theme if enabled (default: true)
    const includeTheme = options?.includeTheme ?? true;
    if (includeTheme && meta.theme) {
      lines.push(`theme: ${meta.theme}`);
    }

    // Add additional front matter properties
    if (options?.additionalFrontMatter) {
      for (const [key, value] of Object.entries(options.additionalFrontMatter)) {
        lines.push(`${key}: ${this.formatFrontMatterValue(value)}`);
      }
    }

    lines.push('---');

    return lines.join('\n');
  }

  /**
   * Format a front matter value for YAML
   */
  private formatFrontMatterValue(value: unknown): string {
    if (typeof value === 'boolean') {
      return value ? 'true' : 'false';
    }
    if (typeof value === 'number') {
      return String(value);
    }
    if (typeof value === 'string') {
      // Quote if contains special characters
      if (/[:#[\]{}|>]/.test(value)) {
        return `"${value.replace(/"/g, '\\"')}"`;
      }
      return value;
    }
    return String(value);
  }

  /**
   * Join slides with Marp slide separator
   */
  private joinSlides(
    slides: string[],
    notes?: (string | undefined)[]
  ): string {
    const parts: string[] = [];

    for (let i = 0; i < slides.length; i++) {
      let slideContent = slides[i]!;

      // Add speaker notes if present
      const note = notes?.[i];
      if (note && note.trim()) {
        slideContent = `${slideContent}\n\n${this.renderSpeakerNotes(note)}`;
      }

      parts.push(slideContent);
    }

    // Join with Marp slide separator (---)
    return parts.map(slide => `---\n\n${slide}`).join('\n\n');
  }

  /**
   * Render speaker notes as HTML comment
   */
  private renderSpeakerNotes(notes: string): string {
    return `<!--\n${notes}\n-->`;
  }
}
