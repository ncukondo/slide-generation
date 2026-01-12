import type { ReferenceManager, CSLItem } from './manager';
import {
  getYear,
  getFirstAuthorFamily,
  formatFullEntry,
} from './utils';

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
    const entries = sortedItems.map((item) => formatFullEntry(item));

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
          const authorA = getFirstAuthorFamily(a);
          const authorB = getFirstAuthorFamily(b);
          return authorA.localeCompare(authorB);
        });

      case 'year':
        return [...items].sort((a, b) => {
          const yearA = getYear(a);
          const yearB = getYear(b);
          return yearA - yearB;
        });

      default:
        return items;
    }
  }
}
