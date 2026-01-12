import type { ReferenceManager } from './manager';
import type { ParsedSlide } from '../core/parser';
import { CitationExtractor } from './extractor';

export interface ValidationResult {
  valid: boolean;
  found: string[];
  missing: string[];
  skipped?: boolean;
  reason?: string;
}

export interface CitationLocation {
  slide: number;
  text: string;
}

export interface MissingCitation {
  id: string;
  locations: CitationLocation[];
}

export interface DetailedValidationResult extends ValidationResult {
  missingDetails: MissingCitation[];
}

export class ReferenceValidator {
  private extractor = new CitationExtractor();
  private availableCache: boolean | null = null;

  constructor(private manager: ReferenceManager) {}

  /**
   * Check if reference-manager is available (cached)
   */
  private async checkAvailable(): Promise<boolean> {
    if (this.availableCache === null) {
      this.availableCache = await this.manager.isAvailable();
    }
    return this.availableCache;
  }

  async validateCitations(citationIds: string[]): Promise<ValidationResult> {
    // Check if reference-manager is available (cached)
    const available = await this.checkAvailable();
    if (!available) {
      return {
        valid: true,
        found: [],
        missing: [],
        skipped: true,
        reason: 'reference-manager CLI is not available',
      };
    }

    // Handle empty citations array
    if (citationIds.length === 0) {
      return {
        valid: true,
        found: [],
        missing: [],
      };
    }

    // Get references from library
    const references = await this.manager.getByIds(citationIds);

    // Categorize citations as found or missing
    const found: string[] = [];
    const missing: string[] = [];

    for (const id of citationIds) {
      if (references.has(id)) {
        found.push(id);
      } else {
        missing.push(id);
      }
    }

    return {
      valid: missing.length === 0,
      found,
      missing,
    };
  }

  async validateWithLocations(
    slides: ParsedSlide[]
  ): Promise<DetailedValidationResult> {
    // Check if reference-manager is available (cached)
    const available = await this.checkAvailable();
    if (!available) {
      return {
        valid: true,
        found: [],
        missing: [],
        skipped: true,
        reason: 'reference-manager CLI is not available',
        missingDetails: [],
      };
    }

    // Build a map of citation ID -> locations
    const citationLocations = new Map<string, CitationLocation[]>();
    const allCitationIds: string[] = [];

    for (let i = 0; i < slides.length; i++) {
      const slide = slides[i]!;
      const slideNumber = i + 1;
      const citations = this.extractor.extractFromSlide(slide);

      for (const citation of citations) {
        if (!citationLocations.has(citation.id)) {
          citationLocations.set(citation.id, []);
          allCitationIds.push(citation.id);
        }

        // Find the text containing this citation
        const text = this.findCitationText(slide, citation.id);
        citationLocations.get(citation.id)!.push({
          slide: slideNumber,
          text,
        });
      }
    }

    // Handle no citations
    if (allCitationIds.length === 0) {
      return {
        valid: true,
        found: [],
        missing: [],
        missingDetails: [],
      };
    }

    // Get references from library
    const references = await this.manager.getByIds(allCitationIds);

    // Categorize citations as found or missing
    const found: string[] = [];
    const missing: string[] = [];
    const missingDetails: MissingCitation[] = [];

    for (const id of allCitationIds) {
      if (references.has(id)) {
        found.push(id);
      } else {
        missing.push(id);
        missingDetails.push({
          id,
          locations: citationLocations.get(id) || [],
        });
      }
    }

    return {
      valid: missing.length === 0,
      found,
      missing,
      missingDetails,
    };
  }

  /**
   * Generate suggestions for adding missing references
   */
  static generateSuggestions(missingIds: string[]): string {
    if (missingIds.length === 0) {
      return '';
    }

    const lines: string[] = [
      'Missing citations:',
      ...missingIds.map((id) => `  - @${id}`),
      '',
      'To add these references, use:',
      '  ref add --pmid <pmid>     # Add by PubMed ID',
      '  ref add "<doi>"           # Add by DOI',
      '  ref add --isbn <isbn>     # Add by ISBN',
    ];

    return lines.join('\n');
  }

  private findCitationText(slide: ParsedSlide, citationId: string): string {
    // Search through slide content for text containing the citation
    const searchValue = (value: unknown): string | null => {
      if (typeof value === 'string') {
        if (value.includes(`@${citationId}`)) {
          return value;
        }
      } else if (Array.isArray(value)) {
        for (const item of value) {
          const found = searchValue(item);
          if (found) return found;
        }
      } else if (value && typeof value === 'object') {
        for (const v of Object.values(value)) {
          const found = searchValue(v);
          if (found) return found;
        }
      }
      return null;
    };

    return searchValue(slide.content) || `@${citationId}`;
  }
}
