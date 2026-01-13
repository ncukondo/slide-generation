import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  writeFileSync,
  mkdirSync,
  rmSync,
  readFileSync,
  existsSync,
} from "fs";
import { join, resolve } from "path";
import { createConvertCommand } from "../../src/cli/commands/convert";
import { Command } from "commander";

describe("E2E: Template CSS integration", () => {
  const testDir = "./test-e2e-template-css";
  const fixturesDir = resolve(__dirname, "../fixtures").replace(/\\/g, "/");
  const templatesDir = join(fixturesDir, "templates").replace(/\\/g, "/");
  const iconsRegistryPath = resolve(__dirname, "../../icons/registry.yaml").replace(/\\/g, "/");

  beforeEach(() => {
    mkdirSync(testDir, { recursive: true });

    const configContent = `
templates:
  builtin: "${templatesDir}"

icons:
  registry: "${iconsRegistryPath}"

references:
  enabled: false
`;
    writeFileSync(join(testDir, "config.yaml"), configContent);
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it("should include template CSS in output when using cycle-diagram", async () => {
    const presentation = `
meta:
  title: Cycle Test
  theme: default

slides:
  - template: cycle-diagram
    content:
      title: "PDCA Cycle"
      nodes:
        - { label: "Plan", color: "#4CAF50" }
        - { label: "Do", color: "#2196F3" }
        - { label: "Check", color: "#FF9800" }
        - { label: "Act", color: "#9C27B0" }
`;
    const inputPath = join(testDir, "cycle-test.yaml");
    writeFileSync(inputPath, presentation);

    const outputPath = join(testDir, "cycle-test.md");
    const configPath = join(testDir, "config.yaml");

    const program = new Command();
    program.addCommand(createConvertCommand());

    await program.parseAsync([
      "node",
      "test",
      "convert",
      inputPath,
      "-o",
      outputPath,
      "-c",
      configPath,
    ]);

    expect(existsSync(outputPath)).toBe(true);
    const output = readFileSync(outputPath, "utf-8");

    // Should have style section in front matter
    expect(output).toContain("style: |");
    // Should contain cycle-diagram CSS
    expect(output).toContain(".cycle-container");
    expect(output).toContain(".cycle-node");
  });

  it("should include template CSS in output when using matrix", async () => {
    const presentation = `
meta:
  title: Matrix Test
  theme: default

slides:
  - template: matrix
    content:
      title: "2x2 Matrix"
      xAxis:
        label: Impact
        high: High
        low: Low
      yAxis:
        label: Effort
        high: High
        low: Low
      quadrants:
        - { label: "Do First" }
        - { label: "Schedule" }
        - { label: "Delegate" }
        - { label: "Eliminate" }
`;
    const inputPath = join(testDir, "matrix-test.yaml");
    writeFileSync(inputPath, presentation);

    const outputPath = join(testDir, "matrix-test.md");
    const configPath = join(testDir, "config.yaml");

    const program = new Command();
    program.addCommand(createConvertCommand());

    await program.parseAsync([
      "node",
      "test",
      "convert",
      inputPath,
      "-o",
      outputPath,
      "-c",
      configPath,
    ]);

    expect(existsSync(outputPath)).toBe(true);
    const output = readFileSync(outputPath, "utf-8");

    // Should have style section in front matter
    expect(output).toContain("style: |");
    // Should contain matrix CSS
    expect(output).toContain(".matrix-container");
  });

  it("should include CSS from multiple templates", async () => {
    const presentation = `
meta:
  title: Multi Template Test
  theme: default

slides:
  - template: cycle-diagram
    content:
      title: "PDCA"
      nodes:
        - { label: "Plan" }
        - { label: "Do" }
        - { label: "Check" }
  - template: two-column
    content:
      title: "Two Columns"
      left: "Left side content"
      right: "Right side content"
`;
    const inputPath = join(testDir, "multi-template-test.yaml");
    writeFileSync(inputPath, presentation);

    const outputPath = join(testDir, "multi-template-test.md");
    const configPath = join(testDir, "config.yaml");

    const program = new Command();
    program.addCommand(createConvertCommand());

    await program.parseAsync([
      "node",
      "test",
      "convert",
      inputPath,
      "-o",
      outputPath,
      "-c",
      configPath,
    ]);

    expect(existsSync(outputPath)).toBe(true);
    const output = readFileSync(outputPath, "utf-8");

    // Should have style section in front matter
    expect(output).toContain("style: |");
    // Should contain CSS from both templates
    expect(output).toContain(".cycle-container");
    expect(output).toContain(".two-column");
  });

  it("should not include style section when no templates have CSS", async () => {
    const presentation = `
meta:
  title: No CSS Test
  theme: default

slides:
  - template: title
    content:
      title: "Title Slide"
      subtitle: "No CSS needed"
`;
    const inputPath = join(testDir, "no-css-test.yaml");
    writeFileSync(inputPath, presentation);

    const outputPath = join(testDir, "no-css-test.md");
    const configPath = join(testDir, "config.yaml");

    const program = new Command();
    program.addCommand(createConvertCommand());

    await program.parseAsync([
      "node",
      "test",
      "convert",
      inputPath,
      "-o",
      outputPath,
      "-c",
      configPath,
    ]);

    expect(existsSync(outputPath)).toBe(true);
    const output = readFileSync(outputPath, "utf-8");

    // Title template doesn't have CSS
    expect(output).not.toContain(".cycle-container");
    expect(output).not.toContain(".matrix-container");
  });

  it("should deduplicate CSS when same template is used multiple times", async () => {
    const presentation = `
meta:
  title: Duplicate Test
  theme: default

slides:
  - template: cycle-diagram
    content:
      title: "Cycle 1"
      nodes:
        - { label: "A" }
        - { label: "B" }
        - { label: "C" }
  - template: cycle-diagram
    content:
      title: "Cycle 2"
      nodes:
        - { label: "X" }
        - { label: "Y" }
        - { label: "Z" }
`;
    const inputPath = join(testDir, "duplicate-test.yaml");
    writeFileSync(inputPath, presentation);

    const outputPath = join(testDir, "duplicate-test.md");
    const configPath = join(testDir, "config.yaml");

    const program = new Command();
    program.addCommand(createConvertCommand());

    await program.parseAsync([
      "node",
      "test",
      "convert",
      inputPath,
      "-o",
      outputPath,
      "-c",
      configPath,
    ]);

    expect(existsSync(outputPath)).toBe(true);
    const output = readFileSync(outputPath, "utf-8");

    // CSS should only appear once, not twice
    const cycleContainerCount = (output.match(/\.cycle-container/g) || [])
      .length;
    expect(cycleContainerCount).toBe(1);
  });
});
