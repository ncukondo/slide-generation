import { Command } from "commander";
import { readFile } from "fs/promises";
import { dirname } from "path";
import chalk from "chalk";
import { stringify as stringifyYaml } from "yaml";
import { Parser } from "../../core/parser";
import {
  ImageValidator,
  ImageStats,
  ImageMetadataLoader,
  type ImageMetadata,
} from "../../images";

/**
 * Create the images command with subcommands
 */
export function createImagesCommand(): Command {
  const cmd = new Command("images").description("Manage presentation images");

  cmd.addCommand(createImagesStatusCommand());
  cmd.addCommand(createImagesRequestCommand());

  return cmd;
}

/**
 * Create the images status subcommand
 */
function createImagesStatusCommand(): Command {
  return new Command("status")
    .description("Show image permission status")
    .argument("<input>", "Presentation YAML file")
    .action(async (input: string) => {
      await executeImagesStatus(input);
    });
}

/**
 * Create the images request subcommand
 */
function createImagesRequestCommand(): Command {
  return new Command("request")
    .description("Generate missing image request list")
    .argument("<input>", "Presentation YAML file")
    .option("--format <format>", "Output format (text|llm)", "text")
    .action(async (input: string, options: { format: string }) => {
      await executeImagesRequest(input, options);
    });
}

/**
 * Execute images status command
 */
async function executeImagesStatus(inputPath: string): Promise<void> {
  try {
    const slides = await loadPresentation(inputPath);
    const baseDir = dirname(inputPath);
    const validator = new ImageValidator(baseDir);

    // Extract image references
    const imageRefs = validator.extractImageReferences(slides);

    if (imageRefs.length === 0) {
      console.log(chalk.yellow("No images found in presentation"));
      return;
    }

    // Get stats
    const stats = await validator.getImageStats(slides);

    // Output formatted status
    await outputImageStatus(stats, imageRefs, validator, baseDir);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(chalk.red(`Error: ${message}`));
    process.exitCode = 1;
  }
}

/**
 * Image info with metadata for status display
 */
interface ImageStatusInfo {
  path: string;
  metadata: ImageMetadata;
}

/**
 * Output image status in a formatted way with per-image details
 */
async function outputImageStatus(
  stats: ImageStats,
  imageRefs: string[],
  _validator: ImageValidator,
  baseDir: string
): Promise<void> {
  const metadataLoader = new ImageMetadataLoader(baseDir);

  // Group images by status
  const approved: ImageStatusInfo[] = [];
  const pending: ImageStatusInfo[] = [];
  const restricted: ImageStatusInfo[] = [];
  const rejected: ImageStatusInfo[] = [];
  const unknown: ImageStatusInfo[] = [];

  for (const imagePath of imageRefs) {
    const metadata = await metadataLoader.load(imagePath);
    const info: ImageStatusInfo = { path: imagePath, metadata };
    const status = metadata.permissions?.status;

    switch (status) {
      case "approved":
        approved.push(info);
        break;
      case "pending":
        pending.push(info);
        break;
      case "restricted":
        restricted.push(info);
        break;
      case "rejected":
        rejected.push(info);
        break;
      default:
        unknown.push(info);
    }
  }

  console.log("");
  console.log(chalk.bold("Image Permissions Status:"));
  console.log("━".repeat(50));

  // Approved images
  if (approved.length > 0) {
    console.log("");
    console.log(chalk.green(`✓ Approved (${approved.length}):`));
    for (const info of approved) {
      const approver = info.metadata.permissions?.approved_by || "unknown";
      const expires = info.metadata.permissions?.expires || "none";
      console.log(chalk.green(`  - ${info.path} (${approver}, expires: ${expires})`));
    }
  }

  // Pending images
  if (pending.length > 0) {
    console.log("");
    console.log(chalk.yellow(`⏳ Pending (${pending.length}):`));
    for (const info of pending) {
      console.log(chalk.yellow(`  - ${info.path}`));
      const contact = info.metadata.permissions?.pending_contact;
      if (contact) {
        console.log(chalk.yellow(`    Contact: ${contact}`));
      }
    }
  }

  // Restricted images
  if (restricted.length > 0) {
    console.log("");
    console.log(chalk.yellow(`⚠ Restricted (${restricted.length}):`));
    for (const info of restricted) {
      console.log(chalk.yellow(`  - ${info.path}`));
      const conditions = info.metadata.permissions?.conditions;
      if (conditions && conditions.length > 0) {
        console.log(chalk.yellow(`    Conditions: ${conditions.join(", ")}`));
      }
    }
  }

  // Rejected images
  if (rejected.length > 0) {
    console.log("");
    console.log(chalk.red(`✗ Rejected (${rejected.length}):`));
    for (const info of rejected) {
      console.log(chalk.red(`  - ${info.path}`));
    }
  }

  // Unknown images
  if (unknown.length > 0) {
    console.log("");
    console.log(chalk.gray(`? Unknown (${unknown.length}):`));
    for (const info of unknown) {
      console.log(chalk.gray(`  - ${info.path}`));
    }
  }

  console.log("");
  console.log("━".repeat(50));
  console.log(
    `Summary: ${stats.approved} approved, ${stats.pending} pending, ${stats.restricted} restricted, ${stats.rejected} rejected`
  );
}

/**
 * Execute images request command
 */
async function executeImagesRequest(
  inputPath: string,
  options: { format: string }
): Promise<void> {
  try {
    const slides = await loadPresentation(inputPath);
    const baseDir = dirname(inputPath);
    const validator = new ImageValidator(baseDir);

    // Get missing images
    const missingImages = await validator.getMissingImages(slides);

    if (missingImages.length === 0) {
      console.log(chalk.green("No missing images found!"));
      return;
    }

    if (options.format === "llm") {
      outputMissingImagesLLM(missingImages, slides);
    } else {
      outputMissingImagesText(missingImages);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(chalk.red(`Error: ${message}`));
    process.exitCode = 1;
  }
}

/**
 * Output missing images in text format
 */
function outputMissingImagesText(missingImages: string[]): void {
  console.log("");
  console.log(chalk.bold("Missing Images:"));
  console.log("━".repeat(50));
  console.log("");

  for (const imagePath of missingImages) {
    console.log(chalk.red(`  ✗ ${imagePath}`));
  }

  console.log("");
  console.log(`Total: ${missingImages.length} missing image(s)`);
  console.log("");
  console.log(
    chalk.gray("Run 'slide-gen images request --format llm' for AI-friendly output")
  );
}

/**
 * Output missing images in LLM-friendly YAML format
 */
function outputMissingImagesLLM(
  missingImages: string[],
  slides: SlideContent[]
): void {
  // Build context for each missing image
  const imageContextMap = buildImageContext(slides);

  const output = {
    missing_images: missingImages.map((imagePath) => ({
      path: imagePath,
      slide: findSlideWithImage(slides, imagePath),
      template: findTemplateForImage(slides, imagePath),
      context: imageContextMap.get(imagePath) || {},
    })),
  };

  console.log(stringifyYaml(output));
}

/**
 * Slide content type
 */
interface SlideContent {
  template: string;
  content: Record<string, unknown>;
}

/**
 * Load and parse presentation file
 */
async function loadPresentation(inputPath: string): Promise<SlideContent[]> {
  const content = await readFile(inputPath, "utf-8");
  const parser = new Parser();
  const presentation = parser.parse(content);

  return presentation.slides.map((slide) => ({
    template: slide.template,
    content: slide.content as Record<string, unknown>,
  }));
}

/**
 * Build context map for images
 */
function buildImageContext(
  slides: SlideContent[]
): Map<string, Record<string, unknown>> {
  const contextMap = new Map<string, Record<string, unknown>>();

  for (let i = 0; i < slides.length; i++) {
    const slide = slides[i]!;
    const content = slide.content;

    // Get title from content
    const title = content["title"] as string | undefined;

    // Direct image
    const image = content["image"];
    if (typeof image === "string") {
      contextMap.set(image, {
        title: title || `Slide ${i + 1}`,
        usage: getImageUsageDescription(slide.template),
      });
    }

    // Before/after
    const before = content["before"] as Record<string, unknown> | undefined;
    const after = content["after"] as Record<string, unknown> | undefined;
    if (before?.["image"]) {
      contextMap.set(before["image"] as string, {
        title: title || `Slide ${i + 1}`,
        usage: "Before image in comparison",
      });
    }
    if (after?.["image"]) {
      contextMap.set(after["image"] as string, {
        title: title || `Slide ${i + 1}`,
        usage: "After image in comparison",
      });
    }

    // Gallery images
    const images = content["images"] as Array<{ src: string }> | undefined;
    if (Array.isArray(images)) {
      for (const img of images) {
        if (img.src) {
          contextMap.set(img.src, {
            title: title || `Slide ${i + 1}`,
            usage: "Gallery image",
          });
        }
      }
    }
  }

  return contextMap;
}

/**
 * Get usage description for image template
 */
function getImageUsageDescription(template: string): string {
  switch (template) {
    case "image-full":
      return "Fullscreen background image";
    case "image-text":
      return "Image alongside text content";
    case "image-caption":
      return "Image with detailed caption";
    case "gallery":
      return "Gallery grid image";
    case "before-after":
      return "Comparison image";
    default:
      return "Image in slide";
  }
}

/**
 * Find slide number containing an image
 */
function findSlideWithImage(slides: SlideContent[], imagePath: string): number {
  for (let i = 0; i < slides.length; i++) {
    const content = slides[i]!.content;

    if (content["image"] === imagePath) return i + 1;

    const before = content["before"] as Record<string, unknown> | undefined;
    const after = content["after"] as Record<string, unknown> | undefined;
    if (before?.["image"] === imagePath || after?.["image"] === imagePath) {
      return i + 1;
    }

    const images = content["images"] as Array<{ src: string }> | undefined;
    if (images?.some((img) => img.src === imagePath)) {
      return i + 1;
    }
  }
  return 0;
}

/**
 * Find template for an image
 */
function findTemplateForImage(
  slides: SlideContent[],
  imagePath: string
): string {
  for (const slide of slides) {
    const content = slide.content;

    if (content["image"] === imagePath) return slide.template;

    const before = content["before"] as Record<string, unknown> | undefined;
    const after = content["after"] as Record<string, unknown> | undefined;
    if (before?.["image"] === imagePath || after?.["image"] === imagePath) {
      return slide.template;
    }

    const images = content["images"] as Array<{ src: string }> | undefined;
    if (images?.some((img) => img.src === imagePath)) {
      return slide.template;
    }
  }
  return "unknown";
}
