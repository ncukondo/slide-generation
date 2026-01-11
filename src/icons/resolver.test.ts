import { describe, expect, it, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";
import { IconResolver } from "./resolver.js";
import { IconRegistryLoader } from "./registry.js";

describe("IconResolver", () => {
  let tempDir: string;
  let loader: IconRegistryLoader;
  let resolver: IconResolver;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "icon-resolver-test-"));
    loader = new IconRegistryLoader();
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe("render web-font icons", () => {
    beforeEach(async () => {
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

aliases:
  planning: "mi:event_note"
  success: "mi:check_circle"

defaults:
  size: "24px"
  color: "currentColor"
`
      );
      await loader.load(registryPath);
      resolver = new IconResolver(loader);
    });

    it("renders web-font icon with default options", async () => {
      const html = await resolver.render("mi:home");

      expect(html).toContain("material-icons");
      expect(html).toContain("home");
      expect(html).toContain("font-size: 24px");
      expect(html).toContain("color: currentColor");
    });

    it("renders web-font icon with custom size", async () => {
      const html = await resolver.render("mi:home", { size: "32px" });

      expect(html).toContain("font-size: 32px");
    });

    it("renders web-font icon with custom color", async () => {
      const html = await resolver.render("mi:home", { color: "#FF0000" });

      expect(html).toContain("color: #FF0000");
    });

    it("renders icon via alias", async () => {
      const html = await resolver.render("planning");

      expect(html).toContain("material-icons");
      expect(html).toContain("event_note");
    });

    it("passes custom class to render template", async () => {
      // Note: Custom class usage depends on the render template
      // The class is available as {{ class }} in the template
      const html = await resolver.render("mi:home", { class: "custom-icon" });

      // The test template doesn't include {{ class }}, so we verify
      // the icon renders without error
      expect(html).toContain("material-icons");
      expect(html).toContain("home");
    });
  });

  describe("render local-svg icons", () => {
    beforeEach(async () => {
      // Create custom icons directory
      const iconsDir = path.join(tempDir, "icons", "custom");
      const iconsDirNormalized = iconsDir.replace(/\\/g, "/");
      await fs.mkdir(iconsDir, { recursive: true });

      // Create a sample SVG file
      await fs.writeFile(
        path.join(iconsDir, "test-icon.svg"),
        `<svg viewBox="0 0 24 24" fill="currentColor">
  <path d="M12 2L2 7l10 5 10-5-10-5z"/>
</svg>`
      );

      const registryPath = path.join(tempDir, "registry.yaml");
      await fs.writeFile(
        registryPath,
        `
sources:
  - name: custom
    type: local-svg
    prefix: custom
    path: "${iconsDirNormalized}"

aliases:
  logo: "custom:test-icon"

defaults:
  size: "24px"
  color: "currentColor"
`
      );
      await loader.load(registryPath);
      resolver = new IconResolver(loader);
    });

    it("renders local SVG icon", async () => {
      const html = await resolver.render("custom:test-icon");

      expect(html).toContain("<svg");
      expect(html).toContain("viewBox");
      expect(html).toContain("M12 2L2 7l10 5 10-5-10-5z");
    });

    it("applies size to local SVG", async () => {
      const html = await resolver.render("custom:test-icon", { size: "32px" });

      expect(html).toContain('width="32px"');
      expect(html).toContain('height="32px"');
    });

    it("applies color to local SVG", async () => {
      const html = await resolver.render("custom:test-icon", {
        color: "#FF0000",
      });

      expect(html).toContain('fill="#FF0000"');
    });

    it("renders via alias", async () => {
      const html = await resolver.render("logo");

      expect(html).toContain("<svg");
      expect(html).toContain("M12 2L2 7l10 5 10-5-10-5z");
    });

    it("adds icon class to SVG", async () => {
      const html = await resolver.render("custom:test-icon");

      expect(html).toContain('class="icon icon-test-icon"');
    });
  });

  describe("error handling", () => {
    beforeEach(async () => {
      const registryPath = path.join(tempDir, "registry.yaml");
      await fs.writeFile(
        registryPath,
        `
sources:
  - name: material-icons
    type: web-font
    prefix: mi
`
      );
      await loader.load(registryPath);
      resolver = new IconResolver(loader);
    });

    it("throws error for unknown prefix", async () => {
      await expect(resolver.render("unknown:icon")).rejects.toThrow(
        /Unknown icon source prefix/
      );
    });

    it("throws error for invalid icon reference format", async () => {
      await expect(resolver.render("invalid-format")).rejects.toThrow(
        /Invalid icon reference format/
      );
    });
  });

  describe("local SVG file not found", () => {
    beforeEach(async () => {
      const iconsDir = path.join(tempDir, "icons", "custom");
      const iconsDirNormalized = iconsDir.replace(/\\/g, "/");
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
      await fs.mkdir(iconsDir, { recursive: true });
      await loader.load(registryPath);
      resolver = new IconResolver(loader);
    });

    it("throws error when local SVG file not found", async () => {
      await expect(resolver.render("custom:nonexistent")).rejects.toThrow(
        /Icon file not found/
      );
    });
  });

  describe("web-font without render template", () => {
    beforeEach(async () => {
      const registryPath = path.join(tempDir, "registry.yaml");
      await fs.writeFile(
        registryPath,
        `
sources:
  - name: material-icons
    type: web-font
    prefix: mi
    url: "https://fonts.googleapis.com/icon?family=Material+Icons"
`
      );
      await loader.load(registryPath);
      resolver = new IconResolver(loader);
    });

    it("uses default render template when not specified", async () => {
      const html = await resolver.render("mi:home");

      expect(html).toContain("icon");
      expect(html).toContain("home");
    });

    it("includes custom class in default template", async () => {
      const html = await resolver.render("mi:home", { class: "my-custom-class" });

      expect(html).toContain("my-custom-class");
      expect(html).toContain("icon-home");
    });
  });

  describe("svg-inline icons", () => {
    beforeEach(async () => {
      const registryPath = path.join(tempDir, "registry.yaml");
      await fs.writeFile(
        registryPath,
        `
sources:
  - name: heroicons
    type: svg-inline
    prefix: hero
    url: "https://unpkg.com/heroicons/{name}.svg"
`
      );
      await loader.load(registryPath);
      resolver = new IconResolver(loader);
    });

    it("generates placeholder for svg-inline without cache", async () => {
      // Without cache/fetch, svg-inline should return a placeholder
      const html = await resolver.render("hero:arrow-right");

      expect(html).toContain("icon");
      expect(html).toContain("arrow-right");
    });
  });

  describe("svg-sprite icons", () => {
    beforeEach(async () => {
      const registryPath = path.join(tempDir, "registry.yaml");
      await fs.writeFile(
        registryPath,
        `
sources:
  - name: feather
    type: svg-sprite
    prefix: feather
    url: "https://example.com/sprite.svg"
`
      );
      await loader.load(registryPath);
      resolver = new IconResolver(loader);
    });

    it("renders svg-sprite with use element", async () => {
      const html = await resolver.render("feather:check");

      expect(html).toContain("<svg");
      expect(html).toContain("<use");
      expect(html).toContain("xlink:href");
      expect(html).toContain("#check");
    });
  });

  describe("theme color integration", () => {
    beforeEach(async () => {
      const registryPath = path.join(tempDir, "registry.yaml");
      await fs.writeFile(
        registryPath,
        `
sources:
  - name: material-icons
    type: web-font
    prefix: mi
    render: '<span class="material-icons" style="{{ style }}">{{ name }}</span>'

aliases:
  planning: "mi:event_note"

colors:
  primary: "#1976D2"
  secondary: "#424242"
  success: "#4CAF50"

defaults:
  size: "24px"
  color: "currentColor"
`
      );
      await loader.load(registryPath);
      resolver = new IconResolver(loader);
    });

    it("should resolve color from palette name", async () => {
      const html = await resolver.render("planning", { color: "primary" });
      expect(html).toContain("color: #1976D2");
    });

    it("should pass through hex colors", async () => {
      const html = await resolver.render("planning", { color: "#FF5722" });
      expect(html).toContain("color: #FF5722");
    });

    it("should pass through rgb colors", async () => {
      const html = await resolver.render("planning", { color: "rgb(255, 87, 34)" });
      expect(html).toContain("color: rgb(255, 87, 34)");
    });

    it("should use CSS variable for theme colors when enabled", async () => {
      const resolverWithVars = new IconResolver(loader, { useThemeVariables: true });
      const html = await resolverWithVars.render("planning", { color: "primary" });
      expect(html).toContain("var(--theme-primary)");
    });

    it("should still pass through hex colors in CSS variable mode", async () => {
      const resolverWithVars = new IconResolver(loader, { useThemeVariables: true });
      const html = await resolverWithVars.render("planning", { color: "#FF5722" });
      expect(html).toContain("color: #FF5722");
    });

    it("should use default color when not specified", async () => {
      const html = await resolver.render("planning");
      expect(html).toContain("color: currentColor");
    });
  });
});
