import { describe, it, expect, beforeEach } from "vitest";
import { CSSCollector } from "./css-collector";
import { TemplateLoader } from "./loader";

describe("CSSCollector", () => {
  let templateLoader: TemplateLoader;
  let collector: CSSCollector;

  beforeEach(async () => {
    templateLoader = new TemplateLoader();

    // Load a template with CSS
    await templateLoader.loadFromString(`
name: cycle-diagram
description: "Cycle diagram"
category: diagrams
schema:
  type: object
  properties:
    title:
      type: string
output: |
  # {{ content.title }}
css: |
  .cycle-container {
    display: flex;
  }
  .cycle-node {
    background: var(--node-color);
  }
`);

    // Load a template with CSS
    await templateLoader.loadFromString(`
name: matrix
description: "2x2 Matrix"
category: diagrams
schema:
  type: object
  properties:
    title:
      type: string
output: |
  # {{ content.title }}
css: |
  .matrix-container {
    display: grid;
  }
`);

    // Load a template without CSS
    await templateLoader.loadFromString(`
name: title
description: "Title slide"
category: basic
schema:
  type: object
  properties:
    title:
      type: string
output: |
  # {{ content.title }}
`);

    collector = new CSSCollector(templateLoader);
  });

  it("should collect CSS from used templates", () => {
    const usedTemplates = ["cycle-diagram", "title"];
    const css = collector.collect(usedTemplates);

    expect(css).toContain(".cycle-container");
    expect(css).not.toContain(".matrix-container"); // not used
  });

  it("should return empty string when no templates have CSS", () => {
    const usedTemplates = ["title"];
    const css = collector.collect(usedTemplates);

    expect(css).toBe("");
  });

  it("should collect CSS from multiple templates", () => {
    const usedTemplates = ["cycle-diagram", "matrix"];
    const css = collector.collect(usedTemplates);

    expect(css).toContain(".cycle-container");
    expect(css).toContain(".matrix-container");
  });

  it("should ignore unknown templates", () => {
    const usedTemplates = ["cycle-diagram", "unknown-template"];
    const css = collector.collect(usedTemplates);

    expect(css).toContain(".cycle-container");
    // Should not throw
  });

  it("should not duplicate CSS when template is used multiple times", () => {
    const usedTemplates = ["cycle-diagram", "cycle-diagram", "cycle-diagram"];
    const css = collector.collect(usedTemplates);

    // CSS should only appear once
    const cycleCount = (css.match(/\.cycle-container/g) || []).length;
    expect(cycleCount).toBe(1);
  });
});
