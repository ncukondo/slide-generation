import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Parser } from '../../src/core/parser';
import { writeFileSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';

describe('E2E: Parser', () => {
  const testDir = './test-e2e-parser';

  beforeEach(() => {
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it('should parse complete presentation file', async () => {
    const content = `
meta:
  title: "研究発表"
  author: "山田太郎"
  date: "2026年1月"
  theme: "academic"
  references:
    enabled: true

slides:
  - template: title
    content:
      title: "新しい手法の提案"
      subtitle: "従来手法の課題を解決するアプローチ"
      author: "山田太郎"

  - template: bullet-list
    content:
      title: "背景"
      items:
        - "従来手法には課題がある [@smith2024]"
        - "近年の研究で改善が試みられている"
    notes: "ここで従来手法の問題点を説明"

  - template: cycle-diagram
    content:
      title: "提案手法の概要"
      nodes:
        - { label: "データ収集", icon: "database", color: "#4CAF50" }
        - { label: "分析", icon: "analysis", color: "#2196F3" }
        - { label: "モデル構築", icon: "model", color: "#FF9800" }
        - { label: "評価", icon: "evaluation", color: "#9C27B0" }

  - template: bibliography
    content:
      title: "参考文献"
`;
    writeFileSync(join(testDir, 'presentation.yaml'), content);

    const parser = new Parser();
    const result = await parser.parseFile(join(testDir, 'presentation.yaml'));

    expect(result.meta.title).toBe('研究発表');
    expect(result.meta.author).toBe('山田太郎');
    expect(result.meta.theme).toBe('academic');
    expect(result.meta.references?.enabled).toBe(true);
    expect(result.slides).toHaveLength(4);
    expect(result.slides[0]?.template).toBe('title');
    expect(result.slides[1]?.notes).toBe('ここで従来手法の問題点を説明');
    expect(result.slides[2]?.content['nodes']).toHaveLength(4);
  });

  it('should handle Japanese content correctly', async () => {
    const content = `
meta:
  title: "日本語タイトル"
slides:
  - template: bullet-list
    content:
      title: "箇条書き"
      items:
        - "日本語アイテム1"
        - "日本語アイテム2"
`;
    writeFileSync(join(testDir, 'japanese.yaml'), content);

    const parser = new Parser();
    const result = await parser.parseFile(join(testDir, 'japanese.yaml'));

    expect(result.meta.title).toBe('日本語タイトル');
    const items = result.slides[0]?.content['items'] as string[];
    expect(items).toContain('日本語アイテム1');
  });

  it('should parse presentation with custom template using raw field', async () => {
    const content = `
meta:
  title: "カスタムプレゼン"
slides:
  - template: custom
    content: {}
    raw: |
      # カスタムスライド

      自由なMarkdown記述が可能です。

      - 箇条書き
      - HTMLも使用可能

      <div class="custom-element">
        カスタムHTML
      </div>
`;
    writeFileSync(join(testDir, 'custom.yaml'), content);

    const parser = new Parser();
    const result = await parser.parseFile(join(testDir, 'custom.yaml'));

    expect(result.meta.title).toBe('カスタムプレゼン');
    expect(result.slides[0]?.raw).toContain('# カスタムスライド');
    expect(result.slides[0]?.raw).toContain('<div class="custom-element">');
  });

  it('should parse presentation with table content', async () => {
    const content = `
meta:
  title: "テーブルテスト"
slides:
  - template: table
    content:
      title: "比較表"
      headers: ["項目", "オプションA", "オプションB"]
      rows:
        - ["価格", "¥1,000", "¥2,000"]
        - ["機能", "基本", "拡張"]
        - ["サポート", "メール", "電話 + メール"]
      caption: "表1: オプション比較"
`;
    writeFileSync(join(testDir, 'table.yaml'), content);

    const parser = new Parser();
    const result = await parser.parseFile(join(testDir, 'table.yaml'));

    const tableContent = result.slides[0]?.content;
    expect(tableContent?.['title']).toBe('比較表');
    expect(tableContent?.['headers']).toEqual([
      '項目',
      'オプションA',
      'オプションB',
    ]);
    expect(tableContent?.['rows']).toHaveLength(3);
    expect(tableContent?.['caption']).toBe('表1: オプション比較');
  });

  it('should handle minimal presentation', async () => {
    const content = `
meta:
  title: "最小構成"
slides: []
`;
    writeFileSync(join(testDir, 'minimal.yaml'), content);

    const parser = new Parser();
    const result = await parser.parseFile(join(testDir, 'minimal.yaml'));

    expect(result.meta.title).toBe('最小構成');
    expect(result.meta.theme).toBe('default');
    expect(result.slides).toHaveLength(0);
  });

  it('should handle slides with class attribute', async () => {
    const content = `
meta:
  title: "クラステスト"
slides:
  - template: bullet-list
    content:
      title: "ハイライト"
      items:
        - "重要な項目"
    class: "highlight important"
`;
    writeFileSync(join(testDir, 'class.yaml'), content);

    const parser = new Parser();
    const result = await parser.parseFile(join(testDir, 'class.yaml'));

    expect(result.slides[0]?.class).toBe('highlight important');
  });
});
