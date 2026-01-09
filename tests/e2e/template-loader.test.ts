import { describe, it, expect, beforeEach } from "vitest";
import * as path from "node:path";
import { TemplateLoader, TemplateEngine } from "../../src/templates";

describe("Template Loader E2E", () => {
  let loader: TemplateLoader;
  const fixturesDir = path.resolve(__dirname, "../fixtures/templates");

  beforeEach(async () => {
    loader = new TemplateLoader();
    await loader.loadBuiltIn(fixturesDir);
  });

  describe("Loading templates from directory", () => {
    it("should load multiple templates from nested directories", () => {
      const templates = loader.list();
      expect(templates.length).toBeGreaterThanOrEqual(3);
    });

    it("should categorize templates correctly", () => {
      const basic = loader.listByCategory("basic");
      const diagrams = loader.listByCategory("diagrams");

      expect(basic.length).toBeGreaterThanOrEqual(2);
      expect(diagrams.length).toBeGreaterThanOrEqual(1);

      expect(basic.map(t => t.name)).toContain("title");
      expect(basic.map(t => t.name)).toContain("bullet-list");
      expect(diagrams.map(t => t.name)).toContain("cycle-diagram");
    });
  });

  describe("Template retrieval and validation", () => {
    it("should retrieve template by name", () => {
      const titleTemplate = loader.get("title");
      expect(titleTemplate).toBeDefined();
      expect(titleTemplate?.name).toBe("title");
      expect(titleTemplate?.category).toBe("basic");
      expect(titleTemplate?.output).toContain("{{ title }}");
    });

    it("should validate content against template schema", () => {
      const result = loader.validateContent("title", {
        title: "My Presentation",
        subtitle: "A Great Topic",
      });

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it("should reject invalid content", () => {
      const result = loader.validateContent("bullet-list", {
        title: "List", // missing items
      });

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes("items"))).toBe(true);
    });
  });

  describe("Integration with TemplateEngine", () => {
    it("should render template using TemplateEngine", () => {
      const engine = new TemplateEngine();
      const template = loader.get("title");
      expect(template).toBeDefined();

      const content = {
        title: "Hello World",
        subtitle: "Welcome",
        author: "John Doe",
      };

      // Validate first
      const validation = loader.validateContent("title", content);
      expect(validation.valid).toBe(true);

      // Then render
      const output = engine.render(template!.output, content);
      expect(output).toContain("# Hello World");
      expect(output).toContain("## Welcome");
      expect(output).toContain("John Doe");
    });

    it("should render complex template with loops", () => {
      const engine = new TemplateEngine();
      const template = loader.get("bullet-list");
      expect(template).toBeDefined();

      const content = {
        title: "Key Points",
        items: ["Point 1", "Point 2", "Point 3"],
      };

      const validation = loader.validateContent("bullet-list", content);
      expect(validation.valid).toBe(true);

      const output = engine.render(template!.output, content);
      expect(output).toContain("# Key Points");
      expect(output).toContain("- Point 1");
      expect(output).toContain("- Point 2");
      expect(output).toContain("- Point 3");
    });

    it("should render diagram template with icon helpers", () => {
      const engine = new TemplateEngine();
      const template = loader.get("cycle-diagram");
      expect(template).toBeDefined();

      const content = {
        title: "PDCA Cycle",
        nodes: [
          { label: "Plan", icon: "planning", color: "#4CAF50" },
          { label: "Do", icon: "action", color: "#2196F3" },
          { label: "Check", color: "#FF9800" },
          { label: "Act", color: "#9C27B0" },
        ],
      };

      const validation = loader.validateContent("cycle-diagram", content);
      expect(validation.valid).toBe(true);

      const output = engine.render(template!.output, content);
      expect(output).toContain("# PDCA Cycle");
      expect(output).toContain("cycle-4");
      expect(output).toContain("Plan");
      expect(output).toContain("--node-color: #4CAF50");
      expect(output).toContain('[planning]'); // icon stub output
    });
  });

  describe("Custom template override", () => {
    it("should allow custom templates to override built-in", async () => {
      // Load built-in first
      const customLoader = new TemplateLoader();
      await customLoader.loadBuiltIn(fixturesDir);

      const originalTitle = customLoader.get("title");
      expect(originalTitle?.description).toBe("タイトルスライド");

      // Override with custom
      await customLoader.loadFromString(`
name: title
description: Custom override
category: basic
schema:
  type: object
  required:
    - title
  properties:
    title:
      type: string
output: |
  # CUSTOM: {{ title }}
`);

      const customTitle = customLoader.get("title");
      expect(customTitle?.description).toBe("Custom override");
      expect(customTitle?.output).toContain("CUSTOM:");
    });
  });

  describe("Complex validation scenarios", () => {
    it("should validate array constraints", () => {
      // cycle-diagram requires 3-6 nodes
      const tooFew = loader.validateContent("cycle-diagram", {
        title: "Test",
        nodes: [{ label: "One" }, { label: "Two" }],
      });
      expect(tooFew.valid).toBe(false);

      const justRight = loader.validateContent("cycle-diagram", {
        title: "Test",
        nodes: [
          { label: "A" },
          { label: "B" },
          { label: "C" },
        ],
      });
      expect(justRight.valid).toBe(true);
    });

    it("should validate pattern constraints", () => {
      const validColor = loader.validateContent("cycle-diagram", {
        title: "Test",
        nodes: [
          { label: "A", color: "#FF0000" },
          { label: "B", color: "#00FF00" },
          { label: "C", color: "#0000FF" },
        ],
      });
      expect(validColor.valid).toBe(true);

      const invalidColor = loader.validateContent("cycle-diagram", {
        title: "Test",
        nodes: [
          { label: "A", color: "red" }, // Invalid pattern
          { label: "B" },
          { label: "C" },
        ],
      });
      expect(invalidColor.valid).toBe(false);
    });
  });
});
