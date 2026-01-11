import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { ImageMetadataLoader } from "./metadata-loader";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";

describe("ImageMetadataLoader", () => {
  let tempDir: string;
  let loader: ImageMetadataLoader;

  beforeEach(async () => {
    // Create a temporary directory for test fixtures
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "image-metadata-test-"));
    loader = new ImageMetadataLoader(tempDir);
  });

  afterEach(async () => {
    // Clean up temporary directory
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe("load", () => {
    it("should load individual metadata file (.meta.yaml)", async () => {
      // Create image and metadata file
      const imagePath = "photos/test.jpg";
      const metadataPath = path.join(tempDir, "photos", "test.jpg.meta.yaml");
      await fs.mkdir(path.join(tempDir, "photos"), { recursive: true });
      await fs.writeFile(path.join(tempDir, imagePath), "dummy image");
      await fs.writeFile(
        metadataPath,
        `description: Test image
captured_date: "2024-12-15"
permissions:
  status: approved
  approved_by: John Doe
tags:
  - test
  - sample`
      );

      const metadata = await loader.load(imagePath);
      expect(metadata.description).toBe("Test image");
      expect(metadata.captured_date).toBe("2024-12-15");
      expect(metadata.permissions?.status).toBe("approved");
      expect(metadata.tags).toEqual(["test", "sample"]);
    });

    it("should load from directory metadata file (images.yaml)", async () => {
      // Create directory structure with images.yaml
      const imagePath = "photos/product.jpg";
      await fs.mkdir(path.join(tempDir, "photos"), { recursive: true });
      await fs.writeFile(path.join(tempDir, imagePath), "dummy image");
      await fs.writeFile(
        path.join(tempDir, "photos", "images.yaml"),
        `_defaults:
  permissions:
    status: approved

product.jpg:
  description: Product photo
  tags:
    - product`
      );

      const metadata = await loader.load(imagePath);
      expect(metadata.description).toBe("Product photo");
      expect(metadata.permissions?.status).toBe("approved");
      expect(metadata.tags).toEqual(["product"]);
    });

    it("should prioritize individual over directory metadata", async () => {
      // Create both individual and directory metadata
      const imagePath = "photos/priority.jpg";
      await fs.mkdir(path.join(tempDir, "photos"), { recursive: true });
      await fs.writeFile(path.join(tempDir, imagePath), "dummy image");

      // Directory metadata
      await fs.writeFile(
        path.join(tempDir, "photos", "images.yaml"),
        `priority.jpg:
  description: Directory description
  tags:
    - from-directory`
      );

      // Individual metadata (should take priority)
      await fs.writeFile(
        path.join(tempDir, "photos", "priority.jpg.meta.yaml"),
        `description: Individual description
tags:
  - from-individual`
      );

      const metadata = await loader.load(imagePath);
      expect(metadata.description).toBe("Individual description");
      expect(metadata.tags).toEqual(["from-individual"]);
    });

    it("should apply directory defaults", async () => {
      const imagePath = "photos/defaults-test.jpg";
      await fs.mkdir(path.join(tempDir, "photos"), { recursive: true });
      await fs.writeFile(path.join(tempDir, imagePath), "dummy image");

      await fs.writeFile(
        path.join(tempDir, "photos", "images.yaml"),
        `_defaults:
  permissions:
    status: approved
  credits:
    required: false

defaults-test.jpg:
  description: Test with defaults`
      );

      const metadata = await loader.load(imagePath);
      expect(metadata.description).toBe("Test with defaults");
      expect(metadata.permissions?.status).toBe("approved");
      expect(metadata.credits?.required).toBe(false);
    });

    it("should override defaults with file-specific values", async () => {
      const imagePath = "photos/override.jpg";
      await fs.mkdir(path.join(tempDir, "photos"), { recursive: true });
      await fs.writeFile(path.join(tempDir, imagePath), "dummy image");

      await fs.writeFile(
        path.join(tempDir, "photos", "images.yaml"),
        `_defaults:
  permissions:
    status: approved

override.jpg:
  description: Override test
  permissions:
    status: pending
    pending_contact: Contact person`
      );

      const metadata = await loader.load(imagePath);
      expect(metadata.permissions?.status).toBe("pending");
      expect(metadata.permissions?.pending_contact).toBe("Contact person");
    });

    it("should return empty metadata if no file found", async () => {
      const metadata = await loader.load("nonexistent/image.jpg");
      expect(metadata).toEqual({});
    });

    it("should handle nested directory paths", async () => {
      const imagePath = "deep/nested/path/image.jpg";
      await fs.mkdir(path.join(tempDir, "deep", "nested", "path"), {
        recursive: true,
      });
      await fs.writeFile(path.join(tempDir, imagePath), "dummy image");
      await fs.writeFile(
        path.join(tempDir, "deep", "nested", "path", "image.jpg.meta.yaml"),
        `description: Nested image`
      );

      const metadata = await loader.load(imagePath);
      expect(metadata.description).toBe("Nested image");
    });
  });

  describe("loadDirectory", () => {
    it("should load all metadata for images in a directory", async () => {
      await fs.mkdir(path.join(tempDir, "gallery"), { recursive: true });
      await fs.writeFile(path.join(tempDir, "gallery", "img1.jpg"), "dummy");
      await fs.writeFile(path.join(tempDir, "gallery", "img2.jpg"), "dummy");
      await fs.writeFile(path.join(tempDir, "gallery", "img3.jpg"), "dummy");

      await fs.writeFile(
        path.join(tempDir, "gallery", "images.yaml"),
        `_defaults:
  permissions:
    status: approved

img1.jpg:
  description: Image 1

img2.jpg:
  description: Image 2
  permissions:
    status: pending`
      );

      await fs.writeFile(
        path.join(tempDir, "gallery", "img3.jpg.meta.yaml"),
        `description: Image 3 (individual)`
      );

      const metadataMap = await loader.loadDirectory("gallery");

      expect(metadataMap.size).toBe(3);
      expect(metadataMap.get("img1.jpg")?.description).toBe("Image 1");
      expect(metadataMap.get("img1.jpg")?.permissions?.status).toBe("approved");
      expect(metadataMap.get("img2.jpg")?.description).toBe("Image 2");
      expect(metadataMap.get("img2.jpg")?.permissions?.status).toBe("pending");
      expect(metadataMap.get("img3.jpg")?.description).toBe(
        "Image 3 (individual)"
      );
    });

    it("should return empty map for directory without metadata", async () => {
      await fs.mkdir(path.join(tempDir, "empty"), { recursive: true });
      await fs.writeFile(path.join(tempDir, "empty", "image.jpg"), "dummy");

      const metadataMap = await loader.loadDirectory("empty");
      expect(metadataMap.size).toBe(1);
      expect(metadataMap.get("image.jpg")).toEqual({});
    });

    it("should return empty map for non-existent directory", async () => {
      const metadataMap = await loader.loadDirectory("nonexistent");
      expect(metadataMap.size).toBe(0);
    });

    it("should only include image files in results", async () => {
      await fs.mkdir(path.join(tempDir, "mixed"), { recursive: true });
      await fs.writeFile(path.join(tempDir, "mixed", "photo.jpg"), "dummy");
      await fs.writeFile(path.join(tempDir, "mixed", "photo.png"), "dummy");
      await fs.writeFile(path.join(tempDir, "mixed", "document.txt"), "text");
      await fs.writeFile(path.join(tempDir, "mixed", "images.yaml"), "{}");

      const metadataMap = await loader.loadDirectory("mixed");
      expect(metadataMap.size).toBe(2);
      expect(metadataMap.has("photo.jpg")).toBe(true);
      expect(metadataMap.has("photo.png")).toBe(true);
      expect(metadataMap.has("document.txt")).toBe(false);
      expect(metadataMap.has("images.yaml")).toBe(false);
    });
  });

  describe("hasMetadata", () => {
    it("should return true when individual metadata exists", async () => {
      const imagePath = "photos/with-meta.jpg";
      await fs.mkdir(path.join(tempDir, "photos"), { recursive: true });
      await fs.writeFile(path.join(tempDir, imagePath), "dummy");
      await fs.writeFile(
        path.join(tempDir, "photos", "with-meta.jpg.meta.yaml"),
        "description: Test"
      );

      const hasMetadata = await loader.hasMetadata(imagePath);
      expect(hasMetadata).toBe(true);
    });

    it("should return true when directory metadata exists for image", async () => {
      const imagePath = "photos/in-directory.jpg";
      await fs.mkdir(path.join(tempDir, "photos"), { recursive: true });
      await fs.writeFile(path.join(tempDir, imagePath), "dummy");
      await fs.writeFile(
        path.join(tempDir, "photos", "images.yaml"),
        `in-directory.jpg:
  description: Test`
      );

      const hasMetadata = await loader.hasMetadata(imagePath);
      expect(hasMetadata).toBe(true);
    });

    it("should return false when no metadata exists", async () => {
      const imagePath = "photos/no-meta.jpg";
      await fs.mkdir(path.join(tempDir, "photos"), { recursive: true });
      await fs.writeFile(path.join(tempDir, imagePath), "dummy");

      const hasMetadata = await loader.hasMetadata(imagePath);
      expect(hasMetadata).toBe(false);
    });
  });

  describe("getPermissionStatus", () => {
    it("should return permission status from metadata", async () => {
      const imagePath = "photos/approved.jpg";
      await fs.mkdir(path.join(tempDir, "photos"), { recursive: true });
      await fs.writeFile(path.join(tempDir, imagePath), "dummy");
      await fs.writeFile(
        path.join(tempDir, "photos", "approved.jpg.meta.yaml"),
        `permissions:
  status: approved`
      );

      const status = await loader.getPermissionStatus(imagePath);
      expect(status).toBe("approved");
    });

    it("should return null when no permission info exists", async () => {
      const imagePath = "photos/no-permission.jpg";
      await fs.mkdir(path.join(tempDir, "photos"), { recursive: true });
      await fs.writeFile(path.join(tempDir, imagePath), "dummy");

      const status = await loader.getPermissionStatus(imagePath);
      expect(status).toBeNull();
    });
  });
});
