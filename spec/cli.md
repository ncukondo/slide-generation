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

#### screenshot

Takes screenshots of templates and saves as image files.

```bash
slide-gen templates screenshot [name] [options]
```

| Option | Short | Description | Default |
|--------|-------|-------------|---------|
| `--all` | `-a` | Screenshot all templates | |
| `--category <cat>` | | Filter by category | |
| `--output <path>` | `-o` | Output directory | `./template-screenshots` |
| `--format <fmt>` | `-f` | Output format (png/jpeg/ai) | `png` |
| `--width <pixels>` | `-w` | Image width | `1280` |
| `--quality <num>` | `-q` | JPEG quality (1-100) | `80` |
| `--contact-sheet` | | Generate contact sheet | `false` |
| `--columns <num>` | | Contact sheet columns | `3` |

##### Examples

```bash
# Screenshot a specific template
slide-gen templates screenshot cycle-diagram

# Screenshot all templates
slide-gen templates screenshot --all

# Screenshot by category
slide-gen templates screenshot --category diagrams

# AI-optimized screenshots (640px, JPEG)
slide-gen templates screenshot --all --format ai

# Generate contact sheet of all templates
slide-gen templates screenshot --all --contact-sheet

# Contact sheet with custom columns
slide-gen templates screenshot --all --contact-sheet --columns 4

# Custom output directory
slide-gen templates screenshot --all -o ./docs/template-gallery
```

##### Output Structure

```
template-screenshots/
├── cycle-diagram.png           # Individual template screenshots
├── flow-chart.png
├── hierarchy.png
├── matrix.png
├── timeline.png
├── ...
└── templates-contact.png       # Contact sheet (if --contact-sheet)
```

##### AI Optimization Mode

Use `--format ai` for token-efficient screenshots:

```bash
slide-gen templates screenshot --all --format ai
```

Output example:
```
Template screenshots saved (AI-optimized):

  template-screenshots/cycle-diagram.jpeg
  template-screenshots/flow-chart.jpeg
  template-screenshots/hierarchy.jpeg
  ...

Estimated tokens: ~2464 (8 templates)

To review in Claude Code:
  Read template-screenshots/cycle-diagram.jpeg
```

##### Contact Sheet

Generate a gallery overview of templates:

```bash
slide-gen templates screenshot --all --contact-sheet --columns 4
```

Features:
- **Template name overlay**: Each thumbnail displays the template name
- **Category grouping**: Templates organized by category in the grid
- **Automatic layout**: Rows calculated based on template count and column setting

##### Use Cases

1. **Documentation**: Generate visual catalog for documentation
2. **AI Training**: Provide visual reference for AI assistants
3. **Template Selection**: Quick visual comparison of available templates
4. **Quality Review**: Verify template rendering across all templates

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
| `--format <fmt>` | `-f` | Output format (png/jpeg/ai) | `png` |
| `--quality <num>` | `-q` | JPEG quality (1-100) | `80` |
| `--contact-sheet` | | Generate contact sheet | `false` |
| `--columns <num>` | | Contact sheet columns | `2` |

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

# AI-optimized screenshots (640px, JPEG)
slide-gen screenshot presentation.yaml --format ai

# Contact sheet for overview
slide-gen screenshot presentation.yaml --contact-sheet

# AI-optimized contact sheet
slide-gen screenshot presentation.yaml --format ai --contact-sheet
```

### Option Combinations

All options can be combined freely:

```bash
# Specific slide + AI optimization
slide-gen screenshot presentation.yaml --slide 3 --format ai

# Specific slide + contact sheet (generates single-slide contact sheet)
slide-gen screenshot presentation.yaml --slide 3 --contact-sheet

# All combinations: specific slide + AI + contact sheet
slide-gen screenshot presentation.yaml --slide 3 --format ai --contact-sheet

# Custom width + JPEG quality
slide-gen screenshot presentation.yaml --width 800 --format jpeg --quality 90

# Contact sheet with custom columns + AI optimization
slide-gen screenshot presentation.yaml --contact-sheet --columns 4 --format ai
```

### AI Optimization Mode

Use `--format ai` for token-efficient screenshots optimized for AI review:

```bash
slide-gen screenshot presentation.yaml --format ai
```

The AI format:
- Uses 640px width (75% token reduction vs 1280px default)
- Outputs JPEG format
- Shows estimated token consumption
- Provides Claude Code read commands

#### Token Estimation

Token consumption is calculated using the formula:

```
tokens = (width × height) / 750
```

For a 640×360 image (AI format): ~308 tokens per image.

Output example:
```
Screenshots saved (AI-optimized):

  screenshots/presentation.001.jpeg
  screenshots/presentation.002.jpeg
  screenshots/presentation.003.jpeg

Estimated tokens: ~924 (3 images)

To review in Claude Code:
  Read screenshots/presentation.001.jpeg
```

### Contact Sheet

Generate an overview image with all slides:

```bash
slide-gen screenshot presentation.yaml --contact-sheet --columns 3
```

Creates a grid image with slide thumbnails and numbers for quick review.

#### Contact Sheet Features

- **Slide number overlay**: Each thumbnail displays "Slide N" at the bottom
- **Automatic grid layout**: Rows are calculated based on slide count and column setting
- **Consistent sizing**: Thumbnails are resized to match the screenshot dimensions
- **Padding**: 10px padding between thumbnails
- **Background**: Light gray (#F5F5F5) canvas background

#### Contact Sheet with AI Optimization

When combined with `--format ai`, the contact sheet uses the AI-optimized image dimensions:

```bash
slide-gen screenshot presentation.yaml --contact-sheet --format ai
```

This generates smaller individual screenshots (640px) which are then composed into the contact sheet.

### Output

```
screenshots/
├── presentation.001.png
├── presentation.002.png
├── presentation.003.png
├── presentation-contact.png    # (if --contact-sheet)
└── ...
```

### Notes

- Marp CLI is required (global or local installation)
  - Global: `npm install -g @marp-team/marp-cli`
  - Local: `npm install -D @marp-team/marp-cli`
- Internally uses `marp --images` option
- `--format ai` is recommended for AI-assisted slide review
- Contact sheet is always output as PNG regardless of `--format` setting
- Temporary markdown file is automatically cleaned up after screenshot generation

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
