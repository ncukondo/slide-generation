import type { ReferenceManager, CSLItem, CSLAuthor } from './manager';
import {
  isJapaneseAuthors,
  getYear,
  getIdentifier,
  getFirstAuthorFamily,
  formatFullEntry,
} from './utils';

export interface FormatterConfig {
  author?: {
    maxAuthors?: number;
    etAl?: string;
    etAlJa?: string;
    separatorJa?: string;
  };
  inline?: {
    authorSep?: string;
    identifierSep?: string;
    multiSep?: string;
  };
}

const DEFAULT_CONFIG: Required<FormatterConfig> = {
  author: {
    maxAuthors: 2,
    etAl: 'et al.',
    etAlJa: 'ほか',
    separatorJa: '・',
  },
  inline: {
    authorSep: ', ',
    identifierSep: '; ',
    multiSep: '), (',
  },
};

// Citation patterns for expansion
const CITATION_BRACKET_PATTERN =
  /\[(@[\w-]+(?:,\s*[^;\]]+)?(?:;\s*@[\w-]+(?:,\s*[^;\]]+)?)*)\]/g;
const SINGLE_CITATION_PATTERN = /@([\w-]+)(?:,\s*([^;\]]+))?/g;

/**
 * Formats citations for inline display and bibliography generation
 */
export class CitationFormatter {
  private config: Required<FormatterConfig>;
  private availabilityChecked = false;
  private isAvailable = false;

  constructor(
    private manager: ReferenceManager,
    config?: FormatterConfig
  ) {
    this.config = {
      author: { ...DEFAULT_CONFIG.author, ...config?.author },
      inline: { ...DEFAULT_CONFIG.inline, ...config?.inline },
    };
  }

  /**
   * Check if reference-manager is available (cached)
   */
  private async checkAvailability(): Promise<boolean> {
    if (!this.availabilityChecked) {
      this.isAvailable = await this.manager.isAvailable();
      this.availabilityChecked = true;
    }
    return this.isAvailable;
  }

  /**
   * Format an inline citation
   * e.g., "(Smith et al., 2024; PMID: 12345678)"
   */
  async formatInline(id: string): Promise<string> {
    const item = await this.manager.getById(id);
    if (!item) {
      return `[${id}]`;
    }

    return this.formatInlineItem(item);
  }

  /**
   * Format a full bibliography citation
   */
  async formatFull(id: string): Promise<string> {
    const item = await this.manager.getById(id);
    if (!item) {
      return `[${id}]`;
    }

    return formatFullEntry(item);
  }

  /**
   * Expand all citations in text
   * e.g., "[@smith2024]" -> "(Smith et al., 2024; PMID: 12345678)"
   */
  async expandCitations(text: string): Promise<string> {
    // Check if reference-manager is available
    if (!(await this.checkAvailability())) {
      // Return original text if reference-manager is not available
      return text;
    }

    // First, collect all citation IDs
    const ids = new Set<string>();
    CITATION_BRACKET_PATTERN.lastIndex = 0;

    let match: RegExpExecArray | null;
    while ((match = CITATION_BRACKET_PATTERN.exec(text)) !== null) {
      const content = match[1];
      SINGLE_CITATION_PATTERN.lastIndex = 0;

      let singleMatch: RegExpExecArray | null;
      while ((singleMatch = SINGLE_CITATION_PATTERN.exec(content!)) !== null) {
        ids.add(singleMatch[1]!);
      }
    }

    // Fetch all items at once
    const items = await this.manager.getByIds([...ids]);

    // Replace citations
    CITATION_BRACKET_PATTERN.lastIndex = 0;
    let result = text;

    // Reset and iterate again for replacement
    const matches: Array<{
      start: number;
      end: number;
      replacement: string;
    }> = [];

    CITATION_BRACKET_PATTERN.lastIndex = 0;
    while ((match = CITATION_BRACKET_PATTERN.exec(text)) !== null) {
      const content = match[1];
      const replacements: string[] = [];

      SINGLE_CITATION_PATTERN.lastIndex = 0;
      let singleMatch: RegExpExecArray | null;
      while ((singleMatch = SINGLE_CITATION_PATTERN.exec(content!)) !== null) {
        const id = singleMatch[1]!;
        const item = items.get(id);
        if (item) {
          replacements.push(this.formatInlineItem(item));
        } else {
          replacements.push(`[${id}]`);
        }
      }

      matches.push({
        start: match.index,
        end: match.index + match[0].length,
        replacement: replacements.join(', '),
      });
    }

    // Apply replacements from end to start to maintain positions
    for (const m of [...matches].reverse()) {
      result = result.slice(0, m.start) + m.replacement + result.slice(m.end);
    }

    return result;
  }

  /**
   * Generate bibliography entries
   */
  async generateBibliography(
    ids: string[],
    sort: 'author' | 'year' | 'citation-order' = 'citation-order'
  ): Promise<string[]> {
    if (ids.length === 0) {
      return [];
    }

    const items = await this.manager.getByIds(ids);
    let sortedItems: CSLItem[];

    if (sort === 'citation-order') {
      // Keep order of ids, filtering out non-existent
      sortedItems = ids
        .map((id) => items.get(id))
        .filter((item): item is CSLItem => item !== undefined);
    } else if (sort === 'author') {
      sortedItems = [...items.values()].sort((a, b) => {
        const authorA = getFirstAuthorFamily(a);
        const authorB = getFirstAuthorFamily(b);
        return authorA.localeCompare(authorB);
      });
    } else {
      // sort by year
      sortedItems = [...items.values()].sort((a, b) => {
        const yearA = getYear(a);
        const yearB = getYear(b);
        return yearA - yearB;
      });
    }

    return sortedItems.map((item) => formatFullEntry(item));
  }

  private formatInlineItem(item: CSLItem): string {
    const author = this.formatAuthorInline(item.author);
    const year = getYear(item);
    const identifier = getIdentifier(item);

    if (identifier) {
      return `(${author}, ${year}; ${identifier})`;
    }
    return `(${author}, ${year})`;
  }

  private formatAuthorInline(authors: CSLAuthor[] | undefined): string {
    if (!authors || authors.length === 0) {
      return 'Unknown';
    }

    const japanese = isJapaneseAuthors(authors);
    const { etAl, etAlJa, separatorJa } = this.config.author;
    const firstAuthor = authors[0]!;

    if (authors.length === 1) {
      return firstAuthor.family;
    }

    if (authors.length === 2) {
      const separator = japanese ? separatorJa : ' & ';
      return `${firstAuthor.family}${separator}${authors[1]!.family}`;
    }

    // 3+ authors
    const suffix = japanese ? etAlJa : ` ${etAl}`;
    return `${firstAuthor.family}${suffix}`;
  }
}
