import { describe, expect, it, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";
import { IconRegistryLoader, IconResolver, IconCache } from "./index.js";

describe("Icon System E2E", () => {
  let tempDir: string;
  let iconsDir: string;
  let cacheDir: string;

  // Normalized path for use in YAML strings (Windows compatibility)
  let iconsDirNormalized: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "icons-e2e-"));
    iconsDir = path.join(tempDir, "icons", "custom");
    iconsDirNormalized = iconsDir.replace(/\\/g, "/");
    cacheDir = path.join(tempDir, ".cache", "icons");
    await fs.mkdir(iconsDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe("Full workflow", () => {
    it("loads registry, resolves aliases, and renders icons", async () => {
      // Setup: Create registry and custom icon
      const registryPath = path.join(tempDir, "registry.yaml");
      await fs.writeFile(
        registryPath,
        `
sources:
  - name: material-icons
    type: web-font
    prefix: mi
    url: "https://fonts.googleapis.com/icon?family=Material+Icons"
    render: '<span class="material-icons" style="{{ style }}">{{ name }}</span>'

  - name: custom
    type: local-svg
    prefix: custom
    path: "${iconsDirNormalized}"

aliases:
  success: "mi:check_circle"
  logo: "custom:company-logo"

colors:
  primary: "#1976D2"
  success: "#4CAF50"

defaults:
  size: "24px"
  color: "currentColor"
`
      );

      // Create custom SVG
      await fs.writeFile(
        path.join(iconsDir, "company-logo.svg"),
        `<svg viewBox="0 0 24 24" fill="currentColor">
  <circle cx="12" cy="12" r="10"/>
</svg>`
      );

      // Load registry
      const loader = new IconRegistryLoader();
      const registry = await loader.load(registryPath);

      expect(registry.sources).toHaveLength(2);
      expect(registry.aliases).toHaveProperty("success");
      expect(registry.aliases).toHaveProperty("logo");

      // Create resolver
      const resolver = new IconResolver(loader);

      // Test web-font rendering via alias
      const successIcon = await resolver.render("success");
      expect(successIcon).toContain("material-icons");
      expect(successIcon).toContain("check_circle");

      // Test direct web-font reference
      const homeIcon = await resolver.render("mi:home", { size: "32px" });
      expect(homeIcon).toContain("material-icons");
      expect(homeIcon).toContain("home");
      expect(homeIcon).toContain("32px");

      // Test local SVG via alias
      const logoIcon = await resolver.render("logo");
      expect(logoIcon).toContain("<svg");
      expect(logoIcon).toContain("circle");

      // Test local SVG with custom color
      const coloredLogo = await resolver.render("custom:company-logo", {
        color: "#FF0000",
      });
      expect(coloredLogo).toContain('fill="#FF0000"');
    });
  });

  describe("Cache integration", () => {
    it("caches and retrieves icon content", async () => {
      const cache = new IconCache(cacheDir);

      // Simulate caching an SVG
      const svgContent = '<svg viewBox="0 0 24 24"><path d="M1 1"/></svg>';
      await cache.set("hero:arrow-right", svgContent);

      // Verify cache hit
      const cached = await cache.get("hero:arrow-right");
      expect(cached).toBe(svgContent);

      // Verify getOrFetch uses cache
      let fetchCalled = false;
      const result = await cache.getOrFetch("hero:arrow-right", async () => {
        fetchCalled = true;
        return "fetched content";
      });

      expect(fetchCalled).toBe(false);
      expect(result).toBe(svgContent);
    });
  });

  describe("Error handling", () => {
    it("handles missing icon gracefully", async () => {
      const registryPath = path.join(tempDir, "registry.yaml");
      await fs.writeFile(
        registryPath,
        `
sources:
  - name: custom
    type: local-svg
    prefix: custom
    path: "${iconsDirNormalized}"
`
      );

      const loader = new IconRegistryLoader();
      await loader.load(registryPath);
      const resolver = new IconResolver(loader);

      await expect(resolver.render("custom:nonexistent")).rejects.toThrow(
        /Icon file not found/
      );
    });

    it("handles invalid registry gracefully", async () => {
      const registryPath = path.join(tempDir, "invalid-registry.yaml");
      await fs.writeFile(
        registryPath,
        `
sources:
  - name: invalid
    type: invalid-type
    prefix: inv
`
      );

      const loader = new IconRegistryLoader();
      await expect(loader.load(registryPath)).rejects.toThrow();
    });
  });

  describe("Multiple icon sources", () => {
    it("correctly routes to different sources by prefix", async () => {
      const registryPath = path.join(tempDir, "registry.yaml");
      await fs.writeFile(
        registryPath,
        `
sources:
  - name: material-icons
    type: web-font
    prefix: mi
    render: '<span class="material-icons">{{ name }}</span>'

  - name: feather
    type: svg-sprite
    prefix: feather
    url: "https://example.com/sprite.svg"

  - name: custom
    type: local-svg
    prefix: custom
    path: "${iconsDirNormalized}"
`
      );

      await fs.writeFile(
        path.join(iconsDir, "star.svg"),
        '<svg viewBox="0 0 24 24" fill="currentColor"><polygon points="12,2 15,9 22,9 17,14 19,22 12,18 5,22 7,14 2,9 9,9"/></svg>'
      );

      const loader = new IconRegistryLoader();
      await loader.load(registryPath);
      const resolver = new IconResolver(loader);

      // Web font
      const miIcon = await resolver.render("mi:home");
      expect(miIcon).toContain("material-icons");

      // SVG sprite
      const featherIcon = await resolver.render("feather:check");
      expect(featherIcon).toContain("<use");
      expect(featherIcon).toContain("xlink:href");

      // Local SVG
      const customIcon = await resolver.render("custom:star");
      expect(customIcon).toContain("polygon");
    });
  });

  describe("Registry utilities", () => {
    it("provides access to colors and defaults", async () => {
      const registryPath = path.join(tempDir, "registry.yaml");
      await fs.writeFile(
        registryPath,
        `
sources: []

colors:
  primary: "#1976D2"
  accent: "#FF4081"

defaults:
  size: "32px"
  color: "#333"
`
      );

      const loader = new IconRegistryLoader();
      await loader.load(registryPath);

      expect(loader.getColor("primary")).toBe("#1976D2");
      expect(loader.getColor("accent")).toBe("#FF4081");
      expect(loader.getColor("unknown")).toBeUndefined();

      const defaults = loader.getDefaults();
      expect(defaults.size).toBe("32px");
      expect(defaults.color).toBe("#333");
    });

    it("lists all sources and aliases", async () => {
      const registryPath = path.join(tempDir, "registry.yaml");
      await fs.writeFile(
        registryPath,
        `
sources:
  - name: material-icons
    type: web-font
    prefix: mi
  - name: heroicons
    type: svg-inline
    prefix: hero

aliases:
  success: "mi:check_circle"
  arrow: "hero:arrow-right"
`
      );

      const loader = new IconRegistryLoader();
      await loader.load(registryPath);

      const sources = loader.getSources();
      expect(sources).toHaveLength(2);
      expect(sources[0]?.name).toBe("material-icons");
      expect(sources[1]?.name).toBe("heroicons");

      const aliases = loader.getAliases();
      expect(Object.keys(aliases)).toHaveLength(2);
      expect(aliases["success"]).toBe("mi:check_circle");
    });
  });
});
