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
});
