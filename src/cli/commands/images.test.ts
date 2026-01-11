import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createImagesCommand } from "./images";
import { Command } from "commander";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";

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
});
