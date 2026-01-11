import { Command } from 'commander';
import { access, unlink, readdir, mkdir, writeFile, readFile, rm } from 'fs/promises';
import { basename, dirname, join, extname } from 'path';
import { tmpdir } from 'os';
import { spawn, execSync, execFileSync } from 'child_process';
import { createServer, Server } from 'http';
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
  gallery?: boolean;
  slide?: number;
}

export interface PreviewResult {
  success: boolean;
  errors: string[];
}

export interface SlideInfo {
  path: string;
  title: string;
  index: number;
}

/**
 * Generate HTML for gallery view with slide thumbnails
 */
export function generateGalleryHtml(slides: SlideInfo[]): string {
  const slideItems =
    slides.length > 0
      ? slides
          .map(
            (s) => `
      <div class="slide" onclick="showSlide(${s.index}, '${s.path}')">
        <img src="${s.path}" alt="Slide ${s.index}">
        <div class="slide-title">${s.title}</div>
      </div>
    `
          )
          .join('')
      : '<p class="no-slides">No slides available</p>';

  return `<!DOCTYPE html>
<html>
<head>
  <title>Slide Gallery</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; }
    h1 { text-align: center; padding: 24px; color: #333; }
    .gallery { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px; padding: 20px; max-width: 1400px; margin: 0 auto; }
    .slide { cursor: pointer; border: 1px solid #ddd; border-radius: 8px; overflow: hidden; background: white; transition: transform 0.2s, box-shadow 0.2s; }
    .slide:hover { transform: translateY(-4px); box-shadow: 0 8px 16px rgba(0,0,0,0.1); }
    .slide img { width: 100%; height: auto; display: block; }
    .slide-title { padding: 12px; text-align: center; font-size: 14px; color: #666; border-top: 1px solid #eee; }
    .no-slides { text-align: center; padding: 40px; color: #999; }
    .modal { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.9); z-index: 1000; }
    .modal.active { display: flex; align-items: center; justify-content: center; }
    .modal img { max-width: 90%; max-height: 90%; object-fit: contain; }
    .modal-close { position: absolute; top: 20px; right: 30px; color: white; font-size: 40px; cursor: pointer; }
    .modal-nav { position: absolute; top: 50%; color: white; font-size: 60px; cursor: pointer; user-select: none; }
    .modal-nav.prev { left: 20px; }
    .modal-nav.next { right: 20px; }
  </style>
</head>
<body>
  <h1>Slide Gallery</h1>
  <div class="gallery">
    ${slideItems}
  </div>
  <div class="modal" id="modal" onclick="hideSlide(event)">
    <span class="modal-close" onclick="hideSlide(event)">&times;</span>
    <span class="modal-nav prev" onclick="navigateSlide(event, -1)">&lt;</span>
    <img id="modal-img" src="">
    <span class="modal-nav next" onclick="navigateSlide(event, 1)">&gt;</span>
  </div>
  <script>
    const slides = ${JSON.stringify(slides)};
    let currentIndex = 0;

    function showSlide(index, path) {
      currentIndex = slides.findIndex(s => s.index === index);
      document.getElementById('modal-img').src = path;
      document.getElementById('modal').classList.add('active');
    }

    function hideSlide(event) {
      if (event.target.classList.contains('modal') || event.target.classList.contains('modal-close')) {
        document.getElementById('modal').classList.remove('active');
      }
    }

    function navigateSlide(event, direction) {
      event.stopPropagation();
      currentIndex = (currentIndex + direction + slides.length) % slides.length;
      const slide = slides[currentIndex];
      document.getElementById('modal-img').src = slide.path;
    }

    document.addEventListener('keydown', (e) => {
      const modal = document.getElementById('modal');
      if (!modal.classList.contains('active')) return;
      if (e.key === 'Escape') modal.classList.remove('active');
      if (e.key === 'ArrowLeft') navigateSlide(e, -1);
      if (e.key === 'ArrowRight') navigateSlide(e, 1);
    });
  </script>
</body>
</html>`;
}

/**
 * Collect slide information from screenshot directory
 */
export async function collectSlideInfo(
  dir: string,
  baseName: string,
  format: string
): Promise<SlideInfo[]> {
  try {
    const files = await readdir(dir);
    const slidePattern = new RegExp(`^${baseName}\\.(\\d{3})\\.${format}$`);

    const slides: SlideInfo[] = [];
    for (const file of files) {
      const match = file.match(slidePattern);
      if (match) {
        const index = parseInt(match[1]!, 10);
        slides.push({
          path: join(dir, file),
          title: `Slide ${index}`,
          index,
        });
      }
    }

    return slides.sort((a, b) => a.index - b.index);
  } catch {
    return [];
  }
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
 * Start a simple HTTP server to serve gallery files
 */
export function startGalleryServer(
  galleryDir: string,
  port: number,
  initialSlide?: number
): Promise<Server> {
  return new Promise((resolve, reject) => {
    const mimeTypes: Record<string, string> = {
      '.html': 'text/html',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.css': 'text/css',
      '.js': 'application/javascript',
    };

    const server = createServer(async (req, res) => {
      try {
        let filePath = req.url === '/' ? '/index.html' : req.url || '/index.html';
        filePath = join(galleryDir, filePath);

        const ext = extname(filePath);
        const contentType = mimeTypes[ext] || 'application/octet-stream';

        const data = await readFile(filePath);
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(data);
      } catch {
        res.writeHead(404);
        res.end('Not found');
      }
    });

    server.on('error', reject);
    server.listen(port, () => {
      const url = initialSlide
        ? `http://localhost:${port}/#slide-${initialSlide}`
        : `http://localhost:${port}`;
      console.log(`Gallery server running at ${chalk.cyan(url)}`);
      resolve(server);
    });
  });
}

/**
 * Execute gallery preview mode
 */
export async function executeGalleryPreview(
  inputPath: string,
  options: PreviewOptions
): Promise<PreviewResult> {
  const errors: string[] = [];
  const port = Number(options.port) || 8080;
  const galleryDir = join(tmpdir(), `slide-gen-gallery-${Date.now()}`);

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
  try {
    execSync('marp --version', { stdio: 'ignore', timeout: 5000 });
  } catch {
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

  // Create gallery directory
  await mkdir(galleryDir, { recursive: true });

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
    await rm(galleryDir, { recursive: true, force: true });
    return { success: false, errors };
  }

  // Generate markdown
  const tempMdPath = join(galleryDir, 'slides.md');
  console.log(`Converting ${chalk.cyan(inputPath)}...`);

  try {
    await pipeline.runWithResult(inputPath, { outputPath: tempMdPath });
    console.log(chalk.green('✓') + ' Conversion complete');
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
    await rm(galleryDir, { recursive: true, force: true });
    return { success: false, errors };
  }

  // Take screenshots
  console.log('Taking screenshots...');
  try {
    execFileSync('npx', ['marp', '--images', 'png', '-o', galleryDir, tempMdPath], {
      stdio: options.verbose ? 'inherit' : 'pipe',
    });
    console.log(chalk.green('✓') + ' Screenshots generated');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Marp CLI failed';
    console.error(chalk.red(`Error: ${message}`));
    errors.push(message);
    process.exitCode = ExitCode.GeneralError;
    await rm(galleryDir, { recursive: true, force: true });
    return { success: false, errors };
  }

  // Collect slide info
  const slides = await collectSlideInfo(galleryDir, 'slides', 'png');

  if (slides.length === 0) {
    console.error(chalk.red('Error: No slides found'));
    errors.push('No slides generated');
    process.exitCode = ExitCode.GeneralError;
    await rm(galleryDir, { recursive: true, force: true });
    return { success: false, errors };
  }

  // Update paths to be relative for HTTP serving
  const relativeSlides = slides.map((s) => ({
    ...s,
    path: basename(s.path),
  }));

  // Generate gallery HTML
  const galleryHtml = generateGalleryHtml(relativeSlides);
  await writeFile(join(galleryDir, 'index.html'), galleryHtml);

  // Start gallery server
  console.log(`\nStarting gallery server on port ${chalk.cyan(port)}...`);

  let server: Server;
  try {
    server = await startGalleryServer(galleryDir, port, options.slide);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to start server';
    console.error(chalk.red(`Error: ${message}`));
    errors.push(message);
    process.exitCode = ExitCode.GeneralError;
    await rm(galleryDir, { recursive: true, force: true });
    return { success: false, errors };
  }

  // Open browser
  const url = options.slide
    ? `http://localhost:${port}/#slide-${options.slide}`
    : `http://localhost:${port}`;

  try {
    const open = await import('open' as string);
    await open.default(url);
  } catch {
    console.log(`Open ${chalk.cyan(url)} in your browser`);
  }

  console.log(`\nShowing ${slides.length} slides in gallery mode`);
  console.log('Press Ctrl+C to stop the server');

  // Cleanup on exit
  const cleanup = async () => {
    server.close();
    await rm(galleryDir, { recursive: true, force: true });
  };

  if (options.signal) {
    options.signal.addEventListener('abort', cleanup);
  }

  const signalHandler = async () => {
    console.log('\n' + chalk.yellow('Gallery server stopped.'));
    await cleanup();
    process.exit(0);
  };

  process.on('SIGINT', signalHandler);
  process.on('SIGTERM', signalHandler);

  // Wait for signal
  await new Promise<void>((resolve) => {
    if (options.signal) {
      options.signal.addEventListener('abort', () => resolve());
    }
    server.on('close', () => resolve());
  });

  return { success: true, errors };
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
    .option('-g, --gallery', 'Show thumbnail gallery')
    .option('-s, --slide <number>', 'Show specific slide', parseInt)
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
  // Route to gallery mode if requested
  if (options.gallery) {
    return executeGalleryPreview(inputPath, options);
  }

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
