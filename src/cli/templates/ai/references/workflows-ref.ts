/**
 * Generate references/workflows.md content
 * Contains source collection and image collaboration workflows
 */
export function generateWorkflowsRef(): string {
  return `# Workflow Reference

## Source Collection Flow

### Pattern A: Directory Exploration
When user has materials in a directory:
1. Ask for directory path
2. Scan with Glob tool
3. Read and classify files
4. Summarize and confirm with user
5. Create sources/sources.yaml

### Pattern B: Supplement Mode
When user has partial materials:
1. Read provided file/text
2. Analyze content
3. Identify missing information
4. Ask supplementary questions
5. Create sources/sources.yaml

### Pattern C: Interview Mode
When user has no materials:
1. Ask basic questions (purpose, audience, duration)
2. Deep-dive based on purpose
3. Propose slide structure
4. Iterate based on feedback
5. Create sources/sources.yaml

## Slide Creation Flow

### Step 1: Gather Requirements
- Understand presentation purpose
- Identify target audience
- Determine slide count and duration

### Step 2: Template Selection
- Run \`slide-gen templates list --format llm\`
- Match templates to content types
- Plan slide sequence

### Step 3: Create Source File
- Create presentation.yaml
- Use appropriate templates for each slide
- Add icons where helpful

### Step 4: Validate
- Run \`slide-gen validate presentation.yaml\`
- Fix any validation errors
- Check template parameters

### Step 5: Convert and Review
- Run \`slide-gen convert presentation.yaml\`
- Use \`slide-gen screenshot\` for visual review
- Iterate based on feedback

## Image Collaboration Flow

### Phase 1: Requirement Derivation
Analyze presentation scenario to identify needed images.

### Phase 2: Image Request
Generate specific image requests with:
- Purpose and context
- Recommended specifications
- File naming convention

### Phase 3: Verification
After user provides images:
1. Visual inspection (Read tool)
2. Check metadata if available
3. Verify compliance and permissions
4. Provide feedback

### Phase 4: Iteration
Handle adjustments (cropping, replacement) as needed.
`;
}
