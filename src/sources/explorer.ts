import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type { SourceType } from './schema.js';

/**
 * File type classification result
 */
export type FileClassification = SourceType | 'image' | 'unknown';

/**
 * Information about a discovered file
 */
export interface FileInfo {
  /** Full path to the file */
  path: string;
  /** File name only */
  name: string;
  /** Classified type */
  type: FileClassification;
  /** File size in bytes */
  size: number;
  /** Relative path from scan root */
  relativePath: string;
}

/**
 * Summary of files discovered in a directory
 */
export interface DirectorySummary {
  /** Scenario/structure files */
  scenarios: FileInfo[];
  /** Content/script files */
  content: FileInfo[];
  /** Reference materials */
  materials: FileInfo[];
  /** Data files */
  data: FileInfo[];
  /** Image files */
  images: FileInfo[];
  /** Unclassified files */
  unknown: FileInfo[];
  /** Total number of files */
  totalFiles: number;
}

/**
 * Options for scanning directories
 */
export interface ScanOptions {
  /** Maximum directory depth (default: unlimited) */
  maxDepth?: number;
  /** Include hidden files (default: false) */
  includeHidden?: boolean;
  /** Maximum file size to read in bytes (default: 10MB) */
  fileSizeLimit?: number;
}

/**
 * Options for getting file preview
 */
export interface PreviewOptions {
  /** Maximum preview length in characters (default: 500) */
  maxLength?: number;
}

/**
 * Classification patterns for different file types
 */
const CLASSIFICATION_PATTERNS: Record<
  FileClassification,
  { namePatterns: RegExp[]; extensionPatterns: RegExp[] }
> = {
  scenario: {
    namePatterns: [
      /scenario/i,
      /brief/i,
      /要件/i,
      /outline/i,
      /構成/i,
      /structure/i,
      /requirement/i,
    ],
    extensionPatterns: [],
  },
  content: {
    namePatterns: [/draft/i, /content/i, /原稿/i, /script/i],
    extensionPatterns: [],
  },
  data: {
    namePatterns: [/data/i, /statistic/i],
    extensionPatterns: [/\.xlsx$/i, /\.csv$/i, /\.xls$/i],
  },
  material: {
    namePatterns: [/spec/i, /report/i, /manual/i, /guide/i],
    extensionPatterns: [/\.pdf$/i, /\.docx?$/i],
  },
  image: {
    namePatterns: [],
    extensionPatterns: [/\.jpe?g$/i, /\.png$/i, /\.svg$/i, /\.gif$/i, /\.webp$/i],
  },
  conversation: {
    namePatterns: [],
    extensionPatterns: [],
  },
  unknown: {
    namePatterns: [],
    extensionPatterns: [],
  },
};

/**
 * Explores directories and classifies source files
 */
export class SourceExplorer {
  /**
   * Classify a file by its name/extension
   */
  classifyFile(filename: string): FileClassification {
    // First check name patterns (higher priority)
    const namePatternOrder: FileClassification[] = [
      'scenario',
      'content',
      'data',
      'material',
    ];

    for (const type of namePatternOrder) {
      const patterns = CLASSIFICATION_PATTERNS[type];
      for (const pattern of patterns.namePatterns) {
        if (pattern.test(filename)) {
          return type;
        }
      }
    }

    // Then check extension patterns
    const extensionOrder: FileClassification[] = [
      'image',
      'data',
      'material',
    ];

    for (const type of extensionOrder) {
      const patterns = CLASSIFICATION_PATTERNS[type];
      for (const pattern of patterns.extensionPatterns) {
        if (pattern.test(filename)) {
          return type;
        }
      }
    }

    return 'unknown';
  }

  /**
   * Scan a directory and list all files with classification
   */
  async scan(dirPath: string, options: ScanOptions = {}): Promise<FileInfo[]> {
    const { maxDepth, includeHidden = false } = options;
    const resolvedPath = path.resolve(dirPath);
    const files: FileInfo[] = [];

    await this.scanRecursive(resolvedPath, resolvedPath, files, {
      currentDepth: 0,
      maxDepth,
      includeHidden,
    });

    return files;
  }

  /**
   * Internal recursive scan implementation
   */
  private async scanRecursive(
    rootPath: string,
    currentPath: string,
    files: FileInfo[],
    options: {
      currentDepth: number;
      maxDepth: number | undefined;
      includeHidden: boolean;
    }
  ): Promise<void> {
    const { currentDepth, maxDepth, includeHidden } = options;

    // Check depth limit
    if (maxDepth !== undefined && currentDepth > maxDepth) {
      return;
    }

    const entries = await fs.readdir(currentPath, { withFileTypes: true });

    for (const entry of entries) {
      // Skip hidden files/directories if not included
      if (!includeHidden && entry.name.startsWith('.')) {
        continue;
      }

      const fullPath = path.join(currentPath, entry.name);

      if (entry.isDirectory()) {
        await this.scanRecursive(rootPath, fullPath, files, {
          currentDepth: currentDepth + 1,
          maxDepth,
          includeHidden,
        });
      } else if (entry.isFile()) {
        const stats = await fs.stat(fullPath);
        const relativePath = path.relative(rootPath, fullPath);

        files.push({
          path: fullPath,
          name: entry.name,
          type: this.classifyFile(entry.name),
          size: stats.size,
          relativePath,
        });
      }
    }
  }

  /**
   * Generate a categorized summary of files in a directory
   */
  async generateSummary(
    dirPath: string,
    options: ScanOptions = {}
  ): Promise<DirectorySummary> {
    const files = await this.scan(dirPath, options);

    const summary: DirectorySummary = {
      scenarios: [],
      content: [],
      materials: [],
      data: [],
      images: [],
      unknown: [],
      totalFiles: files.length,
    };

    for (const file of files) {
      switch (file.type) {
        case 'scenario':
          summary.scenarios.push(file);
          break;
        case 'content':
          summary.content.push(file);
          break;
        case 'material':
          summary.materials.push(file);
          break;
        case 'data':
          summary.data.push(file);
          break;
        case 'image':
          summary.images.push(file);
          break;
        default:
          summary.unknown.push(file);
      }
    }

    return summary;
  }

  /**
   * Get a preview of a text file's contents
   */
  async getPreview(
    filePath: string,
    options: PreviewOptions = {}
  ): Promise<string | null> {
    const { maxLength = 500 } = options;

    try {
      // Check if it's likely a binary file
      const isBinary = await this.isBinaryFile(filePath);
      if (isBinary) {
        return null;
      }

      const content = await fs.readFile(filePath, 'utf-8');

      if (content.length <= maxLength) {
        return content;
      }

      return content.slice(0, maxLength) + '...';
    } catch {
      return null;
    }
  }

  /**
   * Check if a file is likely binary
   */
  private async isBinaryFile(filePath: string): Promise<boolean> {
    const ext = path.extname(filePath).toLowerCase();

    // Known text extensions - always treat as text
    const textExtensions = [
      '.md',
      '.txt',
      '.yaml',
      '.yml',
      '.json',
      '.csv',
      '.html',
      '.css',
      '.js',
      '.ts',
    ];
    if (textExtensions.includes(ext)) {
      return false;
    }

    // Known binary extensions - always treat as binary
    const binaryExtensions = [
      '.pdf',
      '.xlsx',
      '.xls',
      '.docx',
      '.doc',
      '.pptx',
      '.ppt',
      '.jpg',
      '.jpeg',
      '.png',
      '.gif',
      '.webp',
      '.zip',
      '.tar',
      '.gz',
    ];
    if (binaryExtensions.includes(ext)) {
      return true;
    }

    // Check file content for null bytes
    try {
      const stats = await fs.stat(filePath);
      if (stats.size === 0) {
        return false; // Empty files are not binary
      }

      const bytesToRead = Math.min(512, stats.size);
      const buffer = Buffer.alloc(bytesToRead);
      const fd = await fs.open(filePath, 'r');
      try {
        const { bytesRead } = await fd.read(buffer, 0, bytesToRead, 0);
        // Check for null bytes (common in binary files)
        for (let i = 0; i < bytesRead; i++) {
          if (buffer[i] === 0) {
            return true;
          }
        }
      } finally {
        await fd.close();
      }

      return false;
    } catch {
      return true;
    }
  }
}
