import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";
import { IconCache } from "./cache.js";

describe("IconCache", () => {
  let tempDir: string;
  let cacheDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "icon-cache-test-"));
    cacheDir = path.join(tempDir, ".cache", "icons");
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe("get/set", () => {
    it("stores and retrieves cached value", async () => {
      const cache = new IconCache(cacheDir);
      const svgContent = '<svg viewBox="0 0 24 24"><path d="M1 1"/></svg>';

      await cache.set("test-icon", svgContent);
      const result = await cache.get("test-icon");

      expect(result).toBe(svgContent);
    });

    it("returns null for non-existent cache entry", async () => {
      const cache = new IconCache(cacheDir);

      const result = await cache.get("nonexistent");

      expect(result).toBeNull();
    });

    it("creates cache directory if not exists", async () => {
      const cache = new IconCache(cacheDir);
      const svgContent = '<svg viewBox="0 0 24 24"></svg>';

      await cache.set("test-icon", svgContent);

      const dirExists = await fs
        .stat(cacheDir)
        .then(() => true)
        .catch(() => false);
      expect(dirExists).toBe(true);
    });

    it("handles special characters in key", async () => {
      const cache = new IconCache(cacheDir);
      const svgContent = '<svg viewBox="0 0 24 24"></svg>';

      await cache.set("mdi:account-circle", svgContent);
      const result = await cache.get("mdi:account-circle");

      expect(result).toBe(svgContent);
    });
  });

  describe("TTL (Time To Live)", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("returns cached value within TTL", async () => {
      const ttl = 3600; // 1 hour
      const cache = new IconCache(cacheDir, ttl);
      const svgContent = '<svg viewBox="0 0 24 24"></svg>';

      await cache.set("test-icon", svgContent);
      const result = await cache.get("test-icon");

      expect(result).toBe(svgContent);
    });

    it("returns null for expired cache entry", async () => {
      const ttl = 1; // 1 second
      const cache = new IconCache(cacheDir, ttl);
      const svgContent = '<svg viewBox="0 0 24 24"></svg>';

      await cache.set("test-icon", svgContent);

      // Advance time past TTL
      vi.advanceTimersByTime(1100);

      const result = await cache.get("test-icon");
      expect(result).toBeNull();
    });
  });

  describe("clear", () => {
    it("removes all cached entries", async () => {
      const cache = new IconCache(cacheDir);

      await cache.set("icon1", "<svg>1</svg>");
      await cache.set("icon2", "<svg>2</svg>");
      await cache.set("icon3", "<svg>3</svg>");

      await cache.clear();

      expect(await cache.get("icon1")).toBeNull();
      expect(await cache.get("icon2")).toBeNull();
      expect(await cache.get("icon3")).toBeNull();
    });

    it("handles empty cache directory", async () => {
      const cache = new IconCache(cacheDir);

      // Clear should not throw even if directory doesn't exist
      await expect(cache.clear()).resolves.toBeUndefined();
    });
  });

  describe("has", () => {
    it("returns true for existing non-expired entry", async () => {
      const cache = new IconCache(cacheDir);
      await cache.set("test-icon", "<svg></svg>");

      expect(await cache.has("test-icon")).toBe(true);
    });

    it("returns false for non-existent entry", async () => {
      const cache = new IconCache(cacheDir);

      expect(await cache.has("nonexistent")).toBe(false);
    });

    it("returns false for expired entry", async () => {
      vi.useFakeTimers();
      const ttl = 1;
      const cache = new IconCache(cacheDir, ttl);
      await cache.set("test-icon", "<svg></svg>");

      vi.advanceTimersByTime(1100);

      expect(await cache.has("test-icon")).toBe(false);
      vi.useRealTimers();
    });
  });

  describe("delete", () => {
    it("removes specific cache entry", async () => {
      const cache = new IconCache(cacheDir);
      await cache.set("icon1", "<svg>1</svg>");
      await cache.set("icon2", "<svg>2</svg>");

      await cache.delete("icon1");

      expect(await cache.get("icon1")).toBeNull();
      expect(await cache.get("icon2")).toBe("<svg>2</svg>");
    });

    it("does not throw for non-existent entry", async () => {
      const cache = new IconCache(cacheDir);

      await expect(cache.delete("nonexistent")).resolves.toBeUndefined();
    });
  });

  describe("getOrFetch", () => {
    it("returns cached value if available", async () => {
      const cache = new IconCache(cacheDir);
      const cachedContent = '<svg viewBox="0 0 24 24">cached</svg>';
      await cache.set("test-icon", cachedContent);

      const fetchFn = vi.fn().mockResolvedValue('<svg>fetched</svg>');
      const result = await cache.getOrFetch("test-icon", fetchFn);

      expect(result).toBe(cachedContent);
      expect(fetchFn).not.toHaveBeenCalled();
    });

    it("fetches and caches if not available", async () => {
      const cache = new IconCache(cacheDir);
      const fetchedContent = '<svg viewBox="0 0 24 24">fetched</svg>';

      const fetchFn = vi.fn().mockResolvedValue(fetchedContent);
      const result = await cache.getOrFetch("test-icon", fetchFn);

      expect(result).toBe(fetchedContent);
      expect(fetchFn).toHaveBeenCalledTimes(1);

      // Verify it was cached
      const cachedResult = await cache.get("test-icon");
      expect(cachedResult).toBe(fetchedContent);
    });

    it("fetches again if cache expired", async () => {
      vi.useFakeTimers();
      const ttl = 1;
      const cache = new IconCache(cacheDir, ttl);
      const oldContent = '<svg>old</svg>';
      const newContent = '<svg>new</svg>';

      await cache.set("test-icon", oldContent);
      vi.advanceTimersByTime(1100);

      const fetchFn = vi.fn().mockResolvedValue(newContent);
      const result = await cache.getOrFetch("test-icon", fetchFn);

      expect(result).toBe(newContent);
      expect(fetchFn).toHaveBeenCalledTimes(1);
      vi.useRealTimers();
    });

    it("throws if fetch fails", async () => {
      const cache = new IconCache(cacheDir);

      const fetchFn = vi.fn().mockRejectedValue(new Error("Fetch failed"));

      await expect(cache.getOrFetch("test-icon", fetchFn)).rejects.toThrow(
        "Fetch failed"
      );
    });
  });
});
