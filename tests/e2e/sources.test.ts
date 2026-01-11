import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { SourcesManager } from '../../src/sources/manager.js';
import { SourceImporter } from '../../src/sources/importer.js';
import { ConversationLogger } from '../../src/sources/conversation.js';
import { executeSourcesInit, executeSourcesStatus } from '../../src/cli/commands/sources.js';
import { executeInit } from '../../src/cli/commands/init.js';

describe('E2E: Source Management', () => {
  const testDir = '/tmp/e2e-sources-test';
  const testMaterialsDir = '/tmp/e2e-test-materials';

  beforeEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
    await fs.rm(testMaterialsDir, { recursive: true, force: true });
    await fs.mkdir(testDir, { recursive: true });
    await fs.mkdir(testMaterialsDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
    await fs.rm(testMaterialsDir, { recursive: true, force: true });
  });

  it('should initialize project with sources', async () => {
    await executeInit(testDir, {
      examples: false,
      aiConfig: false,
      skipMarpInstall: true,
    });

    const sourcesExists = await fs
      .access(path.join(testDir, 'sources', 'sources.yaml'))
      .then(() => true)
      .catch(() => false);
    expect(sourcesExists).toBe(true);

    // Verify directory structure
    const dirs = ['scenario', 'content', 'materials', 'data', 'conversation'];
    for (const dir of dirs) {
      const exists = await fs
        .access(path.join(testDir, 'sources', dir))
        .then(() => true)
        .catch(() => false);
      expect(exists).toBe(true);
    }
  });

  it('should initialize with --no-sources option', async () => {
    await executeInit(testDir, {
      examples: false,
      aiConfig: false,
      sources: false,
      skipMarpInstall: true,
    });

    const sourcesExists = await fs
      .access(path.join(testDir, 'sources'))
      .then(() => true)
      .catch(() => false);
    expect(sourcesExists).toBe(false);
  });

  it('should import from existing directory (Pattern A)', async () => {
    // Setup test directory with files
    await fs.writeFile(path.join(testMaterialsDir, 'scenario.md'), '# Test Scenario');
    await fs.writeFile(path.join(testMaterialsDir, 'data.xlsx'), 'test data');
    await fs.writeFile(path.join(testMaterialsDir, 'report.pdf'), 'test report');

    await executeSourcesInit(testDir, {
      fromDirectory: testMaterialsDir,
      name: 'Pattern A Test',
    });

    const manager = new SourcesManager(testDir);
    const data = await manager.load();

    expect(data.project.setup_pattern).toBe('A');
    expect(data.project.original_source).toBe(testMaterialsDir);
    expect(data.sources?.length).toBeGreaterThan(0);

    // Verify files were imported
    const scenarioImported = data.sources?.some((s) => s.type === 'scenario');
    const dataImported = data.sources?.some((s) => s.type === 'data');
    const materialImported = data.sources?.some((s) => s.type === 'material');

    expect(scenarioImported).toBe(true);
    expect(dataImported).toBe(true);
    expect(materialImported).toBe(true);
  });

  it('should handle scenario-only input (Pattern B)', async () => {
    const scenarioPath = path.join(testMaterialsDir, 'scenario.md');
    await fs.writeFile(
      scenarioPath,
      `# New Product Launch

## Purpose
Internal product announcement.

## Structure
1. Introduction
2. Features
3. Demo
`
    );

    await executeSourcesInit(testDir, {
      fromFile: scenarioPath,
      name: 'Pattern B Test',
    });

    const manager = new SourcesManager(testDir);
    const data = await manager.load();

    expect(data.project.setup_pattern).toBe('B');
    expect(data.sources?.some((s) => s.type === 'scenario')).toBe(true);
  });

  it('should track conversation log', async () => {
    await executeSourcesInit(testDir, { name: 'Conversation Test' });

    const manager = new SourcesManager(testDir);
    const logger = new ConversationLogger(testDir, manager);

    await logger.start('E2E Test Session');
    await logger.addDecision('Using 10 slides');
    await logger.addUserInfo('Target audience: engineers');
    await logger.addQuestion('What is the main goal?');
    await logger.addNote('Remember to add charts');
    await logger.close();

    const data = await manager.load();

    const conversationEntry = data.sources?.find((s) => s.type === 'conversation');
    expect(conversationEntry).toBeDefined();
    expect(conversationEntry?.decisions).toContain('Using 10 slides');

    // Verify log file content
    const logDir = path.join(testDir, 'sources', 'conversation');
    const files = await fs.readdir(logDir);
    expect(files.length).toBeGreaterThan(0);

    const logContent = await fs.readFile(
      path.join(logDir, files[0]!),
      'utf-8'
    );
    expect(logContent).toContain('E2E Test Session');
    expect(logContent).toContain('Using 10 slides');
    expect(logContent).toContain('Target audience: engineers');
  });

  it('should show accurate status', async () => {
    await executeSourcesInit(testDir, { name: 'Status Test' });

    const manager = new SourcesManager(testDir);

    // Add some sources
    await manager.addSource({
      id: 'test-scenario',
      type: 'scenario',
      path: 'scenario/test.md',
    });
    await manager.addSource({
      id: 'test-data',
      type: 'data',
      path: 'data/test.xlsx',
    });

    // Add missing item
    await manager.addMissing({
      item: 'Product photo',
      needed_for: 'Slide 4',
      status: 'pending',
    });

    const result = await executeSourcesStatus(testDir, {});

    expect(result.success).toBe(true);
    expect(result.output).toContain('Status Test');
    expect(result.output).toContain('scenario: 1');
    expect(result.output).toContain('data: 1');
    expect(result.output).toContain('Product photo');
  });

  it('should import files with correct classification', async () => {
    await executeSourcesInit(testDir, { name: 'Classification Test' });

    const manager = new SourcesManager(testDir);
    const importer = new SourceImporter(testDir, manager);

    // Create test files
    await fs.writeFile(path.join(testMaterialsDir, 'scenario.md'), '# Scenario');
    await fs.writeFile(path.join(testMaterialsDir, 'draft.md'), '# Draft');
    await fs.writeFile(path.join(testMaterialsDir, 'statistics.csv'), 'a,b,c');
    await fs.writeFile(path.join(testMaterialsDir, 'spec.pdf'), 'PDF content');

    await importer.importDirectory(testMaterialsDir, { recursive: true });

    const data = await manager.load();

    // Verify classifications
    const sources = data.sources ?? [];
    expect(sources.find((s) => s.id === 'scenario')?.type).toBe('scenario');
    expect(sources.find((s) => s.id === 'draft')?.type).toBe('content');
    expect(sources.find((s) => s.id === 'statistics')?.type).toBe('data');
    expect(sources.find((s) => s.id === 'spec')?.type).toBe('material');
  });

  it('should resolve missing items', async () => {
    await executeSourcesInit(testDir, { name: 'Missing Test' });

    const manager = new SourcesManager(testDir);

    // Add missing item
    await manager.addMissing({
      item: 'Product photo',
      needed_for: 'Slide 4',
      status: 'pending',
    });

    // Verify it's in the list
    let data = await manager.load();
    expect(data.missing?.some((m) => m.item === 'Product photo')).toBe(true);

    // Resolve the missing item
    await manager.resolveMissing('Product photo');

    // Verify it's removed
    data = await manager.load();
    expect(data.missing?.some((m) => m.item === 'Product photo')).toBe(false);
  });

  it('should update context with merge', async () => {
    await executeSourcesInit(testDir, { name: 'Context Test' });

    const manager = new SourcesManager(testDir);

    // Set initial context
    await manager.updateContext({
      objective: 'Initial objective',
      audience: {
        type: 'Engineers',
        size: '10-20',
      },
    });

    // Update with additional fields
    await manager.updateContext({
      key_messages: ['Message 1', 'Message 2'],
    });

    const data = await manager.load();

    // Verify both old and new values are present
    expect(data.context?.objective).toBe('Initial objective');
    expect(data.context?.audience?.type).toBe('Engineers');
    expect(data.context?.key_messages).toEqual(['Message 1', 'Message 2']);
  });
});
