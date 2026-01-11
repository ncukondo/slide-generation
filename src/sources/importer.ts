import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { SourceExplorer, type FileClassification } from './explorer.js';
import type { SourcesManager } from './manager.js';
import type { SourceEntry, SourceType } from './schema.js';

/**
 * Options for importing a file
 */
export interface ImportOptions {
  /** Force a specific source type */
  type?: SourceType;
  /** Description for the source entry */
  description?: string;
  /** Copy file (true) or move file (false). Default: true */
  copy?: boolean;
}

/**
 * Result of importing a file
 */
export interface ImportResult {
  /** Relative path from sources directory */
  path: string;
  /** Source type */
  type: SourceType;
  /** Original file path */
  originalPath: string;
  /** Generated source ID */
  id: string;
}

/**
 * Result of importing a directory
 */
export interface DirectoryImportResult {
  /** Number of files imported */
  imported: number;
  /** Number of files skipped */
  skipped: number;
  /** Details of imported files */
  results: ImportResult[];
}

/**
 * Mapping from classification to target directory and source type
 */
const TYPE_MAPPING: Record<
  Exclude<FileClassification, 'unknown' | 'image'>,
  { directory: string; sourceType: SourceType }
> = {
  scenario: { directory: 'scenario', sourceType: 'scenario' },
  content: { directory: 'content', sourceType: 'content' },
  material: { directory: 'materials', sourceType: 'material' },
  data: { directory: 'data', sourceType: 'data' },
  conversation: { directory: 'conversation', sourceType: 'conversation' },
};

/**
 * Imports external files into the sources directory
 */
export class SourceImporter {
  private sourcesDir: string;
  private explorer: SourceExplorer;

  constructor(
    projectDir: string,
    private manager: SourcesManager
  ) {
    this.sourcesDir = path.join(projectDir, 'sources');
    this.explorer = new SourceExplorer();
  }

  /**
   * Get the target directory for a source type
   */
  getTargetDirectory(type: SourceType): string {
    return TYPE_MAPPING[type].directory;
  }

  /**
   * Import a single file into the sources directory
   */
  async importFile(
    sourcePath: string,
    options: ImportOptions = {}
  ): Promise<ImportResult> {
    const { type, description, copy = true } = options;

    const resolvedPath = path.resolve(sourcePath);
    const filename = path.basename(resolvedPath);

    // Determine type from options or auto-detect
    let sourceType: SourceType;
    if (type) {
      sourceType = type;
    } else {
      const classification = this.explorer.classifyFile(filename);
      sourceType = this.classificationToSourceType(classification);
    }

    // Get target directory
    const targetDir = this.getTargetDirectory(sourceType);
    const targetDirPath = path.join(this.sourcesDir, targetDir);

    // Ensure target directory exists
    await fs.mkdir(targetDirPath, { recursive: true });

    // Handle filename conflicts
    const targetFilename = await this.getUniqueFilename(targetDirPath, filename);
    const targetPath = path.join(targetDirPath, targetFilename);

    // Copy or move file
    if (copy) {
      await fs.copyFile(resolvedPath, targetPath);
    } else {
      await fs.rename(resolvedPath, targetPath);
    }

    // Generate source ID from filename
    const id = this.generateSourceId(targetFilename);

    // Create relative path for sources.yaml
    const relativePath = path.join(targetDir, targetFilename);

    // Create source entry
    const entry: SourceEntry = {
      id,
      type: sourceType,
      path: relativePath,
      origin: resolvedPath,
      description,
    };

    // Update sources.yaml
    await this.manager.addSource(entry);

    return {
      path: relativePath,
      type: sourceType,
      originalPath: resolvedPath,
      id,
    };
  }

  /**
   * Import all files from a directory
   */
  async importDirectory(
    dirPath: string,
    options: { recursive?: boolean } = {}
  ): Promise<DirectoryImportResult> {
    const { recursive = false } = options;

    const resolvedPath = path.resolve(dirPath);
    const scanOptions = recursive ? {} : { maxDepth: 0 };
    const files = await this.explorer.scan(resolvedPath, scanOptions);

    // Get existing source paths to avoid duplicates
    const data = await this.manager.load();
    const existingOrigins = new Set(
      data.sources?.map((s) => s.origin).filter(Boolean) ?? []
    );

    const results: ImportResult[] = [];
    let imported = 0;
    let skipped = 0;

    for (const file of files) {
      // Skip images (they go to images/ not sources/)
      if (file.type === 'image') {
        skipped++;
        continue;
      }

      // Skip already imported files
      if (existingOrigins.has(file.path)) {
        skipped++;
        continue;
      }

      try {
        const result = await this.importFile(file.path);
        results.push(result);
        imported++;
      } catch {
        skipped++;
      }
    }

    return {
      imported,
      skipped,
      results,
    };
  }

  /**
   * Convert file classification to source type
   */
  private classificationToSourceType(
    classification: FileClassification
  ): SourceType {
    if (classification === 'unknown' || classification === 'image') {
      return 'material'; // Default to material for unknown types
    }
    return classification;
  }

  /**
   * Get a unique filename in the target directory
   */
  private async getUniqueFilename(
    targetDir: string,
    filename: string
  ): Promise<string> {
    const targetPath = path.join(targetDir, filename);

    try {
      await fs.access(targetPath);
      // File exists, generate unique name
      const ext = path.extname(filename);
      const base = path.basename(filename, ext);
      const timestamp = Date.now();
      return `${base}-${timestamp}${ext}`;
    } catch {
      // File doesn't exist, use original name
      return filename;
    }
  }

  /**
   * Generate a source ID from filename
   */
  private generateSourceId(filename: string): string {
    const ext = path.extname(filename);
    const base = path.basename(filename, ext);
    // Convert to kebab-case and remove special characters
    return base
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }
}
