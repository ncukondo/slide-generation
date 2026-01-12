import type { CSLItem, CSLAuthor } from './manager';

/**
 * Pattern to detect Japanese characters (Hiragana, Katakana, Kanji)
 */
export const JAPANESE_PATTERN = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/;

/**
 * Check if authors contain Japanese characters
 */
export function isJapaneseAuthors(authors: CSLAuthor[] | undefined): boolean {
  if (!authors || authors.length === 0) {
    return false;
  }
  return JAPANESE_PATTERN.test(authors[0]!.family);
}

/**
 * Get the year from a CSL item
 */
export function getYear(item: CSLItem): number {
  const dateParts = item.issued?.['date-parts'];
  if (dateParts && dateParts[0] && dateParts[0][0]) {
    return dateParts[0][0];
  }
  return 0;
}

/**
 * Get identifier string (PMID preferred over DOI)
 */
export function getIdentifier(item: CSLItem): string | null {
  if (item.PMID) {
    return `PMID: ${item.PMID}`;
  }
  if (item.DOI) {
    return `DOI: ${item.DOI}`;
  }
  return null;
}

/**
 * Get the first author's family name
 */
export function getFirstAuthorFamily(item: CSLItem): string {
  return item.author?.[0]?.family || '';
}

/**
 * Format authors in full bibliography style
 * Japanese: 田中太郎, 山田花子
 * English: Smith, J., Johnson, A., & Williams, B.
 */
export function formatAuthorsFull(
  authors: CSLAuthor[] | undefined,
  isJapanese: boolean
): string {
  if (!authors || authors.length === 0) {
    return 'Unknown';
  }

  if (isJapanese) {
    return authors.map((a) => `${a.family}${a.given || ''}`).join(', ');
  }

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
 * Format a CSL item as a full bibliography entry
 */
export function formatFullEntry(item: CSLItem): string {
  const parts: string[] = [];
  const japanese = isJapaneseAuthors(item.author);

  // Authors
  const authors = formatAuthorsFull(item.author, japanese);
  parts.push(authors);

  // Year
  const year = getYear(item);
  parts.push(`(${year}).`);

  // Title
  if (item.title) {
    parts.push(`${item.title}.`);
  }

  // Container (journal)
  if (item['container-title']) {
    const journal = japanese
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
  const identifier = getIdentifier(item);
  if (identifier) {
    parts.push(identifier);
  }

  return parts.join(' ');
}
