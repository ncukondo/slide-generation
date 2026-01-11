# CLI Interface Specification

## Overview

The `slide-gen` command is a CLI tool that converts YAML source files to Marp-compatible Markdown.

## Installation

```bash
# Global installation
npm install -g slide-generation

# Or run directly with npx
npx slide-generation convert presentation.yaml
```

## Basic Syntax

```bash
slide-gen <command> [options]
```

## Command List

| Command | Description |
|---------|-------------|
| `convert` | Convert source file to Marp Markdown |
| `preview` | Preview (Marp integration) |
| `watch` | Watch files and auto-convert on changes |
| `templates` | Template management |
| `icons` | Icon management |
| `init` | Initialize project |
| `validate` | Validate source file |
| `screenshot` | Take slide screenshots |

---

## convert

Converts a source file to Marp Markdown.

### Syntax

```bash
slide-gen convert <input> [options]
```

### Options

| Option | Short | Description | Default |
|--------|-------|-------------|---------|
| `--output <path>` | `-o` | Output file path | `<input>.md` |
| `--config <path>` | `-c` | Configuration file path | `config.yaml` |
| `--theme <name>` | `-t` | Theme name | `default` |
| `--no-references` | | Disable reference processing | |
| `--format <fmt>` | `-f` | Output format (md/pdf/html/pptx) | `md` |

### Examples

```bash
# Basic conversion
slide-gen convert presentation.yaml

# Specify output destination
slide-gen convert presentation.yaml -o output/slides.md

# PDF output (Marp CLI integration)
slide-gen convert presentation.yaml -f pdf -o slides.pdf

# Specify theme
slide-gen convert presentation.yaml -t academic

# Disable references
slide-gen convert presentation.yaml --no-references
```

### Output

```
Converting presentation.yaml...
  ✓ Parsed 8 slides
  ✓ Resolved 5 references
  ✓ Processed icons
  ✓ Applied templates
  ✓ Generated output

Output: presentation.md
```

---

## preview

Displays a preview in the browser (Marp CLI integration).

### Syntax

```bash
slide-gen preview <input> [options]
```

### Options

| Option | Short | Description | Default |
|--------|-------|-------------|---------|
| `--port <number>` | `-p` | Preview server port | `8080` |
| `--watch` | `-w` | Watch for file changes | `false` |
| `--gallery` | `-g` | Display in thumbnail gallery mode | `false` |
| `--slide <number>` | `-s` | Display only specific slide | All slides |

### Examples

```bash
# Preview
slide-gen preview presentation.yaml

# Specify port + watch mode
slide-gen preview presentation.yaml -p 3000 -w

# Gallery mode (thumbnail list)
slide-gen preview presentation.yaml --gallery

# Specific slide only
slide-gen preview presentation.yaml --slide 3
```

### Gallery Mode

When the `--gallery` option is specified, a thumbnail list of all slides is displayed in the browser. Click on any thumbnail to view that slide enlarged.

---

## watch

Watches files and automatically converts on changes.

### Syntax

```bash
slide-gen watch <input> [options]
```

### Options

| Option | Short | Description | Default |
|--------|-------|-------------|---------|
| `--output <path>` | `-o` | Output file path | `<input>.md` |
| `--debounce <ms>` | | Change detection delay | `300` |

### Examples

```bash
slide-gen watch presentation.yaml -o output/slides.md
```

### Output

```
Watching presentation.yaml...
[12:34:56] Changed: presentation.yaml
[12:34:56] Converting...
[12:34:57] ✓ Output: output/slides.md
```

---

## templates

Lists and retrieves information about templates.

### Subcommands

#### list

```bash
slide-gen templates list [options]
```

| Option | Description |
|--------|-------------|
| `--category <cat>` | Filter by category |
| `--format <fmt>` | Output format (table/json/llm) |

```bash
# List all templates
slide-gen templates list

# Filter by category
slide-gen templates list --category diagrams

# AI-friendly format
slide-gen templates list --format llm
```

Output example:

```
Templates:

basic/
  title           Title slide
  section         Section divider
  bullet-list     Bullet list
  numbered-list   Numbered list

diagrams/
  cycle-diagram   Cycle diagram (3-6 elements)
  flow-chart      Flow chart
  hierarchy       Hierarchy/organization chart
  matrix          2x2 matrix
  timeline        Timeline
  ...
```

#### info

```bash
slide-gen templates info <name> [options]
```

| Option | Description |
|--------|-------------|
| `--format <fmt>` | Output format (text/json/llm) |

```bash
# Template details
slide-gen templates info cycle-diagram

# AI-friendly format (usable in prompts)
slide-gen templates info cycle-diagram --format llm
```

Output example:

```
Template: cycle-diagram
Description: Cycle diagram (supports 3-6 elements)
Category: diagrams

Schema:
  title (string, required)
    Slide title

  nodes (array[3-6], required)
    Cycle diagram nodes
    - label (string, required): Node label
    - icon (string, optional): Icon reference
    - color (string, optional): Node color (#RRGGBB)
    - description (string, optional): Description text

Example:
  - template: cycle-diagram
    content:
      title: "PDCA Cycle"
      nodes:
        - { label: "Plan", icon: "planning", color: "#4CAF50" }
        - { label: "Do", icon: "action", color: "#2196F3" }
        - { label: "Check", icon: "analysis", color: "#FF9800" }
        - { label: "Act", icon: "improvement", color: "#9C27B0" }
```

#### example

```bash
slide-gen templates example <name>
```

Outputs sample YAML for the template.

```bash
slide-gen templates example cycle-diagram > sample-cycle.yaml
```

#### preview

Displays a visual preview of the template in the browser.

```bash
slide-gen templates preview <name> [options]
```

| Option | Description |
|--------|-------------|
| `--all` | Display all templates |
| `--category <cat>` | Filter by category |

```bash
# Preview specific template
slide-gen templates preview cycle-diagram

# All templates list
slide-gen templates preview --all

# Filter by category
slide-gen templates preview --category diagrams
```

Displays slide images generated with sample data along with template description and parameter information in the browser.

---

## icons

Searches and previews icons.

### Subcommands

#### list

```bash
slide-gen icons list [options]
```

| Option | Description |
|--------|-------------|
| `--source <name>` | Filter by source |
| `--aliases` | Show only aliases |

```bash
# List all icon sources
slide-gen icons list

# List aliases
slide-gen icons list --aliases

# Icons from specific source
slide-gen icons list --source custom
```

#### search

```bash
slide-gen icons search <query>
```

```bash
slide-gen icons search "arrow"
```

Output example:

```
Search results for "arrow":

Aliases:
  improvement → mi:trending_up

Material Icons (mi:):
  mi:arrow_back
  mi:arrow_forward
  mi:arrow_upward
  mi:arrow_downward
  mi:trending_up

Heroicons (hero:):
  hero:arrow-left
  hero:arrow-right
  hero:arrow-up
  hero:arrow-down
```

#### preview

```bash
slide-gen icons preview <name> [options]
```

| Option | Description |
|--------|-------------|
| `--format <fmt>` | Output format (svg/html) |
| `--size <size>` | Size |
| `--color <color>` | Color |

```bash
# SVG output
slide-gen icons preview planning > icon.svg

# HTML output
slide-gen icons preview mi:home --format html

# With options
slide-gen icons preview planning --size 48px --color "#FF5722"
```

---

## init

Initializes a new project.

### Syntax

```bash
slide-gen init [directory] [options]
```

### Options

| Option | Description |
|--------|-------------|
| `--template <name>` | Initial template |
| `--no-examples` | Do not create sample files |
| `--no-ai-config` | Do not create AI configuration files |
| `--skip-marp-install` | Skip Marp CLI installation prompt |

### Examples

```bash
# Initialize in current directory
slide-gen init

# Initialize in specified directory
slide-gen init my-presentation

# Initialize without samples
slide-gen init --no-examples

# For CI environments (non-interactive)
slide-gen init my-presentation --skip-marp-install
```

### Generated Files

```
my-presentation/
├── config.yaml          # Configuration file
├── presentation.yaml    # Sample source
├── CLAUDE.md            # Claude Code guide
├── AGENT.md             # Generic AI Agent guide
├── .cursorrules         # Cursor settings
├── .claude/
│   ├── commands/        # Slash Commands
│   └── skills/          # Auto-detection Skills
├── themes/
│   └── custom.css       # Custom theme
└── icons/
    └── custom/          # Custom icons directory
```

### Marp CLI Installation Prompt

After initialization, if Marp CLI is not installed, an installation prompt is shown:

```
─────────────────────────────────────────────
Marp CLI is recommended for full features:
  • Preview slides in browser
  • Take screenshots for AI review
  • Export to PDF/HTML/PPTX

Marp CLI is not currently installed.
─────────────────────────────────────────────

? Install Marp CLI now? (Y/n)
```

Selecting `Y` will automatically install using the detected package manager (npm/pnpm/yarn).

---

## validate

Validates a source file (without converting).

### Syntax

```bash
slide-gen validate <input> [options]
```

### Options

| Option | Description |
|--------|-------------|
| `--strict` | Treat warnings as errors |
| `--format <fmt>` | Output format (text/json) |

### Examples

```bash
slide-gen validate presentation.yaml
```

### Output Example (Success)

```
Validating presentation.yaml...

✓ YAML syntax valid
✓ Meta section valid
✓ 8 slides validated
✓ All templates found
✓ All icons resolved
✓ 5 references found

Validation passed!
```

### Output Example (Error)

```
Validating presentation.yaml...

✓ YAML syntax valid
✓ Meta section valid
✗ Slide 3 (cycle-diagram): nodes must have at least 3 items
⚠ Slide 5: Unknown icon 'custom:missing'
⚠ Reference not found: @unknown2024

Validation failed with 1 error and 2 warnings
```

---

## screenshot

Takes screenshots of slides (Marp CLI integration).

### Syntax

```bash
slide-gen screenshot <input> [options]
```

### Options

| Option | Short | Description | Default |
|--------|-------|-------------|---------|
| `--output <path>` | `-o` | Output directory | `./screenshots` |
| `--slide <number>` | `-s` | Specific slide only (1-based) | All slides |
| `--width <pixels>` | `-w` | Image width | `1280` |
| `--format <fmt>` | `-f` | Image format (png/jpeg) | `png` |

### Examples

```bash
# Screenshots of all slides
slide-gen screenshot presentation.yaml

# Specify output destination
slide-gen screenshot presentation.yaml -o ./images

# Specific slide only
slide-gen screenshot presentation.yaml --slide 3

# Thumbnail size
slide-gen screenshot presentation.yaml --width 400
```

### Output

```
screenshots/
├── slide-001.png
├── slide-002.png
├── slide-003.png
└── ...
```

### Notes

- Marp CLI is required (`npm install -g @marp-team/marp-cli`)
- Internally uses `marp --images` option

---

## Global Options

Options available for all commands:

| Option | Short | Description |
|--------|-------|-------------|
| `--help` | `-h` | Display help |
| `--version` | `-V` | Display version |
| `--verbose` | `-v` | Verbose output |
| `--quiet` | `-q` | Suppress output |
| `--no-color` | | Disable color output |

---

## Configuration File

### Search Order

1. Path specified with `--config` option
2. `config.yaml` in current directory
3. `slide-gen.yaml` in current directory
4. `~/.slide-gen/config.yaml` in home directory
5. Default settings

### Configuration File Example

```yaml
# config.yaml

templates:
  builtin: "./templates"      # Built-in templates
  custom: "./my-templates"    # Custom templates

icons:
  registry: "./icons/registry.yaml"
  cache:
    enabled: true
    directory: ".cache/icons"
    ttl: 86400

references:
  enabled: true
  connection:
    type: cli
    command: "ref"
  format:
    locale: "ja-JP"

output:
  theme: "default"
  inline_styles: false
```

---

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | General error |
| 2 | Argument/option error |
| 3 | File read error |
| 4 | Validation error |
| 5 | Conversion error |
| 6 | reference-manager integration error |

---

## Usage Scenarios

### Basic Conversion Workflow

```bash
# 1. Initialize project
slide-gen init my-presentation
cd my-presentation

# 2. Edit source file
vim presentation.yaml

# 3. Validate
slide-gen validate presentation.yaml

# 4. Convert
slide-gen convert presentation.yaml -o slides.md

# 5. Preview
slide-gen preview slides.md
```

### Development with Watch Mode

```bash
# Terminal 1: Watch mode
slide-gen watch presentation.yaml -o slides.md

# Terminal 2: Preview
marp --preview slides.md
```

### Getting Template Information for AI Integration

```bash
# Provide available templates list to AI
slide-gen templates list --format llm

# Provide specific template details to AI
slide-gen templates info cycle-diagram --format llm
```

### Batch Conversion (for CI/CD)

```bash
# Convert multiple files
for f in presentations/*.yaml; do
  slide-gen convert "$f" -f pdf -o "output/$(basename "$f" .yaml).pdf"
done
```
