# Task: アイコン機能拡張

## Purpose

アイコンシステムを拡張し、Health Icons・Material Symbolsのサポート、自動補充機能、テーマ連携を実装する。AIアシスタントがシナリオに応じて適切なアイコンを選択・登録できるようにする。

**重要**: 外部ソースから取得したアイコンは、プロジェクトの再現性確保のため、ローカルに保存することをデフォルトとする。

## Context

- **関連仕様**: [spec/icons.md](../icons.md)
- **依存タスク**: [07-icon-system](./completed/07-icon-system.md), [14-cli-icons](./completed/14-cli-icons.md)
- **関連ソース**: `src/icons/`, `src/cli/commands/icons.ts`

## 設計方針: ローカル保存優先

### アイコン保存の流れ

```
1. 外部ソースからアイコンを使用
   ↓
2. 初回フェッチ時にSVGを取得
   ↓
3. icons/fetched/ にSVGを自動保存（デフォルト動作）
   ↓
4. registry.yamlのエイリアスを更新
   例: stethoscope: "fetched:stethoscope"  # ローカル参照に変更
   ↓
5. 次回以降はローカルから読み込み
```

### ディレクトリ構造

```
icons/
├── registry.yaml          # エイリアス定義
├── custom/                # ユーザー作成のカスタムアイコン
│   └── company-logo.svg
└── fetched/               # 外部から取得・保存されたアイコン
    ├── healthicons/       # Health Iconsから取得
    │   ├── stethoscope.svg
    │   └── hospital.svg
    ├── material-symbols/  # Material Symbolsから取得
    │   └── home.svg
    └── _sources.yaml      # 取得元の記録（トレーサビリティ）
```

### _sources.yaml の形式

```yaml
# icons/fetched/_sources.yaml
# 取得元の記録（ライセンス確認・更新時の参照用）

healthicons/stethoscope.svg:
  source: "https://api.iconify.design/healthicons/stethoscope.svg"
  fetched_at: "2025-01-10T12:00:00Z"
  license: "MIT"

material-symbols/home.svg:
  source: "https://api.iconify.design/material-symbols/home.svg"
  fetched_at: "2025-01-10T12:00:00Z"
  license: "Apache-2.0"
```

## TDD Implementation Cycle

各ステップで以下のサイクルを実行:

1. **Red**: 失敗するテストを書く
2. **Green**: テストを通す最小限の実装
3. **Refactor**: `pnpm lint && pnpm typecheck` を実行し、リファクタリング

## Implementation Steps

### Step 1: 新規アイコンソースの追加

**Goal**: Health IconsとMaterial Symbolsをソースとして追加し、fetchedソースを追加

**Test file**: `src/icons/registry.test.ts`

```typescript
describe('IconRegistry - new sources', () => {
  it('should resolve Health Icons source', async () => {
    const loader = new IconRegistryLoader();
    await loader.load('icons/registry.yaml');

    const source = loader.getSource('health');
    expect(source).toBeDefined();
    expect(source?.name).toBe('healthicons');
  });

  it('should resolve fetched (local) source', async () => {
    const loader = new IconRegistryLoader();
    await loader.load('icons/registry.yaml');

    const source = loader.getSource('fetched');
    expect(source).toBeDefined();
    expect(source?.type).toBe('local-svg');
  });

  it('should resolve medical aliases', async () => {
    const loader = new IconRegistryLoader();
    await loader.load('icons/registry.yaml');

    const resolved = loader.resolveAlias('stethoscope');
    // 初回は外部ソース、保存後はfetched:に変わる
    expect(resolved).toMatch(/^(health:|fetched:healthicons\/)stethoscope$/);
  });
});
```

**Implementation**: `icons/registry.yaml` に fetched ソースを追加

```yaml
sources:
  # ... existing sources ...

  # Fetched icons (auto-saved from external sources)
  - name: fetched
    type: local-svg
    prefix: fetched
    path: "./icons/fetched/"
```

**Verification**:
- [ ] Health Iconsソースが認識される
- [ ] Material Symbolsソースが認識される
- [ ] fetchedソースが認識される

---

### Step 2: 外部SVGフェッチ＆ローカル保存の実装

**Goal**: 外部からSVGを取得し、自動的にローカルに保存する

**Test file**: `src/icons/fetcher.test.ts`

```typescript
describe('IconFetcher', () => {
  it('should fetch SVG and save locally by default', async () => {
    const fetcher = new IconFetcher({
      fetchedDir: 'icons/fetched',
      saveLocally: true  // デフォルト
    });

    await fetcher.fetchAndSave('health:stethoscope');

    // ローカルに保存されている
    const localPath = 'icons/fetched/healthicons/stethoscope.svg';
    expect(await fileExists(localPath)).toBe(true);

    // _sources.yaml に記録されている
    const sources = await loadSourcesYaml('icons/fetched/_sources.yaml');
    expect(sources['healthicons/stethoscope.svg']).toBeDefined();
  });

  it('should return local SVG if already fetched', async () => {
    const fetcher = new IconFetcher({ fetchedDir: 'icons/fetched' });

    // 既に保存済み
    await writeFile('icons/fetched/healthicons/stethoscope.svg', '<svg>...</svg>');

    const svg = await fetcher.resolve('health:stethoscope');
    // ネットワークリクエストなしでローカルから取得
    expect(svg).toContain('<svg');
  });

  it('should throw error for invalid icon', async () => {
    const fetcher = new IconFetcher();
    await expect(fetcher.fetchAndSave('health:nonexistent-icon-xyz'))
      .rejects.toThrow('Icon not found');
  });

  it('should record source information for traceability', async () => {
    const fetcher = new IconFetcher({ fetchedDir: 'icons/fetched' });
    await fetcher.fetchAndSave('health:hospital');

    const sources = await loadYaml('icons/fetched/_sources.yaml');
    const entry = sources['healthicons/hospital.svg'];

    expect(entry.source).toContain('iconify.design');
    expect(entry.fetched_at).toBeDefined();
  });
});
```

**Implementation**: `src/icons/fetcher.ts`

```typescript
export interface FetcherOptions {
  fetchedDir?: string;
  saveLocally?: boolean;  // デフォルト: true
}

export class IconFetcher {
  constructor(private options: FetcherOptions = {}) {
    this.options.fetchedDir = options.fetchedDir ?? 'icons/fetched';
    this.options.saveLocally = options.saveLocally ?? true;  // デフォルトで保存
  }

  /**
   * アイコンを解決（ローカル優先、なければフェッチ＆保存）
   */
  async resolve(iconRef: string): Promise<string> {
    const localPath = this.getLocalPath(iconRef);

    // 1. ローカルにあればそれを返す
    if (await this.existsLocally(localPath)) {
      return await fs.readFile(localPath, 'utf-8');
    }

    // 2. なければフェッチして保存
    return await this.fetchAndSave(iconRef);
  }

  /**
   * 外部からフェッチしてローカルに保存
   */
  async fetchAndSave(iconRef: string): Promise<string> {
    const { prefix, name } = this.parseReference(iconRef);
    const url = this.buildUrl(prefix, name);

    // フェッチ
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Icon not found: ${iconRef}`);
    }
    const svg = await response.text();

    // ローカルに保存
    if (this.options.saveLocally) {
      await this.saveLocally(prefix, name, svg, url);
    }

    return svg;
  }

  private async saveLocally(
    prefix: string,
    name: string,
    svg: string,
    sourceUrl: string
  ): Promise<void> {
    const setDir = this.getIconifySet(prefix);
    const dirPath = path.join(this.options.fetchedDir!, setDir);
    const filePath = path.join(dirPath, `${name}.svg`);

    // ディレクトリ作成
    await fs.mkdir(dirPath, { recursive: true });

    // SVG保存
    await fs.writeFile(filePath, svg, 'utf-8');

    // _sources.yaml 更新
    await this.updateSourcesYaml(setDir, name, sourceUrl);
  }

  private async updateSourcesYaml(
    setDir: string,
    name: string,
    sourceUrl: string
  ): Promise<void> {
    const sourcesPath = path.join(this.options.fetchedDir!, '_sources.yaml');
    let sources: Record<string, SourceEntry> = {};

    try {
      const content = await fs.readFile(sourcesPath, 'utf-8');
      sources = parseYaml(content) ?? {};
    } catch {
      // ファイルがなければ新規作成
    }

    const key = `${setDir}/${name}.svg`;
    sources[key] = {
      source: sourceUrl,
      fetched_at: new Date().toISOString(),
      license: this.getLicense(setDir),
    };

    await fs.writeFile(sourcesPath, stringifyYaml(sources), 'utf-8');
  }

  private getLicense(setDir: string): string {
    const licenses: Record<string, string> = {
      'healthicons': 'MIT',
      'material-symbols': 'Apache-2.0',
      'material-icons': 'Apache-2.0',
      'heroicons': 'MIT',
    };
    return licenses[setDir] ?? 'Unknown';
  }
}
```

**Verification**:
- [ ] 外部からSVGを取得できる
- [ ] 自動的にローカルに保存される
- [ ] _sources.yaml に取得元が記録される
- [ ] 既にローカルにあればネットワーク不要

---

### Step 3: icons add コマンドの実装

**Goal**: `slide-gen icons add` コマンドでエイリアスを追加（ローカル保存込み）

**Test file**: `src/cli/commands/icons.test.ts`

```typescript
describe('icons add command', () => {
  it('should fetch, save locally, and add alias', async () => {
    await executeIconsAdd('rehabilitation', { from: 'health:physical-therapy' });

    // SVGがローカルに保存されている
    const svgPath = 'icons/fetched/healthicons/physical-therapy.svg';
    expect(await fileExists(svgPath)).toBe(true);

    // registry.yamlにエイリアスが追加されている（ローカル参照）
    const registry = await loadRegistry();
    expect(registry.aliases.rehabilitation).toBe('fetched:healthicons/physical-therapy');
  });

  it('should search and prompt for selection', async () => {
    const result = await executeIconsAdd('ecg', { search: true });
    expect(result).toContain('Found');
  });

  it('should reject duplicate alias', async () => {
    await expect(
      executeIconsAdd('success', { from: 'health:something' })
    ).rejects.toThrow('Alias already exists');
  });

  it('should allow --no-save-local to skip local saving', async () => {
    await executeIconsAdd('temp-icon', {
      from: 'health:stethoscope',
      saveLocal: false
    });

    // SVGは保存されない
    const svgPath = 'icons/fetched/healthicons/stethoscope.svg';
    expect(await fileExists(svgPath)).toBe(false);

    // エイリアスは外部参照のまま
    const registry = await loadRegistry();
    expect(registry.aliases['temp-icon']).toBe('health:stethoscope');
  });
});
```

**Implementation**: `src/cli/commands/icons.ts`

```typescript
function createIconsAddCommand(): Command {
  return new Command('add')
    .description('Add an icon alias to registry (fetches and saves locally by default)')
    .argument('<alias>', 'Alias name to add')
    .option('--from <icon>', 'Source icon reference (e.g., health:stethoscope)')
    .option('--search', 'Search for icon interactively')
    .option('--no-save-local', 'Do not save SVG locally (not recommended)')
    .action(async (alias, options) => {
      const registry = await loadRegistry();

      // 1. 重複チェック
      if (registry.aliases[alias]) {
        throw new Error(`Alias already exists: ${alias}`);
      }

      // 2. アイコン参照を取得
      let iconRef: string;
      if (options.search) {
        iconRef = await searchAndSelect(alias);
      } else if (options.from) {
        iconRef = options.from;
      } else {
        throw new Error('Either --from or --search is required');
      }

      // 3. フェッチ＆ローカル保存（デフォルト）
      const fetcher = new IconFetcher();
      const saveLocal = options.saveLocal !== false;  // デフォルトtrue

      if (saveLocal) {
        await fetcher.fetchAndSave(iconRef);

        // ローカル参照に変換
        const { prefix, name } = parseIconRef(iconRef);
        const localRef = `fetched:${fetcher.getIconifySet(prefix)}/${name}`;

        // 4. registry.yaml 更新
        await addAliasToRegistry(alias, localRef);

        console.log(chalk.green(`Added alias: ${alias} -> ${localRef}`));
        console.log(chalk.dim(`SVG saved to: icons/fetched/...`));
      } else {
        // 外部参照のまま追加（非推奨）
        await fetcher.fetchAndSave(iconRef);  // 存在確認のみ
        await addAliasToRegistry(alias, iconRef);

        console.log(chalk.yellow(`Added alias: ${alias} -> ${iconRef}`));
        console.log(chalk.yellow(`Warning: SVG not saved locally. Project may not be reproducible.`));
      }
    });
}
```

**Verification**:
- [ ] アイコンがフェッチされローカルに保存される
- [ ] registry.yamlにローカル参照のエイリアスが追加される
- [ ] --no-save-local で外部参照のまま追加できる（警告付き）

---

### Step 4: icons sync コマンドの実装

**Goal**: 使用中のアイコンを分析し、外部参照をローカル参照に変換

**Test file**: `src/cli/commands/icons.test.ts`

```typescript
describe('icons sync command', () => {
  it('should detect missing icons', async () => {
    const result = await executeIconsSync('test-presentation.yaml');
    expect(result.missing).toContain('unknown-icon');
  });

  it('should detect external references and offer to localize', async () => {
    // registry.yaml に health:stethoscope への参照がある
    const result = await executeIconsSync('test-presentation.yaml');
    expect(result.external).toContainEqual({
      alias: 'stethoscope',
      ref: 'health:stethoscope',
      status: 'external'
    });
  });

  it('should localize external icons with --localize flag', async () => {
    await executeIconsSync('test-presentation.yaml', { localize: true });

    // SVGがローカルに保存されている
    expect(await fileExists('icons/fetched/healthicons/stethoscope.svg')).toBe(true);

    // registry.yamlが更新されている
    const registry = await loadRegistry();
    expect(registry.aliases.stethoscope).toBe('fetched:healthicons/stethoscope');
  });

  it('should report used icons with their sources', async () => {
    const result = await executeIconsSync('test-presentation.yaml');
    expect(result.used).toContainEqual({
      alias: 'planning',
      resolved: 'mi:event_note',
      status: 'local'  // Material Icons は web-font なので local 扱い
    });
  });
});
```

**Implementation**: `src/cli/commands/icons.ts`

```typescript
function createIconsSyncCommand(): Command {
  return new Command('sync')
    .description('Analyze icon usage and localize external icons')
    .argument('<input>', 'Presentation YAML file')
    .option('--localize', 'Download and save external icons locally')
    .action(async (input, options) => {
      const presentation = await loadPresentation(input);
      const registry = await loadRegistry();

      // 1. 使用中のアイコンを抽出
      const usedIcons = extractIconReferences(presentation);

      // 2. 各アイコンのステータスを確認
      const report = {
        local: [] as IconStatus[],
        external: [] as IconStatus[],
        missing: [] as string[],
      };

      for (const icon of usedIcons) {
        const resolved = registry.resolveAlias(icon);
        const parsed = parseIconRef(resolved);

        if (!parsed) {
          report.missing.push(icon);
          continue;
        }

        if (isExternalSource(parsed.prefix)) {
          report.external.push({ alias: icon, ref: resolved, status: 'external' });
        } else {
          report.local.push({ alias: icon, ref: resolved, status: 'local' });
        }
      }

      // 3. レポート出力
      console.log(chalk.bold('\nIcon Sync Report'));
      console.log('─'.repeat(40));

      if (report.local.length > 0) {
        console.log(chalk.green(`\n✓ Local icons (${report.local.length}):`));
        for (const icon of report.local) {
          console.log(`  ${icon.alias} -> ${icon.ref}`);
        }
      }

      if (report.external.length > 0) {
        console.log(chalk.yellow(`\n⚠ External icons (${report.external.length}):`));
        for (const icon of report.external) {
          console.log(`  ${icon.alias} -> ${icon.ref}`);
        }
      }

      if (report.missing.length > 0) {
        console.log(chalk.red(`\n✗ Missing icons (${report.missing.length}):`));
        for (const icon of report.missing) {
          console.log(`  ${icon}`);
        }
      }

      // 4. --localize フラグがあれば外部アイコンをローカル化
      if (options.localize && report.external.length > 0) {
        console.log(chalk.blue('\nLocalizing external icons...'));
        const fetcher = new IconFetcher();

        for (const icon of report.external) {
          try {
            await fetcher.fetchAndSave(icon.ref);
            const { prefix, name } = parseIconRef(icon.ref)!;
            const localRef = `fetched:${fetcher.getIconifySet(prefix)}/${name}`;
            await updateAliasInRegistry(icon.alias, localRef);
            console.log(chalk.green(`  ✓ ${icon.alias} -> ${localRef}`));
          } catch (error) {
            console.log(chalk.red(`  ✗ ${icon.alias}: ${error.message}`));
          }
        }

        console.log(chalk.green('\nDone! All icons are now stored locally.'));
      } else if (report.external.length > 0) {
        console.log(chalk.dim('\nRun with --localize to save external icons locally.'));
      }
    });
}
```

**Verification**:
- [ ] 使用中のアイコンが検出される
- [ ] 外部参照アイコンが識別される
- [ ] --localize でローカル保存される

---

### Step 5: テーマカラー連携の実装

**Goal**: アイコンの色をテーマから継承する機能を実装

**Test file**: `src/icons/resolver.test.ts`

```typescript
describe('IconResolver - theme integration', () => {
  it('should resolve color from palette name', async () => {
    const resolver = new IconResolver(registry);
    const html = await resolver.render('planning', { color: 'primary' });
    expect(html).toContain('color: #1976D2');
  });

  it('should use CSS variable for theme colors', async () => {
    const resolver = new IconResolver(registry, { useThemeVariables: true });
    const html = await resolver.render('planning', { color: 'primary' });
    expect(html).toContain('var(--theme-primary)');
  });

  it('should pass through hex colors', async () => {
    const resolver = new IconResolver(registry);
    const html = await resolver.render('planning', { color: '#FF5722' });
    expect(html).toContain('color: #FF5722');
  });
});
```

**Implementation**: `src/icons/resolver.ts`

```typescript
private resolveColor(color?: string): string {
  if (!color) return this.registry.getDefaults().color;

  // Check if it's a palette name
  const paletteColor = this.registry.getColor(color);
  if (paletteColor) {
    if (this.options.useThemeVariables) {
      return `var(--theme-${color})`;
    }
    return paletteColor;
  }

  // Pass through hex/rgb colors
  return color;
}
```

**Verification**:
- [ ] パレット名から色が解決される
- [ ] CSS変数モードが動作する
- [ ] 直接指定の色がそのまま使用される

---

### Step 6: icons list コマンドの拡張

**Goal**: カテゴリ別フィルタリングとローカル/外部ステータス表示

**Test file**: `src/cli/commands/icons.test.ts`

```typescript
describe('icons list command - enhanced', () => {
  it('should filter by category', async () => {
    const output = await executeIconsList({ category: 'medical' });
    expect(output).toContain('stethoscope');
    expect(output).not.toContain('planning');
  });

  it('should show local/external status', async () => {
    const output = await executeIconsList({ showStatus: true });
    expect(output).toMatch(/stethoscope.*\[local\]/);
    // or
    expect(output).toMatch(/temp-icon.*\[external\]/);
  });

  it('should output LLM format', async () => {
    const output = await executeIconsList({ format: 'llm' });
    const parsed = parseYaml(output);
    expect(parsed.aliases).toBeDefined();
  });
});
```

**Verification**:
- [ ] カテゴリフィルタリングが動作する
- [ ] ローカル/外部ステータスが表示される

---

## E2E Test (必須)

**Test file**: `tests/e2e/icons-enhanced.test.ts`

```typescript
describe('E2E: Enhanced Icons with Local Storage', () => {
  it('should add icon with automatic local save', async () => {
    // Add alias (should fetch and save locally)
    execSync('node dist/cli/index.js icons add test-rehab --from health:physical-therapy');

    // Verify SVG saved locally
    expect(existsSync('icons/fetched/healthicons/physical-therapy.svg')).toBe(true);

    // Verify _sources.yaml updated
    const sources = readFileSync('icons/fetched/_sources.yaml', 'utf-8');
    expect(sources).toContain('physical-therapy.svg');

    // Verify registry uses local reference
    const registry = readFileSync('icons/registry.yaml', 'utf-8');
    expect(registry).toContain('test-rehab: "fetched:healthicons/physical-therapy"');
  });

  it('should sync and localize external icons', async () => {
    // Create presentation with external icon reference
    execSync('node dist/cli/index.js icons sync test.yaml --localize');

    // Verify all icons are now local
    const registry = readFileSync('icons/registry.yaml', 'utf-8');
    expect(registry).not.toMatch(/: "health:/);  // No external health: refs
  });

  it('should work offline after localization', async () => {
    // All icons should be local now
    // Convert should work without network
    execSync('node dist/cli/index.js convert test.yaml -o test.md');
    const output = readFileSync('test.md', 'utf-8');
    expect(output).toContain('svg');
  });
});
```

**Verification**:
- [ ] 実際のファイルI/Oでテストが通る
- [ ] アイコンの追加→ローカル保存フローが動作する
- [ ] ローカル化後はオフラインで動作する

---

## Acceptance Criteria

- [ ] 全てのテストが通る (`pnpm test`)
- [ ] 型チェックが通る (`pnpm typecheck`)
- [ ] リントが通る (`pnpm lint`)
- [ ] E2Eテストが通る
- [ ] Health Icons (`health:`) が使用できる
- [ ] Material Symbols (`ms:`) が使用できる
- [ ] **外部アイコンはデフォルトでローカルに保存される**
- [ ] **`icons/fetched/` に取得したSVGが保存される**
- [ ] **`icons/fetched/_sources.yaml` に取得元が記録される**
- [ ] `slide-gen icons add <alias> --from <icon>` でエイリアスを追加・ローカル保存できる
- [ ] `slide-gen icons sync --localize` で外部参照をローカル化できる
- [ ] `slide-gen icons list --category <cat>` でカテゴリフィルタリングできる
- [ ] アイコンの色にパレット名（`color: "primary"`）を使用できる
- [ ] **ローカル化後はオフラインでプロジェクトが動作する**

## Files Changed

- [ ] `icons/registry.yaml` - fetchedソース追加、拡張エイリアス（完了）
- [ ] `src/icons/fetcher.ts` - 新規作成（フェッチ＆ローカル保存）
- [ ] `src/icons/fetcher.test.ts` - 新規作成
- [ ] `src/icons/resolver.ts` - fetchedソース対応、テーマカラー連携追加
- [ ] `src/icons/resolver.test.ts` - テスト追加
- [ ] `src/cli/commands/icons.ts` - add, sync コマンド追加、list 拡張
- [ ] `src/cli/commands/icons.test.ts` - テスト追加
- [ ] `tests/e2e/icons-enhanced.test.ts` - E2Eテスト新規作成

## Notes

- **ローカル保存がデフォルト**: プロジェクトの再現性と外部サービス依存の削減のため
- **_sources.yaml**: ライセンス情報と取得元を記録し、トレーサビリティを確保
- **--no-save-local**: 特殊な用途向けに外部参照のままにするオプションも用意（非推奨）
- Iconify APIは無料で利用可能、初回フェッチ時のみネットワーク使用
- `icons/fetched/` はgitにコミットすることを推奨（再現性のため）
