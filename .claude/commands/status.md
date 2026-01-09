プロジェクトの現在の状態を報告してください。

## 確認項目

1. **ROADMAP進捗**: spec/tasks/ROADMAP.md を読み、完了/進行中/未着手のタスク数を報告
2. **テスト状態**: `pnpm test` の結果
3. **ビルド状態**: `pnpm build` の結果
4. **未コミット変更**: `git status` の結果

## 出力形式

```
## プロジェクト状態

### 進捗
- 完了: X タスク
- 進行中: X タスク
- 未着手: X タスク

### 次のタスク
- [XX-task-name](spec/tasks/XX-task-name.md)

### テスト
- X passed, X failed

### ビルド
- 成功/失敗

### Git
- ブランチ: xxx
- 未コミット変更: あり/なし
```
