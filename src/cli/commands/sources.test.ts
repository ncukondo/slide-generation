import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import {
  executeSourcesInit,
  executeSourcesImport,
  executeSourcesStatus,
  executeSourcesSync,
} from './sources.js';
import { SourcesManager } from '../../sources/manager.js';

describe('sources command', () => {
  const testDir = '/tmp/test-sources-cli';
  const testExternalDir = '/tmp/test-external-cli';

  beforeEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
    await fs.rm(testExternalDir, { recursive: true, force: true });
    await fs.mkdir(testDir, { recursive: true });
    await fs.mkdir(testExternalDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
    await fs.rm(testExternalDir, { recursive: true, force: true });
  });

  describe('sources init', () => {
    it('should initialize sources directory', async () => {
      const result = await executeSourcesInit(testDir, {});

      const sourcesYamlPath = path.join(testDir, 'sources', 'sources.yaml');
      const exists = await fs
        .access(sourcesYamlPath)
        .then(() => true)
        .catch(() => false);

      expect(exists).toBe(true);
      expect(result.success).toBe(true);
    });

    it('should create subdirectories', async () => {
      await executeSourcesInit(testDir, {});

      const dirs = ['scenario', 'content', 'materials', 'data', 'conversation'];
      for (const dir of dirs) {
        const dirPath = path.join(testDir, 'sources', dir);
        const exists = await fs
          .access(dirPath)
          .then(() => true)
          .catch(() => false);
        expect(exists).toBe(true);
      }
    });

    it('should support --from-directory option (Pattern A)', async () => {
      // Create test materials
      await fs.writeFile(
        path.join(testExternalDir, 'scenario.md'),
        '# Scenario'
      );
      await fs.writeFile(path.join(testExternalDir, 'data.xlsx'), 'data');

      const result = await executeSourcesInit(testDir, {
        fromDirectory: testExternalDir,
      });

      expect(result.success).toBe(true);

      const manager = new SourcesManager(testDir);
      const data = await manager.load();
      expect(data.project.setup_pattern).toBe('A');
      expect(data.sources?.length).toBeGreaterThan(0);
    });

    it('should support --from-file option (Pattern B)', async () => {
      const scenarioPath = path.join(testExternalDir, 'scenario.md');
      await fs.writeFile(scenarioPath, '# My Scenario\n\nContent here');

      const result = await executeSourcesInit(testDir, {
        fromFile: scenarioPath,
      });

      expect(result.success).toBe(true);

      const manager = new SourcesManager(testDir);
      const data = await manager.load();
      expect(data.project.setup_pattern).toBe('B');
    });

    it('should use project name from option', async () => {
      await executeSourcesInit(testDir, {
        name: 'My Custom Project',
      });

      const manager = new SourcesManager(testDir);
      const data = await manager.load();
      expect(data.project.name).toBe('My Custom Project');
    });
  });

  describe('sources import', () => {
    beforeEach(async () => {
      // Initialize sources first
      await executeSourcesInit(testDir, {});
    });

    it('should import file', async () => {
      const filePath = path.join(testExternalDir, 'test.pdf');
      await fs.writeFile(filePath, 'PDF content');

      const result = await executeSourcesImport(testDir, filePath, {});

      expect(result.success).toBe(true);
      expect(result.imported).toBe(1);
    });

    it('should import directory with --recursive', async () => {
      await fs.mkdir(path.join(testExternalDir, 'nested'), { recursive: true });
      await fs.writeFile(path.join(testExternalDir, 'root.md'), '# Root');
      await fs.writeFile(
        path.join(testExternalDir, 'nested', 'deep.pdf'),
        'PDF'
      );

      const result = await executeSourcesImport(testDir, testExternalDir, {
        recursive: true,
      });

      expect(result.success).toBe(true);
      expect(result.imported).toBe(2);
    });

    it('should respect --type option', async () => {
      const filePath = path.join(testExternalDir, 'unknown.txt');
      await fs.writeFile(filePath, 'content');

      await executeSourcesImport(testDir, filePath, {
        type: 'scenario',
      });

      const importedPath = path.join(
        testDir,
        'sources',
        'scenario',
        'unknown.txt'
      );
      const exists = await fs
        .access(importedPath)
        .then(() => true)
        .catch(() => false);
      expect(exists).toBe(true);
    });
  });

  describe('sources status', () => {
    beforeEach(async () => {
      await executeSourcesInit(testDir, { name: 'Test Status Project' });
    });

    it('should show sources status', async () => {
      const result = await executeSourcesStatus(testDir, {});

      expect(result.success).toBe(true);
      expect(result.output).toContain('Test Status Project');
    });

    it('should show missing items', async () => {
      const manager = new SourcesManager(testDir);
      await manager.addMissing({
        item: 'Product photo',
        needed_for: 'Slide 4',
        status: 'pending',
      });

      const result = await executeSourcesStatus(testDir, {});

      expect(result.output).toContain('Product photo');
    });

    it('should show references status', async () => {
      const manager = new SourcesManager(testDir);
      await manager.addPendingReference({
        id: 'needed2024',
        slide: 5,
        purpose: 'Support claim',
        requirement: 'required',
      });
      await manager.markReferenceExisting({
        id: 'existing2024',
        slide: 3,
        purpose: 'Background',
      });

      const result = await executeSourcesStatus(testDir, {});

      expect(result.output).toContain('References');
      expect(result.output).toContain('Pending: 1');
      expect(result.output).toContain('Found: 1');
    });

    it('should show pending references warning', async () => {
      const manager = new SourcesManager(testDir);
      await manager.addPendingReference({
        id: 'needed-study',
        slide: 3,
        purpose: 'Support main claim',
      });

      const result = await executeSourcesStatus(testDir, {});

      expect(result.output).toContain('needed-study');
      expect(result.output).toContain('Slide 3');
    });
  });

  describe('sources sync', () => {
    beforeEach(async () => {
      // Create external directory
      await fs.writeFile(path.join(testExternalDir, 'file.md'), '# Content');

      // Initialize with from-directory
      await executeSourcesInit(testDir, {
        fromDirectory: testExternalDir,
      });
    });

    it('should check for changes', async () => {
      const result = await executeSourcesSync(testDir, { check: true });

      expect(result.success).toBe(true);
    });

    it('should detect new files', async () => {
      // Add new file to external directory
      await fs.writeFile(path.join(testExternalDir, 'new.pdf'), 'new content');

      const result = await executeSourcesSync(testDir, { check: true });

      expect(result.newFiles).toBeGreaterThan(0);
    });
  });
});
