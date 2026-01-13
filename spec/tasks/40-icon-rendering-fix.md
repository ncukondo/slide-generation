# Task: アイコン描画の修正

## Purpose

テンプレート内のアイコンがテキスト名（`event_note`, `lightbulb`等）として表示される問題を修正する。必要なアイコンをプロジェクト内にSVGとしてダウンロードし、インラインSVGとして出力することで、外部依存なしで表示できるようにする。

## Context

- **関連仕様**: [spec/icons.md](../icons.md)
- **依存タスク**: [38-fix-empty-first-slide](./38-fix-empty-first-slide.md)
- **関連ソース**: `src/icons/`, `icons/fetched/`

## Problem Analysis

### 現状の出力
```
PDCAサイクル

event_note Plan
play_arrow Do
analytics Check
trending_up Act
```

### 原因
1. Material Iconsがウェブフォントとして出力されているが、Marpでフォントがロードされていない
2. または`icons.render()`がテキスト名をそのまま返している

### 解決アプローチ
1. 必要なアイコンをSVGとして`icons/fetched/`にダウンロード
2. `svg-inline`または`local-svg`タイプでインラインSVGとして出力
3. フォント依存を排除

## TDD Implementation Cycle

各ステップで以下のサイクルを実行:

1. **Red**: 失敗するテストを書く
2. **Green**: テストを通す最小限の実装
3. **Refactor**: `pnpm lint && pnpm typecheck` を実行し、リファクタリング

## Implementation Steps

### Step 1: アイコンフェッチ機能の確認・実装

**Goal**: Material IconsをSVGとしてダウンロードする機能を確認/実装

**Implementation**: `src/icons/fetcher.ts`

```typescript
export class IconFetcher {
  /**
   * Material IconからSVGを取得してローカルに保存
   */
  async fetchAndSave(iconName: string, prefix: string): Promise<string> {
    // Material Icons の場合: Google Fonts APIまたはIconifyから取得
    if (prefix === 'mi') {
      const url = `https://api.iconify.design/mdi/${iconName}.svg`;
      const response = await fetch(url);
      const svg = await response.text();

      const outputPath = `icons/fetched/${prefix}/${iconName}.svg`;
      await writeFile(outputPath, svg);
      return outputPath;
    }
    // 他のプレフィックスも同様に対応
  }
}
```

### Step 2: テンプレートで使用するアイコンの一覧作成

**Goal**: テンプレートのexampleで使用されているアイコンを特定

**使用アイコン一覧**:
```
cycle-diagram:
  - mi:event_note (planning)
  - mi:play_arrow (action)
  - mi:analytics (analysis)
  - mi:trending_up (improvement)

three-column:
  - mi:lightbulb
  - mi:trending_up
  - mi:check_circle

hierarchy:
  - mi:person
  - mi:computer
  - mi:account_balance
  - mi:business

flow-chart:
  - mi:description
  - mi:person
  - mi:thumb_up
  - mi:check_circle
  - mi:replay
  - mi:done_all
```

### Step 3: アイコンのバッチダウンロード

**Goal**: 必要なアイコンを一括でダウンロードするスクリプト/コマンド

```bash
# 必要なアイコンをダウンロード
node scripts/fetch-template-icons.js
```

**Script**: `scripts/fetch-template-icons.ts`

```typescript
const requiredIcons = [
  'event_note', 'play_arrow', 'analytics', 'trending_up',
  'lightbulb', 'check_circle', 'person', 'computer',
  'account_balance', 'business', 'description', 'thumb_up',
  'replay', 'done_all', 'edit', 'check', 'close'
];

for (const icon of requiredIcons) {
  await fetcher.fetchAndSave(icon, 'mi');
}
```

### Step 4: IconResolverの修正

**Goal**: ローカルSVGを優先して読み込むよう修正

**Implementation**: `src/icons/resolver.ts`

```typescript
export class IconResolver {
  async render(reference: string, options?: IconOptions): Promise<string> {
    const [prefix, name] = this.parseReference(reference);

    // 1. ローカルSVGを確認
    const localPath = `icons/fetched/${prefix}/${name}.svg`;
    if (await this.fileExists(localPath)) {
      const svg = await this.readSvg(localPath);
      return this.applySvgOptions(svg, options);
    }

    // 2. カスタムアイコンを確認
    const customPath = `icons/custom/${name}.svg`;
    if (await this.fileExists(customPath)) {
      const svg = await this.readSvg(customPath);
      return this.applySvgOptions(svg, options);
    }

    // 3. フォールバック: プレースホルダー
    return `<span class="icon-missing" title="${name}">[${name}]</span>`;
  }

  private applySvgOptions(svg: string, options?: IconOptions): string {
    const size = options?.size || '24';
    const color = options?.color || 'currentColor';

    return svg
      .replace(/width="[^"]*"/, `width="${size}"`)
      .replace(/height="[^"]*"/, `height="${size}"`)
      .replace(/fill="[^"]*"/, `fill="${color}"`);
  }
}
```

### Step 5: registryの更新

**Goal**: `icons/registry.yaml`にフェッチ済みアイコンのソースを追加

```yaml
sources:
  # Fetched Material Icons (Local SVG - 優先)
  - name: fetched-material
    type: local-svg
    path: "./icons/fetched/mi/"
    prefix: "mi"

  # Custom icons (Local)
  - name: custom
    type: local-svg
    path: "./icons/custom/"
    prefix: "custom"
```

### Step 6: スクリーンショットで確認

```bash
pnpm build
node dist/cli/index.js templates screenshot cycle-diagram three-column --format ai -o /tmp/icon-test
```

**Verification**:
- [ ] アイコンがSVGとして表示される
- [ ] テキスト名が直接表示されない

## E2E Test (必須)

**Test file**: `tests/e2e/icon-rendering.test.ts`

```typescript
describe('E2E: Icon rendering', () => {
  it('should render icons as inline SVG', async () => {
    const resolver = new IconResolver();
    await resolver.initialize();

    const result = await resolver.render('mi:event_note');

    expect(result).toContain('<svg');
    expect(result).toContain('viewBox');
    expect(result).not.toBe('event_note');
  });

  it('should use local SVG files when available', async () => {
    // icons/fetched/mi/event_note.svg が存在する場合
    // それを読み込んでインラインSVGとして出力することを確認
  });
});
```

## Acceptance Criteria

- [ ] 全てのテストが通る (`pnpm test`)
- [ ] 型チェックが通る (`pnpm typecheck`)
- [ ] リントが通る (`pnpm lint`)
- [ ] E2Eテストが通る
- [ ] `icons/fetched/mi/` に必要なSVGファイルが存在する
- [ ] `templates screenshot cycle-diagram --format ai` でアイコンがSVG表示される
- [ ] `templates screenshot three-column --format ai` でアイコンがSVG表示される
- [ ] オフライン環境でもアイコンが表示される

## Files Changed

- [ ] `icons/fetched/mi/*.svg` - ダウンロードしたアイコンファイル（新規）
- [ ] `icons/registry.yaml` - fetched-materialソース追加
- [ ] `src/icons/resolver.ts` - ローカルSVG優先読み込み
- [ ] `src/icons/resolver.test.ts` - テスト追加
- [ ] `src/icons/fetcher.ts` - フェッチ機能（新規または拡張）
- [ ] `scripts/fetch-template-icons.ts` - アイコンダウンロードスクリプト
- [ ] `tests/e2e/icon-rendering.test.ts` - E2Eテスト新規作成

## Notes

- Iconify APIは無料で利用可能（`https://api.iconify.design/mdi/{name}.svg`）
- ダウンロードしたSVGは`fill="currentColor"`を使用してテーマカラーに対応
- アイコンファイルはリポジトリにコミットする（ビルド時の外部依存を排除）
- 将来的に`slide-gen icons fetch`コマンドとして整備することも検討
