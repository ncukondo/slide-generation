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
    // Will be extended in later steps
  }
}
