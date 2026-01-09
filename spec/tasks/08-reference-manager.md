# Task: Reference Manager Integration

## Purpose

reference-manager CLIとの連携機能を実装する。
引用抽出、書誌情報取得、インライン引用フォーマット、参考文献リスト生成。

## Context

- **関連仕様**: [spec/references.md](../references.md)
- **依存タスク**: [04-template-engine](./04-template-engine.md)
- **関連ソース**: `src/references/`

## Implementation Steps

### Step 1: Citation Extractor

**Goal**: テキストから `[@id]` パターンを抽出

```typescript
// src/references/extractor.ts
interface ExtractedCitation {
  id: string;
  locator?: string;
  position: { start: number; end: number };
}

export class CitationExtractor {
  extract(text: string): ExtractedCitation[];
  extractFromSlide(slide: ParsedSlide): ExtractedCitation[];
  extractFromPresentation(presentation: ParsedPresentation): ExtractedCitation[];
}
```

**Tests**:
- 単一引用 `[@smith2024]`
- 複数引用 `[@smith2024; @tanaka2023]`
- ページ番号付き `[@smith2024, p.42]`
- プレゼンテーション全体からの抽出

### Step 2: Reference Manager Client

**Goal**: reference-manager CLIとの通信

```typescript
// src/references/manager.ts
interface CSLItem {
  id: string;
  author?: { family: string; given: string }[];
  issued?: { 'date-parts': number[][] };
  title?: string;
  DOI?: string;
  PMID?: string;
  // ...
}

export class ReferenceManager {
  constructor(private command: string = 'ref');

  async getAll(): Promise<CSLItem[]>;
  async getById(id: string): Promise<CSLItem | null>;
  async getByIds(ids: string[]): Promise<Map<string, CSLItem>>;
  async isAvailable(): Promise<boolean>;
}
```

**Tests**:
- CLIの存在確認
- 書誌情報の取得
- 複数IDの一括取得
- CLI不在時のエラーハンドリング

### Step 3: Citation Formatter

**Goal**: インライン引用と参考文献リストのフォーマット

```typescript
// src/references/formatter.ts
export class CitationFormatter {
  constructor(private manager: ReferenceManager, private config: FormatterConfig);

  async formatInline(id: string): Promise<string>;
  async formatFull(id: string): Promise<string>;
  async expandCitations(text: string): Promise<string>;
  async generateBibliography(ids: string[], sort?: 'author' | 'year' | 'citation-order'): Promise<string[]>;
}
```

**Tests**:
- インライン引用 `(Smith et al., 2024; PMID: 12345678)`
- 著者名の日本語/英語切り替え
- 参考文献リストの生成
- ソート順の確認

## E2E Test

- 実際のreference-manager連携（モック可）
- プレゼンテーション全体の引用処理
- 参考文献スライドの生成

## Acceptance Criteria

- [ ] 引用パターンが正しく抽出される
- [ ] reference-manager CLIと連携できる
- [ ] インライン引用が仕様通りにフォーマットされる
- [ ] 参考文献リストが生成される
- [ ] CLI不在時に適切なエラーメッセージを表示

## Files Changed

- [ ] `src/references/extractor.ts` - 新規作成
- [ ] `src/references/manager.ts` - 新規作成
- [ ] `src/references/formatter.ts` - 新規作成
- [ ] `src/references/index.ts` - エクスポート
