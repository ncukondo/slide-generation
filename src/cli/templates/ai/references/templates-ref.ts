/**
 * Generate references/templates.md content
 * Contains detailed template parameter reference
 */
export function generateTemplatesRef(): string {
  return `# Template Reference

## Basic Templates

### title
Full-screen title slide.
- \`title\`: Main title (required)
- \`subtitle\`: Subtitle (optional)
- \`author\`: Author name (optional)

### content
General content slide with body text.
- \`title\`: Slide title (required)
- \`body\`: Body text with markdown support (required)

### section
Section divider slide.
- \`title\`: Section title (required)
- \`subtitle\`: Section description (optional)

### bullet-list
Slide with bullet points.
- \`title\`: Slide title (required)
- \`items\`: Array of strings (required)

### two-column
Two-column layout.
- \`title\`: Slide title (required)
- \`left\`: Left column content (required)
- \`right\`: Right column content (required)

### end
Closing slide.
- \`title\`: Closing title (required)
- \`subtitle\`: Closing subtitle (optional)

## Diagram Templates

### cycle-diagram
Circular process diagram (3-6 nodes).
- \`title\`: Slide title (required)
- \`nodes\`: Array of {label, icon?, color?} (required)

### flow-diagram
Linear flow diagram.
- \`title\`: Slide title (required)
- \`steps\`: Array of {label, icon?, description?} (required)

### comparison
Side-by-side comparison.
- \`title\`: Slide title (required)
- \`items\`: Array of comparison items (required)

## Data Templates

### table
Data table display.
- \`title\`: Slide title (required)
- \`headers\`: Array of column headers (required)
- \`rows\`: Array of row data arrays (required)

### chart
Chart visualization.
- \`title\`: Slide title (required)
- \`type\`: Chart type (bar, line, pie)
- \`data\`: Chart data

## Image Templates

### image-full
Full-screen background image.
- \`image\`: Image path (required)
- \`title\`: Overlay title (optional)
- \`overlay\`: none|dark|light|gradient (optional)

### image-text
Image with text side by side.
- \`title\`: Slide title (required)
- \`image\`: Image path (required)
- \`image_position\`: left|right (optional, default: left)
- \`items\` or \`text\`: Content (required)

## Run \`slide-gen templates list --format llm\` for full list.
`;
}
