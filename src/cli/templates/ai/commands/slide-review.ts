/**
 * Generate .claude/commands/slide-review.md content
 * Visual review workflow for slides
 */
export function generateSlideReviewCommand(): string {
  return `Review slides visually and iterate on improvements.

## Workflow

1. **Take AI-optimized screenshots**:
   \`\`\`bash
   slide-gen screenshot $ARGUMENTS --format ai
   \`\`\`
   If no argument: \`slide-gen screenshot presentation.yaml --format ai\`

2. **Review each slide image**:
   \`\`\`
   Read ./screenshots/presentation.001.jpeg
   Read ./screenshots/presentation.002.jpeg
   ...
   \`\`\`

3. **Check for issues**:
   - Text overflow or awkward wrapping
   - Poor visual balance (too empty / too cluttered)
   - Icon appropriateness
   - Color contrast and readability
   - Diagram clarity

4. **Report findings** to user with specific slide numbers

5. **If issues found**, edit presentation.yaml and repeat from step 1

## Quick Overview

For a quick overview of all slides:
\`\`\`bash
slide-gen screenshot presentation.yaml --contact-sheet
Read ./screenshots/presentation-contact.png
\`\`\`

## Token Efficiency

Always use \`--format ai\` for ~75% token reduction:
- Default: ~1,229 tokens/slide
- AI mode: ~308 tokens/slide

## Common Issues Checklist

| Issue | What to Look For | Fix |
|-------|------------------|-----|
| Text overflow | Text cut off or wrapped | Shorten text, use bullet-list |
| Empty space | Large blank areas | Add content or use different template |
| Cluttered | Too much content | Split into multiple slides |
| Poor contrast | Hard to read text | Adjust colors in theme |
| Icon mismatch | Icon doesn't fit context | Search for better icon |

## Example Session

\`\`\`bash
# Initial review
slide-gen screenshot presentation.yaml --format ai

# Check slide 3
Read ./screenshots/presentation.003.jpeg
# Notice: "Title text is too long"

# Edit presentation.yaml to shorten title

# Re-take screenshot for slide 3
slide-gen screenshot presentation.yaml --format ai --slide 3

# Verify fix
Read ./screenshots/presentation.003.jpeg
\`\`\`
`;
}
