import * as fs from "node:fs/promises";
import * as path from "node:path";
import { parse as parseYaml } from "yaml";
import {
  individualMetadataSchema,
  directoryMetadataSchema,
  type ImageMetadata,
  type PermissionStatus,
} from "./schema";
import { isImageFile } from "./constants";

/**
 * Warning info for metadata loading issues
 */
export interface MetadataWarning {
  path: string;
  message: string;
}

/**
 * Collected warnings during metadata loading
 */
let metadataWarnings: MetadataWarning[] = [];

/**
 * Get and clear collected warnings
 */
export function getAndClearMetadataWarnings(): MetadataWarning[] {
  const warnings = metadataWarnings;
  metadataWarnings = [];
  return warnings;
}

/**
 * Loader for image metadata files
 * Supports both individual .meta.yaml files and directory-level images.yaml files
 */
export class ImageMetadataLoader {
  constructor(private baseDir: string = ".") {}

  /**
   * Load metadata for a specific image file
   * Priority: individual .meta.yaml > directory images.yaml entry > directory _defaults
   */
  async load(imagePath: string): Promise<ImageMetadata> {
    // Try loading individual metadata first
    const individualMetadata = await this.loadIndividualMetadata(imagePath);
    if (individualMetadata !== null) {
      return individualMetadata;
    }

    // Fall back to directory metadata
    const directoryMetadata = await this.loadFromDirectoryMetadata(imagePath);
    return directoryMetadata;
  }

  /**
   * Load all metadata for images in a directory
   */
  async loadDirectory(dirPath: string): Promise<Map<string, ImageMetadata>> {
    const result = new Map<string, ImageMetadata>();
    const fullDirPath = path.join(this.baseDir, dirPath);

    // Check if directory exists
    try {
      await fs.access(fullDirPath);
    } catch {
      return result;
    }

    // Get all image files in directory
    const files = await fs.readdir(fullDirPath);
    const imageFiles = files.filter((f) => isImageFile(f));

    // Load metadata for each image
    for (const file of imageFiles) {
      const imagePath = path.join(dirPath, file);
      const metadata = await this.load(imagePath);
      result.set(file, metadata);
    }

    return result;
  }

  /**
   * Check if metadata exists for an image
   */
  async hasMetadata(imagePath: string): Promise<boolean> {
    // Check individual metadata
    const individualPath = this.getIndividualMetadataPath(imagePath);
    try {
      await fs.access(individualPath);
      return true;
    } catch {
      // Continue to check directory metadata
    }

    // Check directory metadata
    const dirMetadata = await this.loadDirectoryMetadataFile(imagePath);
    if (dirMetadata === null) {
      return false;
    }

    const filename = path.basename(imagePath);
    return filename in dirMetadata && filename !== "_defaults";
  }

  /**
   * Get the permission status for an image
   */
  async getPermissionStatus(imagePath: string): Promise<PermissionStatus | null> {
    const metadata = await this.load(imagePath);
    return metadata.permissions?.status ?? null;
  }

  /**
   * Get the path to individual metadata file
   */
  private getIndividualMetadataPath(imagePath: string): string {
    return path.join(this.baseDir, `${imagePath}.meta.yaml`);
  }

  /**
   * Get the path to directory metadata file
   */
  private getDirectoryMetadataPath(imagePath: string): string {
    const dir = path.dirname(imagePath);
    return path.join(this.baseDir, dir, "images.yaml");
  }

  /**
   * Load individual metadata file (.meta.yaml)
   */
  private async loadIndividualMetadata(
    imagePath: string
  ): Promise<ImageMetadata | null> {
    const metadataPath = this.getIndividualMetadataPath(imagePath);

    // Check if file exists first
    try {
      await fs.access(metadataPath);
    } catch {
      // File doesn't exist - this is normal, not a warning
      return null;
    }

    // File exists, try to read and parse it
    try {
      const content = await fs.readFile(metadataPath, "utf-8");
      const parsed = parseYaml(content);
      const validated = individualMetadataSchema.safeParse(parsed);

      if (validated.success) {
        return validated.data;
      }
      // Schema validation failed
      metadataWarnings.push({
        path: metadataPath,
        message: `Invalid metadata schema: ${validated.error.issues.map((i) => i.message).join(", ")}`,
      });
      return null;
    } catch (error) {
      // YAML parse error or read error
      const message =
        error instanceof Error ? error.message : "Unknown parse error";
      metadataWarnings.push({
        path: metadataPath,
        message: `Failed to parse metadata file: ${message}`,
      });
      return null;
    }
  }

  /**
   * Load directory metadata file (images.yaml)
   */
  private async loadDirectoryMetadataFile(
    imagePath: string
  ): Promise<Record<string, unknown> | null> {
    const metadataPath = this.getDirectoryMetadataPath(imagePath);

    // Check if file exists first
    try {
      await fs.access(metadataPath);
    } catch {
      // File doesn't exist - this is normal, not a warning
      return null;
    }

    // File exists, try to read and parse it
    try {
      const content = await fs.readFile(metadataPath, "utf-8");
      const parsed = parseYaml(content);
      const validated = directoryMetadataSchema.safeParse(parsed);

      if (validated.success) {
        return validated.data;
      }
      // Schema validation failed
      metadataWarnings.push({
        path: metadataPath,
        message: `Invalid metadata schema: ${validated.error.issues.map((i) => i.message).join(", ")}`,
      });
      return null;
    } catch (error) {
      // YAML parse error or read error
      const message =
        error instanceof Error ? error.message : "Unknown parse error";
      metadataWarnings.push({
        path: metadataPath,
        message: `Failed to parse metadata file: ${message}`,
      });
      return null;
    }
  }

  /**
   * Load metadata from directory metadata file
   */
  private async loadFromDirectoryMetadata(
    imagePath: string
  ): Promise<ImageMetadata> {
    const dirMetadata = await this.loadDirectoryMetadataFile(imagePath);

    if (dirMetadata === null) {
      return {};
    }

    const filename = path.basename(imagePath);

    // Get defaults
    const defaults = (dirMetadata["_defaults"] ?? {}) as Partial<ImageMetadata>;

    // Get file-specific metadata
    const fileMetadata = (dirMetadata[filename] ?? {}) as Partial<ImageMetadata>;

    // Merge defaults with file-specific metadata
    // File-specific values override defaults
    return this.mergeMetadata(defaults, fileMetadata);
  }

  /**
   * Merge two metadata objects, with override taking precedence
   */
  private mergeMetadata(
    defaults: Partial<ImageMetadata>,
    override: Partial<ImageMetadata>
  ): ImageMetadata {
    const result: ImageMetadata = { ...defaults };

    // Override with file-specific values
    for (const key of Object.keys(override) as (keyof ImageMetadata)[]) {
      const overrideValue = override[key];
      if (overrideValue !== undefined) {
        if (
          key === "permissions" &&
          typeof overrideValue === "object" &&
          typeof defaults.permissions === "object"
        ) {
          // Merge permissions objects
          result.permissions = {
            ...defaults.permissions,
            ...overrideValue,
          };
        } else if (
          key === "credits" &&
          typeof overrideValue === "object" &&
          typeof defaults.credits === "object"
        ) {
          // Merge credits objects
          result.credits = {
            ...defaults.credits,
            ...overrideValue,
          };
        } else {
          // Direct override for other fields
          (result as Record<string, unknown>)[key] = overrideValue;
        }
      }
    }

    return result;
  }
}
