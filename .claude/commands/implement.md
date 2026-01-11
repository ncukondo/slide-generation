spec/tasks/ROADMAP.mdを確認し、次に実装すべきタスクを特定して実装を開始してください。

## 作業手順

### 1. タスク分析

1. ROADMAP.mdで「Pending」状態のタスクを全て確認
2. 依存タスクが全て完了しているタスクを**並列実行可能タスク**として特定
3. 並列実行可能タスクが複数ある場合は一覧を報告し、どれを実装するか確認

### 2. ブランチとWorktree準備

実装するタスクが決まったら:

1. タスク用のブランチを作成（例: `feature/22-ai-integration`）
2. git worktreeを作成（無ければ）:
   ```bash
   git worktree add ../slide-generation-task-XX feature/XX-task-name
   ```
3. worktree内で初期セットアップ:
   ```bash
   cd ../slide-generation-task-XX
   pnpm install
   ```

### 3. TDD実装サイクル

1. 該当するタスクファイル（spec/tasks/XX-*.md）を読み込み
2. TDDサイクルに従って実装:
   - Red: 失敗するテストを書く
   - Green: テストを通す最小限の実装
   - Refactor: リファクタリング
3. 各ステップ完了後にcommit
4. 次の作業に移る前に残りのcontextを確認し、次のステップ完了までにcompactが必要になりそうなら作業を中断

### 4. 完了処理

1. `pnpm test` で全テストが通ることを確認
2. `pnpm lint && pnpm typecheck` でエラーがないことを確認
3. E2Eテストを実施
4. PRを作成、またはmainにマージ
5. ROADMAP.mdの状態を「Done」に更新
6. worktreeを削除:
   ```bash
   git worktree remove ../slide-generation-task-XX
   ```

## 並列実行について

複数のClaude Codeセッションで異なるタスクを並列実行する場合:
- 各セッションで異なるworktreeを使用
- タスク間の依存関係に注意
- 完了時にmainへのマージ順序を確認

## 注意事項

- context不足になりそうな場合は作業を中断し、進捗を報告
- worktree内で作業することで、mainブランチを汚さない
- 並列実行時は他のworktreeの変更との競合に注意
