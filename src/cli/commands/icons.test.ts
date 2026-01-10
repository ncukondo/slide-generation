import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Command } from 'commander';
import {
  createIconsCommand,
  formatIconSourceList,
  formatAliasesList,
  formatSearchResults,
} from './icons.js';

// Mock console.log and console.error
const mockConsoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});
const mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

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
});
