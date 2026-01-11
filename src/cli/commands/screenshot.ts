import { Command } from 'commander';
import { access, mkdir } from 'fs/promises';
import { dirname } from 'path';
import { execSync } from 'child_process';
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
 * Build marp-cli command for taking screenshots
 */
export function buildMarpCommand(
  markdownPath: string,
  outputDir: string,
  options: ScreenshotOptions
): string {
  const format = options.format || 'png';
  const parts = ['npx', 'marp', `--images`, format];

  // Calculate image scale if width is different from default
  if (options.width && options.width !== 1280) {
    const scale = options.width / 1280;
    parts.push('--image-scale', String(scale));
  }

  parts.push('-o', outputDir);
  parts.push(markdownPath);

  return parts.join(' ');
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

  // Generate markdown
  spinner?.start(`Converting ${inputPath}...`);
  const tempMdPath = inputPath.replace(/\.yaml$/, '.md');

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
    return { success: false, errors };
  }

  // Take screenshots with Marp CLI
  spinner?.start('Taking screenshots...');
  const marpCommand = buildMarpCommand(tempMdPath, outputDir, options);

  if (options.verbose) {
    console.log(`Running: ${marpCommand}`);
  }

  try {
    execSync(marpCommand, { stdio: options.verbose ? 'inherit' : 'pipe' });
    spinner?.succeed(`Screenshots saved to ${outputDir}`);
  } catch (error) {
    spinner?.fail('Failed to take screenshots');
    const message =
      error instanceof Error ? error.message : 'Marp CLI failed';
    console.error(chalk.red(`Error: ${message}`));
    errors.push(message);
    process.exitCode = ExitCode.GeneralError;
    return { success: false, errors };
  }

  console.log('');
  console.log(`Output: ${chalk.cyan(outputDir)}`);

  return {
    success: true,
    errors,
    outputDir,
  };
}
