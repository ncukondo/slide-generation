# Task: [タスク名]

## Purpose

[このタスクが解決する問題と目的を簡潔に説明]

## Context

- **関連仕様**: [spec/xxx.md](../xxx.md)
- **依存タスク**: [依存するタスクへのリンク]
- **関連ソース**: `src/xxx/`

## TDD Implementation Cycle

各ステップで以下のサイクルを実行:

1. **Red**: 失敗するテストを書く
2. **Green**: テストを通す最小限の実装
3. **Refactor**: `pnpm lint && pnpm typecheck` を実行し、リファクタリング

## Implementation Steps

### Step 1: [ステップ名]

**Goal**: [このステップの目標]

**Test file**: `src/xxx/xxx.test.ts`

```typescript
// テストコードの例
describe('xxx', () => {
  it('should xxx', () => {
    // ...
  });
});
```

**Implementation**: `src/xxx/xxx.ts`

```typescript
// 実装コードのスタブ/インターフェース
```

**Verification**:
- [ ] テストが失敗することを確認
- [ ] 実装後、テストが通ることを確認
- [ ] `pnpm lint && pnpm typecheck` が通ることを確認

### Step 2: [ステップ名]

[Step 1 と同様のフォーマット]

## E2E Test (必須)

> **重要**: ユニットテストのモックは実際の使用時に失敗することがある。
> 最終ステップとしてE2Eテストを必ず実施する。

**Test file**: `tests/e2e/xxx.test.ts`

```typescript
describe('E2E: xxx', () => {
  it('should work with real files', async () => {
    // 実際のファイルI/Oを使用
    // モックを最小限に
    // ユーザーワークフローをテスト
  });
});
```

**Verification**:
- [ ] 実際のファイルI/Oでテストが通る
- [ ] エッジケースをカバー
- [ ] エラーハンドリングをテスト

## Acceptance Criteria

- [ ] 全てのテストが通る (`pnpm test`)
- [ ] 型チェックが通る (`pnpm typecheck`)
- [ ] リントが通る (`pnpm lint`)
- [ ] E2Eテストが通る
- [ ] [追加の受け入れ基準]

## Files Changed

- [ ] `src/xxx/xxx.ts` - 新規作成
- [ ] `src/xxx/xxx.test.ts` - 新規作成
- [ ] `src/index.ts` - エクスポート追加
- [ ] [その他の変更ファイル]

## Notes

[実装に関する補足事項、設計上の決定、注意点など]
