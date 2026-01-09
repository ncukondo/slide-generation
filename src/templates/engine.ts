import nunjucks from "nunjucks";

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
  }
}
