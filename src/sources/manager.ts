import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { parse, stringify } from 'yaml';
import {
  sourcesYamlSchema,
  type SourcesYaml,
  type SourceEntry,
  type Context,
  type MissingItem,
  type Project,
  type ReferencesSection,
} from './schema.js';
import {
  ReferencesTracker,
  type PendingReference,
  type ExistingReference,
} from './references-tracker.js';

/**
 * Manages the sources.yaml file and sources directory structure
 */
export class SourcesManager {
  private sourcesDir: string;
  private sourcesYamlPath: string;

  /**
   * Standard subdirectories for source materials
   */
  private static readonly SUBDIRECTORIES = [
    'scenario',
    'content',
    'materials',
    'data',
    'conversation',
  ];

  constructor(projectDir: string) {
    this.sourcesDir = path.join(projectDir, 'sources');
    this.sourcesYamlPath = path.join(this.sourcesDir, 'sources.yaml');
  }

  /**
   * Get the sources directory path
   */
  getSourcesDir(): string {
    return this.sourcesDir;
  }

  /**
   * Get the sources.yaml file path
   */
  getSourcesYamlPath(): string {
    return this.sourcesYamlPath;
  }

  /**
   * Check if sources.yaml exists
   */
  async exists(): Promise<boolean> {
    try {
      await fs.access(this.sourcesYamlPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Initialize the sources directory and sources.yaml
   */
  async init(project: Partial<Project> & { name: string }): Promise<void> {
    // Create sources directory
    await fs.mkdir(this.sourcesDir, { recursive: true });

    // Create subdirectories
    for (const subdir of SourcesManager.SUBDIRECTORIES) {
      await fs.mkdir(path.join(this.sourcesDir, subdir), { recursive: true });
    }

    // Get current date in YYYY-MM-DD format
    const today = new Date().toISOString().split('T')[0];

    // Create initial sources.yaml
    const data: SourcesYaml = {
      project: {
        name: project.name,
        purpose: project.purpose,
        created: today,
        updated: today,
        setup_pattern: project.setup_pattern,
        original_source: project.original_source,
      },
    };

    await this.save(data);
  }

  /**
   * Load sources.yaml
   */
  async load(): Promise<SourcesYaml> {
    const content = await fs.readFile(this.sourcesYamlPath, 'utf-8');
    const rawData = parse(content);
    const result = sourcesYamlSchema.safeParse(rawData);

    if (!result.success) {
      throw new Error(`Invalid sources.yaml: ${result.error.message}`);
    }

    return result.data;
  }

  /**
   * Save data to sources.yaml
   */
  async save(data: SourcesYaml): Promise<void> {
    // Update the updated date
    const today = new Date().toISOString().split('T')[0];
    data.project.updated = today;

    // Validate before saving
    const result = sourcesYamlSchema.safeParse(data);
    if (!result.success) {
      throw new Error(`Invalid sources.yaml data: ${result.error.message}`);
    }

    const content = stringify(data, {
      lineWidth: 0, // Disable line wrapping
    });

    await fs.writeFile(this.sourcesYamlPath, content, 'utf-8');
  }

  /**
   * Add or update a source entry
   */
  async addSource(entry: SourceEntry): Promise<void> {
    const data = await this.load();

    if (!data.sources) {
      data.sources = [];
    }

    // Check if entry with same id exists
    const existingIndex = data.sources.findIndex((s) => s.id === entry.id);
    if (existingIndex >= 0) {
      // Replace existing entry
      data.sources[existingIndex] = entry;
    } else {
      // Add new entry
      data.sources.push(entry);
    }

    await this.save(data);
  }

  /**
   * Remove a source entry by id
   */
  async removeSource(id: string): Promise<void> {
    const data = await this.load();

    if (data.sources) {
      data.sources = data.sources.filter((s) => s.id !== id);
    }

    await this.save(data);
  }

  /**
   * Get a source entry by id
   */
  async getSource(id: string): Promise<SourceEntry | undefined> {
    const data = await this.load();
    return data.sources?.find((s) => s.id === id);
  }

  /**
   * Update context (merges with existing)
   */
  async updateContext(context: Partial<Context>): Promise<void> {
    const data = await this.load();

    data.context = {
      ...data.context,
      ...context,
    };

    await this.save(data);
  }

  /**
   * Add a missing item
   */
  async addMissing(item: MissingItem): Promise<void> {
    const data = await this.load();

    if (!data.missing) {
      data.missing = [];
    }

    // Check if item already exists
    const existingIndex = data.missing.findIndex((m) => m.item === item.item);
    if (existingIndex >= 0) {
      data.missing[existingIndex] = item;
    } else {
      data.missing.push(item);
    }

    await this.save(data);
  }

  /**
   * Remove a missing item (mark as resolved)
   */
  async resolveMissing(itemName: string): Promise<void> {
    const data = await this.load();

    if (data.missing) {
      data.missing = data.missing.filter((m) => m.item !== itemName);
    }

    await this.save(data);
  }

  /**
   * Get all missing items
   */
  async getMissing(): Promise<MissingItem[]> {
    const data = await this.load();
    return data.missing ?? [];
  }

  /**
   * Get all sources of a specific type
   */
  async getSourcesByType(type: SourceEntry['type']): Promise<SourceEntry[]> {
    const data = await this.load();
    return data.sources?.filter((s) => s.type === type) ?? [];
  }

  /**
   * Get references from sources.yaml
   */
  async getReferences(): Promise<ReferencesSection> {
    const data = await this.load();
    const tracker = new ReferencesTracker(data.references);
    return tracker.toYaml();
  }

  /**
   * Add a pending reference that needs to be found
   */
  async addPendingReference(ref: PendingReference): Promise<void> {
    const data = await this.load();
    const tracker = new ReferencesTracker(data.references);
    tracker.addPending(ref);
    data.references = tracker.toYaml();
    await this.save(data);
  }

  /**
   * Mark a pending reference as added with its actual citation key
   */
  async markReferenceAdded(pendingId: string, actualId: string): Promise<void> {
    const data = await this.load();
    const tracker = new ReferencesTracker(data.references);
    tracker.markAdded(pendingId, actualId);
    data.references = tracker.toYaml();
    await this.save(data);
  }

  /**
   * Mark a reference as existing in the bibliography
   */
  async markReferenceExisting(ref: ExistingReference): Promise<void> {
    const data = await this.load();
    const tracker = new ReferencesTracker(data.references);
    tracker.markExisting(ref);
    data.references = tracker.toYaml();
    await this.save(data);
  }
}
