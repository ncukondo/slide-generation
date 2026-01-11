# Source File Format Specification

## Overview

Source files use YAML format. YAML was chosen for the following reasons:

- **Natural hierarchical structure**: Indentation-based nesting is well-suited for slide structures
- **Objects within arrays**: `- { key: value }` format allows concise diagram node definitions
- **AI compatibility**: LLMs have abundant training data for YAML generation
- **Consistency with Marp**: Same format as Marp's front matter

## File Structure

```yaml
# presentation.yaml

meta:
  title: "Presentation Title"
  author: "Author Name"
  date: "2026-01-09"
  theme: "corporate-blue"        # Theme name (under themes/)

  # Reference citation settings (optional)
  references:
    enabled: true
    style: author-year-pmid      # Citation format

slides:
  - template: <template-name>
    content:
      <template-specific content>

  - template: <template-name>
    content:
      <template-specific content>
```

## Metadata (`meta`)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | string | Yes | Presentation title |
| `author` | string | No | Author name |
| `date` | string | No | Creation date / Presentation date |
| `theme` | string | No | Theme name to use (default: default) |
| `references` | object | No | Reference citation settings |

### Reference Citation Settings (`meta.references`)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `enabled` | boolean | No | Enable citation feature (default: true) |
| `style` | string | No | Citation style (default: author-year-pmid) |

## Slide Definition (`slides`)

Each slide is defined in the following format:

```yaml
- template: <template-name>
  content:
    <content>
  class: <additional-css-class>        # optional
  notes: <speaker-notes>               # optional
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `template` | string | Yes | Template name to use |
| `content` | object | Yes | Template-specific content |
| `class` | string | No | Additional CSS classes |
| `notes` | string | No | Speaker notes (output as Marp `<!-- -->`) |

## Basic Template Examples

### Title Slide

```yaml
- template: title
  content:
    title: "Main Title"
    subtitle: "Subtitle"
    author: "Presenter Name"
    date: "January 2026"
    affiliation: "Organization"
```

### Bullet List Slide

```yaml
- template: bullet-list
  content:
    title: "Slide Title"
    items:
      - "Item 1"
      - "Item 2 [@smith2024]"           # With citation
      - nested:
          title: "Nested Item"
          items:
            - "Sub-item A"
            - "Sub-item B"
      - "Item 4"
```

### Numbered List

```yaml
- template: numbered-list
  content:
    title: "Steps"
    items:
      - "Step 1"
      - "Step 2"
      - "Step 3"
```

### Two-Column Layout

```yaml
- template: two-column
  content:
    title: "Comparison"
    left:
      title: "Option A"
      items:
        - "Feature 1"
        - "Feature 2"
    right:
      title: "Option B"
      items:
        - "Feature 1"
        - "Feature 2"
```

### Cycle Diagram

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

### Table

```yaml
- template: table
  content:
    title: "Comparison Table"
    headers: ["Item", "Option A", "Option B"]
    rows:
      - ["Price", "$10", "$20"]
      - ["Features", { colspan: 2, text: "Both equivalent" }]    # Cell merge
      - ["Support", "Email", "Phone + Email"]
    caption: "Table 1: Option Comparison"    # Optional
```

### Quote Slide

```yaml
- template: quote
  content:
    text: "Write the quoted text here."
    source: "@smith2024"
    page: "p.42"
```

### Bibliography Slide

```yaml
- template: bibliography
  content:
    title: "References"
    # Cited references in this presentation are automatically expanded
```

### Custom (Direct Writing)

```yaml
- template: custom
  raw: |
    # Custom Slide

    Free-form Markdown writing is possible.

    - Bullet points
    - HTML can also be used

    <div class="custom-element">
      Custom HTML
    </div>
```

## Citation Syntax

In-text citations use the Pandoc-compatible `[@id]` format:

```yaml
items:
  - "Single citation [@smith2024]"
  - "Multiple citations [@smith2024; @tanaka2023]"
  - "Insert a citation [@johnson2022] within the text"
```

### Citation Expansion Result

```
Input: "This method is effective [@smith2024]"
Output: "This method is effective (Smith et al., 2024; PMID: 12345678)"
```

For details, see [references.md](./references.md).

## Icon References

Icons are referenced using the `icon` field:

```yaml
nodes:
  - { label: "Plan", icon: "planning" }        # Alias
  - { label: "Execute", icon: "mi:play_arrow" } # Direct specification
  - { label: "Verify", icon: "custom:check" }   # Custom SVG
```

For details, see [icons.md](./icons.md).

## Complete Example

```yaml
meta:
  title: "Research Presentation"
  author: "Taro Yamada"
  date: "January 2026"
  theme: "academic"
  references:
    enabled: true

slides:
  - template: title
    content:
      title: "Proposing a New Method"
      subtitle: "An Approach to Solve Issues with Conventional Methods"
      author: "Taro Yamada"
      affiliation: "XX University"

  - template: bullet-list
    content:
      title: "Background"
      items:
        - "Conventional methods have issues [@smith2024]"
        - "Recent research [@tanaka2023; @johnson2022] has attempted improvements"
        - "However, fundamental solutions have not been achieved"

  - template: cycle-diagram
    content:
      title: "Overview of Proposed Method"
      nodes:
        - { label: "Data Collection", icon: "database", color: "#4CAF50" }
        - { label: "Analysis", icon: "analysis", color: "#2196F3" }
        - { label: "Model Building", icon: "model", color: "#FF9800" }
        - { label: "Evaluation", icon: "evaluation", color: "#9C27B0" }

  - template: table
    content:
      title: "Evaluation Results"
      headers: ["Method", "Accuracy", "Processing Time"]
      rows:
        - ["Conventional Method", "85%", "10s"]
        - ["Proposed Method", "92%", "3s"]

  - template: bullet-list
    content:
      title: "Conclusion"
      items:
        - "The proposed method demonstrated superior performance over conventional methods"
        - "Future work includes validation with large-scale data"

  - template: bibliography
    content:
      title: "References"
```
