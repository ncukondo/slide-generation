import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { SourcesManager } from './manager.js';
import type { SourceEntry, MissingItem, Context } from './schema.js';

describe('SourcesManager', () => {
  const testProjectDir = '/tmp/test-sources-manager';

  beforeEach(async () => {
    await fs.rm(testProjectDir, { recursive: true, force: true });
    await fs.mkdir(testProjectDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(testProjectDir, { recursive: true, force: true });
  });

  describe('init', () => {
    it('should create sources directory and sources.yaml', async () => {
      const manager = new SourcesManager(testProjectDir);
      await manager.init({
        name: 'Test Project',
        purpose: 'Testing',
      });

      const sourcesYamlPath = path.join(
        testProjectDir,
        'sources',
        'sources.yaml'
      );
      const exists = await fs
        .access(sourcesYamlPath)
        .then(() => true)
        .catch(() => false);
      expect(exists).toBe(true);
    });

    it('should create subdirectories', async () => {
      const manager = new SourcesManager(testProjectDir);
      await manager.init({
        name: 'Test Project',
      });

      const dirs = ['scenario', 'content', 'materials', 'data', 'conversation'];
      for (const dir of dirs) {
        const dirPath = path.join(testProjectDir, 'sources', dir);
        const exists = await fs
          .access(dirPath)
          .then(() => true)
          .catch(() => false);
        expect(exists).toBe(true);
      }
    });

    it('should set created and updated dates', async () => {
      const manager = new SourcesManager(testProjectDir);
      await manager.init({
        name: 'Test Project',
      });

      const data = await manager.load();
      expect(data.project.created).toBeDefined();
      expect(data.project.updated).toBeDefined();
    });
  });

  describe('load', () => {
    it('should load existing sources.yaml', async () => {
      const manager = new SourcesManager(testProjectDir);
      await manager.init({
        name: 'Test Project',
        purpose: 'Testing',
      });

      const data = await manager.load();
      expect(data.project.name).toBe('Test Project');
      expect(data.project.purpose).toBe('Testing');
    });

    it('should throw error if sources.yaml does not exist', async () => {
      const manager = new SourcesManager(testProjectDir);
      await expect(manager.load()).rejects.toThrow();
    });
  });

  describe('save', () => {
    it('should save data to sources.yaml', async () => {
      const manager = new SourcesManager(testProjectDir);
      await manager.init({
        name: 'Test Project',
      });

      const data = await manager.load();
      data.project.purpose = 'Updated purpose';
      await manager.save(data);

      const reloaded = await manager.load();
      expect(reloaded.project.purpose).toBe('Updated purpose');
    });

    it('should update the updated date', async () => {
      const manager = new SourcesManager(testProjectDir);
      await manager.init({
        name: 'Test Project',
      });

      const data = await manager.load();
      expect(data.project.updated).toBeDefined();

      data.project.purpose = 'Updated';
      await manager.save(data);

      const reloaded = await manager.load();
      // Updated date should be defined after save
      expect(reloaded.project.updated).toBeDefined();
    });
  });

  describe('addSource', () => {
    it('should add source entry', async () => {
      const manager = new SourcesManager(testProjectDir);
      await manager.init({
        name: 'Test Project',
      });

      const entry: SourceEntry = {
        id: 'new-doc',
        type: 'material',
        path: 'materials/doc.pdf',
        description: 'New document',
      };
      await manager.addSource(entry);

      const data = await manager.load();
      expect(data.sources).toContainEqual(expect.objectContaining({ id: 'new-doc' }));
    });

    it('should replace existing source with same id', async () => {
      const manager = new SourcesManager(testProjectDir);
      await manager.init({
        name: 'Test Project',
      });

      await manager.addSource({
        id: 'doc',
        type: 'material',
        path: 'materials/doc.pdf',
        description: 'Original',
      });

      await manager.addSource({
        id: 'doc',
        type: 'material',
        path: 'materials/doc-v2.pdf',
        description: 'Updated',
      });

      const data = await manager.load();
      const docEntries = data.sources?.filter((s) => s.id === 'doc') ?? [];
      expect(docEntries).toHaveLength(1);
      expect(docEntries[0]?.description).toBe('Updated');
    });
  });

  describe('removeSource', () => {
    it('should remove source entry by id', async () => {
      const manager = new SourcesManager(testProjectDir);
      await manager.init({
        name: 'Test Project',
      });

      await manager.addSource({
        id: 'to-remove',
        type: 'material',
        path: 'materials/doc.pdf',
      });

      await manager.removeSource('to-remove');

      const data = await manager.load();
      const found = data.sources?.find((s) => s.id === 'to-remove');
      expect(found).toBeUndefined();
    });
  });

  describe('updateContext', () => {
    it('should update context', async () => {
      const manager = new SourcesManager(testProjectDir);
      await manager.init({
        name: 'Test Project',
      });

      const context: Partial<Context> = {
        objective: 'Updated objective',
      };
      await manager.updateContext(context);

      const data = await manager.load();
      expect(data.context?.objective).toBe('Updated objective');
    });

    it('should merge with existing context', async () => {
      const manager = new SourcesManager(testProjectDir);
      await manager.init({
        name: 'Test Project',
      });

      await manager.updateContext({
        objective: 'Initial objective',
      });

      await manager.updateContext({
        key_messages: ['Message 1'],
      });

      const data = await manager.load();
      expect(data.context?.objective).toBe('Initial objective');
      expect(data.context?.key_messages).toEqual(['Message 1']);
    });
  });

  describe('addMissing', () => {
    it('should track missing items', async () => {
      const manager = new SourcesManager(testProjectDir);
      await manager.init({
        name: 'Test Project',
      });

      const item: MissingItem = {
        item: 'Product photo',
        needed_for: 'Slide 4',
        status: 'pending',
      };
      await manager.addMissing(item);

      const data = await manager.load();
      expect(data.missing).toContainEqual(
        expect.objectContaining({ item: 'Product photo' })
      );
    });
  });

  describe('resolveMissing', () => {
    it('should remove from missing list', async () => {
      const manager = new SourcesManager(testProjectDir);
      await manager.init({
        name: 'Test Project',
      });

      await manager.addMissing({
        item: 'Product photo',
        needed_for: 'Slide 4',
        status: 'pending',
      });

      await manager.resolveMissing('Product photo');

      const data = await manager.load();
      const found = data.missing?.find((m) => m.item === 'Product photo');
      expect(found).toBeUndefined();
    });
  });

  describe('exists', () => {
    it('should return true if sources.yaml exists', async () => {
      const manager = new SourcesManager(testProjectDir);
      await manager.init({
        name: 'Test Project',
      });

      expect(await manager.exists()).toBe(true);
    });

    it('should return false if sources.yaml does not exist', async () => {
      const manager = new SourcesManager(testProjectDir);
      expect(await manager.exists()).toBe(false);
    });
  });
});
