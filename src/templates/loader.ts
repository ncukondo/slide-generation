import { z } from "zod";
import * as yaml from "yaml";
import * as fs from "node:fs/promises";
import * as path from "node:path";

/**
 * JSON Schema-like structure for template content validation
 */
const jsonSchemaSchema = z.record(z.unknown());

/**
 * Template definition schema - validates YAML template definition files
 */
export const templateDefSchema = z.object({
  name: z.string().min(1, "Template name is required"),
  description: z.string(),
  category: z.string(),
  schema: jsonSchemaSchema,
  example: z.record(z.unknown()).optional(),
  output: z.string().min(1, "Template output is required"),
  css: z.string().optional(),
});

/**
 * Template definition type derived from schema
 */
export type TemplateDefinition = z.infer<typeof templateDefSchema>;

/**
 * Loads and manages template definitions from YAML files
 */
export class TemplateLoader {
  private templates: Map<string, TemplateDefinition>;

  constructor() {
    this.templates = new Map();
  }

  /**
   * Load a template from a YAML string
   */
  async loadFromString(yamlContent: string): Promise<void> {
    const parsed = yaml.parse(yamlContent);
    const result = templateDefSchema.safeParse(parsed);

    if (!result.success) {
      const errors = result.error.errors
        .map(e => `${e.path.join(".")}: ${e.message}`)
        .join(", ");
      throw new Error(`Invalid template definition: ${errors}`);
    }

    this.templates.set(result.data.name, result.data);
  }

  /**
   * Load a template from a file
   */
  async loadFromFile(filePath: string): Promise<void> {
    const content = await fs.readFile(filePath, "utf-8");
    await this.loadFromString(content);
  }

  /**
   * Load all templates from a directory (recursively)
   */
  async loadBuiltIn(directory: string): Promise<void> {
    await this.loadDirectory(directory);
  }

  /**
   * Load custom templates from a directory (can override built-in)
   */
  async loadCustom(directory: string): Promise<void> {
    await this.loadDirectory(directory);
  }

  /**
   * Internal method to load templates from a directory
   */
  private async loadDirectory(directory: string): Promise<void> {
    const entries = await fs.readdir(directory, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(directory, entry.name);

      if (entry.isDirectory()) {
        await this.loadDirectory(fullPath);
      } else if (entry.isFile() && (entry.name.endsWith(".yaml") || entry.name.endsWith(".yml"))) {
        await this.loadFromFile(fullPath);
      }
    }
  }

  /**
   * Get a template by name
   */
  get(name: string): TemplateDefinition | undefined {
    return this.templates.get(name);
  }

  /**
   * List all loaded templates
   */
  list(): TemplateDefinition[] {
    return Array.from(this.templates.values());
  }

  /**
   * List templates filtered by category
   */
  listByCategory(category: string): TemplateDefinition[] {
    return this.list().filter(t => t.category === category);
  }
}
