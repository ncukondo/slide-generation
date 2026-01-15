/**
 * Search Cache
 *
 * Caches search results to reduce API calls and improve performance.
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as crypto from 'node:crypto';

export interface SearchCacheOptions {
  /** Directory to store cache files */
  directory: string;
  /** Time-to-live in seconds */
  ttl: number;
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

/**
 * Cache for icon search results
 */
export class SearchCache {
  private directory: string;
  private ttl: number;

  constructor(options: SearchCacheOptions) {
    this.directory = options.directory;
    this.ttl = options.ttl;
  }

  /**
   * Generate a safe filename from a cache key
   */
  private getFilename(key: string): string {
    // Hash the key to handle special characters and long keys
    const hash = crypto.createHash('md5').update(key).digest('hex');
    return path.join(this.directory, `${hash}.json`);
  }

  /**
   * Get a cached value
   */
  async get<T>(key: string): Promise<T | null> {
    const filename = this.getFilename(key);

    try {
      const content = await fs.readFile(filename, 'utf-8');
      const entry = JSON.parse(content) as CacheEntry<T>;

      // Check if expired
      const now = Date.now();
      const expiresAt = entry.timestamp + entry.ttl * 1000;

      if (now > expiresAt) {
        // Expired, remove the file
        await fs.unlink(filename).catch(() => {});
        return null;
      }

      return entry.data;
    } catch {
      // File doesn't exist or is invalid
      return null;
    }
  }

  /**
   * Set a cached value
   */
  async set<T>(key: string, data: T): Promise<void> {
    const filename = this.getFilename(key);

    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: this.ttl,
    };

    // Ensure directory exists
    await fs.mkdir(this.directory, { recursive: true });

    await fs.writeFile(filename, JSON.stringify(entry, null, 2), 'utf-8');
  }

  /**
   * Clear all cached values
   */
  async clear(): Promise<void> {
    try {
      const files = await fs.readdir(this.directory);
      await Promise.all(
        files
          .filter((f) => f.endsWith('.json'))
          .map((f) => fs.unlink(path.join(this.directory, f)).catch(() => {}))
      );
    } catch {
      // Directory doesn't exist or other error
    }
  }
}
