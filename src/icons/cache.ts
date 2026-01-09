import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as crypto from "node:crypto";

/**
 * Cache metadata stored alongside cached content
 */
interface CacheMetadata {
  timestamp: number;
  key: string;
}

/**
 * Icon Cache - caches fetched SVG icons to disk
 */
export class IconCache {
  private cacheDir: string;
  private ttl: number;

  /**
   * Create a new IconCache
   * @param cacheDir - Directory to store cached icons
   * @param ttl - Time to live in seconds (default: 86400 = 24 hours)
   */
  constructor(cacheDir: string, ttl: number = 86400) {
    this.cacheDir = cacheDir;
    this.ttl = ttl;
  }

  /**
   * Get cached content by key
   * @returns Cached content or null if not found/expired
   */
  async get(key: string): Promise<string | null> {
    try {
      const filePath = this.getFilePath(key);
      const metaPath = this.getMetaPath(key);

      // Check if files exist
      await fs.access(filePath);
      await fs.access(metaPath);

      // Read and validate metadata
      const metaContent = await fs.readFile(metaPath, "utf-8");
      const metadata: CacheMetadata = JSON.parse(metaContent);

      // Check if expired
      if (this.isExpired(metadata.timestamp)) {
        return null;
      }

      // Read and return content
      return await fs.readFile(filePath, "utf-8");
    } catch {
      return null;
    }
  }

  /**
   * Set cached content
   */
  async set(key: string, content: string): Promise<void> {
    await this.ensureCacheDir();

    const filePath = this.getFilePath(key);
    const metaPath = this.getMetaPath(key);

    const metadata: CacheMetadata = {
      timestamp: Date.now(),
      key,
    };

    await fs.writeFile(filePath, content, "utf-8");
    await fs.writeFile(metaPath, JSON.stringify(metadata), "utf-8");
  }

  /**
   * Check if key exists and is not expired
   */
  async has(key: string): Promise<boolean> {
    const content = await this.get(key);
    return content !== null;
  }

  /**
   * Delete specific cache entry
   */
  async delete(key: string): Promise<void> {
    try {
      const filePath = this.getFilePath(key);
      const metaPath = this.getMetaPath(key);

      await fs.unlink(filePath).catch(() => {});
      await fs.unlink(metaPath).catch(() => {});
    } catch {
      // Ignore errors
    }
  }

  /**
   * Clear all cached entries
   */
  async clear(): Promise<void> {
    try {
      const entries = await fs.readdir(this.cacheDir).catch(() => []);

      for (const entry of entries) {
        const entryPath = path.join(this.cacheDir, entry);
        await fs.unlink(entryPath).catch(() => {});
      }
    } catch {
      // Ignore errors - directory might not exist
    }
  }

  /**
   * Get cached content or fetch and cache if not available
   */
  async getOrFetch(
    key: string,
    fetchFn: () => Promise<string>
  ): Promise<string> {
    const cached = await this.get(key);
    if (cached !== null) {
      return cached;
    }

    const content = await fetchFn();
    await this.set(key, content);
    return content;
  }

  /**
   * Get file path for cache content
   */
  private getFilePath(key: string): string {
    const hash = this.hashKey(key);
    return path.join(this.cacheDir, `${hash}.svg`);
  }

  /**
   * Get file path for cache metadata
   */
  private getMetaPath(key: string): string {
    const hash = this.hashKey(key);
    return path.join(this.cacheDir, `${hash}.meta.json`);
  }

  /**
   * Hash the key to create a safe filename
   */
  private hashKey(key: string): string {
    return crypto.createHash("sha256").update(key).digest("hex").slice(0, 16);
  }

  /**
   * Check if timestamp is expired based on TTL
   */
  private isExpired(timestamp: number): boolean {
    const age = Date.now() - timestamp;
    const ttlMs = this.ttl * 1000;
    return age > ttlMs;
  }

  /**
   * Ensure cache directory exists
   */
  private async ensureCacheDir(): Promise<void> {
    await fs.mkdir(this.cacheDir, { recursive: true });
  }
}
