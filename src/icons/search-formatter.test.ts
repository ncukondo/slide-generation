import { describe, it, expect } from 'vitest';
import { formatExternalSearchResults, ExternalSearchResult } from './search-formatter.js';

describe('formatExternalSearchResults', () => {
  const mockResults: ExternalSearchResult = {
    query: 'stethoscope',
    total: 3,
    icons: [
      { reference: 'healthicons:stethoscope', set: 'healthicons', name: 'stethoscope' },
      { reference: 'mdi:stethoscope', set: 'mdi', name: 'stethoscope' },
      { reference: 'fa6-solid:stethoscope', set: 'fa6-solid', name: 'stethoscope' },
    ],
  };

  it('should format as table', () => {
    const output = formatExternalSearchResults(mockResults, 'table');

    expect(output).toContain('External Icon Search');
    expect(output).toContain('stethoscope');
    expect(output).toContain('healthicons:stethoscope');
    expect(output).toContain('mdi:stethoscope');
  });

  it('should format as JSON', () => {
    const output = formatExternalSearchResults(mockResults, 'json');
    const parsed = JSON.parse(output);

    expect(parsed.query).toBe('stethoscope');
    expect(parsed.icons).toHaveLength(3);
  });

  it('should format as LLM-friendly output', () => {
    const output = formatExternalSearchResults(mockResults, 'llm');

    expect(output).toContain('# External Icon Search Results');
    expect(output).toContain('Query: stethoscope');
    expect(output).toContain('healthicons:stethoscope');
    expect(output).toContain('slide-gen icons add');
  });

  it('should handle empty results', () => {
    const emptyResults: ExternalSearchResult = {
      query: 'nonexistent',
      total: 0,
      icons: [],
    };

    const output = formatExternalSearchResults(emptyResults, 'table');
    expect(output).toContain('No icons found');
  });
});
