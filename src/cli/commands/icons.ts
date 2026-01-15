import { Command } from 'commander';
import chalk from 'chalk';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import { IconRegistryLoader } from '../../icons/registry.js';
import { IconResolver } from '../../icons/resolver.js';
import { IconFetcher, isExternalSource } from '../../icons/fetcher.js';
import { IconifyApiClient } from '../../icons/iconify-api.js';
import {
  formatExternalSearchResults,
  type ExternalSearchResult,
  type OutputFormat,
} from '../../icons/search-formatter.js';
import { SearchCache } from '../../icons/search-cache.js';
import { ConfigLoader } from '../../config/loader.js';
import type { IconSource, IconRegistry } from '../../icons/schema.js';
import { ExitCode } from './convert.js';

/** Number of top collections to show in LLM format */
const LLM_TOP_COLLECTIONS = 30;
/** Number of top collections to show in table format */
const TABLE_TOP_COLLECTIONS = 50;
/** Cache TTL in seconds (1 hour) */
const SEARCH_CACHE_TTL = 3600;

interface ListOptions {
  source?: string;
  aliases?: boolean;
  config?: string;
  format?: OutputFormat;
  category?: string;
  showStatus?: boolean;
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

// Re-export isExternalSource for backward compatibility (used by tests)
export { isExternalSource };

/**
 * Extract all icon references from a presentation
 */
export function extractIconReferences(presentation: unknown): string[] {
  const icons = new Set<string>();

  function extractFromValue(value: unknown): void {
    if (value === null || value === undefined) {
      return;
    }

    if (typeof value === 'object') {
      if (Array.isArray(value)) {
        for (const item of value) {
          extractFromValue(item);
        }
      } else {
        const obj = value as Record<string, unknown>;
        // Check for icon property
        if (typeof obj['icon'] === 'string') {
          icons.add(obj['icon']);
        }
        // Recursively check all properties
        for (const key of Object.keys(obj)) {
          extractFromValue(obj[key]);
        }
      }
    }
  }

  extractFromValue(presentation);
  return Array.from(icons);
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
 * Category to alias patterns mapping
 */
const CATEGORY_PATTERNS: Record<string, RegExp[]> = {
  medical: [/^(health|hospital|clinic|ambulance|emergency|stethoscope|syringe|vaccine|pill|medicine|doctor|nurse|patient)/i, /^health:/],
  action: [/^(planning|action|analysis|start|stop|pause|save|edit|delete|add|remove|search|refresh|sync|upload|download)/i],
  status: [/^(success|warning|error|info|question|pending|completed|cancelled|approved|rejected)/i],
  navigation: [/^(home|back|forward|up|down|left|right|expand|collapse|menu|close)/i],
  communication: [/^(email|phone|chat|message|notification|feedback|comment)/i],
  business: [/^(workflow|process|cycle|milestone|target|goal|kpi|metric|report|dashboard|chart)/i],
};

/**
 * Filter aliases by category
 */
export function filterAliasesByCategory(
  aliases: Record<string, string>,
  category: string
): Record<string, string> {
  const patterns = CATEGORY_PATTERNS[category.toLowerCase()];

  if (!patterns) {
    // Unknown category, return all aliases
    return aliases;
  }

  const filtered: Record<string, string> = {};
  for (const [alias, target] of Object.entries(aliases)) {
    const matchesPattern = patterns.some(pattern =>
      pattern.test(alias) || pattern.test(target)
    );
    if (matchesPattern) {
      filtered[alias] = target;
    }
  }

  return filtered;
}

/**
 * Get icon status (local or external)
 */
function getIconStatus(target: string): 'local' | 'external' {
  const colonIndex = target.indexOf(':');
  if (colonIndex === -1) {
    return 'local';
  }
  const prefix = target.substring(0, colonIndex);
  return isExternalSource(prefix) ? 'external' : 'local';
}

/**
 * Format aliases with status for table output
 */
export function formatAliasesListWithStatus(
  aliases: Record<string, string>,
  format: 'table' | 'json'
): string {
  const entries = Object.entries(aliases);

  if (entries.length === 0) {
    return 'No aliases defined.';
  }

  if (format === 'json') {
    const result = entries.map(([alias, target]) => ({
      alias,
      target,
      status: getIconStatus(target),
    }));
    return JSON.stringify(result, null, 2);
  }

  const lines: string[] = ['Icon Aliases with Status:', ''];

  // Calculate column widths
  const maxAliasLen = Math.max(...entries.map(([a]) => a.length), 5);
  const maxTargetLen = Math.max(...entries.map(([, t]) => t.length), 6);

  // Header
  const aliasPad = 'Alias'.padEnd(maxAliasLen);
  const targetPad = 'Target'.padEnd(maxTargetLen);
  lines.push(`  ${aliasPad}  ${targetPad}  Status`);
  lines.push(`  ${'─'.repeat(maxAliasLen)}  ${'─'.repeat(maxTargetLen)}  ${'─'.repeat(10)}`);

  // Sort alphabetically
  entries.sort((a, b) => a[0].localeCompare(b[0]));

  for (const [alias, target] of entries) {
    const aliasStr = alias.padEnd(maxAliasLen);
    const targetStr = target.padEnd(maxTargetLen);
    const status = getIconStatus(target);
    const statusStr = status === 'local' ? '[local]' : '[external]';
    lines.push(`  ${aliasStr}  ${targetStr}  ${statusStr}`);
  }

  return lines.join('\n');
}

/**
 * Format aliases for LLM output (YAML format)
 */
export function formatAliasesListLLM(aliases: Record<string, string>): string {
  const lines: string[] = [
    '# Icon Aliases',
    '# Use these semantic names instead of raw icon references',
    '',
    'aliases:',
  ];

  // Group by category for better readability
  const entries = Object.entries(aliases).sort((a, b) => a[0].localeCompare(b[0]));

  for (const [alias, target] of entries) {
    lines.push(`  ${alias}: "${target}"`);
  }

  return lines.join('\n');
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
    .option('--format <fmt>', 'Output format (table/json/llm)', 'table')
    .option('--category <cat>', 'Filter aliases by category (medical/action/status/navigation/communication/business)')
    .option('--show-status', 'Show local/external status for aliases')
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
          let aliases = registry.getAliases();

          // Filter by category if specified
          if (options.category) {
            aliases = filterAliasesByCategory(aliases, options.category);
          }

          // Choose output format
          let output: string;
          if (format === 'llm') {
            output = formatAliasesListLLM(aliases);
          } else if (options.showStatus) {
            output = formatAliasesListWithStatus(aliases, format === 'json' ? 'json' : 'table');
          } else {
            output = formatAliasesList(aliases, format === 'json' ? 'json' : 'table');
          }
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

interface IconStatus {
  alias: string;
  resolved: string;
  status: 'local' | 'external' | 'missing';
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
        // Load presentation
        let presentationContent: string;
        try {
          presentationContent = await fs.readFile(input, 'utf-8');
        } catch {
          console.error(chalk.red(`Error: File not found: ${input}`));
          process.exitCode = ExitCode.GeneralError;
          return;
        }

        const presentation = parseYaml(presentationContent);

        // Load registry
        const registryPath = await getRegistryPath(options.config);
        const registry = new IconRegistryLoader();
        try {
          await registry.load(registryPath);
        } catch {
          console.error(chalk.red('Error: No icon registry found'));
          process.exitCode = ExitCode.GeneralError;
          return;
        }

        // Extract icons from presentation
        const usedIcons = extractIconReferences(presentation);

        if (usedIcons.length === 0) {
          console.log(chalk.dim('No icons found in presentation.'));
          return;
        }

        // Analyze each icon
        const report = {
          local: [] as IconStatus[],
          external: [] as IconStatus[],
          missing: [] as string[],
        };

        for (const icon of usedIcons) {
          const resolved = registry.resolveAlias(icon);
          const parsed = registry.parseIconReference(resolved);

          if (!parsed) {
            // Not a valid icon reference
            report.missing.push(icon);
            continue;
          }

          const source = registry.getSource(parsed.prefix);
          if (!source) {
            report.missing.push(icon);
            continue;
          }

          if (isExternalSource(parsed.prefix)) {
            report.external.push({ alias: icon, resolved, status: 'external' });
          } else {
            report.local.push({ alias: icon, resolved, status: 'local' });
          }
        }

        // Output report
        console.log(chalk.bold('\nIcon Sync Report'));
        console.log('─'.repeat(40));

        if (report.local.length > 0) {
          console.log(chalk.green(`\n✓ Local icons (${report.local.length}):`));
          for (const icon of report.local) {
            console.log(`  ${icon.alias} -> ${icon.resolved}`);
          }
        }

        if (report.external.length > 0) {
          console.log(chalk.yellow(`\n⚠ External icons (${report.external.length}):`));
          for (const icon of report.external) {
            console.log(`  ${icon.alias} -> ${icon.resolved}`);
          }
        }

        if (report.missing.length > 0) {
          console.log(chalk.red(`\n✗ Missing icons (${report.missing.length}):`));
          for (const icon of report.missing) {
            console.log(`  ${icon}`);
          }
        }

        // Localize external icons if requested
        if (options.localize && report.external.length > 0) {
          console.log(chalk.blue('\nLocalizing external icons...'));

          const registryDir = path.dirname(registryPath);
          const fetchedDir = path.join(registryDir, 'fetched');
          const fetcher = new IconFetcher({ fetchedDir });

          for (const icon of report.external) {
            try {
              await fetcher.fetchAndSave(icon.resolved);
              const parsed = registry.parseIconReference(icon.resolved);
              if (parsed) {
                const setDir = fetcher.getIconifySet(parsed.prefix);
                const localRef = `fetched:${setDir}/${parsed.name}`;
                await updateAliasInRegistry(registryPath, icon.alias, localRef);
                console.log(chalk.green(`  ✓ ${icon.alias} -> ${localRef}`));
              }
            } catch (error) {
              console.log(chalk.red(`  ✗ ${icon.alias}: ${error instanceof Error ? error.message : 'Unknown error'}`));
            }
          }

          console.log(chalk.green('\nDone! External icons have been saved locally.'));
        } else if (report.external.length > 0) {
          console.log(chalk.dim('\nRun with --localize to save external icons locally.'));
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

interface SearchExternalOptions {
  limit?: string;
  set?: string[];
  format?: 'table' | 'json' | 'llm';
  prefixes?: boolean;
  config?: string;
}

/**
 * Create the icons search-external subcommand
 */
function createSearchExternalCommand(): Command {
  return new Command('search-external')
    .description('Search external icon sources (Iconify API)')
    .argument('[query]', 'Search query')
    .option('-l, --limit <n>', 'Maximum results', '20')
    .option('-s, --set <name...>', 'Filter by icon set (can specify multiple)')
    .option('-f, --format <fmt>', 'Output format (table/json/llm)', 'table')
    .option('-p, --prefixes', 'List available icon set prefixes')
    .option('-c, --config <path>', 'Config file path')
    .action(async (query: string | undefined, options: SearchExternalOptions) => {
      try {
        const client = new IconifyApiClient();
        const cacheDir = path.join(os.homedir(), '.cache', 'slide-gen', 'icon-search');
        const cache = new SearchCache({ directory: cacheDir, ttl: SEARCH_CACHE_TTL });

        // Handle --prefixes flag: list available icon sets
        if (options.prefixes) {
          // Try cache first
          const cacheKey = 'collections';
          let collections = await cache.get<Record<string, { name: string; total: number; license?: { spdx?: string; title?: string }; category?: string }>>(cacheKey);
          if (!collections) {
            collections = await client.getCollections();
            await cache.set(cacheKey, collections);
          }

          // Sort by total icons (most popular first)
          const sortedCollections = Object.entries(collections)
            .sort((a, b) => (b[1].total ?? 0) - (a[1].total ?? 0));

          if (options.format === 'json') {
            const output = sortedCollections.map(([prefix, info]) => ({
              prefix,
              name: info.name,
              total: info.total,
              license: info.license?.spdx ?? info.license?.title ?? 'Unknown',
              category: info.category ?? 'Unknown',
            }));
            console.log(JSON.stringify(output, null, 2));
          } else if (options.format === 'llm') {
            const lines: string[] = [
              '# Available Icon Sets',
              '',
              `Total collections: ${sortedCollections.length}`,
              '',
              '## Popular Icon Sets',
              '',
            ];

            // Show top most popular
            const topCollections = sortedCollections.slice(0, LLM_TOP_COLLECTIONS);
            for (const [prefix, info] of topCollections) {
              lines.push(`- **${prefix}**: ${info.name} (${info.total} icons)`);
            }

            lines.push('');
            lines.push('## Usage');
            lines.push('');
            lines.push('```bash');
            lines.push('slide-gen icons search-external <query> --set <prefix>');
            lines.push('```');

            console.log(lines.join('\n'));
          } else {
            // Table format
            console.log('Available Icon Sets');
            console.log('');

            // Calculate column widths
            const displayCollections = sortedCollections.slice(0, TABLE_TOP_COLLECTIONS);
            const maxPrefixLen = Math.max(...displayCollections.map(([p]) => p.length), 6);
            const maxNameLen = Math.min(Math.max(...displayCollections.map(([, i]) => i.name.length), 4), 40);

            // Header
            const prefixPad = 'Prefix'.padEnd(maxPrefixLen);
            const namePad = 'Name'.padEnd(maxNameLen);
            console.log(`  ${prefixPad}  ${namePad}  Icons`);
            console.log(`  ${'─'.repeat(maxPrefixLen)}  ${'─'.repeat(maxNameLen)}  ${'─'.repeat(8)}`);

            for (const [prefix, info] of displayCollections) {
              const prefixStr = prefix.padEnd(maxPrefixLen);
              const nameStr = info.name.slice(0, maxNameLen).padEnd(maxNameLen);
              console.log(`  ${prefixStr}  ${nameStr}  ${String(info.total).padStart(8)}`);
            }

            if (sortedCollections.length > TABLE_TOP_COLLECTIONS) {
              console.log('');
              console.log(chalk.dim(`... and ${sortedCollections.length - TABLE_TOP_COLLECTIONS} more icon sets`));
            }
          }
          return;
        }

        // Search query is required unless --prefixes is specified
        if (!query) {
          console.error(chalk.red('Error: Search query is required'));
          console.error('Usage: slide-gen icons search-external <query>');
          console.error('       slide-gen icons search-external --prefixes');
          process.exitCode = ExitCode.GeneralError;
          return;
        }

        // Perform search with cache
        const limit = parseInt(options.limit ?? '20', 10);
        const searchOptions: { limit: number; prefixes?: string[] } = { limit };
        if (options.set && options.set.length > 0) {
          searchOptions.prefixes = options.set;
        }

        // Build cache key from query and options
        const cacheKey = `search:${query}:${limit}:${(options.set ?? []).sort().join(',')}`;
        let searchResult = await cache.get<{ icons: string[]; total: number; limit: number; start: number }>(cacheKey);
        if (!searchResult) {
          searchResult = await client.search(query, searchOptions);
          await cache.set(cacheKey, searchResult);
        }

        // Transform to ExternalSearchResult format
        const results: ExternalSearchResult = {
          query,
          total: searchResult.total,
          icons: searchResult.icons.map((iconRef) => {
            const colonIndex = iconRef.indexOf(':');
            const set = colonIndex > 0 ? iconRef.substring(0, colonIndex) : '';
            const name = colonIndex > 0 ? iconRef.substring(colonIndex + 1) : iconRef;
            return {
              reference: iconRef,
              set,
              name,
            };
          }),
        };

        // Output results
        const format = (options.format ?? 'table') as OutputFormat;
        const output = formatExternalSearchResults(results, format);
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
 * Create the icons command with subcommands
 */
export function createIconsCommand(): Command {
  const cmd = new Command('icons')
    .description('Manage and search icons');

  cmd.addCommand(createListCommand());
  cmd.addCommand(createSearchCommand());
  cmd.addCommand(createSearchExternalCommand());
  cmd.addCommand(createPreviewCommand());
  cmd.addCommand(createAddCommand());
  cmd.addCommand(createSyncCommand());

  return cmd;
}
