import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeFileSync, mkdirSync, rmSync, readFileSync, existsSync } from 'fs';
import { join, resolve } from 'path';
import { createConvertCommand } from '../../src/cli/commands/convert';
import { Command } from 'commander';

describe('E2E: Full Workflow', () => {
  const testDir = './test-e2e-full-workflow';
  const fixturesDir = resolve(__dirname, '../fixtures').replace(/\\/g, '/');
  const templatesDir = join(fixturesDir, 'templates').replace(/\\/g, '/');
  const iconsRegistryPath = resolve(__dirname, '../../icons/registry.yaml').replace(/\\/g, '/');

  beforeEach(() => {
    mkdirSync(testDir, { recursive: true });

    const configContent = `
templates:
  builtin: "${templatesDir}"

icons:
  registry: "${iconsRegistryPath}"

references:
  enabled: false
`;
    writeFileSync(join(testDir, 'config.yaml'), configContent);
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it('should convert complete presentation with all features', async () => {
    const presentation = `
meta:
  title: 完全なプレゼンテーション
  author: テスト著者
  date: "2024-03-15"
  theme: academic

slides:
  # タイトルスライド
  - template: title
    content:
      title: プロジェクト発表
      subtitle: 全機能テスト
      author: テスト著者
      date: "2024-03-15"
      affiliation: テスト組織

  # 基本テンプレート - 箇条書き
  - template: bullet-list
    content:
      title: 主要ポイント
      items:
        - 第一のポイント
        - 第二のポイント
        - 第三のポイント

  # セクション区切り
  - template: section
    content:
      title: データ分析
      subtitle: 結果の概要

  # データテンプレート - テーブル
  - template: table
    content:
      title: 製品比較
      headers: ["製品名", "価格", "評価"]
      align: ["left", "right", "center"]
      rows:
        - ["製品A", "¥10,000", "★★★★☆"]
        - ["製品B", "¥15,000", "★★★★★"]

  # レイアウトテンプレート - 2カラム
  - template: two-column
    content:
      title: 比較分析
      left:
        - 左側のメリット1
        - 左側のメリット2
      right:
        - 右側のメリット1
        - 右側のメリット2
      ratio: "50:50"

  # 図表テンプレート - フローチャート
  - template: flow-chart
    content:
      title: 処理フロー
      direction: vertical
      steps:
        - { label: "開始", type: "start", color: "#4CAF50" }
        - { label: "処理", type: "process" }
        - { label: "完了", type: "end", color: "#9C27B0" }

  # 特殊テンプレート - 引用
  - template: quote
    content:
      title: 名言
      text: "未来を予測する最善の方法は、それを発明することだ。"
      author: "アラン・ケイ"

  # 番号付きリスト
  - template: numbered-list
    content:
      title: 手順
      items:
        - ステップ1
        - ステップ2
        - ステップ3
`;
    const inputPath = join(testDir, 'complete.yaml');
    writeFileSync(inputPath, presentation);

    const outputPath = join(testDir, 'complete.md');
    const configPath = join(testDir, 'config.yaml');

    const program = new Command();
    program.addCommand(createConvertCommand());

    await program.parseAsync([
      'node',
      'test',
      'convert',
      inputPath,
      '-o',
      outputPath,
      '-c',
      configPath,
    ]);

    expect(existsSync(outputPath)).toBe(true);

    const output = readFileSync(outputPath, 'utf-8');

    // フロントマター確認
    expect(output).toContain('marp: true');
    expect(output).toContain('title: 完全なプレゼンテーション');
    expect(output).toContain('theme: academic');

    // 基本テンプレート
    expect(output).toContain('# プロジェクト発表');
    expect(output).toContain('# 主要ポイント');
    expect(output).toContain('- 第一のポイント');

    // セクション
    expect(output).toContain('# データ分析');

    // テーブル
    expect(output).toContain('# 製品比較');
    expect(output).toContain('製品名');

    // 2カラム
    expect(output).toContain('# 比較分析');
    expect(output).toContain('two-column-container');

    // フローチャート
    expect(output).toContain('# 処理フロー');
    expect(output).toContain('flow-container');

    // 引用
    expect(output).toContain('# 名言');
    expect(output).toContain('blockquote');

    // 番号付きリスト
    expect(output).toContain('# 手順');
    expect(output).toContain('1. ステップ1');

    // スライドセパレータの確認
    const slideSeparators = output.split('\n---\n');
    expect(slideSeparators.length).toBeGreaterThanOrEqual(8);
  });

  it('should handle Japanese content correctly', async () => {
    const presentation = `
meta:
  title: 日本語プレゼンテーション
  author: 山田太郎
  date: "2024年3月15日"

slides:
  - template: title
    content:
      title: 日本語テスト
      subtitle: マルチバイト文字の確認
      author: 山田太郎
      affiliation: 株式会社テスト

  - template: bullet-list
    content:
      title: 日本語箇条書き
      items:
        - ひらがなテスト
        - カタカナテスト
        - 漢字テスト
        - 絵文字テスト🎉

  - template: quote
    content:
      text: 一期一会
      author: 千利休
`;
    const inputPath = join(testDir, 'japanese.yaml');
    writeFileSync(inputPath, presentation);

    const outputPath = join(testDir, 'japanese.md');
    const configPath = join(testDir, 'config.yaml');

    const program = new Command();
    program.addCommand(createConvertCommand());

    await program.parseAsync([
      'node',
      'test',
      'convert',
      inputPath,
      '-o',
      outputPath,
      '-c',
      configPath,
    ]);

    const output = readFileSync(outputPath, 'utf-8');

    // 日本語メタ情報
    expect(output).toContain('title: 日本語プレゼンテーション');

    // 日本語コンテンツ
    expect(output).toContain('# 日本語テスト');
    expect(output).toContain('山田太郎');
    expect(output).toContain('株式会社テスト');
    expect(output).toContain('- ひらがなテスト');
    expect(output).toContain('- カタカナテスト');
    expect(output).toContain('- 漢字テスト');

    // 引用の日本語
    expect(output).toContain('一期一会');
    expect(output).toContain('千利休');
  });

  it('should work without reference-manager', async () => {
    const configWithoutRefs = `
templates:
  builtin: "${templatesDir}"

icons:
  registry: "${iconsRegistryPath}"

references:
  enabled: false
`;
    writeFileSync(join(testDir, 'config.yaml'), configWithoutRefs);

    const presentation = `
meta:
  title: 引用なしプレゼン

slides:
  - template: title
    content:
      title: シンプルなプレゼン

  - template: bullet-list
    content:
      title: ポイント
      items:
        - 引用なしの項目
        - 普通のテキスト
`;
    const inputPath = join(testDir, 'no-refs.yaml');
    writeFileSync(inputPath, presentation);

    const outputPath = join(testDir, 'no-refs.md');
    const configPath = join(testDir, 'config.yaml');

    const program = new Command();
    program.addCommand(createConvertCommand());

    await program.parseAsync([
      'node',
      'test',
      'convert',
      inputPath,
      '-o',
      outputPath,
      '-c',
      configPath,
    ]);

    expect(existsSync(outputPath)).toBe(true);

    const output = readFileSync(outputPath, 'utf-8');
    expect(output).toContain('marp: true');
    expect(output).toContain('# シンプルなプレゼン');
    expect(output).toContain('- 引用なしの項目');
  });

  it('should generate valid Marp output structure', async () => {
    const inputPath = join(fixturesDir, 'presentations/simple.yaml');
    const outputPath = join(testDir, 'marp-valid.md');
    const configPath = join(testDir, 'config.yaml');

    const program = new Command();
    program.addCommand(createConvertCommand());

    await program.parseAsync([
      'node',
      'test',
      'convert',
      inputPath,
      '-o',
      outputPath,
      '-c',
      configPath,
    ]);

    const output = readFileSync(outputPath, 'utf-8');

    // 正しいフロントマター構造
    expect(output.startsWith('---\n')).toBe(true);

    const frontmatterEnd = output.indexOf('\n---\n', 4);
    expect(frontmatterEnd).toBeGreaterThan(0);

    const frontmatter = output.slice(4, frontmatterEnd);
    expect(frontmatter).toContain('marp: true');

    // 各スライドに適切なコンテンツ
    const content = output.slice(frontmatterEnd + 5);
    expect(content.includes('#')).toBe(true);

    // スライド区切りの確認
    const hasSlides = output.includes('\n---\n');
    expect(hasSlides).toBe(true);
  });

  it('should handle diagram templates correctly', async () => {
    const presentation = `
meta:
  title: 図表テスト

slides:
  - template: flow-chart
    content:
      title: フローチャートテスト
      direction: horizontal
      steps:
        - { label: "入力", type: "start" }
        - { label: "処理A", type: "process" }
        - { label: "出力", type: "end" }

  - template: timeline
    content:
      title: タイムラインテスト
      events:
        - { date: "2020", label: "プロジェクト開始" }
        - { date: "2022", label: "フェーズ2" }
        - { date: "2024", label: "完了" }

  - template: matrix
    content:
      title: マトリクステスト
      xAxis:
        label: リスク
        high: 高
        low: 低
      yAxis:
        label: 影響度
        high: 大
        low: 小
      quadrants:
        - { label: 優先対応 }
        - { label: 監視 }
        - { label: 対策検討 }
        - { label: 許容 }

  - template: hierarchy
    content:
      title: 組織図テスト
      root:
        label: CEO
        children:
          - label: CTO
          - label: CFO
`;
    const inputPath = join(testDir, 'diagrams.yaml');
    writeFileSync(inputPath, presentation);

    const outputPath = join(testDir, 'diagrams.md');
    const configPath = join(testDir, 'config.yaml');

    const program = new Command();
    program.addCommand(createConvertCommand());

    await program.parseAsync([
      'node',
      'test',
      'convert',
      inputPath,
      '-o',
      outputPath,
      '-c',
      configPath,
    ]);

    expect(existsSync(outputPath)).toBe(true);

    const output = readFileSync(outputPath, 'utf-8');

    // フローチャート
    expect(output).toContain('# フローチャートテスト');
    expect(output).toContain('flow-container');

    // タイムライン
    expect(output).toContain('# タイムラインテスト');
    expect(output).toContain('2020');
    expect(output).toContain('プロジェクト開始');

    // マトリクス
    expect(output).toContain('# マトリクステスト');
    expect(output).toContain('matrix');

    // 組織図
    expect(output).toContain('# 組織図テスト');
    expect(output).toContain('CEO');
  });

  it('should handle special templates correctly', async () => {
    const presentation = `
meta:
  title: 特殊テンプレートテスト

slides:
  - template: quote
    content:
      title: 引用スライド
      text: テストの名言です。
      author: テスト著者
      source: テスト出典

  - template: code-block
    content:
      title: コードブロック
      language: typescript
      code: |
        function hello(): string {
          return "Hello, World!";
        }
      filename: example.ts

  - template: custom
    content:
      title: カスタムスライド
      markdown: |
        <div class="custom-content">
          <p>カスタムHTMLコンテンツ</p>
        </div>
`;
    const inputPath = join(testDir, 'special.yaml');
    writeFileSync(inputPath, presentation);

    const outputPath = join(testDir, 'special.md');
    const configPath = join(testDir, 'config.yaml');

    const program = new Command();
    program.addCommand(createConvertCommand());

    await program.parseAsync([
      'node',
      'test',
      'convert',
      inputPath,
      '-o',
      outputPath,
      '-c',
      configPath,
    ]);

    expect(existsSync(outputPath)).toBe(true);

    const output = readFileSync(outputPath, 'utf-8');

    // 引用
    expect(output).toContain('# 引用スライド');
    expect(output).toContain('テストの名言です');
    expect(output).toContain('テスト著者');

    // コードブロック
    expect(output).toContain('# コードブロック');
    expect(output).toContain('typescript');
    expect(output).toContain('function hello');

    // カスタム
    expect(output).toContain('# カスタムスライド');
    expect(output).toContain('custom-content');
  });

  it('should handle layout templates correctly', async () => {
    const presentation = `
meta:
  title: レイアウトテスト

slides:
  - template: two-column
    content:
      title: 2カラムレイアウト
      left: 左側コンテンツ
      right: 右側コンテンツ
      ratio: "60:40"

  - template: three-column
    content:
      title: 3カラムレイアウト
      columns:
        - title: 列1
          content: コンテンツ1
        - title: 列2
          content: コンテンツ2
        - title: 列3
          content: コンテンツ3

  - template: gallery
    content:
      title: ギャラリー
      images:
        - src: https://example.com/image1.jpg
          caption: 画像1
        - src: https://example.com/image2.jpg
          caption: 画像2
      columns: 2
`;
    const inputPath = join(testDir, 'layouts.yaml');
    writeFileSync(inputPath, presentation);

    const outputPath = join(testDir, 'layouts.md');
    const configPath = join(testDir, 'config.yaml');

    const program = new Command();
    program.addCommand(createConvertCommand());

    await program.parseAsync([
      'node',
      'test',
      'convert',
      inputPath,
      '-o',
      outputPath,
      '-c',
      configPath,
    ]);

    expect(existsSync(outputPath)).toBe(true);

    const output = readFileSync(outputPath, 'utf-8');

    // 2カラム
    expect(output).toContain('# 2カラムレイアウト');
    expect(output).toContain('左側コンテンツ');
    expect(output).toContain('右側コンテンツ');

    // 3カラム
    expect(output).toContain('# 3カラムレイアウト');
    expect(output).toContain('コンテンツ1');
    expect(output).toContain('コンテンツ2');
    expect(output).toContain('コンテンツ3');

    // ギャラリー
    expect(output).toContain('# ギャラリー');
    expect(output).toContain('gallery');
  });

  it('should handle data templates correctly', async () => {
    const presentation = `
meta:
  title: データテンプレートテスト

slides:
  - template: table
    content:
      title: 基本テーブル
      headers: ["名前", "値", "備考"]
      rows:
        - ["項目A", "100", "注記1"]
        - ["項目B", "200", "注記2"]

  - template: comparison-table
    content:
      title: 比較テーブル
      items: ["オプションA", "オプションB"]
      criteria:
        - { label: "機能", values: ["良い", "普通"] }
        - { label: "価格", values: ["高い", "安い"] }
`;
    const inputPath = join(testDir, 'data-templates.yaml');
    writeFileSync(inputPath, presentation);

    const outputPath = join(testDir, 'data-templates.md');
    const configPath = join(testDir, 'config.yaml');

    const program = new Command();
    program.addCommand(createConvertCommand());

    await program.parseAsync([
      'node',
      'test',
      'convert',
      inputPath,
      '-o',
      outputPath,
      '-c',
      configPath,
    ]);

    expect(existsSync(outputPath)).toBe(true);

    const output = readFileSync(outputPath, 'utf-8');

    // 基本テーブル
    expect(output).toContain('# 基本テーブル');
    expect(output).toContain('名前');
    expect(output).toContain('項目A');

    // 比較テーブル
    expect(output).toContain('# 比較テーブル');
    expect(output).toContain('オプションA');
    expect(output).toContain('オプションB');
  });

  it('should handle nested list items correctly', async () => {
    const presentation = `
meta:
  title: ネストリストテスト

slides:
  - template: bullet-list
    content:
      title: ネスト箇条書き
      items:
        - 親項目1
        - nested:
            title: 親項目2
            items:
              - 子項目A
              - 子項目B
        - 親項目3

  - template: numbered-list
    content:
      title: ネスト番号リスト
      items:
        - ステップ1
        - nested:
            title: ステップ2
            items:
              - サブステップA
              - サブステップB
        - ステップ3
`;
    const inputPath = join(testDir, 'nested-lists.yaml');
    writeFileSync(inputPath, presentation);

    const outputPath = join(testDir, 'nested-lists.md');
    const configPath = join(testDir, 'config.yaml');

    const program = new Command();
    program.addCommand(createConvertCommand());

    await program.parseAsync([
      'node',
      'test',
      'convert',
      inputPath,
      '-o',
      outputPath,
      '-c',
      configPath,
    ]);

    expect(existsSync(outputPath)).toBe(true);

    const output = readFileSync(outputPath, 'utf-8');

    // 箇条書きのネスト
    expect(output).toContain('# ネスト箇条書き');
    expect(output).toContain('- 親項目1');
    expect(output).toContain('  - 子項目A');
    expect(output).toContain('  - 子項目B');

    // 番号リストのネスト
    expect(output).toContain('# ネスト番号リスト');
    expect(output).toContain('1. ステップ1');
  });
});
