import type { ReferenceManager, CSLItem, CSLAuthor } from './manager';

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

// Pattern to detect Japanese characters
const JAPANESE_PATTERN = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/;

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

    return this.formatFullItem(item);
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
        const authorA = this.getFirstAuthorFamily(a);
        const authorB = this.getFirstAuthorFamily(b);
        return authorA.localeCompare(authorB);
      });
    } else {
      // sort by year
      sortedItems = [...items.values()].sort((a, b) => {
        const yearA = this.getYear(a);
        const yearB = this.getYear(b);
        return yearA - yearB;
      });
    }

    return sortedItems.map((item) => this.formatFullItem(item));
  }

  private formatInlineItem(item: CSLItem): string {
    const author = this.formatAuthorInline(item.author);
    const year = this.getYear(item);
    const identifier = this.getIdentifier(item);

    if (identifier) {
      return `(${author}, ${year}; ${identifier})`;
    }
    return `(${author}, ${year})`;
  }

  private formatFullItem(item: CSLItem): string {
    const parts: string[] = [];

    // Authors
    const isJapanese = this.isJapaneseAuthors(item.author);
    const authors = this.formatAuthorsFull(item.author, isJapanese);
    parts.push(authors);

    // Year
    const year = this.getYear(item);
    parts.push(`(${year}).`);

    // Title
    if (item.title) {
      parts.push(`${item.title}.`);
    }

    // Container (journal)
    if (item['container-title']) {
      const journal = isJapanese
        ? item['container-title']
        : `*${item['container-title']}*`;

      // Volume, issue, pages
      let location = '';
      if (item.volume) {
        location = item.issue
          ? `${item.volume}(${item.issue})`
          : item.volume;
      }
      if (item.page) {
        location = location ? `${location}, ${item.page}` : item.page;
      }

      parts.push(location ? `${journal}, ${location}.` : `${journal}.`);
    }

    // Identifier
    const identifier = this.getIdentifier(item);
    if (identifier) {
      parts.push(identifier);
    }

    return parts.join(' ');
  }

  private formatAuthorInline(authors: CSLAuthor[] | undefined): string {
    if (!authors || authors.length === 0) {
      return 'Unknown';
    }

    const isJapanese = this.isJapaneseAuthors(authors);
    const { etAl, etAlJa, separatorJa } = this.config.author;
    const firstAuthor = authors[0]!;

    if (authors.length === 1) {
      return firstAuthor.family;
    }

    if (authors.length === 2) {
      const separator = isJapanese ? separatorJa : ' & ';
      return `${firstAuthor.family}${separator}${authors[1]!.family}`;
    }

    // 3+ authors
    const suffix = isJapanese ? etAlJa : ` ${etAl}`;
    return `${firstAuthor.family}${suffix}`;
  }

  private formatAuthorsFull(
    authors: CSLAuthor[] | undefined,
    isJapanese: boolean
  ): string {
    if (!authors || authors.length === 0) {
      return 'Unknown';
    }

    if (isJapanese) {
      // Japanese: 田中太郎, 山田花子
      return authors.map((a) => `${a.family}${a.given || ''}`).join(', ');
    }

    // English: Smith, J., Johnson, A., & Williams, B.
    if (authors.length === 1) {
      const a = authors[0]!;
      const initial = a.given ? `${a.given.charAt(0)}.` : '';
      return `${a.family}, ${initial}`;
    }

    const formatted = authors.map((a, i) => {
      const initial = a.given ? `${a.given.charAt(0)}.` : '';
      if (i === authors.length - 1) {
        return `& ${a.family}, ${initial}`;
      }
      return `${a.family}, ${initial}`;
    });

    // Join with ", " for 3+ authors, or ", " for 2 authors
    return formatted.join(', ').replace(', &', ', &');
  }

  private isJapaneseAuthors(authors: CSLAuthor[] | undefined): boolean {
    if (!authors || authors.length === 0) {
      return false;
    }
    // Check first author's family name for Japanese characters
    return JAPANESE_PATTERN.test(authors[0]!.family);
  }

  private getFirstAuthorFamily(item: CSLItem): string {
    return item.author?.[0]?.family || '';
  }

  private getYear(item: CSLItem): number {
    const dateParts = item.issued?.['date-parts'];
    if (dateParts && dateParts[0] && dateParts[0][0]) {
      return dateParts[0][0];
    }
    return 0;
  }

  private getIdentifier(item: CSLItem): string | null {
    if (item.PMID) {
      return `PMID: ${item.PMID}`;
    }
    if (item.DOI) {
      return `DOI: ${item.DOI}`;
    }
    return null;
  }
}
