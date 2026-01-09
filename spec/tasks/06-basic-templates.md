# Task: Basic Templates

## Purpose

基本テンプレート（title, section, bullet-list, numbered-list）を実装し、
最小限の動作するスライド生成を可能にする。

## Context

- **関連仕様**: [spec/templates.md](../templates.md) - ビルトインテンプレート一覧
- **依存タスク**: [05-template-loader](./05-template-loader.md)
- **関連ソース**: `templates/basic/`

## Implementation Steps

### Step 1: Title Template

**File**: `templates/basic/title.yaml`

```yaml
name: title
description: "タイトルスライド"
category: basic

schema:
  type: object
  required: [title]
  properties:
    title: { type: string }
    subtitle: { type: string }
    author: { type: string }
    date: { type: string }
    affiliation: { type: string }

output: |
  ---
  <!-- _class: title -->

  # {{ title }}

  {% if subtitle %}## {{ subtitle }}{% endif %}

  {% if author or affiliation or date %}
  <div class="title-meta">
    {% if author %}<span class="author">{{ author }}</span>{% endif %}
    {% if affiliation %}<span class="affiliation">{{ affiliation }}</span>{% endif %}
    {% if date %}<span class="date">{{ date }}</span>{% endif %}
  </div>
  {% endif %}
```

### Step 2: Section Template

**File**: `templates/basic/section.yaml`

```yaml
name: section
description: "セクション区切り"
category: basic

schema:
  type: object
  required: [title]
  properties:
    title: { type: string }
    subtitle: { type: string }

output: |
  ---
  <!-- _class: section -->

  # {{ title }}

  {% if subtitle %}{{ subtitle }}{% endif %}
```

### Step 3: Bullet List Template

**File**: `templates/basic/bullet-list.yaml`

```yaml
name: bullet-list
description: "箇条書き"
category: basic

schema:
  type: object
  required: [title, items]
  properties:
    title: { type: string }
    items: { type: array, items: { type: [string, object] } }

output: |
  ---

  # {{ title }}

  {% macro renderItems(items, depth) %}
  {% for item in items %}
  {% if item is string %}
  {{ '  ' * depth }}- {{ refs.expand(item) }}
  {% elif item.nested %}
  {{ '  ' * depth }}- {{ item.nested.title }}
  {{ renderItems(item.nested.items, depth + 1) }}
  {% endif %}
  {% endfor %}
  {% endmacro %}

  {{ renderItems(items, 0) }}
```

### Step 4: Numbered List Template

**File**: `templates/basic/numbered-list.yaml`

Similar to bullet-list with ordered list formatting.

## E2E Test

```typescript
describe('E2E: Basic Templates', () => {
  it('should render title slide', async () => {
    // Test with real template file and engine
  });

  it('should render nested bullet list', async () => {
    // Test nested items
  });
});
```

## Acceptance Criteria

- [ ] 4つの基本テンプレートが定義されている
- [ ] 各テンプレートが正しくレンダリングされる
- [ ] ネストされた箇条書きが動作する
- [ ] 引用参照 [@id] が展開される（スタブ）

## Files Changed

- [ ] `templates/basic/title.yaml` - 新規作成
- [ ] `templates/basic/section.yaml` - 新規作成
- [ ] `templates/basic/bullet-list.yaml` - 新規作成
- [ ] `templates/basic/numbered-list.yaml` - 新規作成
- [ ] `tests/e2e/basic-templates.test.ts` - 新規作成
