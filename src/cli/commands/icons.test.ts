import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import { Command } from 'commander';
import {
  createIconsCommand,
  formatIconSourceList,
  formatAliasesList,
  formatSearchResults,
  addAliasToRegistry,
  updateAliasInRegistry,
} from './icons.js';

// Mock console.log and console.error
const mockConsoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});
const mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

// Mock fetch for icon add tests
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('icons command', () => {
  beforeEach(() => {
    mockConsoleLog.mockClear();
    mockConsoleError.mockClear();
    process.exitCode = undefined;
  });

  afterEach(() => {
    process.exitCode = undefined;
  });

  describe('createIconsCommand', () => {
    it('should create a command with correct name and description', () => {
      const cmd = createIconsCommand();

      expect(cmd.name()).toBe('icons');
      expect(cmd.description()).toBe('Manage and search icons');
    });

    it('should have list, search, and preview subcommands', () => {
      const cmd = createIconsCommand();
      const subcommands = cmd.commands.map((c: Command) => c.name());

      expect(subcommands).toContain('list');
      expect(subcommands).toContain('search');
      expect(subcommands).toContain('preview');
    });
  });

  describe('formatIconSourceList', () => {
    it('should format sources as table', () => {
      const sources = [
        { name: 'material-icons', type: 'web-font' as const, prefix: 'mi' },
        { name: 'heroicons', type: 'svg-inline' as const, prefix: 'hero' },
      ];

      const output = formatIconSourceList(sources, 'table');

      expect(output).toContain('Icon Sources:');
      expect(output).toContain('material-icons');
      expect(output).toContain('heroicons');
      expect(output).toContain('mi');
      expect(output).toContain('hero');
      expect(output).toContain('web-font');
      expect(output).toContain('svg-inline');
    });

    it('should format sources as JSON', () => {
      const sources = [
        { name: 'material-icons', type: 'web-font' as const, prefix: 'mi' },
      ];

      const output = formatIconSourceList(sources, 'json');
      const parsed = JSON.parse(output);

      expect(parsed).toBeInstanceOf(Array);
      expect(parsed[0].name).toBe('material-icons');
      expect(parsed[0].type).toBe('web-font');
      expect(parsed[0].prefix).toBe('mi');
    });
  });

  describe('formatAliasesList', () => {
    it('should format aliases as table', () => {
      const aliases = {
        planning: 'mi:event_note',
        success: 'mi:check_circle',
      };

      const output = formatAliasesList(aliases, 'table');

      expect(output).toContain('Icon Aliases:');
      expect(output).toContain('planning');
      expect(output).toContain('mi:event_note');
      expect(output).toContain('success');
      expect(output).toContain('mi:check_circle');
    });

    it('should format aliases as JSON', () => {
      const aliases = {
        planning: 'mi:event_note',
      };

      const output = formatAliasesList(aliases, 'json');
      const parsed = JSON.parse(output);

      expect(parsed).toEqual(aliases);
    });

    it('should handle empty aliases', () => {
      const output = formatAliasesList({}, 'table');

      expect(output).toContain('No aliases defined');
    });
  });

  describe('formatSearchResults', () => {
    it('should format search results with matching aliases', () => {
      const results = {
        query: 'arrow',
        aliases: [
          { alias: 'back', target: 'mi:arrow_back' },
          { alias: 'forward', target: 'mi:arrow_forward' },
        ],
        sources: [],
      };

      const output = formatSearchResults(results, 'table');

      expect(output).toContain('Search results for "arrow"');
      expect(output).toContain('Aliases:');
      expect(output).toContain('back');
      expect(output).toContain('mi:arrow_back');
    });

    it('should format search results with matching sources', () => {
      const results = {
        query: 'material',
        aliases: [],
        sources: [
          { name: 'material-icons', prefix: 'mi', type: 'web-font' as const },
        ],
      };

      const output = formatSearchResults(results, 'table');

      expect(output).toContain('Sources:');
      expect(output).toContain('material-icons');
    });

    it('should format search results as JSON', () => {
      const results = {
        query: 'test',
        aliases: [{ alias: 'test', target: 'mi:test' }],
        sources: [],
      };

      const output = formatSearchResults(results, 'json');
      const parsed = JSON.parse(output);

      expect(parsed.query).toBe('test');
      expect(parsed.aliases).toHaveLength(1);
    });

    it('should indicate when no results found', () => {
      const results = {
        query: 'nonexistent',
        aliases: [],
        sources: [],
      };

      const output = formatSearchResults(results, 'table');

      expect(output).toContain('No results found');
    });
  });

  describe('addAliasToRegistry', () => {
    let tempDir: string;
    let registryPath: string;

    beforeEach(async () => {
      tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'icons-add-test-'));
      registryPath = path.join(tempDir, 'registry.yaml');
      await fs.writeFile(
        registryPath,
        `sources:
  - name: fetched
    type: local-svg
    prefix: fetched
    path: "./icons/fetched/"

aliases:
  planning: "mi:event_note"
`
      );
    });

    afterEach(async () => {
      await fs.rm(tempDir, { recursive: true, force: true });
    });

    it('should add new alias to registry', async () => {
      await addAliasToRegistry(registryPath, 'stethoscope', 'fetched:healthicons/stethoscope');

      const content = await fs.readFile(registryPath, 'utf-8');
      expect(content).toContain('stethoscope:');
      expect(content).toContain('fetched:healthicons/stethoscope');
    });

    it('should reject duplicate alias', async () => {
      await expect(
        addAliasToRegistry(registryPath, 'planning', 'fetched:something')
      ).rejects.toThrow('Alias already exists');
    });

    it('should preserve existing aliases', async () => {
      await addAliasToRegistry(registryPath, 'new-icon', 'fetched:test/icon');

      const content = await fs.readFile(registryPath, 'utf-8');
      expect(content).toContain('planning:');
      expect(content).toContain('mi:event_note');
      expect(content).toContain('new-icon:');
    });
  });

  describe('updateAliasInRegistry', () => {
    let tempDir: string;
    let registryPath: string;

    beforeEach(async () => {
      tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'icons-update-test-'));
      registryPath = path.join(tempDir, 'registry.yaml');
      await fs.writeFile(
        registryPath,
        `sources: []

aliases:
  stethoscope: "health:stethoscope"
`
      );
    });

    afterEach(async () => {
      await fs.rm(tempDir, { recursive: true, force: true });
    });

    it('should update existing alias', async () => {
      await updateAliasInRegistry(registryPath, 'stethoscope', 'fetched:healthicons/stethoscope');

      const content = await fs.readFile(registryPath, 'utf-8');
      expect(content).toContain('stethoscope:');
      expect(content).toContain('fetched:healthicons/stethoscope');
      expect(content).not.toContain('health:stethoscope');
    });

    it('should add alias if not exists', async () => {
      await updateAliasInRegistry(registryPath, 'new-alias', 'fetched:test/icon');

      const content = await fs.readFile(registryPath, 'utf-8');
      expect(content).toContain('new-alias:');
    });
  });

  describe('icons add command', () => {
    it('should have add subcommand', () => {
      const cmd = createIconsCommand();
      const subcommands = cmd.commands.map((c: Command) => c.name());

      expect(subcommands).toContain('add');
    });

    it('should have sync subcommand', () => {
      const cmd = createIconsCommand();
      const subcommands = cmd.commands.map((c: Command) => c.name());

      expect(subcommands).toContain('sync');
    });
  });

  describe('extractIconReferences', () => {
    it('should extract icon references from presentation', async () => {
      const { extractIconReferences } = await import('./icons.js');
      const presentation = {
        meta: { title: 'Test' },
        slides: [
          { template: 'bullet-list', title: 'Test', items: ['item1'], icon: 'planning' },
          { template: 'cycle-diagram', nodes: [{ label: 'A', icon: 'success' }, { label: 'B', icon: 'warning' }] },
        ],
      };

      const icons = extractIconReferences(presentation);
      expect(icons).toContain('planning');
      expect(icons).toContain('success');
      expect(icons).toContain('warning');
    });

    it('should return unique icons only', async () => {
      const { extractIconReferences } = await import('./icons.js');
      const presentation = {
        meta: { title: 'Test' },
        slides: [
          { template: 'bullet-list', icon: 'planning' },
          { template: 'bullet-list', icon: 'planning' },
        ],
      };

      const icons = extractIconReferences(presentation);
      expect(icons).toEqual(['planning']);
    });

    it('should handle presentation without icons', async () => {
      const { extractIconReferences } = await import('./icons.js');
      const presentation = {
        meta: { title: 'Test' },
        slides: [
          { template: 'title', title: 'Hello' },
        ],
      };

      const icons = extractIconReferences(presentation);
      expect(icons).toEqual([]);
    });
  });

  describe('isExternalSource', () => {
    it('should identify external sources', async () => {
      const { isExternalSource } = await import('./icons.js');

      expect(isExternalSource('health')).toBe(true);
      expect(isExternalSource('ms')).toBe(true);
      expect(isExternalSource('hero')).toBe(true);
    });

    it('should identify local sources', async () => {
      const { isExternalSource } = await import('./icons.js');

      expect(isExternalSource('fetched')).toBe(false);
      expect(isExternalSource('custom')).toBe(false);
      expect(isExternalSource('mi')).toBe(false);
    });
  });
});
