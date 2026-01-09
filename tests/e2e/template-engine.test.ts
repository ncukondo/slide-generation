import { describe, expect, it } from "vitest";
import { TemplateEngine } from "../../src/templates/engine";

describe("E2E: Template Engine", () => {
  it("should render a complete slide template", () => {
    const engine = new TemplateEngine();
    const template = `
---
<!-- _class: diagram-slide cycle-slide -->

# {{ title }}

<div class="cycle-container cycle-{{ nodes | length }}">
  {%- for node in nodes %}
  <div class="cycle-node" style="--node-color: {{ node.color | default('#666666') }}; --node-index: {{ loop.index0 }};">
    {%- if node.icon %}
    <span class="node-icon">{{ icons.render(node.icon) }}</span>
    {%- endif %}
    <span class="node-label">{{ node.label }}</span>
  </div>
  {%- endfor %}
</div>
`;

    const context = {
      title: "PDCAサイクル",
      nodes: [
        { label: "Plan", icon: "planning", color: "#4CAF50" },
        { label: "Do", icon: "action", color: "#2196F3" },
        { label: "Check", icon: "analysis", color: "#FF9800" },
        { label: "Act", icon: "improvement", color: "#9C27B0" },
      ],
    };

    const result = engine.render(template, context);

    expect(result).toContain("PDCAサイクル");
    expect(result).toContain("cycle-4");
    expect(result).toContain("Plan");
    expect(result).toContain("#4CAF50");
    expect(result).toContain("icon-planning");
  });

  it("should render template with references", () => {
    const engine = new TemplateEngine();
    const template = `
# {{ title }}

{% for item in items %}
- {{ refs.expand(item) }}
{% endfor %}
`;

    const context = {
      title: "Background",
      items: [
        "This is important [@smith2024]",
        "Multiple refs [@smith2024; @tanaka2023]",
      ],
    };

    const result = engine.render(template, context);

    expect(result).toContain("(smith2024)");
  });

  it("should render complex nested template with Japanese content", () => {
    const engine = new TemplateEngine();
    const template = `
---
<!-- _class: comparison-slide -->

# {{ title }}

<table class="comparison-table">
  <thead>
    <tr>
      {%- for header in headers %}
      <th>{{ header }}</th>
      {%- endfor %}
    </tr>
  </thead>
  <tbody>
    {%- for row in rows %}
    <tr>
      {%- for cell in row %}
      <td>{{ cell }}</td>
      {%- endfor %}
    </tr>
    {%- endfor %}
  </tbody>
</table>

{% if footnote %}
<div class="footnote">{{ footnote }}</div>
{% endif %}
`;

    const context = {
      title: "主要フレームワークの比較",
      headers: ["機能", "React", "Vue", "Angular"],
      rows: [
        ["学習曲線", "中程度", "やさしい", "急"],
        ["パフォーマンス", "高", "高", "中"],
        ["コミュニティ", "大", "中", "中"],
      ],
      footnote: "2024年時点のデータ",
    };

    const result = engine.render(template, context);

    expect(result).toContain("主要フレームワークの比較");
    expect(result).toContain("React");
    expect(result).toContain("やさしい");
    expect(result).toContain("2024年時点のデータ");
    expect(result).toContain('<th>機能</th>');
  });

  it("should handle empty and optional values gracefully", () => {
    const engine = new TemplateEngine();
    const template = `
# {{ title | default("Untitled") }}

{% if description %}
{{ description }}
{% endif %}

{% for item in items %}
- {{ item.name }}: {{ item.value | default("N/A") }}
{% endfor %}
`;

    const context = {
      items: [
        { name: "Item 1", value: "100" },
        { name: "Item 2" }, // No value
      ],
    };

    const result = engine.render(template, context);

    expect(result).toContain("Untitled");
    expect(result).toContain("Item 1: 100");
    expect(result).toContain("Item 2: N/A");
  });

  it("should render slide with icons and index information", () => {
    const engine = new TemplateEngine();
    const template = `
---
<!-- Slide {{ slide.index }} / {{ slide.total }} -->

# {{ title }}

{{ icons.render("star", { size: "32px", color: "#FFD700" }) }}

{% for feature in features %}
- {{ icons.render(feature.icon) }} {{ feature.text }}
{% endfor %}
`;

    const context = {
      slide: { index: 3, total: 10 },
      title: "特長一覧",
      features: [
        { icon: "speed", text: "高速処理" },
        { icon: "security", text: "セキュリティ" },
        { icon: "scale", text: "スケーラビリティ" },
      ],
    };

    const result = engine.render(template, context);

    expect(result).toContain("Slide 3 / 10");
    expect(result).toContain("特長一覧");
    expect(result).toContain('icon-star');
    expect(result).toContain('32px');
    expect(result).toContain('#FFD700');
    expect(result).toContain("高速処理");
    expect(result).toContain("icon-speed");
  });
});
