import type { ReferenceManager, CSLItem, CSLAuthor } from './manager';

/**
 * Options for bibliography generation
 */
export interface BibliographyOptions {
  /** Sort order: citation-order (default), author, or year */
  sort?: 'citation-order' | 'author' | 'year';
}

/**
 * Result of bibliography generation
 */
export interface BibliographyResult {
  /** Formatted bibliography entries */
  entries: string[];
  /** CSL items that were found */
  items: CSLItem[];
  /** Citation IDs that were not found */
  missing: string[];
}

// Pattern to detect Japanese characters
const JAPANESE_PATTERN = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/;

/**
 * Generates bibliography entries from citation IDs
 */
export class BibliographyGenerator {
  constructor(private manager: ReferenceManager) {}

  /**
   * Generate bibliography entries from citation IDs
   */
  async generate(
    citationIds: string[],
    options: BibliographyOptions = {}
  ): Promise<BibliographyResult> {
    const { sort = 'citation-order' } = options;

    if (citationIds.length === 0) {
      return { entries: [], items: [], missing: [] };
    }

    // Deduplicate IDs while preserving order
    const uniqueIds = [...new Set(citationIds)];

    // Fetch all items
    const itemsMap = await this.manager.getByIds(uniqueIds);

    // Separate found and missing
    const missing: string[] = [];
    const foundItems: CSLItem[] = [];

    for (const id of uniqueIds) {
      const item = itemsMap.get(id);
      if (item) {
        foundItems.push(item);
      } else {
        missing.push(id);
      }
    }

    // Sort items
    const sortedItems = this.sortItems(foundItems, sort);

    // Format entries
    const entries = sortedItems.map((item) => this.formatEntry(item));

    return {
      entries,
      items: sortedItems,
      missing,
    };
  }

  /**
   * Sort items according to the specified order
   */
  private sortItems(
    items: CSLItem[],
    sort: 'citation-order' | 'author' | 'year'
  ): CSLItem[] {
    switch (sort) {
      case 'citation-order':
        // Keep original order (already in order from foundItems loop)
        return items;

      case 'author':
        return [...items].sort((a, b) => {
          const authorA = this.getFirstAuthorFamily(a);
          const authorB = this.getFirstAuthorFamily(b);
          return authorA.localeCompare(authorB);
        });

      case 'year':
        return [...items].sort((a, b) => {
          const yearA = this.getYear(a);
          const yearB = this.getYear(b);
          return yearA - yearB;
        });

      default:
        return items;
    }
  }

  /**
   * Format a single bibliography entry
   */
  private formatEntry(item: CSLItem): string {
    const parts: string[] = [];
    const isJapanese = this.isJapaneseAuthors(item.author);

    // Authors
    const authors = this.formatAuthors(item.author, isJapanese);
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

  /**
   * Format authors for bibliography
   */
  private formatAuthors(
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

    return formatted.join(', ').replace(', &', ', &');
  }

  /**
   * Check if authors are Japanese
   */
  private isJapaneseAuthors(authors: CSLAuthor[] | undefined): boolean {
    if (!authors || authors.length === 0) {
      return false;
    }
    return JAPANESE_PATTERN.test(authors[0]!.family);
  }

  /**
   * Get the first author's family name for sorting
   */
  private getFirstAuthorFamily(item: CSLItem): string {
    return item.author?.[0]?.family || '';
  }

  /**
   * Get the year from CSL item
   */
  private getYear(item: CSLItem): number {
    const dateParts = item.issued?.['date-parts'];
    if (dateParts && dateParts[0] && dateParts[0][0]) {
      return dateParts[0][0];
    }
    return 0;
  }

  /**
   * Get identifier string (PMID or DOI)
   */
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
