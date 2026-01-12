# 文献引用連携仕様

## 概要

本システムは [reference-manager](https://github.com/ncukondo/reference-manager) と連携し、スライド内での文献引用を簡潔に記述・展開できます。

## reference-manager との連携

### 接続方式

CLI経由での連携を採用します：

```yaml
# config.yaml
references:
  enabled: true
  connection:
    type: cli
    command: "ref"           # reference-manager CLIコマンド
  defaults:
    locale: "ja-JP"
```

### データ形式

reference-managerはCSL-JSON形式でデータを管理しています。以下のフィールドを引用フォーマットに使用します：

| フィールド | 用途 |
|-----------|------|
| `id` | 引用キー（例: smith2024） |
| `author` | 著者情報 |
| `issued` | 発行年 |
| `title` | タイトル |
| `DOI` | DOI（存在する場合） |
| `PMID` | PubMed ID（存在する場合） |
| `container-title` | 掲載誌名 |

## 引用記法

### 基本記法（Pandoc互換）

文中での引用は `[@id]` 形式を使用します：

```yaml
items:
  # 単一引用
  - "この手法は有効である [@smith2024]"

  # 複数引用
  - "複数の研究 [@smith2024; @tanaka2023] が示している"

  # 文中への挿入
  - "[@johnson2022] によると、この現象は..."

  # ページ番号付き
  - "詳細は文献 [@smith2024, p.42] を参照"
```

### 構造化引用（quoteテンプレート用）

```yaml
- template: quote
  content:
    text: "引用する文章"
    source: "@smith2024"
    page: "p.42"
```

## 引用フォーマット

### インライン引用形式

```
(著者, 年; PMID: xxxxx)    ← PMIDがある場合
(著者, 年; DOI: xxxxx)     ← PMIDなし、DOIがある場合
(著者, 年)                  ← どちらもない場合
```

### 具体例

| 入力 | 出力例 |
|------|--------|
| `[@smith2024]` | (Smith et al., 2024; PMID: 12345678) |
| `[@tanaka2023]` | (田中, 2023; DOI: 10.1234/example) |
| `[@johnson2022]` | (Johnson & Williams, 2022) |
| `[@smith2024; @tanaka2023]` | (Smith et al., 2024; PMID: 12345678), (田中, 2023; DOI: 10.1234/example) |

### 著者表記ルール

| 著者数 | 表記 |
|--------|------|
| 1名 | Smith |
| 2名 | Smith & Johnson |
| 3名以上 | Smith et al. |

日本語著者の場合は姓のみ表示：

| 著者数 | 表記 |
|--------|------|
| 1名 | 田中 |
| 2名 | 田中・山田 |
| 3名以上 | 田中ほか |

## 参考文献スライド

### 配置方法

```yaml
slides:
  # ... 本編スライド ...

  - template: bibliography
    content:
      title: "参考文献"
      # 以下はオプション
      sort: author        # author | year | citation-order
      style: full         # full | compact
```

### 出力形式

```markdown
---
<!-- _class: bibliography -->

# 参考文献

1. Smith, J., Johnson, A., & Williams, B. (2024). Effective methods in modern research. *Journal of Advanced Studies*, 15(2), 123-145. PMID: 12345678

2. 田中太郎, 山田花子. (2023). 日本における研究動向の分析. 学術研究誌, 10(1), 50-65. DOI: 10.1234/example

3. Johnson, A., & Williams, B. (2022). A comprehensive review. *Annual Review*, 8(4), 200-220.
```

### フルcitation形式

```
著者. (年). タイトル. 誌名, 巻(号), ページ. [PMID: xxx | DOI: xxx]
```

## 実装詳細

### 引用抽出

```typescript
// src/references/extractor.ts

// [@id] または [@id1; @id2] パターン
const CITATION_PATTERN = /\[@([\w-]+)(?:,\s*([^[\]]+))?\](?:;\s*@([\w-]+)(?:,\s*([^[\]]+))?]?)*/g;

interface Citation {
  id: string;           // 引用キー
  locator?: string;     // ページ番号など
}

function extractCitations(text: string): Citation[] {
  // テキストから全ての引用を抽出
}
```

### 引用フォーマッタ

```typescript
// src/references/formatter.ts

interface CSLItem {
  id: string;
  author?: Author[];
  issued?: { 'date-parts': number[][] };
  DOI?: string;
  PMID?: string;
  title?: string;
  'container-title'?: string;
  // ...
}

class CitationFormatter {
  // インライン引用を生成
  formatInline(item: CSLItem): string {
    const author = this.formatAuthor(item.author);
    const year = this.getYear(item.issued);
    const identifier = this.getIdentifier(item);

    if (identifier) {
      return `(${author}, ${year}; ${identifier})`;
    }
    return `(${author}, ${year})`;
  }

  // 識別子を取得（PMID優先）
  private getIdentifier(item: CSLItem): string | null {
    if (item.PMID) {
      return `PMID: ${item.PMID}`;
    }
    if (item.DOI) {
      return `DOI: ${item.DOI}`;
    }
    return null;
  }

  // フルcitationを生成
  formatFull(item: CSLItem): string {
    // 参考文献スライド用のフル形式
  }
}
```

### reference-manager連携

```typescript
// src/references/manager.ts

class ReferenceManagerClient {
  constructor(private command: string = 'ref') {}

  // 引用キーから書誌情報を取得
  async getReference(id: string): Promise<CSLItem | null> {
    const result = await exec(`${this.command} list --id ${id} --format json`);
    return JSON.parse(result)[0] || null;
  }

  // 複数の引用を一括取得
  async getReferences(ids: string[]): Promise<Map<string, CSLItem>> {
    const result = await exec(`${this.command} list --format json`);
    const all = JSON.parse(result);
    return new Map(
      all.filter(item => ids.includes(item.id))
         .map(item => [item.id, item])
    );
  }

  // 引用キーの存在確認
  async exists(id: string): Promise<boolean> {
    const ref = await this.getReference(id);
    return ref !== null;
  }
}
```

## 変換フロー

```
1. ソースファイル解析
        │
        ▼
2. 全スライドから [@id] パターンを収集
        │
        ▼
3. reference-manager から書誌情報を一括取得
   $ ref list --format json
        │
        ▼
4. 引用の検証
   - 存在しない引用キーを警告
        │
        ▼
5. インライン引用を展開
   [@smith2024] → (Smith et al., 2024; PMID: 12345678)
        │
        ▼
6. bibliography テンプレートに引用一覧を注入
        │
        ▼
7. Marp Markdown 出力
```

## エラーハンドリング

### 存在しない引用キー

```
Warning: Citation key not found: @unknown2024
  - Slide 3, line: "この研究 [@unknown2024] によると"
  - Suggestion: Check the reference-manager library or add the reference first
```

### reference-manager未インストール

```
Error: reference-manager CLI not found
  - Command 'ref' is not available
  - Install: npm install -g @ncukondo/reference-manager
  - Or disable references: references.enabled = false
```

## 設定オプション

```yaml
# config.yaml
references:
  enabled: true

  connection:
    type: cli
    command: "ref"

  format:
    # インライン引用
    inline:
      author_sep: ", "           # 著者と年の区切り
      identifier_sep: "; "       # 識別子の区切り
      multi_sep: "), ("          # 複数引用の区切り

    # 著者表記
    author:
      max_authors: 2             # これを超えると "et al."
      et_al: "et al."            # 省略表記（英語）
      et_al_ja: "ほか"           # 省略表記（日本語）

    # フルcitation
    full:
      include_doi: true
      include_pmid: true
      doi_prefix: "DOI: "
      pmid_prefix: "PMID: "

  # 参考文献スライド
  bibliography:
    default_sort: citation-order  # author | year | citation-order
    numbering: true               # 番号付け
```

## 使用例

### 入力

```yaml
meta:
  title: "研究発表"
  references:
    enabled: true

slides:
  - template: bullet-list
    content:
      title: "先行研究"
      items:
        - "従来手法の限界 [@smith2024]"
        - "新たなアプローチ [@tanaka2023; @johnson2022]"

  - template: quote
    content:
      text: "この発見は画期的である"
      source: "@smith2024"
      page: "p.42"

  - template: bibliography
    content:
      title: "参考文献"
```

### 出力

```markdown
---
marp: true
theme: default
---

# 先行研究

- 従来手法の限界 (Smith et al., 2024; PMID: 12345678)
- 新たなアプローチ (田中, 2023; DOI: 10.1234/example), (Johnson & Williams, 2022)

---

<!-- _class: quote -->

> この発見は画期的である

— Smith et al. (2024), p.42

---

<!-- _class: bibliography -->

# 参考文献

1. Smith, J., Johnson, A., & Williams, B. (2024). Effective methods in modern research. *Journal of Advanced Studies*, 15(2), 123-145. PMID: 12345678

2. 田中太郎, 山田花子. (2023). 日本における研究動向の分析. 学術研究誌, 10(1), 50-65. DOI: 10.1234/example

3. Johnson, A., & Williams, B. (2022). A comprehensive review. *Annual Review*, 8(4), 200-220.
```

---

## AI Agent Collaboration Workflow

This section defines how AI agents collaborate with users to identify, locate, and cite academic references during slide creation.

### Design Principles

1. **Evidence-based content**: AI identifies claims requiring citations
2. **Library-first approach**: Check existing reference-manager library before requesting new references
3. **User collaboration**: Guide users to provide missing references with clear requirements
4. **Traceability**: Track reference needs in sources.yaml

### Reference Requirement Analysis

#### When Citations Are Required

AI analyzes scenario/script content and identifies statements requiring citations:

| Statement Type | Citation Required | Example |
|---------------|-------------------|---------|
| Statistical claims | Required | "Accuracy exceeds 90%" |
| Research findings | Required | "Studies show that..." |
| Methodology references | Required | "Using the XYZ method" |
| Comparative claims | Recommended | "Better than conventional approaches" |
| Historical facts | Recommended | "First introduced in 2020" |
| General knowledge | Not required | "Machine learning is widely used" |

#### Analysis Output Format

```yaml
# AI internal analysis (recorded in sources/conversation/)
citation_analysis:
  - slide: 3
    statement: "AI diagnostic accuracy exceeds 90%"
    requirement: required
    reason: "Statistical claim requires evidence"
    suggested_search:
      - "AI diagnostic accuracy systematic review"
      - "machine learning medical diagnosis meta-analysis"

  - slide: 5
    statement: "This method outperforms traditional approaches"
    requirement: recommended
    reason: "Comparative claim benefits from citation"
    suggested_search:
      - "comparative study [topic] methods"
```

### Workflow: Finding and Citing References

#### Flow Overview

```
┌─────────────────────────────────────────────────────────────────┐
│ Step 1: Scenario Analysis                                        │
│                                                                 │
│ AI reads scenario/script and identifies citation needs          │
│                                                                 │
│ Output: List of statements requiring citations                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ Step 2: Search Existing Library                                  │
│                                                                 │
│ AI: `ref list --format json`                                    │
│ AI: `ref search "<keyword>" --format json`                      │
│                                                                 │
│ Check if relevant references already exist in library           │
└─────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              ▼                               ▼
┌──────────────────────────┐    ┌──────────────────────────┐
│ Found: Use existing ref  │    │ Not found: Request from  │
│                          │    │ user                     │
│ Insert [@id] in YAML     │    │                          │
└──────────────────────────┘    └──────────────────────────┘
                                              │
                                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ Step 3: Request Missing References                               │
│                                                                 │
│ AI presents clear request with:                                 │
│ - What is needed and why                                        │
│ - Priority (required/recommended)                               │
│ - Suggested search terms                                        │
│ - Acceptable input formats (DOI, PMID, PDF, etc.)              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ Step 4: Add References to Library                                │
│                                                                 │
│ Based on user input:                                            │
│ - DOI/PMID: `ref add --doi <doi>` or `ref add --pmid <pmid>`   │
│ - Manual entry: Guide user through required fields              │
│                                                                 │
│ Confirm addition and provide citation key                       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ Step 5: Insert Citations                                         │
│                                                                 │
│ Update presentation.yaml with [@id] citations                   │
│ Update sources.yaml to track reference usage                    │
└─────────────────────────────────────────────────────────────────┘
```

#### Step 1: Scenario Analysis

AI analyzes the content and reports findings:

```
AI: "I've analyzed your scenario and identified citation needs:

  📚 Required Citations (3)
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  1. Slide 3: 'AI diagnostic accuracy exceeds 90%'
     → Needs: Primary research or meta-analysis on AI diagnostic accuracy

  2. Slide 5: 'The XYZ method proposed by Smith et al.'
     → Needs: Original paper describing XYZ method

  3. Slide 8: 'Cost reduction of 40% has been reported'
     → Needs: Economic analysis or case study

  📖 Recommended Citations (2)
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  4. Slide 2: Background on medical AI history
     → Would strengthen: Overview of field development

  5. Slide 10: Comparison with traditional methods
     → Would strengthen: Systematic comparison study

  Let me check your reference library for existing matches..."
```

#### Step 2: Library Search

AI searches the existing library:

```
AI: "I searched your reference library:

  ✓ Found matches (2)
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  • For 'XYZ method' (Slide 5):
    smith2023 - 'Introduction of XYZ Method for...'
    → I'll use [@smith2023]

  • For 'Medical AI history' (Slide 2):
    johnson2022 - 'A Decade of AI in Healthcare'
    → I'll use [@johnson2022]

  ✗ Not found (3)
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  • AI diagnostic accuracy (Slide 3) - Required
  • Cost reduction data (Slide 8) - Required
  • Comparison study (Slide 10) - Recommended"
```

#### Step 3: Request Missing References

AI presents a clear request:

```
AI: "I need your help finding 3 references:

  [REQUIRED] Reference 1: AI Diagnostic Accuracy
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Purpose: Support claim 'AI diagnostic accuracy exceeds 90%' on Slide 3

  Ideal source type:
  • Systematic review or meta-analysis (preferred)
  • Large-scale validation study

  Suggested search terms:
  • 'AI diagnostic accuracy systematic review'
  • 'deep learning medical imaging meta-analysis'

  [REQUIRED] Reference 2: Cost Reduction Data
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Purpose: Support claim '40% cost reduction' on Slide 8

  Ideal source type:
  • Health economics study
  • Implementation case study with cost analysis

  [RECOMMENDED] Reference 3: Comparison Study
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Purpose: Strengthen comparison on Slide 10

  Ideal source type:
  • Comparative effectiveness study

  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  How to provide references:

  A) Give me DOI or PMID
     Example: 'PMID: 38941256' or 'DOI: 10.1000/example'

  B) Share a URL
     PubMed, journal site, Google Scholar, Amazon, etc.
     Example: 'https://pubmed.ncbi.nlm.nih.gov/38941256/'

  C) Share a PDF file
     I'll extract the bibliographic information

  D) Provide citation details manually
     Authors, title, journal, year, etc."
```

#### Step 4: Adding References

Based on user response:

```
User: "For the accuracy study, use PMID: 38941256"

AI: "Adding reference...
    $ ref add --pmid 38941256

    ✓ Reference added successfully:
    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    Citation key: yamamoto2024
    Authors: Yamamoto, K., Tanaka, H., et al.
    Title: 'Systematic Review of AI Diagnostic Systems...'
    Journal: Nature Medicine
    Year: 2024
    PMID: 38941256

    You can cite this as [@yamamoto2024]"
```

#### Step 5: Citation Insertion

AI updates the presentation:

```yaml
# presentation.yaml (updated)
slides:
  - template: bullet-list
    content:
      title: "AI Performance"
      items:
        - "Diagnostic accuracy exceeds 90% [@yamamoto2024]"  # Added
```

### Tracking Reference Needs in sources.yaml

Missing and pending references are tracked:

```yaml
# sources/sources.yaml

references:
  # Status tracking
  status:
    required: 3
    found: 2
    pending: 1

  # Detailed tracking
  items:
    - id: yamamoto2024
      status: added
      slide: 3
      purpose: "AI diagnostic accuracy claim"
      added_date: "2025-01-10"

    - id: pending-cost-study
      status: pending
      slide: 8
      purpose: "40% cost reduction claim"
      requirement: required
      suggested_search:
        - "AI healthcare cost reduction study"
        - "machine learning implementation economics"
      notes: "User searching PubMed for suitable study"

    - id: smith2023
      status: existing
      slide: 5
      purpose: "XYZ method reference"
```

### Reference Management Commands for AI

AI uses these reference-manager commands:

| Command | Purpose | Example |
|---------|---------|---------|
| `ref list --format json` | Get all library references | Full library export |
| `ref search "<query>" --format json` | Search library | `ref search "diagnostic accuracy"` |
| `ref add --pmid <id>` | Add by PubMed ID | `ref add --pmid 38941256` |
| `ref add --doi <id>` | Add by DOI | `ref add --doi 10.1000/example` |
| `ref show <key>` | Show reference details | `ref show smith2024` |

### Validation Integration

During `slide-gen validate`, reference issues are reported:

```
$ slide-gen validate presentation.yaml

References:
  ✓ 5 citations found
  ⚠ 1 citation key not in library: @pending2024
    Slide 8: "Cost reduction of 40% [@pending2024]"

  Suggestion: Add the reference or remove the citation
  Run: ref add --pmid <pmid> or ref add --doi <doi>
```

### AI Skill: Reference Collection

```markdown
## Reference Collection Skill

### When to Use

Invoke this skill when:
- Creating academic or research presentations
- User mentions needing citations
- Scenario contains statistical claims or research findings

### Workflow

1. **Analyze scenario** for citation needs
   - Identify required vs. recommended citations
   - Note specific claims needing evidence

2. **Search existing library**
   ```bash
   ref list --format json
   ref search "<keyword>" --format json
   ```

3. **For found references**
   - Confirm relevance with user
   - Insert [@id] citations in YAML

4. **For missing references**
   - Present clear request to user
   - Specify what type of source is needed
   - Provide suggested search terms
   - Accept DOI/PMID/PDF/manual entry

5. **Add new references**
   ```bash
   ref add --pmid <id>
   ref add --doi <id>
   ```

6. **Update tracking**
   - Record in sources/sources.yaml
   - Update citation status

### User Communication Template

"I've identified [N] statements that would benefit from citations:

[For each]:
- Slide [X]: '[statement]'
- Needed: [type of source]
- Search suggestion: [keywords]

Your reference library has [M] potential matches.
For the remaining [N-M], please provide:
- DOI or PMID (preferred)
- URL (PubMed, journal site, Google Scholar, Amazon, etc.)
- PDF file
- Manual citation details"
```

### Configuration Options

```yaml
# config.yaml
references:
  ai_collaboration:
    # Auto-analyze scenario for citation needs
    auto_analyze: true

    # Strictness level for citation requirements
    # strict: flag all claims | normal: flag statistical/research claims | relaxed: flag only explicit claims
    requirement_level: normal

    # Track pending references in sources.yaml
    track_pending: true

    # Suggest search terms for missing references
    suggest_search_terms: true
```

### Extracting References from Non-Standard Input

AI agents can extract bibliographic information from various user-provided sources and register them with reference-manager.

#### Supported Input Types

| Input Type | Example | Extraction Method |
|------------|---------|-------------------|
| PubMed URL | `https://pubmed.ncbi.nlm.nih.gov/38941256/` | Extract PMID from URL |
| DOI URL | `https://doi.org/10.1038/s41591-024-xxxxx` | Extract DOI from URL |
| Publisher URL | `https://www.nature.com/articles/s41591-024-xxxxx` | Extract DOI from page metadata |
| PDF file | `~/Downloads/paper.pdf` | Extract metadata or search by title |
| Screenshot | Image of citation/paper | OCR and parse bibliographic info |
| Free text | "Smith et al. Nature 2024" | Parse and search databases |
| BibTeX | `.bib` file content | Direct import |
| RIS | `.ris` file content | Direct import |

#### Extraction Workflow

```
┌─────────────────────────────────────────────────────────────────┐
│ Step 1: Identify Input Type                                      │
│                                                                 │
│ AI analyzes user input to determine source type:                │
│ - URL pattern matching (pubmed, doi.org, publisher sites)       │
│ - File extension detection (.pdf, .bib, .ris)                   │
│ - Image file detection (screenshot)                             │
│ - Free text parsing                                             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ Step 2: Extract Identifiers                                      │
│                                                                 │
│ URL extraction patterns:                                        │
│ - PubMed: /(\d{7,8})/ from pubmed.ncbi.nlm.nih.gov             │
│ - DOI: /(10\.\d{4,}\/[^\s]+)/ from doi.org or article pages    │
│ - ISBN: /(ISBN[:\s]?[\d-]+)/ from book pages                   │
│                                                                 │
│ File extraction:                                                │
│ - PDF: Read metadata, extract DOI from first page              │
│ - BibTeX/RIS: Parse directly                                   │
│                                                                 │
│ Image extraction:                                               │
│ - OCR text, then parse for identifiers or citation info        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ Step 3: Register with reference-manager                          │
│                                                                 │
│ Based on extracted identifier:                                  │
│                                                                 │
│ PMID found:                                                     │
│   $ ref add pmid:38941256                                       │
│                                                                 │
│ DOI found:                                                      │
│   $ ref add "10.1038/s41591-024-xxxxx"                         │
│                                                                 │
│ ISBN found:                                                     │
│   $ ref add "ISBN:978-4-00-000000-0"                           │
│                                                                 │
│ BibTeX/RIS file:                                                │
│   $ ref add paper.bib                                           │
│   $ ref add export.ris                                          │
│                                                                 │
│ CSL-JSON (constructed by AI):                                   │
│   $ echo '<json>' | ref add                                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ Step 4: Confirm and Report                                       │
│                                                                 │
│ AI confirms successful registration:                            │
│ - Shows extracted bibliographic information                     │
│ - Provides citation key for use in slides                      │
│ - Updates sources.yaml tracking                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### URL Pattern Extraction Examples

```typescript
// AI extracts identifiers from URLs

// PubMed URL → PMID
"https://pubmed.ncbi.nlm.nih.gov/38941256/"
→ pmid:38941256
→ $ ref add pmid:38941256

// DOI URL → DOI
"https://doi.org/10.1038/s41591-024-02895-z"
→ 10.1038/s41591-024-02895-z
→ $ ref add "10.1038/s41591-024-02895-z"

// Nature article URL → DOI extraction
"https://www.nature.com/articles/s41591-024-02895-z"
→ 10.1038/s41591-024-02895-z (from URL path or page metadata)
→ $ ref add "10.1038/s41591-024-02895-z"

// Amazon book URL → ISBN extraction
"https://www.amazon.co.jp/dp/4000000000"
→ AI fetches page, extracts ISBN from metadata
→ $ ref add "ISBN:978-4-00-000000-0"
```

#### PDF File Processing

```
User: "Add this paper: ~/Downloads/yamamoto2024.pdf"

AI Process:
1. Read PDF file
2. Extract metadata (if available in PDF properties)
3. If no metadata, read first page and extract:
   - DOI (often printed on first page)
   - Title, authors, journal info
4. Search with extracted info:
   - If DOI found: $ ref add "10.xxxx/xxxxx"
   - If PMID found: $ ref add pmid:xxxxxxxx
   - If title found: Search PubMed/CrossRef for match

AI: "I've analyzed the PDF:

    📄 Extracted Information
    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    Title: 'Systematic Review of AI Diagnostic Systems...'
    Authors: Yamamoto K, Tanaka H, et al.
    DOI: 10.1038/s41591-024-02895-z (found on page 1)

    Adding to library...
    $ ref add "10.1038/s41591-024-02895-z"

    ✓ Added as [@yamamoto2024]"
```

#### Screenshot/Image Processing

```
User: [Shares screenshot of a citation or paper header]

AI Process:
1. Analyze image content
2. Extract text via OCR/vision capabilities
3. Parse bibliographic elements:
   - Author names
   - Title
   - Journal/Publisher
   - Year
   - DOI/PMID if visible
4. Search databases to find exact match
5. Register with found identifier

AI: "I've analyzed the screenshot:

    📷 Extracted from Image
    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    Detected text:
    'Smith J, et al. Machine Learning in Healthcare.
     Nature Medicine 2024; 30: 123-145'

    Searching PubMed...
    Found match: PMID 39123456

    Adding to library...
    $ ref add pmid:39123456

    ✓ Added as [@smith2024]"
```

#### Free Text Parsing

```
User: "Add the paper by Tanaka about AI diagnostics from 2024,
       I think it was in JAMA"

AI Process:
1. Parse key information:
   - Author: Tanaka
   - Topic: AI diagnostics
   - Year: 2024
   - Journal: JAMA
2. Construct search query
3. Search PubMed/CrossRef
4. Present candidates for confirmation
5. Register selected reference

AI: "Searching for Tanaka's AI diagnostics paper in JAMA 2024...

    📚 Found Candidates (3)
    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    1. Tanaka H, et al. 'AI-Assisted Diagnostic Accuracy in...'
       JAMA. 2024;331(5):412-420. PMID: 38234567

    2. Tanaka K, et al. 'Deep Learning for Medical Imaging...'
       JAMA Intern Med. 2024;184(2):156-165. PMID: 38345678

    3. Tanaka M, et al. 'Validation of AI Diagnostic Tools...'
       JAMA Netw Open. 2024;7(3):e241234. PMID: 38456789

    Which one would you like to add? (Enter 1, 2, or 3)"

User: "1"

AI: "Adding reference...
    $ ref add pmid:38234567

    ✓ Added as [@tanaka2024]"
```

#### BibTeX/RIS Import

```
User: "Add these references from my Zotero export"
[Pastes BibTeX content or provides file path]

AI Process:
1. Detect format (BibTeX or RIS)
2. Save to temporary file if needed
3. Import via reference-manager

# From pasted content
AI: $ echo '@article{smith2024, ...}' | ref add

# From file
AI: $ ref add ~/exports/references.bib

AI: "Imported 5 references from BibTeX:

    ✓ Added:
    - [@smith2024] Smith et al. (2024)
    - [@jones2023] Jones et al. (2023)
    - [@tanaka2024] Tanaka et al. (2024)

    ⚠ Skipped (already exists):
    - [@yamamoto2024]

    ✗ Failed:
    - Entry 'incomplete2024' - missing required fields"
```

#### Integration Methods: CLI vs MCP

AI agents can interact with reference-manager through two methods:

| Method | Setup Required | When to Use |
|--------|---------------|-------------|
| **CLI** (default) | None | Always available, works out of the box |
| **MCP** (optional) | User configuration | Enhanced integration when configured |

##### CLI Integration (Default)

No user setup required. AI executes reference-manager commands via shell:

```bash
# Always available
ref add pmid:38941256
ref search "author:smith"
ref list --format json
```

AI agents should **always use CLI as the primary method** since it requires no user configuration.

##### MCP Integration (Optional)

When users have configured the reference-manager MCP server, AI agents can use direct tool calls for enhanced integration.

**User Setup Required:**

For Claude Code:
```bash
claude mcp add reference-manager --scope project -- npx -y @ncukondo/reference-manager mcp
```

For Claude Desktop:
1. Download `.mcpb` from [reference-manager releases](https://github.com/ncukondo/reference-manager/releases)
2. Install via Settings → Extensions → "Install from file"
3. Configure library path

**Detecting MCP Availability:**

AI agents should check if MCP tools are available before using them:

```
AI behavior:
1. Check if reference-manager MCP tools are available in current session
2. If available → Use MCP tools for direct integration
3. If not available → Fall back to CLI commands (always works)
```

**Available MCP Tools (when configured):**

| MCP Tool | Purpose | Usage |
|----------|---------|-------|
| `add` | Add reference by identifier | `add({identifier: "pmid:38941256"})` |
| `search` | Search library | `search({query: "author:smith 2024"})` |
| `list` | List all references | `list({format: "json"})` |
| `cite` | Generate formatted citation | `cite({id: "smith2024", style: "apa"})` |
| `remove` | Remove reference | `remove({id: "smith2024"})` |

**MCP Resources (when configured):**

| Resource URI | Description |
|--------------|-------------|
| `library://references` | All references as CSL-JSON |
| `library://reference/{id}` | Single reference details |
| `library://styles` | Available citation styles |

##### Recommending MCP Setup

When AI detects frequent reference operations, it may suggest MCP setup:

```
AI: "I notice we're working with many references.

    For enhanced integration, you can optionally set up the
    reference-manager MCP server:

    $ claude mcp add reference-manager --scope project -- \
        npx -y @ncukondo/reference-manager mcp

    This enables direct tool access, but is not required.
    CLI commands will continue to work without it."
```

#### Conversation Example: Complete Flow

```
User: "I found a good paper for the accuracy claim. Here's the link:
       https://pubmed.ncbi.nlm.nih.gov/38941256/"

AI: "I'll extract the reference from that PubMed URL.

    📎 Extracting from URL
    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    URL: https://pubmed.ncbi.nlm.nih.gov/38941256/
    Detected: PubMed ID 38941256

    Adding to library...
    $ ref add pmid:38941256

    ✓ Reference added successfully:
    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    Citation key: yamamoto2024
    Authors: Yamamoto, K., Tanaka, H., et al.
    Title: 'Systematic Review of AI Diagnostic Systems
            in Medical Imaging: A Meta-Analysis'
    Journal: Nature Medicine
    Year: 2024
    PMID: 38941256
    DOI: 10.1038/s41591-024-02895-z

    I've updated your slide:

    Slide 3: 'AI diagnostic accuracy exceeds 90%'
    → Added citation: [@yamamoto2024]

    Updated sources.yaml to track this reference."
```

#### Error Handling

```
# URL not recognized
AI: "I couldn't extract a reference identifier from that URL.
    Could you provide:
    - A direct PubMed, DOI, or publisher link
    - The DOI or PMID directly
    - A PDF of the paper"

# PDF without identifiable metadata
AI: "I couldn't find a DOI or PMID in this PDF.
    I extracted this information:
    - Title: '...'
    - Authors: '...'

    Should I search PubMed/CrossRef with this information?"

# Multiple matches found
AI: "I found multiple matches for 'Smith 2024 machine learning'.
    Please select the correct one: [list options]"

# Reference already exists
AI: "This reference is already in your library as [@smith2024].
    Would you like to use it for the current citation?"
```
