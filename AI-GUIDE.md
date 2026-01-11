# slide-gen AI Guide

This file is for AI assistants (Claude Code, OpenCode, Cursor, Codex, etc.).

## Quick Start

### 1. Initialize Project

```bash
npx @ncukondo/slide-generation init my-presentation
cd my-presentation
```

### 2. Available Commands

| Command | Description |
|---------|-------------|
| `slide-gen convert <input>` | Convert YAML to Marp Markdown |
| `slide-gen validate <input>` | Validate source file |
| `slide-gen templates list` | List templates |
| `slide-gen templates info <name>` | Template details |
| `slide-gen icons search <query>` | Search icons |
| `slide-gen preview <input>` | Preview in browser |
| `slide-gen screenshot <input>` | Take screenshots |

### 3. AI-Optimized Output

Use `--format llm` for token-efficient output:

```bash
slide-gen templates list --format llm
slide-gen templates info <name> --format llm
```

### 4. Slide Creation Workflow

1. Get manuscript/requirements from user
2. Check templates: `slide-gen templates list --format llm`
3. Create presentation.yaml
4. Validate: `slide-gen validate`
5. Convert: `slide-gen convert`
6. Preview or screenshot for review

### 5. Source Material Collection

Support three patterns based on user's material situation:

| Pattern | Situation | Your Behavior |
|---------|-----------|---------------|
| A: Explore | Materials in a directory | Scan with Glob, analyze with Read, organize into sources/ |
| B: Supplement | Only scenario/partial materials | Analyze content, interview for missing info |
| C: Interview | No materials | Collect info via dialogue, build from scratch |

Commands:
```bash
slide-gen sources init                              # Interactive
slide-gen sources init --from-directory ~/materials/  # From directory
slide-gen sources status                            # Check status
```

### 6. Image Collaboration

Based on presentation scenario:
1. Identify required images and their purpose
2. Generate specific requests (composition, resolution, notes)
3. Review provided images against scenario-derived criteria
4. Provide feedback and suggest adjustments

Commands:
```bash
slide-gen validate --check-images   # List missing images
slide-gen images request --format llm  # Generate request list
```

### 7. YAML Source Format

```yaml
meta:
  title: "Title"
  author: "Author"
  date: "YYYY-MM-DD"
  theme: "default"

slides:
  - template: title
    content:
      title: "Main Title"
      subtitle: "Subtitle"

  - template: bullet-list
    content:
      title: "Overview"
      items:
        - "Item 1"
        - "Item 2"
```

## Template Examples

### Title Slide

```yaml
- template: title
  content:
    title: "Title"
    subtitle: "Subtitle"
    author: "Author"
```

### Bullet List

```yaml
- template: bullet-list
  content:
    title: "Title"
    items:
      - "Item 1"
      - "Item 2"
```

### Two Column

```yaml
- template: two-column
  content:
    title: "Comparison"
    left:
      title: "Left Column"
      items:
        - "Point A"
        - "Point B"
    right:
      title: "Right Column"
      items:
        - "Point X"
        - "Point Y"
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

## Detailed Specifications

- [Source Format](spec/source-format.md)
- [Templates](spec/templates.md)
- [Icons](spec/icons.md)
- [CLI](spec/cli.md)
