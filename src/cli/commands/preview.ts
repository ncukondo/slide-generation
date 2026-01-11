import { Command } from 'commander';
import { access, unlink } from 'fs/promises';
import { basename, dirname, join } from 'path';
import { tmpdir } from 'os';
import { spawn, execSync } from 'child_process';
import chalk from 'chalk';
import { watch as chokidarWatch, FSWatcher } from 'chokidar';
import { Pipeline, PipelineError } from '../../core/pipeline';
import { ConfigLoader } from '../../config/loader';
import { ExitCode } from './convert';

export interface PreviewOptions {
  port?: number;
  watch?: boolean;
  config?: string;
  verbose?: boolean;
  signal?: AbortSignal;
}

export interface PreviewResult {
  success: boolean;
  errors: string[];
}

/**
 * Check if marp-cli is available in the system
 * Uses 'marp --version' directly instead of 'npx marp --version'
 * because npx is slow (searches local, global, and npm registry)
 */
export async function checkMarpCliAvailable(): Promise<boolean> {
  try {
    execSync('marp --version', { stdio: 'ignore', timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}

/**
 * Generate temporary output path for markdown file
 */
export function getTempOutputPath(inputPath: string): string {
  const base = basename(inputPath, '.yaml');
  return join(tmpdir(), `slide-gen-preview-${base}-${Date.now()}.md`);
}

/**
 * Build marp-cli command for preview
 */
export function buildMarpCommand(
  markdownPath: string,
  options: PreviewOptions
): string {
  const parts = ['npx', 'marp', '--preview'];

  if (options.port) {
    parts.push('-p', String(options.port));
  }

  if (options.watch) {
    parts.push('--watch');
  }

  parts.push(markdownPath);

  return parts.join(' ');
}

/**
 * Create the preview command
 */
export function createPreviewCommand(): Command {
  return new Command('preview')
    .description('Preview the generated slides in browser (requires Marp CLI)')
    .argument('<input>', 'Input YAML file')
    .option('-p, --port <number>', 'Preview server port', '8080')
    .option('-w, --watch', 'Watch for changes and auto-reload')
    .option('-c, --config <path>', 'Config file path')
    .option('-v, --verbose', 'Verbose output')
    .action(async (input: string, options: PreviewOptions) => {
      await executePreview(input, options);
    });
}

/**
 * Execute the preview command
 */
export async function executePreview(
  inputPath: string,
  options: PreviewOptions
): Promise<PreviewResult> {
  const errors: string[] = [];
  const verbose = options.verbose ?? false;
  const port = Number(options.port) || 8080;

  // Check if immediately aborted (for testing)
  if (options.signal?.aborted) {
    try {
      await access(inputPath);
    } catch {
      errors.push(`File not found: ${inputPath}`);
      return { success: false, errors };
    }
    return { success: true, errors };
  }

  // Validate input file exists
  try {
    await access(inputPath);
  } catch {
    console.error(chalk.red(`Error: File not found: ${inputPath}`));
    errors.push(`File not found: ${inputPath}`);
    process.exitCode = ExitCode.FileReadError;
    return { success: false, errors };
  }

  // Check marp-cli availability
  console.log('Checking for Marp CLI...');
  const marpAvailable = await checkMarpCliAvailable();
  if (!marpAvailable) {
    console.error(
      chalk.red(
        'Error: Marp CLI not found. Install it with: npm install -g @marp-team/marp-cli'
      )
    );
    errors.push('Marp CLI not available');
    process.exitCode = ExitCode.GeneralError;
    return { success: false, errors };
  }
  console.log(chalk.green('✓') + ' Marp CLI found');

  // Load configuration
  const configLoader = new ConfigLoader();
  let configPath = options.config;

  if (!configPath) {
    configPath = await configLoader.findConfig(dirname(inputPath));
  }

  const config = await configLoader.load(configPath);

  // Create and initialize pipeline
  console.log('Initializing pipeline...');
  const pipeline = new Pipeline(config);

  try {
    await pipeline.initialize();
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown initialization error';
    console.error(chalk.red(`Error: Failed to initialize pipeline: ${message}`));
    errors.push(message);
    process.exitCode = ExitCode.ConversionError;
    return { success: false, errors };
  }

  // Generate initial markdown
  const tempMarkdownPath = getTempOutputPath(inputPath);
  console.log(`Converting ${chalk.cyan(inputPath)}...`);

  try {
    await pipeline.runWithResult(inputPath, { outputPath: tempMarkdownPath });
    console.log(chalk.green('✓') + ' Initial conversion complete');
  } catch (error) {
    const message =
      error instanceof PipelineError
        ? `${error.stage}: ${error.message}`
        : error instanceof Error
          ? error.message
          : 'Unknown error';
    console.error(chalk.red(`Error: Conversion failed: ${message}`));
    errors.push(message);
    process.exitCode = ExitCode.ConversionError;
    return { success: false, errors };
  }

  // Start marp preview server
  console.log(`\nStarting preview server on port ${chalk.cyan(port)}...`);

  const marpCommand = buildMarpCommand(tempMarkdownPath, {
    ...options,
    port,
    watch: false, // We handle watch ourselves if needed
  });

  if (verbose) {
    console.log(`Running: ${marpCommand}`);
  }

  const marpProcess = spawn('npx', ['marp', '--preview', '-p', String(port), tempMarkdownPath], {
    stdio: 'inherit',
    shell: true,
  });

  let watcher: FSWatcher | null = null;
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  // Set up file watcher if watch mode enabled
  if (options.watch) {
    console.log(`\nWatching ${chalk.cyan(inputPath)} for changes...`);

    watcher = chokidarWatch(inputPath, {
      persistent: true,
      ignoreInitial: true,
      awaitWriteFinish: {
        stabilityThreshold: 100,
        pollInterval: 50,
      },
    });

    watcher.on('change', () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }

      debounceTimer = setTimeout(async () => {
        console.log(`\n[${new Date().toLocaleTimeString('en-GB')}] File changed, reconverting...`);

        try {
          await pipeline.runWithResult(inputPath, { outputPath: tempMarkdownPath });
          console.log(chalk.green('✓') + ' Reconversion complete');
        } catch (error) {
          const message =
            error instanceof PipelineError
              ? `${error.stage}: ${error.message}`
              : error instanceof Error
                ? error.message
                : 'Unknown error';
          console.error(chalk.red(`✗ Reconversion failed: ${message}`));
        }
      }, 300);
    });
  }

  // Cleanup function
  const cleanup = async () => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    watcher?.close();
    marpProcess.kill();

    // Clean up temp file
    try {
      await unlink(tempMarkdownPath);
    } catch {
      // Ignore cleanup errors
    }
  };

  // Handle abort signal
  if (options.signal) {
    options.signal.addEventListener('abort', () => {
      cleanup();
    });
  }

  // Handle process signals
  const signalHandler = async () => {
    console.log('\n' + chalk.yellow('Preview stopped.'));
    await cleanup();
    process.exit(0);
  };

  process.on('SIGINT', signalHandler);
  process.on('SIGTERM', signalHandler);

  // Wait for marp process or abort signal
  await new Promise<void>((resolve) => {
    marpProcess.on('exit', () => {
      cleanup();
      resolve();
    });

    if (options.signal) {
      options.signal.addEventListener('abort', () => resolve());
    }
  });

  return {
    success: errors.length === 0,
    errors,
  };
}
