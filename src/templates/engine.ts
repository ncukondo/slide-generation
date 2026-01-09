import nunjucks from "nunjucks";

/**
 * Icons helper interface for template rendering
 */
export interface IconsHelper {
  render: (name: string, options?: Record<string, unknown>) => string;
}

/**
 * References helper interface for citation handling
 */
export interface RefsHelper {
  cite: (id: string) => string;
  expand: (text: string) => string;
}

/**
 * Slide context passed to templates
 */
export interface SlideContext {
  index: number;
  total: number;
}

/**
 * Meta context for presentation metadata
 */
export interface MetaContext {
  title: string;
  author?: string;
  theme: string;
  [key: string]: unknown;
}

/**
 * Full template context interface
 */
export interface TemplateContext {
  content: Record<string, unknown>;
  meta: MetaContext;
  slide: SlideContext;
  icons: IconsHelper;
  refs: RefsHelper;
  [key: string]: unknown;
}

export class TemplateEngine {
  private env: nunjucks.Environment;

  constructor() {
    this.env = new nunjucks.Environment(null, {
      autoescape: false, // HTML output for Marp
      throwOnUndefined: false,
    });
    this.registerFilters();
    this.registerGlobals();
  }

  render(template: string, context: Record<string, unknown>): string {
    return this.env.renderString(template, context);
  }

  private registerFilters(): void {
    // Will be extended in later steps
  }

  private registerGlobals(): void {
    // Icon helper stub - will be replaced with real implementation
    const icons = {
      render: (name: string, options?: Record<string, unknown>): string => {
        const size = (options?.["size"] as string) ?? "24px";
        const color = (options?.["color"] as string) ?? "currentColor";
        return `<span class="icon icon-${name}" style="font-size: ${size}; color: ${color};">[${name}]</span>`;
      },
    };

    this.env.addGlobal("icons", icons);

    // Reference helper stub - will be replaced with real implementation
    const refs = {
      cite: (id: string): string => {
        const cleanId = id.replace("@", "");
        return `(${cleanId})`;
      },
      expand: (text: string): string => {
        // Simple stub - replace [@id] with (id)
        return text.replace(/\[@(\w+)\]/g, "($1)");
      },
    };

    this.env.addGlobal("refs", refs);
  }
}
