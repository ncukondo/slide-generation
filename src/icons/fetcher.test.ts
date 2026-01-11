import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";
import { IconFetcher } from "./fetcher.js";

// Mock fetch for testing
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

describe("IconFetcher", () => {
  let tempDir: string;
  let fetchedDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "icon-fetcher-test-"));
    fetchedDir = path.join(tempDir, "icons", "fetched");
    await fs.mkdir(fetchedDir, { recursive: true });
    mockFetch.mockReset();
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe("constructor", () => {
    it("should use default options", () => {
      const fetcher = new IconFetcher();
      expect(fetcher).toBeDefined();
    });

    it("should accept custom options", () => {
      const fetcher = new IconFetcher({
        fetchedDir: "/custom/path",
        saveLocally: false,
      });
      expect(fetcher).toBeDefined();
    });
  });

  describe("parseReference", () => {
    it("should parse health:stethoscope format", () => {
      const fetcher = new IconFetcher({ fetchedDir });
      const result = fetcher.parseReference("health:stethoscope");
      expect(result).toEqual({ prefix: "health", name: "stethoscope" });
    });

    it("should parse ms:home format", () => {
      const fetcher = new IconFetcher({ fetchedDir });
      const result = fetcher.parseReference("ms:home");
      expect(result).toEqual({ prefix: "ms", name: "home" });
    });

    it("should return null for invalid format", () => {
      const fetcher = new IconFetcher({ fetchedDir });
      const result = fetcher.parseReference("invalid");
      expect(result).toBeNull();
    });

    it("should return null for path traversal attempts", () => {
      const fetcher = new IconFetcher({ fetchedDir });
      expect(fetcher.parseReference("health:../../../etc/passwd")).toBeNull();
      expect(fetcher.parseReference("health:icon/../secret")).toBeNull();
    });

    it("should return null for invalid characters in name", () => {
      const fetcher = new IconFetcher({ fetchedDir });
      expect(fetcher.parseReference("health:icon?query=bad")).toBeNull();
      expect(fetcher.parseReference("health:icon<script>")).toBeNull();
      expect(fetcher.parseReference("health:icon with spaces")).toBeNull();
    });

    it("should return null for invalid prefix", () => {
      const fetcher = new IconFetcher({ fetchedDir });
      expect(fetcher.parseReference("pre-fix:icon")).toBeNull();
      expect(fetcher.parseReference("pre fix:icon")).toBeNull();
    });

    it("should return null for empty name", () => {
      const fetcher = new IconFetcher({ fetchedDir });
      expect(fetcher.parseReference("health:")).toBeNull();
    });

    it("should return null for overly long names", () => {
      const fetcher = new IconFetcher({ fetchedDir });
      const longName = "a".repeat(101);
      expect(fetcher.parseReference(`health:${longName}`)).toBeNull();
    });
  });

  describe("getIconifySet", () => {
    it("should map health prefix to healthicons", () => {
      const fetcher = new IconFetcher({ fetchedDir });
      expect(fetcher.getIconifySet("health")).toBe("healthicons");
    });

    it("should map ms prefix to material-symbols", () => {
      const fetcher = new IconFetcher({ fetchedDir });
      expect(fetcher.getIconifySet("ms")).toBe("material-symbols");
    });

    it("should map hero prefix to heroicons", () => {
      const fetcher = new IconFetcher({ fetchedDir });
      expect(fetcher.getIconifySet("hero")).toBe("heroicons");
    });

    it("should return prefix as-is for unknown mappings", () => {
      const fetcher = new IconFetcher({ fetchedDir });
      expect(fetcher.getIconifySet("unknown")).toBe("unknown");
    });
  });

  describe("getLocalPath", () => {
    it("should return correct local path for health icon", () => {
      const fetcher = new IconFetcher({ fetchedDir });
      const localPath = fetcher.getLocalPath("health:stethoscope");
      expect(localPath).toBe(path.join(fetchedDir, "healthicons", "stethoscope.svg"));
    });

    it("should return correct local path for material-symbols icon", () => {
      const fetcher = new IconFetcher({ fetchedDir });
      const localPath = fetcher.getLocalPath("ms:home");
      expect(localPath).toBe(path.join(fetchedDir, "material-symbols", "home.svg"));
    });
  });

  describe("existsLocally", () => {
    it("should return true if file exists", async () => {
      const fetcher = new IconFetcher({ fetchedDir });
      const iconDir = path.join(fetchedDir, "healthicons");
      await fs.mkdir(iconDir, { recursive: true });
      await fs.writeFile(path.join(iconDir, "stethoscope.svg"), "<svg></svg>");

      const exists = await fetcher.existsLocally("health:stethoscope");
      expect(exists).toBe(true);
    });

    it("should return false if file does not exist", async () => {
      const fetcher = new IconFetcher({ fetchedDir });
      const exists = await fetcher.existsLocally("health:nonexistent");
      expect(exists).toBe(false);
    });
  });

  describe("fetchAndSave", () => {
    it("should fetch SVG and save locally by default", async () => {
      const svgContent = '<svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0"/></svg>';
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(svgContent),
      });

      const fetcher = new IconFetcher({ fetchedDir });
      const result = await fetcher.fetchAndSave("health:stethoscope");

      expect(result).toBe(svgContent);

      // Verify file was saved
      const localPath = path.join(fetchedDir, "healthicons", "stethoscope.svg");
      const savedContent = await fs.readFile(localPath, "utf-8");
      expect(savedContent).toBe(svgContent);

      // Verify _sources.yaml was updated
      const sourcesPath = path.join(fetchedDir, "_sources.yaml");
      const sourcesContent = await fs.readFile(sourcesPath, "utf-8");
      expect(sourcesContent).toContain("healthicons/stethoscope.svg");
      expect(sourcesContent).toContain("source:");
      expect(sourcesContent).toContain("fetched_at:");
    });

    it("should throw error for invalid icon", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      const fetcher = new IconFetcher({ fetchedDir });
      await expect(fetcher.fetchAndSave("health:nonexistent-icon-xyz"))
        .rejects.toThrow("Icon not found");
    });

    it("should record source information for traceability", async () => {
      const svgContent = '<svg></svg>';
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(svgContent),
      });

      const fetcher = new IconFetcher({ fetchedDir });
      await fetcher.fetchAndSave("health:hospital");

      const sourcesPath = path.join(fetchedDir, "_sources.yaml");
      const sourcesContent = await fs.readFile(sourcesPath, "utf-8");
      expect(sourcesContent).toContain("healthicons/hospital.svg");
      expect(sourcesContent).toContain("iconify.design");
      expect(sourcesContent).toContain("license: MIT");
    });

    it("should not save when saveLocally is false", async () => {
      const svgContent = '<svg></svg>';
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(svgContent),
      });

      const fetcher = new IconFetcher({ fetchedDir, saveLocally: false });
      const result = await fetcher.fetchAndSave("health:stethoscope");

      expect(result).toBe(svgContent);

      // Verify file was NOT saved
      const localPath = path.join(fetchedDir, "healthicons", "stethoscope.svg");
      await expect(fs.access(localPath)).rejects.toThrow();
    });

    it("should throw timeout error when fetch takes too long", async () => {
      // Mock fetch that never resolves (simulates network hang)
      const abortError = new Error("The operation was aborted");
      abortError.name = "AbortError";
      mockFetch.mockImplementationOnce(() => {
        return new Promise((_, reject) => {
          // Simulate abort being triggered
          setTimeout(() => reject(abortError), 10);
        });
      });

      const fetcher = new IconFetcher({ fetchedDir, timeoutMs: 5 });
      await expect(fetcher.fetchAndSave("health:stethoscope"))
        .rejects.toThrow(/Fetch timeout/);
    });

    it("should use custom timeout value", async () => {
      const fetcher = new IconFetcher({ fetchedDir, timeoutMs: 5000 });
      expect(fetcher).toBeDefined();
    });
  });

  describe("resolve", () => {
    it("should return local SVG if already fetched", async () => {
      const fetcher = new IconFetcher({ fetchedDir });
      const svgContent = '<svg>local</svg>';

      // Pre-save the file
      const iconDir = path.join(fetchedDir, "healthicons");
      await fs.mkdir(iconDir, { recursive: true });
      await fs.writeFile(path.join(iconDir, "stethoscope.svg"), svgContent);

      const result = await fetcher.resolve("health:stethoscope");
      expect(result).toBe(svgContent);

      // Verify no network request was made
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("should fetch and save if not locally available", async () => {
      const svgContent = '<svg>fetched</svg>';
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(svgContent),
      });

      const fetcher = new IconFetcher({ fetchedDir });
      const result = await fetcher.resolve("health:stethoscope");

      expect(result).toBe(svgContent);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe("buildUrl", () => {
    it("should build correct Iconify URL for health icons", () => {
      const fetcher = new IconFetcher({ fetchedDir });
      const url = fetcher.buildUrl("health", "stethoscope");
      expect(url).toBe("https://api.iconify.design/healthicons/stethoscope.svg");
    });

    it("should build correct Iconify URL for material-symbols", () => {
      const fetcher = new IconFetcher({ fetchedDir });
      const url = fetcher.buildUrl("ms", "home");
      expect(url).toBe("https://api.iconify.design/material-symbols/home.svg");
    });
  });
});
