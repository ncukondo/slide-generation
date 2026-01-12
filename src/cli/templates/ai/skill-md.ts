/**
 * Generate SKILL.md content for AgentSkills
 */
export function generateSkillMd(): string {
  return `---
name: slide-assistant
description: Assists with slide creation using slide-gen CLI. Responds to requests like "create slides", "show templates", "convert manuscript to slides".
allowed-tools: Read Write Edit Bash Glob Grep
---

# Slide Assistant

Helps create Marp slides using the slide-gen CLI tool.

## First Question

**Always start by asking about the user's material situation:**

> "Let's create slides. What materials do you have?
>
> A) I have detailed materials organized in a directory
>    (scenarios, scripts, data files, images, etc.)
>
> B) I have partial materials like a scenario or script
>    (but need to supplement with additional info)
>
> C) I don't have materials yet
>    (starting from scratch, will collect info through dialogue)"

Then follow the appropriate pattern below.

## Workflow Patterns

### Pattern A: Explore Mode (Detailed Materials Exist)

When user has materials organized in a directory:
1. Ask for directory path and scan with Glob
2. Read and classify files (scenario, scripts, data, images)
3. Summarize findings and confirm with user
4. Configure \`sources/\` directory

### Pattern B: Supplement Mode (Partial Materials)

When user has only a scenario or partial materials:
1. Read and analyze provided content
2. Identify what's present vs. missing
3. Ask targeted questions to fill gaps
4. Configure \`sources/\` directory

### Pattern C: Interview Mode (Starting from Scratch)

When user has no materials:
1. Ask basic questions (purpose, audience, duration)
2. Collect data and examples
3. Propose slide structure for approval
4. Configure \`sources/\` directory

**See [references/workflows.md](references/workflows.md) for detailed steps.**

## Capabilities

1. **Project initialization**: \`slide-gen init\`
2. **Template discovery**: \`slide-gen templates list --format llm\`
3. **Slide creation**: Create/edit presentation.yaml
4. **Validation**: \`slide-gen validate\`
5. **Conversion**: \`slide-gen convert\`
6. **Screenshot**: \`slide-gen screenshot\` (for AI review)

## Slide Creation Flow

After material collection (Pattern A/B/C above):

1. Check templates with \`slide-gen templates list --format llm\`
2. Create presentation.yaml
3. Validate: \`slide-gen validate presentation.yaml\`
4. Convert: \`slide-gen convert presentation.yaml\`

## YAML Source Format

\`\`\`yaml
meta:
  title: "Presentation Title"
  author: "Author Name"
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
\`\`\`

## Template Examples

### Title Slide
\`\`\`yaml
- template: title
  content:
    title: "Title"
    subtitle: "Subtitle"
    author: "Author"
\`\`\`

### Bullet List
\`\`\`yaml
- template: bullet-list
  content:
    title: "Title"
    items:
      - "Item 1"
      - "Item 2"
\`\`\`

### Cycle Diagram
\`\`\`yaml
- template: cycle-diagram
  content:
    title: "PDCA Cycle"
    nodes:
      - { label: "Plan", icon: "planning", color: "#4CAF50" }
      - { label: "Do", icon: "action", color: "#2196F3" }
      - { label: "Check", icon: "analysis", color: "#FF9800" }
      - { label: "Act", icon: "improvement", color: "#9C27B0" }
\`\`\`

## Commands Reference

| Command | Description |
|---------|-------------|
| \`slide-gen convert <input>\` | Convert YAML to Marp Markdown |
| \`slide-gen validate <input>\` | Validate source file |
| \`slide-gen templates list\` | List templates |
| \`slide-gen templates info <name>\` | Template details |
| \`slide-gen icons search <query>\` | Search icons |
| \`slide-gen screenshot <input>\` | Take screenshots |
| \`slide-gen preview <input>\` | Open preview in browser |

## AI-Optimized Output

Use \`--format llm\` for token-efficient output:
\`\`\`bash
slide-gen templates list --format llm
slide-gen templates info <name> --format llm
slide-gen validate <input> --format llm
\`\`\`

The \`validate --format llm\` command provides:
- Error locations with line numbers
- Fix examples from template definitions
- Contextual hints for unknown templates/icons

## Visual Feedback Loop

After creating or modifying slides, use this workflow to review and iterate:

### Step 1: Take Screenshot
\`\`\`bash
# AI-optimized format (recommended)
slide-gen screenshot presentation.yaml --format ai

# Or contact sheet for overview
slide-gen screenshot presentation.yaml --contact-sheet
\`\`\`

### Step 2: Review Images
Use the Read tool to view the generated screenshots:
\`\`\`
Read ./screenshots/presentation.001.jpeg
\`\`\`

### Step 3: Identify Issues
Look for:
- Layout problems (text overflow, alignment)
- Visual balance (too much/little content)
- Icon and color appropriateness
- Readability of text and diagrams

### Step 4: Make Adjustments
Edit presentation.yaml to fix identified issues.

### Step 5: Repeat
Take new screenshots and verify improvements.

### Example Iteration Cycle

1. Create initial slides
2. \`slide-gen screenshot presentation.yaml --format ai --slide 3\`
3. \`Read ./screenshots/presentation.003.jpeg\`
4. Notice: "Title text is too long, wrapping awkwardly"
5. Edit presentation.yaml to shorten title
6. \`slide-gen screenshot presentation.yaml --format ai --slide 3\`
7. \`Read ./screenshots/presentation.003.jpeg\`
8. Verify fix, move to next slide

## Reference Management

For academic presentations, manage citations and references:

1. **Analyze** content for citation needs
2. **Search** existing library: \`ref search\`
3. **Add** new references: \`ref add pmid:XXX\`
4. **Validate** citations: \`slide-gen validate\`

See \`.skills/slide-assistant/references/skill.md\` for detailed workflow.

### Quick Commands

\`\`\`bash
# Search library
ref search "keyword" --format json

# Add from PMID
ref add pmid:38941256

# Add from DOI
ref add "10.1038/xxxxx"

# Validate citations
slide-gen validate presentation.yaml
\`\`\`
`;
}
