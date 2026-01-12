import { describe, it, expect } from 'vitest';
import { generateReferenceSkillMd } from './skill-references';

describe('generateReferenceSkillMd', () => {
  it('should generate reference skill markdown', () => {
    const content = generateReferenceSkillMd();

    expect(content).toContain('Reference Management');
  });

  it('should include when to invoke section', () => {
    const content = generateReferenceSkillMd();

    expect(content).toContain('When to Invoke');
    expect(content).toContain('academic');
    expect(content).toContain('citations');
  });

  it('should include citation requirement analysis table', () => {
    const content = generateReferenceSkillMd();

    expect(content).toContain('Statement Type');
    expect(content).toContain('Statistical claims');
    expect(content).toContain('Research findings');
    expect(content).toContain('Required');
    expect(content).toContain('Recommended');
  });

  it('should include workflow phases', () => {
    const content = generateReferenceSkillMd();

    expect(content).toContain('Phase 1');
    expect(content).toContain('Phase 2');
    expect(content).toContain('Phase 3');
    expect(content).toContain('Phase 4');
    expect(content).toContain('Phase 5');
  });

  it('should include ref commands', () => {
    const content = generateReferenceSkillMd();

    expect(content).toContain('ref list');
    expect(content).toContain('ref search');
    expect(content).toContain('ref add');
    expect(content).toContain('pmid:');
    expect(content).toContain('DOI');
  });

  it('should include user communication templates', () => {
    const content = generateReferenceSkillMd();

    expect(content).toContain('User Communication');
    expect(content).toContain('citation needs');
  });

  it('should include extracting from non-standard input', () => {
    const content = generateReferenceSkillMd();

    expect(content).toContain('URL Patterns');
    expect(content).toContain('PDF');
    expect(content).toContain('PubMed');
  });
});
