# slide-gen AI Guide

This file is for AI assistants (Claude Code, OpenCode, Cursor, Codex, etc.).

## Quick Start

### 1. First Question to User

**Always start by asking about the user's material situation:**

```
"Let's create slides. What materials do you have?

 A) I have detailed materials organized in a directory
    (scenarios, scripts, data files, images, etc.)

 B) I have partial materials like a scenario or script
    (but need to supplement with additional info)

 C) I don't have materials yet
    (starting from scratch, will collect info through dialogue)"
```

Then follow the appropriate pattern in "Source Material Collection" section below.

### 2. Initialize Project

```bash
npx @ncukondo/slide-generation init my-presentation
cd my-presentation
```

### 3. After Initialization (Important)

After running `slide-gen init <directory>`:

**Recommended**: Ask the user to start a new AI agent session in the project directory:

```bash
cd my-presentation
claude  # or cursor, opencode, etc.
```

This enables:
- Slash commands (`/slide-create`, `/slide-validate`, etc.)
- Full AgentSkills support from `.skills/slide-assistant/`
- Efficient file operations with project-relative paths

**Alternative** (if continuing in current session):
Read `.skills/slide-assistant/SKILL.md` for detailed workflow instructions.

### 4. Available Commands

| Command | Description |
|---------|-------------|
| `slide-gen convert <input>` | Convert YAML to Marp Markdown |
| `slide-gen validate <input>` | Validate source file |
| `slide-gen templates list` | List templates |
| `slide-gen templates info <name>` | Template details |
| `slide-gen icons search <query>` | Search icons |
| `slide-gen preview <input>` | Preview in browser |
| `slide-gen screenshot <input>` | Take screenshots |

### 5. AI-Optimized Output

Use `--format llm` for token-efficient output:

```bash
slide-gen templates list --format llm
slide-gen templates info <name> --format llm
```

### 6. Source Material Collection (Three Patterns)

Based on the user's answer to the first question, follow the appropriate pattern:

#### Pattern A: Explore Mode (Detailed Materials Exist)

When user has materials organized in a directory:

1. Ask for the directory path
2. Scan directory structure with Glob
3. Read and analyze each file
4. Classify files (scenario, scripts, data, images, references)
5. Summarize findings and confirm with user
6. Ask clarifying questions about gaps
7. Configure `sources/` directory with organized materials
8. Proceed to slide creation

#### Pattern B: Supplement Mode (Partial Materials)

When user has only a scenario or partial materials:

1. Ask user to provide the file path or paste content
2. Analyze the content thoroughly
3. Identify what information is present vs. missing
4. Ask targeted questions to fill gaps:
   - Purpose and audience
   - Duration and format
   - Key messages
   - Available data/examples
5. Load any additional files user mentions
6. Configure `sources/` directory
7. Proceed to slide creation

#### Pattern C: Interview Mode (Starting from Scratch)

When user has no materials:

1. Ask basic questions:
   - "What is this presentation about?"
   - "Who is the audience?"
   - "How long is the presentation?"
2. Ask purpose-specific questions (proposal, report, introduction, etc.)
3. Collect data and examples user can provide
4. Propose slide structure for approval
5. Incorporate feedback
6. Configure `sources/` directory from conversation
7. Proceed to slide creation

#### Commands

```bash
slide-gen sources init                                # Interactive
slide-gen sources init --from-directory ~/materials/  # From directory
slide-gen sources status                              # Check status
```

### 7. Slide Creation Workflow

After collecting materials (Pattern A/B/C above):

1. Check templates: `slide-gen templates list --format llm`
2. Select appropriate templates for each slide
3. Create or edit `presentation.yaml`
4. Validate: `slide-gen validate presentation.yaml`
5. Fix any errors
6. Convert: `slide-gen convert presentation.yaml`
7. Preview or screenshot for review

### 8. Image Collaboration

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

### 9. YAML Source Format

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
