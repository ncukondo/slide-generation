import { describe, it, expect, beforeEach } from "vitest";
import * as path from "node:path";
import { TemplateLoader, TemplateEngine } from "../../src/templates";

describe("E2E: Basic Templates", () => {
  let loader: TemplateLoader;
  let engine: TemplateEngine;
  const fixturesDir = path.resolve(__dirname, "../fixtures/templates");

  beforeEach(async () => {
    loader = new TemplateLoader();
    await loader.loadBuiltIn(fixturesDir);
    engine = new TemplateEngine();
  });

  describe("Title Template", () => {
    it("should render title slide with all fields", () => {
      const template = loader.get("title");
      expect(template).toBeDefined();

      const content = {
        title: "プレゼンテーションタイトル",
        subtitle: "サブタイトル",
        author: "著者名",
        date: "2024-01-15",
        affiliation: "所属組織",
      };

      const validation = loader.validateContent("title", content);
      expect(validation.valid).toBe(true);

      const output = engine.render(template!.output, content);
      expect(output).toContain("# プレゼンテーションタイトル");
      expect(output).toContain("## サブタイトル");
      expect(output).toContain("著者名");
      expect(output).toContain("2024-01-15");
      expect(output).toContain("所属組織");
      expect(output).toContain("_class: title");
    });

    it("should render title slide with minimal fields", () => {
      const template = loader.get("title");
      expect(template).toBeDefined();

      const content = {
        title: "シンプルなタイトル",
      };

      const validation = loader.validateContent("title", content);
      expect(validation.valid).toBe(true);

      const output = engine.render(template!.output, content);
      expect(output).toContain("# シンプルなタイトル");
      // Optional fields should not render if not provided
      expect(output).not.toContain("undefined");
    });

    it("should reject title slide without title", () => {
      const validation = loader.validateContent("title", {
        subtitle: "サブタイトルのみ",
      });

      expect(validation.valid).toBe(false);
      expect(validation.errors.some(e => e.includes("title"))).toBe(true);
    });
  });

  describe("Section Template", () => {
    it("should render section slide", () => {
      const template = loader.get("section");
      expect(template).toBeDefined();

      const content = {
        title: "第1章",
        subtitle: "はじめに",
      };

      const validation = loader.validateContent("section", content);
      expect(validation.valid).toBe(true);

      const output = engine.render(template!.output, content);
      expect(output).toContain("# 第1章");
      expect(output).toContain("はじめに");
      expect(output).toContain("_class: section");
    });

    it("should render section slide without subtitle", () => {
      const template = loader.get("section");
      expect(template).toBeDefined();

      const content = {
        title: "セクションタイトル",
      };

      const validation = loader.validateContent("section", content);
      expect(validation.valid).toBe(true);

      const output = engine.render(template!.output, content);
      expect(output).toContain("# セクションタイトル");
    });
  });

  describe("Bullet List Template", () => {
    it("should render simple bullet list", () => {
      const template = loader.get("bullet-list");
      expect(template).toBeDefined();

      const content = {
        title: "主なポイント",
        items: ["項目1", "項目2", "項目3"],
      };

      const validation = loader.validateContent("bullet-list", content);
      expect(validation.valid).toBe(true);

      const output = engine.render(template!.output, content);
      expect(output).toContain("# 主なポイント");
      expect(output).toContain("- 項目1");
      expect(output).toContain("- 項目2");
      expect(output).toContain("- 項目3");
    });

    it("should render nested bullet list", () => {
      const template = loader.get("bullet-list");
      expect(template).toBeDefined();

      const content = {
        title: "ネストされたリスト",
        items: [
          "親項目1",
          {
            nested: {
              title: "親項目2",
              items: ["子項目A", "子項目B"],
            },
          },
          "親項目3",
        ],
      };

      const validation = loader.validateContent("bullet-list", content);
      expect(validation.valid).toBe(true);

      const output = engine.render(template!.output, content);
      expect(output).toContain("# ネストされたリスト");
      expect(output).toContain("- 親項目1");
      expect(output).toContain("- 親項目2");
      expect(output).toContain("  - 子項目A");
      expect(output).toContain("  - 子項目B");
      expect(output).toContain("- 親項目3");
    });

    it("should expand citation references in items", () => {
      const template = loader.get("bullet-list");
      expect(template).toBeDefined();

      const content = {
        title: "引用付きリスト",
        items: [
          "この研究 [@smith2024] によると",
          "別の文献 [@jones2023] では",
        ],
      };

      const validation = loader.validateContent("bullet-list", content);
      expect(validation.valid).toBe(true);

      const output = engine.render(template!.output, content);
      // refs.expand stub converts [@id] to (id)
      expect(output).toContain("(smith2024)");
      expect(output).toContain("(jones2023)");
    });
  });

  describe("Numbered List Template", () => {
    it("should render simple numbered list", () => {
      const template = loader.get("numbered-list");
      expect(template).toBeDefined();

      const content = {
        title: "手順",
        items: ["最初のステップ", "次のステップ", "最後のステップ"],
      };

      const validation = loader.validateContent("numbered-list", content);
      expect(validation.valid).toBe(true);

      const output = engine.render(template!.output, content);
      expect(output).toContain("# 手順");
      expect(output).toContain("1. 最初のステップ");
      expect(output).toContain("2. 次のステップ");
      expect(output).toContain("3. 最後のステップ");
    });

    it("should render nested numbered list", () => {
      const template = loader.get("numbered-list");
      expect(template).toBeDefined();

      const content = {
        title: "詳細手順",
        items: [
          "準備",
          {
            nested: {
              title: "実行",
              items: ["サブステップ1", "サブステップ2"],
            },
          },
          "完了",
        ],
      };

      const validation = loader.validateContent("numbered-list", content);
      expect(validation.valid).toBe(true);

      const output = engine.render(template!.output, content);
      expect(output).toContain("# 詳細手順");
      expect(output).toContain("1. 準備");
      expect(output).toContain("2. 実行");
      expect(output).toContain("   1. サブステップ1");
      expect(output).toContain("   2. サブステップ2");
      expect(output).toContain("3. 完了");
    });
  });

  describe("All basic templates are available", () => {
    it("should have all 4 basic templates loaded", () => {
      const basic = loader.listByCategory("basic");
      expect(basic.length).toBeGreaterThanOrEqual(4);

      const names = basic.map(t => t.name);
      expect(names).toContain("title");
      expect(names).toContain("section");
      expect(names).toContain("bullet-list");
      expect(names).toContain("numbered-list");
    });
  });
});
