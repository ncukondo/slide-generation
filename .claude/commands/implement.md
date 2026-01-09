spec/tasks/ROADMAP.mdを確認し、次に実装すべきタスクを特定して実装を開始してください。

## 作業手順

1. ROADMAP.mdで「Pending」状態の最初のタスク（依存タスクが全て完了しているもの）を特定
2. 該当するタスクファイル（spec/tasks/XX-*.md）を読み込み
3. TDDサイクルに従って実装:
   - Red: 失敗するテストを書く
   - Green: テストを通す最小限の実装
   - Refactor: リファクタリング
4. 各ステップ完了後にcommit
5. 全ステップ完了後、ROADMAP.mdの状態を「Done」に更新

## 注意事項

- `pnpm test` で全テストが通ることを確認
- `pnpm lint && pnpm typecheck` でエラーがないことを確認
- E2Eテストを必ず実施
- context不足になりそうな場合は作業を中断
