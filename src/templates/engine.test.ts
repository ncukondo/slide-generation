import { describe, expect, it } from "vitest";
import { TemplateEngine } from "./engine";

describe("TemplateEngine", () => {
  it("should render simple template", () => {
    const engine = new TemplateEngine();
    const result = engine.render("Hello, {{ name }}!", { name: "World" });
    expect(result).toBe("Hello, World!");
  });

  it("should render template with loop", () => {
    const engine = new TemplateEngine();
    const template = `{% for item in items %}{{ item }}{% endfor %}`;
    const result = engine.render(template, { items: ["a", "b", "c"] });
    expect(result).toBe("abc");
  });

  it("should render template with conditionals", () => {
    const engine = new TemplateEngine();
    const template = `{% if show %}visible{% else %}hidden{% endif %}`;

    expect(engine.render(template, { show: true })).toBe("visible");
    expect(engine.render(template, { show: false })).toBe("hidden");
  });

  it("should handle undefined variables gracefully", () => {
    const engine = new TemplateEngine();
    const result = engine.render("Value: {{ missing }}", {});
    expect(result).toBe("Value: ");
  });
});

describe("TemplateEngine filters", () => {
  it("should have default filter", () => {
    const engine = new TemplateEngine();
    const result = engine.render('{{ value | default("fallback") }}', {});
    expect(result).toBe("fallback");
  });

  it("should have trim filter", () => {
    const engine = new TemplateEngine();
    const result = engine.render("{{ text | trim }}", { text: "  hello  " });
    expect(result).toBe("hello");
  });

  it("should have escape filter for HTML", () => {
    const engine = new TemplateEngine();
    const result = engine.render("{{ html | e }}", { html: "<script>" });
    expect(result).toBe("&lt;script&gt;");
  });

  it("should have length filter", () => {
    const engine = new TemplateEngine();
    const result = engine.render("{{ items | length }}", { items: [1, 2, 3] });
    expect(result).toBe("3");
  });
});

describe("TemplateEngine icons helper", () => {
  it("should have icons.render global function", () => {
    const engine = new TemplateEngine();
    const result = engine.render('{{ icons.render("test") }}', {});
    // Stub returns placeholder
    expect(result).toContain("icon");
    expect(result).toContain("test");
  });

  it("should accept options in icons.render", () => {
    const engine = new TemplateEngine();
    const template = '{{ icons.render("home", { size: "32px" }) }}';
    const result = engine.render(template, {});
    expect(result).toBeDefined();
  });
});
