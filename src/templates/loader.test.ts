import { describe, it, expect, beforeEach } from "vitest";
import { TemplateLoader, templateDefSchema } from "./loader";
import * as path from "node:path";

describe("Template Definition Schema", () => {
  it("should validate a valid template definition", () => {
    const validDef = {
      name: "test-template",
      description: "A test template",
      category: "basic",
      schema: {
        type: "object",
        required: ["title"],
        properties: {
          title: { type: "string" },
        },
      },
      output: "# {{ title }}",
    };

    const result = templateDefSchema.safeParse(validDef);
    expect(result.success).toBe(true);
  });

  it("should validate a template definition with optional fields", () => {
    const validDef = {
      name: "full-template",
      description: "A full template with all fields",
      category: "diagrams",
      schema: {
        type: "object",
        required: ["title", "nodes"],
        properties: {
          title: { type: "string" },
          nodes: { type: "array" },
        },
      },
      example: {
        title: "Example Title",
        nodes: [{ label: "Node 1" }],
      },
      output: "# {{ title }}\n{% for node in nodes %}{{ node.label }}{% endfor %}",
      css: ".diagram { color: red; }",
    };

    const result = templateDefSchema.safeParse(validDef);
    expect(result.success).toBe(true);
  });

  it("should reject a template definition missing required fields", () => {
    const invalidDef = {
      name: "incomplete",
      description: "Missing category, schema, output",
    };

    const result = templateDefSchema.safeParse(invalidDef);
    expect(result.success).toBe(false);
  });

  it("should reject a template definition with empty name", () => {
    const invalidDef = {
      name: "",
      description: "Empty name",
      category: "basic",
      schema: { type: "object" },
      output: "# Test",
    };

    const result = templateDefSchema.safeParse(invalidDef);
    expect(result.success).toBe(false);
  });

  it("should reject a template definition with empty output", () => {
    const invalidDef = {
      name: "test",
      description: "Empty output",
      category: "basic",
      schema: { type: "object" },
      output: "",
    };

    const result = templateDefSchema.safeParse(invalidDef);
    expect(result.success).toBe(false);
  });
});

describe("TemplateLoader", () => {
  let loader: TemplateLoader;

  beforeEach(() => {
    loader = new TemplateLoader();
  });

  describe("loadFromString", () => {
    it("should load a template from YAML string", async () => {
      const yaml = `
name: test-template
description: A test template
category: basic
schema:
  type: object
  required:
    - title
  properties:
    title:
      type: string
output: |
  # {{ title }}
`;

      await loader.loadFromString(yaml);
      const template = loader.get("test-template");
      expect(template).toBeDefined();
      expect(template?.name).toBe("test-template");
      expect(template?.category).toBe("basic");
    });

    it("should throw on invalid YAML", async () => {
      const invalidYaml = `
name: test
description: Missing fields
`;

      await expect(loader.loadFromString(invalidYaml)).rejects.toThrow();
    });
  });

  describe("get", () => {
    it("should return undefined for non-existent template", () => {
      const template = loader.get("non-existent");
      expect(template).toBeUndefined();
    });

    it("should return template by name", async () => {
      const yaml = `
name: my-template
description: My template
category: custom
schema:
  type: object
  properties:
    content:
      type: string
output: "{{ content }}"
`;

      await loader.loadFromString(yaml);
      const template = loader.get("my-template");
      expect(template).toBeDefined();
      expect(template?.name).toBe("my-template");
    });
  });

  describe("list", () => {
    it("should return empty array when no templates loaded", () => {
      const templates = loader.list();
      expect(templates).toEqual([]);
    });

    it("should return all loaded templates", async () => {
      const yaml1 = `
name: template-1
description: First template
category: basic
schema:
  type: object
output: "template 1"
`;
      const yaml2 = `
name: template-2
description: Second template
category: diagrams
schema:
  type: object
output: "template 2"
`;

      await loader.loadFromString(yaml1);
      await loader.loadFromString(yaml2);

      const templates = loader.list();
      expect(templates).toHaveLength(2);
      expect(templates.map(t => t.name)).toContain("template-1");
      expect(templates.map(t => t.name)).toContain("template-2");
    });
  });

  describe("listByCategory", () => {
    beforeEach(async () => {
      const templates = [
        { name: "title", category: "basic" },
        { name: "bullet-list", category: "basic" },
        { name: "cycle-diagram", category: "diagrams" },
        { name: "table", category: "data" },
      ];

      for (const t of templates) {
        await loader.loadFromString(`
name: ${t.name}
description: ${t.name} template
category: ${t.category}
schema:
  type: object
output: "# ${t.name}"
`);
      }
    });

    it("should filter templates by category", () => {
      const basic = loader.listByCategory("basic");
      expect(basic).toHaveLength(2);
      expect(basic.every(t => t.category === "basic")).toBe(true);
    });

    it("should return empty array for non-existent category", () => {
      const result = loader.listByCategory("nonexistent");
      expect(result).toEqual([]);
    });

    it("should return single template in category", () => {
      const data = loader.listByCategory("data");
      expect(data).toHaveLength(1);
      expect(data[0]?.name).toBe("table");
    });
  });

  describe("custom templates override", () => {
    it("should override built-in template with custom template of same name", async () => {
      const builtIn = `
name: title
description: Built-in title template
category: basic
schema:
  type: object
output: "# Built-in: {{ title }}"
`;
      const custom = `
name: title
description: Custom title template
category: basic
schema:
  type: object
output: "# Custom: {{ title }}"
`;

      await loader.loadFromString(builtIn);
      await loader.loadFromString(custom);

      const template = loader.get("title");
      expect(template?.description).toBe("Custom title template");
      expect(template?.output).toContain("Custom:");
    });
  });

  describe("loadBuiltIn", () => {
    it("should load all templates from a directory recursively", async () => {
      const fixturesDir = path.resolve(__dirname, "../../tests/fixtures/templates");
      await loader.loadBuiltIn(fixturesDir);

      const templates = loader.list();
      expect(templates.length).toBeGreaterThanOrEqual(3);

      const names = templates.map(t => t.name);
      expect(names).toContain("title");
      expect(names).toContain("bullet-list");
      expect(names).toContain("cycle-diagram");
    });

    it("should organize templates by category", async () => {
      const fixturesDir = path.resolve(__dirname, "../../tests/fixtures/templates");
      await loader.loadBuiltIn(fixturesDir);

      const basic = loader.listByCategory("basic");
      const diagrams = loader.listByCategory("diagrams");

      expect(basic.length).toBeGreaterThanOrEqual(2);
      expect(diagrams.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("loadCustom", () => {
    it("should load custom templates that override built-in", async () => {
      const fixturesDir = path.resolve(__dirname, "../../tests/fixtures/templates");
      await loader.loadBuiltIn(fixturesDir);

      // Load a custom template with same name
      await loader.loadFromString(`
name: title
description: Custom overridden title
category: basic
schema:
  type: object
output: "# Overridden"
`);

      const template = loader.get("title");
      expect(template?.description).toBe("Custom overridden title");
    });
  });

  describe("loadFromFile", () => {
    it("should load a single template file", async () => {
      const filePath = path.resolve(__dirname, "../../tests/fixtures/templates/basic/title.yaml");
      await loader.loadFromFile(filePath);

      const template = loader.get("title");
      expect(template).toBeDefined();
      expect(template?.name).toBe("title");
      expect(template?.category).toBe("basic");
      expect(template?.description).toBe("タイトルスライド");
    });

    it("should throw error for non-existent file", async () => {
      const filePath = path.resolve(__dirname, "../../tests/fixtures/templates/nonexistent.yaml");
      await expect(loader.loadFromFile(filePath)).rejects.toThrow();
    });
  });

  describe("validateContent", () => {
    beforeEach(async () => {
      const fixturesDir = path.resolve(__dirname, "../../tests/fixtures/templates");
      await loader.loadBuiltIn(fixturesDir);
    });

    it("should validate valid content against template schema", () => {
      const result = loader.validateContent("title", {
        title: "Hello World",
      });

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it("should validate content with optional fields", () => {
      const result = loader.validateContent("title", {
        title: "Hello World",
        subtitle: "A subtitle",
        author: "John Doe",
      });

      expect(result.valid).toBe(true);
    });

    it("should detect missing required fields", () => {
      const result = loader.validateContent("title", {
        subtitle: "Missing title field",
      });

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(e => e.includes("title"))).toBe(true);
    });

    it("should detect type errors", () => {
      const result = loader.validateContent("bullet-list", {
        title: 123, // should be string
        items: "not an array", // should be array
      });

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("should validate complex nested structures", () => {
      const result = loader.validateContent("cycle-diagram", {
        title: "PDCA Cycle",
        nodes: [
          { label: "Plan" },
          { label: "Do" },
          { label: "Check" },
          { label: "Act" },
        ],
      });

      expect(result.valid).toBe(true);
    });

    it("should detect array constraints (minItems)", () => {
      const result = loader.validateContent("cycle-diagram", {
        title: "Incomplete Cycle",
        nodes: [
          { label: "Only one" },
        ],
      });

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes("3") || e.includes("min"))).toBe(true);
    });

    it("should return error for unknown template", () => {
      const result = loader.validateContent("non-existent", {
        title: "Test",
      });

      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain("not found");
    });

    it("should validate optional fields with patterns", () => {
      const result = loader.validateContent("cycle-diagram", {
        title: "Cycle with colors",
        nodes: [
          { label: "A", color: "#FF0000" },
          { label: "B", color: "invalid" }, // Invalid color format
          { label: "C" },
        ],
      });

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes("color") || e.includes("pattern"))).toBe(true);
    });
  });
});
