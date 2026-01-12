import { Command } from 'commander';
import { access, stat } from 'fs/promises';
import { resolve } from 'path';
import chalk from 'chalk';
import ora from 'ora';
import { ExitCode } from './convert.js';
import { SourcesManager } from '../../sources/manager.js';
import { SourceExplorer } from '../../sources/explorer.js';
import { SourceImporter } from '../../sources/importer.js';
import type { SourceType } from '../../sources/schema.js';

/**
 * Options for sources init command
 */
export interface SourcesInitOptions {
  fromDirectory?: string;
  fromFile?: string;
  name?: string;
}

/**
 * Options for sources import command
 */
export interface SourcesImportOptions {
  recursive?: boolean;
  type?: SourceType;
  description?: string;
}

/**
 * Options for sources status command
 */
export interface SourcesStatusOptions {
  verbose?: boolean;
}

/**
 * Options for sources sync command
 */
export interface SourcesSyncOptions {
  check?: boolean;
}

/**
 * Result of sources init command
 */
export interface SourcesInitResult {
  success: boolean;
  message: string;
  filesImported?: number;
}

/**
 * Result of sources import command
 */
export interface SourcesImportResult {
  success: boolean;
  message: string;
  imported: number;
  skipped: number;
}

/**
 * Result of sources status command
 */
export interface SourcesStatusResult {
  success: boolean;
  output: string;
}

/**
 * Result of sources sync command
 */
export interface SourcesSyncResult {
  success: boolean;
  message: string;
  newFiles: number;
  modifiedFiles: number;
}

/**
 * Create the sources command with subcommands
 */
export function createSourcesCommand(): Command {
  const cmd = new Command('sources').description('Manage source materials');

  cmd.addCommand(createSourcesInitCommand());
  cmd.addCommand(createSourcesImportCommand());
  cmd.addCommand(createSourcesStatusCommand());
  cmd.addCommand(createSourcesSyncCommand());

  return cmd;
}

/**
 * Create sources init subcommand
 */
function createSourcesInitCommand(): Command {
  return new Command('init')
    .description('Initialize sources directory')
    .option(
      '--from-directory <path>',
      'Import from existing directory (Pattern A)'
    )
    .option('--from-file <path>', 'Import from scenario file (Pattern B)')
    .option('--name <name>', 'Project name')
    .action(async (options: SourcesInitOptions) => {
      const result = await executeSourcesInit(process.cwd(), options);
      if (!result.success) {
        process.exit(ExitCode.GeneralError);
      }
    });
}

/**
 * Create sources import subcommand
 */
function createSourcesImportCommand(): Command {
  return new Command('import')
    .description('Import external files')
    .argument('<path>', 'File or directory to import')
    .option('--recursive', 'Import directory recursively')
    .option('--type <type>', 'Force source type')
    .option('--description <desc>', 'Add description')
    .action(async (path: string, options: SourcesImportOptions) => {
      const result = await executeSourcesImport(process.cwd(), path, options);
      if (!result.success) {
        process.exit(ExitCode.GeneralError);
      }
    });
}

/**
 * Create sources status subcommand
 */
function createSourcesStatusCommand(): Command {
  return new Command('status')
    .description('Show sources status')
    .option('--verbose', 'Show detailed information')
    .action(async (options: SourcesStatusOptions) => {
      const result = await executeSourcesStatus(process.cwd(), options);
      console.log(result.output);
      if (!result.success) {
        process.exit(ExitCode.GeneralError);
      }
    });
}

/**
 * Create sources sync subcommand
 */
function createSourcesSyncCommand(): Command {
  return new Command('sync')
    .description('Sync with original directory')
    .option('--check', 'Check for changes only')
    .action(async (options: SourcesSyncOptions) => {
      const result = await executeSourcesSync(process.cwd(), options);
      console.log(result.message);
      if (!result.success) {
        process.exit(ExitCode.GeneralError);
      }
    });
}

/**
 * Execute sources init command
 */
export async function executeSourcesInit(
  projectDir: string,
  options: SourcesInitOptions
): Promise<SourcesInitResult> {
  const resolvedDir = resolve(projectDir);
  const spinner = ora('Initializing sources...').start();

  try {
    const manager = new SourcesManager(resolvedDir);

    // Check if already initialized
    if (await manager.exists()) {
      spinner.warn('Sources already initialized');
      return {
        success: true,
        message: 'Sources already initialized',
      };
    }

    // Determine project name
    let projectName = options.name ?? 'Untitled Project';

    // Determine setup pattern
    let setupPattern: 'A' | 'B' | undefined;
    let originalSource: string | undefined;

    if (options.fromDirectory) {
      setupPattern = 'A';
      originalSource = resolve(options.fromDirectory);
    } else if (options.fromFile) {
      setupPattern = 'B';
      originalSource = resolve(options.fromFile);
    }

    // Initialize sources
    await manager.init({
      name: projectName,
      setup_pattern: setupPattern,
      original_source: originalSource,
    });

    let filesImported = 0;

    // Import from directory (Pattern A)
    if (options.fromDirectory) {
      const importer = new SourceImporter(resolvedDir, manager);
      const result = await importer.importDirectory(
        resolve(options.fromDirectory),
        { recursive: true }
      );
      filesImported = result.imported;
    }

    // Import from file (Pattern B)
    if (options.fromFile) {
      const importer = new SourceImporter(resolvedDir, manager);
      await importer.importFile(resolve(options.fromFile), {
        type: 'scenario',
      });
      filesImported = 1;
    }

    spinner.succeed(
      chalk.green(
        `Sources initialized${filesImported > 0 ? ` (${filesImported} files imported)` : ''}`
      )
    );

    return {
      success: true,
      message: 'Sources initialized successfully',
      filesImported,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    spinner.fail(chalk.red(`Failed to initialize sources: ${message}`));
    return {
      success: false,
      message,
    };
  }
}

/**
 * Execute sources import command
 */
export async function executeSourcesImport(
  projectDir: string,
  sourcePath: string,
  options: SourcesImportOptions
): Promise<SourcesImportResult> {
  const resolvedDir = resolve(projectDir);
  const resolvedSource = resolve(sourcePath);
  const spinner = ora('Importing files...').start();

  try {
    const manager = new SourcesManager(resolvedDir);

    // Check if sources is initialized
    if (!(await manager.exists())) {
      spinner.fail(
        chalk.red('Sources not initialized. Run `slide-gen sources init` first.')
      );
      return {
        success: false,
        message: 'Sources not initialized',
        imported: 0,
        skipped: 0,
      };
    }

    const importer = new SourceImporter(resolvedDir, manager);

    // Check if path is file or directory
    const stats = await stat(resolvedSource);

    let imported = 0;
    let skipped = 0;

    if (stats.isDirectory()) {
      const importDirOptions = options.recursive ? { recursive: true } : {};
      const result = await importer.importDirectory(
        resolvedSource,
        importDirOptions
      );
      imported = result.imported;
      skipped = result.skipped;
    } else {
      const importFileOptions: { type?: SourceType; description?: string } = {};
      if (options.type) {
        importFileOptions.type = options.type;
      }
      if (options.description) {
        importFileOptions.description = options.description;
      }
      await importer.importFile(resolvedSource, importFileOptions);
      imported = 1;
    }

    spinner.succeed(
      chalk.green(`Imported ${imported} file(s)${skipped > 0 ? ` (${skipped} skipped)` : ''}`)
    );

    return {
      success: true,
      message: `Imported ${imported} files`,
      imported,
      skipped,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    spinner.fail(chalk.red(`Failed to import: ${message}`));
    return {
      success: false,
      message,
      imported: 0,
      skipped: 0,
    };
  }
}

/**
 * Execute sources status command
 */
export async function executeSourcesStatus(
  projectDir: string,
  _options: SourcesStatusOptions
): Promise<SourcesStatusResult> {
  const resolvedDir = resolve(projectDir);

  try {
    const manager = new SourcesManager(resolvedDir);

    // Check if sources is initialized
    if (!(await manager.exists())) {
      return {
        success: false,
        output: chalk.red(
          'Sources not initialized. Run `slide-gen sources init` first.'
        ),
      };
    }

    const data = await manager.load();

    // Build status output
    let output = '';

    output += chalk.bold(`Sources Status: ${data.project.name}\n`);
    output += chalk.gray('━'.repeat(50)) + '\n\n';

    // Setup pattern
    if (data.project.setup_pattern) {
      output += `Setup: Pattern ${data.project.setup_pattern}`;
      if (data.project.original_source) {
        output += ` (from ${data.project.original_source})`;
      }
      output += '\n';
    }

    // Source counts by type
    const sources = data.sources ?? [];
    const countByType = sources.reduce(
      (acc, s) => {
        acc[s.type] = (acc[s.type] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    output += '\n';
    output += chalk.cyan('Sources:\n');
    for (const [type, count] of Object.entries(countByType)) {
      output += `  ${type}: ${count} file(s)\n`;
    }

    // Missing items
    const missing = data.missing ?? [];
    if (missing.length > 0) {
      output += '\n';
      output += chalk.yellow('Missing:\n');
      for (const item of missing) {
        output += `  ⚠ ${item.item}`;
        if (item.needed_for) {
          output += ` (needed for ${item.needed_for})`;
        }
        output += '\n';
      }
    }

    // References
    const refs = await manager.getReferences();
    if (refs.items.length > 0) {
      output += '\n';
      output += chalk.cyan('References:\n');
      output += `  Required: ${refs.status?.required ?? 0}\n`;
      output += `  Found: ${refs.status?.found ?? 0}\n`;
      output += `  Pending: ${refs.status?.pending ?? 0}\n`;

      const pendingRefs = refs.items.filter((i) => i.status === 'pending');
      if (pendingRefs.length > 0) {
        output += '\n';
        output += chalk.yellow('  ⚠ Pending references:\n');
        for (const ref of pendingRefs) {
          output += `    - ${ref.id} (Slide ${ref.slide}): ${ref.purpose}\n`;
        }
      }
    }

    // Last updated
    if (data.project.updated) {
      output += '\n';
      output += chalk.gray(`Last updated: ${data.project.updated}\n`);
    }

    return {
      success: true,
      output,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      output: chalk.red(`Failed to get status: ${message}`),
    };
  }
}

/**
 * Execute sources sync command
 */
export async function executeSourcesSync(
  projectDir: string,
  options: SourcesSyncOptions
): Promise<SourcesSyncResult> {
  const resolvedDir = resolve(projectDir);

  try {
    const manager = new SourcesManager(resolvedDir);

    // Check if sources is initialized
    if (!(await manager.exists())) {
      return {
        success: false,
        message: 'Sources not initialized. Run `slide-gen sources init` first.',
        newFiles: 0,
        modifiedFiles: 0,
      };
    }

    const data = await manager.load();

    // Check if this was initialized from a directory
    if (!data.project.original_source) {
      return {
        success: true,
        message: 'No original source directory to sync with.',
        newFiles: 0,
        modifiedFiles: 0,
      };
    }

    const originalDir = data.project.original_source;

    // Check if original directory exists
    try {
      await access(originalDir);
    } catch {
      return {
        success: false,
        message: `Original directory not found: ${originalDir}`,
        newFiles: 0,
        modifiedFiles: 0,
      };
    }

    // Scan original directory for changes
    const explorer = new SourceExplorer();
    const currentFiles = await explorer.scan(originalDir);

    // Get existing source origins
    const existingOrigins = new Set(
      data.sources?.map((s) => s.origin).filter(Boolean) ?? []
    );

    // Count new files
    let newFiles = 0;
    for (const file of currentFiles) {
      if (!existingOrigins.has(file.path)) {
        newFiles++;
      }
    }

    if (options.check) {
      if (newFiles === 0) {
        return {
          success: true,
          message: 'No changes detected.',
          newFiles: 0,
          modifiedFiles: 0,
        };
      } else {
        return {
          success: true,
          message: `Found ${newFiles} new file(s). Run without --check to sync.`,
          newFiles,
          modifiedFiles: 0,
        };
      }
    }

    // Actually sync (import new files)
    if (newFiles > 0) {
      const importer = new SourceImporter(resolvedDir, manager);
      await importer.importDirectory(originalDir, { recursive: true });
    }

    return {
      success: true,
      message:
        newFiles > 0 ? `Synced ${newFiles} new file(s).` : 'No changes to sync.',
      newFiles,
      modifiedFiles: 0,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      message: `Failed to sync: ${message}`,
      newFiles: 0,
      modifiedFiles: 0,
    };
  }
}
