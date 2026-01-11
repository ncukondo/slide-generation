/**
 * Generate AGENTS.md content for OpenCode
 */
export function generateAgentsMd(): string {
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
`;
}
