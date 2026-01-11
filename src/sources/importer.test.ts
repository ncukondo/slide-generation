import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { SourceImporter } from './importer.js';
import { SourcesManager } from './manager.js';

describe('SourceImporter', () => {
  const testProjectDir = '/tmp/test-source-importer';
  const testExternalDir = '/tmp/test-external-files';

  beforeEach(async () => {
    await fs.rm(testProjectDir, { recursive: true, force: true });
    await fs.rm(testExternalDir, { recursive: true, force: true });
    await fs.mkdir(testProjectDir, { recursive: true });
    await fs.mkdir(testExternalDir, { recursive: true });

    // Initialize sources
    const manager = new SourcesManager(testProjectDir);
    await manager.init({ name: 'Test Project' });
  });

  afterEach(async () => {
    await fs.rm(testProjectDir, { recursive: true, force: true });
    await fs.rm(testExternalDir, { recursive: true, force: true });
  });

  describe('importFile', () => {
    it('should import single file', async () => {
      const sourcePath = path.join(testExternalDir, 'spec.pdf');
      await fs.writeFile(sourcePath, 'PDF content');

      const manager = new SourcesManager(testProjectDir);
      const importer = new SourceImporter(testProjectDir, manager);
      await importer.importFile(sourcePath, {
        type: 'material',
        description: 'Product spec',
      });

      const importedPath = path.join(
        testProjectDir,
        'sources',
        'materials',
        'spec.pdf'
      );
      const exists = await fs
        .access(importedPath)
        .then(() => true)
        .catch(() => false);
      expect(exists).toBe(true);
    });

    it('should update sources.yaml after import', async () => {
      const sourcePath = path.join(testExternalDir, 'doc.pdf');
      await fs.writeFile(sourcePath, 'PDF content');

      const manager = new SourcesManager(testProjectDir);
      const importer = new SourceImporter(testProjectDir, manager);
      await importer.importFile(sourcePath);

      const data = await manager.load();
      expect(data.sources).toContainEqual(
        expect.objectContaining({ path: 'materials/doc.pdf' })
      );
    });

    it('should record original path', async () => {
      const sourcePath = path.join(testExternalDir, 'doc.pdf');
      await fs.writeFile(sourcePath, 'PDF content');

      const manager = new SourcesManager(testProjectDir);
      const importer = new SourceImporter(testProjectDir, manager);
      await importer.importFile(sourcePath);

      const data = await manager.load();
      const entry = data.sources?.find((s) => s.path === 'materials/doc.pdf');
      expect(entry?.origin).toBe(sourcePath);
    });

    it('should classify files by extension', async () => {
      const manager = new SourcesManager(testProjectDir);
      const importer = new SourceImporter(testProjectDir, manager);

      // Create and import various file types
      await fs.writeFile(path.join(testExternalDir, 'scenario.md'), '# Scenario');
      await fs.writeFile(path.join(testExternalDir, 'data.xlsx'), 'data');
      await fs.writeFile(path.join(testExternalDir, 'report.pdf'), 'report');

      await importer.importFile(path.join(testExternalDir, 'scenario.md'));
      await importer.importFile(path.join(testExternalDir, 'data.xlsx'));
      await importer.importFile(path.join(testExternalDir, 'report.pdf'));

      const scenarioPath = path.join(
        testProjectDir,
        'sources',
        'scenario',
        'scenario.md'
      );
      const dataPath = path.join(
        testProjectDir,
        'sources',
        'data',
        'data.xlsx'
      );
      const materialPath = path.join(
        testProjectDir,
        'sources',
        'materials',
        'report.pdf'
      );

      expect(
        await fs
          .access(scenarioPath)
          .then(() => true)
          .catch(() => false)
      ).toBe(true);
      expect(
        await fs
          .access(dataPath)
          .then(() => true)
          .catch(() => false)
      ).toBe(true);
      expect(
        await fs
          .access(materialPath)
          .then(() => true)
          .catch(() => false)
      ).toBe(true);
    });

    it('should use provided type over auto-detection', async () => {
      const sourcePath = path.join(testExternalDir, 'random.txt');
      await fs.writeFile(sourcePath, 'content');

      const manager = new SourcesManager(testProjectDir);
      const importer = new SourceImporter(testProjectDir, manager);
      await importer.importFile(sourcePath, { type: 'scenario' });

      const importedPath = path.join(
        testProjectDir,
        'sources',
        'scenario',
        'random.txt'
      );
      const exists = await fs
        .access(importedPath)
        .then(() => true)
        .catch(() => false);
      expect(exists).toBe(true);
    });

    it('should handle filename conflicts', async () => {
      const sourcePath = path.join(testExternalDir, 'doc.pdf');
      await fs.writeFile(sourcePath, 'PDF content');

      const manager = new SourcesManager(testProjectDir);
      const importer = new SourceImporter(testProjectDir, manager);

      // Import same file twice
      await importer.importFile(sourcePath);
      await importer.importFile(sourcePath);

      const dir = path.join(testProjectDir, 'sources', 'materials');
      const files = await fs.readdir(dir);
      expect(files).toHaveLength(2);
      expect(files).toContain('doc.pdf');
      expect(files.some((f) => f.startsWith('doc-') && f.endsWith('.pdf'))).toBe(
        true
      );
    });

    it('should copy file by default', async () => {
      const sourcePath = path.join(testExternalDir, 'doc.pdf');
      await fs.writeFile(sourcePath, 'PDF content');

      const manager = new SourcesManager(testProjectDir);
      const importer = new SourceImporter(testProjectDir, manager);
      await importer.importFile(sourcePath);

      // Original should still exist
      const originalExists = await fs
        .access(sourcePath)
        .then(() => true)
        .catch(() => false);
      expect(originalExists).toBe(true);
    });

    it('should move file when copy is false', async () => {
      const sourcePath = path.join(testExternalDir, 'doc.pdf');
      await fs.writeFile(sourcePath, 'PDF content');

      const manager = new SourcesManager(testProjectDir);
      const importer = new SourceImporter(testProjectDir, manager);
      await importer.importFile(sourcePath, { copy: false });

      // Original should not exist
      const originalExists = await fs
        .access(sourcePath)
        .then(() => true)
        .catch(() => false);
      expect(originalExists).toBe(false);
    });
  });

  describe('importDirectory', () => {
    it('should import directory recursively', async () => {
      // Create nested structure
      await fs.mkdir(path.join(testExternalDir, 'nested'), { recursive: true });
      await fs.writeFile(path.join(testExternalDir, 'root.md'), '# Root');
      await fs.writeFile(path.join(testExternalDir, 'nested', 'deep.pdf'), 'PDF');

      const manager = new SourcesManager(testProjectDir);
      const importer = new SourceImporter(testProjectDir, manager);
      const result = await importer.importDirectory(testExternalDir, {
        recursive: true,
      });

      expect(result.imported).toBe(2);
    });

    it('should skip non-recursive by default', async () => {
      await fs.mkdir(path.join(testExternalDir, 'nested'), { recursive: true });
      await fs.writeFile(path.join(testExternalDir, 'root.md'), '# Root');
      await fs.writeFile(path.join(testExternalDir, 'nested', 'deep.pdf'), 'PDF');

      const manager = new SourcesManager(testProjectDir);
      const importer = new SourceImporter(testProjectDir, manager);
      const result = await importer.importDirectory(testExternalDir);

      expect(result.imported).toBe(1);
    });

    it('should skip already imported files', async () => {
      await fs.writeFile(path.join(testExternalDir, 'doc.pdf'), 'PDF');

      const manager = new SourcesManager(testProjectDir);
      const importer = new SourceImporter(testProjectDir, manager);

      await importer.importDirectory(testExternalDir);
      const result = await importer.importDirectory(testExternalDir);

      expect(result.skipped).toBe(1);
    });
  });

  describe('getTargetDirectory', () => {
    it('should return correct directory for each type', async () => {
      const manager = new SourcesManager(testProjectDir);
      const importer = new SourceImporter(testProjectDir, manager);

      expect(importer.getTargetDirectory('scenario')).toBe('scenario');
      expect(importer.getTargetDirectory('content')).toBe('content');
      expect(importer.getTargetDirectory('material')).toBe('materials');
      expect(importer.getTargetDirectory('data')).toBe('data');
      expect(importer.getTargetDirectory('conversation')).toBe('conversation');
    });
  });
});
