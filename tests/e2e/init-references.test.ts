import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execSync } from 'child_process';
import { existsSync, readFileSync, rmSync, mkdirSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { randomUUID } from 'crypto';

describe('E2E: init reference skills', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = join(tmpdir(), `slide-gen-init-refs-${randomUUID()}`);
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it('should generate reference skill files on init', () => {
    execSync(
      `node ${join(process.cwd(), 'dist/cli/index.js')} init "${testDir}" --skip-marp-install`,
      { encoding: 'utf-8' }
    );

    // Check reference skill exists
    const refSkillPath = join(testDir, '.skills/slide-assistant/references/skill.md');
    expect(existsSync(refSkillPath)).toBe(true);

    const content = readFileSync(refSkillPath, 'utf-8');
    expect(content).toContain('Reference Management');
    expect(content).toContain('ref add');
  });

  it('should generate slide-references command', () => {
    execSync(
      `node ${join(process.cwd(), 'dist/cli/index.js')} init "${testDir}" --skip-marp-install`,
      { encoding: 'utf-8' }
    );

    const cmdPath = join(testDir, '.claude/commands/slide-references.md');
    expect(existsSync(cmdPath)).toBe(true);

    const content = readFileSync(cmdPath, 'utf-8');
    expect(content).toContain('Manage references');
  });

  it('should include references in main SKILL.md', () => {
    execSync(
      `node ${join(process.cwd(), 'dist/cli/index.js')} init "${testDir}" --skip-marp-install`,
      { encoding: 'utf-8' }
    );

    const skillPath = join(testDir, '.skills/slide-assistant/SKILL.md');
    const content = readFileSync(skillPath, 'utf-8');

    expect(content).toContain('Reference');
    expect(content).toContain('ref search');
  });

  it('should include citation workflow in skill.md', () => {
    execSync(
      `node ${join(process.cwd(), 'dist/cli/index.js')} init "${testDir}" --skip-marp-install`,
      { encoding: 'utf-8' }
    );

    const refSkillPath = join(testDir, '.skills/slide-assistant/references/skill.md');
    const content = readFileSync(refSkillPath, 'utf-8');

    // Check workflow phases
    expect(content).toContain('Phase 1: Analyze Content');
    expect(content).toContain('Phase 2: Search Existing Library');
    expect(content).toContain('Phase 3: Match or Request');
    expect(content).toContain('Phase 4: Add New References');
    expect(content).toContain('Phase 5: Insert Citations');
  });

  it('should include citation requirement analysis table', () => {
    execSync(
      `node ${join(process.cwd(), 'dist/cli/index.js')} init "${testDir}" --skip-marp-install`,
      { encoding: 'utf-8' }
    );

    const refSkillPath = join(testDir, '.skills/slide-assistant/references/skill.md');
    const content = readFileSync(refSkillPath, 'utf-8');

    // Check citation requirement table
    expect(content).toContain('Statement Type');
    expect(content).toContain('Statistical claims');
    expect(content).toContain('Research findings');
  });

  it('should include slide-references command with all actions', () => {
    execSync(
      `node ${join(process.cwd(), 'dist/cli/index.js')} init "${testDir}" --skip-marp-install`,
      { encoding: 'utf-8' }
    );

    const cmdPath = join(testDir, '.claude/commands/slide-references.md');
    const content = readFileSync(cmdPath, 'utf-8');

    // Check available actions
    expect(content).toContain('Analyze');
    expect(content).toContain('Search');
    expect(content).toContain('Add');
    expect(content).toContain('List');
    expect(content).toContain('ref search');
    expect(content).toContain('ref add');
  });
});
