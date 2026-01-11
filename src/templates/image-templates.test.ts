import { describe, it, expect, beforeAll } from "vitest";
import { TemplateLoader } from "./loader";
import { TemplateEngine } from "./engine";
import * as path from "node:path";

describe("Image Templates", () => {
  let loader: TemplateLoader;
  let engine: TemplateEngine;

  beforeAll(async () => {
    loader = new TemplateLoader();
    engine = new TemplateEngine();

    // Load built-in templates including new image templates
    const templatesDir = path.resolve(__dirname, "../../templates");
    await loader.loadBuiltIn(templatesDir);
  });

  describe("image-full template", () => {
    it("should be loaded with correct schema", () => {
      const template = loader.get("image-full");
      expect(template).toBeDefined();
      expect(template?.name).toBe("image-full");
      expect(template?.category).toBe("layouts");
    });

    it("should validate content with required fields", () => {
      const result = loader.validateContent("image-full", {
        image: "images/photos/hero.jpg",
      });
      expect(result.valid).toBe(true);
    });

    it("should validate content with all optional fields", () => {
      const result = loader.validateContent("image-full", {
        image: "images/photos/hero.jpg",
        title: "Hero Image",
        caption: "Project overview",
        position: "center",
        overlay: "dark",
      });
      expect(result.valid).toBe(true);
    });

    it("should reject invalid overlay value", () => {
      const result = loader.validateContent("image-full", {
        image: "images/photos/hero.jpg",
        overlay: "invalid",
      });
      expect(result.valid).toBe(false);
    });

    it("should reject invalid position value", () => {
      const result = loader.validateContent("image-full", {
        image: "images/photos/hero.jpg",
        position: "middle",
      });
      expect(result.valid).toBe(false);
    });

    it("should render full-screen image with overlay", async () => {
      const template = loader.get("image-full");
      expect(template).toBeDefined();

      const content = {
        image: "images/photos/hero.jpg",
        title: "Hero Image",
        overlay: "dark",
      };

      const result = await engine.render(template!.output, { content });
      expect(result).toContain("images/photos/hero.jpg");
      expect(result).toContain("Hero Image");
      expect(result).toContain("overlay-dark");
    });

    it("should render without overlay when set to none", async () => {
      const template = loader.get("image-full");
      expect(template).toBeDefined();

      const content = {
        image: "images/photos/hero.jpg",
        overlay: "none",
      };

      const result = await engine.render(template!.output, { content });
      expect(result).not.toContain("overlay-");
    });
  });

  describe("image-caption template", () => {
    it("should be loaded with correct schema", () => {
      const template = loader.get("image-caption");
      expect(template).toBeDefined();
      expect(template?.name).toBe("image-caption");
      expect(template?.category).toBe("layouts");
    });

    it("should validate content with required fields", () => {
      const result = loader.validateContent("image-caption", {
        image: "images/figures/result.png",
        caption: "Figure 1: Experiment results",
      });
      expect(result.valid).toBe(true);
    });

    it("should validate content with all optional fields", () => {
      const result = loader.validateContent("image-caption", {
        title: "Results",
        image: "images/figures/result.png",
        caption: "Figure 1: Experiment results",
        source: "Internal data (2024)",
      });
      expect(result.valid).toBe(true);
    });

    it("should reject content without required caption", () => {
      const result = loader.validateContent("image-caption", {
        image: "images/figures/result.png",
      });
      expect(result.valid).toBe(false);
    });

    it("should render image with caption and source", async () => {
      const template = loader.get("image-caption");
      expect(template).toBeDefined();

      const content = {
        title: "Experiment Results",
        image: "images/figures/result.png",
        caption: "Figure 1: Temperature changes over time",
        source: "Lab Data (2024)",
      };

      const result = await engine.render(template!.output, { content });
      expect(result).toContain("images/figures/result.png");
      expect(result).toContain("Figure 1: Temperature changes over time");
      expect(result).toContain("Lab Data (2024)");
    });
  });

  describe("before-after template", () => {
    it("should be loaded with correct schema", () => {
      const template = loader.get("before-after");
      expect(template).toBeDefined();
      expect(template?.name).toBe("before-after");
      expect(template?.category).toBe("layouts");
    });

    it("should validate content with required fields", () => {
      const result = loader.validateContent("before-after", {
        title: "Comparison",
        before: { image: "before.jpg" },
        after: { image: "after.jpg" },
      });
      expect(result.valid).toBe(true);
    });

    it("should validate content with all optional fields", () => {
      const result = loader.validateContent("before-after", {
        title: "Renovation Results",
        before: {
          image: "before.jpg",
          label: "Before",
          caption: "January 2023",
        },
        after: {
          image: "after.jpg",
          label: "After",
          caption: "March 2024",
        },
        layout: "horizontal",
      });
      expect(result.valid).toBe(true);
    });

    it("should reject invalid layout value", () => {
      const result = loader.validateContent("before-after", {
        title: "Comparison",
        before: { image: "before.jpg" },
        after: { image: "after.jpg" },
        layout: "diagonal",
      });
      expect(result.valid).toBe(false);
    });

    it("should reject content without required before image", () => {
      const result = loader.validateContent("before-after", {
        title: "Comparison",
        before: { label: "Before" },
        after: { image: "after.jpg" },
      });
      expect(result.valid).toBe(false);
    });

    it("should render before/after comparison", async () => {
      const template = loader.get("before-after");
      expect(template).toBeDefined();

      const content = {
        title: "Comparison",
        before: {
          image: "before.jpg",
          label: "Before",
          caption: "Initial state",
        },
        after: {
          image: "after.jpg",
          label: "After",
          caption: "Final state",
        },
      };

      const result = await engine.render(template!.output, { content });
      expect(result).toContain("before.jpg");
      expect(result).toContain("after.jpg");
      expect(result).toContain("Before");
      expect(result).toContain("After");
    });

    it("should render vertical layout when specified", async () => {
      const template = loader.get("before-after");
      expect(template).toBeDefined();

      const content = {
        title: "Comparison",
        before: { image: "before.jpg" },
        after: { image: "after.jpg" },
        layout: "vertical",
      };

      const result = await engine.render(template!.output, { content });
      expect(result).toContain("layout-vertical");
    });
  });

  describe("image-text template (existing)", () => {
    it("should be loaded with correct schema", () => {
      const template = loader.get("image-text");
      expect(template).toBeDefined();
      expect(template?.name).toBe("image-text");
      expect(template?.category).toBe("layouts");
    });

    it("should validate content with required fields", () => {
      const result = loader.validateContent("image-text", {
        title: "Title",
        image: "images/photos/product.jpg",
        text: "Description text",
      });
      expect(result.valid).toBe(true);
    });

    it("should validate content with text array", () => {
      const result = loader.validateContent("image-text", {
        title: "Title",
        image: "images/photos/product.jpg",
        text: ["Item 1", "Item 2", "Item 3"],
      });
      expect(result.valid).toBe(true);
    });

    it("should render image with text side by side", async () => {
      const template = loader.get("image-text");
      expect(template).toBeDefined();

      const content = {
        title: "Product Introduction",
        image: "images/photos/product.jpg",
        imagePosition: "left",
        text: ["Feature 1", "Feature 2"],
      };

      const result = await engine.render(template!.output, { content });
      expect(result).toContain("images/photos/product.jpg");
      expect(result).toContain("image-left");
    });
  });

  describe("gallery template (image-grid)", () => {
    it("should be loaded with correct schema", () => {
      const template = loader.get("gallery");
      expect(template).toBeDefined();
      expect(template?.name).toBe("gallery");
      expect(template?.category).toBe("layouts");
    });

    it("should validate content with images array", () => {
      const result = loader.validateContent("gallery", {
        title: "Gallery",
        images: [
          { src: "img1.jpg", caption: "Image 1" },
          { src: "img2.jpg", caption: "Image 2" },
        ],
      });
      expect(result.valid).toBe(true);
    });

    it("should render multiple images in grid", async () => {
      const template = loader.get("gallery");
      expect(template).toBeDefined();

      const content = {
        title: "Gallery",
        images: [
          { src: "img1.jpg", caption: "Image 1" },
          { src: "img2.jpg", caption: "Image 2" },
        ],
        columns: 2,
      };

      const result = await engine.render(template!.output, { content });
      expect(result).toContain("img1.jpg");
      expect(result).toContain("img2.jpg");
      expect(result).toContain("gallery-cols-2");
    });
  });
});
