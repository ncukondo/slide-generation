import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { ConversationLogger } from './conversation.js';
import { SourcesManager } from './manager.js';

describe('ConversationLogger', () => {
  const testProjectDir = '/tmp/test-conversation-logger';

  beforeEach(async () => {
    await fs.rm(testProjectDir, { recursive: true, force: true });
    await fs.mkdir(testProjectDir, { recursive: true });

    // Initialize sources
    const manager = new SourcesManager(testProjectDir);
    await manager.init({ name: 'Test Project' });
  });

  afterEach(async () => {
    await fs.rm(testProjectDir, { recursive: true, force: true });
  });

  describe('start', () => {
    it('should create new conversation log', async () => {
      const manager = new SourcesManager(testProjectDir);
      const logger = new ConversationLogger(testProjectDir, manager);
      await logger.start('Initial setup');

      const files = await fs.readdir(
        path.join(testProjectDir, 'sources', 'conversation')
      );
      expect(files.some((f) => f.includes('setup'))).toBe(true);
    });

    it('should include timestamp in filename', async () => {
      const manager = new SourcesManager(testProjectDir);
      const logger = new ConversationLogger(testProjectDir, manager);
      await logger.start('Test session');

      const files = await fs.readdir(
        path.join(testProjectDir, 'sources', 'conversation')
      );
      // Format: YYYY-MM-DD-title.md
      const datePattern = /^\d{4}-\d{2}-\d{2}-/;
      expect(files.some((f) => datePattern.test(f))).toBe(true);
    });
  });

  describe('addEntry', () => {
    it('should add entry to log', async () => {
      const manager = new SourcesManager(testProjectDir);
      const logger = new ConversationLogger(testProjectDir, manager);
      await logger.start('Test session');
      await logger.addEntry({
        type: 'decision',
        content: 'Using 12 slides',
      });

      const content = await logger.getContent();
      expect(content).toContain('Using 12 slides');
    });

    it('should include entry type marker', async () => {
      const manager = new SourcesManager(testProjectDir);
      const logger = new ConversationLogger(testProjectDir, manager);
      await logger.start('Test session');
      await logger.addEntry({
        type: 'decision',
        content: 'Decision content',
      });

      const content = await logger.getContent();
      expect(content).toContain('[Decision]');
    });

    it('should include timestamp when specified', async () => {
      const manager = new SourcesManager(testProjectDir);
      const logger = new ConversationLogger(testProjectDir, manager);
      await logger.start('Test session');
      await logger.addEntry({
        type: 'info',
        content: 'Info content',
        timestamp: '2025-01-10 10:00',
      });

      const content = await logger.getContent();
      expect(content).toContain('2025-01-10 10:00');
    });
  });

  describe('convenience methods', () => {
    it('should add decision entry', async () => {
      const manager = new SourcesManager(testProjectDir);
      const logger = new ConversationLogger(testProjectDir, manager);
      await logger.start('Test');
      await logger.addDecision('Using 10 slides');

      const content = await logger.getContent();
      expect(content).toContain('[Decision]');
      expect(content).toContain('Using 10 slides');
    });

    it('should add user info entry', async () => {
      const manager = new SourcesManager(testProjectDir);
      const logger = new ConversationLogger(testProjectDir, manager);
      await logger.start('Test');
      await logger.addUserInfo('The audience is executives');

      const content = await logger.getContent();
      expect(content).toContain('[Info]');
      expect(content).toContain('The audience is executives');
    });

    it('should add question entry', async () => {
      const manager = new SourcesManager(testProjectDir);
      const logger = new ConversationLogger(testProjectDir, manager);
      await logger.start('Test');
      await logger.addQuestion('What is the target audience?');

      const content = await logger.getContent();
      expect(content).toContain('[Question]');
      expect(content).toContain('What is the target audience?');
    });

    it('should add note entry', async () => {
      const manager = new SourcesManager(testProjectDir);
      const logger = new ConversationLogger(testProjectDir, manager);
      await logger.start('Test');
      await logger.addNote('Remember to include charts');

      const content = await logger.getContent();
      expect(content).toContain('[Note]');
      expect(content).toContain('Remember to include charts');
    });
  });

  describe('getContent', () => {
    it('should return current log content', async () => {
      const manager = new SourcesManager(testProjectDir);
      const logger = new ConversationLogger(testProjectDir, manager);
      await logger.start('Test');
      await logger.addDecision('Decision 1');
      await logger.addDecision('Decision 2');

      const content = await logger.getContent();
      expect(content).toContain('Decision 1');
      expect(content).toContain('Decision 2');
    });

    it('should return null if no active session', async () => {
      const manager = new SourcesManager(testProjectDir);
      const logger = new ConversationLogger(testProjectDir, manager);

      const content = await logger.getContent();
      expect(content).toBeNull();
    });
  });

  describe('close', () => {
    it('should save log and update sources.yaml', async () => {
      const manager = new SourcesManager(testProjectDir);
      const logger = new ConversationLogger(testProjectDir, manager);
      await logger.start('Test');
      await logger.addEntry({ type: 'decision', content: 'Test decision' });
      await logger.close();

      const data = await manager.load();
      expect(data.sources).toContainEqual(
        expect.objectContaining({ type: 'conversation' })
      );
    });

    it('should record decisions in source entry', async () => {
      const manager = new SourcesManager(testProjectDir);
      const logger = new ConversationLogger(testProjectDir, manager);
      await logger.start('Test');
      await logger.addDecision('Agreed on 12 slides');
      await logger.addDecision('Using dark theme');
      await logger.close();

      const data = await manager.load();
      const entry = data.sources?.find((s) => s.type === 'conversation');
      expect(entry?.decisions).toContain('Agreed on 12 slides');
      expect(entry?.decisions).toContain('Using dark theme');
    });

    it('should allow starting new session after close', async () => {
      const manager = new SourcesManager(testProjectDir);
      const logger = new ConversationLogger(testProjectDir, manager);
      await logger.start('Session 1');
      await logger.close();

      await logger.start('Session 2');
      await logger.addNote('New session');
      const content = await logger.getContent();
      expect(content).toContain('New session');
    });
  });

  describe('isActive', () => {
    it('should return true when session is active', async () => {
      const manager = new SourcesManager(testProjectDir);
      const logger = new ConversationLogger(testProjectDir, manager);
      await logger.start('Test');

      expect(logger.isActive()).toBe(true);
    });

    it('should return false when no session', async () => {
      const manager = new SourcesManager(testProjectDir);
      const logger = new ConversationLogger(testProjectDir, manager);

      expect(logger.isActive()).toBe(false);
    });

    it('should return false after close', async () => {
      const manager = new SourcesManager(testProjectDir);
      const logger = new ConversationLogger(testProjectDir, manager);
      await logger.start('Test');
      await logger.close();

      expect(logger.isActive()).toBe(false);
    });
  });
});
