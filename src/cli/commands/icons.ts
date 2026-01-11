import { Command } from 'commander';
import chalk from 'chalk';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import { IconRegistryLoader } from '../../icons/registry.js';
import { IconResolver } from '../../icons/resolver.js';
import { IconFetcher } from '../../icons/fetcher.js';
import { ConfigLoader } from '../../config/loader.js';
import type { IconSource, IconRegistry } from '../../icons/schema.js';
import { ExitCode } from './convert.js';

type OutputFormat = 'table' | 'json';

interface ListOptions {
  source?: string;
  aliases?: boolean;
  config?: string;
  format?: OutputFormat;
}

interface SearchOptions {
  config?: string;
  format?: OutputFormat;
}

interface PreviewOptions {
  format?: 'svg' | 'html';
  size?: string;
  color?: string;
  config?: string;
}

interface SearchResult {
  query: string;
  aliases: Array<{ alias: string; target: string }>;
  sources: Array<{ name: string; prefix: string; type: string }>;
}

interface AddOptions {
  from?: string;
  search?: boolean;
  saveLocal?: boolean;
  config?: string;
}

interface SyncOptions {
  localize?: boolean;
  config?: string;
}

/**
 * Format icon sources for table output
 */
function formatTableSourceList(sources: IconSource[]): string {
  const lines: string[] = ['Icon Sources:', ''];

  // Calculate column widths
  const maxNameLen = Math.max(...sources.map((s) => s.name.length), 4);
  const maxPrefixLen = Math.max(...sources.map((s) => s.prefix.length), 6);
  const maxTypeLen = Math.max(...sources.map((s) => s.type.length), 4);

  // Header
  const namePad = 'Name'.padEnd(maxNameLen);
  const prefixPad = 'Prefix'.padEnd(maxPrefixLen);
  const typePad = 'Type'.padEnd(maxTypeLen);
  lines.push(`  ${namePad}  ${prefixPad}  ${typePad}`);
  lines.push(`  ${'─'.repeat(maxNameLen)}  ${'─'.repeat(maxPrefixLen)}  ${'─'.repeat(maxTypeLen)}`);

  // Data rows
  for (const source of sources) {
    const name = source.name.padEnd(maxNameLen);
    const prefix = source.prefix.padEnd(maxPrefixLen);
    const type = source.type.padEnd(maxTypeLen);
    lines.push(`  ${name}  ${prefix}  ${type}`);
  }

  return lines.join('\n');
}

/**
 * Format icon sources for JSON output
 */
function formatJsonSourceList(sources: IconSource[]): string {
  const output = sources.map((s) => ({
    name: s.name,
    type: s.type,
    prefix: s.prefix,
    ...(s.url ? { url: s.url } : {}),
    ...(s.path ? { path: s.path } : {}),
  }));
  return JSON.stringify(output, null, 2);
}

/**
 * Format icon source list in the specified format
 */
export function formatIconSourceList(
  sources: IconSource[],
  format: OutputFormat
): string {
  switch (format) {
    case 'json':
      return formatJsonSourceList(sources);
    case 'table':
    default:
      return formatTableSourceList(sources);
  }
}

/**
 * Format aliases for table output
 */
function formatTableAliases(aliases: Record<string, string>): string {
  const entries = Object.entries(aliases);

  if (entries.length === 0) {
    return 'No aliases defined.';
  }

  const lines: string[] = ['Icon Aliases:', ''];

  // Calculate column widths
  const maxAliasLen = Math.max(...entries.map(([a]) => a.length), 5);
  const maxTargetLen = Math.max(...entries.map(([, t]) => t.length), 6);

  // Header
  const aliasPad = 'Alias'.padEnd(maxAliasLen);
  const targetPad = 'Target'.padEnd(maxTargetLen);
  lines.push(`  ${aliasPad}  ${targetPad}`);
  lines.push(`  ${'─'.repeat(maxAliasLen)}  ${'─'.repeat(maxTargetLen)}`);

  // Sort alphabetically
  entries.sort((a, b) => a[0].localeCompare(b[0]));

  for (const [alias, target] of entries) {
    const aliasStr = alias.padEnd(maxAliasLen);
    lines.push(`  ${aliasStr}  ${target}`);
  }

  return lines.join('\n');
}

/**
 * Format aliases for JSON output
 */
function formatJsonAliases(aliases: Record<string, string>): string {
  return JSON.stringify(aliases, null, 2);
}

/**
 * Format aliases list in the specified format
 */
export function formatAliasesList(
  aliases: Record<string, string>,
  format: OutputFormat
): string {
  switch (format) {
    case 'json':
      return formatJsonAliases(aliases);
    case 'table':
    default:
      return formatTableAliases(aliases);
  }
}

/**
 * Format search results for table output
 */
function formatTableSearchResults(results: SearchResult): string {
  const lines: string[] = [`Search results for "${results.query}"`, ''];

  const hasResults = results.aliases.length > 0 || results.sources.length > 0;

  if (!hasResults) {
    lines.push('No results found.');
    return lines.join('\n');
  }

  // Aliases section
  if (results.aliases.length > 0) {
    lines.push('Aliases:');
    for (const { alias, target } of results.aliases) {
      lines.push(`  ${alias} → ${target}`);
    }
    lines.push('');
  }

  // Sources section
  if (results.sources.length > 0) {
    lines.push('Sources:');
    for (const source of results.sources) {
      lines.push(`  ${source.name} (${source.prefix}:) [${source.type}]`);
    }
  }

  return lines.join('\n').trim();
}

/**
 * Format search results for JSON output
 */
function formatJsonSearchResults(results: SearchResult): string {
  return JSON.stringify(results, null, 2);
}

/**
 * Format search results in the specified format
 */
export function formatSearchResults(
  results: SearchResult,
  format: OutputFormat
): string {
  switch (format) {
    case 'json':
      return formatJsonSearchResults(results);
    case 'table':
    default:
      return formatTableSearchResults(results);
  }
}

/**
 * Load icon registry from config
 */
async function loadRegistry(configPath?: string): Promise<IconRegistryLoader> {
  const configLoader = new ConfigLoader();

  if (!configPath) {
    configPath = await configLoader.findConfig(process.cwd());
  }

  const config = await configLoader.load(configPath);
  const registry = new IconRegistryLoader();

  if (config.icons?.registry) {
    await registry.load(config.icons.registry);
  }

  return registry;
}

/**
 * Search for icons matching query
 */
function searchIcons(
  registry: IconRegistryLoader,
  query: string
): SearchResult {
  const lowerQuery = query.toLowerCase();

  // Search aliases
  const aliases = Object.entries(registry.getAliases())
    .filter(
      ([alias, target]) =>
        alias.toLowerCase().includes(lowerQuery) ||
        target.toLowerCase().includes(lowerQuery)
    )
    .map(([alias, target]) => ({ alias, target }));

  // Search sources
  const sources = registry
    .getSources()
    .filter(
      (source) =>
        source.name.toLowerCase().includes(lowerQuery) ||
        source.prefix.toLowerCase().includes(lowerQuery)
    )
    .map((s) => ({ name: s.name, prefix: s.prefix, type: s.type }));

  return { query, aliases, sources };
}

/**
 * Create the icons list subcommand
 */
function createListCommand(): Command {
  return new Command('list')
    .description('List icon sources and aliases')
    .option('--source <name>', 'Filter by source name')
    .option('--aliases', 'Show only aliases')
    .option('--format <fmt>', 'Output format (table/json)', 'table')
    .option('-c, --config <path>', 'Config file path')
    .action(async (options: ListOptions) => {
      try {
        const registry = await loadRegistry(options.config);

        if (!registry.isLoaded()) {
          console.log('No icon registry found.');
          return;
        }

        const format = (options.format ?? 'table') as OutputFormat;

        if (options.aliases) {
          // Show only aliases
          const aliases = registry.getAliases();
          const output = formatAliasesList(aliases, format);
          console.log(output);
          return;
        }

        if (options.source) {
          // Filter by source
          const sources = registry.getSources().filter(
            (s) => s.name === options.source || s.prefix === options.source
          );

          if (sources.length === 0) {
            console.error(chalk.yellow(`No source found matching "${options.source}"`));
            return;
          }

          const output = formatIconSourceList(sources, format);
          console.log(output);
          return;
        }

        // Show all sources
        const sources = registry.getSources();
        const output = formatIconSourceList(sources, format);
        console.log(output);
      } catch (error) {
        console.error(
          chalk.red(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
        );
        process.exitCode = ExitCode.GeneralError;
      }
    });
}

/**
 * Create the icons search subcommand
 */
function createSearchCommand(): Command {
  return new Command('search')
    .description('Search for icons by name or keyword')
    .argument('<query>', 'Search query')
    .option('--format <fmt>', 'Output format (table/json)', 'table')
    .option('-c, --config <path>', 'Config file path')
    .action(async (query: string, options: SearchOptions) => {
      try {
        const registry = await loadRegistry(options.config);

        if (!registry.isLoaded()) {
          console.log('No icon registry found.');
          return;
        }

        const format = (options.format ?? 'table') as OutputFormat;
        const results = searchIcons(registry, query);
        const output = formatSearchResults(results, format);
        console.log(output);
      } catch (error) {
        console.error(
          chalk.red(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
        );
        process.exitCode = ExitCode.GeneralError;
      }
    });
}

/**
 * Add an alias to the registry file
 */
export async function addAliasToRegistry(
  registryPath: string,
  alias: string,
  target: string
): Promise<void> {
  const content = await fs.readFile(registryPath, 'utf-8');
  const registry = parseYaml(content) as IconRegistry;

  // Check if alias already exists
  if (registry.aliases && registry.aliases[alias]) {
    throw new Error(`Alias already exists: ${alias}`);
  }

  // Add the new alias
  if (!registry.aliases) {
    registry.aliases = {};
  }
  registry.aliases[alias] = target;

  // Write back
  await fs.writeFile(registryPath, stringifyYaml(registry), 'utf-8');
}

/**
 * Update an existing alias in the registry file (or add if not exists)
 */
export async function updateAliasInRegistry(
  registryPath: string,
  alias: string,
  target: string
): Promise<void> {
  const content = await fs.readFile(registryPath, 'utf-8');
  const registry = parseYaml(content) as IconRegistry;

  // Add or update the alias
  if (!registry.aliases) {
    registry.aliases = {};
  }
  registry.aliases[alias] = target;

  // Write back
  await fs.writeFile(registryPath, stringifyYaml(registry), 'utf-8');
}

/**
 * Get registry path from config
 */
async function getRegistryPath(configPath?: string): Promise<string> {
  const configLoader = new ConfigLoader();

  let resolvedConfigPath = configPath;
  if (!resolvedConfigPath) {
    resolvedConfigPath = await configLoader.findConfig(process.cwd());
  }

  if (!resolvedConfigPath) {
    // No config found, use default registry path
    return path.join(process.cwd(), 'icons', 'registry.yaml');
  }

  const config = await configLoader.load(resolvedConfigPath);

  if (config.icons?.registry) {
    // Make path relative to config file location
    const configDir = path.dirname(resolvedConfigPath);
    return path.resolve(configDir, config.icons.registry);
  }

  // Default registry path
  return path.join(process.cwd(), 'icons', 'registry.yaml');
}

/**
 * Create the icons add subcommand
 */
function createAddCommand(): Command {
  return new Command('add')
    .description('Add an icon alias to registry (fetches and saves locally by default)')
    .argument('<alias>', 'Alias name to add')
    .option('--from <icon>', 'Source icon reference (e.g., health:stethoscope)')
    .option('--search', 'Search for icon interactively')
    .option('--no-save-local', 'Do not save SVG locally (not recommended)')
    .option('-c, --config <path>', 'Config file path')
    .action(async (alias: string, options: AddOptions) => {
      try {
        const registryPath = await getRegistryPath(options.config);

        // Check if alias already exists
        const registry = new IconRegistryLoader();
        await registry.load(registryPath);

        if (registry.getAliases()[alias]) {
          console.error(chalk.red(`Error: Alias already exists: ${alias}`));
          process.exitCode = ExitCode.GeneralError;
          return;
        }

        // Get icon reference
        let iconRef: string;
        if (options.from) {
          iconRef = options.from;
        } else if (options.search) {
          console.error(chalk.yellow('Interactive search not yet implemented. Use --from instead.'));
          process.exitCode = ExitCode.GeneralError;
          return;
        } else {
          console.error(chalk.red('Error: Either --from or --search is required'));
          process.exitCode = ExitCode.GeneralError;
          return;
        }

        // Get fetched directory from registry path
        const registryDir = path.dirname(registryPath);
        const fetchedDir = path.join(registryDir, 'fetched');

        // Fetch and save
        const fetcher = new IconFetcher({
          fetchedDir,
          saveLocally: options.saveLocal !== false,
        });

        const saveLocal = options.saveLocal !== false;

        try {
          await fetcher.fetchAndSave(iconRef);
        } catch (error) {
          console.error(chalk.red(`Error fetching icon: ${error instanceof Error ? error.message : 'Unknown error'}`));
          process.exitCode = ExitCode.GeneralError;
          return;
        }

        // Determine final reference
        let finalRef: string;
        if (saveLocal) {
          const parsed = fetcher.parseReference(iconRef);
          if (!parsed) {
            console.error(chalk.red(`Invalid icon reference: ${iconRef}`));
            process.exitCode = ExitCode.GeneralError;
            return;
          }
          const setDir = fetcher.getIconifySet(parsed.prefix);
          finalRef = `fetched:${setDir}/${parsed.name}`;
        } else {
          finalRef = iconRef;
        }

        // Add to registry
        await addAliasToRegistry(registryPath, alias, finalRef);

        if (saveLocal) {
          console.log(chalk.green(`Added alias: ${alias} -> ${finalRef}`));
          console.log(chalk.dim(`SVG saved to: ${fetchedDir}/${fetcher.getIconifySet(fetcher.parseReference(iconRef)!.prefix)}/${fetcher.parseReference(iconRef)!.name}.svg`));
        } else {
          console.log(chalk.yellow(`Added alias: ${alias} -> ${finalRef}`));
          console.log(chalk.yellow('Warning: SVG not saved locally. Project may not be reproducible.'));
        }
      } catch (error) {
        console.error(
          chalk.red(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
        );
        process.exitCode = ExitCode.GeneralError;
      }
    });
}

/**
 * Create the icons sync subcommand
 */
function createSyncCommand(): Command {
  return new Command('sync')
    .description('Analyze icon usage and localize external icons')
    .argument('<input>', 'Presentation YAML file')
    .option('--localize', 'Download and save external icons locally')
    .option('-c, --config <path>', 'Config file path')
    .action(async (input: string, options: SyncOptions) => {
      try {
        // TODO: Full implementation in Step 4
        console.log(chalk.blue('Icon sync analysis for:'), input);

        if (options.localize) {
          console.log(chalk.blue('Localizing external icons...'));
        }

        console.log(chalk.dim('Full sync implementation coming in next step.'));
      } catch (error) {
        console.error(
          chalk.red(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
        );
        process.exitCode = ExitCode.GeneralError;
      }
    });
}

/**
 * Create the icons preview subcommand
 */
function createPreviewCommand(): Command {
  return new Command('preview')
    .description('Preview an icon')
    .argument('<name>', 'Icon name or alias')
    .option('--format <fmt>', 'Output format (svg/html)', 'html')
    .option('--size <size>', 'Icon size', '24px')
    .option('--color <color>', 'Icon color', 'currentColor')
    .option('-c, --config <path>', 'Config file path')
    .action(async (name: string, options: PreviewOptions) => {
      try {
        const registry = await loadRegistry(options.config);

        if (!registry.isLoaded()) {
          console.error(chalk.red('Error: No icon registry found'));
          process.exitCode = ExitCode.GeneralError;
          return;
        }

        const resolver = new IconResolver(registry);

        const iconOptions: { size?: string; color?: string } = {};
        if (options.size) {
          iconOptions.size = options.size;
        }
        if (options.color) {
          iconOptions.color = options.color;
        }

        const rendered = await resolver.render(name, iconOptions);

        if (options.format === 'svg') {
          // Output raw SVG if it's an SVG
          console.log(rendered);
        } else {
          // Wrap in HTML for preview
          const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Icon Preview: ${name}</title>
  <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet">
  <style>
    body {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      font-family: system-ui, sans-serif;
      background: #f5f5f5;
    }
    .preview {
      padding: 2rem;
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      text-align: center;
    }
    .icon-container {
      margin-bottom: 1rem;
    }
    .icon-name {
      color: #666;
      font-size: 14px;
    }
    .material-icons {
      font-family: 'Material Icons';
      font-weight: normal;
      font-style: normal;
      display: inline-block;
      line-height: 1;
      text-transform: none;
      letter-spacing: normal;
      word-wrap: normal;
      white-space: nowrap;
      direction: ltr;
      -webkit-font-smoothing: antialiased;
    }
  </style>
</head>
<body>
  <div class="preview">
    <div class="icon-container">
      ${rendered}
    </div>
    <div class="icon-name">${name}</div>
  </div>
</body>
</html>`;
          console.log(html);
        }
      } catch (error) {
        console.error(
          chalk.red(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
        );
        process.exitCode = ExitCode.GeneralError;
      }
    });
}

/**
 * Create the icons command with subcommands
 */
export function createIconsCommand(): Command {
  const cmd = new Command('icons')
    .description('Manage and search icons');

  cmd.addCommand(createListCommand());
  cmd.addCommand(createSearchCommand());
  cmd.addCommand(createPreviewCommand());
  cmd.addCommand(createAddCommand());
  cmd.addCommand(createSyncCommand());

  return cmd;
}
