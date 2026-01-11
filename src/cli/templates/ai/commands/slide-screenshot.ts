/**
 * Generate .claude/commands/slide-screenshot.md content
 */
export function generateSlideScreenshotCommand(): string {
  return `Take screenshots of slides for AI review.

## Command

\`\`\`bash
slide-gen screenshot $ARGUMENTS
\`\`\`

If no argument provided:
\`\`\`bash
slide-gen screenshot presentation.yaml -o screenshots/
\`\`\`

## Options

- \`--slide <number>\`: Screenshot specific slide only
- \`--width <pixels>\`: Image width (default: 1280)
- \`--output <dir>\`: Output directory

## After Screenshot

Read the screenshot images to review slide content and provide feedback.
`;
}
