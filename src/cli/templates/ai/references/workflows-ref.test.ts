import { describe, it, expect } from 'vitest';
import { generateWorkflowsRef } from './workflows-ref';

describe('generateWorkflowsRef', () => {
  it('should include entry point question', () => {
    const content = generateWorkflowsRef();
    expect(content).toContain('Entry Point');
    expect(content).toContain('What materials do you have?');
  });

  it('should include detailed Pattern A steps', () => {
    const content = generateWorkflowsRef();
    expect(content).toContain('Pattern A');
    expect(content).toContain('Scan directory structure');
    expect(content).toContain('Classify files');
  });

  it('should include detailed Pattern B steps', () => {
    const content = generateWorkflowsRef();
    expect(content).toContain('Pattern B');
    expect(content).toContain('Identify what information is present');
    expect(content).toContain('Ask targeted questions');
  });

  it('should include detailed Pattern C steps', () => {
    const content = generateWorkflowsRef();
    expect(content).toContain('Pattern C');
    expect(content).toContain('Ask basic questions');
    expect(content).toContain('Propose slide structure');
  });
});
