import type { TemplateLoader } from "./loader";

/**
 * Collects CSS from template definitions
 */
export class CSSCollector {
  constructor(private templateLoader: TemplateLoader) {}

  /**
   * Collect CSS from the specified templates
   * @param templateNames - Names of templates to collect CSS from
   * @returns Combined CSS string from all templates
   */
  collect(templateNames: string[]): string {
    // Deduplicate template names to avoid duplicate CSS
    const uniqueNames = [...new Set(templateNames)];
    const cssBlocks: string[] = [];

    for (const name of uniqueNames) {
      const template = this.templateLoader.get(name);
      if (template?.css) {
        cssBlocks.push(template.css);
      }
    }

    return cssBlocks.join("\n\n");
  }
}
