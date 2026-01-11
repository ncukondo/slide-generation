/**
 * Generate .claude/commands/slide-preview.md content
 */
export function generateSlidePreviewCommand(): string {
  return `Preview slides in browser.

## Command

\`\`\`bash
slide-gen preview $ARGUMENTS
\`\`\`

If no argument provided:
\`\`\`bash
slide-gen preview presentation.yaml
\`\`\`

## Options

- \`--gallery\` or \`-g\`: Show thumbnail gallery of all slides
- \`--slide <number>\`: Preview specific slide
`;
}
