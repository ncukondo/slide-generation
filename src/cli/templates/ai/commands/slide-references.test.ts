import { describe, it, expect } from 'vitest';
import { generateSlideReferencesCommand } from './slide-references';

describe('generateSlideReferencesCommand', () => {
  it('should generate slide references command markdown', () => {
    const content = generateSlideReferencesCommand();

    expect(content).toContain('Manage references');
  });

  it('should include available actions', () => {
    const content = generateSlideReferencesCommand();

    expect(content).toContain('Available Actions');
    expect(content).toContain('Analyze');
    expect(content).toContain('Search');
    expect(content).toContain('Add');
    expect(content).toContain('List');
  });

  it('should include ref commands', () => {
    const content = generateSlideReferencesCommand();

    expect(content).toContain('ref search');
    expect(content).toContain('ref list');
    expect(content).toContain('ref add');
  });

  it('should include pmid and doi examples', () => {
    const content = generateSlideReferencesCommand();

    expect(content).toContain('pmid:');
    expect(content).toContain('DOI');
  });

  it('should include validation command', () => {
    const content = generateSlideReferencesCommand();

    expect(content).toContain('slide-gen validate');
  });
});
