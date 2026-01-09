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
