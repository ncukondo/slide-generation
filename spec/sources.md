# Source Material Management Specification

## Overview

This specification defines how to manage text-based source materials (scenarios, scripts, reference documents, etc.) that form the basis for slide creation, and the collaborative workflow with AI assistants.

### Design Principles

1. **Reproducibility**: Centrally manage project materials so anyone can regenerate the same slides
2. **Transparency**: Record information obtained through AI interactions as documentation
3. **Progressive Refinement**: Manage materials from rough scenarios to detailed scripts in stages
4. **Traceability**: Track which source material each slide element is based on
5. **Flexible Input Handling**: Support detailed materials, scenario-only, or starting from scratch

---

## Directory Structure

```
my-presentation/
├── sources/                      # Source materials directory
│   ├── sources.yaml             # Material metadata/index
│   │
│   ├── scenario/                # Scenario/structure
│   │   ├── brief.md            # Initial brief (purpose, audience, etc.)
│   │   ├── outline.md          # Structure outline
│   │   └── scenario.md         # Detailed scenario
│   │
│   ├── content/                 # Content scripts
│   │   ├── draft.md            # Script draft
│   │   ├── slide-01-intro.md   # Per-slide scripts (optional)
│   │   └── ...
│   │
│   ├── materials/               # Reference materials
│   │   ├── materials.yaml      # Material metadata
│   │   ├── report-2024.pdf
│   │   ├── competitor-data.xlsx
│   │   └── meeting-notes.md
│   │
│   ├── data/                    # Data/numbers
│   │   ├── statistics.yaml     # Statistical data
│   │   └── survey-results.csv
│   │
│   └── conversation/            # AI conversation logs (auto-generated)
│       ├── 2025-01-10-initial.md
│       └── 2025-01-11-revision.md
│
├── images/
├── presentation.yaml
└── config.yaml
```

---

## Three Input Patterns

AI supports the following three input scenarios and configures the source directory with the appropriate flow.

### Pattern Selection Flow

```
┌─────────────────────────────────────────────────────────────┐
│ AI's Initial Question                                        │
│                                                             │
│ "Let's create slides. Please tell me about your materials:  │
│                                                             │
│  A) I have detailed materials organized in a directory      │
│  B) I have partial materials like a scenario or script      │
│  C) I don't have materials yet (starting from scratch)"     │
└─────────────────────────────────────────────────────────────┘
          │              │              │
          ▼              ▼              ▼
     Pattern A       Pattern B       Pattern C
   (Explore Mode)  (Supplement Mode) (Interview Mode)
```

---

## Pattern A: Exploring Detailed Material Directory

When the user already has detailed materials organized in a directory.

### Flow

```
┌─────────────────────────────────────────────────────────────┐
│ Step 1: Directory Specification                              │
│                                                             │
│ User: "Everything is in ~/Projects/presentation-materials/" │
│                                                             │
│ AI: "I'll explore that directory"                          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ Step 2: Directory Exploration and Analysis                   │
│                                                             │
│ AI:                                                         │
│ 1. Scan directory structure (Glob)                         │
│ 2. Review contents of each file (Read)                     │
│ 3. Classify file types:                                    │
│    - Scenario/structure: scenario.md, outline.docx, etc.   │
│    - Scripts: draft.md, content.txt, etc.                  │
│    - Data: data.xlsx, statistics.csv, etc.                 │
│    - Reference: spec.pdf, report.pdf, etc.                 │
│    - Images: *.jpg, *.png, etc.                            │
│                                                             │
│ "I've explored the directory. Files detected:               │
│                                                             │
│  📁 ~/Projects/presentation-materials/                      │
│  ├── scenario.md          → Scenario (detailed)            │
│  ├── outline.xlsx         → Structure table                │
│  ├── content/                                               │
│  │   ├── intro.md         → Introduction script            │
│  │   └── main-points.md   → Main content script            │
│  ├── data/                                                  │
│  │   ├── sales-2024.xlsx  → Sales data                     │
│  │   └── survey.csv       → Survey results                 │
│  ├── references/                                            │
│  │   ├── product-spec.pdf → Product specifications         │
│  │   └── competitor.pdf   → Competitive analysis           │
│  └── images/                                                │
│      ├── product.jpg      → Product photo                  │
│      └── chart.png        → Chart image                    │
│                                                             │
│  Total: 10 files detected"                                 │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ Step 3: Content Analysis and Summary                         │
│                                                             │
│ AI: Read and summarize main file contents                  │
│                                                             │
│ "I've analyzed the material contents:                       │
│                                                             │
│  📋 Presentation Overview (from scenario.md)               │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━                            │
│  Title: New Product X100 Introduction Proposal             │
│  Purpose: Sales proposal to Company A, secure contract     │
│  Audience: Executive level (5-10 people)                   │
│  Duration: 20 min + 10 min Q&A                             │
│                                                             │
│  📋 Slide Structure (from outline.xlsx)                    │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━                            │
│  12-slide structure:                                        │
│  1. Title                                                  │
│  2. Agenda                                                 │
│  3. Problem Recognition                                    │
│  ... (continued)                                           │
│                                                             │
│  📋 Available Data                                         │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━                            │
│  - Sales trends (2020-2024)                               │
│  - Customer satisfaction survey (n=500)                    │
│  - Competitive comparison table                            │
│                                                             │
│  Does this look correct?"                                  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ Step 4: Confirmation and Follow-up Questions                 │
│                                                             │
│ AI: "Let me ask a few clarifying questions:                │
│                                                             │
│  1. About the audience                                     │
│     You mentioned 'executive level' - could you tell me    │
│     specific titles and decision-making authority?         │
│                                                             │
│  2. Previous context                                       │
│     The scenario mentions 're-proposal' -                  │
│     could you provide context about the previous attempt?  │
│                                                             │
│  3. Image permissions                                      │
│     Is product.jpg cleared for external use?"              │
│                                                             │
│ User: "Planning Director and Procurement Director.         │
│        Last time was declined due to pricing.              │
│        All images are internal photos, so OK"              │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ Step 5: Configuring source Directory                         │
│                                                             │
│ AI:                                                         │
│ 1. Create sources/ directory                               │
│ 2. Organize and place original directory structure         │
│ 3. Generate sources.yaml                                   │
│ 4. Record additional information from conversation         │
│                                                             │
│ "I've configured the source directory:                     │
│                                                             │
│  sources/                                                   │
│  ├── sources.yaml           ← Material index (newly created)│
│  ├── scenario/                                              │
│  │   ├── brief.md           ← Generated from conversation  │
│  │   ├── scenario.md        ← From original file           │
│  │   └── outline.md         ← Converted from outline.xlsx  │
│  ├── content/                                               │
│  │   ├── intro.md           ← From original file           │
│  │   └── main-points.md     ← From original file           │
│  ├── materials/                                             │
│  │   ├── product-spec.pdf   ← From original file           │
│  │   └── competitor.pdf     ← From original file           │
│  ├── data/                                                  │
│  │   ├── sales-2024.yaml    ← AI Agent reads files directly│
│  │   │                        and extracts needed info     │
│  │   └── survey.yaml        ← Converted from CSV           │
│  └── conversation/                                          │
│      └── 2025-01-10-setup.md ← This session's log         │
│                                                             │
│  Recorded mapping to original directory in sources.yaml.   │
│  Ready to start creating slides?"                          │
└─────────────────────────────────────────────────────────────┘
```

### File Classification Rules During Exploration

AI classifies files using the following heuristics:

| Pattern | Classification | Destination |
|---------|---------------|-------------|
| `scenario*`, `brief*`, `requirements*` | Scenario | scenario/ |
| `outline*`, `structure*` | Structure | scenario/ |
| `draft*`, `content*`, `script*` | Scripts | content/ |
| `*.xlsx`, `*.csv`, `data*` | Data | data/ |
| `*.pdf`, `spec*`, `report*` | Reference | materials/ |
| `*.jpg`, `*.png`, `*.svg` | Images | ../images/ |

AI classifies based on content as well as file names:

```
AI Internal Processing:
1. Infer from file name
2. Read file content headers
3. Judge purpose from headings/structure
4. Ask user if unclear
```

---

## Pattern B: Supplementing from Scenario/Partial Materials

When the user has only a scenario or some partial materials.

### Flow

```
┌─────────────────────────────────────────────────────────────┐
│ Step 1: Identifying Materials                                │
│                                                             │
│ User: "I only have a scenario. Check ~/scenario.md"        │
│                                                             │
│ Or                                                          │
│                                                             │
│ User: "Here's my scenario" (pastes text)                   │
│ "                                                          │
│ # New Product Launch Presentation                          │
│ ## Purpose                                                  │
│ Announce new product X100 internally.                      │
│ ## Structure                                               │
│ 1. Product Overview                                        │
│ 2. Feature Explanation                                     │
│ ...                                                         │
│ "                                                          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ Step 2: Content Analysis                                     │
│                                                             │
│ AI: Read and analyze file or text                          │
│                                                             │
│ "I've reviewed your scenario:                               │
│                                                             │
│  📋 Detected Information                                   │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━                            │
│  ✓ Title: New Product Launch Presentation                 │
│  ✓ Purpose: Internal product announcement                 │
│  ✓ Structure: 5-slide structure                           │
│                                                             │
│  ⚠ Missing Information                                    │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━                            │
│  - Audience details (department, size, technical level)    │
│  - Presentation duration                                   │
│  - Specific product features/specs                         │
│  - Data or charts you want to use"                        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ Step 3: Gathering Additional Information                     │
│                                                             │
│ AI: "To create the slides, please tell me:                 │
│                                                             │
│  [Required]                                                │
│  1. About the audience                                     │
│     - Which departments will attend?                       │
│     - How technical should the explanation be?             │
│                                                             │
│  2. Presentation duration                                  │
│     - How long is the presentation?                        │
│                                                             │
│  [Helpful if available]                                    │
│  3. Product information                                    │
│     - Do you have product specs or catalog?                │
│     - Do you have product photos?                          │
│                                                             │
│  4. Data                                                   │
│     - Do you have performance comparison data?"            │
│                                                             │
│ User: "Sales and Development, about 30 people. 15 minutes. │
│        Spec sheet is at ~/docs/x100-spec.pdf.              │
│        Photos planned to be taken"                         │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ Step 4: Loading Additional Materials                         │
│                                                             │
│ AI:                                                         │
│ 1. Load specified files                                    │
│ 2. Analyze contents                                        │
│ 3. Extract information usable in slides                    │
│                                                             │
│ "I've reviewed the spec sheet:                             │
│                                                             │
│  📄 x100-spec.pdf                                          │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━                            │
│  - Product name: X100                                      │
│  - Main features: 3 detected                               │
│  - Spec table: on p.5                                      │
│  - Competitive comparison: on p.12                         │
│                                                             │
│  I'll use this information in the slides."                 │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ Step 5: Information Integration and source Configuration     │
│                                                             │
│ AI:                                                         │
│ 1. Integrate collected information                         │
│ 2. Configure sources/ directory                            │
│ 3. Mark missing information                                │
│                                                             │
│ "I've configured the source directory:                     │
│                                                             │
│  sources/                                                   │
│  ├── sources.yaml                                           │
│  ├── scenario/                                              │
│  │   ├── brief.md           ← Generated from conversation  │
│  │   └── scenario.md        ← Original scenario + additions│
│  ├── content/               (to be created)                │
│  ├── materials/                                             │
│  │   └── x100-spec.pdf      ← From specified file          │
│  ├── data/                                                  │
│  │   └── spec-data.yaml     ← AI Agent reads files directly│
│  │                            and extracts needed info     │
│  └── conversation/                                          │
│      └── 2025-01-10-setup.md                                │
│                                                             │
│  📷 Additional Materials Needed                            │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━                            │
│  - Product photos (you mentioned they're planned)          │
│    → Please place in images/ when ready                    │
│                                                             │
│  Ready to start creating slides?                           │
│  (Photos can be added later)"                              │
└─────────────────────────────────────────────────────────────┘
```

### Question Strategy During Supplementation

AI asks questions in this priority order:

```
[Required] - Essential for slide creation
1. Purpose (what you want to achieve)
2. Audience (who it's for)
3. Duration (how long)

[Important] - Affects content quality
4. Key messages (core points to convey)
5. Specific data/examples
6. Constraints (format, style)

[Supplementary] - Helpful if available
7. Past context/background
8. Audience concerns
9. Reference slides to emulate
```

---

## Pattern C: Building from Interview (AI Agent Only)

When the user has no materials, information is collected through dialogue.

Note: This pattern is designed for AI Agent interaction only and is not implemented as a CLI command.

### Flow

```
┌─────────────────────────────────────────────────────────────┐
│ Step 1: Basic Information Gathering                          │
│                                                             │
│ AI: "Let's create a presentation together.                 │
│      First, tell me the basics.                            │
│                                                             │
│      1. What is this presentation about?                   │
│         (e.g., product intro, research, proposal, report)" │
│                                                             │
│ User: "Team quarterly report"                              │
│                                                             │
│ AI: "A quarterly report.                                   │
│                                                             │
│      2. Who is the audience?                               │
│         (e.g., supervisor, executives, team members)"      │
│                                                             │
│ User: "Report to department and section managers"          │
│                                                             │
│ AI: "Reporting to managers.                                │
│                                                             │
│      3. How long is the presentation?"                     │
│                                                             │
│ User: "About 10 minutes"                                   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ Step 2: Deep Dive into Content                               │
│                                                             │
│ AI: "Thank you. Tell me about the content.                 │
│                                                             │
│      4. What were the main achievements this quarter?      │
│         (Could you list about 3?)"                         │
│                                                             │
│ User: "- Released new feature A                            │
│        - Customer satisfaction up 15%                      │
│        - Team expanded by 2 members"                       │
│                                                             │
│ AI: "Great achievements.                                   │
│                                                             │
│      5. Any challenges or plans for next quarter?"         │
│                                                             │
│ User: "Technical debt is a challenge. Planning to start    │
│        2 new projects next quarter"                        │
│                                                             │
│ AI: "I see.                                                │
│                                                             │
│      6. Do you have numerical data?                        │
│         (Sales, KPIs, progress rates, etc.)"              │
│                                                             │
│ User: "I have a KPI table. I'll paste it here"            │
│                                                             │
│ (pastes table)                                              │
│ "| Metric | Target | Actual |                              │
│   | Customer Satisfaction | 80% | 92% |                    │
│   | Bug Fix Rate | 90% | 95% |                             │
│   ..."                                                      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ Step 3: Structure Proposal                                   │
│                                                             │
│ AI: "I've organized the information. How about this:       │
│                                                             │
│  📋 Slide Structure Proposal (7 slides, 10 min)           │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━                            │
│                                                             │
│  1. Title                                                  │
│     'Development Team Q1 2025 Report'                      │
│                                                             │
│  2. Summary                                                │
│     3 highlights of the quarter                            │
│                                                             │
│  3. Achievement 1: New Feature A Release                   │
│     Release details and impact                             │
│                                                             │
│  4. Achievement 2: Customer Satisfaction Improvement       │
│     Show KPI table                                         │
│                                                             │
│  5. Achievement 3: Team Strengthening                      │
│     Impact of 2 new members                                │
│                                                             │
│  6. Challenges and Next Quarter Plans                      │
│     Technical debt + 2 new projects                        │
│                                                             │
│  7. Summary                                                │
│                                                             │
│  Shall we proceed with this structure?                     │
│  Let me know if you'd like changes."                       │
│                                                             │
│ User: "Looks good. But I want challenges and plans split"  │
│                                                             │
│ AI: "Understood. I'll change slide 6 to Challenges,        │
│      7 to Next Quarter Plans, and 8 to Summary."          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ Step 4: Generating source Directory                          │
│                                                             │
│ AI: Configure source directory from conversation info      │
│                                                             │
│ "I've configured the source directory from our conversation:│
│                                                             │
│  sources/                                                   │
│  ├── sources.yaml           ← Material index              │
│  ├── scenario/                                              │
│  │   ├── brief.md           ← Recorded basic info         │
│  │   └── outline.md         ← Structure proposal          │
│  ├── content/                                               │
│  │   └── draft.md           ← Content from conversation   │
│  ├── data/                                                  │
│  │   └── kpi.yaml           ← Extracted from pasted data  │
│  └── conversation/                                          │
│      └── 2025-01-10-interview.md ← This entire session    │
│                                                             │
│  You can review and edit the content later.                │
│  Ready to start creating slides?"                          │
└─────────────────────────────────────────────────────────────┘
```

### Interview Question Templates

AI uses these questions based on context:

```yaml
# Basic questions (always ask)
basic:
  - "What is this presentation about?"
  - "Who is the audience?"
  - "How long is the presentation?"

# Purpose-specific questions
by_purpose:
  proposal:  # Proposal
    - "What are you proposing?"
    - "What's the benefit to the audience?"
    - "What concerns might they have?"
  report:  # Report
    - "What were the main achievements?"
    - "Any challenges or issues?"
    - "What are the next actions?"
  introduction:  # Introduction
    - "What are the key features?"
    - "How does it differ from competitors?"
    - "Do you have demos or case studies?"
  education:  # Education/Training
    - "What are the learning objectives?"
    - "What's the audience's prerequisite knowledge?"
    - "Are there exercises or workshops?"

# Data confirmation
data:
  - "Do you have numerical data?"
  - "Anything you want as charts or tables?"
  - "Anything requiring source citation?"

# Additional
additional:
  - "Any points to emphasize?"
  - "Any topics to avoid?"
  - "Any similar past presentations?"
```

---

## sources.yaml (Material Index)

The central file for material management, generated in all patterns.

```yaml
# sources/sources.yaml

# Project information
project:
  name: "New Product X100 Introduction Proposal"
  purpose: "Sales proposal to Company A"
  created: "2025-01-10"
  updated: "2025-01-11"

  # Setup pattern (A/B/C)
  setup_pattern: "A"  # Built from detailed material directory
  original_source: "~/Projects/presentation-materials/"

# Presentation context
context:
  objective: |
    Propose new product X100 introduction and secure contract.

  audience:
    type: "Executive level"
    size: "5-10 people"
    knowledge_level: "Non-technical"
    concerns:
      - "Implementation cost"
      - "Compatibility with existing systems"

  key_messages:
    - "30% cost reduction vs. conventional"
    - "Deployed by 100+ companies"

  constraints:
    duration: "20 minutes"
    format: "In-person presentation"

# Material list
sources:
  - id: brief
    type: scenario
    path: scenario/brief.md
    status: final
    origin: "conversation"  # Generated from conversation
    description: "Initial brief"

  - id: scenario
    type: scenario
    path: scenario/scenario.md
    status: final
    origin: "~/Projects/presentation-materials/scenario.md"
    description: "Detailed scenario"

  - id: product-spec
    type: material
    path: materials/product-spec.pdf
    status: reference
    origin: "~/Projects/presentation-materials/references/product-spec.pdf"
    description: "Product specifications"
    extracted_data:
      - data/spec-features.yaml

  - id: session-01
    type: conversation
    path: conversation/2025-01-10-setup.md
    status: archived
    description: "Initial setup session"
    decisions:
      - "Agreed on 12-slide structure"
      - "Using Company B case study"

# Material dependencies
dependencies:
  presentation.yaml:
    derived_from:
      - brief
      - scenario
      - product-spec

# Missing information (tracked by AI)
missing:
  - item: "Product photo"
    needed_for: "Slide 4"
    status: "pending"
    notes: "User planning to take photos"
```

---

## CLI Commands

### sources init

```bash
# Interactive mode (starts with pattern selection)
slide-gen sources init

# Specify pattern
slide-gen sources init --from-directory ~/Projects/materials/
slide-gen sources init --from-file ~/scenario.md
```

### sources import

```bash
# Add file
slide-gen sources import ~/data.xlsx

# Explore directory and add
slide-gen sources import ~/Project/ --recursive --analyze
```

### sources status

```bash
slide-gen sources status
```

Output:
```
Sources Status: New Product X100 Introduction Proposal
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Setup: Pattern A (from directory)
Origin: ~/Projects/presentation-materials/

Scenario:  ✓ complete
Content:   ◐ 8/12 slides drafted
Materials: ✓ 3 files
Data:      ✓ 2 datasets

Missing:
  ⚠ Product photo (needed for slide 4)

Last updated: 2025-01-11 14:30
```

### sources sync

Sync with original directory (for Pattern A).

```bash
# Check for changes
slide-gen sources sync --check

# Execute sync
slide-gen sources sync
```

---

## AI Skill Integration

### Material Collection Skill

```markdown
## Material Collection Flow

### Pattern Determination

First confirm material preparation status:
- A) Have detailed material directory → Explore mode
- B) Have partial materials → Supplement mode
- C) No materials → Interview mode (AI Agent only)

### Pattern A: Explore Mode

1. Scan specified directory with Glob
2. Review contents of each file with Read
3. Classify file types
4. Summarize contents and confirm with user
5. Gather supplementary info through additional questions
6. Configure sources/

### Pattern B: Supplement Mode

1. Read specified file/text
2. Analyze contained information
3. List missing information
4. Supplement through additional questions
5. Load additional files if available
6. Configure sources/

### Pattern C: Interview Mode (AI Agent Only)

1. Basic questions (purpose, audience, duration)
2. Deep dive into content (purpose-specific questions)
3. Confirm data/materials
4. Present structure proposal
5. Incorporate feedback
6. Configure sources/

### Common: Saving Conversation Logs

In all patterns, session content is
automatically saved to sources/conversation/.
Records decisions, provided information, and follow-up questions.
```

---

## Configuration Options

```yaml
# config.yaml
sources:
  directory: sources

  # Exploration settings (Pattern A)
  explore:
    max_depth: 3           # Directory exploration depth
    include_hidden: false  # Include hidden files
    file_size_limit: 10MB  # Max file size to read

  # Import settings
  import:
    copy_files: true       # Copy files (false for links)

  # Conversation logs
  conversation:
    auto_save: true
    include_timestamps: true
    include_decisions: true

  # Sync settings (Pattern A)
  sync:
    watch_original: false  # Watch original directory for changes
    auto_sync: false       # Auto-sync
```

---

## Best Practices

### 1. Pattern Selection Guidelines

| Situation | Recommended Pattern |
|-----------|-------------------|
| Plans/materials are complete | A (Explore) |
| Have scripts or notes | B (Supplement) |
| At idea stage | C (Interview) - AI Agent only |
| Remaking existing presentation | A or B |

### 2. Progressive Information Refinement

```
[Pattern C] Conversation → brief.md → outline.md → draft.md → presentation.yaml
[Pattern B] scenario.md → Supplementary conversation → draft.md → presentation.yaml
[Pattern A] Detailed materials → Confirmation conversation → presentation.yaml
```

### 3. Preserving Original Materials

For Pattern A, record the original directory path
to enable synchronization when needed.

### 4. Using Conversation Logs

- Record of decisions made
- Later review
- Handoff to other team members
