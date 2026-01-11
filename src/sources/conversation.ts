import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type { SourcesManager } from './manager.js';

/**
 * Types of log entries
 */
export type LogEntryType = 'decision' | 'info' | 'question' | 'note';

/**
 * A single log entry in a conversation
 */
export interface LogEntry {
  /** Type of entry */
  type: LogEntryType;
  /** Entry content */
  content: string;
  /** Optional timestamp */
  timestamp?: string;
}

/**
 * Type labels for display
 */
const TYPE_LABELS: Record<LogEntryType, string> = {
  decision: 'Decision',
  info: 'Info',
  question: 'Question',
  note: 'Note',
};

/**
 * Manages conversation logs for AI interactions
 */
export class ConversationLogger {
  private conversationDir: string;
  private currentLogPath: string | null = null;
  private entries: LogEntry[] = [];
  private title: string = '';
  private decisions: string[] = [];

  constructor(
    projectDir: string,
    private manager: SourcesManager
  ) {
    this.conversationDir = path.join(projectDir, 'sources', 'conversation');
  }

  /**
   * Check if there's an active logging session
   */
  isActive(): boolean {
    return this.currentLogPath !== null;
  }

  /**
   * Start a new conversation log
   */
  async start(title: string): Promise<void> {
    // Ensure conversation directory exists
    await fs.mkdir(this.conversationDir, { recursive: true });

    // Generate filename with date and title
    const today = new Date().toISOString().split('T')[0];
    const slug = this.slugify(title);
    const filename = `${today}-${slug}.md`;
    this.currentLogPath = path.join(this.conversationDir, filename);

    // Initialize state
    this.title = title;
    this.entries = [];
    this.decisions = [];

    // Write initial header
    const header = this.generateHeader();
    await fs.writeFile(this.currentLogPath, header, 'utf-8');
  }

  /**
   * Add an entry to the current log
   */
  async addEntry(entry: LogEntry): Promise<void> {
    if (!this.currentLogPath) {
      throw new Error('No active conversation session. Call start() first.');
    }

    this.entries.push(entry);

    // Track decisions for sources.yaml
    if (entry.type === 'decision') {
      this.decisions.push(entry.content);
    }

    // Append to file
    const formattedEntry = this.formatEntry(entry);
    await fs.appendFile(this.currentLogPath, formattedEntry, 'utf-8');
  }

  /**
   * Add a decision entry
   */
  async addDecision(content: string): Promise<void> {
    await this.addEntry({ type: 'decision', content });
  }

  /**
   * Add user-provided information
   */
  async addUserInfo(content: string): Promise<void> {
    await this.addEntry({ type: 'info', content });
  }

  /**
   * Add a question entry
   */
  async addQuestion(content: string): Promise<void> {
    await this.addEntry({ type: 'question', content });
  }

  /**
   * Add a note entry
   */
  async addNote(content: string): Promise<void> {
    await this.addEntry({ type: 'note', content });
  }

  /**
   * Get the current log content
   */
  async getContent(): Promise<string | null> {
    if (!this.currentLogPath) {
      return null;
    }

    try {
      return await fs.readFile(this.currentLogPath, 'utf-8');
    } catch {
      return null;
    }
  }

  /**
   * Close the current session and update sources.yaml
   */
  async close(): Promise<void> {
    if (!this.currentLogPath) {
      return;
    }

    // Add footer
    const footer = this.generateFooter();
    await fs.appendFile(this.currentLogPath, footer, 'utf-8');

    // Get relative path for sources.yaml
    const relativePath = path.relative(
      path.dirname(this.conversationDir),
      this.currentLogPath
    );

    // Generate ID from filename
    const filename = path.basename(this.currentLogPath, '.md');
    const id = `conversation-${filename}`;

    // Add to sources.yaml
    await this.manager.addSource({
      id,
      type: 'conversation',
      path: relativePath,
      status: 'archived',
      description: this.title,
      decisions: this.decisions.length > 0 ? this.decisions : undefined,
    });

    // Reset state
    this.currentLogPath = null;
    this.title = '';
    this.entries = [];
    this.decisions = [];
  }

  /**
   * Generate the log header
   */
  private generateHeader(): string {
    const now = new Date().toISOString();
    return `# ${this.title}

**Started:** ${now}

---

`;
  }

  /**
   * Generate the log footer
   */
  private generateFooter(): string {
    const now = new Date().toISOString();
    let footer = `
---

**Ended:** ${now}
`;

    if (this.decisions.length > 0) {
      footer += `
## Summary of Decisions

${this.decisions.map((d) => `- ${d}`).join('\n')}
`;
    }

    return footer;
  }

  /**
   * Format a single entry for the log file
   */
  private formatEntry(entry: LogEntry): string {
    const label = TYPE_LABELS[entry.type];
    const timestamp = entry.timestamp ? ` (${entry.timestamp})` : '';
    return `### [${label}]${timestamp}

${entry.content}

`;
  }

  /**
   * Convert a title to a filename-safe slug
   */
  private slugify(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 50); // Limit length
  }
}
