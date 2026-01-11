import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createImagesCommand } from "./images";
import { Command } from "commander";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";
import sharp from "sharp";

describe("CLI: Images Command", () => {
  let tempDir: string;
  let originalLog: typeof console.log;
  let originalError: typeof console.error;
  let capturedOutput: string[];

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "images-cmd-test-"));
    capturedOutput = [];

    // Capture console output
    originalLog = console.log;
    originalError = console.error;
    console.log = (...args: unknown[]) => {
      capturedOutput.push(args.join(" "));
    };
    console.error = (...args: unknown[]) => {
      capturedOutput.push(args.join(" "));
    };

    // Reset process.exitCode
    process.exitCode = undefined;
  });

  afterEach(async () => {
    console.log = originalLog;
    console.error = originalError;
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe("createImagesCommand", () => {
    it("should create images command with subcommands", () => {
      const cmd = createImagesCommand();
      expect(cmd.name()).toBe("images");

      const subcommands = cmd.commands.map((c) => c.name());
      expect(subcommands).toContain("status");
      expect(subcommands).toContain("request");
      expect(subcommands).toContain("process");
    });
  });

  describe("images status", () => {
    it("should show image permission status", async () => {
      // Create test presentation and images
      await fs.mkdir(path.join(tempDir, "images"), { recursive: true });
      await fs.writeFile(path.join(tempDir, "images/approved.jpg"), "dummy");
      await fs.writeFile(
        path.join(tempDir, "images/approved.jpg.meta.yaml"),
        "permissions:\n  status: approved\n  approved_by: Manager"
      );
      await fs.writeFile(path.join(tempDir, "images/pending.jpg"), "dummy");
      await fs.writeFile(
        path.join(tempDir, "images/pending.jpg.meta.yaml"),
        "permissions:\n  status: pending\n  pending_contact: Checking"
      );

      const presentation = `
meta:
  title: "Test"
slides:
  - template: image-full
    content:
      image: images/approved.jpg
  - template: image-full
    content:
      image: images/pending.jpg
`;
      const presentationPath = path.join(tempDir, "test.yaml");
      await fs.writeFile(presentationPath, presentation);

      const program = new Command();
      program.addCommand(createImagesCommand());

      await program.parseAsync([
        "node",
        "test",
        "images",
        "status",
        presentationPath,
      ]);

      const output = capturedOutput.join("\n");
      expect(output).toContain("Approved");
      expect(output).toContain("Pending");
    });

    it("should handle presentation with no images", async () => {
      const presentation = `
meta:
  title: "Test"
slides:
  - template: title
    content:
      title: "No images"
`;
      const presentationPath = path.join(tempDir, "no-images.yaml");
      await fs.writeFile(presentationPath, presentation);

      const program = new Command();
      program.addCommand(createImagesCommand());

      await program.parseAsync([
        "node",
        "test",
        "images",
        "status",
        presentationPath,
      ]);

      const output = capturedOutput.join("\n");
      expect(output).toContain("No images");
    });
  });

  describe("images request", () => {
    it("should generate missing image request list", async () => {
      const presentation = `
meta:
  title: "Test"
slides:
  - template: image-full
    content:
      image: images/missing.jpg
      title: "Missing Image"
  - template: image-text
    content:
      title: "Another Missing"
      image: images/another-missing.jpg
      text: Some text
`;
      const presentationPath = path.join(tempDir, "missing.yaml");
      await fs.writeFile(presentationPath, presentation);

      const program = new Command();
      program.addCommand(createImagesCommand());

      await program.parseAsync([
        "node",
        "test",
        "images",
        "request",
        presentationPath,
      ]);

      const output = capturedOutput.join("\n");
      expect(output).toContain("images/missing.jpg");
      expect(output).toContain("images/another-missing.jpg");
    });

    it("should output YAML format for --format llm", async () => {
      const presentation = `
meta:
  title: "Test"
slides:
  - template: image-full
    content:
      image: images/missing.jpg
      title: "Missing Image"
`;
      const presentationPath = path.join(tempDir, "llm-format.yaml");
      await fs.writeFile(presentationPath, presentation);

      const program = new Command();
      program.addCommand(createImagesCommand());

      await program.parseAsync([
        "node",
        "test",
        "images",
        "request",
        presentationPath,
        "--format",
        "llm",
      ]);

      const output = capturedOutput.join("\n");
      expect(output).toContain("missing_images:");
      expect(output).toContain("path:");
    });

    it("should report no missing images when all exist", async () => {
      await fs.mkdir(path.join(tempDir, "images"), { recursive: true });
      await fs.writeFile(path.join(tempDir, "images/exists.jpg"), "dummy");

      const presentation = `
meta:
  title: "Test"
slides:
  - template: image-full
    content:
      image: images/exists.jpg
`;
      const presentationPath = path.join(tempDir, "all-exist.yaml");
      await fs.writeFile(presentationPath, presentation);

      const program = new Command();
      program.addCommand(createImagesCommand());

      await program.parseAsync([
        "node",
        "test",
        "images",
        "request",
        presentationPath,
      ]);

      const output = capturedOutput.join("\n");
      expect(output).toContain("No missing images");
    });
  });

  describe("images process", () => {
    it("should process single image with crop instruction", async () => {
      const imagesDir = path.join(tempDir, "images");
      await fs.mkdir(imagesDir, { recursive: true });

      // Create test image
      await sharp({
        create: {
          width: 1000,
          height: 800,
          channels: 3,
          background: { r: 255, g: 0, b: 0 },
        },
      })
        .jpeg()
        .toFile(path.join(imagesDir, "test.jpg"));

      const program = new Command();
      program.addCommand(createImagesCommand());

      await program.parseAsync([
        "node",
        "test",
        "images",
        "process",
        path.join(imagesDir, "test.jpg"),
        "--crop",
        "right:10",
      ]);

      const output = capturedOutput.join("\n");
      expect(output).toContain("Processed");

      // Check processed file exists
      const processedPath = path.join(imagesDir, ".processed", "test.jpg");
      const stat = await fs.stat(processedPath);
      expect(stat.isFile()).toBe(true);

      // Verify dimensions
      const metadata = await sharp(processedPath).metadata();
      expect(metadata.width).toBe(900);
    });

    it("should process all images in directory from metadata", async () => {
      const imagesDir = path.join(tempDir, "images");
      await fs.mkdir(imagesDir, { recursive: true });

      // Create test images
      await sharp({
        create: {
          width: 1000,
          height: 800,
          channels: 3,
          background: { r: 255, g: 0, b: 0 },
        },
      })
        .jpeg()
        .toFile(path.join(imagesDir, "image1.jpg"));

      await sharp({
        create: {
          width: 800,
          height: 600,
          channels: 3,
          background: { r: 0, g: 255, b: 0 },
        },
      })
        .jpeg()
        .toFile(path.join(imagesDir, "image2.jpg"));

      // Create metadata files
      await fs.writeFile(
        path.join(imagesDir, "image1.jpg.meta.yaml"),
        `processing:
  - type: crop
    edges:
      bottom: 10
`
      );

      await fs.writeFile(
        path.join(imagesDir, "image2.jpg.meta.yaml"),
        `processing:
  - type: blur
    region:
      x: 0
      y: 0
      width: 100
      height: 100
`
      );

      const program = new Command();
      program.addCommand(createImagesCommand());

      await program.parseAsync([
        "node",
        "test",
        "images",
        "process",
        imagesDir,
        "--from-meta",
      ]);

      const output = capturedOutput.join("\n");
      expect(output).toContain("Processed");
      expect(output).toContain("2");

      // Check processed files exist
      const processed1 = path.join(imagesDir, ".processed", "image1.jpg");
      const processed2 = path.join(imagesDir, ".processed", "image2.jpg");
      const stat1 = await fs.stat(processed1);
      const stat2 = await fs.stat(processed2);
      expect(stat1.isFile()).toBe(true);
      expect(stat2.isFile()).toBe(true);
    });

    it("should process image with blur specification", async () => {
      const imagesDir = path.join(tempDir, "images");
      await fs.mkdir(imagesDir, { recursive: true });

      // Create test image
      await sharp({
        create: {
          width: 500,
          height: 400,
          channels: 3,
          background: { r: 0, g: 0, b: 255 },
        },
      })
        .jpeg()
        .toFile(path.join(imagesDir, "blur-test.jpg"));

      const program = new Command();
      program.addCommand(createImagesCommand());

      await program.parseAsync([
        "node",
        "test",
        "images",
        "process",
        path.join(imagesDir, "blur-test.jpg"),
        "--blur",
        "100,100,50,50",
      ]);

      const output = capturedOutput.join("\n");
      expect(output).toContain("Processed");

      // Check processed file exists
      const processedPath = path.join(imagesDir, ".processed", "blur-test.jpg");
      const stat = await fs.stat(processedPath);
      expect(stat.isFile()).toBe(true);
    });

    it("should skip images without processing instructions", async () => {
      const imagesDir = path.join(tempDir, "images");
      await fs.mkdir(imagesDir, { recursive: true });

      // Create test image without metadata
      await sharp({
        create: {
          width: 500,
          height: 400,
          channels: 3,
          background: { r: 100, g: 100, b: 100 },
        },
      })
        .jpeg()
        .toFile(path.join(imagesDir, "no-meta.jpg"));

      const program = new Command();
      program.addCommand(createImagesCommand());

      await program.parseAsync([
        "node",
        "test",
        "images",
        "process",
        imagesDir,
        "--from-meta",
      ]);

      const output = capturedOutput.join("\n");
      expect(output).toContain("0 processed");
    });
  });
});
