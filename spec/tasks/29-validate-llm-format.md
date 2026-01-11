# Task: Validate LLM Format Output

## Purpose

Add `--format llm` option to `slide-gen validate` command, providing AI agents with line numbers, fix hints, and examples for self-correction. Also update AgentSkills templates to document the new feature.

## Context

- **Related spec**: [spec/ai-integration.md](../ai-integration.md)
- **Dependencies**: [12-cli-validate](./completed/12-cli-validate.md), [22-ai-integration](./completed/22-ai-integration.md)
- **Related source**:
  - `src/cli/commands/validate.ts`
  - `src/cli/templates/ai/skill-md.ts`
  - `src/cli/templates/ai/commands/slide-validate.ts`

## Design

### Output Format (Error)

```
Validation failed.

Error at line 15, Slide 2 (bullet-list):
  Missing required field: items

Fix:
  content:
    title: "Your title"
    items:
      - "Item 1"
      - "Item 2"

---

Error at line 28, Slide 4 (cycle-diagram):
  Invalid node format: missing 'label' field

Fix:
  nodes:
    - { label: "Step 1", icon: "start", color: "#4CAF50" }
    - { label: "Step 2", icon: "process", color: "#2196F3" }
```

### Output Format (Success)

```
Validation passed. 5 slides validated.
```

### Key Features

1. **Line numbers**: Extract from YAML parser
2. **Fix examples**: Generate from template's example field
3. **Contextual hints**: Provide command suggestions based on error type

## TDD Cycle

1. **Red**: Write failing test
2. **Green**: Minimal implementation to pass
3. **Refactor**: Run `pnpm lint && pnpm typecheck`

## Implementation Steps

### Step 1: Add YAML Line Number Extraction

**Goal**: Track line numbers for each slide during parsing

**Test**: `src/core/parser.test.ts`

```typescript
describe('Parser - line numbers', () => {
  it('should track line numbers for each slide', () => {
    const yaml = `meta:
  title: "Test"
slides:
  - template: title
    content:
      title: "Slide 1"
  - template: bullet-list
    content:
      title: "Slide 2"
`;
    const parser = new Parser();
    const result = parser.parseWithLineInfo(yaml);
    expect(result.slideLines[0]).toBe(4);
    expect(result.slideLines[1]).toBe(8);
  });
});
```

**Implementation**: `src/core/parser.ts`

```typescript
import { parseDocument, LineCounter } from 'yaml';

export interface ParseResultWithLines extends ParsedPresentation {
  slideLines: number[];
}

export class Parser {
  parseWithLineInfo(yamlContent: string): ParseResultWithLines {
    const lineCounter = new LineCounter();
    const doc = parseDocument(yamlContent, { lineCounter });
    // Extract line numbers from slides node
  }
}
```

---

### Step 2: Define Structured Error Types

**Goal**: Structure error info with line numbers and template context

**Implementation**: `src/cli/commands/validate.ts`

```typescript
export interface StructuredValidationError {
  slide: number;
  line?: number;
  template: string;
  field?: string;
  message: string;
  errorType: 'missing_field' | 'invalid_type' | 'unknown_template' | 'unknown_icon' | 'schema_error';
}
```

---

### Step 3: Implement LLM Error Formatter

**Goal**: Convert errors to LLM-friendly text with fix examples

**Test**: `src/cli/commands/validate.test.ts`

```typescript
describe('formatLlmValidationResult', () => {
  it('should format error with line number and fix example', () => {
    // ...
  });

  it('should format multiple errors with separators', () => {
    // Errors separated by ---
  });

  it('should show success message for valid result', () => {
    // "Validation passed. N slides validated."
  });
});
```

---

### Step 4: Integrate --format llm Option

**Goal**: Add `--format llm` to validate command

**Implementation**: `src/cli/commands/validate.ts`

```typescript
interface ValidateOptions {
  format?: 'text' | 'json' | 'llm';  // Add 'llm'
}
```

---

### Step 5: Add Error-Type Specific Hints

**Goal**: Provide actionable hints based on error type

```typescript
function getHintForErrorType(errorType: string): string | null {
  switch (errorType) {
    case 'unknown_template':
      return 'Run `slide-gen templates list --format llm` to see available templates.';
    case 'unknown_icon':
      return 'Run `slide-gen icons search <query>` to find icons.';
    default:
      return null;
  }
}
```

---

### Step 6: Update AgentSkills Templates

**Goal**: Update SKILL.md and slide-validate.md with new feature

**Files**:
- `src/cli/templates/ai/skill-md.ts`: Add `validate --format llm` to AI-Optimized Output section
- `src/cli/templates/ai/commands/slide-validate.ts`: Add option descriptions and output examples

---

## E2E Test

**Test file**: `tests/e2e/validate-llm-format.test.ts`

- Test LLM format output with fix examples
- Test line number inclusion
- Test success message for valid files
- Test command hints for unknown templates

## Acceptance Criteria

- [ ] All tests pass (`pnpm test`)
- [ ] Type check passes (`pnpm typecheck`)
- [ ] Lint passes (`pnpm lint`)
- [ ] E2E tests pass
- [ ] `--format llm` produces AI-friendly output
- [ ] Errors include line numbers
- [ ] Errors include fix examples from templates
- [ ] Error-specific hints are displayed
- [ ] AgentSkills templates are updated

## Files Changed

- [ ] `src/core/parser.ts` - Add `parseWithLineInfo`
- [ ] `src/core/parser.test.ts` - Add tests
- [ ] `src/cli/commands/validate.ts` - Implement LLM format
- [ ] `src/cli/commands/validate.test.ts` - Add tests
- [ ] `src/cli/templates/ai/skill-md.ts` - Add validate --format llm
- [ ] `src/cli/templates/ai/commands/slide-validate.ts` - Add option docs
- [ ] `tests/e2e/validate-llm-format.test.ts` - New E2E test
