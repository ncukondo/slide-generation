import { Command } from 'commander';
import { access, mkdir, readdir, unlink } from 'fs/promises';
import { basename, dirname, join } from 'path';
import { execSync, execFileSync } from 'child_process';
import chalk from 'chalk';
import ora from 'ora';
import { Pipeline, PipelineError } from '../../core/pipeline';
import { ConfigLoader } from '../../config/loader';
import { ExitCode } from './convert';

export interface ScreenshotOptions {
  output?: string;
  slide?: number;
  width?: number;
  format?: 'png' | 'jpeg';
  config?: string;
  verbose?: boolean;
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
 * Check if marp-cli is available in the system
 */
export function checkMarpCliAvailable(): boolean {
  try {
    execSync('marp --version', { stdio: 'ignore', timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}

/**
 * Build marp-cli command arguments for taking screenshots
 * Returns an array of arguments to be used with execFileSync
 */
export function buildMarpCommandArgs(
  markdownPath: string,
  outputDir: string,
  options: ScreenshotOptions
): string[] {
  const format = options.format || 'png';
  const args = ['marp', '--images', format];

  // Calculate image scale if width is different from default
  if (options.width && options.width !== 1280) {
    const scale = options.width / 1280;
    args.push('--image-scale', String(scale));
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
    .option('-f, --format <fmt>', 'Image format (png/jpeg)', 'png')
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
  if (!checkMarpCliAvailable()) {
    spinner?.fail('Marp CLI not found');
    const message =
      'Marp CLI not found. Install it with: npm install -g @marp-team/marp-cli';
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
    console.log(`Running: npx ${marpArgs.join(' ')}`);
  }

  try {
    execFileSync('npx', marpArgs, { stdio: options.verbose ? 'inherit' : 'pipe' });
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

  // Filter to specific slide if requested
  if (options.slide !== undefined) {
    spinner?.start(`Filtering to slide ${options.slide}...`);
    const mdBaseName = basename(tempMdPath, '.md');
    const format = options.format || 'png';

    const filterResult = await filterToSpecificSlide(
      outputDir,
      mdBaseName,
      options.slide,
      format
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

  // Cleanup temporary markdown file
  await cleanupTempFile();

  console.log('');
  console.log(`Output: ${chalk.cyan(outputDir)}`);

  return {
    success: true,
    errors,
    outputDir,
  };
}
