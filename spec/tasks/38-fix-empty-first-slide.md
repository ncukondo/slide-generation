# Task: 空白スライド問題の修正

## Purpose

Marp出力で最初のスライドが空白になる問題を修正する。現在、`renderer.ts`の`joinSlides`メソッドが全スライドの前に`---`を追加しているため、フロントマター直後に空のスライドが生成されている。

## Context

- **関連仕様**: [spec/source-format.md](../source-format.md)
- **依存タスク**: なし
- **関連ソース**: `src/core/renderer.ts`

## Problem Analysis

現在の出力:
```markdown
---
marp: true
title: Test
---

---              ← これが空のスライド1を作る

<!-- _class: title -->
# タイトル
```

期待される出力:
```markdown
---
marp: true
title: Test
---

<!-- _class: title -->
# タイトル

---

<!-- _class: bullet-list -->
# 次のスライド
```

## TDD Implementation Cycle

各ステップで以下のサイクルを実行:

1. **Red**: 失敗するテストを書く
2. **Green**: テストを通す最小限の実装
3. **Refactor**: `pnpm lint && pnpm typecheck` を実行し、リファクタリング

## Implementation Steps

### Step 1: レンダラーのテスト修正

**Goal**: 最初のスライドの前に`---`が付かないことを確認するテストを追加

**Test file**: `src/core/renderer.test.ts`

```typescript
describe('Renderer', () => {
  describe('joinSlides', () => {
    it('should not add separator before first slide', () => {
      const renderer = new Renderer();
      const result = renderer.render(
        ['# Slide 1', '# Slide 2'],
        { title: 'Test' }
      );

      // フロントマター終了後、最初のスライドの前に---がないことを確認
      expect(result).not.toMatch(/---\n\n---/);
      // 最初のスライドがフロントマター直後にあることを確認
      expect(result).toMatch(/---\n\n# Slide 1/);
    });
  });
});
```

**Verification**:
- [ ] テストが失敗することを確認
- [ ] 実装後、テストが通ることを確認
- [ ] `pnpm lint && pnpm typecheck` が通ることを確認

### Step 2: joinSlidesの修正

**Goal**: 最初のスライド以外にのみ`---`セパレータを追加

**Implementation**: `src/core/renderer.ts`

```typescript
private joinSlides(
  slides: string[],
  notes?: (string | undefined)[]
): string {
  const parts: string[] = [];

  for (let i = 0; i < slides.length; i++) {
    let slideContent = slides[i]!;

    const note = notes?.[i];
    if (note && note.trim()) {
      slideContent = `${slideContent}\n\n${this.renderSpeakerNotes(note)}`;
    }

    parts.push(slideContent);
  }

  // 最初のスライドは---なし、2枚目以降は---で区切る
  return parts
    .map((slide, index) => (index === 0 ? slide : `---\n\n${slide}`))
    .join('\n\n');
}
```

**Verification**:
- [ ] テストが通ることを確認
- [ ] `pnpm lint && pnpm typecheck` が通ることを確認

### Step 3: スクリーンショット確認

**Goal**: 修正後、空白スライドが生成されないことを確認

```bash
pnpm build
node dist/cli/index.js templates screenshot title --format ai -o /tmp/test-screenshot
```

**Verification**:
- [ ] `.001` ファイルにコンテンツが含まれる
- [ ] 空白スライドが生成されない

## E2E Test (必須)

**Test file**: `tests/e2e/renderer-slide-separator.test.ts`

```typescript
describe('E2E: Renderer slide separator', () => {
  it('should not generate empty first slide', async () => {
    const yamlContent = `
meta:
  title: Test
slides:
  - template: title
    content:
      title: "Test Title"
`;
    // 実際のファイルI/Oで変換
    // 出力されたMarkdownに空スライドがないことを確認
  });
});
```

## Acceptance Criteria

- [ ] 全てのテストが通る (`pnpm test`)
- [ ] 型チェックが通る (`pnpm typecheck`)
- [ ] リントが通る (`pnpm lint`)
- [ ] E2Eテストが通る
- [ ] `templates screenshot --all --format ai` で全テンプレートの`.001`が空白でない

## Files Changed

- [ ] `src/core/renderer.ts` - joinSlidesメソッド修正
- [ ] `src/core/renderer.test.ts` - テスト追加
- [ ] `tests/e2e/renderer-slide-separator.test.ts` - E2Eテスト新規作成

## Notes

- この修正は既存のスライド生成に影響するため、既存テストの出力期待値も更新が必要になる可能性がある
- 修正後は `templates screenshot --all --format ai` で全テンプレートを確認すること
