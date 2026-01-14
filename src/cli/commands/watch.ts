import { Command } from 'commander';
import { access } from 'fs/promises';
import { basename, dirname, join } from 'path';
import chalk from 'chalk';
import { watch as chokidarWatch, FSWatcher } from 'chokidar';
import { Pipeline, PipelineError } from '../../core/pipeline';
import { ConfigLoader } from '../../config/loader';
import { ExitCode } from './convert';

export interface WatchOptions {
  output?: string;
  config?: string;
  debounce?: number;
  verbose?: boolean;
  signal?: AbortSignal;
}

export interface WatchResult {
  success: boolean;
  conversionCount: number;
  errors: string[];
}

/**
 * State management for watch mode
 */
export class WatchState {
  private _isRunning = false;
  private _conversionCount = 0;
  private _lastError: Error | null = null;

  get isRunning(): boolean {
    return this._isRunning;
  }

  get conversionCount(): number {
    return this._conversionCount;
  }

  get lastError(): Error | null {
    return this._lastError;
  }

  start(): void {
    this._isRunning = true;
  }

  stop(): void {
    this._isRunning = false;
  }

  incrementConversion(): void {
    this._conversionCount++;
  }

  setError(error: Error): void {
    this._lastError = error;
  }

  clearError(): void {
    this._lastError = null;
  }
}

/**
 * Generate default output path from input path
 */
export function getDefaultOutputPath(inputPath: string): string {
  const dir = dirname(inputPath);
  const base = basename(inputPath, '.yaml');
  return join(dir, `${base}.md`);
}

/**
 * Format timestamp for log output
 */
function formatTime(): string {
  const now = new Date();
  return `[${now.toLocaleTimeString('en-GB')}]`;
}

/**
 * Create the watch command
 */
export function createWatchCommand(): Command {
  return new Command('watch')
    .description('Watch source file and auto-convert on changes')
    .argument('<input>', 'Input YAML file to watch')
    .option('-o, --output <path>', 'Output file path')
    .option('-c, --config <path>', 'Config file path')
    .option('--debounce <ms>', 'Debounce delay in milliseconds', '300')
    .option('-v, --verbose', 'Verbose output')
    .action(async (input: string, options: WatchOptions) => {
      await executeWatch(input, options);
    });
}

/**
 * Execute a single conversion
 */
async function runConversion(
  inputPath: string,
  outputPath: string,
  pipeline: Pipeline,
  verbose: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await pipeline.runWithResult(inputPath, { outputPath });

    console.log(
      `${formatTime()} ${chalk.green('✓')} Output: ${chalk.cyan(outputPath)}`
    );

    if (verbose) {
      console.log(`  Parsed ${result.slideCount} slides`);
      if (result.warnings.length > 0) {
        for (const warning of result.warnings) {
          console.log(chalk.yellow(`  ⚠ ${warning}`));
        }
      }
    }

    return { success: true };
  } catch (error) {
    const message =
      error instanceof PipelineError
        ? `${error.stage}: ${error.message}`
        : error instanceof Error
          ? error.message
          : 'Unknown error';

    console.log(
      `${formatTime()} ${chalk.red('✗')} Conversion failed: ${message}`
    );

    return { success: false, error: message };
  }
}

/**
 * Execute the watch command
 */
export async function executeWatch(
  inputPath: string,
  options: WatchOptions
): Promise<WatchResult> {
  const state = new WatchState();
  const errors: string[] = [];
  const debounceMs = Number(options.debounce) || 300;
  const verbose = options.verbose ?? false;

  // Check if immediately aborted (for testing)
  if (options.signal?.aborted) {
    // Validate input file exists
    try {
      await access(inputPath);
    } catch {
      errors.push(`File not found: ${inputPath}`);
      return { success: false, conversionCount: 0, errors };
    }
    return { success: true, conversionCount: 0, errors };
  }

  // Validate input file exists
  try {
    await access(inputPath);
  } catch {
    console.error(chalk.red(`Error: File not found: ${inputPath}`));
    errors.push(`File not found: ${inputPath}`);
    process.exitCode = ExitCode.FileReadError;
    return { success: false, conversionCount: 0, errors };
  }

  // Determine output path
  const outputPath = options.output ?? getDefaultOutputPath(inputPath);

  // Load configuration
  const configLoader = new ConfigLoader();
  let configPath = options.config;

  if (!configPath) {
    configPath = await configLoader.findConfig(dirname(inputPath));
  }

  const config = await configLoader.load(configPath);

  // Create and initialize pipeline
  const pipeline = new Pipeline(config);

  try {
    await pipeline.initialize();
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown initialization error';
    console.error(chalk.red(`Error: Failed to initialize pipeline: ${message}`));
    errors.push(message);
    process.exitCode = ExitCode.ConversionError;
    return { success: false, conversionCount: 0, errors };
  }

  console.log(`Watching ${chalk.cyan(inputPath)}...`);
  console.log(`Output: ${chalk.cyan(outputPath)}`);
  console.log('');

  // Initial conversion
  console.log(`${formatTime()} Initial conversion...`);
  const initialResult = await runConversion(inputPath, outputPath, pipeline, verbose);
  if (initialResult.success) {
    state.incrementConversion();
  } else if (initialResult.error) {
    errors.push(initialResult.error);
  }

  // Set up file watcher
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let watcher: FSWatcher | null = null;

  const handleChange = () => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    debounceTimer = setTimeout(async () => {
      console.log(`${formatTime()} Changed: ${inputPath}`);
      console.log(`${formatTime()} Converting...`);

      const result = await runConversion(inputPath, outputPath, pipeline, verbose);
      if (result.success) {
        state.incrementConversion();
        state.clearError();
      } else if (result.error) {
        errors.push(result.error);
        state.setError(new Error(result.error));
      }
    }, debounceMs);
  };

  state.start();

  // WSL2 has known performance issues with inotify on NTFS mounted via 9P
  // Use polling mode for more reliable file watching in WSL2 environments
  const isWSL = !!process.env['WSL_DISTRO_NAME'];

  watcher = chokidarWatch(inputPath, {
    persistent: true,
    ignoreInitial: true,
    usePolling: isWSL,
    ...(isWSL && { interval: 100 }),
    awaitWriteFinish: {
      stabilityThreshold: 100,
      pollInterval: 50,
    },
  });

  // Wait for watcher to be ready before proceeding
  await new Promise<void>((resolve) => {
    watcher!.on('ready', resolve);
  });

  watcher.on('change', handleChange);

  // Handle abort signal
  const cleanup = () => {
    state.stop();
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    watcher?.close();
  };

  if (options.signal) {
    options.signal.addEventListener('abort', cleanup);
  }

  // Handle process signals
  const signalHandler = () => {
    console.log('\n' + chalk.yellow('Watch stopped.'));
    cleanup();
    process.exit(0);
  };

  process.on('SIGINT', signalHandler);
  process.on('SIGTERM', signalHandler);

  // Keep the process running
  await new Promise<void>((resolve) => {
    if (options.signal) {
      options.signal.addEventListener('abort', () => resolve());
    }
  });

  return {
    success: errors.length === 0,
    conversionCount: state.conversionCount,
    errors,
  };
}
