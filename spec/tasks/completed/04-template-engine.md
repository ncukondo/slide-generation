# Task: Template Engine

## Purpose

Nunjucksベースのテンプレートエンジンを実装し、テンプレート文字列をレンダリングする基盤を構築する。
カスタムフィルター、グローバル関数（icons, refs）のスタブを用意する。

## Context

- **関連仕様**: [spec/templates.md](../templates.md) - テンプレートエンジンセクション
- **依存タスク**: [03-yaml-parser](./03-yaml-parser.md)
- **関連ソース**: `src/templates/`

## TDD Implementation Cycle

各ステップで以下のサイクルを実行:

1. **Red**: 失敗するテストを書く
2. **Green**: テストを通す最小限の実装
3. **Refactor**: `pnpm lint && pnpm typecheck` を実行し、リファクタリング

## Implementation Steps

### Step 1: Basic Template Engine

**Goal**: Nunjucksをラップした基本的なテンプレートエンジンを作成

**Test file**: `src/templates/engine.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { TemplateEngine } from './engine';

describe('TemplateEngine', () => {
  it('should render simple template', () => {
    const engine = new TemplateEngine();
    const result = engine.render('Hello, {{ name }}!', { name: 'World' });
    expect(result).toBe('Hello, World!');
  });

  it('should render template with loop', () => {
    const engine = new TemplateEngine();
    const template = `{% for item in items %}{{ item }}{% endfor %}`;
    const result = engine.render(template, { items: ['a', 'b', 'c'] });
    expect(result).toBe('abc');
  });

  it('should render template with conditionals', () => {
    const engine = new TemplateEngine();
    const template = `{% if show %}visible{% else %}hidden{% endif %}`;

    expect(engine.render(template, { show: true })).toBe('visible');
    expect(engine.render(template, { show: false })).toBe('hidden');
  });

  it('should handle undefined variables gracefully', () => {
    const engine = new TemplateEngine();
    const result = engine.render('Value: {{ missing }}', {});
    expect(result).toBe('Value: ');
  });
});
```

**Implementation**: `src/templates/engine.ts`

```typescript
import nunjucks from 'nunjucks';

export class TemplateEngine {
  private env: nunjucks.Environment;

  constructor() {
    this.env = new nunjucks.Environment(null, {
      autoescape: false, // HTML output for Marp
      throwOnUndefined: false,
    });
    this.registerFilters();
    this.registerGlobals();
  }

  render(template: string, context: Record<string, unknown>): string {
    return this.env.renderString(template, context);
  }

  private registerFilters(): void {
    // Will be extended in later steps
  }

  private registerGlobals(): void {
    // Will be extended in later steps
  }
}
```

**Verification**:
- [ ] テストが失敗することを確認
- [ ] 実装後、テストが通ることを確認
- [ ] `pnpm lint && pnpm typecheck` が通ることを確認

### Step 2: Custom Filters

**Goal**: スライド生成に必要なカスタムフィルターを追加

**Test file**: `src/templates/engine.test.ts` (追加)

```typescript
describe('TemplateEngine filters', () => {
  it('should have default filter', () => {
    const engine = new TemplateEngine();
    const result = engine.render('{{ value | default("fallback") }}', {});
    expect(result).toBe('fallback');
  });

  it('should have trim filter', () => {
    const engine = new TemplateEngine();
    const result = engine.render('{{ text | trim }}', { text: '  hello  ' });
    expect(result).toBe('hello');
  });

  it('should have escape filter for HTML', () => {
    const engine = new TemplateEngine();
    const result = engine.render('{{ html | e }}', { html: '<script>' });
    expect(result).toBe('&lt;script&gt;');
  });

  it('should have length filter', () => {
    const engine = new TemplateEngine();
    const result = engine.render('{{ items | length }}', { items: [1, 2, 3] });
    expect(result).toBe('3');
  });
});
```

**Implementation**: Nunjucks built-in filters are already available

**Verification**:
- [ ] テストが通ることを確認
- [ ] `pnpm lint && pnpm typecheck` が通ることを確認

### Step 3: Icon Helper Stub

**Goal**: アイコンレンダリング用のスタブヘルパーを追加

**Test file**: `src/templates/engine.test.ts` (追加)

```typescript
describe('TemplateEngine icons helper', () => {
  it('should have icons.render global function', () => {
    const engine = new TemplateEngine();
    const result = engine.render('{{ icons.render("test") }}', {});
    // Stub returns placeholder
    expect(result).toContain('icon');
    expect(result).toContain('test');
  });

  it('should accept options in icons.render', () => {
    const engine = new TemplateEngine();
    const template = '{{ icons.render("home", { size: "32px" }) }}';
    const result = engine.render(template, {});
    expect(result).toBeDefined();
  });
});
```

**Implementation**: `src/templates/engine.ts` (追加)

```typescript
private registerGlobals(): void {
  // Icon helper stub - will be replaced with real implementation
  const icons = {
    render: (name: string, options?: Record<string, unknown>): string => {
      const size = options?.size ?? '24px';
      const color = options?.color ?? 'currentColor';
      return `<span class="icon icon-${name}" style="font-size: ${size}; color: ${color};">[${name}]</span>`;
    },
  };

  this.env.addGlobal('icons', icons);
}
```

**Verification**:
- [ ] テストが失敗することを確認
- [ ] 実装後、テストが通ることを確認
- [ ] `pnpm lint && pnpm typecheck` が通ることを確認

### Step 4: Reference Helper Stub

**Goal**: 引用展開用のスタブヘルパーを追加

**Test file**: `src/templates/engine.test.ts` (追加)

```typescript
describe('TemplateEngine refs helper', () => {
  it('should have refs.cite global function', () => {
    const engine = new TemplateEngine();
    const result = engine.render('{{ refs.cite("@smith2024") }}', {});
    expect(result).toContain('smith2024');
  });

  it('should have refs.expand global function', () => {
    const engine = new TemplateEngine();
    const result = engine.render('{{ refs.expand("Text [@id] here") }}', {});
    expect(result).toContain('id');
  });
});
```

**Implementation**: `src/templates/engine.ts` (追加)

```typescript
private registerGlobals(): void {
  // ... icons helper ...

  // Reference helper stub - will be replaced with real implementation
  const refs = {
    cite: (id: string): string => {
      const cleanId = id.replace('@', '');
      return `(${cleanId})`;
    },
    expand: (text: string): string => {
      // Simple stub - replace [@id] with (id)
      return text.replace(/\[@(\w+)\]/g, '($1)');
    },
  };

  this.env.addGlobal('refs', refs);
}
```

**Verification**:
- [ ] テストが失敗することを確認
- [ ] 実装後、テストが通ることを確認
- [ ] `pnpm lint && pnpm typecheck` が通ることを確認

### Step 5: Context Variables

**Goal**: テンプレートに渡されるコンテキスト変数の型定義

**Test file**: `src/templates/engine.test.ts` (追加)

```typescript
describe('TemplateEngine context', () => {
  it('should pass slide context', () => {
    const engine = new TemplateEngine();
    const template = 'Slide {{ slide.index }} of {{ slide.total }}';
    const result = engine.render(template, {
      slide: { index: 1, total: 10 },
    });
    expect(result).toBe('Slide 1 of 10');
  });

  it('should pass meta context', () => {
    const engine = new TemplateEngine();
    const template = 'Theme: {{ meta.theme }}';
    const result = engine.render(template, {
      meta: { theme: 'academic' },
    });
    expect(result).toBe('Theme: academic');
  });
});
```

**Implementation**: `src/templates/engine.ts` (型定義追加)

```typescript
export interface TemplateContext {
  content: Record<string, unknown>;
  meta: {
    title: string;
    author?: string;
    theme: string;
    [key: string]: unknown;
  };
  slide: {
    index: number;
    total: number;
  };
  icons: {
    render: (name: string, options?: Record<string, unknown>) => string;
  };
  refs: {
    cite: (id: string) => string;
    expand: (text: string) => string;
  };
}
```

**Verification**:
- [ ] テストが通ることを確認
- [ ] `pnpm lint && pnpm typecheck` が通ることを確認

## E2E Test (必須)

**Test file**: `tests/e2e/template-engine.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { TemplateEngine } from '../../src/templates/engine';

describe('E2E: Template Engine', () => {
  it('should render a complete slide template', () => {
    const engine = new TemplateEngine();
    const template = `
---
<!-- _class: diagram-slide cycle-slide -->

# {{ title }}

<div class="cycle-container cycle-{{ nodes | length }}">
  {%- for node in nodes %}
  <div class="cycle-node" style="--node-color: {{ node.color | default('#666666') }}; --node-index: {{ loop.index0 }};">
    {%- if node.icon %}
    <span class="node-icon">{{ icons.render(node.icon) }}</span>
    {%- endif %}
    <span class="node-label">{{ node.label }}</span>
  </div>
  {%- endfor %}
</div>
`;

    const context = {
      title: 'PDCAサイクル',
      nodes: [
        { label: 'Plan', icon: 'planning', color: '#4CAF50' },
        { label: 'Do', icon: 'action', color: '#2196F3' },
        { label: 'Check', icon: 'analysis', color: '#FF9800' },
        { label: 'Act', icon: 'improvement', color: '#9C27B0' },
      ],
    };

    const result = engine.render(template, context);

    expect(result).toContain('PDCAサイクル');
    expect(result).toContain('cycle-4');
    expect(result).toContain('Plan');
    expect(result).toContain('#4CAF50');
    expect(result).toContain('icon-planning');
  });

  it('should render template with references', () => {
    const engine = new TemplateEngine();
    const template = `
# {{ title }}

{% for item in items %}
- {{ refs.expand(item) }}
{% endfor %}
`;

    const context = {
      title: 'Background',
      items: [
        'This is important [@smith2024]',
        'Multiple refs [@smith2024; @tanaka2023]',
      ],
    };

    const result = engine.render(template, context);

    expect(result).toContain('(smith2024)');
  });
});
```

**Verification**:
- [ ] 複雑なテンプレートが正しくレンダリングされる
- [ ] ヘルパー関数が正しく動作する
- [ ] 日本語コンテンツが正しく処理される

## Acceptance Criteria

- [ ] 全てのテストが通る (`pnpm test`)
- [ ] 型チェックが通る (`pnpm typecheck`)
- [ ] リントが通る (`pnpm lint`)
- [ ] E2Eテストが通る
- [ ] Nunjucksの基本機能が使用可能
- [ ] icons.render と refs ヘルパーが利用可能（スタブ）

## Files Changed

- [ ] `src/templates/engine.ts` - 新規作成
- [ ] `src/templates/engine.test.ts` - 新規作成
- [ ] `src/templates/index.ts` - エクスポート
- [ ] `tests/e2e/template-engine.test.ts` - 新規作成

## Notes

- icons と refs のスタブは後のタスクで実際の実装に置き換える
- autoescape=false は Marp 向けの HTML 出力のため
- ヘルパーの差し替え機能は Step 3/4 では不要、Pipeline タスクで実装
