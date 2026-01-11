# Task: ソース資料管理機能

## Purpose

スライド作成の元となるテキスト資料（シナリオ、原稿、参考資料など）の管理機能を実装する。3つの入力パターン（探索/補完/インタビュー）に対応し、プロジェクトの再現性と透明性を確保する。

## Context

- **関連仕様**: [spec/sources.md](../sources.md)
- **依存タスク**: [22-ai-integration](./22-ai-integration.md), [15-cli-init](./completed/15-cli-init.md)
- **関連ソース**: `src/sources/`, `src/cli/commands/`

## TDD Implementation Cycle

各ステップで以下のサイクルを実行:

1. **Red**: 失敗するテストを書く
2. **Green**: テストを通す最小限の実装
3. **Refactor**: `pnpm lint && pnpm typecheck` を実行し、リファクタリング

## Implementation Steps

### Step 1: sources.yaml スキーマの定義

**Goal**: sources.yamlのZodスキーマを定義

**Test file**: `src/sources/schema.test.ts`

```typescript
describe('Sources Schema', () => {
  describe('sources.yaml', () => {
    it('should validate complete sources.yaml', () => {
      const data = {
        project: {
          name: 'Test Project',
          purpose: 'Testing',
          created: '2025-01-10',
          updated: '2025-01-11'
        },
        context: {
          objective: 'Test objective',
          audience: {
            type: 'Engineers',
            size: '10-20'
          },
          key_messages: ['Message 1'],
          constraints: {
            duration: '15分'
          }
        },
        sources: [
          {
            id: 'brief',
            type: 'scenario',
            path: 'scenario/brief.md',
            status: 'final',
            description: 'Initial brief'
          }
        ]
      };
      const result = sourcesYamlSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should validate source entry', () => {
      const entry = {
        id: 'product-spec',
        type: 'material',
        path: 'materials/spec.pdf',
        status: 'reference',
        origin: '~/Documents/spec.pdf',
        description: 'Product specification'
      };
      const result = sourceEntrySchema.safeParse(entry);
      expect(result.success).toBe(true);
    });

    it('should reject invalid source type', () => {
      const entry = {
        id: 'test',
        type: 'invalid',
        path: 'test.md'
      };
      const result = sourceEntrySchema.safeParse(entry);
      expect(result.success).toBe(false);
    });
  });
});
```

**Implementation**: `src/sources/schema.ts`

```typescript
import { z } from 'zod';

export const sourceTypeSchema = z.enum([
  'scenario',
  'content',
  'material',
  'data',
  'conversation'
]);

export const sourceStatusSchema = z.enum([
  'draft',
  'final',
  'reference',
  'archived'
]);

export const audienceSchema = z.object({
  type: z.string(),
  size: z.string().optional(),
  knowledge_level: z.string().optional(),
  concerns: z.array(z.string()).optional()
});

export const constraintsSchema = z.object({
  duration: z.string().optional(),
  format: z.string().optional(),
  style: z.string().optional()
});

export const contextSchema = z.object({
  objective: z.string().optional(),
  audience: audienceSchema.optional(),
  key_messages: z.array(z.string()).optional(),
  constraints: constraintsSchema.optional()
});

export const sourceEntrySchema = z.object({
  id: z.string(),
  type: sourceTypeSchema,
  path: z.string(),
  status: sourceStatusSchema.optional(),
  origin: z.string().optional(),
  description: z.string().optional(),
  notes: z.string().optional(),
  extracted_data: z.array(z.string()).optional(),
  decisions: z.array(z.string()).optional()
});

export const projectSchema = z.object({
  name: z.string(),
  purpose: z.string().optional(),
  created: z.string().optional(),
  updated: z.string().optional(),
  setup_pattern: z.enum(['A', 'B', 'C']).optional(),
  original_source: z.string().optional()
});

export const sourcesYamlSchema = z.object({
  project: projectSchema,
  context: contextSchema.optional(),
  sources: z.array(sourceEntrySchema).optional(),
  dependencies: z.record(z.object({
    derived_from: z.array(z.string())
  })).optional(),
  missing: z.array(z.object({
    item: z.string(),
    needed_for: z.string().optional(),
    status: z.string().optional(),
    notes: z.string().optional()
  })).optional()
});
```

**Verification**:
- [ ] 全てのフィールドが正しく検証される
- [ ] 無効なデータが拒否される

---

### Step 2: SourcesManager の実装

**Goal**: sources.yaml の読み書きを管理するクラスを実装

**Test file**: `src/sources/manager.test.ts`

```typescript
describe('SourcesManager', () => {
  it('should create new sources.yaml', async () => {
    const manager = new SourcesManager('./test-project');
    await manager.init({
      name: 'Test Project',
      purpose: 'Testing'
    });

    const exists = await fs.pathExists('./test-project/sources/sources.yaml');
    expect(exists).toBe(true);
  });

  it('should load existing sources.yaml', async () => {
    const manager = new SourcesManager('./test-project');
    const data = await manager.load();
    expect(data.project.name).toBe('Test Project');
  });

  it('should add source entry', async () => {
    const manager = new SourcesManager('./test-project');
    await manager.addSource({
      id: 'new-doc',
      type: 'material',
      path: 'materials/doc.pdf',
      description: 'New document'
    });

    const data = await manager.load();
    expect(data.sources).toContainEqual(
      expect.objectContaining({ id: 'new-doc' })
    );
  });

  it('should update context', async () => {
    const manager = new SourcesManager('./test-project');
    await manager.updateContext({
      objective: 'Updated objective'
    });

    const data = await manager.load();
    expect(data.context?.objective).toBe('Updated objective');
  });

  it('should track missing items', async () => {
    const manager = new SourcesManager('./test-project');
    await manager.addMissing({
      item: 'Product photo',
      needed_for: 'Slide 4',
      status: 'pending'
    });

    const data = await manager.load();
    expect(data.missing).toContainEqual(
      expect.objectContaining({ item: 'Product photo' })
    );
  });
});
```

**Implementation**: `src/sources/manager.ts`

```typescript
export class SourcesManager {
  private sourcesDir: string;
  private sourcesYamlPath: string;

  constructor(projectDir: string) {
    this.sourcesDir = path.join(projectDir, 'sources');
    this.sourcesYamlPath = path.join(this.sourcesDir, 'sources.yaml');
  }

  async init(project: ProjectInfo): Promise<void> {
    // Create directory structure
    // Create sources.yaml with initial data
  }

  async load(): Promise<SourcesYaml> {
    // Load and validate sources.yaml
  }

  async save(data: SourcesYaml): Promise<void> {
    // Validate and save sources.yaml
  }

  async addSource(entry: SourceEntry): Promise<void> {
    // Add source entry
  }

  async updateContext(context: Partial<Context>): Promise<void> {
    // Update context section
  }

  async addMissing(item: MissingItem): Promise<void> {
    // Add missing item
  }

  async resolveMissing(item: string): Promise<void> {
    // Remove from missing list
  }
}
```

**Verification**:
- [ ] sources.yaml が正しく作成される
- [ ] 読み込みと保存が正しく動作する
- [ ] ソースエントリの追加・更新が動作する

---

### Step 3: ディレクトリ探索機能（パターンA）

**Goal**: 指定ディレクトリを探索してファイルを分類

**Test file**: `src/sources/explorer.test.ts`

```typescript
describe('SourceExplorer', () => {
  it('should scan directory and list files', async () => {
    const explorer = new SourceExplorer();
    const files = await explorer.scan('~/test-materials');

    expect(files).toContainEqual(
      expect.objectContaining({
        path: expect.stringContaining('scenario.md'),
        type: 'scenario'
      })
    );
  });

  it('should classify files by name pattern', () => {
    const explorer = new SourceExplorer();

    expect(explorer.classifyFile('scenario.md')).toBe('scenario');
    expect(explorer.classifyFile('outline.xlsx')).toBe('scenario');
    expect(explorer.classifyFile('draft.md')).toBe('content');
    expect(explorer.classifyFile('data.xlsx')).toBe('data');
    expect(explorer.classifyFile('spec.pdf')).toBe('material');
    expect(explorer.classifyFile('image.jpg')).toBe('image');
  });

  it('should analyze file content for classification', async () => {
    const explorer = new SourceExplorer();
    const type = await explorer.analyzeContent('unknown.md');
    expect(['scenario', 'content', 'material']).toContain(type);
  });

  it('should generate summary for directory', async () => {
    const explorer = new SourceExplorer();
    const summary = await explorer.generateSummary('~/test-materials');

    expect(summary.scenarios).toHaveLength(2);
    expect(summary.content).toHaveLength(1);
    expect(summary.data).toHaveLength(3);
  });
});
```

**Implementation**: `src/sources/explorer.ts`

```typescript
interface FileInfo {
  path: string;
  name: string;
  type: SourceType | 'image' | 'unknown';
  size: number;
  preview?: string;
}

interface DirectorySummary {
  scenarios: FileInfo[];
  content: FileInfo[];
  materials: FileInfo[];
  data: FileInfo[];
  images: FileInfo[];
  unknown: FileInfo[];
}

export class SourceExplorer {
  private classificationPatterns = {
    scenario: [/scenario/i, /brief/i, /要件/i, /outline/i, /構成/i],
    content: [/draft/i, /content/i, /原稿/i],
    data: [/data/i, /\.xlsx$/, /\.csv$/],
    material: [/spec/i, /report/i, /\.pdf$/],
    image: [/\.jpg$/, /\.png$/, /\.svg$/, /\.gif$/]
  };

  async scan(dirPath: string, options?: ScanOptions): Promise<FileInfo[]> {
    // Recursively scan directory
    // Classify each file
    // Return file list with types
  }

  classifyFile(filename: string): SourceType | 'image' | 'unknown' {
    // Classify by filename pattern
  }

  async analyzeContent(filePath: string): Promise<SourceType> {
    // Read file and analyze content for classification
  }

  async generateSummary(dirPath: string): Promise<DirectorySummary> {
    // Generate categorized summary
  }
}
```

**Verification**:
- [ ] ディレクトリスキャンが動作する
- [ ] ファイル分類が正しく動作する
- [ ] サマリー生成が動作する

---

### Step 4: ファイルインポート機能

**Goal**: 外部ファイルをsourcesディレクトリにコピー/移動する（抽出機能はAI Agentが担当）

**Note**: PDF/Excelからのテキスト・データ抽出は実装しない。AI Agentが直接ファイルを読み取り、必要な情報を抽出する方針。

**Test file**: `src/sources/importer.test.ts`

```typescript
describe('SourceImporter', () => {
  it('should import single file', async () => {
    const importer = new SourceImporter('./test-project');
    await importer.importFile('~/Documents/spec.pdf', {
      type: 'material',
      description: 'Product spec'
    });

    const exists = await fs.pathExists(
      './test-project/sources/materials/spec.pdf'
    );
    expect(exists).toBe(true);
  });

  it('should update sources.yaml after import', async () => {
    const importer = new SourceImporter('./test-project');
    await importer.importFile('~/Documents/doc.pdf');

    const manager = new SourcesManager('./test-project');
    const data = await manager.load();
    expect(data.sources).toContainEqual(
      expect.objectContaining({ path: 'materials/doc.pdf' })
    );
  });

  it('should import directory recursively', async () => {
    const importer = new SourceImporter('./test-project');
    const result = await importer.importDirectory('~/test-materials', {
      recursive: true
    });

    expect(result.imported).toBeGreaterThan(0);
  });

  it('should classify files by extension', async () => {
    const importer = new SourceImporter('./test-project');

    await importer.importFile('scenario.md');
    await importer.importFile('data.xlsx');
    await importer.importFile('report.pdf');

    expect(await fs.pathExists('./test-project/sources/scenario/scenario.md')).toBe(true);
    expect(await fs.pathExists('./test-project/sources/data/data.xlsx')).toBe(true);
    expect(await fs.pathExists('./test-project/sources/materials/report.pdf')).toBe(true);
  });
});
```

**Implementation**: `src/sources/importer.ts`

```typescript
interface ImportOptions {
  type?: SourceType;
  description?: string;
  copy?: boolean;  // true: copy file, false: move file (default: true)
}

interface ImportResult {
  path: string;
  type: SourceType;
  originalPath: string;
}

export class SourceImporter {
  constructor(
    private projectDir: string,
    private manager: SourcesManager
  ) {}

  async importFile(
    sourcePath: string,
    options?: ImportOptions
  ): Promise<ImportResult> {
    // 1. Determine target directory based on type/extension
    // 2. Copy or move file
    // 3. Update sources.yaml with reference to original path
    // 4. Return result
  }

  async importDirectory(
    dirPath: string,
    options?: { recursive?: boolean }
  ): Promise<{ imported: number; skipped: number }> {
    // Import all files from directory
  }
}
```

**Verification**:
- [ ] ファイルがコピー/移動される
- [ ] ファイル拡張子に基づいて適切なディレクトリに配置される
- [ ] sources.yaml が更新される
- [ ] 元ファイルのパスが記録される

---

### Step 5: 会話ログ管理

**Goal**: AI会話ログの保存と管理

**Test file**: `src/sources/conversation.test.ts`

```typescript
describe('ConversationLogger', () => {
  it('should create new conversation log', async () => {
    const logger = new ConversationLogger('./test-project');
    await logger.start('Initial setup');

    const files = await fs.readdir(
      './test-project/sources/conversation'
    );
    expect(files.some(f => f.includes('setup'))).toBe(true);
  });

  it('should add entry to log', async () => {
    const logger = new ConversationLogger('./test-project');
    await logger.start('Test session');
    await logger.addEntry({
      type: 'decision',
      content: 'Using 12 slides'
    });

    const content = await logger.getContent();
    expect(content).toContain('Using 12 slides');
  });

  it('should add user-provided info', async () => {
    const logger = new ConversationLogger('./test-project');
    await logger.start('Test');
    await logger.addUserInfo('The audience is executives');

    const content = await logger.getContent();
    expect(content).toContain('The audience is executives');
  });

  it('should close and save log', async () => {
    const logger = new ConversationLogger('./test-project');
    await logger.start('Test');
    await logger.addEntry({ type: 'decision', content: 'Test' });
    await logger.close();

    const manager = new SourcesManager('./test-project');
    const data = await manager.load();
    expect(data.sources).toContainEqual(
      expect.objectContaining({ type: 'conversation' })
    );
  });
});
```

**Implementation**: `src/sources/conversation.ts`

```typescript
interface LogEntry {
  type: 'decision' | 'info' | 'question' | 'note';
  content: string;
  timestamp?: string;
}

export class ConversationLogger {
  private currentLog: string | null = null;
  private entries: LogEntry[] = [];

  constructor(
    private projectDir: string,
    private manager: SourcesManager
  ) {}

  async start(title: string): Promise<void> {
    // Create new log file with timestamp
  }

  async addEntry(entry: LogEntry): Promise<void> {
    // Add entry to current log
  }

  async addDecision(content: string): Promise<void> {
    await this.addEntry({ type: 'decision', content });
  }

  async addUserInfo(content: string): Promise<void> {
    await this.addEntry({ type: 'info', content });
  }

  async getContent(): Promise<string> {
    // Return current log content
  }

  async close(): Promise<void> {
    // Save log and update sources.yaml
  }
}
```

**Verification**:
- [ ] ログファイルが作成される
- [ ] エントリが追加される
- [ ] ログが保存される

---

### Step 6: sources CLI コマンドの実装

**Goal**: `slide-gen sources` サブコマンドを実装

**Test file**: `src/cli/commands/sources.test.ts`

```typescript
describe('sources command', () => {
  describe('sources init', () => {
    it('should initialize sources directory', async () => {
      const output = await executeSourcesInit();
      expect(output).toContain('Created sources/sources.yaml');
    });

    it('should support --from-directory option (Pattern A)', async () => {
      const output = await executeSourcesInit({ fromDirectory: '~/materials' });
      expect(output).toContain('Imported');
    });

    it('should support --from-file option (Pattern B)', async () => {
      const output = await executeSourcesInit({ fromFile: '~/scenario.md' });
      expect(output).toContain('Imported');
    });

    // Note: Pattern C (Interview Mode) is AI Agent only
  });

  describe('sources import', () => {
    it('should import file', async () => {
      const output = await executeSourcesImport('~/test.pdf');
      expect(output).toContain('Imported');
    });

    it('should import directory with --recursive', async () => {
      const output = await executeSourcesImport('~/materials', {
        recursive: true
      });
      expect(output).toContain('files imported');
    });
  });

  describe('sources status', () => {
    it('should show sources status', async () => {
      const output = await executeSourcesStatus();
      expect(output).toContain('Project:');
      expect(output).toContain('Scenario:');
    });
  });

  describe('sources sync', () => {
    it('should check for changes', async () => {
      const output = await executeSourcesSync({ check: true });
      expect(output).toContain('No changes detected');
    });
  });
});
```

**Implementation**: `src/cli/commands/sources.ts`

```typescript
export function createSourcesCommand(): Command {
  const cmd = new Command('sources')
    .description('Manage source materials');

  cmd.addCommand(createSourcesInitCommand());
  cmd.addCommand(createSourcesImportCommand());
  cmd.addCommand(createSourcesStatusCommand());
  cmd.addCommand(createSourcesSyncCommand());
  cmd.addCommand(createSourcesLogCommand());

  return cmd;
}

function createSourcesInitCommand(): Command {
  return new Command('init')
    .description('Initialize sources directory')
    .option('--from-directory <path>', 'Import from existing directory (Pattern A)')
    .option('--from-file <path>', 'Import from scenario file (Pattern B)')
    // Note: Pattern C (Interview Mode) is AI Agent only - not implemented in CLI
    .action(async (options) => {
      // Implementation
    });
}

function createSourcesImportCommand(): Command {
  return new Command('import')
    .description('Import external files')
    .argument('<path>', 'File or directory to import')
    .option('--recursive', 'Import directory recursively')
    .option('--type <type>', 'Force source type')
    .option('--description <desc>', 'Add description')
    .action(async (path, options) => {
      // Implementation
    });
}

function createSourcesStatusCommand(): Command {
  return new Command('status')
    .description('Show sources status')
    .action(async () => {
      // Implementation
    });
}

function createSourcesSyncCommand(): Command {
  return new Command('sync')
    .description('Sync with original directory')
    .option('--check', 'Check for changes only')
    .action(async (options) => {
      // Implementation
    });
}

function createSourcesLogCommand(): Command {
  return new Command('log')
    .description('Manage conversation logs')
    .option('--save <title>', 'Save current session')
    .option('--list', 'List all logs')
    .action(async (options) => {
      // Implementation
    });
}
```

**Verification**:
- [ ] `sources init` が動作する
- [ ] `sources import` が動作する
- [ ] `sources status` が動作する
- [ ] `sources sync` が動作する
- [ ] `sources log` が動作する

---

### Step 7: init コマンドへの統合

**Goal**: `slide-gen init` にsources初期化を統合

**Test file**: `src/cli/commands/init.test.ts`

```typescript
describe('init command - sources integration', () => {
  it('should create sources directory by default', async () => {
    await executeInit('test-project');

    const exists = await fs.pathExists('test-project/sources');
    expect(exists).toBe(true);
  });

  it('should skip sources with --no-sources', async () => {
    await executeInit('test-project', { noSources: true });

    const exists = await fs.pathExists('test-project/sources');
    expect(exists).toBe(false);
  });

  it('should import from directory with --from-directory', async () => {
    await executeInit('test-project', {
      fromDirectory: '~/materials'
    });

    const manager = new SourcesManager('test-project');
    const data = await manager.load();
    expect(data.sources?.length).toBeGreaterThan(0);
  });
});
```

**Implementation**: Update `src/cli/commands/init.ts`

**Verification**:
- [ ] `init` がsourcesディレクトリを作成する
- [ ] `--no-sources` オプションが動作する
- [ ] `--from-directory` オプションが動作する

---

## E2E Test (必須)

**Test file**: `tests/e2e/sources.test.ts`

```typescript
describe('E2E: Source Management', () => {
  it('should initialize project with sources', async () => {
    await executeInit('e2e-test');

    const sourcesExists = await fs.pathExists('e2e-test/sources/sources.yaml');
    expect(sourcesExists).toBe(true);

    // Verify directory structure
    const dirs = ['scenario', 'content', 'materials', 'data', 'conversation'];
    for (const dir of dirs) {
      const exists = await fs.pathExists(`e2e-test/sources/${dir}`);
      expect(exists).toBe(true);
    }
  });

  it('should import from existing directory (Pattern A)', async () => {
    // Setup test directory with files
    await fs.outputFile('test-materials/scenario.md', '# Test Scenario');
    await fs.outputFile('test-materials/data.xlsx', '...');

    await executeSourcesInit({
      fromDirectory: 'test-materials'
    });

    const manager = new SourcesManager('.');
    const data = await manager.load();

    expect(data.project.setup_pattern).toBe('A');
    expect(data.sources).toContainEqual(
      expect.objectContaining({ type: 'scenario' })
    );
  });

  it('should handle scenario-only input (Pattern B)', async () => {
    await fs.outputFile('scenario.md', '# New Product Launch\n...');

    await executeSourcesInit({
      fromFile: 'scenario.md'
    });

    const manager = new SourcesManager('.');
    const data = await manager.load();

    expect(data.project.setup_pattern).toBe('B');
  });

  it('should track conversation log', async () => {
    const logger = new ConversationLogger('.');
    await logger.start('E2E Test Session');
    await logger.addDecision('Using 10 slides');
    await logger.addUserInfo('Target audience: engineers');
    await logger.close();

    const manager = new SourcesManager('.');
    const data = await manager.load();

    expect(data.sources).toContainEqual(
      expect.objectContaining({ type: 'conversation' })
    );
  });

  it('should show accurate status', async () => {
    const output = await executeSourcesStatus();

    expect(output).toContain('Project:');
    expect(output).toContain('Setup: Pattern');
  });
});
```

**Verification**:
- [ ] 実際のファイルI/Oでテストが通る
- [ ] 3つのパターン（A/B/C）が正しく動作する
- [ ] 会話ログが正しく保存される

---

## Acceptance Criteria

- [ ] 全てのテストが通る (`pnpm test`)
- [ ] 型チェックが通る (`pnpm typecheck`)
- [ ] リントが通る (`pnpm lint`)
- [ ] E2Eテストが通る
- [ ] sources.yaml スキーマが正しく検証される
- [ ] SourcesManager が sources.yaml を正しく管理する
- [ ] SourceExplorer がディレクトリを探索・分類できる（パターンA）
- [ ] SourceImporter がファイルをコピー/移動できる
- [ ] ConversationLogger が会話ログを管理できる
- [ ] `slide-gen sources init` が動作する（パターンA, B対応）
- [ ] `slide-gen sources init --from-directory` が動作する
- [ ] `slide-gen sources init --from-file` が動作する
- [ ] `slide-gen sources import` が動作する
- [ ] `slide-gen sources status` が動作する
- [ ] `slide-gen init` にsources初期化が統合される

**Note**: パターンC（インタビューモード）はAI Agent専用機能としてCLIには実装しない

## Files Changed

- [ ] `src/sources/schema.ts` - 新規作成
- [ ] `src/sources/manager.ts` - 新規作成
- [ ] `src/sources/explorer.ts` - 新規作成
- [ ] `src/sources/importer.ts` - 新規作成
- [ ] `src/sources/conversation.ts` - 新規作成
- [ ] `src/sources/index.ts` - 新規作成
- [ ] `src/cli/commands/sources.ts` - 新規作成
- [ ] `src/cli/commands/init.ts` - sources統合
- [ ] `src/cli/index.ts` - sourcesコマンド追加

## Notes

- パターンA（探索）では、元ディレクトリのパスを記録し、後で同期可能にする
- パターンB（補完）では、シナリオファイルを読み込んで解析
- パターンC（インタビュー）はAI Agent専用。CLIには実装せず、AI Skillがworkflows.mdを参照して実行
- PDF/Excelからのテキスト・データ抽出はCLIには実装しない。AI Agentが直接ファイルを読み取り、必要な情報を抽出する
- 会話ログは自動保存をサポートするが、明示的な保存も可能にする
