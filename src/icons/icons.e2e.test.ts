import { describe, expect, it, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import { IconRegistryLoader, IconResolver, IconifyApiClient } from "./index.js";

const execAsync = promisify(exec);

describe("Icon System E2E", () => {
  let tempDir: string;
  let iconsDir: string;

  // Normalized path for use in YAML strings (Windows compatibility)
  let iconsDirNormalized: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "icons-e2e-"));
    iconsDir = path.join(tempDir, "icons", "custom");
    iconsDirNormalized = iconsDir.replace(/\\/g, "/");
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

      // Create resolver with temp dir as fetchedDir to avoid using committed SVG files
      const resolver = new IconResolver(loader, { fetchedDir: tempDir, autoFetch: false });

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

  describe("Auto-fetch and cached SVG priority", () => {
    let fetchedDir: string;

    beforeEach(async () => {
      fetchedDir = path.join(tempDir, "icons", "fetched");
      await fs.mkdir(fetchedDir, { recursive: true });
    });

    it("uses cached SVG instead of web-font when available", async () => {
      // Create registry with web-font source
      const registryPath = path.join(tempDir, "registry.yaml");
      await fs.writeFile(
        registryPath,
        `
sources:
  - name: material-icons
    type: web-font
    prefix: mi
    render: '<span class="material-icons">{{ name }}</span>'

aliases:
  planning: "mi:event_note"

defaults:
  size: "24px"
  color: "currentColor"
`
      );

      // Create cached SVG file (simulating a previously fetched icon)
      const materialIconsDir = path.join(fetchedDir, "material-icons");
      await fs.mkdir(materialIconsDir, { recursive: true });
      await fs.writeFile(
        path.join(materialIconsDir, "event_note.svg"),
        `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17 10H7v2h10v-2zm0-3H7v2h10V7z"/></svg>`
      );

      const loader = new IconRegistryLoader();
      await loader.load(registryPath);

      // Create resolver with fetchedDir pointing to our cache
      const resolver = new IconResolver(loader, { fetchedDir, autoFetch: false });

      // Render via alias - should use cached SVG
      const html = await resolver.render("planning");

      // Should be inline SVG, not web-font span
      expect(html).toContain("<svg");
      expect(html).toContain("viewBox");
      expect(html).toContain("M17 10H7v2h10v-2z");
      expect(html).not.toContain("material-icons");
    });

    it("falls back to web-font when no cached SVG and autoFetch disabled", async () => {
      const registryPath = path.join(tempDir, "registry.yaml");
      await fs.writeFile(
        registryPath,
        `
sources:
  - name: material-icons
    type: web-font
    prefix: mi
    render: '<span class="material-icons">{{ name }}</span>'

defaults:
  size: "24px"
  color: "currentColor"
`
      );

      const loader = new IconRegistryLoader();
      await loader.load(registryPath);

      // No cached SVG, autoFetch disabled
      const resolver = new IconResolver(loader, { fetchedDir, autoFetch: false });
      const html = await resolver.render("mi:home");

      // Should fall back to web-font
      expect(html).toContain("material-icons");
      expect(html).toContain("home");
    });

    it("applies size and color options to cached SVG", async () => {
      const registryPath = path.join(tempDir, "registry.yaml");
      await fs.writeFile(
        registryPath,
        `
sources:
  - name: material-icons
    type: web-font
    prefix: mi

defaults:
  size: "24px"
  color: "currentColor"
`
      );

      // Create cached SVG
      const materialIconsDir = path.join(fetchedDir, "material-icons");
      await fs.mkdir(materialIconsDir, { recursive: true });
      await fs.writeFile(
        path.join(materialIconsDir, "check_circle.svg"),
        `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/></svg>`
      );

      const loader = new IconRegistryLoader();
      await loader.load(registryPath);
      const resolver = new IconResolver(loader, { fetchedDir, autoFetch: false });

      const html = await resolver.render("mi:check_circle", {
        size: "48px",
        color: "#4CAF50",
      });

      expect(html).toContain('width="48px"');
      expect(html).toContain('height="48px"');
      expect(html).toContain('fill="#4CAF50"');
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

  describe("External icon search", () => {
    it("should search icons using IconifyApiClient", async () => {
      const client = new IconifyApiClient();
      const results = await client.search("heart", { limit: 5 });

      expect(results.icons.length).toBeGreaterThan(0);
      expect(results.total).toBeGreaterThan(0);
      expect(results.icons.some((icon) => icon.includes("heart"))).toBe(true);
    });

    it("should filter by icon set", async () => {
      const client = new IconifyApiClient();
      const results = await client.search("arrow", {
        limit: 10,
        prefixes: ["mdi"],
      });

      expect(results.icons.every((icon) => icon.startsWith("mdi:"))).toBe(true);
    });

    it("should get available collections", async () => {
      const client = new IconifyApiClient();
      const collections = await client.getCollections();

      expect(collections).toHaveProperty("mdi");
      expect(collections).toHaveProperty("heroicons");
      expect(collections["mdi"]).toHaveProperty("total");
    });
  });

  describe("CLI: icons search-external", () => {
    const cliPath = "./dist/cli/index.js";

    it("should search and display results from Iconify API", async () => {
      const { stdout, stderr } = await execAsync(
        `node ${cliPath} icons search-external heart --limit 5`
      );

      expect(stderr).toBe("");
      expect(stdout).toContain("heart");
      expect(stdout).toMatch(/External Icon Search/);
    });

    it("should work with --set filter", async () => {
      const { stdout, stderr } = await execAsync(
        `node ${cliPath} icons search-external arrow --set mdi --format json`
      );

      expect(stderr).toBe("");
      const result = JSON.parse(stdout);
      expect(
        result.icons.every((i: { reference: string }) =>
          i.reference.startsWith("mdi:")
        )
      ).toBe(true);
    });

    it("should output LLM-friendly format for AI agents", async () => {
      const { stdout, stderr } = await execAsync(
        `node ${cliPath} icons search-external check --format llm --limit 10`
      );

      expect(stderr).toBe("");
      expect(stdout).toContain("# External Icon Search Results");
      expect(stdout).toContain("slide-gen icons add");
    });

    it("should list available icon sets with --prefixes", async () => {
      const { stdout, stderr } = await execAsync(
        `node ${cliPath} icons search-external --prefixes`
      );

      expect(stderr).toBe("");
      expect(stdout).toContain("mdi");
      expect(stdout).toContain("Available Icon Sets");
    });

    it("should complete full workflow: search -> validate reference format", async () => {
      // 1. Search for icon
      const { stdout } = await execAsync(
        `node ${cliPath} icons search-external stethoscope --format json --limit 1`
      );

      const result = JSON.parse(stdout);
      expect(result.icons.length).toBeGreaterThan(0);

      // 2. The icon reference can be used with 'icons add'
      // (This verifies the reference format is correct)
      const iconRef = result.icons[0].reference;
      expect(iconRef).toMatch(/^[a-z0-9-]+:[a-z0-9-]+$/i);
    });
  });
});
