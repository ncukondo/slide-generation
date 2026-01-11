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
1. Alias search
   slide-gen icons list --format llm
   -> Select optimal from registered aliases

2. Source search
   slide-gen icons search "diagnosis" --format llm
   -> Search each source by keyword

3. External source search (when missing)
   slide-gen icons search "electrocardiogram" --source health
   -> Search specific sources like Health Icons
```

### Phase 3: Missing Icon Detection and Auto-supplement

```
[Auto-supplement Flow]

1. AI identifies desired icon
   Example: Need an "electrocardiogram" icon

2. Search aliases -> Not found

3. Search external sources
   slide-gen icons search "ecg" --all-sources

4. Candidates found
   - health:electrocardiogram (Health Icons)
   - ms:ecg (Material Symbols)
   - iconify:mdi:heart-pulse (Iconify/MDI)

5. Select optimal and propose alias
   "I suggest registering 'ecg' alias as health:electrocardiogram."

6. After user approval, add to registry.yaml
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

2. Alias Search
   slide-gen icons list --category medical --format llm
   -> Get list of medical aliases

3. Missing Icon Detection
   "The 'rehabilitation' icon is not registered.
    I'll search for candidates from Health Icons."

   slide-gen icons search "rehabilitation" --source health
   -> Found health:physical-therapy

4. Alias Registration Proposal
   "Would you like to register 'rehabilitation' as health:physical-therapy?"

5. User Approval
   -> Add to registry.yaml

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
