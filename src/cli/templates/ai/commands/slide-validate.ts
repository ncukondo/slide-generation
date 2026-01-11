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

## Options

| Option | Description |
|--------|-------------|
| \`--format text\` | Human-readable output (default) |
| \`--format json\` | JSON output for programmatic use |
| \`--format llm\` | AI-optimized output with line numbers and fix hints |
| \`--strict\` | Treat warnings as errors |
| \`-c, --config <path>\` | Custom config file path |

## AI-Optimized Validation

Use \`--format llm\` for structured error output:

\`\`\`bash
slide-gen validate presentation.yaml --format llm
\`\`\`

### Example Output (Error)

\`\`\`
Validation failed.

Error at line 15, Slide 2 (bullet-list):
  Missing required field: items

Fix:
  content:
    title: "Your title"
    items:
      - "Item 1"
      - "Item 2"
\`\`\`

### Example Output (Success)

\`\`\`
Validation passed. 5 slides validated.
\`\`\`

### Error Types and Hints

- **unknown_template**: Suggests \`slide-gen templates list --format llm\`
- **unknown_icon**: Suggests \`slide-gen icons search <query>\`
- **missing_field**: Shows fix example from template definition
- **invalid_type**: Shows expected format from template definition
`;
}

