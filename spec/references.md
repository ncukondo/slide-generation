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
