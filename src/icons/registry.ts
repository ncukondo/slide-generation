import * as fs from "node:fs/promises";
import { parse as parseYaml } from "yaml";
import {
  iconRegistrySchema,
  type IconRegistry,
  type IconSource,
  type IconDefaults,
} from "./schema.js";

/**
 * Parsed icon reference with prefix and name
 */
export interface ParsedIconReference {
  prefix: string;
  name: string;
}

/**
 * Icon Registry Loader - loads and manages icon registry configuration
 */
export class IconRegistryLoader {
  private registry: IconRegistry | null = null;
  private sourcesByPrefix: Map<string, IconSource> = new Map();
  private aliasMap: Map<string, string> = new Map();
  private colorMap: Map<string, string> = new Map();

  /**
   * Load registry from YAML file
   */
  async load(configPath: string): Promise<IconRegistry> {
    const content = await fs.readFile(configPath, "utf-8");
    const parsed = parseYaml(content);
    const validated = iconRegistrySchema.parse(parsed);

    this.registry = validated;
    this.buildMaps();

    return validated;
  }

  /**
   * Resolve an alias to its icon reference
   * @returns The resolved icon reference or the original name if not an alias
   */
  resolveAlias(nameOrAlias: string): string {
    return this.aliasMap.get(nameOrAlias) ?? nameOrAlias;
  }

  /**
   * Get icon source by prefix
   */
  getSource(prefix: string): IconSource | undefined {
    return this.sourcesByPrefix.get(prefix);
  }

  /**
   * Parse an icon reference string (e.g., "mi:home" or "iconify:mdi:account")
   * @returns Parsed reference or null if invalid format
   */
  parseIconReference(reference: string): ParsedIconReference | null {
    const colonIndex = reference.indexOf(":");
    if (colonIndex === -1) {
      return null;
    }

    const prefix = reference.substring(0, colonIndex);
    const name = reference.substring(colonIndex + 1);

    return { prefix, name };
  }

  /**
   * Get registry defaults
   */
  getDefaults(): IconDefaults {
    if (!this.registry) {
      return { size: "24px", color: "currentColor" };
    }
    return this.registry.defaults;
  }

  /**
   * Get color by name from color palette
   */
  getColor(name: string): string | undefined {
    return this.colorMap.get(name);
  }

  /**
   * Get all sources
   */
  getSources(): IconSource[] {
    return this.registry?.sources ?? [];
  }

  /**
   * Get all aliases
   */
  getAliases(): Record<string, string> {
    return this.registry?.aliases ?? {};
  }

  /**
   * Check if registry is loaded
   */
  isLoaded(): boolean {
    return this.registry !== null;
  }

  /**
   * Build internal lookup maps from registry
   */
  private buildMaps(): void {
    this.sourcesByPrefix.clear();
    this.aliasMap.clear();
    this.colorMap.clear();

    if (!this.registry) {
      return;
    }

    // Build sources map
    for (const source of this.registry.sources) {
      this.sourcesByPrefix.set(source.prefix, source);
    }

    // Build aliases map
    for (const [alias, target] of Object.entries(this.registry.aliases)) {
      this.aliasMap.set(alias, target);
    }

    // Build colors map
    if (this.registry.colors) {
      for (const [name, color] of Object.entries(this.registry.colors)) {
        this.colorMap.set(name, color);
      }
    }
  }
}
