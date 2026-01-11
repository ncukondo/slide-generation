import { Command } from "commander";
import { readFile } from "fs/promises";
import { dirname } from "path";
import chalk from "chalk";
import { stringify as stringifyYaml } from "yaml";
import { Parser } from "../../core/parser";
import { ImageValidator, ImageStats } from "../../images";

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
    outputImageStatus(stats, imageRefs, validator, baseDir);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(chalk.red(`Error: ${message}`));
    process.exitCode = 1;
  }
}

/**
 * Output image status in a formatted way
 */
async function outputImageStatus(
  stats: ImageStats,
  _imageRefs: string[],
  _validator: ImageValidator,
  _baseDir: string
): Promise<void> {
  console.log("");
  console.log(chalk.bold("Image Permissions Status:"));
  console.log("━".repeat(50));
  console.log("");

  if (stats.approved > 0) {
    console.log(
      chalk.green(`✓ Approved (${stats.approved})`)
    );
  }

  if (stats.pending > 0) {
    console.log(
      chalk.yellow(`⏳ Pending (${stats.pending})`)
    );
  }

  if (stats.restricted > 0) {
    console.log(
      chalk.yellow(`⚠ Restricted (${stats.restricted})`)
    );
  }

  if (stats.rejected > 0) {
    console.log(
      chalk.red(`✗ Rejected (${stats.rejected})`)
    );
  }

  if (stats.unknown > 0) {
    console.log(
      chalk.gray(`? Unknown (${stats.unknown})`)
    );
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
