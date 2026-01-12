/**
 * Marp CLI runner utilities
 *
 * Provides optimized execution of Marp CLI commands by:
 * 1. Using local node_modules/.bin/marp when available (fastest)
 * 2. Falling back to global marp command
 * 3. Avoiding npx which is slow (especially on Windows CI)
 */

import { existsSync } from 'fs';
import { join, resolve, dirname } from 'path';
import {
  execFileSync,
  spawn,
  ChildProcess,
  SpawnOptions,
  ExecFileSyncOptions,
} from 'child_process';

export interface MarpRunOptions extends Omit<ExecFileSyncOptions, 'encoding'> {
  /** Project directory to search for local marp installation */
  projectDir?: string;
}

export interface MarpSpawnOptions extends SpawnOptions {
  /** Project directory to search for local marp installation */
  projectDir?: string;
}

/**
 * Get the marp command path
 * Priority: local install (walking up directory tree) > global install
 *
 * @param projectDir - Directory to start searching for local marp installation
 * @returns Path to marp command, or null if not found
 */
export function getMarpCommand(projectDir?: string): string | null {
  const startDir = resolve(projectDir ?? process.cwd());

  // Walk up directory tree looking for node_modules/.bin/marp
  let currentDir = startDir;
  while (true) {
    const localMarp = join(currentDir, 'node_modules', '.bin', 'marp');
    if (existsSync(localMarp)) {
      return localMarp;
    }

    const parentDir = dirname(currentDir);
    if (parentDir === currentDir) {
      // Reached filesystem root
      break;
    }
    currentDir = parentDir;
  }

  // Check global install
  try {
    execFileSync('marp', ['--version'], { stdio: 'ignore', timeout: 5000 });
    return 'marp';
  } catch {
    return null;
  }
}

/**
 * Check if Marp CLI is available (locally or globally)
 *
 * @param projectDir - Directory to search for local marp installation
 * @returns true if marp is available
 */
export function isMarpAvailable(projectDir?: string): boolean {
  return getMarpCommand(projectDir) !== null;
}

/**
 * Error types for Marp CLI browser-related failures
 */
export type MarpBrowserErrorType =
  | 'browser_not_found'
  | 'missing_libraries'
  | 'sandbox_error'
  | 'snap_not_available'
  | 'unknown';

export interface MarpBrowserError {
  type: MarpBrowserErrorType;
  message: string;
  suggestion: string;
}

/**
 * Parse Marp CLI error output to provide user-friendly error messages
 */
export function parseMarpBrowserError(errorOutput: string): MarpBrowserError | null {
  const output = errorOutput.toLowerCase();

  // Browser not found
  if (output.includes('no suitable browser found')) {
    return {
      type: 'browser_not_found',
      message: 'No browser found for taking screenshots',
      suggestion: `Install a browser using one of these methods:
  1. Run: npx puppeteer browsers install chrome
  2. Install Chrome/Chromium system-wide
  3. Set CHROME_PATH environment variable to your browser path`,
    };
  }

  // Snap package not available (common in Docker containers)
  if (output.includes('snap to be installed') || output.includes('requires the chromium snap')) {
    return {
      type: 'snap_not_available',
      message: 'Snap packages are not available in this environment (Docker/devcontainer)',
      suggestion: `Use Puppeteer's bundled Chrome instead:
  1. Run: npx puppeteer browsers install chrome
  2. Set: export PUPPETEER_ARGS="--no-sandbox --disable-setuid-sandbox"`,
    };
  }

  // Missing shared libraries
  if (output.includes('error while loading shared libraries') || output.includes('cannot open shared object file')) {
    const libMatch = errorOutput.match(/lib[\w.-]+\.so[\d.]*/i);
    const libName = libMatch ? libMatch[0] : 'unknown library';
    return {
      type: 'missing_libraries',
      message: `Missing Chrome dependency: ${libName}`,
      suggestion: `Install required libraries:
  sudo apt-get install -y libnss3 libatk-bridge2.0-0 libdrm2 libxkbcommon0 \\
    libgbm1 libasound2t64 libxfixes3 fonts-noto-cjk`,
    };
  }

  // Sandbox error (TargetCloseError, Target closed)
  if (output.includes('target closed') || output.includes('targetcloseerror') || output.includes('no-sandbox')) {
    return {
      type: 'sandbox_error',
      message: 'Chrome sandbox error (common in container environments)',
      suggestion: `Disable sandbox mode:
  export PUPPETEER_ARGS="--no-sandbox --disable-setuid-sandbox"`,
    };
  }

  return null;
}

/**
 * Run marp synchronously
 *
 * @param args - Arguments to pass to marp
 * @param options - Execution options
 * @throws Error if marp is not installed
 */
export function runMarp(args: string[], options: MarpRunOptions = {}): void {
  const { projectDir, ...execOptions } = options;
  const marpCmd = getMarpCommand(projectDir);

  if (!marpCmd) {
    throw new Error('Marp CLI not found. Install it with: npm install -D @marp-team/marp-cli');
  }

  execFileSync(marpCmd, args, execOptions);
}

/**
 * Run marp synchronously and return output
 *
 * @param args - Arguments to pass to marp
 * @param options - Execution options
 * @returns stdout output as string
 * @throws Error if marp is not installed or command fails
 */
export function runMarpWithOutput(args: string[], options: MarpRunOptions = {}): string {
  const { projectDir, ...execOptions } = options;
  const marpCmd = getMarpCommand(projectDir);

  if (!marpCmd) {
    throw new Error('Marp CLI not found. Install it with: npm install -D @marp-team/marp-cli');
  }

  const result = execFileSync(marpCmd, args, { ...execOptions, encoding: 'utf-8' });
  return result;
}

/**
 * Spawn marp process (for long-running commands like preview)
 *
 * @param args - Arguments to pass to marp
 * @param options - Spawn options
 * @returns Child process
 * @throws Error if marp is not installed
 */
export function spawnMarp(args: string[], options: MarpSpawnOptions = {}): ChildProcess {
  const { projectDir, ...spawnOptions } = options;
  const marpCmd = getMarpCommand(projectDir);

  if (!marpCmd) {
    throw new Error('Marp CLI not found. Install it with: npm install -D @marp-team/marp-cli');
  }

  return spawn(marpCmd, args, spawnOptions);
}
