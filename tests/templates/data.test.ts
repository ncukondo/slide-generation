import { describe, it, expect, beforeEach } from "vitest";
import { TemplateLoader } from "../../src/templates/loader";
import { TemplateEngine } from "../../src/templates/engine";
import * as path from "node:path";

describe("Data Templates", () => {
  let loader: TemplateLoader;
  let engine: TemplateEngine;

  beforeEach(async () => {
    loader = new TemplateLoader();
    engine = new TemplateEngine();
    const fixturesDir = path.resolve(__dirname, "../fixtures/templates");
    await loader.loadBuiltIn(fixturesDir);
  });

  describe("table", () => {
    it("should be loaded", () => {
      const template = loader.get("table");
      expect(template).toBeDefined();
      expect(template?.category).toBe("data");
    });

    it("should validate valid content", () => {
      const result = loader.validateContent("table", {
        title: "Sample Table",
        headers: ["Column A", "Column B", "Column C"],
        rows: [
          ["Row 1A", "Row 1B", "Row 1C"],
          ["Row 2A", "Row 2B", "Row 2C"],
        ],
      });
      expect(result.valid).toBe(true);
    });

    it("should reject missing headers", () => {
      const result = loader.validateContent("table", {
        title: "No Headers",
        rows: [["A", "B"]],
      });
      expect(result.valid).toBe(false);
    });

    it("should reject missing rows", () => {
      const result = loader.validateContent("table", {
        title: "No Rows",
        headers: ["A", "B"],
      });
      expect(result.valid).toBe(false);
    });

    it("should reject empty headers array", () => {
      const result = loader.validateContent("table", {
        title: "Empty Headers",
        headers: [],
        rows: [["A", "B"]],
      });
      expect(result.valid).toBe(false);
    });

    it("should reject empty rows array", () => {
      const result = loader.validateContent("table", {
        title: "Empty Rows",
        headers: ["A", "B"],
        rows: [],
      });
      expect(result.valid).toBe(false);
    });

    it("should render basic table", async () => {
      const template = loader.get("table")!;
      const content = {
        title: "Basic Table",
        headers: ["Name", "Value"],
        rows: [
          ["Item 1", "100"],
          ["Item 2", "200"],
        ],
      };

      const result = await engine.render(template.output, { content });
      expect(result).toContain("# Basic Table");
      expect(result).toContain("| Name | Value |");
      expect(result).toContain("| --- | --- |");
      expect(result).toContain("| Item 1 | 100 |");
      expect(result).toContain("| Item 2 | 200 |");
    });

    it("should render table with caption", async () => {
      const template = loader.get("table")!;
      const content = {
        title: "Table with Caption",
        caption: "This is a caption",
        headers: ["A", "B"],
        rows: [["1", "2"]],
      };

      const result = await engine.render(template.output, { content });
      expect(result).toContain("This is a caption");
    });

    it("should render table with alignment", async () => {
      const template = loader.get("table")!;
      const content = {
        title: "Aligned Table",
        headers: ["Left", "Center", "Right"],
        align: ["left", "center", "right"],
        rows: [["A", "B", "C"]],
      };

      const result = await engine.render(template.output, { content });
      expect(result).toContain(":---");
      expect(result).toContain(":---:");
      expect(result).toContain("---:");
    });

    it("should escape pipe characters in cell content", async () => {
      const template = loader.get("table")!;
      const content = {
        title: "Escaped Table",
        headers: ["Command"],
        rows: [["a | b"]],
      };

      const result = await engine.render(template.output, { content });
      expect(result).toContain("a \\| b");
    });
  });

  describe("comparison-table", () => {
    it("should be loaded", () => {
      const template = loader.get("comparison-table");
      expect(template).toBeDefined();
      expect(template?.category).toBe("data");
    });

    it("should validate valid content", () => {
      const result = loader.validateContent("comparison-table", {
        title: "Product Comparison",
        items: ["Product A", "Product B"],
        criteria: [
          {
            label: "Price",
            values: ["$100", "$200"],
          },
          {
            label: "Quality",
            values: ["Good", "Excellent"],
          },
        ],
      });
      expect(result.valid).toBe(true);
    });

    it("should reject missing items", () => {
      const result = loader.validateContent("comparison-table", {
        title: "No Items",
        criteria: [{ label: "Test", values: ["A"] }],
      });
      expect(result.valid).toBe(false);
    });

    it("should reject missing criteria", () => {
      const result = loader.validateContent("comparison-table", {
        title: "No Criteria",
        items: ["A", "B"],
      });
      expect(result.valid).toBe(false);
    });

    it("should reject too few items", () => {
      const result = loader.validateContent("comparison-table", {
        title: "One Item",
        items: ["Only One"],
        criteria: [{ label: "Test", values: ["A"] }],
      });
      expect(result.valid).toBe(false);
    });

    it("should reject empty criteria array", () => {
      const result = loader.validateContent("comparison-table", {
        title: "Empty Criteria",
        items: ["A", "B"],
        criteria: [],
      });
      expect(result.valid).toBe(false);
    });

    it("should render comparison table", async () => {
      const template = loader.get("comparison-table")!;
      const content = {
        title: "Feature Comparison",
        items: ["Free", "Pro"],
        criteria: [
          { label: "Storage", values: ["5GB", "100GB"] },
          { label: "Support", values: ["Email", "24/7"] },
        ],
      };

      const result = await engine.render(template.output, { content });
      expect(result).toContain("# Feature Comparison");
      expect(result).toContain("Free");
      expect(result).toContain("Pro");
      expect(result).toContain("Storage");
      expect(result).toContain("5GB");
      expect(result).toContain("100GB");
    });

    it("should render with highlight", async () => {
      const template = loader.get("comparison-table")!;
      const content = {
        title: "Highlight Test",
        items: ["Option A", "Option B"],
        highlightColumn: 1,
        criteria: [{ label: "Test", values: ["A", "B"] }],
      };

      const result = await engine.render(template.output, { content });
      // Highlight is rendered with bold markdown (**text**)
      expect(result).toContain("**Option B**");
      expect(result).toContain("**B**");
    });

    it("should render evaluation marks", async () => {
      const template = loader.get("comparison-table")!;
      const content = {
        title: "Evaluation Test",
        items: ["Product 1", "Product 2"],
        criteria: [
          { label: "Feature", values: ["yes", "no"] },
          { label: "Rating", values: ["partial", "yes"] },
        ],
      };

      const result = await engine.render(template.output, { content });
      // Check for evaluation mark rendering (✓, ✗, △)
      expect(result).toMatch(/[✓✗△◯]/);
    });

    it("should render with description for criteria", async () => {
      const template = loader.get("comparison-table")!;
      const content = {
        title: "Criteria Description",
        items: ["A", "B"],
        criteria: [
          {
            label: "Feature",
            description: "A detailed explanation",
            values: ["Yes", "No"],
          },
        ],
      };

      const result = await engine.render(template.output, { content });
      expect(result).toContain("A detailed explanation");
    });
  });

  describe("listByCategory", () => {
    it("should list all data templates", () => {
      const dataTemplates = loader.listByCategory("data");
      expect(dataTemplates.length).toBe(2);

      const names = dataTemplates.map(t => t.name);
      expect(names).toContain("table");
      expect(names).toContain("comparison-table");
    });
  });
});
