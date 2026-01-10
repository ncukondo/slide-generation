import { describe, it, expect, beforeEach } from "vitest";
import { TemplateLoader } from "../../src/templates/loader";
import { TemplateEngine } from "../../src/templates/engine";
import * as path from "node:path";

describe("Special Templates", () => {
  let loader: TemplateLoader;
  let engine: TemplateEngine;

  beforeEach(async () => {
    loader = new TemplateLoader();
    engine = new TemplateEngine();
    const fixturesDir = path.resolve(__dirname, "../fixtures/templates");
    await loader.loadBuiltIn(fixturesDir);
  });

  describe("quote", () => {
    it("should be loaded", () => {
      const template = loader.get("quote");
      expect(template).toBeDefined();
      expect(template?.category).toBe("special");
    });

    it("should validate valid content", () => {
      const result = loader.validateContent("quote", {
        text: "To be or not to be, that is the question.",
        author: "William Shakespeare",
      });
      expect(result.valid).toBe(true);
    });

    it("should validate with title", () => {
      const result = loader.validateContent("quote", {
        title: "Famous Quote",
        text: "The only thing we have to fear is fear itself.",
        author: "Franklin D. Roosevelt",
      });
      expect(result.valid).toBe(true);
    });

    it("should reject missing text", () => {
      const result = loader.validateContent("quote", {
        author: "Unknown",
      });
      expect(result.valid).toBe(false);
    });

    it("should render quote with author", async () => {
      const template = loader.get("quote")!;
      const content = {
        text: "Stay hungry, stay foolish.",
        author: "Steve Jobs",
      };

      const result = await engine.render(template.output, { content });
      expect(result).toContain("Stay hungry, stay foolish.");
      expect(result).toContain("Steve Jobs");
      expect(result).toContain("blockquote");
    });

    it("should render quote with title", async () => {
      const template = loader.get("quote")!;
      const content = {
        title: "Words of Wisdom",
        text: "Knowledge is power.",
        author: "Francis Bacon",
      };

      const result = await engine.render(template.output, { content });
      expect(result).toContain("# Words of Wisdom");
      expect(result).toContain("Knowledge is power.");
      expect(result).toContain("Francis Bacon");
    });

    it("should render quote with source", async () => {
      const template = loader.get("quote")!;
      const content = {
        text: "I think, therefore I am.",
        author: "Rene Descartes",
        source: "Discourse on the Method",
      };

      const result = await engine.render(template.output, { content });
      expect(result).toContain("Discourse on the Method");
    });
  });

  describe("code-block", () => {
    it("should be loaded", () => {
      const template = loader.get("code-block");
      expect(template).toBeDefined();
      expect(template?.category).toBe("special");
    });

    it("should validate valid content", () => {
      const result = loader.validateContent("code-block", {
        title: "Example Code",
        code: 'console.log("Hello World");',
        language: "javascript",
      });
      expect(result.valid).toBe(true);
    });

    it("should reject missing code", () => {
      const result = loader.validateContent("code-block", {
        title: "Empty Code",
        language: "python",
      });
      expect(result.valid).toBe(false);
    });

    it("should render code block with syntax highlighting", async () => {
      const template = loader.get("code-block")!;
      const content = {
        title: "Hello World",
        code: 'print("Hello, World!")',
        language: "python",
      };

      const result = await engine.render(template.output, { content });
      expect(result).toContain("# Hello World");
      expect(result).toContain('print("Hello, World!")');
      expect(result).toContain("```python");
    });

    it("should render code block with default language", async () => {
      const template = loader.get("code-block")!;
      const content = {
        title: "Plain Code",
        code: "some code here",
      };

      const result = await engine.render(template.output, { content });
      expect(result).toContain("```");
      expect(result).toContain("some code here");
    });

    it("should render code block with filename", async () => {
      const template = loader.get("code-block")!;
      const content = {
        title: "Configuration",
        code: '{ "name": "app" }',
        language: "json",
        filename: "package.json",
      };

      const result = await engine.render(template.output, { content });
      expect(result).toContain("package.json");
    });

    it("should render code block with line numbers", async () => {
      const template = loader.get("code-block")!;
      const content = {
        title: "Numbered Lines",
        code: "line 1\nline 2\nline 3",
        language: "text",
        showLineNumbers: true,
      };

      const result = await engine.render(template.output, { content });
      expect(result).toContain("line-numbers");
    });
  });

  describe("bibliography", () => {
    it("should be loaded", () => {
      const template = loader.get("bibliography");
      expect(template).toBeDefined();
      expect(template?.category).toBe("special");
    });

    it("should validate valid content", () => {
      const result = loader.validateContent("bibliography", {
        title: "References",
        references: [
          {
            id: "smith2020",
            authors: ["Smith, J."],
            title: "Introduction to Testing",
            year: 2020,
          },
        ],
      });
      expect(result.valid).toBe(true);
    });

    it("should validate with automatic references", () => {
      const result = loader.validateContent("bibliography", {
        title: "Works Cited",
        autoGenerate: true,
      });
      expect(result.valid).toBe(true);
    });

    it("should render bibliography with manual references", async () => {
      const template = loader.get("bibliography")!;
      const content = {
        title: "References",
        references: [
          {
            id: "doe2021",
            authors: ["Doe, J.", "Smith, A."],
            title: "Advanced Topics",
            year: 2021,
            journal: "Journal of Science",
          },
        ],
      };

      const result = await engine.render(template.output, { content });
      expect(result).toContain("# References");
      expect(result).toContain("Doe, J.");
      expect(result).toContain("Advanced Topics");
      expect(result).toContain("2021");
    });

    it("should render bibliography with book reference", async () => {
      const template = loader.get("bibliography")!;
      const content = {
        title: "Bibliography",
        references: [
          {
            id: "author2019",
            authors: ["Author, A."],
            title: "Complete Guide",
            year: 2019,
            publisher: "Tech Books Inc.",
          },
        ],
      };

      const result = await engine.render(template.output, { content });
      expect(result).toContain("Complete Guide");
      expect(result).toContain("Tech Books Inc.");
    });
  });

  describe("custom", () => {
    it("should be loaded", () => {
      const template = loader.get("custom");
      expect(template).toBeDefined();
      expect(template?.category).toBe("special");
    });

    it("should validate valid content", () => {
      const result = loader.validateContent("custom", {
        markdown: "# Custom Content\n\nAnything goes here.",
      });
      expect(result.valid).toBe(true);
    });

    it("should validate with title", () => {
      const result = loader.validateContent("custom", {
        title: "Custom Slide",
        markdown: "Some **markdown** content",
      });
      expect(result.valid).toBe(true);
    });

    it("should reject missing markdown", () => {
      const result = loader.validateContent("custom", {
        title: "Empty Custom",
      });
      expect(result.valid).toBe(false);
    });

    it("should render custom markdown directly", async () => {
      const template = loader.get("custom")!;
      const content = {
        markdown: "## Subtitle\n\n- Point 1\n- Point 2\n\n**Bold text**",
      };

      const result = await engine.render(template.output, { content });
      expect(result).toContain("## Subtitle");
      expect(result).toContain("- Point 1");
      expect(result).toContain("**Bold text**");
    });

    it("should render custom with title", async () => {
      const template = loader.get("custom")!;
      const content = {
        title: "My Custom Slide",
        markdown: "Custom content here",
      };

      const result = await engine.render(template.output, { content });
      expect(result).toContain("# My Custom Slide");
      expect(result).toContain("Custom content here");
    });

    it("should render custom with class", async () => {
      const template = loader.get("custom")!;
      const content = {
        class: "special-style",
        markdown: "Styled content",
      };

      const result = await engine.render(template.output, { content });
      expect(result).toContain("special-style");
    });
  });

  describe("listByCategory", () => {
    it("should list all special templates", () => {
      const specialTemplates = loader.listByCategory("special");
      expect(specialTemplates.length).toBe(4);

      const names = specialTemplates.map(t => t.name);
      expect(names).toContain("quote");
      expect(names).toContain("code-block");
      expect(names).toContain("bibliography");
      expect(names).toContain("custom");
    });
  });
});
