/**
 * Generate .claude/commands/slide-theme.md content
 */
export function generateSlideThemeCommand(): string {
  return `Adjust slide theme and styling.

## Steps

1. Read current theme settings (themes/custom.css)
2. Confirm user requirements
3. Edit CSS
4. Regenerate: \`slide-gen convert\`
5. Take screenshot: \`slide-gen screenshot\`
6. Review and report to user

## Adjustable Items

- Background color
- Font family and size
- Heading styles
- Color scheme
- Margins and layout
`;
}
