import type { ParsedSlide, ParsedPresentation } from '../core/parser';

export interface ExtractedCitation {
  id: string;
  locator?: string;
  position: { start: number; end: number };
}

// Pattern to match citations like [@id], [@id, p.42], [@id1; @id2]
// Matches: [@word-chars] or [@word-chars, locator]
const SINGLE_CITATION_PATTERN = /@([\w-]+)(?:,\s*([^;\]]+))?/g;
const CITATION_BRACKET_PATTERN = /\[(@[\w-]+(?:,\s*[^;\]]+)?(?:;\s*@[\w-]+(?:,\s*[^;\]]+)?)*)\]/g;

// Pattern to extract @id from source field in structured citations
const SOURCE_CITATION_PATTERN = /^@([\w-]+)$/;

export class CitationExtractor {
  /**
   * Extract citations from a text string
   */
  extract(text: string): ExtractedCitation[] {
    const citations: ExtractedCitation[] = [];

    // Find all bracketed citation groups
    let bracketMatch: RegExpExecArray | null;
    CITATION_BRACKET_PATTERN.lastIndex = 0;

    while ((bracketMatch = CITATION_BRACKET_PATTERN.exec(text)) !== null) {
      const bracketStart = bracketMatch.index;
      const bracketContent = bracketMatch[1];

      // Parse individual citations within the bracket
      SINGLE_CITATION_PATTERN.lastIndex = 0;
      let singleMatch: RegExpExecArray | null;

      while ((singleMatch = SINGLE_CITATION_PATTERN.exec(bracketContent)) !== null) {
        const id = singleMatch[1];
        const locator = singleMatch[2]?.trim();

        citations.push({
          id,
          locator: locator || undefined,
          position: {
            start: bracketStart,
            end: bracketStart + bracketMatch[0].length,
          },
        });
      }
    }

    return citations;
  }

  /**
   * Extract citations from a slide's content
   */
  extractFromSlide(slide: ParsedSlide): ExtractedCitation[] {
    const allCitations: ExtractedCitation[] = [];
    const seenIds = new Set<string>();

    // Extract from content recursively
    const extractFromValue = (value: unknown): void => {
      if (typeof value === 'string') {
        // Check for structured source citation (e.g., source: "@smith2024")
        const sourceMatch = SOURCE_CITATION_PATTERN.exec(value);
        if (sourceMatch) {
          const id = sourceMatch[1];
          if (!seenIds.has(id)) {
            seenIds.add(id);
            allCitations.push({
              id,
              locator: undefined,
              position: { start: 0, end: value.length },
            });
          }
          return;
        }

        // Regular citation extraction
        const citations = this.extract(value);
        for (const citation of citations) {
          if (!seenIds.has(citation.id)) {
            seenIds.add(citation.id);
            allCitations.push(citation);
          }
        }
      } else if (Array.isArray(value)) {
        for (const item of value) {
          extractFromValue(item);
        }
      } else if (value && typeof value === 'object') {
        for (const v of Object.values(value)) {
          extractFromValue(v);
        }
      }
    };

    // Extract from content
    extractFromValue(slide.content);

    // Extract from notes if present
    if (slide.notes) {
      const notesCitations = this.extract(slide.notes);
      for (const citation of notesCitations) {
        if (!seenIds.has(citation.id)) {
          seenIds.add(citation.id);
          allCitations.push(citation);
        }
      }
    }

    return allCitations;
  }

  /**
   * Extract citations from all slides in a presentation
   */
  extractFromPresentation(presentation: ParsedPresentation): ExtractedCitation[] {
    const allCitations: ExtractedCitation[] = [];
    const seenIds = new Set<string>();

    for (const slide of presentation.slides) {
      const slideCitations = this.extractFromSlide(slide);
      for (const citation of slideCitations) {
        if (!seenIds.has(citation.id)) {
          seenIds.add(citation.id);
          allCitations.push(citation);
        }
      }
    }

    return allCitations;
  }

  /**
   * Get unique citation IDs in order of first appearance
   */
  getUniqueIds(citations: ExtractedCitation[]): string[] {
    const seen = new Set<string>();
    const uniqueIds: string[] = [];

    for (const citation of citations) {
      if (!seen.has(citation.id)) {
        seen.add(citation.id);
        uniqueIds.push(citation.id);
      }
    }

    return uniqueIds;
  }
}
