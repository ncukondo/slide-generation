import { describe, expect, it, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";
import { IconRegistryLoader } from "./registry.js";

describe("IconRegistryLoader", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "icon-registry-test-"));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe("load", () => {
    it("loads registry from YAML file", async () => {
      const registryPath = path.join(tempDir, "registry.yaml");
      await fs.writeFile(
        registryPath,
        `
sources:
  - name: material-icons
    type: web-font
    prefix: mi
    url: "https://fonts.googleapis.com/icon?family=Material+Icons"
    render: '<span class="material-icons">{{ name }}</span>'

aliases:
  planning: "mi:event_note"
  success: "mi:check_circle"

colors:
  primary: "#1976D2"

defaults:
  size: "32px"
  color: "#333"
`
      );

      const loader = new IconRegistryLoader();
      const registry = await loader.load(registryPath);

      expect(registry.sources).toHaveLength(1);
      expect(registry.sources[0]?.name).toBe("material-icons");
      expect(registry.sources[0]?.type).toBe("web-font");
      expect(registry.aliases).toEqual({
        planning: "mi:event_note",
        success: "mi:check_circle",
      });
      expect(registry.defaults.size).toBe("32px");
    });

    it("applies defaults for missing optional fields", async () => {
      const registryPath = path.join(tempDir, "registry.yaml");
      await fs.writeFile(
        registryPath,
        `
sources:
  - name: custom
    type: local-svg
    prefix: custom
    path: "./icons/"
`
      );

      const loader = new IconRegistryLoader();
      const registry = await loader.load(registryPath);

      expect(registry.aliases).toEqual({});
      expect(registry.defaults.size).toBe("24px");
      expect(registry.defaults.color).toBe("currentColor");
    });

    it("throws error for non-existent file", async () => {
      const loader = new IconRegistryLoader();
      await expect(
        loader.load(path.join(tempDir, "nonexistent.yaml"))
      ).rejects.toThrow();
    });

    it("throws error for invalid YAML", async () => {
      const registryPath = path.join(tempDir, "invalid.yaml");
      await fs.writeFile(registryPath, "invalid: yaml: content:");

      const loader = new IconRegistryLoader();
      await expect(loader.load(registryPath)).rejects.toThrow();
    });

    it("throws error for invalid schema", async () => {
      const registryPath = path.join(tempDir, "invalid-schema.yaml");
      await fs.writeFile(
        registryPath,
        `
sources:
  - name: invalid
    type: unknown-type
    prefix: inv
`
      );

      const loader = new IconRegistryLoader();
      await expect(loader.load(registryPath)).rejects.toThrow();
    });
  });

  describe("resolveAlias", () => {
    it("resolves alias to icon reference", async () => {
      const registryPath = path.join(tempDir, "registry.yaml");
      await fs.writeFile(
        registryPath,
        `
sources:
  - name: material-icons
    type: web-font
    prefix: mi

aliases:
  planning: "mi:event_note"
  success: "mi:check_circle"
`
      );

      const loader = new IconRegistryLoader();
      await loader.load(registryPath);

      expect(loader.resolveAlias("planning")).toBe("mi:event_note");
      expect(loader.resolveAlias("success")).toBe("mi:check_circle");
    });

    it("returns original name if not an alias", async () => {
      const registryPath = path.join(tempDir, "registry.yaml");
      await fs.writeFile(
        registryPath,
        `
sources:
  - name: material-icons
    type: web-font
    prefix: mi

aliases:
  planning: "mi:event_note"
`
      );

      const loader = new IconRegistryLoader();
      await loader.load(registryPath);

      expect(loader.resolveAlias("mi:home")).toBe("mi:home");
      expect(loader.resolveAlias("unknown")).toBe("unknown");
    });
  });

  describe("getSource", () => {
    it("returns source by prefix", async () => {
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
`
      );

      const loader = new IconRegistryLoader();
      await loader.load(registryPath);

      const miSource = loader.getSource("mi");
      expect(miSource).toBeDefined();
      expect(miSource?.name).toBe("material-icons");

      const heroSource = loader.getSource("hero");
      expect(heroSource).toBeDefined();
      expect(heroSource?.name).toBe("heroicons");
    });

    it("returns undefined for unknown prefix", async () => {
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

      const loader = new IconRegistryLoader();
      await loader.load(registryPath);

      expect(loader.getSource("unknown")).toBeUndefined();
    });
  });

  describe("parseIconReference", () => {
    it("parses prefix:name format", async () => {
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

      const loader = new IconRegistryLoader();
      await loader.load(registryPath);

      const result = loader.parseIconReference("mi:home");
      expect(result).toEqual({ prefix: "mi", name: "home" });
    });

    it("parses iconify format with set", async () => {
      const registryPath = path.join(tempDir, "registry.yaml");
      await fs.writeFile(
        registryPath,
        `
sources:
  - name: iconify
    type: svg-inline
    prefix: iconify
`
      );

      const loader = new IconRegistryLoader();
      await loader.load(registryPath);

      const result = loader.parseIconReference("iconify:mdi:account");
      expect(result).toEqual({ prefix: "iconify", name: "mdi:account" });
    });

    it("returns null for invalid format", async () => {
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

      const loader = new IconRegistryLoader();
      await loader.load(registryPath);

      expect(loader.parseIconReference("no-prefix")).toBeNull();
    });
  });

  describe("getDefaults", () => {
    it("returns registry defaults", async () => {
      const registryPath = path.join(tempDir, "registry.yaml");
      await fs.writeFile(
        registryPath,
        `
sources: []
defaults:
  size: "32px"
  color: "#000"
`
      );

      const loader = new IconRegistryLoader();
      await loader.load(registryPath);

      const defaults = loader.getDefaults();
      expect(defaults.size).toBe("32px");
      expect(defaults.color).toBe("#000");
    });
  });

  describe("getColor", () => {
    it("returns color by name", async () => {
      const registryPath = path.join(tempDir, "registry.yaml");
      await fs.writeFile(
        registryPath,
        `
sources: []
colors:
  primary: "#1976D2"
  success: "#4CAF50"
`
      );

      const loader = new IconRegistryLoader();
      await loader.load(registryPath);

      expect(loader.getColor("primary")).toBe("#1976D2");
      expect(loader.getColor("success")).toBe("#4CAF50");
    });

    it("returns undefined for unknown color", async () => {
      const registryPath = path.join(tempDir, "registry.yaml");
      await fs.writeFile(
        registryPath,
        `
sources: []
colors:
  primary: "#1976D2"
`
      );

      const loader = new IconRegistryLoader();
      await loader.load(registryPath);

      expect(loader.getColor("unknown")).toBeUndefined();
    });
  });

  describe("fetched source", () => {
    it("should resolve fetched (local) source", async () => {
      const registryPath = path.join(tempDir, "registry.yaml");
      await fs.writeFile(
        registryPath,
        `
sources:
  - name: fetched
    type: local-svg
    prefix: fetched
    path: "./icons/fetched/"
`
      );

      const loader = new IconRegistryLoader();
      await loader.load(registryPath);

      const source = loader.getSource("fetched");
      expect(source).toBeDefined();
      expect(source?.type).toBe("local-svg");
      expect(source?.path).toBe("./icons/fetched/");
    });

    it("should resolve Health Icons source", async () => {
      const registryPath = path.join(tempDir, "registry.yaml");
      await fs.writeFile(
        registryPath,
        `
sources:
  - name: healthicons
    type: svg-inline
    prefix: health
    url: "https://api.iconify.design/healthicons/{name}.svg"
`
      );

      const loader = new IconRegistryLoader();
      await loader.load(registryPath);

      const source = loader.getSource("health");
      expect(source).toBeDefined();
      expect(source?.name).toBe("healthicons");
    });

    it("should resolve medical aliases", async () => {
      const registryPath = path.join(tempDir, "registry.yaml");
      await fs.writeFile(
        registryPath,
        `
sources:
  - name: healthicons
    type: svg-inline
    prefix: health
    url: "https://api.iconify.design/healthicons/{name}.svg"

aliases:
  stethoscope: "health:stethoscope"
`
      );

      const loader = new IconRegistryLoader();
      await loader.load(registryPath);

      const resolved = loader.resolveAlias("stethoscope");
      expect(resolved).toBe("health:stethoscope");
    });

    it("should parse fetched icon reference with subdirectory", async () => {
      const registryPath = path.join(tempDir, "registry.yaml");
      await fs.writeFile(
        registryPath,
        `
sources:
  - name: fetched
    type: local-svg
    prefix: fetched
    path: "./icons/fetched/"
`
      );

      const loader = new IconRegistryLoader();
      await loader.load(registryPath);

      // fetched:healthicons/stethoscope format
      const result = loader.parseIconReference("fetched:healthicons/stethoscope");
      expect(result).toEqual({ prefix: "fetched", name: "healthicons/stethoscope" });
    });
  });
});
