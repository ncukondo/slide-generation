# Image Management Specification

## Overview

This specification defines the management methods for images (photos and figures) used in slides, and the collaborative workflow between AI assistants and users.

### Design Principles

1. **Scenario-Driven**: Image specifications and review criteria are dynamically derived from the presentation scenario
2. **AI Autonomous Judgment**: AI makes context-appropriate decisions rather than following fixed rules
3. **Flexible Templates**: Default templates + ability to create custom ones
4. **Clear Collaboration Flow**: Define the request → provide → review cycle

---

## Directory Structure

```
my-presentation/
├── images/                    # Image file storage
│   ├── photos/               # User-provided photos
│   │   ├── images.yaml       # Directory-level metadata
│   │   ├── site-overview.jpg
│   │   ├── site-overview.meta.yaml  # Individual metadata (when details are needed)
│   │   └── equipment-detail.jpg
│   ├── figures/              # Figures and diagrams
│   │   ├── images.yaml
│   │   └── system-architecture.png
│   ├── charts/               # Graphs and charts
│   │   └── sales-trend.png
│   └── screenshots/          # Screenshots
│       └── app-demo.png
├── screenshots/               # Slide screenshots (for AI review)
├── presentation.yaml
└── config.yaml
```

See the "Image Metadata" section for details on metadata files.

### Specifying Image Paths

In YAML, specify using relative or absolute paths:

```yaml
# Relative path (recommended)
image: "images/photos/site-overview.jpg"

# Subdirectory can be omitted (auto-search within images/)
image: "site-overview.jpg"
```

---

## Image Templates (Default)

### layouts/image-full.yaml

Template for displaying an image in fullscreen.

```yaml
name: image-full
description: "Fullscreen image (with or without title)"
category: layouts

schema:
  type: object
  required:
    - image
  properties:
    image:
      type: string
      description: "Image file path"
    title:
      type: string
      description: "Overlay title (optional)"
    caption:
      type: string
      description: "Caption (optional)"
    position:
      type: string
      enum: [center, top, bottom, left, right]
      default: center
      description: "Image position"
    overlay:
      type: string
      enum: [none, dark, light, gradient]
      default: none
      description: "Overlay effect"

example:
  image: "images/photos/site-overview.jpg"
  title: "Project Site"
  overlay: dark

output: |
  ---
  <!-- _class: image-full-slide -->

  <div class="image-full" style="background-image: url('{{ image }}'); background-position: {{ position | default('center') }};">
    {%- if overlay != 'none' %}
    <div class="overlay overlay-{{ overlay }}"></div>
    {%- endif %}
    {%- if title %}
    <h1 class="image-title">{{ title }}</h1>
    {%- endif %}
    {%- if caption %}
    <p class="image-caption">{{ caption }}</p>
    {%- endif %}
  </div>
```

### layouts/image-text.yaml

Arranges image and text side by side or top/bottom.

```yaml
name: image-text
description: "Image and text combination layout"
category: layouts

schema:
  type: object
  required:
    - title
    - image
  properties:
    title:
      type: string
    image:
      type: string
      description: "Image file path"
    image_position:
      type: string
      enum: [left, right, top, bottom]
      default: left
    image_size:
      type: string
      enum: [small, medium, large]
      default: medium
      description: "Image size (small: 30%, medium: 50%, large: 70%)"
    text:
      type: string
      description: "Text content (Markdown supported)"
    items:
      type: array
      items:
        type: string
      description: "Bullet points (can be used instead of text)"
    caption:
      type: string

example:
  title: "Site Conditions"
  image: "images/photos/construction-site.jpg"
  image_position: left
  items:
    - "Construction is proceeding on schedule"
    - "Safety measures are thoroughly implemented"
    - "Expected completion next month"

output: |
  ---
  <!-- _class: image-text-slide layout-{{ image_position | default('left') }} size-{{ image_size | default('medium') }} -->

  # {{ title }}

  <div class="image-text-container">
    <div class="image-section">
      <img src="{{ image }}" alt="{{ caption | default(title) }}">
      {%- if caption %}
      <p class="caption">{{ caption }}</p>
      {%- endif %}
    </div>
    <div class="text-section">
      {%- if text %}
      {{ text | markdown }}
      {%- elif items %}
      <ul>
        {%- for item in items %}
        <li>{{ item }}</li>
        {%- endfor %}
      </ul>
      {%- endif %}
    </div>
  </div>
```

### layouts/image-caption.yaml

Simple combination of image and caption (description).

```yaml
name: image-caption
description: "Image with detailed caption layout"
category: layouts

schema:
  type: object
  required:
    - image
    - caption
  properties:
    title:
      type: string
    image:
      type: string
    caption:
      type: string
      description: "Image description"
    source:
      type: string
      description: "Source/credit"

example:
  title: "Experiment Results"
  image: "images/figures/experiment-result.png"
  caption: "Figure 1: Shows changes in material properties due to temperature variation. Blue line is the proposed method, red line is the conventional method."
  source: "Internal experiment data (2024)"
```

### layouts/image-grid.yaml

Grid display of multiple images.

```yaml
name: image-grid
description: "Grid layout for multiple images (2-6 images)"
category: layouts

schema:
  type: object
  required:
    - title
    - images
  properties:
    title:
      type: string
    images:
      type: array
      minItems: 2
      maxItems: 6
      items:
        type: object
        required:
          - src
        properties:
          src:
            type: string
            description: "Image path"
          caption:
            type: string
          label:
            type: string
            description: "Short label (A, B, C... or numbers)"
    layout:
      type: string
      enum: [auto, 2x1, 1x2, 2x2, 3x1, 2x3, 3x2]
      default: auto
      description: "Grid layout (auto = automatic based on image count)"

example:
  title: "Construction Process"
  images:
    - { src: "images/photos/step1.jpg", label: "1", caption: "Foundation work" }
    - { src: "images/photos/step2.jpg", label: "2", caption: "Frame installation" }
    - { src: "images/photos/step3.jpg", label: "3", caption: "Exterior work" }
    - { src: "images/photos/step4.jpg", label: "4", caption: "Completion" }
  layout: 2x2
```

### layouts/before-after.yaml

Before and after comparison.

```yaml
name: before-after
description: "Before and after comparison layout"
category: layouts

schema:
  type: object
  required:
    - title
    - before
    - after
  properties:
    title:
      type: string
    before:
      type: object
      required:
        - image
      properties:
        image:
          type: string
        label:
          type: string
          default: "Before"
        caption:
          type: string
    after:
      type: object
      required:
        - image
      properties:
        image:
          type: string
        label:
          type: string
          default: "After"
        caption:
          type: string
    layout:
      type: string
      enum: [horizontal, vertical, overlay]
      default: horizontal

example:
  title: "Renovation Results"
  before:
    image: "images/photos/before.jpg"
    caption: "Before renovation (January 2023)"
  after:
    image: "images/photos/after.jpg"
    caption: "After renovation (March 2024)"
```

---

## Creating Custom Image Templates

You can create custom templates when special image layouts are needed.

### Example: Annotated Image Template

```yaml
# templates/custom/image-annotated.yaml
name: image-annotated
description: "Annotated image (place points on image)"
category: custom

schema:
  type: object
  required:
    - title
    - image
    - annotations
  properties:
    title:
      type: string
    image:
      type: string
    annotations:
      type: array
      items:
        type: object
        required:
          - x
          - y
          - label
        properties:
          x:
            type: number
            description: "X coordinate (%)"
          y:
            type: number
            description: "Y coordinate (%)"
          label:
            type: string
          number:
            type: integer

example:
  title: "System Configuration"
  image: "images/figures/system-photo.jpg"
  annotations:
    - { x: 20, y: 30, number: 1, label: "Control unit" }
    - { x: 60, y: 50, number: 2, label: "Sensor section" }
    - { x: 80, y: 70, number: 3, label: "Power module" }

output: |
  ---
  <!-- _class: image-annotated-slide -->

  # {{ title }}

  <div class="annotated-image-container">
    <img src="{{ image }}" class="base-image">
    {%- for point in annotations %}
    <div class="annotation-point" style="left: {{ point.x }}%; top: {{ point.y }}%;">
      <span class="point-number">{{ point.number | default(loop.index) }}</span>
      <span class="point-label">{{ point.label }}</span>
    </div>
    {%- endfor %}
  </div>
```

---

## AI Collaboration Flow

### Concept

Rather than following fixed rules, AI understands the presentation scenario (purpose, target audience, message) and then:

1. **Determines required images** - What kind of images are needed for which slides
2. **Dynamically defines requirements** - Devises specifications based on the scenario
3. **Autonomously sets review criteria** - Derives what to check from context

### Phase 1: Scenario Analysis and Image Requirements Derivation

AI analyzes the presentation purpose and structure to identify required images.

```
[AI Thought Process]

Scenario Analysis:
- Presentation purpose: Sales proposal for new product
- Target audience: Executive decision-makers
- Key message: Product reliability and implementation track record

Image Requirements Derivation:
1. Slide 3 "Implementation Case Study"
   - Required image: Photo of actual implementation site
   - Intent: Visually demonstrate concrete implementation track record to appeal to reliability

2. Slide 5 "Product Appearance"
   - Required image: Product exterior photo
   - Intent: Convey product texture and size

3. Slide 7 "Before and After"
   - Required image: Comparison photos before and after implementation
   - Intent: Visually appeal to improvement effects
```

### Phase 2: Image Request Generation

AI generates specific image requests based on requirements derived from the scenario.

```
[Example Request from AI to User]

For slide creation, please prepare the following photos.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Request 1: Implementation Site Photo
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Purpose: Slide 3 "Implementation Case Study" - Company A's implementation site
Intent: Demonstrate actual implementation track record to executives to appeal to reliability

[Recommended Specifications]
- Composition: Full view showing the product in operation
- Aspect ratio: 16:9 (landscape) recommended
- Resolution: 1920x1080 or higher
- Notes:
  - Good if product logo/model number is visible
  - Including surrounding work environment conveys implementation scale
  - If company signage or other identifying information is visible,
    please confirm permission for publication

Filename: images/photos/customer-a-site.jpg
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Request 2: Product Exterior Photo
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Purpose: Slide 5 "Product Introduction"
Intent: Convey product texture and size to executives

[Recommended Specifications]
- Composition: Product alone, shot from 45-degree angle
- Background: White or solid color (to make product stand out)
- Aspect ratio: 4:3 or 1:1
- Notes:
  - Angle showing distinctive features (control panel, etc.)
  - If possible, a photo alongside a hand or common object
    for scale reference would be helpful

Filename: images/photos/product-exterior.jpg
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Phase 3: Image Review and Evaluation

After the user places images, AI evaluates them based on **review criteria derived from the scenario**.

```
[AI Review Process]

Image confirmed: images/photos/customer-a-site.jpg

Scenario-Based Review Criteria:
├─ Purpose Fit
│   ✓ Product shown in operating state
│   ✓ Composition conveys implementation scale (factory floor)
│   ✓ Professional impression persuasive to executives
│
├─ Technical Quality
│   ✓ Resolution: 2400x1350 (sufficient)
│   ✓ Brightness: Appropriate
│   ✓ Focus: Sharp
│
├─ Compliance
│   ⚠ Other company's product logo visible in background (needs confirmation)
│   ✓ No faces of people visible
│
└─ Presentation Effect
    ✓ Visually reinforces slide message "Implementation Track Record"
    ✓ Aspect ratio suitable for image-text template

[Feedback]
The photo is generally suitable for the purpose.

One point to confirm: Another company's logo (○○ Company) is visible
in the lower right of the image. Is it okay to use as-is?
- No problem → Use as-is
- Want to hide → Will suggest cropping or blur processing
```

### Phase 4: Adjustment and Iteration

```
User: "Please hide the logo in the lower right"

AI: "Understood. There are two methods:

1. Cropping (recommended)
   - Cut approximately 10% from the right side to exclude the logo
   - Main subject will be preserved

2. Blur processing
   - Apply blur only to the logo area
   - Requires processing in image editing tool

Which would you prefer?
If cropping, it can be handled automatically during slide generation."
```

---

## Image Validation Features

### Image Checking with validate Command

```bash
slide-gen validate presentation.yaml
```

Validation items:
- Existence check for referenced image files
- Image format confirmation (jpg, png, gif, webp, svg)
- Resolution check (warning level)

```
Validating presentation.yaml...

Images:
  ✓ images/photos/site-overview.jpg (1920x1080, JPEG)
  ✓ images/photos/product.jpg (1200x800, JPEG)
  ⚠ images/photos/detail.jpg (640x480, JPEG) - Low resolution
  ✗ images/photos/missing.jpg - File not found

Errors: 1, Warnings: 1
```

### Detecting Missing Images

```bash
slide-gen validate presentation.yaml --check-images
```

Outputs a list of missing images for use in AI workflow:

```
Missing images:
  - slide 3: images/photos/customer-site.jpg
  - slide 5: images/photos/product-exterior.jpg

Run 'slide-gen images request' to generate image request list.
```

---

## AI Workflow Integration

### images request Command (for AI)

Generates a request list for missing images:

```bash
slide-gen images request presentation.yaml --format llm
```

Output:
```yaml
missing_images:
  - path: images/photos/customer-site.jpg
    slide: 3
    template: image-text
    context:
      title: "Implementation Case Study"
      usage: "Placed on left, displayed parallel with text"

  - path: images/photos/product-exterior.jpg
    slide: 5
    template: image-full
    context:
      title: "Product Introduction"
      usage: "Used as fullscreen background"
```

AI combines this information with the presentation scenario to generate detailed image requests.

---

## Image Naming Conventions (Recommended)

Recommended naming conventions to facilitate communication between AI and users:

| Pattern | Example | Usage |
|---------|---------|-------|
| `{subject}-{view}.jpg` | `product-front.jpg` | Product photos |
| `{location}-{date}.jpg` | `factory-a-2024.jpg` | Site photos |
| `{process}-{step}.jpg` | `installation-step3.jpg` | Process photos |
| `{comparison}-{state}.jpg` | `renovation-before.jpg` | Comparison photos |
| `figure-{number}.png` | `figure-01.png` | Figures |
| `chart-{name}.png` | `chart-sales-trend.png` | Charts/graphs |

---

## Configuration Options

### Image Settings in config.yaml

```yaml
images:
  # Image directory
  directory: images

  # Auto-search subdirectories
  auto_resolve: true

  # Recommended resolution (warning threshold)
  min_resolution:
    width: 1280
    height: 720

  # Supported formats
  formats:
    - jpg
    - jpeg
    - png
    - gif
    - webp
    - svg

  # Metadata format (described later)
  metadata:
    format: auto  # auto / individual / directory
```

---

## Image Metadata

By saving supplementary information about images (publication permission, capture information, usage conditions, etc.) as text files, AI can handle images appropriately.

### Need for Metadata

| Visually Apparent Information | Information Not Visually Apparent |
|------------------------------|-----------------------------------|
| Subject, composition | Publication permission status/conditions |
| Resolution, brightness | Capture date/location |
| Presence of people/logos | Subject names/details |
| Image quality | Usage restrictions/expiration dates |
| | Credit attribution requirements |

### Benefits

1. **Information Continuity Across Sessions**: Understand previous confirmation results in new sessions
2. **Avoid Duplicate Confirmations**: Prevent repeating "Is publication permitted?"
3. **Appropriate Image Selection**: Auto-filter images meeting conditions
4. **Automatic Credit Generation**: Add sources to reference slides

---

### Hybrid Format

Use both formats, selecting based on the situation.

```yaml
# config.yaml
images:
  metadata:
    format: auto  # auto / individual / directory
```

| Format | File | Usage |
|--------|------|-------|
| `individual` | `{image}.meta.yaml` | Images requiring detailed records |
| `directory` | `images.yaml` | Simple bulk management |
| `auto` | Auto-detect both | **Recommended** (default) |

In `auto` mode, individual `.meta.yaml` files take priority if they exist; otherwise, the directory's `images.yaml` is referenced.

---

### Directory Structure

```
images/
├── photos/
│   ├── images.yaml              # Directory-level metadata
│   ├── customer-site.jpg
│   ├── customer-site.meta.yaml  # Individual metadata (when details needed)
│   ├── product-front.jpg        # Managed in images.yaml
│   └── product-side.jpg         # Managed in images.yaml
├── figures/
│   ├── images.yaml
│   └── system-diagram.png
└── charts/
    └── sales-trend.png          # No metadata (optional)
```

---

### Individual Metadata Format (`{image}.meta.yaml`)

Used for images requiring detailed records.

```yaml
# images/photos/customer-site.meta.yaml

# Basic information
description: "Company A's implementation site (Tokyo factory, manufacturing line)"
captured_date: "2024-12-15"
captured_by: "Sales Dept. Tanaka"
location: "Ota-ku, Tokyo"

# Subject details
subject:
  - "Product X100 in operating state"
  - "3 workers nearby (faces not visible)"
  - "Company A logo signage in back right"

# Publication permission information
permissions:
  status: approved        # approved / pending / restricted / rejected
  approved_by: "Company A, Manager Yamada"
  approved_date: "2025-01-05"
  expires: null           # Expiration date (null means indefinite)
  conditions:
    - "Use in internal materials permitted"
    - "External publication requires individual consultation"
  document: "permissions/a-company-approval.pdf"  # Permission document reference

# Usage restrictions
restrictions:
  - "No use on social media"
  - "No presentation to competitors"

# Notes (supplementary information for AI)
notes: |
  Company B's equipment is visible in the lower right of the image,
  but confirmed OK with Company A (confirmed 2025-01-05).

  High-resolution version saved at NAS/photos/2024-12/original/.

# Credit attribution
credits:
  required: false         # Is credit attribution required?
  text: null              # Attribution text if required

# Tags (for search/filtering)
tags:
  - "Implementation case"
  - "Manufacturing"
  - "Company A"
```

---

### Directory Metadata Format (`images.yaml`)

Used for simple management or bulk management of multiple images.

```yaml
# images/photos/images.yaml

# Default settings for entire directory
_defaults:
  permissions:
    status: approved
  credits:
    required: false

# Individual image metadata
product-front.jpg:
  description: "Product X100 front view"
  captured_date: "2024-11-20"
  tags: ["Product", "For catalog"]

product-side.jpg:
  description: "Product X100 side view"
  captured_date: "2024-11-20"
  tags: ["Product", "For catalog"]

factory-overview.jpg:
  description: "Full view of our factory"
  permissions:
    status: approved
    conditions: ["No restrictions"]
  tags: ["Internal", "Factory"]

customer-b-site.jpg:
  description: "Company B implementation site"
  permissions:
    status: pending       # Still awaiting permission
    pending_contact: "Checking with Company B, Mr. Sato"
  tags: ["Implementation case", "Company B"]
```

---

### Metadata Schema

```yaml
# Complete schema definition

# Basic information
description: string           # Image description (recommended as required)
captured_date: string         # Capture date (YYYY-MM-DD)
captured_by: string           # Photographer
location: string              # Capture location

# Subject information
subject: string | string[]    # Subject description

# Publication permission
permissions:
  status: enum                # approved / pending / restricted / rejected
  approved_by: string         # Approver
  approved_date: string       # Approval date
  expires: string | null      # Expiration date
  conditions: string[]        # Usage conditions
  document: string            # Permission document path
  pending_contact: string     # Contact for confirmation (when pending)

# Usage restrictions
restrictions: string[]        # List of usage restrictions

# Notes
notes: string                 # Supplementary information for AI (free text)

# Credits
credits:
  required: boolean           # Is credit attribution required?
  text: string                # Attribution text

# Tags
tags: string[]                # Tags for search/filtering
```

---

### Usage in AI Workflow

#### 1. Image Review Phase

```
[AI Processing Flow]

1. Visually confirm image file (Read tool)
2. Load metadata file
   - Load customer-site.meta.yaml if it exists
   - Otherwise, get relevant entry from images.yaml
3. Integrate visual information + metadata for judgment

[Output Example]
"Confirmed customer-site.jpg.

 Visual Check:
 ✓ Product shown in operating state
 ✓ Good composition and brightness

 Metadata Check:
 ✓ Publication permission: Approved by Company A, Manager Yamada (2025-01-05)
 ⚠ Usage condition: Internal materials only, external publication requires consultation

 → Use in internal presentation is no problem.
   Additional permission needed for external use."
```

#### 2. Image Selection Phase

```
[AI Processing]

User: "What photos are available for implementation case slides?"

AI:
1. Load all metadata within images/
2. Filter by conditions:
   - permissions.status == "approved"
   - tags contains "Implementation case"
3. Present results

"There are 3 photos available for implementation cases:

1. customer-site.jpg
   - Company A implementation site (approved, internal materials only)

2. factory-overview.jpg
   - Our factory (no restrictions)

3. customer-c-demo.jpg
   - Company C demo footage (approved, no restrictions)

* customer-b-site.jpg cannot be used as permission is pending."
```

#### 3. Credit Generation Phase

```
[AI Processing]

During conversion, detect images with credits.required == true
and auto-add credits to reference slides.

"The following images require credit attribution:
 - figure-01.png: "Source: XX Society Journal (2024)"

 Shall I add to the references slide?"
```

#### 4. Permission Status Report

```bash
slide-gen images status presentation.yaml
```

```
Image Permissions Status:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✓ Approved (3):
  - customer-site.jpg (Company A, expires: none)
  - product-front.jpg (Internal, expires: none)
  - factory-overview.jpg (Internal, expires: none)

⏳ Pending (1):
  - customer-b-site.jpg
    Contact: Checking with Company B, Mr. Sato

✗ Restricted (1):
  - internal-meeting.jpg
    Reason: Internal only, external publication not permitted

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Summary: 3 approved, 1 pending, 1 restricted
```

---

### Metadata Creation Assistance

#### AI-Generated Initial Metadata

AI can confirm images and generate metadata drafts.

```
User: "Create metadata for customer-site.jpg"

AI: (visually confirms image)
"Image confirmed. Generating the following metadata:

```yaml
# customer-site.meta.yaml
description: "Industrial equipment operating in factory"
captured_date: null  # ← Input required
location: null       # ← Input required

subject:
  - "Large industrial equipment in center (appears to be product)"
  - "Work tables and tools nearby"
  - "Other equipment in background"
  - "No people visible"

permissions:
  status: pending    # ← Confirmation required
  conditions: []

notes: |
  What appears to be another company's product logo is visible
  in the lower right. Needs confirmation before use.

tags:
  - "Implementation site"
  - "Factory"
```

Please add the capture date and publication permission information."
```

---

### Best Practices

1. **Images requiring details**: Use individual `.meta.yaml`
   - Customer site photos
   - Images with complex permission conditions
   - Time-limited permissions

2. **Simple management**: Use directory `images.yaml`
   - Internal product photos
   - Unrestricted images
   - Many similar images

3. **Minimum information to record**:
   - `description`: What the image is
   - `permissions.status`: Whether it can be used
   - `tags`: Keywords for searching

4. **Supplementary info for AI**: Use the `notes` field
   - Background information not visually apparent
   - Cautions and confirmed matters
