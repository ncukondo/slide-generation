import { Command } from "commander";
import { readFile, stat, mkdir } from "fs/promises";
import { dirname, basename, join } from "path";
import chalk from "chalk";
import { stringify as stringifyYaml } from "yaml";
import { Parser } from "../../core/parser";
import {
  ImageValidator,
  ImageStats,
  ImageMetadataLoader,
  ImageProcessor,
  ImageProcessingPipeline,
  type ImageMetadata,
} from "../../images";
import { isImageFile } from "../../images/constants";

/**
 * Create the images command with subcommands
 */
export function createImagesCommand(): Command {
  const cmd = new Command("images").description("Manage presentation images");

  cmd.addCommand(createImagesStatusCommand());
  cmd.addCommand(createImagesRequestCommand());
  cmd.addCommand(createImagesProcessCommand());

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

/**
 * Create the images process subcommand
 */
function createImagesProcessCommand(): Command {
  return new Command("process")
    .description("Process images (crop, blur)")
    .argument("<path>", "Image file or directory")
    .option("--crop <spec>", 'Crop specification (e.g., "right:10,bottom:5")')
    .option("--blur <spec>", 'Blur region (e.g., "100,100,50,50")')
    .option("--from-meta", "Apply processing from metadata files")
    .option("--output <dir>", "Output directory", ".processed")
    .action(async (inputPath: string, options: ProcessOptions) => {
      await executeImagesProcess(inputPath, options);
    });
}

/**
 * Options for images process command
 */
interface ProcessOptions {
  crop?: string;
  blur?: string;
  fromMeta?: boolean;
  output: string;
}

/**
 * Execute images process command
 */
async function executeImagesProcess(
  inputPath: string,
  options: ProcessOptions
): Promise<void> {
  try {
    const pathStat = await stat(inputPath);
    const isDirectory = pathStat.isDirectory();

    if (isDirectory) {
      // Process directory
      await processDirectory(inputPath, options);
    } else {
      // Process single file
      await processSingleFile(inputPath, options);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(chalk.red(`Error: ${message}`));
    process.exitCode = 1;
  }
}

/**
 * Process all images in a directory
 */
async function processDirectory(
  dirPath: string,
  options: ProcessOptions
): Promise<void> {
  if (options.fromMeta) {
    // Use metadata-based processing
    const outputDir = join(dirPath, options.output);
    const pipeline = new ImageProcessingPipeline(dirPath, { outputDir });
    const result = await pipeline.processDirectory();

    console.log("");
    console.log(chalk.bold("Image Processing Results:"));
    console.log("━".repeat(50));
    console.log(`Total images: ${result.totalImages}`);
    console.log(chalk.green(`Processed: ${result.processedImages}`));
    console.log(chalk.gray(`Skipped: ${result.skippedImages} (no processing instructions)`));

    if (result.errors.length > 0) {
      console.log(chalk.red(`Errors: ${result.errors.length}`));
      for (const err of result.errors) {
        console.log(chalk.red(`  - ${err}`));
      }
    }

    console.log("");
    console.log(`${result.processedImages} processed, ${result.skippedImages} skipped`);
  } else {
    console.log(
      chalk.yellow(
        "Warning: Processing directory requires --from-meta flag to apply metadata instructions"
      )
    );
    console.log(
      chalk.gray("Use --crop or --blur options with a single file, or use --from-meta for directory")
    );
  }
}

/**
 * Process a single image file
 */
async function processSingleFile(
  filePath: string,
  options: ProcessOptions
): Promise<void> {
  if (!isImageFile(filePath)) {
    console.error(chalk.red(`Error: ${filePath} is not a supported image file`));
    process.exitCode = 1;
    return;
  }

  const processor = new ImageProcessor();
  const dir = dirname(filePath);
  const filename = basename(filePath);
  const outputDir = join(dir, options.output);

  // Ensure output directory exists
  await mkdir(outputDir, { recursive: true });

  const outputPath = join(outputDir, filename);
  let success = false;

  if (options.crop) {
    // Parse crop specification
    const edges = parseCropSpec(options.crop);
    if (!edges) {
      console.error(chalk.red("Invalid crop specification. Use format: right:10,bottom:5"));
      process.exitCode = 1;
      return;
    }

    const result = await processor.cropEdges(filePath, edges, outputPath);
    if (!result.success) {
      console.error(chalk.red(`Crop failed: ${result.error}`));
      process.exitCode = 1;
      return;
    }
    success = true;
    console.log(chalk.green(`Processed: ${filename} (cropped to ${result.width}x${result.height})`));
  }

  if (options.blur) {
    // Parse blur specification
    const region = parseBlurSpec(options.blur);
    if (!region) {
      console.error(chalk.red("Invalid blur specification. Use format: x,y,width,height"));
      process.exitCode = 1;
      return;
    }

    const inputForBlur = success ? outputPath : filePath;
    const result = await processor.blurRegion(inputForBlur, region, outputPath);
    if (!result.success) {
      console.error(chalk.red(`Blur failed: ${result.error}`));
      process.exitCode = 1;
      return;
    }
    success = true;
    console.log(chalk.green(`Processed: ${filename} (blurred region)`));
  }

  if (options.fromMeta) {
    // Process from metadata
    const metadataLoader = new ImageMetadataLoader(dir);
    const metadata = await metadataLoader.load(filename);

    if (!metadata.processing || metadata.processing.length === 0) {
      console.log(chalk.yellow(`No processing instructions found for ${filename}`));
      return;
    }

    const pipeline = new ImageProcessingPipeline(dir, { outputDir });
    const result = await pipeline.processImage(filename);

    if (!result.success) {
      console.error(chalk.red(`Processing failed: ${result.error}`));
      process.exitCode = 1;
      return;
    }

    success = true;
    console.log(
      chalk.green(`Processed: ${filename} (${result.instructionsApplied} instruction(s))`)
    );
  }

  if (!success && !options.crop && !options.blur && !options.fromMeta) {
    console.log(
      chalk.yellow("No processing options specified. Use --crop, --blur, or --from-meta")
    );
  }

  if (success) {
    console.log(`Output: ${chalk.cyan(outputPath)}`);
  }
}

/**
 * Parse crop specification string (e.g., "right:10,bottom:5")
 */
function parseCropSpec(spec: string): { left?: number; right?: number; top?: number; bottom?: number } | null {
  const result: { left?: number; right?: number; top?: number; bottom?: number } = {};
  const parts = spec.split(",");

  for (const part of parts) {
    const [key, value] = part.split(":");
    if (!key || !value) return null;

    const numValue = parseInt(value, 10);
    if (isNaN(numValue) || numValue < 0 || numValue > 50) return null;

    const edge = key.trim().toLowerCase();
    if (edge === "left") result.left = numValue;
    else if (edge === "right") result.right = numValue;
    else if (edge === "top") result.top = numValue;
    else if (edge === "bottom") result.bottom = numValue;
    else return null;
  }

  return Object.keys(result).length > 0 ? result : null;
}

/**
 * Parse blur specification string (e.g., "100,100,50,50")
 */
function parseBlurSpec(spec: string): { x: number; y: number; width: number; height: number } | null {
  const parts = spec.split(",").map((p) => parseInt(p.trim(), 10));

  if (parts.length !== 4 || parts.some(isNaN)) {
    return null;
  }

  const [x, y, width, height] = parts as [number, number, number, number];
  if (x < 0 || y < 0 || width <= 0 || height <= 0) {
    return null;
  }

  return { x, y, width, height };
}
