# slide-generation

A CLI tool to generate Marp-compatible Markdown from YAML source files, designed for both humans and AI to create presentations easily.

## Features

- **YAML-based source files** - Structured, readable, and easy to generate programmatically
- **Template system** - Reusable templates for various slide types
- **Icon support** - Built-in icon registry with Material Icons, Heroicons, and custom icons
- **Reference management** - Integration with reference-manager CLI for citations
- **Watch mode** - Auto-convert on file changes
- **Marp compatible** - Output works directly with Marp CLI
- **AI assistant integration** - Built-in configuration for Claude Code, OpenCode, Cursor, and other AI assistants

## Installation

```bash
# Using npm
npm install -g @ncukondo/slide-generation

# Using pnpm
pnpm add -g @ncukondo/slide-generation

# Or run directly with npx
npx @ncukondo/slide-generation convert presentation.yaml
```

**Requirements:** Node.js >= 22.0.0

## Quick Start

```bash
# Initialize a new project
slide-gen init my-presentation
cd my-presentation

# Edit presentation.yaml, then convert
slide-gen convert presentation.yaml

# Watch for changes
slide-gen watch presentation.yaml

# Preview with Marp CLI
marp --preview presentation.md
```

## Source File Format

```yaml
meta:
  title: My Presentation
  author: Your Name
  date: "2024-03-15"
  theme: default

slides:
  - template: title
    content:
      title: Welcome
      subtitle: Getting Started
      author: Your Name

  - template: bullet-list
    content:
      title: Key Points
      items:
        - First important point
        - Second important point
        - Third important point

  - template: section
    content:
      title: Next Section
```

## Commands

### convert

Convert YAML source to Marp Markdown.

```bash
slide-gen convert <input> [options]
```

Options:
- `-o, --output <path>` - Output file path (default: `<input>.md`)
- `-c, --config <path>` - Config file path
- `-t, --theme <name>` - Theme name
- `--no-references` - Disable reference processing
- `-v, --verbose` - Verbose output

### validate

Validate source file without conversion.

```bash
slide-gen validate <input> [options]
```

Options:
- `--strict` - Treat warnings as errors
- `--format <fmt>` - Output format (text/json)

### watch

Watch file and auto-convert on changes.

```bash
slide-gen watch <input> [options]
```

Options:
- `-o, --output <path>` - Output file path
- `--debounce <ms>` - Debounce delay (default: 300)

### templates

List and inspect available templates.

```bash
# List all templates
slide-gen templates list

# Show template details
slide-gen templates info <name>

# Export example YAML
slide-gen templates example <name>
```

### icons

Search and preview icons.

```bash
# List icon sources
slide-gen icons list

# Search icons
slide-gen icons search <query>

# Preview icon
slide-gen icons preview <name>
```

### init

Initialize a new project.

```bash
slide-gen init [directory]
```

Options:
- `--template <name>` - Initial template
- `--no-examples` - Do not create sample files
- `--no-ai-config` - Do not create AI assistant config files
- `--skip-marp-install` - Skip Marp CLI installation prompt

### sources

Manage source materials for slide creation.

```bash
# Initialize source management (interactive)
slide-gen sources init

# Import materials from directory
slide-gen sources init --from-directory ~/Projects/materials/

# Add material file
slide-gen sources import ~/data.xlsx

# Check source status
slide-gen sources status
```

### preview

Preview with Marp CLI (requires @marp-team/marp-cli).

```bash
slide-gen preview <input> [options]
```

### screenshot

Take screenshots of slides (requires @marp-team/marp-cli).

```bash
slide-gen screenshot <input> [options]
```

Options:
- `-o, --output <path>` - Output directory (default: `./screenshots`)
- `-s, --slide <number>` - Specific slide only (1-based)
- `-w, --width <pixels>` - Image width (default: 1280)

## Reference Management

Integrate with [reference-manager](https://github.com/ncukondo/reference-manager) for academic citations.

### Citation Syntax

Use Pandoc-compatible `[@id]` format in content:

```yaml
items:
  - "This method is effective [@smith2024]"
  - "Multiple studies [@smith2024; @tanaka2023] show..."
```

### Bibliography Auto-Generation

```yaml
- template: bibliography
  content:
    title: "References"
    autoGenerate: true  # Auto-collect cited references
```

### Validation

```bash
# Check for missing citation keys
slide-gen validate presentation.yaml

# AI-optimized output with fix suggestions
slide-gen validate presentation.yaml --format llm
```

## Available Templates

### Basic
- `title` - Title slide
- `section` - Section divider
- `bullet-list` - Bullet point list
- `numbered-list` - Numbered list

### Diagrams
- `flow-chart` - Flow chart
- `cycle-diagram` - Cycle diagram (3-6 elements)
- `hierarchy` - Hierarchy/org chart
- `matrix` - 2x2 matrix
- `timeline` - Timeline

### Data
- `table` - Basic table
- `comparison-table` - Comparison table with highlighting

### Layouts
- `two-column` - Two column layout
- `three-column` - Three column layout
- `image-text` - Image with text
- `gallery` - Image gallery

### Special
- `quote` - Quote/citation slide
- `code-block` - Code block with syntax highlighting
- `bibliography` - Bibliography/references slide
- `custom` - Custom Markdown slide

## Configuration

Create `config.yaml` in your project:

```yaml
templates:
  builtin: "./templates"
  custom: "./my-templates"

icons:
  registry: "./icons/registry.yaml"
  cache:
    enabled: true
    ttl: 86400

references:
  enabled: true
  connection:
    type: cli
    command: "ref"

output:
  theme: "default"
```

Config file search order:
1. `--config` option
2. `./config.yaml`
3. `./slide-gen.yaml`
4. `~/.slide-gen/config.yaml`

## AI Assistant Integration

> **For AI Assistants:** If you are an AI assistant reading this README, see [AI-GUIDE.md](./AI-GUIDE.md) for a quick start guide optimized for AI workflows.

When you run `slide-gen init`, AI assistant configuration files are automatically generated:

### Supported AI Assistants

| Assistant | Configuration Files |
|-----------|---------------------|
| Claude Code | `CLAUDE.md`, `.claude/commands/*.md` |
| OpenCode | `AGENTS.md`, `.opencode/agent/slide.md` |
| Cursor | `.cursorrules` |
| All (AgentSkills) | `.skills/slide-assistant/` |

### Generated Files

```
my-presentation/
├── .skills/
│   └── slide-assistant/
│       ├── SKILL.md              # AgentSkills format (common)
│       └── references/
│           ├── templates.md      # Template reference
│           └── workflows.md      # Workflow reference
├── .claude/
│   └── commands/                 # Claude Code Slash Commands
│       ├── slide-create.md
│       ├── slide-validate.md
│       └── ...
├── .opencode/
│   └── agent/
│       └── slide.md              # OpenCode sub-agent
├── AGENTS.md                     # OpenCode project guide
├── CLAUDE.md                     # Claude Code project guide
└── .cursorrules                  # Cursor rules
```

### AI-Optimized Output

Use `--format llm` for token-efficient output:

```bash
slide-gen templates list --format llm
slide-gen templates info <name> --format llm
```

### AI Collaboration Workflows

This tool is designed for seamless collaboration with AI assistants.

#### Source Material Collection

AI supports three patterns for gathering information needed for slide creation:

| Pattern | Situation | AI Behavior |
|---------|-----------|-------------|
| A: Explore Mode | Materials organized in a directory | Explore and analyze directory |
| B: Supplement Mode | Only scenario or partial materials | Analyze content, interview for missing info |
| C: Interview Mode | No materials (starting from scratch) | Collect information via dialogue |

#### Image Preparation

Based on the presentation scenario, AI will:

1. Identify required images for each slide
2. Propose specific specifications (composition, resolution, notes)
3. Review provided images
4. Provide feedback and adjustment suggestions

For detailed specifications, see `spec/sources.md` and `spec/images.md`.

### Skip AI Configuration

To skip AI configuration files, use:

```bash
slide-gen init --no-ai-config
```

## Development

```bash
# Install dependencies
pnpm install

# Development mode
pnpm dev

# Build
pnpm build

# Test
pnpm test

# Lint
pnpm lint

# Type check
pnpm typecheck
```

## License

MIT
