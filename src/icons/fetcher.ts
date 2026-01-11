import * as fs from "node:fs/promises";
import * as path from "node:path";
import { stringify as stringifyYaml, parse as parseYaml } from "yaml";

/**
 * Options for the IconFetcher
 */
export interface FetcherOptions {
  /** Directory to save fetched icons (default: icons/fetched) */
  fetchedDir?: string;
  /** Whether to save icons locally (default: true) */
  saveLocally?: boolean;
  /** Timeout for fetch requests in milliseconds (default: 10000) */
  timeoutMs?: number;
}

/**
 * Parsed icon reference
 */
export interface ParsedReference {
  prefix: string;
  name: string;
}

/**
 * Source entry in _sources.yaml
 */
interface SourceEntry {
  source: string;
  fetched_at: string;
  license: string;
}

/**
 * Icon source configuration
 */
export interface IconSourceConfig {
  /** Iconify set name */
  set: string;
  /** License identifier */
  license: string;
  /** Whether this source requires external fetching */
  external: boolean;
}

/**
 * Unified icon source definitions
 * Single source of truth for prefix mappings, licenses, and external status
 */
export const ICON_SOURCES: Record<string, IconSourceConfig> = {
  health: { set: "healthicons", license: "MIT", external: true },
  ms: { set: "material-symbols", license: "Apache-2.0", external: true },
  hero: { set: "heroicons", license: "MIT", external: true },
  mi: { set: "material-icons", license: "Apache-2.0", external: false },
  mdi: { set: "mdi", license: "Apache-2.0", external: true },
  iconify: { set: "iconify", license: "Various", external: true },
};

/**
 * Check if a source prefix requires external fetching
 */
export function isExternalSource(prefix: string): boolean {
  return ICON_SOURCES[prefix]?.external ?? false;
}

/**
 * Valid icon name pattern
 * Allows: lowercase letters, numbers, hyphens
 * Must start with a letter or number, cannot end with hyphen
 * Also allows forward slash for subdirectory paths (e.g., healthicons/stethoscope)
 */
const VALID_ICON_NAME = /^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/i;
const VALID_ICON_NAME_WITH_PATH = /^[a-z0-9][a-z0-9-/]*[a-z0-9]$|^[a-z0-9]$/i;

/**
 * Validate icon name format
 */
export function isValidIconName(name: string, allowPath = false): boolean {
  if (!name || name.length > 100) {
    return false;
  }
  // Prevent path traversal
  if (name.includes("..") || name.startsWith("/") || name.endsWith("/")) {
    return false;
  }
  const pattern = allowPath ? VALID_ICON_NAME_WITH_PATH : VALID_ICON_NAME;
  return pattern.test(name);
}

/**
 * IconFetcher - Fetches icons from external sources and saves them locally
 *
 * Icons are fetched from the Iconify API and saved to the local filesystem
 * for offline use and reproducibility.
 */
export class IconFetcher {
  private fetchedDir: string;
  private saveLocally: boolean;
  private timeoutMs: number;

  constructor(options: FetcherOptions = {}) {
    this.fetchedDir = options.fetchedDir ?? "icons/fetched";
    this.saveLocally = options.saveLocally ?? true;
    this.timeoutMs = options.timeoutMs ?? 10000;
  }

  /**
   * Parse an icon reference string (e.g., "health:stethoscope")
   * Returns null if the format is invalid or contains unsafe characters
   */
  parseReference(iconRef: string): ParsedReference | null {
    const colonIndex = iconRef.indexOf(":");
    if (colonIndex === -1) {
      return null;
    }

    const prefix = iconRef.substring(0, colonIndex);
    const name = iconRef.substring(colonIndex + 1);

    // Validate prefix (alphanumeric only)
    if (!/^[a-z0-9]+$/i.test(prefix)) {
      return null;
    }

    // Validate icon name
    if (!isValidIconName(name)) {
      return null;
    }

    return { prefix, name };
  }

  /**
   * Get the Iconify set name for a prefix
   */
  getIconifySet(prefix: string): string {
    return ICON_SOURCES[prefix]?.set ?? prefix;
  }

  /**
   * Get the local file path for an icon reference
   */
  getLocalPath(iconRef: string): string {
    const parsed = this.parseReference(iconRef);
    if (!parsed) {
      throw new Error(`Invalid icon reference: ${iconRef}`);
    }

    const setDir = this.getIconifySet(parsed.prefix);
    return path.join(this.fetchedDir, setDir, `${parsed.name}.svg`);
  }

  /**
   * Check if an icon exists locally
   */
  async existsLocally(iconRef: string): Promise<boolean> {
    const localPath = this.getLocalPath(iconRef);
    try {
      await fs.access(localPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Build the Iconify API URL for an icon
   */
  buildUrl(prefix: string, name: string): string {
    const set = this.getIconifySet(prefix);
    return `https://api.iconify.design/${set}/${name}.svg`;
  }

  /**
   * Resolve an icon reference (local first, then fetch)
   */
  async resolve(iconRef: string): Promise<string> {
    // Check if already exists locally
    if (await this.existsLocally(iconRef)) {
      const localPath = this.getLocalPath(iconRef);
      return await fs.readFile(localPath, "utf-8");
    }

    // Fetch and optionally save
    return await this.fetchAndSave(iconRef);
  }

  /**
   * Fetch an icon from external source and save locally
   */
  async fetchAndSave(iconRef: string): Promise<string> {
    const parsed = this.parseReference(iconRef);
    if (!parsed) {
      throw new Error(`Invalid icon reference: ${iconRef}`);
    }

    const url = this.buildUrl(parsed.prefix, parsed.name);

    // Fetch the icon with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    let response: Response;
    try {
      response = await fetch(url, { signal: controller.signal });
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error(`Fetch timeout: ${iconRef} (exceeded ${this.timeoutMs}ms)`);
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      throw new Error(`Icon not found: ${iconRef} (HTTP ${response.status})`);
    }

    const svg = await response.text();

    // Save locally if enabled
    if (this.saveLocally) {
      await this.saveLocallyInternal(parsed.prefix, parsed.name, svg, url);
    }

    return svg;
  }

  /**
   * Save icon to local filesystem
   */
  private async saveLocallyInternal(
    prefix: string,
    name: string,
    svg: string,
    sourceUrl: string
  ): Promise<void> {
    const setDir = this.getIconifySet(prefix);
    const dirPath = path.join(this.fetchedDir, setDir);
    const filePath = path.join(dirPath, `${name}.svg`);

    // Create directory
    await fs.mkdir(dirPath, { recursive: true });

    // Save SVG
    await fs.writeFile(filePath, svg, "utf-8");

    // Update _sources.yaml
    await this.updateSourcesYaml(setDir, name, sourceUrl);
  }

  /**
   * Update _sources.yaml with source information
   */
  private async updateSourcesYaml(
    setDir: string,
    name: string,
    sourceUrl: string
  ): Promise<void> {
    const sourcesPath = path.join(this.fetchedDir, "_sources.yaml");
    let sources: Record<string, SourceEntry> = {};

    try {
      const content = await fs.readFile(sourcesPath, "utf-8");
      sources = (parseYaml(content) as Record<string, SourceEntry>) ?? {};
    } catch {
      // File doesn't exist, start fresh
    }

    const key = `${setDir}/${name}.svg`;
    sources[key] = {
      source: sourceUrl,
      fetched_at: new Date().toISOString(),
      license: this.getLicense(setDir),
    };

    // Add header comment
    const header = `# Fetched icon sources\n# This file tracks where icons were fetched from for traceability\n\n`;
    await fs.writeFile(sourcesPath, header + stringifyYaml(sources), "utf-8");
  }

  /**
   * Get the license for an icon set
   */
  private getLicense(setDir: string): string {
    // Find license by set name
    for (const config of Object.values(ICON_SOURCES)) {
      if (config.set === setDir) {
        return config.license;
      }
    }
    return "Unknown";
  }
}
