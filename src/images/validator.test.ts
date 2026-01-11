import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { ImageValidator } from "./validator";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";

describe("ImageValidator", () => {
  let tempDir: string;
  let validator: ImageValidator;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "image-validator-test-"));
    validator = new ImageValidator(tempDir);
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe("validateImageExists", () => {
    it("should return valid for existing image", async () => {
      const imagePath = "images/test.jpg";
      await fs.mkdir(path.join(tempDir, "images"), { recursive: true });
      await fs.writeFile(path.join(tempDir, imagePath), "dummy image data");

      const result = await validator.validateImageExists(imagePath);
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it("should return error for missing image", async () => {
      const result = await validator.validateImageExists("images/missing.jpg");
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Image not found: images/missing.jpg");
    });

    it("should return error for unsupported file type", async () => {
      const imagePath = "images/document.pdf";
      await fs.mkdir(path.join(tempDir, "images"), { recursive: true });
      await fs.writeFile(path.join(tempDir, imagePath), "pdf content");

      const result = await validator.validateImageExists(imagePath);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain("Unsupported image format");
    });
  });

  describe("extractImageReferences", () => {
    it("should extract image paths from slide content", () => {
      const slideContent = {
        template: "image-text",
        content: {
          title: "Test",
          image: "images/photos/test.jpg",
          text: "Description",
        },
      };

      const images = validator.extractImageReferences([slideContent]);
      expect(images).toContain("images/photos/test.jpg");
    });

    it("should extract multiple images from gallery template", () => {
      const slideContent = {
        template: "gallery",
        content: {
          title: "Gallery",
          images: [
            { src: "img1.jpg", caption: "Image 1" },
            { src: "img2.jpg", caption: "Image 2" },
          ],
        },
      };

      const images = validator.extractImageReferences([slideContent]);
      expect(images).toContain("img1.jpg");
      expect(images).toContain("img2.jpg");
    });

    it("should extract before/after images", () => {
      const slideContent = {
        template: "before-after",
        content: {
          title: "Comparison",
          before: { image: "before.jpg", label: "Before" },
          after: { image: "after.jpg", label: "After" },
        },
      };

      const images = validator.extractImageReferences([slideContent]);
      expect(images).toContain("before.jpg");
      expect(images).toContain("after.jpg");
    });

    it("should extract image from image-full template", () => {
      const slideContent = {
        template: "image-full",
        content: {
          image: "hero.jpg",
          title: "Hero",
        },
      };

      const images = validator.extractImageReferences([slideContent]);
      expect(images).toContain("hero.jpg");
    });

    it("should return empty array for slides without images", () => {
      const slideContent = {
        template: "title",
        content: {
          title: "Just Text",
          subtitle: "No images",
        },
      };

      const images = validator.extractImageReferences([slideContent]);
      expect(images).toEqual([]);
    });

    it("should deduplicate image references", () => {
      const slides = [
        {
          template: "image-text",
          content: { title: "Slide 1", image: "shared.jpg", text: "Text" },
        },
        {
          template: "image-full",
          content: { image: "shared.jpg", title: "Slide 2" },
        },
      ];

      const images = validator.extractImageReferences(slides);
      expect(images.filter((i) => i === "shared.jpg")).toHaveLength(1);
    });
  });

  describe("validatePresentation", () => {
    it("should validate all images in presentation", async () => {
      // Create some images
      await fs.mkdir(path.join(tempDir, "images"), { recursive: true });
      await fs.writeFile(path.join(tempDir, "images/exists.jpg"), "dummy");

      const slides = [
        {
          template: "image-text",
          content: { title: "Exists", image: "images/exists.jpg", text: "Text" },
        },
        {
          template: "image-full",
          content: { image: "images/missing.jpg", title: "Missing" },
        },
      ];

      const result = await validator.validatePresentation(slides);
      expect(result.errors).toContain("Image not found: images/missing.jpg");
      expect(result.errors.length).toBe(1);
    });

    it("should report pending permissions when checkImages is true", async () => {
      await fs.mkdir(path.join(tempDir, "images"), { recursive: true });
      await fs.writeFile(path.join(tempDir, "images/pending.jpg"), "dummy");
      await fs.writeFile(
        path.join(tempDir, "images/pending.jpg.meta.yaml"),
        `description: Pending image
permissions:
  status: pending
  pending_contact: Checking with client`
      );

      const slides = [
        {
          template: "image-text",
          content: { title: "Test", image: "images/pending.jpg", text: "Text" },
        },
      ];

      const result = await validator.validatePresentation(slides, {
        checkImages: true,
      });
      expect(result.warnings).toContainEqual(
        expect.stringContaining("Pending permission")
      );
    });

    it("should not report permissions when checkImages is false", async () => {
      await fs.mkdir(path.join(tempDir, "images"), { recursive: true });
      await fs.writeFile(path.join(tempDir, "images/pending.jpg"), "dummy");
      await fs.writeFile(
        path.join(tempDir, "images/pending.jpg.meta.yaml"),
        `permissions:
  status: pending`
      );

      const slides = [
        {
          template: "image-text",
          content: { title: "Test", image: "images/pending.jpg", text: "Text" },
        },
      ];

      const result = await validator.validatePresentation(slides, {
        checkImages: false,
      });
      expect(result.warnings).not.toContainEqual(
        expect.stringContaining("permission")
      );
    });

    it("should warn about restricted images", async () => {
      await fs.mkdir(path.join(tempDir, "images"), { recursive: true });
      await fs.writeFile(path.join(tempDir, "images/restricted.jpg"), "dummy");
      await fs.writeFile(
        path.join(tempDir, "images/restricted.jpg.meta.yaml"),
        `permissions:
  status: restricted
  conditions:
    - Internal use only`
      );

      const slides = [
        {
          template: "image-text",
          content: {
            title: "Test",
            image: "images/restricted.jpg",
            text: "Text",
          },
        },
      ];

      const result = await validator.validatePresentation(slides, {
        checkImages: true,
      });
      expect(result.warnings).toContainEqual(
        expect.stringContaining("Restricted")
      );
    });

    it("should error on rejected images", async () => {
      await fs.mkdir(path.join(tempDir, "images"), { recursive: true });
      await fs.writeFile(path.join(tempDir, "images/rejected.jpg"), "dummy");
      await fs.writeFile(
        path.join(tempDir, "images/rejected.jpg.meta.yaml"),
        `permissions:
  status: rejected`
      );

      const slides = [
        {
          template: "image-text",
          content: { title: "Test", image: "images/rejected.jpg", text: "Text" },
        },
      ];

      const result = await validator.validatePresentation(slides, {
        checkImages: true,
      });
      expect(result.errors).toContainEqual(
        expect.stringContaining("Rejected")
      );
    });

    it("should return valid result for approved images", async () => {
      await fs.mkdir(path.join(tempDir, "images"), { recursive: true });
      await fs.writeFile(path.join(tempDir, "images/approved.jpg"), "dummy");
      await fs.writeFile(
        path.join(tempDir, "images/approved.jpg.meta.yaml"),
        `permissions:
  status: approved
  approved_by: Manager`
      );

      const slides = [
        {
          template: "image-text",
          content: { title: "Test", image: "images/approved.jpg", text: "Text" },
        },
      ];

      const result = await validator.validatePresentation(slides, {
        checkImages: true,
      });
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });
  });

  describe("getImageStats", () => {
    it("should return image count by permission status", async () => {
      await fs.mkdir(path.join(tempDir, "images"), { recursive: true });

      // Create images with different permission statuses
      await fs.writeFile(path.join(tempDir, "images/approved1.jpg"), "dummy");
      await fs.writeFile(
        path.join(tempDir, "images/approved1.jpg.meta.yaml"),
        "permissions:\n  status: approved"
      );

      await fs.writeFile(path.join(tempDir, "images/approved2.jpg"), "dummy");
      await fs.writeFile(
        path.join(tempDir, "images/approved2.jpg.meta.yaml"),
        "permissions:\n  status: approved"
      );

      await fs.writeFile(path.join(tempDir, "images/pending.jpg"), "dummy");
      await fs.writeFile(
        path.join(tempDir, "images/pending.jpg.meta.yaml"),
        "permissions:\n  status: pending"
      );

      await fs.writeFile(path.join(tempDir, "images/no-meta.jpg"), "dummy");

      const slides = [
        {
          template: "image-full",
          content: { image: "images/approved1.jpg" },
        },
        {
          template: "image-full",
          content: { image: "images/approved2.jpg" },
        },
        {
          template: "image-full",
          content: { image: "images/pending.jpg" },
        },
        {
          template: "image-full",
          content: { image: "images/no-meta.jpg" },
        },
      ];

      const stats = await validator.getImageStats(slides);
      expect(stats.approved).toBe(2);
      expect(stats.pending).toBe(1);
      expect(stats.unknown).toBe(1);
      expect(stats.total).toBe(4);
    });
  });
});
