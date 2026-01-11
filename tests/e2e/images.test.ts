import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";
import { Command } from "commander";
import { createConvertCommand } from "../../src/cli/commands/convert";
import { createImagesCommand } from "../../src/cli/commands/images";

describe("E2E: Image Management", () => {
  let tempDir: string;
  let originalLog: typeof console.log;
  let originalError: typeof console.error;
  let capturedOutput: string[];

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "e2e-images-test-"));
    capturedOutput = [];

    originalLog = console.log;
    originalError = console.error;
    console.log = (...args: unknown[]) => {
      capturedOutput.push(args.join(" "));
    };
    console.error = (...args: unknown[]) => {
      capturedOutput.push(args.join(" "));
    };

    process.exitCode = undefined;

    // Create test directories
    await fs.mkdir(path.join(tempDir, "images"), { recursive: true });
    await fs.mkdir(path.join(tempDir, "templates", "layouts"), {
      recursive: true,
    });
    await fs.mkdir(path.join(tempDir, "icons"), { recursive: true });

    // Create minimal templates for testing
    const imageFullTemplate = `
name: image-full
description: Fullscreen image
category: layouts
schema:
  type: object
  required:
    - image
  properties:
    image:
      type: string
    title:
      type: string
output: |
  <!-- _class: image-full-slide -->
  <div class="image-full" style="background-image: url('{{ content.image }}');">
    {%- if content.title %}
    <h1>{{ content.title }}</h1>
    {%- endif %}
  </div>
`;
    await fs.writeFile(
      path.join(tempDir, "templates", "layouts", "image-full.yaml"),
      imageFullTemplate
    );

    const imageTextTemplate = `
name: image-text
description: Image with text
category: layouts
schema:
  type: object
  required:
    - title
    - image
    - text
  properties:
    title:
      type: string
    image:
      type: string
    text:
      oneOf:
        - type: string
        - type: array
output: |
  # {{ content.title }}
  <div class="image-text">
    <img src="{{ content.image }}">
    <div class="text">{{ content.text }}</div>
  </div>
`;
    await fs.writeFile(
      path.join(tempDir, "templates", "layouts", "image-text.yaml"),
      imageTextTemplate
    );

    // Create icon registry
    await fs.writeFile(
      path.join(tempDir, "icons", "registry.yaml"),
      "sources: []\naliases: {}"
    );

    // Create config file
    const config = `
templates:
  builtin: "${path.join(tempDir, "templates").replace(/\\/g, "/")}"
icons:
  registry: "${path.join(tempDir, "icons", "registry.yaml").replace(/\\/g, "/")}"
references:
  enabled: false
`;
    await fs.writeFile(path.join(tempDir, "config.yaml"), config);
  });

  afterEach(async () => {
    console.log = originalLog;
    console.error = originalError;
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe("Image status report", () => {
    it("should generate image status report", async () => {
      // Create images with metadata
      await fs.writeFile(path.join(tempDir, "images/approved.jpg"), "dummy");
      await fs.writeFile(
        path.join(tempDir, "images/approved.jpg.meta.yaml"),
        `description: Approved image
permissions:
  status: approved
  approved_by: Manager`
      );

      await fs.writeFile(path.join(tempDir, "images/pending.jpg"), "dummy");
      await fs.writeFile(
        path.join(tempDir, "images/pending.jpg.meta.yaml"),
        `description: Pending image
permissions:
  status: pending
  pending_contact: Checking with client`
      );

      // Create presentation
      const presentation = `
meta:
  title: "Image Status Test"
slides:
  - template: image-full
    content:
      image: images/approved.jpg
      title: "Approved"
  - template: image-full
    content:
      image: images/pending.jpg
      title: "Pending"
`;
      const presentationPath = path.join(tempDir, "presentation.yaml");
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
  });

  describe("Image request generation", () => {
    it("should generate missing image request list in LLM format", async () => {
      // Create presentation with missing images
      const presentation = `
meta:
  title: "Missing Images Test"
slides:
  - template: image-full
    content:
      image: images/missing-hero.jpg
      title: "Hero Section"
  - template: image-text
    content:
      title: "Product Feature"
      image: images/missing-product.jpg
      text: "Feature description"
`;
      const presentationPath = path.join(tempDir, "missing-images.yaml");
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
      expect(output).toContain("path: images/missing-hero.jpg");
      expect(output).toContain("path: images/missing-product.jpg");
      expect(output).toContain("template: image-full");
      expect(output).toContain("template: image-text");
    });
  });

  describe("Image template rendering", () => {
    it("should render image-full template correctly", async () => {
      // Create test image
      await fs.writeFile(path.join(tempDir, "images/hero.jpg"), "dummy");

      // Create presentation
      const presentation = `
meta:
  title: "Image Full Test"
slides:
  - template: image-full
    content:
      image: images/hero.jpg
      title: "Hero Image"
`;
      const presentationPath = path.join(tempDir, "image-full-test.yaml");
      await fs.writeFile(presentationPath, presentation);

      const configPath = path.join(tempDir, "config.yaml");
      const outputPath = path.join(tempDir, "output.md");

      const program = new Command();
      program.addCommand(createConvertCommand());

      await program.parseAsync([
        "node",
        "test",
        "convert",
        presentationPath,
        "-o",
        outputPath,
        "-c",
        configPath,
      ]);

      // Check output exists and contains expected content
      const output = await fs.readFile(outputPath, "utf-8");
      expect(output).toContain("images/hero.jpg");
      expect(output).toContain("Hero Image");
      expect(output).toContain("image-full-slide");
    });

    it("should render image-text template correctly", async () => {
      // Create test image
      await fs.writeFile(path.join(tempDir, "images/product.jpg"), "dummy");

      // Create presentation
      const presentation = `
meta:
  title: "Image Text Test"
slides:
  - template: image-text
    content:
      title: "Product Features"
      image: images/product.jpg
      text: "Amazing product"
`;
      const presentationPath = path.join(tempDir, "image-text-test.yaml");
      await fs.writeFile(presentationPath, presentation);

      const configPath = path.join(tempDir, "config.yaml");
      const outputPath = path.join(tempDir, "output-text.md");

      const program = new Command();
      program.addCommand(createConvertCommand());

      await program.parseAsync([
        "node",
        "test",
        "convert",
        presentationPath,
        "-o",
        outputPath,
        "-c",
        configPath,
      ]);

      // Check output exists and contains expected content
      const output = await fs.readFile(outputPath, "utf-8");
      expect(output).toContain("images/product.jpg");
      expect(output).toContain("Product Features");
      expect(output).toContain("Amazing product");
    });
  });

  describe("Metadata loading", () => {
    it("should correctly load and apply image metadata", async () => {
      // Create image with detailed metadata
      await fs.writeFile(path.join(tempDir, "images/detailed.jpg"), "dummy");
      await fs.writeFile(
        path.join(tempDir, "images/detailed.jpg.meta.yaml"),
        `description: Detailed image with full metadata
captured_date: "2024-12-15"
captured_by: Photographer
location: Tokyo, Japan
permissions:
  status: approved
  approved_by: Manager
  approved_date: "2025-01-01"
  conditions:
    - Internal use only
tags:
  - product
  - marketing`
      );

      // Create presentation
      const presentation = `
meta:
  title: "Metadata Test"
slides:
  - template: image-full
    content:
      image: images/detailed.jpg
`;
      const presentationPath = path.join(tempDir, "metadata-test.yaml");
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
      // Should show approved status from metadata
      expect(output).toContain("Approved");
    });

    it("should apply directory defaults from images.yaml", async () => {
      // Create directory with images.yaml
      await fs.writeFile(path.join(tempDir, "images/photo1.jpg"), "dummy");
      await fs.writeFile(path.join(tempDir, "images/photo2.jpg"), "dummy");
      await fs.writeFile(
        path.join(tempDir, "images/images.yaml"),
        `_defaults:
  permissions:
    status: approved
    approved_by: Team

photo1.jpg:
  description: Photo 1

photo2.jpg:
  description: Photo 2
  permissions:
    status: pending`
      );

      // Create presentation
      const presentation = `
meta:
  title: "Directory Defaults Test"
slides:
  - template: image-full
    content:
      image: images/photo1.jpg
  - template: image-full
    content:
      image: images/photo2.jpg
`;
      const presentationPath = path.join(tempDir, "dir-defaults-test.yaml");
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
      // Should show 1 approved (photo1 with defaults) and 1 pending (photo2 override)
      expect(output).toContain("Approved");
      expect(output).toContain("Pending");
    });
  });
});
