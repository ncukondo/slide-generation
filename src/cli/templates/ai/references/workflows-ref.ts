/**
 * Generate references/workflows.md content
 * Contains source collection and image collaboration workflows
 */
export function generateWorkflowsRef(): string {
  return `# Workflow Reference

## Entry Point

**Always start by asking this question:**

> "Let's create slides. What materials do you have?
>
> A) I have detailed materials organized in a directory
>    (scenarios, scripts, data files, images, etc.)
>
> B) I have partial materials like a scenario or script
>    (but need to supplement with additional info)
>
> C) I don't have materials yet
>    (starting from scratch, will collect info through dialogue)"

Based on the answer, follow the appropriate pattern below.

## Source Collection Flow

### Pattern A: Explore Mode (Detailed Materials Exist)

When user has materials organized in a directory:

1. **Ask for the directory path**
2. **Scan directory structure** with Glob tool
3. **Read and analyze each file**
4. **Classify files** into categories:
   - Scenario/scripts
   - Data files (CSV, JSON, etc.)
   - Images and diagrams
   - Reference documents
5. **Summarize findings** and confirm with user
6. **Ask clarifying questions** about gaps
7. **Configure \`sources/\` directory** with organized materials
8. Proceed to slide creation

### Pattern B: Supplement Mode (Partial Materials)

When user has only a scenario or partial materials:

1. **Ask user** to provide the file path or paste content
2. **Analyze the content** thoroughly
3. **Identify what information is present** vs. missing
4. **Ask targeted questions** to fill gaps:
   - Purpose and audience
   - Duration and format
   - Key messages
   - Available data/examples
5. **Load any additional files** user mentions
6. **Configure \`sources/\` directory**
7. Proceed to slide creation

### Pattern C: Interview Mode (Starting from Scratch)

When user has no materials:

1. **Ask basic questions**:
   - "What is this presentation about?"
   - "Who is the audience?"
   - "How long is the presentation?"
2. **Ask purpose-specific questions** (proposal, report, introduction, etc.)
3. **Collect data and examples** user can provide
4. **Propose slide structure** for approval
5. **Incorporate feedback**
6. **Configure \`sources/\` directory** from conversation
7. Proceed to slide creation

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
