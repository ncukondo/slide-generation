/**
 * Generate CLAUDE.md content for Claude Code
 */
export function generateClaudeMd(): string {
  return `# Slide Generation Project

This project uses slide-gen to create Marp slides from YAML source files.

## Quick Start

\`\`\`bash
# Validate
slide-gen validate presentation.yaml

# Convert
slide-gen convert presentation.yaml -o slides.md

# Preview
slide-gen preview presentation.yaml
\`\`\`

## Commands

| Command | Description |
|---------|-------------|
| \`slide-gen convert <input>\` | Convert YAML to Marp Markdown |
| \`slide-gen validate <input>\` | Validate source file |
| \`slide-gen templates list\` | List available templates |
| \`slide-gen templates info <name>\` | Get template details |
| \`slide-gen icons search <query>\` | Search for icons |
| \`slide-gen preview <input>\` | Preview in browser |
| \`slide-gen screenshot <input>\` | Take screenshots |

## AI-Optimized Output

For token-efficient output, use \`--format llm\`:
\`\`\`bash
slide-gen templates list --format llm
slide-gen templates info bullet-list --format llm
\`\`\`

## Project Structure

- \`presentation.yaml\` - Slide source file
- \`config.yaml\` - Project configuration
- \`themes/\` - Custom themes
- \`icons/custom/\` - Custom icons

## Skills

This project includes AgentSkills at \`.skills/slide-assistant/\`.
Read \`.skills/slide-assistant/SKILL.md\` for detailed instructions.

## Slash Commands

- \`/slide-create\` - Create slides from requirements
- \`/slide-validate\` - Validate slide source file
- \`/slide-preview\` - Preview slides in browser
- \`/slide-screenshot\` - Take screenshots for review
- \`/slide-review\` - Visual review and iteration workflow
- \`/slide-theme\` - Adjust theme and styling

## Important: Visual Review

**After creating or editing slides, always run visual review:**

\`\`\`bash
/slide-review
\`\`\`

Or manually:
1. \`slide-gen screenshot presentation.yaml --format ai\`
2. \`Read ./screenshots/presentation.001.jpeg\`
3. Check layout, text overflow, visual balance
4. Edit and repeat until satisfied

This ensures slides look correct before delivery.
`;
}
