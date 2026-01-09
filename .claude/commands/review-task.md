spec/tasks/$ARGUMENTS.md のタスクをレビューしてください。

## レビュー観点

1. **完了状況**: 全てのImplementation Stepsが完了しているか
2. **テストカバレッジ**: 各ステップにテストがあるか
3. **E2Eテスト**: E2Eテストが実装されているか
4. **Acceptance Criteria**: 全ての受け入れ基準を満たしているか
5. **コード品質**: lint/typecheckが通るか

## 出力形式

```
## タスク: [タスク名]

### 完了状況
- [x] Step 1: ...
- [x] Step 2: ...
- [ ] Step 3: ... (未完了の理由)

### テスト結果
- Unit tests: X passed
- E2E tests: X passed

### 残課題
- ...
```
