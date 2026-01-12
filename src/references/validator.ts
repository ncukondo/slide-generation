import type { ReferenceManager } from './manager';

export interface ValidationResult {
  valid: boolean;
  found: string[];
  missing: string[];
  skipped?: boolean;
  reason?: string;
}

export class ReferenceValidator {
  constructor(private manager: ReferenceManager) {}

  async validateCitations(citationIds: string[]): Promise<ValidationResult> {
    // Check if reference-manager is available
    const available = await this.manager.isAvailable();
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
}
