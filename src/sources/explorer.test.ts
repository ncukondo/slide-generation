import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { SourceExplorer } from './explorer.js';

describe('SourceExplorer', () => {
  const testDir = '/tmp/test-source-explorer';

  beforeEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
    await fs.mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  describe('classifyFile', () => {
    it('should classify scenario files', () => {
      const explorer = new SourceExplorer();

      expect(explorer.classifyFile('scenario.md')).toBe('scenario');
      expect(explorer.classifyFile('brief.md')).toBe('scenario');
      expect(explorer.classifyFile('outline.xlsx')).toBe('scenario');
      expect(explorer.classifyFile('requirements.doc')).toBe('scenario');
      expect(explorer.classifyFile('structure.md')).toBe('scenario');
    });

    it('should classify content files', () => {
      const explorer = new SourceExplorer();

      expect(explorer.classifyFile('draft.md')).toBe('content');
      expect(explorer.classifyFile('content.md')).toBe('content');
      expect(explorer.classifyFile('script.txt')).toBe('content');
    });

    it('should classify data files', () => {
      const explorer = new SourceExplorer();

      expect(explorer.classifyFile('data.xlsx')).toBe('data');
      expect(explorer.classifyFile('statistics.csv')).toBe('data');
      expect(explorer.classifyFile('results.xlsx')).toBe('data');
    });

    it('should classify material files', () => {
      const explorer = new SourceExplorer();

      expect(explorer.classifyFile('spec.pdf')).toBe('material');
      expect(explorer.classifyFile('report.pdf')).toBe('material');
      expect(explorer.classifyFile('manual.pdf')).toBe('material');
    });

    it('should classify image files', () => {
      const explorer = new SourceExplorer();

      expect(explorer.classifyFile('photo.jpg')).toBe('image');
      expect(explorer.classifyFile('diagram.png')).toBe('image');
      expect(explorer.classifyFile('icon.svg')).toBe('image');
      expect(explorer.classifyFile('animation.gif')).toBe('image');
    });

    it('should return unknown for unrecognized files', () => {
      const explorer = new SourceExplorer();

      expect(explorer.classifyFile('random.xyz')).toBe('unknown');
      expect(explorer.classifyFile('notes.txt')).toBe('unknown');
    });
  });

  describe('scan', () => {
    it('should scan directory and list files', async () => {
      // Create test files
      await fs.writeFile(path.join(testDir, 'scenario.md'), '# Scenario');
      await fs.writeFile(path.join(testDir, 'data.xlsx'), 'binary');
      await fs.writeFile(path.join(testDir, 'photo.jpg'), 'binary');

      const explorer = new SourceExplorer();
      const files = await explorer.scan(testDir);

      expect(files).toHaveLength(3);
      expect(files).toContainEqual(
        expect.objectContaining({
          name: 'scenario.md',
          type: 'scenario',
        })
      );
      expect(files).toContainEqual(
        expect.objectContaining({
          name: 'data.xlsx',
          type: 'data',
        })
      );
      expect(files).toContainEqual(
        expect.objectContaining({
          name: 'photo.jpg',
          type: 'image',
        })
      );
    });

    it('should scan recursively by default', async () => {
      // Create nested structure
      await fs.mkdir(path.join(testDir, 'nested'), { recursive: true });
      await fs.writeFile(path.join(testDir, 'root.md'), '# Root');
      await fs.writeFile(path.join(testDir, 'nested', 'deep.md'), '# Deep');

      const explorer = new SourceExplorer();
      const files = await explorer.scan(testDir);

      expect(files).toHaveLength(2);
    });

    it('should respect maxDepth option', async () => {
      // Create deeply nested structure
      await fs.mkdir(path.join(testDir, 'level1', 'level2'), { recursive: true });
      await fs.writeFile(path.join(testDir, 'root.md'), '# Root');
      await fs.writeFile(path.join(testDir, 'level1', 'l1.md'), '# L1');
      await fs.writeFile(path.join(testDir, 'level1', 'level2', 'l2.md'), '# L2');

      const explorer = new SourceExplorer();
      const files = await explorer.scan(testDir, { maxDepth: 1 });

      expect(files).toHaveLength(2); // root.md and level1/l1.md
    });

    it('should include file size', async () => {
      const content = 'Test content for size';
      await fs.writeFile(path.join(testDir, 'test.md'), content);

      const explorer = new SourceExplorer();
      const files = await explorer.scan(testDir);

      expect(files).toHaveLength(1);
      expect(files[0]?.size).toBe(content.length);
    });

    it('should exclude hidden files by default', async () => {
      await fs.writeFile(path.join(testDir, '.hidden'), 'hidden');
      await fs.writeFile(path.join(testDir, 'visible.md'), 'visible');

      const explorer = new SourceExplorer();
      const files = await explorer.scan(testDir);

      expect(files).toHaveLength(1);
      expect(files[0]?.name).toBe('visible.md');
    });

    it('should include hidden files when option is set', async () => {
      await fs.writeFile(path.join(testDir, '.hidden'), 'hidden');
      await fs.writeFile(path.join(testDir, 'visible.md'), 'visible');

      const explorer = new SourceExplorer();
      const files = await explorer.scan(testDir, { includeHidden: true });

      expect(files).toHaveLength(2);
    });
  });

  describe('generateSummary', () => {
    it('should generate categorized summary', async () => {
      // Create test files of different types
      await fs.writeFile(path.join(testDir, 'scenario.md'), '# Scenario');
      await fs.writeFile(path.join(testDir, 'brief.md'), '# Brief');
      await fs.writeFile(path.join(testDir, 'draft.md'), '# Draft');
      await fs.writeFile(path.join(testDir, 'data.xlsx'), 'binary');
      await fs.writeFile(path.join(testDir, 'stats.csv'), 'a,b,c');
      await fs.writeFile(path.join(testDir, 'report.pdf'), 'binary');
      await fs.writeFile(path.join(testDir, 'photo.jpg'), 'binary');

      const explorer = new SourceExplorer();
      const summary = await explorer.generateSummary(testDir);

      expect(summary.scenarios).toHaveLength(2);
      expect(summary.content).toHaveLength(1);
      expect(summary.data).toHaveLength(2);
      expect(summary.materials).toHaveLength(1);
      expect(summary.images).toHaveLength(1);
      expect(summary.unknown).toHaveLength(0);
    });

    it('should return total file count', async () => {
      await fs.writeFile(path.join(testDir, 'a.md'), 'a');
      await fs.writeFile(path.join(testDir, 'b.pdf'), 'b');
      await fs.writeFile(path.join(testDir, 'c.jpg'), 'c');

      const explorer = new SourceExplorer();
      const summary = await explorer.generateSummary(testDir);

      expect(summary.totalFiles).toBe(3);
    });
  });

  describe('getPreview', () => {
    it('should get preview of text file', async () => {
      const content = 'Line 1\nLine 2\nLine 3\nLine 4\nLine 5';
      await fs.writeFile(path.join(testDir, 'test.md'), content);

      const explorer = new SourceExplorer();
      const preview = await explorer.getPreview(path.join(testDir, 'test.md'));

      expect(preview).toContain('Line 1');
      expect(preview).toContain('Line 2');
    });

    it('should limit preview length', async () => {
      const content = 'A'.repeat(1000);
      await fs.writeFile(path.join(testDir, 'test.md'), content);

      const explorer = new SourceExplorer();
      const preview = await explorer.getPreview(path.join(testDir, 'test.md'), {
        maxLength: 100,
      });

      expect(preview?.length).toBeLessThanOrEqual(103); // 100 + "..."
    });

    it('should return null for binary files', async () => {
      await fs.writeFile(path.join(testDir, 'test.pdf'), Buffer.from([0x00, 0x01]));

      const explorer = new SourceExplorer();
      const preview = await explorer.getPreview(path.join(testDir, 'test.pdf'));

      expect(preview).toBeNull();
    });
  });
});
