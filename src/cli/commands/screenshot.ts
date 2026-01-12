import { Command } from 'commander';
import { access, mkdir, readdir, unlink } from 'fs/promises';
import { basename, dirname, join } from 'path';
import chalk from 'chalk';
import ora from 'ora';
import sharp from 'sharp';
import { Pipeline, PipelineError } from '../../core/pipeline';
import { ConfigLoader } from '../../config/loader';
import { ExitCode } from './convert';
import { runMarp, isMarpAvailable } from '../utils/marp-runner';

export interface ScreenshotOptions {
  output?: string;
  slide?: number;
  width?: number;
  format?: 'png' | 'jpeg' | 'ai';
  config?: string;
  verbose?: boolean;
  contactSheet?: boolean;
  columns?: number;
  quality?: number;
}

export interface ScreenshotResult {
  success: boolean;
  errors: string[];
  outputDir?: string;
  files?: string[];
}

export interface FilterResult {
  success: boolean;
  keptFile?: string;
  error?: string;
}

/**
 * Filter generated images to keep only a specific slide
 * Marp generates files like: basename.001.png, basename.002.png, etc.
 */
export async function filterToSpecificSlide(
  outputDir: string,
  baseName: string,
  slideNumber: number,
  format: string
): Promise<FilterResult> {
  const slideStr = slideNumber.toString().padStart(3, '0');
  const targetFileName = `${baseName}.${slideStr}.${format}`;
  const targetPath = join(outputDir, targetFileName);

  // Check if the target slide exists
  try {
    await access(targetPath);
  } catch {
    return {
      success: false,
      error: `Slide ${slideNumber} not found (expected: ${targetFileName})`,
    };
  }

  // Get all slide files and remove all except the target
  const files = await readdir(outputDir);
  const slideFiles = files.filter(
    (f) => f.startsWith(baseName) && f.endsWith(`.${format}`)
  );

  for (const file of slideFiles) {
    if (file !== targetFileName) {
      await unlink(join(outputDir, file));
    }
  }

  return {
    success: true,
    keptFile: targetFileName,
  };
}

/**
 * Check if marp-cli is available in the system (globally or locally)
 * Uses the centralized marp-runner utility
 */
export function checkMarpCliAvailable(projectDir?: string): boolean {
  return isMarpAvailable(projectDir);
}

/**
 * Estimate Claude API token consumption for an image
 * Formula: (width * height) / 750
 */
export function estimateTokens(width: number, height: number): number {
  return Math.ceil((width * height) / 750);
}

/**
 * Estimate total tokens for multiple images
 */
export function estimateTotalTokens(
  width: number,
  height: number,
  count: number
): number {
  return estimateTokens(width, height) * count;
}

/**
 * Calculate grid dimensions for contact sheet
 */
export function calculateGridDimensions(
  slideCount: number,
  columns: number
): { rows: number; columns: number } {
  const rows = Math.ceil(slideCount / columns);
  return { rows, columns };
}

export interface AiOutputOptions {
  files: string[];
  width: number;
  height: number;
  outputDir: string;
}

export interface ContactSheetOptions {
  outputPath: string;
  columns: number;
  slideWidth?: number;
  slideHeight?: number;
  padding?: number;
  showNumbers?: boolean;
}

export interface ContactSheetResult {
  success: boolean;
  outputPath?: string;
  error?: string;
}

export interface SlideImage {
  path: string;
  index: number;
}

/**
 * Create slide number overlay as SVG
 */
function createNumberOverlay(number: number, width: number): Buffer {
  const svg = `
    <svg width="${width}" height="30">
      <rect width="${width}" height="30" fill="rgba(0,0,0,0.6)"/>
      <text x="10" y="22" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" font-size="16" fill="white">
        Slide ${number}
      </text>
    </svg>
  `;
  return Buffer.from(svg);
}

/**
 * Generate contact sheet from slide images
 */
export async function generateContactSheet(
  slides: SlideImage[],
  options: ContactSheetOptions
): Promise<ContactSheetResult> {
  const {
    columns,
    padding = 10,
    showNumbers = true,
    slideWidth = 640,
    slideHeight = 360,
  } = options;

  if (slides.length === 0) {
    return { success: false, error: 'No slides provided' };
  }

  try {
    const { rows } = calculateGridDimensions(slides.length, columns);

    const canvasWidth = columns * slideWidth + (columns + 1) * padding;
    const canvasHeight = rows * slideHeight + (rows + 1) * padding;

    // Create composites array for all slide images
    const composites: sharp.OverlayOptions[] = [];

    for (let i = 0; i < slides.length; i++) {
      const slide = slides[i]!;
      const col = i % columns;
      const row = Math.floor(i / columns);

      const x = padding + col * (slideWidth + padding);
      const y = padding + row * (slideHeight + padding);

      // Resize slide image
      const resized = await sharp(slide.path)
        .resize(slideWidth, slideHeight, { fit: 'contain', background: { r: 255, g: 255, b: 255 } })
        .toBuffer();

      composites.push({
        input: resized,
        left: x,
        top: y,
      });

      // Add slide number overlay if requested
      if (showNumbers) {
        const numberOverlay = createNumberOverlay(slide.index, slideWidth);
        composites.push({
          input: numberOverlay,
          left: x,
          top: y + slideHeight - 30,
        });
      }
    }

    // Create final image
    await sharp({
      create: {
        width: canvasWidth,
        height: canvasHeight,
        channels: 4,
        background: { r: 245, g: 245, b: 245, alpha: 1 },
      },
    })
      .composite(composites)
      .png()
      .toFile(options.outputPath);

    return {
      success: true,
      outputPath: options.outputPath,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Format output message for AI consumption
 */
export function formatAiOutput(options: AiOutputOptions): string {
  const { files, width, height, outputDir } = options;
  const tokensPerImage = estimateTokens(width, height);
  const totalTokens = tokensPerImage * files.length;
  const imageLabel = files.length === 1 ? 'image' : 'images';

  const lines: string[] = [
    'Screenshots saved (AI-optimized):',
    '',
  ];

  for (const file of files) {
    lines.push(`  ${join(outputDir, file)}`);
  }

  lines.push('');
  lines.push(`Estimated tokens: ~${totalTokens} (${files.length} ${imageLabel})`);

  if (files.length > 0) {
    lines.push('');
    lines.push('To review in Claude Code:');
    lines.push(`  Read ${join(outputDir, files[0]!)}`);
  }

  return lines.join('\n');
}

/**
 * Build marp-cli command arguments for taking screenshots
 * Returns an array of arguments (without the 'marp' command itself)
 */
export function buildMarpCommandArgs(
  markdownPath: string,
  outputDir: string,
  options: ScreenshotOptions
): string[] {
  // AI format uses optimized settings
  const isAiFormat = options.format === 'ai';
  const imageFormat = isAiFormat ? 'jpeg' : (options.format || 'png');
  const width = isAiFormat ? 640 : (options.width || 1280);

  const args = ['--images', imageFormat];

  // Calculate image scale if width is different from default
  if (width !== 1280) {
    const scale = width / 1280;
    args.push('--image-scale', String(scale));
  }

  // JPEG quality (Marp CLI uses --jpeg-quality)
  if (imageFormat === 'jpeg') {
    const quality = options.quality || 80;
    args.push('--jpeg-quality', String(quality));
  }

  args.push('-o', outputDir);
  args.push(markdownPath);

  return args;
}

/**
 * Create the screenshot command
 */
export function createScreenshotCommand(): Command {
  return new Command('screenshot')
    .description('Take screenshots of slides (requires Marp CLI)')
    .argument('<input>', 'Source YAML file')
    .option('-o, --output <path>', 'Output directory', './screenshots')
    .option('-s, --slide <number>', 'Specific slide number (1-based)', parseInt)
    .option('-w, --width <pixels>', 'Image width', parseInt, 1280)
    .option('-f, --format <fmt>', 'Output format (png/jpeg/ai)', 'png')
    .option('-q, --quality <num>', 'JPEG quality (1-100)', parseInt, 80)
    .option('--contact-sheet', 'Generate contact sheet')
    .option('--columns <num>', 'Contact sheet columns', parseInt, 2)
    .option('-c, --config <path>', 'Config file path')
    .option('-v, --verbose', 'Verbose output')
    .action(async (input: string, options: ScreenshotOptions) => {
      await executeScreenshot(input, options);
    });
}

/**
 * Execute the screenshot command
 */
export async function executeScreenshot(
  inputPath: string,
  options: ScreenshotOptions
): Promise<ScreenshotResult> {
  const errors: string[] = [];
  const spinner = options.verbose ? null : ora();
  const outputDir = options.output || './screenshots';

  // Validate input file exists
  try {
    await access(inputPath);
  } catch {
    const message = `File not found: ${inputPath}`;
    console.error(chalk.red(`Error: ${message}`));
    errors.push(message);
    process.exitCode = ExitCode.FileReadError;
    return { success: false, errors };
  }

  // Validate input file extension
  if (!/\.ya?ml$/i.test(inputPath)) {
    const message = `Invalid file extension: ${inputPath} (expected .yaml or .yml)`;
    console.error(chalk.red(`Error: ${message}`));
    errors.push(message);
    process.exitCode = ExitCode.FileReadError;
    return { success: false, errors };
  }

  // Check marp-cli availability
  spinner?.start('Checking for Marp CLI...');
  if (!checkMarpCliAvailable(dirname(inputPath))) {
    spinner?.fail('Marp CLI not found');
    const message =
      'Marp CLI not found. Install it with: npm install -D @marp-team/marp-cli';
    console.error(chalk.red(`Error: ${message}`));
    errors.push(message);
    process.exitCode = ExitCode.GeneralError;
    return { success: false, errors };
  }
  spinner?.succeed('Marp CLI found');

  // Create output directory
  try {
    await mkdir(outputDir, { recursive: true });
  } catch {
    const message = `Failed to create output directory: ${outputDir}`;
    console.error(chalk.red(`Error: ${message}`));
    errors.push(message);
    process.exitCode = ExitCode.GeneralError;
    return { success: false, errors };
  }

  // Load configuration
  spinner?.start('Loading configuration...');
  const configLoader = new ConfigLoader();
  let configPath = options.config;

  if (!configPath) {
    configPath = await configLoader.findConfig(dirname(inputPath));
  }

  const config = await configLoader.load(configPath);
  spinner?.succeed('Configuration loaded');

  // Create and initialize pipeline
  spinner?.start('Initializing pipeline...');
  const pipeline = new Pipeline(config);

  try {
    await pipeline.initialize();
    spinner?.succeed('Pipeline initialized');
  } catch (error) {
    spinner?.fail('Failed to initialize pipeline');
    const message =
      error instanceof Error ? error.message : 'Unknown initialization error';
    console.error(chalk.red(`Error: ${message}`));
    errors.push(message);
    process.exitCode = ExitCode.ConversionError;
    return { success: false, errors };
  }

  // Generate markdown (supports .yaml, .yml, case-insensitive)
  spinner?.start(`Converting ${inputPath}...`);
  const tempMdPath = inputPath.replace(/\.ya?ml$/i, '.md');

  // Helper function to cleanup temporary markdown file
  const cleanupTempFile = async () => {
    try {
      await unlink(tempMdPath);
    } catch {
      // Ignore cleanup errors
    }
  };

  try {
    await pipeline.runWithResult(inputPath, { outputPath: tempMdPath });
    spinner?.succeed('Markdown generated');
  } catch (error) {
    spinner?.fail('Conversion failed');
    const message =
      error instanceof PipelineError
        ? `${error.stage}: ${error.message}`
        : error instanceof Error
          ? error.message
          : 'Unknown error';
    console.error(chalk.red(`Error: ${message}`));
    errors.push(message);
    process.exitCode = ExitCode.ConversionError;
    await cleanupTempFile();
    return { success: false, errors };
  }

  // Take screenshots with Marp CLI
  spinner?.start('Taking screenshots...');
  const marpArgs = buildMarpCommandArgs(tempMdPath, outputDir, options);

  if (options.verbose) {
    console.log(`Running: marp ${marpArgs.join(' ')}`);
  }

  try {
    runMarp(marpArgs, {
      projectDir: dirname(inputPath),
      stdio: options.verbose ? 'inherit' : 'pipe',
    });
    spinner?.succeed(`Screenshots saved to ${outputDir}`);
  } catch (error) {
    spinner?.fail('Failed to take screenshots');
    const message =
      error instanceof Error ? error.message : 'Marp CLI failed';
    console.error(chalk.red(`Error: ${message}`));
    errors.push(message);
    process.exitCode = ExitCode.GeneralError;
    await cleanupTempFile();
    return { success: false, errors };
  }

  // Determine actual output format (ai -> jpeg)
  const isAiFormat = options.format === 'ai';
  const actualFormat = isAiFormat ? 'jpeg' : (options.format || 'png');
  let actualWidth = isAiFormat ? 640 : (options.width || 1280);
  let actualHeight = Math.round(actualWidth * 9 / 16); // 16:9 default fallback

  // Filter to specific slide if requested
  if (options.slide !== undefined) {
    spinner?.start(`Filtering to slide ${options.slide}...`);
    const mdBaseName = basename(tempMdPath, '.md');

    const filterResult = await filterToSpecificSlide(
      outputDir,
      mdBaseName,
      options.slide,
      actualFormat
    );

    if (!filterResult.success) {
      spinner?.fail('Failed to filter slides');
      console.error(chalk.red(`Error: ${filterResult.error}`));
      errors.push(filterResult.error || 'Filter failed');
      process.exitCode = ExitCode.GeneralError;
      await cleanupTempFile();
      return { success: false, errors };
    }

    spinner?.succeed(`Kept slide ${options.slide}: ${filterResult.keptFile}`);
  }

  // Get list of generated files
  const allFiles = await readdir(outputDir);
  const mdBaseName = basename(tempMdPath, '.md');
  const generatedFiles = allFiles
    .filter((f) => f.startsWith(mdBaseName) && f.endsWith(`.${actualFormat}`))
    .sort();

  // Get actual dimensions from generated image for accurate token estimation
  if (generatedFiles.length > 0) {
    try {
      const metadata = await sharp(join(outputDir, generatedFiles[0]!)).metadata();
      if (metadata.width && metadata.height) {
        actualWidth = metadata.width;
        actualHeight = metadata.height;
      }
    } catch {
      // Use default on metadata read failure
    }
  }

  // Generate contact sheet if requested
  if (options.contactSheet && generatedFiles.length > 0) {
    spinner?.start('Generating contact sheet...');

    const slides: SlideImage[] = generatedFiles.map((file, index) => ({
      path: join(outputDir, file),
      index: index + 1,
    }));

    const contactSheetPath = join(outputDir, `${mdBaseName}-contact.png`);
    const contactResult = await generateContactSheet(slides, {
      outputPath: contactSheetPath,
      columns: options.columns || 2,
      slideWidth: actualWidth,
      slideHeight: actualHeight,
    });

    if (!contactResult.success) {
      spinner?.fail('Failed to generate contact sheet');
      console.error(chalk.red(`Error: ${contactResult.error}`));
      errors.push(contactResult.error || 'Contact sheet generation failed');
    } else {
      spinner?.succeed(`Contact sheet saved: ${basename(contactSheetPath)}`);
    }
  }

  // Cleanup temporary markdown file
  await cleanupTempFile();

  // Display output based on format
  console.log('');

  if (isAiFormat && generatedFiles.length > 0) {
    // AI-friendly output
    const output = formatAiOutput({
      files: generatedFiles,
      width: actualWidth,
      height: actualHeight,
      outputDir,
    });
    console.log(output);
  } else if (isAiFormat) {
    // No files generated in AI format
    console.log(`Output: ${chalk.cyan(outputDir)}`);
    console.log('No screenshots generated');
  } else {
    console.log(`Output: ${chalk.cyan(outputDir)}`);
    if (generatedFiles.length > 0) {
      console.log(`Files: ${generatedFiles.length} screenshot(s)`);
    }
  }

  return {
    success: true,
    errors,
    outputDir,
    files: generatedFiles,
  };
}
