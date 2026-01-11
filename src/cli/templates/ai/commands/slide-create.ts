/**
 * Generate .claude/commands/slide-create.md content
 */
export function generateSlideCreateCommand(): string {
  return `Create slides from user requirements.

## Steps

1. Get manuscript/requirements from user
2. Check templates: \`slide-gen templates list --format llm\`
3. Select appropriate templates
4. Create or edit presentation.yaml
5. Validate: \`slide-gen validate presentation.yaml\`
6. Fix any errors
7. Convert: \`slide-gen convert presentation.yaml -o slides.md\`
8. Report results

## Notes

- Select appropriate template for each slide
- Search icons if needed: \`slide-gen icons search\`
- Fix all validation errors before conversion
`;
}
