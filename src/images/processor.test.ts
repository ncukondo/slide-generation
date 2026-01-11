import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { ImageProcessor } from "./processor";

describe("ImageProcessor", () => {
  const testDir = "/tmp/image-processor-test";
  const testImagePath = path.join(testDir, "test.jpg");
  let processor: ImageProcessor;

  beforeEach(async () => {
    await fs.mkdir(testDir, { recursive: true });
    processor = new ImageProcessor();

    // Create a test image using sharp
    const sharp = await import("sharp");
    await sharp.default({
      create: {
        width: 1000,
        height: 800,
        channels: 3,
        background: { r: 255, g: 0, b: 0 },
      },
    })
      .jpeg()
      .toFile(testImagePath);
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  describe("crop", () => {
    it("should crop image with specified region", async () => {
      const outputPath = path.join(testDir, "cropped.jpg");
      const result = await processor.crop(testImagePath, {
        left: 0,
        top: 0,
        width: 800,
        height: 600,
      }, outputPath);

      expect(result.success).toBe(true);
      expect(result.width).toBe(800);
      expect(result.height).toBe(600);
      expect(result.outputPath).toBe(outputPath);

      // Verify file exists
      const stat = await fs.stat(outputPath);
      expect(stat.isFile()).toBe(true);
    });

    it("should handle extract with offset", async () => {
      const outputPath = path.join(testDir, "cropped-offset.jpg");
      const result = await processor.crop(testImagePath, {
        left: 100,
        top: 50,
        width: 500,
        height: 400,
      }, outputPath);

      expect(result.success).toBe(true);
      expect(result.width).toBe(500);
      expect(result.height).toBe(400);
    });

    it("should return error for invalid crop region", async () => {
      const outputPath = path.join(testDir, "invalid.jpg");
      const result = await processor.crop(testImagePath, {
        left: 0,
        top: 0,
        width: 2000, // Larger than image
        height: 600,
      }, outputPath);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe("cropEdges", () => {
    it("should crop percentage from right edge", async () => {
      const outputPath = path.join(testDir, "edge-cropped.jpg");
      const result = await processor.cropEdges(testImagePath, {
        right: 10, // Crop 10% from right
      }, outputPath);

      expect(result.success).toBe(true);
      expect(result.width).toBe(900); // 1000 - 10%
      expect(result.height).toBe(800);
    });

    it("should crop percentage from multiple edges", async () => {
      const outputPath = path.join(testDir, "multi-edge.jpg");
      const result = await processor.cropEdges(testImagePath, {
        left: 10,
        right: 10,
        top: 10,
        bottom: 10,
      }, outputPath);

      expect(result.success).toBe(true);
      expect(result.width).toBe(800); // 1000 - 10% - 10%
      expect(result.height).toBe(640); // 800 - 10% - 10%
    });

    it("should reject percentage over 50", async () => {
      const outputPath = path.join(testDir, "invalid-edge.jpg");
      const result = await processor.cropEdges(testImagePath, {
        right: 60, // Over 50%
      }, outputPath);

      expect(result.success).toBe(false);
      expect(result.error).toContain("50%");
    });
  });

  describe("blurRegion", () => {
    it("should apply blur to specified region", async () => {
      const outputPath = path.join(testDir, "blurred.jpg");
      const result = await processor.blurRegion(testImagePath, {
        x: 100,
        y: 100,
        width: 200,
        height: 150,
        radius: 10,
      }, outputPath);

      expect(result.success).toBe(true);
      expect(result.outputPath).toBe(outputPath);

      // Verify file exists
      const stat = await fs.stat(outputPath);
      expect(stat.isFile()).toBe(true);
    });

    it("should use default radius if not specified", async () => {
      const outputPath = path.join(testDir, "blurred-default.jpg");
      const result = await processor.blurRegion(testImagePath, {
        x: 100,
        y: 100,
        width: 200,
        height: 150,
      }, outputPath);

      expect(result.success).toBe(true);
    });

    it("should return error for region outside image", async () => {
      const outputPath = path.join(testDir, "invalid-blur.jpg");
      const result = await processor.blurRegion(testImagePath, {
        x: 900,
        y: 700,
        width: 200, // Extends beyond image
        height: 200,
      }, outputPath);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe("getMetadata", () => {
    it("should return image dimensions", async () => {
      const metadata = await processor.getMetadata(testImagePath);

      expect(metadata.width).toBe(1000);
      expect(metadata.height).toBe(800);
    });
  });
});
