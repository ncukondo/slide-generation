/**
 * Generate .claude/commands/slide-validate.md content
 */
export function generateSlideValidateCommand(): string {
  return `Validate slide source file.

## Command

\`\`\`bash
slide-gen validate $ARGUMENTS
\`\`\`

If no argument provided:
\`\`\`bash
slide-gen validate presentation.yaml
\`\`\`
`;
}
