import { describe, it, expect, beforeEach } from "vitest";
import { TemplateLoader } from "../../src/templates/loader";
import { TemplateEngine } from "../../src/templates/engine";
import * as path from "node:path";

describe("Layout Templates", () => {
  let loader: TemplateLoader;
  let engine: TemplateEngine;

  beforeEach(async () => {
    loader = new TemplateLoader();
    engine = new TemplateEngine();
    const fixturesDir = path.resolve(__dirname, "../fixtures/templates");
    await loader.loadBuiltIn(fixturesDir);
  });

  describe("two-column", () => {
    it("should be loaded", () => {
      const template = loader.get("two-column");
      expect(template).toBeDefined();
      expect(template?.category).toBe("layouts");
    });

    it("should validate valid content", () => {
      const result = loader.validateContent("two-column", {
        title: "Two Column Layout",
        left: "Left content here",
        right: "Right content here",
      });
      expect(result.valid).toBe(true);
    });

    it("should reject missing left content", () => {
      const result = loader.validateContent("two-column", {
        title: "No Left",
        right: "Right content",
      });
      expect(result.valid).toBe(false);
    });

    it("should reject missing right content", () => {
      const result = loader.validateContent("two-column", {
        title: "No Right",
        left: "Left content",
      });
      expect(result.valid).toBe(false);
    });

    it("should render two column layout", async () => {
      const template = loader.get("two-column")!;
      const content = {
        title: "Split View",
        left: "This is the left side",
        right: "This is the right side",
      };

      const result = await engine.render(template.output, { content });
      expect(result).toContain("# Split View");
      expect(result).toContain("This is the left side");
      expect(result).toContain("This is the right side");
      expect(result).toContain("column-left");
      expect(result).toContain("column-right");
    });

    it("should render with custom ratio", async () => {
      const template = loader.get("two-column")!;
      const content = {
        title: "Custom Ratio",
        left: "Left content",
        right: "Right content",
        ratio: "60:40",
      };

      const result = await engine.render(template.output, { content });
      expect(result).toContain("60");
      expect(result).toContain("40");
    });

    it("should render array items as bullet list", async () => {
      const template = loader.get("two-column")!;
      const content = {
        title: "Lists",
        left: ["Item A", "Item B"],
        right: ["Item X", "Item Y"],
      };

      const result = await engine.render(template.output, { content });
      expect(result).toContain("Item A");
      expect(result).toContain("Item B");
      expect(result).toContain("Item X");
      expect(result).toContain("Item Y");
    });
  });

  describe("three-column", () => {
    it("should be loaded", () => {
      const template = loader.get("three-column");
      expect(template).toBeDefined();
      expect(template?.category).toBe("layouts");
    });

    it("should validate valid content", () => {
      const result = loader.validateContent("three-column", {
        title: "Three Column Layout",
        columns: [
          { content: "Column 1" },
          { content: "Column 2" },
          { content: "Column 3" },
        ],
      });
      expect(result.valid).toBe(true);
    });

    it("should reject missing columns", () => {
      const result = loader.validateContent("three-column", {
        title: "No Columns",
      });
      expect(result.valid).toBe(false);
    });

    it("should reject too few columns", () => {
      const result = loader.validateContent("three-column", {
        title: "Not Enough",
        columns: [{ content: "Only one" }],
      });
      expect(result.valid).toBe(false);
    });

    it("should render three column layout", async () => {
      const template = loader.get("three-column")!;
      const content = {
        title: "Triple View",
        columns: [
          { content: "First column content" },
          { content: "Second column content" },
          { content: "Third column content" },
        ],
      };

      const result = await engine.render(template.output, { content });
      expect(result).toContain("# Triple View");
      expect(result).toContain("First column content");
      expect(result).toContain("Second column content");
      expect(result).toContain("Third column content");
    });

    it("should render columns with titles", async () => {
      const template = loader.get("three-column")!;
      const content = {
        title: "Titled Columns",
        columns: [
          { title: "Col 1", content: "Content 1" },
          { title: "Col 2", content: "Content 2" },
          { title: "Col 3", content: "Content 3" },
        ],
      };

      const result = await engine.render(template.output, { content });
      expect(result).toContain("Col 1");
      expect(result).toContain("Col 2");
      expect(result).toContain("Col 3");
    });

    it("should render columns with icons", async () => {
      const template = loader.get("three-column")!;
      const icons = {
        render: (name: string) => `<i class="icon-${name}"></i>`,
      };
      const content = {
        title: "Icon Columns",
        columns: [
          { icon: "home", content: "Home" },
          { icon: "work", content: "Work" },
          { icon: "play", content: "Play" },
        ],
      };

      const result = await engine.render(template.output, { content, icons });
      expect(result).toContain("icon-home");
      expect(result).toContain("icon-work");
      expect(result).toContain("icon-play");
    });
  });

  describe("image-text", () => {
    it("should be loaded", () => {
      const template = loader.get("image-text");
      expect(template).toBeDefined();
      expect(template?.category).toBe("layouts");
    });

    it("should validate valid content", () => {
      const result = loader.validateContent("image-text", {
        title: "Image with Text",
        image: "path/to/image.png",
        text: "Description text here",
      });
      expect(result.valid).toBe(true);
    });

    it("should reject missing image", () => {
      const result = loader.validateContent("image-text", {
        title: "No Image",
        text: "Some text",
      });
      expect(result.valid).toBe(false);
    });

    it("should reject missing text", () => {
      const result = loader.validateContent("image-text", {
        title: "No Text",
        image: "image.png",
      });
      expect(result.valid).toBe(false);
    });

    it("should render image-text layout with image on left (default)", async () => {
      const template = loader.get("image-text")!;
      const content = {
        title: "Product Overview",
        image: "product.png",
        text: "This is the product description",
      };

      const result = await engine.render(template.output, { content });
      expect(result).toContain("# Product Overview");
      expect(result).toContain("product.png");
      expect(result).toContain("This is the product description");
    });

    it("should render image-text layout with image on right", async () => {
      const template = loader.get("image-text")!;
      const content = {
        title: "Right Image",
        image: "side.png",
        text: "Text on the left",
        imagePosition: "right",
      };

      const result = await engine.render(template.output, { content });
      expect(result).toContain("side.png");
      expect(result).toContain("Text on the left");
      expect(result).toContain("image-right");
    });

    it("should render with caption", async () => {
      const template = loader.get("image-text")!;
      const content = {
        title: "Captioned Image",
        image: "photo.jpg",
        caption: "Figure 1: Sample photo",
        text: "Explanation text",
      };

      const result = await engine.render(template.output, { content });
      expect(result).toContain("Figure 1: Sample photo");
    });

    it("should render with alt text", async () => {
      const template = loader.get("image-text")!;
      const content = {
        title: "Accessible Image",
        image: "diagram.png",
        alt: "A detailed diagram showing the process",
        text: "Process explanation",
      };

      const result = await engine.render(template.output, { content });
      expect(result).toContain("A detailed diagram showing the process");
    });
  });

  describe("gallery", () => {
    it("should be loaded", () => {
      const template = loader.get("gallery");
      expect(template).toBeDefined();
      expect(template?.category).toBe("layouts");
    });

    it("should validate valid content", () => {
      const result = loader.validateContent("gallery", {
        title: "Image Gallery",
        images: [
          { src: "image1.png" },
          { src: "image2.png" },
        ],
      });
      expect(result.valid).toBe(true);
    });

    it("should reject missing images", () => {
      const result = loader.validateContent("gallery", {
        title: "No Images",
      });
      expect(result.valid).toBe(false);
    });

    it("should reject empty images array", () => {
      const result = loader.validateContent("gallery", {
        title: "Empty Gallery",
        images: [],
      });
      expect(result.valid).toBe(false);
    });

    it("should render gallery layout", async () => {
      const template = loader.get("gallery")!;
      const content = {
        title: "Photo Gallery",
        images: [
          { src: "photo1.jpg" },
          { src: "photo2.jpg" },
          { src: "photo3.jpg" },
        ],
      };

      const result = await engine.render(template.output, { content });
      expect(result).toContain("# Photo Gallery");
      expect(result).toContain("photo1.jpg");
      expect(result).toContain("photo2.jpg");
      expect(result).toContain("photo3.jpg");
    });

    it("should render gallery with captions", async () => {
      const template = loader.get("gallery")!;
      const content = {
        title: "Captioned Gallery",
        images: [
          { src: "img1.png", caption: "First image" },
          { src: "img2.png", caption: "Second image" },
        ],
      };

      const result = await engine.render(template.output, { content });
      expect(result).toContain("First image");
      expect(result).toContain("Second image");
    });

    it("should render gallery with alt text", async () => {
      const template = loader.get("gallery")!;
      const content = {
        title: "Accessible Gallery",
        images: [
          { src: "a.png", alt: "Image A description" },
          { src: "b.png", alt: "Image B description" },
        ],
      };

      const result = await engine.render(template.output, { content });
      expect(result).toContain("Image A description");
      expect(result).toContain("Image B description");
    });

    it("should render with custom columns", async () => {
      const template = loader.get("gallery")!;
      const content = {
        title: "Grid Gallery",
        columns: 4,
        images: [
          { src: "1.png" },
          { src: "2.png" },
          { src: "3.png" },
          { src: "4.png" },
        ],
      };

      const result = await engine.render(template.output, { content });
      expect(result).toContain("gallery-cols-4");
    });
  });

  describe("listByCategory", () => {
    it("should list all layout templates", () => {
      const layoutTemplates = loader.listByCategory("layouts");
      expect(layoutTemplates.length).toBe(4);

      const names = layoutTemplates.map(t => t.name);
      expect(names).toContain("two-column");
      expect(names).toContain("three-column");
      expect(names).toContain("image-text");
      expect(names).toContain("gallery");
    });
  });
});
