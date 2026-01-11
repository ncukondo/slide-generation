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

## Capabilities

1. **Project initialization**: \`slide-gen init\`
2. **Template discovery**: \`slide-gen templates list --format llm\`
3. **Slide creation**: Create/edit presentation.yaml
4. **Validation**: \`slide-gen validate\`
5. **Conversion**: \`slide-gen convert\`
6. **Screenshot**: \`slide-gen screenshot\` (for AI review)

## Workflow

### New Project

1. Run \`slide-gen init <directory>\` to initialize
2. Gather requirements from user
3. Check templates with \`slide-gen templates list --format llm\`
4. Create presentation.yaml
5. Validate and convert

### Existing Project

1. Read presentation.yaml
2. Edit according to user request
3. Validate and convert

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
`;
}
