import { Command } from 'commander';
import chalk from 'chalk';
import { IconRegistryLoader } from '../../icons/registry.js';
import { IconResolver } from '../../icons/resolver.js';
import { ConfigLoader } from '../../config/loader.js';
import type { IconSource } from '../../icons/schema.js';
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

  return cmd;
}
