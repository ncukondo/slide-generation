import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { readFile, mkdir, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { randomUUID } from 'crypto';

describe('E2E: init command with AI config', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = join(tmpdir(), `slide-gen-e2e-${randomUUID()}`);
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it('should generate all AI config files', () => {
    const projectDir = join(testDir, 'my-project');
    execSync(
      `node ${join(process.cwd(), 'dist/cli/index.js')} init "${projectDir}" --skip-marp-install`,
      { stdio: 'pipe' }
    );

    // AgentSkills
    expect(existsSync(join(projectDir, '.skills', 'slide-assistant', 'SKILL.md'))).toBe(true);
    expect(
      existsSync(join(projectDir, '.skills', 'slide-assistant', 'references', 'templates.md'))
    ).toBe(true);
    expect(
      existsSync(join(projectDir, '.skills', 'slide-assistant', 'references', 'workflows.md'))
    ).toBe(true);

    // Claude Code
    expect(existsSync(join(projectDir, 'CLAUDE.md'))).toBe(true);
    expect(existsSync(join(projectDir, '.claude', 'commands', 'slide-create.md'))).toBe(true);
    expect(existsSync(join(projectDir, '.claude', 'commands', 'slide-validate.md'))).toBe(true);
    expect(existsSync(join(projectDir, '.claude', 'commands', 'slide-preview.md'))).toBe(true);
    expect(existsSync(join(projectDir, '.claude', 'commands', 'slide-screenshot.md'))).toBe(true);
    expect(existsSync(join(projectDir, '.claude', 'commands', 'slide-theme.md'))).toBe(true);

    // OpenCode
    expect(existsSync(join(projectDir, 'AGENTS.md'))).toBe(true);
    expect(existsSync(join(projectDir, '.opencode', 'agent', 'slide.md'))).toBe(true);

    // Cursor
    expect(existsSync(join(projectDir, '.cursorrules'))).toBe(true);
  });

  it('should generate SKILL.md with correct content', async () => {
    const projectDir = join(testDir, 'skill-content-test');
    execSync(
      `node ${join(process.cwd(), 'dist/cli/index.js')} init "${projectDir}" --skip-marp-install`,
      { stdio: 'pipe' }
    );

    const content = await readFile(
      join(projectDir, '.skills', 'slide-assistant', 'SKILL.md'),
      'utf-8'
    );
    expect(content).toContain('name: slide-assistant');
    expect(content).toContain('slide-gen');
    expect(content).toContain('allowed-tools:');
  });

  it('should generate CLAUDE.md with correct content', async () => {
    const projectDir = join(testDir, 'claude-content-test');
    execSync(
      `node ${join(process.cwd(), 'dist/cli/index.js')} init "${projectDir}" --skip-marp-install`,
      { stdio: 'pipe' }
    );

    const content = await readFile(join(projectDir, 'CLAUDE.md'), 'utf-8');
    expect(content).toContain('slide-gen');
    expect(content).toContain('.skills/slide-assistant');
  });

  it('should generate OpenCode agent with correct content', async () => {
    const projectDir = join(testDir, 'opencode-content-test');
    execSync(
      `node ${join(process.cwd(), 'dist/cli/index.js')} init "${projectDir}" --skip-marp-install`,
      { stdio: 'pipe' }
    );

    const content = await readFile(join(projectDir, '.opencode', 'agent', 'slide.md'), 'utf-8');
    expect(content).toContain('mode: subagent');
    expect(content).toContain('slide-gen');
  });

  it('should skip AI config with --no-ai-config', () => {
    const projectDir = join(testDir, 'no-ai-config');
    execSync(
      `node ${join(process.cwd(), 'dist/cli/index.js')} init "${projectDir}" --no-ai-config --skip-marp-install`,
      { stdio: 'pipe' }
    );

    expect(existsSync(join(projectDir, 'CLAUDE.md'))).toBe(false);
    expect(existsSync(join(projectDir, 'AGENTS.md'))).toBe(false);
    expect(existsSync(join(projectDir, '.skills'))).toBe(false);
    expect(existsSync(join(projectDir, '.cursorrules'))).toBe(false);

    // Basic files should still exist
    expect(existsSync(join(projectDir, 'config.yaml'))).toBe(true);
    expect(existsSync(join(projectDir, 'presentation.yaml'))).toBe(true);
  });

  it('should not overwrite existing AI config files', async () => {
    const projectDir = join(testDir, 'existing-files');
    await mkdir(projectDir, { recursive: true });

    // Create existing CLAUDE.md
    const existingContent = '# Existing CLAUDE.md';
    await import('fs/promises').then((fs) =>
      fs.writeFile(join(projectDir, 'CLAUDE.md'), existingContent)
    );

    execSync(
      `node ${join(process.cwd(), 'dist/cli/index.js')} init "${projectDir}" --skip-marp-install`,
      { stdio: 'pipe' }
    );

    const content = await readFile(join(projectDir, 'CLAUDE.md'), 'utf-8');
    expect(content).toBe(existingContent);
  });

  it('should generate slash commands with correct content', async () => {
    const projectDir = join(testDir, 'commands-content-test');
    execSync(
      `node ${join(process.cwd(), 'dist/cli/index.js')} init "${projectDir}" --skip-marp-install`,
      { stdio: 'pipe' }
    );

    const createContent = await readFile(
      join(projectDir, '.claude', 'commands', 'slide-create.md'),
      'utf-8'
    );
    expect(createContent).toContain('slide-gen templates list');
    expect(createContent).toContain('slide-gen validate');

    const screenshotContent = await readFile(
      join(projectDir, '.claude', 'commands', 'slide-screenshot.md'),
      'utf-8'
    );
    expect(screenshotContent).toContain('slide-gen screenshot');
  });

  it('should generate references with correct content', async () => {
    const projectDir = join(testDir, 'references-content-test');
    execSync(
      `node ${join(process.cwd(), 'dist/cli/index.js')} init "${projectDir}" --skip-marp-install`,
      { stdio: 'pipe' }
    );

    const templatesContent = await readFile(
      join(projectDir, '.skills', 'slide-assistant', 'references', 'templates.md'),
      'utf-8'
    );
    expect(templatesContent).toContain('Template Reference');
    expect(templatesContent).toContain('title');
    expect(templatesContent).toContain('bullet-list');

    const workflowsContent = await readFile(
      join(projectDir, '.skills', 'slide-assistant', 'references', 'workflows.md'),
      'utf-8'
    );
    expect(workflowsContent).toContain('Workflow Reference');
    expect(workflowsContent).toContain('Source Collection Flow');
  });
});
