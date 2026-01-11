import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import sharp from "sharp";
import { ImageProcessingPipeline } from "./processing-pipeline";

describe("ImageProcessingPipeline", () => {
  const testDir = "/tmp/image-processing-pipeline-test";
  const imagesDir = path.join(testDir, "images");

  beforeEach(async () => {
    await fs.mkdir(imagesDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  async function createTestImage(filename: string, width = 1000, height = 800): Promise<string> {
    const imagePath = path.join(imagesDir, filename);
    await sharp({
      create: {
        width,
        height,
        channels: 3,
        background: { r: 255, g: 0, b: 0 },
      },
    })
      .jpeg()
      .toFile(imagePath);
    return imagePath;
  }

  async function createMetadataFile(imageFilename: string, content: string): Promise<void> {
    const metaPath = path.join(imagesDir, `${imageFilename}.meta.yaml`);
    await fs.writeFile(metaPath, content, "utf-8");
  }

  describe("processImage", () => {
    it("should process image with crop instruction from metadata", async () => {
      await createTestImage("photo.jpg");
      await createMetadataFile("photo.jpg", `
description: Test photo
processing:
  - type: crop
    edges:
      right: 10
`);

      const pipeline = new ImageProcessingPipeline(imagesDir);
      const result = await pipeline.processImage("photo.jpg");

      expect(result.success).toBe(true);
      expect(result.processedPath).toBeDefined();

      // Verify processed file exists
      const stat = await fs.stat(result.processedPath!);
      expect(stat.isFile()).toBe(true);

      // Verify dimensions
      const metadata = await sharp(result.processedPath!).metadata();
      expect(metadata.width).toBe(900); // 1000 - 10%
    });

    it("should process image with blur instruction from metadata", async () => {
      await createTestImage("logo-photo.jpg");
      await createMetadataFile("logo-photo.jpg", `
description: Photo with logo to blur
processing:
  - type: blur
    region:
      x: 100
      y: 100
      width: 200
      height: 100
    radius: 10
`);

      const pipeline = new ImageProcessingPipeline(imagesDir);
      const result = await pipeline.processImage("logo-photo.jpg");

      expect(result.success).toBe(true);
      expect(result.processedPath).toBeDefined();

      // Verify file exists
      const stat = await fs.stat(result.processedPath!);
      expect(stat.isFile()).toBe(true);
    });

    it("should apply multiple processing instructions in order", async () => {
      await createTestImage("multi.jpg");
      await createMetadataFile("multi.jpg", `
description: Multiple processing
processing:
  - type: crop
    edges:
      right: 10
  - type: blur
    region:
      x: 50
      y: 50
      width: 100
      height: 50
`);

      const pipeline = new ImageProcessingPipeline(imagesDir);
      const result = await pipeline.processImage("multi.jpg");

      expect(result.success).toBe(true);
      expect(result.instructionsApplied).toBe(2);

      // Verify dimensions after crop
      const metadata = await sharp(result.processedPath!).metadata();
      expect(metadata.width).toBe(900);
    });

    it("should skip processing if no instructions in metadata", async () => {
      await createTestImage("no-processing.jpg");
      await createMetadataFile("no-processing.jpg", `
description: No processing needed
`);

      const pipeline = new ImageProcessingPipeline(imagesDir);
      const result = await pipeline.processImage("no-processing.jpg");

      expect(result.success).toBe(true);
      expect(result.skipped).toBe(true);
      expect(result.processedPath).toBeUndefined();
    });

    it("should skip processing if no metadata file exists", async () => {
      await createTestImage("no-meta.jpg");

      const pipeline = new ImageProcessingPipeline(imagesDir);
      const result = await pipeline.processImage("no-meta.jpg");

      expect(result.success).toBe(true);
      expect(result.skipped).toBe(true);
    });
  });

  describe("processDirectory", () => {
    it("should process all images with processing instructions", async () => {
      await createTestImage("image1.jpg");
      await createTestImage("image2.jpg");
      await createTestImage("image3.jpg");

      await createMetadataFile("image1.jpg", `
processing:
  - type: crop
    edges:
      bottom: 5
`);
      await createMetadataFile("image2.jpg", `
processing:
  - type: blur
    region:
      x: 0
      y: 0
      width: 50
      height: 50
`);
      // image3 has no metadata

      const pipeline = new ImageProcessingPipeline(imagesDir);
      const results = await pipeline.processDirectory();

      expect(results.totalImages).toBe(3);
      expect(results.processedImages).toBe(2);
      expect(results.skippedImages).toBe(1);
      expect(results.imageMap.size).toBe(2);
    });

    it("should return empty results for directory with no images", async () => {
      const pipeline = new ImageProcessingPipeline(imagesDir);
      const results = await pipeline.processDirectory();

      expect(results.totalImages).toBe(0);
      expect(results.processedImages).toBe(0);
    });
  });

  describe("custom output directory", () => {
    it("should save processed images to custom output directory", async () => {
      await createTestImage("custom-output.jpg");
      await createMetadataFile("custom-output.jpg", `
processing:
  - type: crop
    edges:
      left: 5
`);

      const customOutputDir = path.join(testDir, "custom-processed");
      const pipeline = new ImageProcessingPipeline(imagesDir, {
        outputDir: customOutputDir,
      });
      const result = await pipeline.processImage("custom-output.jpg");

      expect(result.success).toBe(true);
      expect(result.processedPath).toContain("custom-processed");

      // Verify file exists in custom directory
      const stat = await fs.stat(result.processedPath!);
      expect(stat.isFile()).toBe(true);
    });
  });
});
