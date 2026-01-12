/**
 * Generate .claude/commands/slide-references.md content
 */
export function generateSlideReferencesCommand(): string {
  return `Manage references and citations for the presentation.

## Available Actions

### 1. Analyze - Find citation needs
Analyze the scenario/content for statements that need citations.

### 2. Search - Find in library
Search existing reference-manager library for relevant papers.

### 3. Add - Add new reference
Add a reference from PMID, DOI, URL, or file.

### 4. List - Show all references
List all references currently in the library.

## Usage

### Analyze scenario for citation needs:
\`\`\`bash
# First, read the presentation
cat presentation.yaml

# Then analyze content for citation requirements
\`\`\`
Report statements needing citations with slide numbers.

### Search library:
\`\`\`bash
ref search "keyword" --format json
ref list --format json
\`\`\`

### Add reference:
\`\`\`bash
# From PMID
ref add pmid:38941256

# From DOI
ref add "10.1038/s41591-024-xxxxx"

# From URL (extract identifier first)
# PubMed URL -> extract PMID
# DOI URL -> extract DOI

# From file
ref add paper.bib
ref add export.ris
\`\`\`

### Validate citations:
\`\`\`bash
slide-gen validate presentation.yaml
\`\`\`

## Notes

- Always check library before requesting new references
- Extract PMID/DOI from URLs before adding
- Report missing citations with suggested search terms
- Update presentation.yaml with [@id] format
`;
}
