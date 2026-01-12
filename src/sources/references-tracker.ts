import type { ReferenceItem, ReferencesSection } from './schema.js';

/**
 * Input for adding a pending reference
 */
export interface PendingReference {
  id: string;
  slide: number;
  purpose: string;
  requirement?: 'required' | 'recommended';
  suggested_search?: string[];
  notes?: string;
}

/**
 * Input for marking an existing reference
 */
export interface ExistingReference {
  id: string;
  slide: number;
  purpose: string;
}

/**
 * Tracks references in sources.yaml
 *
 * Manages the lifecycle of citation references:
 * - pending: reference needed but not yet found
 * - added: reference found and added to bibliography
 * - existing: reference already exists in bibliography
 */
export class ReferencesTracker {
  private items: ReferenceItem[] = [];

  constructor(initial?: ReferencesSection) {
    if (initial?.items) {
      this.items = [...initial.items];
    }
  }

  /**
   * Add a pending reference that needs to be found
   */
  addPending(ref: PendingReference): void {
    this.items.push({
      ...ref,
      status: 'pending',
    });
  }

  /**
   * Mark a pending reference as added with its actual citation key
   */
  markAdded(pendingId: string, actualId: string): void {
    const item = this.items.find((i) => i.id === pendingId);
    if (item) {
      item.id = actualId;
      item.status = 'added';
      item.added_date = new Date().toISOString().split('T')[0];
    }
  }

  /**
   * Mark a reference as existing in the bibliography
   */
  markExisting(ref: ExistingReference): void {
    this.items.push({
      ...ref,
      status: 'existing',
    });
  }

  /**
   * Get all reference items
   */
  getItems(): ReferenceItem[] {
    return [...this.items];
  }

  /**
   * Get only pending references
   */
  getPending(): ReferenceItem[] {
    return this.items.filter((i) => i.status === 'pending');
  }

  /**
   * Calculate status summary
   */
  getStatus(): { required: number; found: number; pending: number } {
    const required = this.items.filter(
      (i) => i.requirement === 'required'
    ).length;
    const pending = this.items.filter((i) => i.status === 'pending').length;
    const found = this.items.filter((i) => i.status !== 'pending').length;
    return { required, found, pending };
  }

  /**
   * Convert to YAML-compatible object
   */
  toYaml(): ReferencesSection {
    return {
      status: this.getStatus(),
      items: this.items,
    };
  }
}
