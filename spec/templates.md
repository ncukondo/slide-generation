# Template System Specification

## Overview

Templates are reusable components that define the structure and layout of slides. Each template includes:

- Schema definition (input data structure)
- Output template (Nunjucks-based)
- Associated CSS (optional)

## Template Definition Files

Templates are placed in the `templates/` directory.

```
templates/
├── basic/
│   ├── title.yaml
│   ├── bullet-list.yaml
│   ├── numbered-list.yaml
│   └── section.yaml
├── diagrams/
│   ├── cycle-diagram.yaml
│   ├── flow-chart.yaml
│   ├── hierarchy.yaml
│   ├── matrix.yaml
│   └── timeline.yaml
├── data/
│   ├── table.yaml
│   └── comparison-table.yaml
├── layouts/
│   ├── two-column.yaml
│   ├── three-column.yaml
│   ├── image-full.yaml
│   ├── image-text.yaml
│   ├── image-caption.yaml
│   ├── image-grid.yaml
│   ├── before-after.yaml
│   └── gallery.yaml
└── special/
    ├── quote.yaml
    ├── code-block.yaml
    ├── bibliography.yaml
    └── custom.yaml
```

## Template Definition Format

```yaml
# templates/diagrams/cycle-diagram.yaml

name: cycle-diagram
description: "Cycle diagram (supports 3-6 elements)"
category: diagrams

# Input schema definition
schema:
  type: object
  required:
    - title
    - nodes
  properties:
    title:
      type: string
      description: "Slide title"
    nodes:
      type: array
      minItems: 3
      maxItems: 6
      description: "Nodes in the cycle diagram"
      items:
        type: object
        required:
          - label
        properties:
          label:
            type: string
            description: "Node label"
          icon:
            type: string
            description: "Icon reference (alias or direct specification)"
          color:
            type: string
            pattern: "^#[0-9A-Fa-f]{6}$"
            default: "#666666"
            description: "Node color"
          description:
            type: string
            description: "Node description (optional)"

# Sample data (for AI generation assistance)
example:
  title: "PDCA Cycle"
  nodes:
    - { label: "Plan", icon: "planning", color: "#4CAF50" }
    - { label: "Do", icon: "action", color: "#2196F3" }
    - { label: "Check", icon: "analysis", color: "#FF9800" }
    - { label: "Act", icon: "improvement", color: "#9C27B0" }

# Output template (Nunjucks)
output: |
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
      {%- if node.description %}
      <span class="node-desc">{{ node.description }}</span>
      {%- endif %}
    </div>
    {%- endfor %}
    <svg class="cycle-arrows" viewBox="0 0 100 100">
      <!-- Arrows are rendered via CSS or generated dynamically with JS -->
    </svg>
  </div>

# Associated CSS (included in theme)
css: |
  .cycle-container {
    display: flex;
    justify-content: center;
    align-items: center;
    position: relative;
    width: 100%;
    height: 70%;
  }

  .cycle-node {
    position: absolute;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 1em;
    border-radius: 50%;
    background: var(--node-color);
    color: white;
    width: 120px;
    height: 120px;
    justify-content: center;
  }

  /* Node positioning (angle calculation based on element count) */
  .cycle-3 .cycle-node { /* 3-element positioning */ }
  .cycle-4 .cycle-node { /* 4-element positioning */ }
  .cycle-5 .cycle-node { /* 5-element positioning */ }
  .cycle-6 .cycle-node { /* 6-element positioning */ }
```

## Built-in Template List

### Basic (basic/)

| Template | Description | Required Fields |
|----------|-------------|-----------------|
| `title` | Title slide | title |
| `section` | Section divider | title |
| `bullet-list` | Bulleted list | title, items |
| `numbered-list` | Numbered list | title, items |

### Diagrams (diagrams/)

| Template | Description | Required Fields |
|----------|-------------|-----------------|
| `cycle-diagram` | Cycle diagram (3-6 elements) | title, nodes |
| `flow-chart` | Flowchart | title, steps |
| `hierarchy` | Hierarchy/organization chart | title, root |
| `matrix` | 2x2 matrix | title, quadrants |
| `timeline` | Timeline | title, events |

### Data (data/)

| Template | Description | Required Fields |
|----------|-------------|-----------------|
| `table` | Basic table | title, headers, rows |
| `comparison-table` | Comparison table (with highlighting) | title, items, criteria |

### Layouts (layouts/)

| Template | Description | Required Fields |
|----------|-------------|-----------------|
| `two-column` | 2-column layout | title, left, right |
| `three-column` | 3-column layout | title, columns |
| `image-full` | Full-screen image | image |
| `image-text` | Image + text | title, image |
| `image-caption` | Image + caption | image, caption |
| `image-grid` | Multiple image grid (2-6 images) | title, images |
| `before-after` | Before/after comparison | title, before, after |
| `gallery` | Image gallery | title, images |

For detailed specifications on image templates and AI collaboration workflow, see [images.md](./images.md).

### Special (special/)

| Template | Description | Required Fields |
|----------|-------------|-----------------|
| `quote` | Quotation | text |
| `code-block` | Code block | code, language |
| `bibliography` | Bibliography/references | title |
| `custom` | Custom (direct input) | raw |

## Template Engine

### Nunjucks Extensions

Custom functions available within templates:

```nunjucks
{# Icon rendering #}
{{ icons.render("planning") }}
{{ icons.render("mi:home", { size: "24px", color: "#333" }) }}

{# Citation expansion #}
{{ refs.cite("@smith2024") }}
{{ refs.expand("Text containing [@id]") }}

{# Conditional classes #}
<div class="{{ 'highlight' if highlighted else '' }}">

{# Loops and indexing #}
{% for item in items %}
  {{ loop.index }}: {{ item }}
{% endfor %}
```

### Context Variables

The following variables are passed to templates:

| Variable | Description |
|----------|-------------|
| `content` | Content defined in the source file |
| `meta` | Presentation metadata |
| `icons` | Icon helper |
| `refs` | Citation helper |
| `slide` | Current slide information (index, etc.) |

## Creating Custom Templates

### 1. Create Template File

```yaml
# templates/custom/my-template.yaml
name: my-template
description: "Description of custom template"
category: custom

schema:
  type: object
  required:
    - title
    - content
  properties:
    title:
      type: string
    content:
      type: string

example:
  title: "Sample Title"
  content: "Sample Content"

output: |
  ---
  <!-- _class: my-template -->

  # {{ title }}

  <div class="my-content">
    {{ content }}
  </div>

css: |
  .my-template .my-content {
    /* Style definitions */
  }
```

### 2. Add CSS to Theme

CSS for custom templates is either automatically merged into the theme file or imported separately.

### 3. Usage

```yaml
slides:
  - template: my-template
    content:
      title: "Title"
      content: "Content"
```

## Schema Validation

Input data is validated using Zod schemas:

```typescript
// Example of auto-generated Zod schema
const cycleDigramSchema = z.object({
  title: z.string(),
  nodes: z.array(z.object({
    label: z.string(),
    icon: z.string().optional(),
    color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#666666'),
    description: z.string().optional(),
  })).min(3).max(6),
});
```

Validation errors are reported with specific messages:

```
Error in slide 3 (cycle-diagram):
  - nodes: Array must contain at least 3 element(s)
  - nodes[0].color: Invalid color format. Expected #RRGGBB
```

## Template Information Output for AI

Template information can be output for AI via CLI:

```bash
# Template list (concise format for LLM)
slide-gen templates list --format llm

# Specific template details and examples
slide-gen templates info cycle-diagram --format llm
```

Output example:

```
Template: cycle-diagram
Description: Cycle diagram (supports 3-6 elements)

Required fields:
  - title (string): Slide title
  - nodes (array[3-6]): Nodes in the cycle diagram
    - label (string, required): Node label
    - icon (string, optional): Icon reference
    - color (string, optional): Node color (#RRGGBB format)

Example:
```yaml
- template: cycle-diagram
  content:
    title: "PDCA Cycle"
    nodes:
      - { label: "Plan", icon: "planning", color: "#4CAF50" }
      - { label: "Do", icon: "action", color: "#2196F3" }
      - { label: "Check", icon: "analysis", color: "#FF9800" }
      - { label: "Act", icon: "improvement", color: "#9C27B0" }
```

## Template Screenshots

Visual reference images of templates can be generated via CLI:

```bash
# Screenshot a specific template
slide-gen templates screenshot cycle-diagram

# Screenshot all templates
slide-gen templates screenshot --all

# AI-optimized screenshots (smaller, token-efficient)
slide-gen templates screenshot --all --format ai

# Generate contact sheet (gallery overview)
slide-gen templates screenshot --all --contact-sheet --columns 4
```

### Use Cases

1. **Documentation**: Generate visual catalog of available templates
2. **AI Training**: Provide visual context for AI assistants selecting templates
3. **Template Selection**: Quick visual comparison before writing YAML
4. **Quality Assurance**: Verify template rendering with example data

See [cli.md](./cli.md#screenshot-1) for detailed options and examples.
