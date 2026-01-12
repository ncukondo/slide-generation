import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execSync } from 'node:child_process';
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

describe('E2E: Init AI Templates', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'slide-gen-test-'));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('should generate SKILL.md with first question', () => {
    const projectDir = join(tempDir, 'test-project');
    execSync(`node dist/cli/index.js init ${projectDir} --skip-marp-install`, {
      encoding: 'utf-8',
    });

    const skillMd = readFileSync(
      join(projectDir, '.skills', 'slide-assistant', 'SKILL.md'),
      'utf-8'
    );

    expect(skillMd).toContain('First Question');
    expect(skillMd).toContain('What materials do you have?');
  });

  it('should generate SKILL.md with pattern workflows', () => {
    const projectDir = join(tempDir, 'test-project-patterns');
    execSync(`node dist/cli/index.js init ${projectDir} --skip-marp-install`, {
      encoding: 'utf-8',
    });

    const skillMd = readFileSync(
      join(projectDir, '.skills', 'slide-assistant', 'SKILL.md'),
      'utf-8'
    );

    expect(skillMd).toContain('Pattern A');
    expect(skillMd).toContain('Explore Mode');
    expect(skillMd).toContain('Pattern B');
    expect(skillMd).toContain('Supplement Mode');
    expect(skillMd).toContain('Pattern C');
    expect(skillMd).toContain('Interview Mode');
  });

  it('should generate SKILL.md with reference to workflows.md', () => {
    const projectDir = join(tempDir, 'test-project-ref');
    execSync(`node dist/cli/index.js init ${projectDir} --skip-marp-install`, {
      encoding: 'utf-8',
    });

    const skillMd = readFileSync(
      join(projectDir, '.skills', 'slide-assistant', 'SKILL.md'),
      'utf-8'
    );

    expect(skillMd).toContain('references/workflows.md');
  });

  it('should generate workflows.md with entry point', () => {
    const projectDir = join(tempDir, 'test-project-entry');
    execSync(`node dist/cli/index.js init ${projectDir} --skip-marp-install`, {
      encoding: 'utf-8',
    });

    const workflowsMd = readFileSync(
      join(projectDir, '.skills', 'slide-assistant', 'references', 'workflows.md'),
      'utf-8'
    );

    expect(workflowsMd).toContain('Entry Point');
    expect(workflowsMd).toContain('Pattern A');
    expect(workflowsMd).toContain('Pattern B');
    expect(workflowsMd).toContain('Pattern C');
  });

  it('should generate workflows.md with detailed pattern steps', () => {
    const projectDir = join(tempDir, 'test-project-steps');
    execSync(`node dist/cli/index.js init ${projectDir} --skip-marp-install`, {
      encoding: 'utf-8',
    });

    const workflowsMd = readFileSync(
      join(projectDir, '.skills', 'slide-assistant', 'references', 'workflows.md'),
      'utf-8'
    );

    // Pattern A details
    expect(workflowsMd).toContain('Scan directory structure');
    expect(workflowsMd).toContain('Classify files');

    // Pattern B details
    expect(workflowsMd).toContain('Identify what information is present');
    expect(workflowsMd).toContain('Ask targeted questions');

    // Pattern C details
    expect(workflowsMd).toContain('Ask basic questions');
    expect(workflowsMd).toContain('Propose slide structure');
  });
});
