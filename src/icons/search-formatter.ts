/**
 * External Icon Search Result Formatter
 *
 * Formats search results from Iconify API for various output formats.
 */

export interface ExternalSearchResultIcon {
  /** Full icon reference (e.g., "mdi:heart") */
  reference: string;
  /** Icon set name (e.g., "mdi") */
  set: string;
  /** Icon name within the set (e.g., "heart") */
  name: string;
  /** Human-readable set name (optional) */
  setName?: string;
  /** Icon style (outline/solid/fill) */
  style?: string;
}

export interface ExternalSearchResult {
  /** Search query */
  query: string;
  /** Total number of matching icons */
  total: number;
  /** List of icons */
  icons: ExternalSearchResultIcon[];
}

export type OutputFormat = 'table' | 'json' | 'llm';

/**
 * Format search results for table output
 */
function formatAsTable(results: ExternalSearchResult): string {
  const lines: string[] = [];

  lines.push(`External Icon Search: "${results.query}"`);
  lines.push('');

  if (results.icons.length === 0) {
    lines.push('No icons found.');
    return lines.join('\n');
  }

  lines.push(`Found ${results.total} icons (showing ${results.icons.length}):`);
  lines.push('');

  // Calculate column widths
  const maxRefLen = Math.max(...results.icons.map((i) => i.reference.length), 9);
  const maxSetLen = Math.max(...results.icons.map((i) => i.set.length), 3);
  const maxNameLen = Math.max(...results.icons.map((i) => i.name.length), 4);

  // Header
  const refPad = 'Reference'.padEnd(maxRefLen);
  const setPad = 'Set'.padEnd(maxSetLen);
  const namePad = 'Name'.padEnd(maxNameLen);
  lines.push(`  ${refPad}  ${setPad}  ${namePad}`);
  lines.push(`  ${'─'.repeat(maxRefLen)}  ${'─'.repeat(maxSetLen)}  ${'─'.repeat(maxNameLen)}`);

  // Data rows
  for (const icon of results.icons) {
    const ref = icon.reference.padEnd(maxRefLen);
    const set = icon.set.padEnd(maxSetLen);
    const name = icon.name.padEnd(maxNameLen);
    lines.push(`  ${ref}  ${set}  ${name}`);
  }

  return lines.join('\n');
}

/**
 * Format search results for JSON output
 */
function formatAsJson(results: ExternalSearchResult): string {
  return JSON.stringify(
    {
      query: results.query,
      total: results.total,
      icons: results.icons.map((icon) => ({
        reference: icon.reference,
        set: icon.set,
        name: icon.name,
        ...(icon.setName ? { setName: icon.setName } : {}),
        ...(icon.style ? { style: icon.style } : {}),
      })),
    },
    null,
    2
  );
}

/**
 * Format search results for LLM-friendly output
 */
function formatAsLlm(results: ExternalSearchResult): string {
  const lines: string[] = [];

  lines.push('# External Icon Search Results');
  lines.push('');
  lines.push(`Query: ${results.query}`);
  lines.push(`Total results: ${results.total}`);
  lines.push('');

  if (results.icons.length === 0) {
    lines.push('No icons found for this query.');
    lines.push('');
    lines.push('## Suggestions');
    lines.push('- Try a more general search term');
    lines.push('- Check the spelling');
    lines.push('- Use `slide-gen icons search-external --prefixes` to see available icon sets');
    return lines.join('\n');
  }

  lines.push('## Icons Found');
  lines.push('');

  // Group icons by set for better organization
  const bySet = new Map<string, ExternalSearchResultIcon[]>();
  for (const icon of results.icons) {
    const setIcons = bySet.get(icon.set) || [];
    setIcons.push(icon);
    bySet.set(icon.set, setIcons);
  }

  for (const [set, icons] of bySet) {
    lines.push(`### ${set}`);
    for (const icon of icons) {
      lines.push(`- \`${icon.reference}\``);
    }
    lines.push('');
  }

  lines.push('## Usage');
  lines.push('');
  lines.push('To add an icon to your project:');
  lines.push('```bash');
  lines.push(`slide-gen icons add <alias> --from ${results.icons[0]?.reference ?? 'prefix:icon-name'}`);
  lines.push('```');
  lines.push('');
  lines.push('Example:');
  if (results.icons.length > 0) {
    const firstIcon = results.icons[0]!;
    lines.push('```bash');
    lines.push(`slide-gen icons add ${firstIcon.name} --from ${firstIcon.reference}`);
    lines.push('```');
  }

  return lines.join('\n');
}

/**
 * Format external search results for the specified output format
 */
export function formatExternalSearchResults(
  results: ExternalSearchResult,
  format: OutputFormat
): string {
  switch (format) {
    case 'json':
      return formatAsJson(results);
    case 'llm':
      return formatAsLlm(results);
    case 'table':
    default:
      return formatAsTable(results);
  }
}
