import { exec } from 'child_process';

export interface CSLAuthor {
  family: string;
  given?: string;
}

export interface CSLItem {
  id: string;
  author?: CSLAuthor[];
  issued?: { 'date-parts': number[][] };
  title?: string;
  DOI?: string;
  PMID?: string;
  'container-title'?: string;
  volume?: string;
  issue?: string;
  page?: string;
  URL?: string;
  type?: string;
}

export class ReferenceManagerError extends Error {
  constructor(
    message: string,
    public cause?: unknown
  ) {
    super(message);
    this.name = 'ReferenceManagerError';
  }
}

/**
 * Client for reference-manager CLI
 */
export class ReferenceManager {
  constructor(private command: string = 'ref') {}

  /**
   * Check if reference-manager CLI is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      await this.execCommand(`${this.command} --version`);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get all references from the library
   */
  async getAll(): Promise<CSLItem[]> {
    const result = await this.execCommand(`${this.command} list --format json`);
    return this.parseJSON(result);
  }

  /**
   * Get a single reference by ID
   */
  async getById(id: string): Promise<CSLItem | null> {
    const result = await this.execCommand(
      `${this.command} list --id ${id} --format json`
    );
    const items = this.parseJSON(result);
    return items[0] || null;
  }

  /**
   * Get multiple references by IDs using ref export for better performance
   * Note: ref export returns exit code 1 when references are not found,
   * but still outputs valid JSON (empty array or partial results) to stdout
   */
  async getByIds(ids: string[]): Promise<Map<string, CSLItem>> {
    if (ids.length === 0) {
      return new Map();
    }

    // Use ref export with specific IDs instead of fetching all references
    // ignoreExitCode=true because ref export returns exit code 1 for missing refs
    const idsArg = ids.map((id) => `"${id}"`).join(' ');
    const result = await this.execCommand(
      `${this.command} export ${idsArg}`,
      true
    );
    const items = this.parseJSON(result);

    const map = new Map<string, CSLItem>();
    for (const item of items) {
      map.set(item.id, item);
    }

    return map;
  }

  private execCommand(cmd: string, ignoreExitCode = false): Promise<string> {
    return new Promise((resolve, reject) => {
      exec(cmd, (error, stdout) => {
        if (error && !ignoreExitCode) {
          reject(
            new ReferenceManagerError(`Failed to execute: ${cmd}`, error)
          );
          return;
        }
        resolve(stdout.toString());
      });
    });
  }

  private parseJSON(data: string): CSLItem[] {
    try {
      return JSON.parse(data) as CSLItem[];
    } catch (error) {
      throw new ReferenceManagerError(
        'Failed to parse reference-manager output as JSON',
        error
      );
    }
  }
}
