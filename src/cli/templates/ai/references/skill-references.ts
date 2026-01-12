/**
 * Generate reference skill markdown for AI agents
 */
export function generateReferenceSkillMd(): string {
  return `## Reference Management Skill

### When to Invoke

Use this skill when:
- Creating academic or research presentations
- User mentions needing citations or references
- Scenario contains statistical claims or research findings
- User provides literature (URL, PDF, DOI, PMID)

### Citation Requirement Analysis

Analyze scenario/script for statements requiring citations:

| Statement Type | Requirement | Example |
|---------------|-------------|---------|
| Statistical claims | Required | "Accuracy exceeds 90%" |
| Research findings | Required | "Studies show that..." |
| Methodology references | Required | "Using the XYZ method" |
| Comparative claims | Recommended | "Better than conventional" |
| Historical facts | Recommended | "First introduced in 2020" |
| General knowledge | Not required | "AI is widely used" |

### Workflow

#### Phase 1: Analyze Content
1. Read scenario/script thoroughly
2. Identify statements requiring citations
3. Categorize as Required or Recommended
4. Note the slide number and exact statement

#### Phase 2: Search Existing Library
\`\`\`bash
# List all references
ref list --format json

# Search by keyword
ref search "diagnostic accuracy" --format json
\`\`\`

#### Phase 3: Match or Request

**If found in library:**
- Confirm relevance with user
- Insert \`[@id]\` citation in YAML

**If not found:**
- Present clear request to user
- Specify what type of source is needed
- Provide suggested search terms

#### Phase 4: Add New References

From user-provided input:

\`\`\`bash
# From PMID
ref add pmid:38941256

# From DOI
ref add "10.1038/s41591-024-xxxxx"

# From ISBN
ref add "ISBN:978-4-00-000000-0"

# From BibTeX file
ref add paper.bib
\`\`\`

#### Phase 5: Insert Citations

Update presentation.yaml:
\`\`\`yaml
items:
  - "This claim is supported [@smith2024]"
\`\`\`

### Extracting from Non-Standard Input

#### URL Patterns
- PubMed: Extract PMID from \`pubmed.ncbi.nlm.nih.gov/XXXXXXXX\`
- DOI: Extract from \`doi.org/10.XXXX/XXXXX\`
- Publisher sites: Fetch page, extract DOI from metadata

#### PDF Files
1. Read PDF file
2. Extract DOI from first page or metadata
3. If not found, extract title and search databases

#### Free Text
1. Parse author, year, journal information
2. Search PubMed/CrossRef
3. Present candidates for user confirmation

### User Communication Templates

**Analyzing content:**
\`\`\`
I've analyzed your scenario and identified citation needs:

Required Citations (N)
----------------------
1. Slide X: '[statement]'
   -> Needs: [type of source]

Recommended Citations (M)
-------------------------
...

Let me check your reference library...
\`\`\`

**Requesting references:**
\`\`\`
I need your help finding references:

[REQUIRED] Reference 1: [Topic]
-------------------------------
Purpose: Support claim '[statement]' on Slide X

Ideal source type:
- [type1]
- [type2]

Suggested search terms:
- [term1]
- [term2]

How to provide:
A) DOI or PMID (e.g., 'PMID: 38941256')
B) URL (PubMed, journal site, etc.)
C) PDF file
D) Manual citation details
\`\`\`

**Confirming addition:**
\`\`\`
Reference added successfully:
-----------------------------
Citation key: [@id]
Authors: ...
Title: '...'
Journal: ...
Year: XXXX

I'll use this for Slide X.
\`\`\`
`;
}
