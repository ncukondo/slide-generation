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
