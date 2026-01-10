import { Command } from 'commander';
import { access } from 'fs/promises';
import { basename, dirname, join } from 'path';
import chalk from 'chalk';
import ora from 'ora';
import { Pipeline, PipelineError } from '../../core/pipeline';
import { ConfigLoader } from '../../config/loader';

/**
 * Exit codes for CLI commands
 */
export const ExitCode = {
  Success: 0,
  GeneralError: 1,
  ArgumentError: 2,
  FileReadError: 3,
  ValidationError: 4,
  ConversionError: 5,
  ReferenceError: 6,
} as const;

interface ConvertOptions {
  output?: string;
  config?: string;
  theme?: string;
  references?: boolean;
  verbose?: boolean;
}

/**
 * Generate default output path from input path
 */
function getDefaultOutputPath(inputPath: string): string {
  const dir = dirname(inputPath);
  const base = basename(inputPath, '.yaml');
  return join(dir, `${base}.md`);
}

/**
 * Create the convert command
 */
export function createConvertCommand(): Command {
  return new Command('convert')
    .description('Convert YAML source to Marp Markdown')
    .argument('<input>', 'Input YAML file')
    .option('-o, --output <path>', 'Output file path')
    .option('-c, --config <path>', 'Config file path')
    .option('-t, --theme <name>', 'Theme name')
    .option('--no-references', 'Disable reference processing')
    .option('-v, --verbose', 'Verbose output')
    .action(async (input: string, options: ConvertOptions) => {
      await executeConvert(input, options);
    });
}

/**
 * Execute the convert command
 */
async function executeConvert(
  inputPath: string,
  options: ConvertOptions
): Promise<void> {
  const spinner = options.verbose ? null : ora();
  const verbose = options.verbose ?? false;

  const updateSpinner = (text: string) => {
    if (spinner) {
      spinner.text = text;
    }
  };

  try {
    // Validate input file exists
    spinner?.start(`Reading ${inputPath}...`);
    try {
      await access(inputPath);
    } catch {
      spinner?.fail(`File not found: ${inputPath}`);
      console.error(chalk.red(`Error: Input file not found: ${inputPath}`));
      process.exitCode = ExitCode.FileReadError;
      return;
    }

    // Determine output path
    const outputPath = options.output ?? getDefaultOutputPath(inputPath);

    // Load configuration
    updateSpinner('Loading configuration...');
    const configLoader = new ConfigLoader();
    let configPath = options.config;

    if (!configPath) {
      configPath = await configLoader.findConfig(dirname(inputPath));
    }

    const config = await configLoader.load(configPath);

    // Override references if specified
    if (options.references === false) {
      config.references.enabled = false;
    }

    // Override theme if specified
    if (options.theme) {
      config.output.theme = options.theme;
    }

    // Create and initialize pipeline
    updateSpinner('Initializing pipeline...');
    const pipeline = new Pipeline(config);

    try {
      await pipeline.initialize();
    } catch (error) {
      spinner?.fail('Failed to initialize pipeline');
      if (error instanceof PipelineError) {
        console.error(chalk.red(`Error: ${error.message}`));
      } else {
        console.error(
          chalk.red(
            `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
          )
        );
      }
      process.exitCode = ExitCode.ConversionError;
      return;
    }

    // Run pipeline
    updateSpinner(`Converting ${inputPath}...`);
    const result = await pipeline.runWithResult(inputPath, { outputPath });

    // Success!
    spinner?.succeed(`Converted ${inputPath}`);

    // Show stats in verbose mode or after completion
    if (verbose) {
      console.log('');
      console.log(chalk.green('  ✓') + ` Parsed ${result.slideCount} slides`);
      if (result.citations.length > 0) {
        console.log(
          chalk.green('  ✓') + ` Resolved ${result.citations.length} references`
        );
      }
      console.log(chalk.green('  ✓') + ' Generated output');
    }

    // Show warnings
    for (const warning of result.warnings) {
      console.log(chalk.yellow('  ⚠') + ` ${warning}`);
    }

    // Show output path
    console.log('');
    console.log(`Output: ${chalk.cyan(outputPath)}`);
  } catch (error) {
    spinner?.fail('Conversion failed');

    if (error instanceof PipelineError) {
      console.error(chalk.red(`\nError (${error.stage}): ${error.message}`));

      // Set appropriate exit code based on stage
      switch (error.stage) {
        case 'parse':
          process.exitCode = ExitCode.FileReadError;
          break;
        case 'transform':
          process.exitCode = ExitCode.ValidationError;
          break;
        case 'render':
          process.exitCode = ExitCode.ConversionError;
          break;
        default:
          process.exitCode = ExitCode.GeneralError;
      }
    } else {
      console.error(
        chalk.red(
          `\nError: ${error instanceof Error ? error.message : 'Unknown error'}`
        )
      );
      process.exitCode = ExitCode.GeneralError;
    }
  }
}
