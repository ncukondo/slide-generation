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
slide-gen screenshot presentation.yaml --format ai
\`\`\`

## Options

| Option | Description | Default |
|--------|-------------|---------|
| \`--format <fmt>\` | Output format (png/jpeg/ai) | png |
| \`--slide <number>\` | Screenshot specific slide only | All |
| \`--contact-sheet\` | Generate overview of all slides | false |
| \`--columns <num>\` | Contact sheet columns | 2 |
| \`--width <pixels>\` | Image width | 1280 (ai: 640) |
| \`--quality <num>\` | JPEG quality (1-100) | 80 |
| \`--output <dir>\` | Output directory | ./screenshots |

## AI Optimization Mode

Use \`--format ai\` for token-efficient screenshots:
- 640px width (75% token reduction)
- JPEG format
- Shows estimated token consumption

\`\`\`bash
# AI-optimized screenshots
slide-gen screenshot presentation.yaml --format ai

# Contact sheet for overview
slide-gen screenshot presentation.yaml --contact-sheet

# AI-optimized contact sheet
slide-gen screenshot presentation.yaml --format ai --contact-sheet
\`\`\`

## Token Efficiency

| Format | Width | Est. Tokens/slide |
|--------|-------|-------------------|
| png/jpeg | 1280 | ~1,229 |
| ai | 640 | ~308 (~75% reduction) |

## Visual Feedback Workflow

1. Take screenshot: \`slide-gen screenshot presentation.yaml --format ai\`
2. Review image: \`Read ./screenshots/presentation.001.jpeg\`
3. Identify issues (layout, text, icons)
4. Edit presentation.yaml
5. Repeat until satisfied
`;
}
