# Task: E2E Tests & Documentation

## Purpose

エンドツーエンドテストを充実させ、ドキュメントを整備し、プロジェクトを公開可能な状態にする。

## Context

- **関連仕様**: 全仕様書
- **依存タスク**: 全タスク
- **関連ソース**: `tests/e2e/`, `docs/`

## Implementation Steps

### Step 1: Comprehensive E2E Tests

```typescript
// tests/e2e/full-workflow.test.ts
describe('E2E: Full Workflow', () => {
  it('should convert complete presentation with all features', async () => {
    // 全機能を使用したプレゼンテーション
    // 基本テンプレート + 図表 + データ + 引用
    // 実際のファイルI/O
    // Marp CLI出力検証
  });

  it('should handle Japanese content correctly', async () => {
    // 日本語プレゼンテーション
    // 引用の日本語著者
  });

  it('should work without reference-manager', async () => {
    // reference-manager未インストール環境
    // 引用を無効化して変換
  });

  it('should generate valid Marp output', async () => {
    // 出力をMarp CLIで処理
    // エラーなしで完了
  });
});
```

### Step 2: README.md

- プロジェクト概要
- インストール方法
- 基本的な使い方
- コマンドリファレンス
- サンプル

### Step 3: Examples

```
examples/
├── basic/
│   └── presentation.yaml
├── academic/
│   └── research-presentation.yaml
└── corporate/
    └── quarterly-report.yaml
```

### Step 4: Error Messages Review

- 全エラーメッセージの確認
- ユーザーフレンドリーな表現
- 解決策のヒント

### Step 5: Performance Check

- 大規模プレゼンテーション（100スライド）
- 変換時間の計測
- メモリ使用量の確認

## Acceptance Criteria

- [ ] 全E2Eテストが通る
- [ ] README.mdが完成している
- [ ] サンプルファイルが動作する
- [ ] エラーメッセージが分かりやすい
- [ ] パフォーマンスが許容範囲内
- [ ] `pnpm publish` 可能な状態

## Files Changed

- [ ] `tests/e2e/` - 各種E2Eテスト
- [ ] `README.md` - 更新
- [ ] `examples/` - サンプル追加
- [ ] `CHANGELOG.md` - 新規作成
