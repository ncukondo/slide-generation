# Icon and Pictogram Management Specification

## Overview

This system provides a unified mechanism for managing multiple icon sources, making it easy to reference and use icons within slides.

## Types of Icon Sources

| Source Type | Description | Example |
|-------------|-------------|---------|
| `web-font` | Web font-based icons | Material Icons, Font Awesome |
| `svg-sprite` | SVG sprite sheets | Heroicons, Feather Icons |
| `svg-inline` | Inline SVG (CDN) | Iconify, Health Icons |
| `local-svg` | Local SVG files | Custom icons |

### Available Icon Sources

| Source | Prefix | Features | Use Cases |
|--------|--------|----------|-----------|
| Material Icons | `mi:` | Google official, versatile | General UI/Business |
| Material Symbols | `ms:` | Google's new version, multiple variations | Modern design |
| Health Icons | `health:` | Healthcare-focused, open source | Medical/Health-related |
| Heroicons | `hero:` | Hand-drawn style, beautiful | Web design |
| Iconify | `iconify:` | 100+ sets integrated | Any purpose |
| Custom | `custom:` | Local SVG | Organization-specific icons |

## Icon Registry

Icon configuration is managed in `icons/registry.yaml`:

```yaml
# icons/registry.yaml

# Icon source definitions
sources:
  # Material Icons (Web font)
  - name: material-icons
    type: web-font
    url: "https://fonts.googleapis.com/icon?family=Material+Icons"
    prefix: "mi"
    render: |
      <span class="material-icons" style="{{ style }}">{{ name }}</span>

  # Heroicons (SVG CDN)
  - name: heroicons
    type: svg-inline
    url: "https://unpkg.com/heroicons@2.0.0/24/outline/{name}.svg"
    prefix: "hero"

  # Iconify (Universal SVG CDN)
  - name: iconify
    type: svg-inline
    url: "https://api.iconify.design/{set}/{name}.svg"
    prefix: "iconify"

  # Custom icons (Local)
  - name: custom
    type: local-svg
    path: "./icons/custom/"
    prefix: "custom"

# Alias definitions (semantic names -> actual icons)
aliases:
  # Actions
  planning: "mi:event_note"
  action: "mi:play_arrow"
  analysis: "mi:analytics"
  improvement: "mi:trending_up"

  # Status
  success: "mi:check_circle"
  warning: "mi:warning"
  error: "mi:error"
  info: "mi:info"

  # Objects
  document: "mi:description"
  folder: "mi:folder"
  database: "mi:storage"
  settings: "mi:settings"

  # Custom
  logo: "custom:company-logo"

# Color palette
colors:
  primary: "#1976D2"
  secondary: "#424242"
  accent: "#FF4081"
  success: "#4CAF50"
  warning: "#FF9800"
  danger: "#F44336"
  info: "#2196F3"

# Default settings
defaults:
  size: "24px"
  color: "currentColor"
```

## Icon Reference Methods

### Referencing in Source Files

```yaml
# Via alias (recommended)
icon: planning

# Direct specification (prefix:icon-name)
icon: mi:home
icon: hero:arrow-right
icon: iconify:mdi:account
icon: custom:my-icon

# With options
icon:
  name: planning
  size: 32px
  color: "#FF5722"
```

### Referencing in Templates

```nunjucks
{# Basic usage #}
{{ icons.render("planning") }}

{# With options #}
{{ icons.render("mi:home", { size: "32px", color: "#333" }) }}

{# Conditional #}
{% if node.icon %}
  {{ icons.render(node.icon, { color: node.color }) }}
{% endif %}
```

## Icon Resolution Flow

```
1. Parse icon reference
   "planning" -> Search aliases -> "mi:event_note"
   "mi:home" -> Direct resolution

2. Identify source from prefix
   "mi:" -> material-icons source

3. Render according to source type
   - web-font: <span class="...">name</span>
   - svg-inline: Fetch SVG and inline it
   - local-svg: Read file and inline it

4. Apply options (size, color, etc.)

5. Output HTML
```

## Output Formats

### Web Font Output

```html
<span class="material-icons" style="font-size: 24px; color: #4CAF50;">
  event_note
</span>
```

### SVG Inline Output

```html
<svg class="icon icon-planning" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
  <path d="..."/>
</svg>
```

## Adding Custom Icons

### 1. Place SVG Files

```
icons/
└── custom/
    ├── company-logo.svg
    ├── custom-chart.svg
    └── special-icon.svg
```

### 2. SVG Requirements

- Must have a viewBox attribute
- Should not have fixed width/height (or they will be overwritten during rendering)
- Recommended to use fill="currentColor" for color control

```svg
<!-- icons/custom/company-logo.svg -->
<svg viewBox="0 0 24 24" fill="currentColor">
  <path d="M12 2L2 7l10 5 10-5-10-5z"/>
  <path d="M2 17l10 5 10-5"/>
</svg>
```

### 3. Register Alias (Optional)

```yaml
# icons/registry.yaml
aliases:
  logo: "custom:company-logo"
```

### 4. Usage

```yaml
- template: title
  content:
    title: "Presentation"
    icon: logo  # or custom:company-logo
```

## Icon Caching

External SVGs are fetched and cached at build time:

```yaml
# config.yaml
icons:
  cache:
    enabled: true
    directory: ".cache/icons"
    ttl: 86400  # 24 hours (in seconds)
```

## Icon Search and Preview

Icons can be searched and previewed via CLI:

```bash
# List aliases
slide-gen icons list

# Keyword search
slide-gen icons search "arrow"

# List icons from a specific source
slide-gen icons list --source mi

# Preview icon (SVG output)
slide-gen icons preview planning

# Preview icon (HTML output)
slide-gen icons preview mi:home --format html
```

## Output Example

```bash
$ slide-gen icons search "check"

Aliases:
  success -> mi:check_circle

Material Icons (mi:):
  mi:check
  mi:check_box
  mi:check_circle
  mi:check_circle_outline

Heroicons (hero:):
  hero:check
  hero:check-circle
  hero:check-badge
```

---

## External Icon Search

Searches for icons from external sources (Iconify API) that are not yet registered in the local registry.

### Command Syntax

```bash
slide-gen icons search-external <query> [options]
```

### Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `query` | Yes | Search keyword (e.g., "heart", "stethoscope", "arrow") |

### Options

| Option | Short | Default | Description |
|--------|-------|---------|-------------|
| `--limit <n>` | `-l` | 20 | Maximum number of results to return |
| `--set <name>` | `-s` | (all) | Filter by icon set (e.g., `mdi`, `healthicons`, `heroicons`) |
| `--style <style>` | | (all) | Filter by style: `outline`, `solid`, `fill`, `line` |
| `--format <fmt>` | `-f` | `table` | Output format: `table`, `json`, `llm` |
| `--prefixes` | `-p` | false | Show only unique icon set prefixes |

### Iconify API Integration

The command uses the [Iconify API](https://iconify.design/docs/api/) for searching:

```
GET https://api.iconify.design/search?query=<query>&limit=<limit>
```

#### Response Processing

The API returns:
```json
{
  "icons": ["mdi:heart", "mdi:heart-outline", "healthicons:heart", ...],
  "total": 150,
  "limit": 20,
  "start": 0
}
```

### Output Formats

#### Table Format (default)

```bash
$ slide-gen icons search-external "stethoscope"

External Icon Search: "stethoscope"
Found 12 icons from 5 sets

  Icon Reference                    Set                 Style
  ─────────────────────────────────────────────────────────────
  healthicons:stethoscope           Health Icons        solid
  mdi:stethoscope                   Material Design     solid
  fa6-solid:stethoscope             Font Awesome 6      solid
  iconoir:stethoscope               Iconoir             outline
  tabler:stethoscope                Tabler Icons        outline
  ph:stethoscope                    Phosphor            regular
  ph:stethoscope-bold               Phosphor            bold
  ph:stethoscope-fill               Phosphor            fill
  ...

To add an icon: slide-gen icons add <alias> --from <reference>
```

#### JSON Format

```bash
$ slide-gen icons search-external "stethoscope" --format json
```

```json
{
  "query": "stethoscope",
  "total": 12,
  "icons": [
    {
      "reference": "healthicons:stethoscope",
      "set": "healthicons",
      "setName": "Health Icons",
      "name": "stethoscope",
      "style": "solid"
    },
    {
      "reference": "mdi:stethoscope",
      "set": "mdi",
      "setName": "Material Design Icons",
      "name": "stethoscope",
      "style": "solid"
    }
  ]
}
```

#### LLM Format

Optimized for AI agent consumption:

```bash
$ slide-gen icons search-external "stethoscope" --format llm
```

```yaml
# External Icon Search Results
# Query: stethoscope
# Total: 12 icons found

# Recommended icons by category:

## Medical/Healthcare (recommended for medical presentations)
- healthicons:stethoscope  # Health Icons - designed for healthcare

## General Purpose
- mdi:stethoscope          # Material Design Icons - widely compatible
- fa6-solid:stethoscope    # Font Awesome - popular choice

## Outline Style
- iconoir:stethoscope      # Iconoir - minimal outline
- tabler:stethoscope       # Tabler - consistent stroke width

# Usage:
# slide-gen icons add stethoscope --from "healthicons:stethoscope"
```

### Filtering by Icon Set

```bash
# Search only in Health Icons
$ slide-gen icons search-external "heart" --set healthicons

# Search only in Material Design Icons
$ slide-gen icons search-external "arrow" --set mdi

# Search in multiple sets
$ slide-gen icons search-external "check" --set mdi --set heroicons
```

### Available Icon Sets

Major icon sets available through Iconify:

| Set Prefix | Name | Icons | Best For |
|------------|------|-------|----------|
| `healthicons` | Health Icons | 1000+ | Medical, healthcare |
| `mdi` | Material Design Icons | 7000+ | General purpose |
| `heroicons` | Heroicons | 450+ | Web UI, minimal |
| `fa6-solid` | Font Awesome 6 | 2000+ | General purpose |
| `fa6-regular` | Font Awesome 6 Regular | 150+ | Outline style |
| `tabler` | Tabler Icons | 4000+ | Consistent line icons |
| `ph` | Phosphor | 6000+ | Multiple weights |
| `lucide` | Lucide | 1000+ | Feather-based |
| `iconoir` | Iconoir | 1300+ | Minimal outline |
| `ri` | Remix Icon | 2400+ | Versatile |
| `carbon` | Carbon Icons | 2000+ | IBM design system |
| `fluent` | Fluent UI | 4000+ | Microsoft design |

### List Available Sets

```bash
# Show all available icon sets with counts
$ slide-gen icons search-external --prefixes

Available Icon Sets (via Iconify):

  Prefix          Name                    Icons   Description
  ───────────────────────────────────────────────────────────────
  healthicons     Health Icons            1000+   Medical & healthcare
  mdi             Material Design Icons   7000+   Google Material Design
  heroicons       Heroicons               450+    Tailwind CSS team
  fa6-solid       Font Awesome 6 Solid    2000+   Popular icon library
  tabler          Tabler Icons            4000+   Consistent stroke icons
  ph              Phosphor                6000+   Flexible icon family
  ...
```

### Preview Before Adding

```bash
# Preview an external icon (fetches and displays)
$ slide-gen icons preview "iconify:healthicons:stethoscope" --format html > preview.html

# Or open directly in browser (if supported)
$ slide-gen icons preview "iconify:healthicons:stethoscope" --open
```

### Complete Workflow Example

```bash
# 1. Search for icons
$ slide-gen icons search-external "electrocardiogram" --format table

External Icon Search: "electrocardiogram"
Found 3 icons from 2 sets

  Icon Reference                    Set                 Style
  ─────────────────────────────────────────────────────────────
  healthicons:electrocardiogram     Health Icons        solid
  mdi:heart-pulse                   Material Design     solid
  medical-icon:ecg                  Medical Icons       outline

# 2. Preview the best candidate
$ slide-gen icons preview "iconify:healthicons:electrocardiogram"

# 3. Add to registry with a semantic alias
$ slide-gen icons add ecg --from "iconify:healthicons:electrocardiogram"

Added alias: ecg -> fetched:healthicons/electrocardiogram
SVG saved to: icons/fetched/healthicons/electrocardiogram.svg

# 4. Use in presentation
# presentation.yaml
slides:
  - template: content
    content:
      title: "Heart Monitoring"
      icon: ecg  # Uses the newly added alias
```

### Error Handling

```bash
# Network error
$ slide-gen icons search-external "heart"
Error: Failed to connect to Iconify API. Check your network connection.

# No results
$ slide-gen icons search-external "xyznonexistent"
No icons found for "xyznonexistent".

Suggestions:
- Try different keywords
- Check spelling
- Use broader terms (e.g., "medical" instead of "otolaryngology")

# Rate limiting
$ slide-gen icons search-external "icon" --limit 1000
Warning: API rate limit reached. Showing first 100 results.
```

### Caching

External search results are cached to reduce API calls:

```yaml
# config.yaml
icons:
  external_search:
    cache:
      enabled: true
      directory: ".cache/icon-search"
      ttl: 3600  # 1 hour in seconds
```

---

## Integration with Marp Output

Icons are embedded as HTML within Marp Markdown:

```markdown
---
<!-- _class: cycle-slide -->

# PDCA Cycle

<div class="cycle-container">
  <div class="cycle-node" style="--node-color: #4CAF50;">
    <span class="material-icons">event_note</span>
    <span class="node-label">Plan</span>
  </div>
  <!-- ... -->
</div>
```

Required CSS and font loading should be included in the theme file or specified in Marp's frontmatter:

```yaml
# Auto-generated frontmatter
---
marp: true
theme: custom-theme
style: |
  @import url('https://fonts.googleapis.com/icon?family=Material+Icons');
---
```

---

## AI Collaboration Workflow

AI assistants analyze presentation scenarios and select/suggest appropriate icons.

### Basic Principles

1. **Scenario-driven**: Select icons based on content meaning
2. **Prefer aliases**: Use semantic names (`planning`) rather than direct specification (`mi:event_note`)
3. **Maintain consistency**: Use the same icon for the same concept within a presentation
4. **Auto-supplement**: Automatically fetch missing icons from external sources

### Phase 1: Scenario Analysis and Icon Requirements Derivation

```
[AI Thought Process]

Slide content: "PDCA Cycle Explanation"
  -> Required icons:
     - Plan -> planning alias
     - Do -> action alias
     - Check -> analysis alias
     - Act -> improvement alias

Slide content: "Patient Care Flow"
  -> Medical icons needed
     - Reception -> clinic
     - Examination -> stethoscope
     - Testing -> lab
     - Prescription -> prescription
```

### Phase 2: Icon Search and Selection

AI searches for icons in the following order:

```
1. Local alias search (fastest)
   slide-gen icons list --aliases --format llm
   -> Select optimal from registered aliases

2. Local registry search
   slide-gen icons search "diagnosis" --format llm
   -> Search registered sources by keyword

3. External source search (when not found locally)
   slide-gen icons search-external "electrocardiogram" --format llm
   -> Search Iconify API for icons across 100+ icon sets
   -> Recommended for medical: --set healthicons
   -> Recommended for general: --set mdi
```

### Phase 3: Missing Icon Detection and Auto-supplement

```
[Auto-supplement Flow]

1. AI identifies desired icon
   Example: Need an "electrocardiogram" icon

2. Search local aliases
   slide-gen icons search "ecg"
   -> Not found in local registry

3. Search external sources via Iconify API
   slide-gen icons search-external "ecg" --format llm

   Output:
   # External Icon Search Results
   # Query: ecg
   # Total: 5 icons found

   ## Medical/Healthcare (recommended)
   - healthicons:electrocardiogram  # Health Icons
   - healthicons:ecg                # Health Icons (alternative)

   ## General Purpose
   - mdi:heart-pulse                # Material Design Icons

4. AI analyzes results and selects optimal icon
   - For medical presentations -> healthicons:electrocardiogram
   - For general presentations -> mdi:heart-pulse

5. Propose alias registration to user
   "Found 'healthicons:electrocardiogram' for ECG monitoring.
    Would you like me to register it as alias 'ecg'?"

6. After user approval, execute:
   slide-gen icons add ecg --from "healthicons:electrocardiogram"

   Result:
   - SVG saved to icons/fetched/healthicons/electrocardiogram.svg
   - Alias added to registry.yaml: ecg -> fetched:healthicons/electrocardiogram
```

### Phase 4: Integration into Slides

```yaml
# presentation.yaml
slides:
  - template: cycle-diagram
    content:
      title: "Medical Care Process"
      nodes:
        - { label: "Reception", icon: "clinic", color: "#4CAF50" }
        - { label: "Examination", icon: "stethoscope", color: "#2196F3" }
        - { label: "Testing", icon: "lab", color: "#FF9800" }
        - { label: "Prescription", icon: "prescription", color: "#9C27B0" }
```

---

## Auto-supplement Feature

### icons add Command

Fetches missing icons from external sources and registers them in the registry.

```bash
# Register as alias
slide-gen icons add ecg --from "health:electrocardiogram"

# Search and select
slide-gen icons add ecg --search

# Save as custom SVG
slide-gen icons add ecg --from "health:electrocardiogram" --save-local
```

### icons sync Command

Analyzes icons used in presentation.yaml and detects missing ones.

```bash
slide-gen icons sync presentation.yaml
```

Output:
```
Analyzing presentation.yaml...

Used icons:
  ✓ planning (alias -> mi:event_note)
  ✓ action (alias -> mi:play_arrow)
  ✓ stethoscope (alias -> health:stethoscope)
  ✗ mri-scan (not found)
  ✗ rehabilitation (not found)

Missing icons (2):
  - mri-scan: Did you mean 'mri' (health:mri)?
  - rehabilitation: Suggestions from Health Icons:
      health:exercise
      health:physical-therapy
      health:crutches

Run 'slide-gen icons add <alias> --from <icon>' to register.
```

### Auto-supplement Configuration

```yaml
# config.yaml
icons:
  auto_fetch:
    enabled: true              # Enable auto-fetch
    sources:                   # Search target sources (priority order)
      - healthicons            # For medical presentations
      - material-symbols
      - iconify
    cache: true                # Cache fetched SVGs
    suggest_aliases: true      # Suggest alias registration
```

---

## Theme Integration

### Automatic Theme Color Application

Icon colors can be automatically inherited from the theme.

```yaml
# themes/medical.yaml
colors:
  primary: "#0277BD"
  secondary: "#00838F"
  accent: "#00BCD4"

icon_colors:
  default: "var(--theme-primary)"
  highlight: "var(--theme-accent)"
```

```yaml
# icons/registry.yaml
theme_integration:
  inherit_colors: true
  color_mapping:
    "--theme-primary": "primary"
    "--theme-secondary": "secondary"
    "--theme-accent": "accent"
```

### Usage in Slides

```yaml
# Using theme colors (recommended)
- template: cycle-diagram
  content:
    nodes:
      - { label: "Plan", icon: "planning" }  # Uses theme's primary color

# Explicitly specifying colors
- template: cycle-diagram
  content:
    nodes:
      - { label: "Plan", icon: "planning", color: "primary" }    # Palette reference
      - { label: "Do", icon: "action", color: "#FF5722" }        # Direct specification
      - { label: "Check", icon: "analysis", color: "accent" }    # Palette reference
```

### Color Resolution at Output

```html
<!-- When using theme colors -->
<span class="material-icons" style="color: var(--theme-primary);">
  event_note
</span>

<!-- When using palette reference -->
<span class="material-icons" style="color: #4CAF50;">
  play_arrow
</span>
```

---

## AI Workflow Integration

### Scenario Example: Creating a Medical Presentation

```
User: "I want to create a slide explaining the patient care flow"

AI Agent:
1. Scenario Analysis
   "This is medical content. I'll select icons primarily from Health Icons."

2. Local Alias Search
   slide-gen icons list --aliases --category medical --format llm
   -> Get list of registered medical aliases
   -> Found: clinic, stethoscope, lab, medicine
   -> Missing: rehabilitation

3. External Icon Search (for missing icons)
   slide-gen icons search-external "rehabilitation" --set healthicons --format llm

   Output:
   # External Icon Search Results
   # Query: rehabilitation
   # Total: 4 icons found

   ## Medical/Healthcare (recommended)
   - healthicons:physical-therapy     # Physical therapy
   - healthicons:exercise-walk        # Walking exercise
   - healthicons:crutches             # Crutches
   - healthicons:physiotherapist      # Physiotherapist

4. Icon Selection and Proposal
   "Found several options for 'rehabilitation'. I recommend:
    - healthicons:physical-therapy for general rehabilitation
    Would you like me to register it?"

5. User Approval and Registration
   slide-gen icons add rehabilitation --from "healthicons:physical-therapy"

   Result:
   Added alias: rehabilitation -> fetched:healthicons/physical-therapy
   SVG saved to: icons/fetched/healthicons/physical-therapy.svg

6. Slide Generation
   Add the following to presentation.yaml:
   ```yaml
   - template: flow-chart
     content:
       title: "Care Flow"
       steps:
         - { label: "Reception", icon: "clinic" }
         - { label: "Examination", icon: "stethoscope" }
         - { label: "Testing", icon: "lab" }
         - { label: "Treatment", icon: "medicine" }
         - { label: "Rehabilitation", icon: "rehabilitation" }
   ```

7. Theme Color Application
   "Applied the medical theme 'medical'.
    Icons will be unified with blue-green colors."
```

### Scenario Example: Finding Specialized Icons

```
User: "Add an icon for MRI scan to the diagnostic flow"

AI Agent:
1. Search local registry first
   slide-gen icons search "mri"
   -> No results found

2. Search external sources
   slide-gen icons search-external "mri" --format llm

   Output:
   # External Icon Search Results
   # Query: mri
   # Total: 3 icons found

   ## Medical/Healthcare (recommended)
   - healthicons:mri                  # MRI machine icon
   - healthicons:radiology            # General radiology

   ## General Purpose
   - mdi:brain                        # Brain (related concept)

3. Recommend best match
   "For MRI specifically, I recommend 'healthicons:mri'.
    This icon clearly represents an MRI scanner."

4. Add with semantic alias
   slide-gen icons add mri-scan --from "healthicons:mri"

5. Use in presentation
   icon: mri-scan
```

---

## Alias Categories

Aliases are organized by category. AI selects from appropriate categories based on the scenario.

| Category | Examples | Use Cases |
|----------|----------|-----------|
| Actions | planning, action, save, edit | Operations/Processes |
| Status | success, warning, error, pending | State display |
| Objects | document, folder, database | Things/Concepts |
| Navigation | home, back, forward, menu | Movement/UI |
| Communication | email, phone, chat, notification | Contact/Notifications |
| People/Organizations | person, team, organization | People/Organizations |
| Business | workflow, target, kpi, report | Operations/Metrics |
| Education | education, learning, certificate | Learning/Training |
| Medical | medical, doctor, diagnosis, medicine | Medical/Health |

```bash
# List by category
slide-gen icons list --category medical
slide-gen icons list --category business
```

---

## Best Practices

### For AI Assistants

1. **Prefer using aliases**
   - Use `planning` (recommended)
   - Avoid `mi:event_note` (less preferred)

2. **Select appropriate sources for the scenario**
   - Medical -> Health Icons
   - General business -> Material Icons/Symbols
   - Web design -> Heroicons

3. **Suggest supplements when missing**
   - Present candidates via auto-search
   - Register only after user approval

4. **Consistency with theme**
   - Utilize theme colors
   - Maintain uniformity within the same presentation

### For Users

1. **Adding custom icons**
   - Place SVGs in `icons/custom/`
   - Use `fill="currentColor"` for color control

2. **Utilizing aliases**
   - Reference by semantic names
   - Centrally manage in registry.yaml

3. **Utilizing theme colors**
   - Prefer `color: "primary"` over direct color specification
   - Automatically follows theme changes
