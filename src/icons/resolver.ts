import * as fs from "node:fs/promises";
import * as path from "node:path";
import nunjucks from "nunjucks";
import { IconRegistryLoader } from "./registry.js";
import { IconFetcher, ICON_SOURCES } from "./fetcher.js";
import type { IconSource } from "./schema.js";

/**
 * Options for rendering an icon
 */
export interface IconOptions {
  size?: string;
  color?: string;
  class?: string;
}

/**
 * Options for the IconResolver
 */
export interface IconResolverOptions {
  /** Use CSS variables for theme colors (e.g., var(--theme-primary)) */
  useThemeVariables?: boolean;
  /** Directory for cached/fetched icons (default: icons/fetched) */
  fetchedDir?: string;
  /** Auto-fetch icons from external sources when not cached (default: true) */
  autoFetch?: boolean;
}

/**
 * Icon Resolver - renders icons from various sources
 */
export class IconResolver {
  private nunjucksEnv: nunjucks.Environment;
  private options: IconResolverOptions;
  private fetcher: IconFetcher;

  constructor(private registry: IconRegistryLoader, options: IconResolverOptions = {}) {
    this.nunjucksEnv = new nunjucks.Environment(null, {
      autoescape: false,
    });
    this.options = {
      autoFetch: true,
      ...options,
    };
    this.fetcher = new IconFetcher({
      fetchedDir: options.fetchedDir ?? "icons/fetched",
    });
  }

  /**
   * Render an icon by name or alias
   */
  async render(nameOrAlias: string, options?: IconOptions): Promise<string> {
    // Resolve alias if needed
    const resolved = this.registry.resolveAlias(nameOrAlias);

    // Parse the icon reference
    const parsed = this.registry.parseIconReference(resolved);
    if (!parsed) {
      throw new Error(
        `Invalid icon reference format: "${resolved}". Expected format: "prefix:name"`
      );
    }

    // Get the source for this prefix
    const source = this.registry.getSource(parsed.prefix);
    if (!source) {
      throw new Error(`Unknown icon source prefix: "${parsed.prefix}"`);
    }

    // Get defaults and merge options
    const defaults = this.registry.getDefaults();
    const mergedOptions: Required<Omit<IconOptions, "class">> & Pick<IconOptions, "class"> = {
      size: options?.size ?? defaults.size,
      color: this.resolveColor(options?.color) ?? defaults.color,
      ...(options?.class !== undefined ? { class: options.class } : {}),
    };

    // Try to use cached/fetched SVG first (for any source type that has external icons)
    const cachedSvg = await this.tryGetCachedSvg(parsed.prefix, parsed.name);
    if (cachedSvg) {
      return this.processSvg(cachedSvg, parsed.name, mergedOptions);
    }

    // Auto-fetch if enabled and source is fetchable
    if (this.options.autoFetch && this.isFetchableSource(parsed.prefix)) {
      try {
        const fetchedSvg = await this.fetcher.fetchAndSave(`${parsed.prefix}:${parsed.name}`);
        return this.processSvg(fetchedSvg, parsed.name, mergedOptions);
      } catch {
        // Fall through to original rendering
      }
    }

    // Render based on source type (fallback)
    switch (source.type) {
      case "web-font":
        return this.renderWebFont(source, parsed.name, mergedOptions);
      case "local-svg":
        return await this.renderLocalSvg(source, parsed.name, mergedOptions);
      case "svg-inline":
        return await this.renderSvgInline(source, parsed.name, mergedOptions);
      case "svg-sprite":
        return this.renderSvgSprite(source, parsed.name, mergedOptions);
      default:
        throw new Error(`Unsupported icon source type: "${source.type}"`);
    }
  }

  /**
   * Try to get a cached SVG from the fetched directory
   */
  private async tryGetCachedSvg(prefix: string, name: string): Promise<string | null> {
    const iconSourceConfig = ICON_SOURCES[prefix];
    if (!iconSourceConfig) {
      return null;
    }

    const setDir = iconSourceConfig.set;
    const fetchedDir = this.options.fetchedDir ?? "icons/fetched";
    const svgPath = path.join(fetchedDir, setDir, `${name}.svg`);

    try {
      return await fs.readFile(svgPath, "utf-8");
    } catch {
      return null;
    }
  }

  /**
   * Check if a source prefix is fetchable from external API
   */
  private isFetchableSource(prefix: string): boolean {
    return prefix in ICON_SOURCES;
  }

  /**
   * Render a web-font icon
   */
  private renderWebFont(
    source: IconSource,
    name: string,
    options: IconOptions
  ): string {
    const style = this.buildStyle(options);
    const className = this.buildClassName(name, options);

    if (source.render) {
      // Use custom render template
      return this.nunjucksEnv.renderString(source.render, {
        name,
        style,
        class: className,
        size: options.size,
        color: options.color,
      });
    }

    // Default web-font render
    return `<span class="${className}" style="${style}">${name}</span>`;
  }

  /**
   * Render a local SVG icon
   */
  private async renderLocalSvg(
    source: IconSource,
    name: string,
    options: IconOptions
  ): Promise<string> {
    if (!source.path) {
      throw new Error(`Local SVG source "${source.name}" has no path defined`);
    }

    const svgPath = path.join(source.path, `${name}.svg`);

    try {
      const svgContent = await fs.readFile(svgPath, "utf-8");
      return this.processSvg(svgContent, name, options);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        throw new Error(`Icon file not found: ${svgPath}`);
      }
      throw error;
    }
  }

  /**
   * Render an SVG from external URL (placeholder without cache)
   */
  private async renderSvgInline(
    source: IconSource,
    name: string,
    options: IconOptions
  ): Promise<string> {
    // Without cache implementation, return a placeholder
    // Cache will be integrated in Step 4
    const className = this.buildClassName(name, options);
    const style = this.buildStyle(options);

    return `<span class="${className}" style="${style}" data-icon-source="${source.name}" data-icon-name="${name}">[${name}]</span>`;
  }

  /**
   * Render an SVG sprite reference
   */
  private renderSvgSprite(
    source: IconSource,
    name: string,
    options: IconOptions
  ): string {
    const className = this.buildClassName(name, options);
    const size = options.size ?? "24px";
    const color = options.color ?? "currentColor";

    const spriteUrl = source.url ?? "";

    return `<svg class="${className}" width="${size}" height="${size}" fill="${color}">
  <use xlink:href="${spriteUrl}#${name}"/>
</svg>`;
  }

  /**
   * Process SVG content and apply options
   */
  private processSvg(
    svgContent: string,
    name: string,
    options: IconOptions
  ): string {
    const className = this.buildClassName(name, options);
    const size = options.size ?? "24px";
    const color = options.color ?? "currentColor";

    // Parse and modify SVG attributes
    let processed = svgContent.trim();

    // Add/replace class attribute
    if (processed.includes("class=")) {
      processed = processed.replace(/class="[^"]*"/, `class="${className}"`);
    } else {
      processed = processed.replace("<svg", `<svg class="${className}"`);
    }

    // Add/replace width and height
    if (processed.includes("width=")) {
      processed = processed.replace(/width="[^"]*"/, `width="${size}"`);
    } else {
      processed = processed.replace("<svg", `<svg width="${size}"`);
    }

    if (processed.includes("height=")) {
      processed = processed.replace(/height="[^"]*"/, `height="${size}"`);
    } else {
      processed = processed.replace("<svg", `<svg height="${size}"`);
    }

    // Replace fill="currentColor" with actual color
    if (color !== "currentColor") {
      processed = processed.replace(/fill="currentColor"/g, `fill="${color}"`);
    }

    return processed;
  }

  /**
   * Build CSS style string
   */
  private buildStyle(options: IconOptions): string {
    const styles: string[] = [];

    if (options.size) {
      styles.push(`font-size: ${options.size}`);
    }

    if (options.color) {
      styles.push(`color: ${options.color}`);
    }

    return styles.join("; ");
  }

  /**
   * Build class name string
   */
  private buildClassName(name: string, options: IconOptions): string {
    const classes = ["icon", `icon-${name}`];

    if (options.class) {
      classes.push(options.class);
    }

    return classes.join(" ");
  }

  /**
   * Resolve color value, supporting palette names and CSS variables
   */
  private resolveColor(color?: string): string | undefined {
    if (!color) {
      return undefined;
    }

    // Check if it's a palette name
    const paletteColor = this.registry.getColor(color);
    if (paletteColor) {
      if (this.options.useThemeVariables) {
        return `var(--theme-${color})`;
      }
      return paletteColor;
    }

    // Pass through hex/rgb/other colors
    return color;
  }
}
