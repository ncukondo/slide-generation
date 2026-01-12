import { describe, it, expect } from 'vitest';
import { generateSkillMd } from './skill-md';

describe('generateSkillMd', () => {
  it('should include first question about materials', () => {
    const content = generateSkillMd();
    expect(content).toContain('First Question');
    expect(content).toContain('What materials do you have?');
  });

  it('should include Pattern A workflow', () => {
    const content = generateSkillMd();
    expect(content).toContain('Pattern A');
    expect(content).toContain('Explore Mode');
  });

  it('should include Pattern B workflow', () => {
    const content = generateSkillMd();
    expect(content).toContain('Pattern B');
    expect(content).toContain('Supplement Mode');
  });

  it('should include Pattern C workflow', () => {
    const content = generateSkillMd();
    expect(content).toContain('Pattern C');
    expect(content).toContain('Interview Mode');
  });

  it('should reference workflows.md for details', () => {
    const content = generateSkillMd();
    expect(content).toContain('references/workflows.md');
  });

  it('should include reference management section', () => {
    const content = generateSkillMd();

    expect(content).toContain('Reference Management');
    expect(content).toContain('ref search');
    expect(content).toContain('ref add');
    expect(content).toContain('slide-gen validate');
  });

  it('should include quick commands for references', () => {
    const content = generateSkillMd();

    expect(content).toContain('pmid:');
    expect(content).toContain('DOI');
  });

  it('should reference the detailed skill file', () => {
    const content = generateSkillMd();

    expect(content).toContain('.skills/slide-assistant/references/skill.md');
  });
});
