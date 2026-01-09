# Task: Diagram Templates

## Purpose

図表系テンプレート（cycle-diagram, flow-chart, hierarchy, matrix, timeline）を実装する。

## Context

- **関連仕様**: [spec/templates.md](../templates.md) - 図表 (diagrams/)
- **依存タスク**: [06-basic-templates](./06-basic-templates.md)
- **関連ソース**: `templates/diagrams/`

## Templates

### cycle-diagram
- 循環図（3-6要素）
- ノード配置の自動計算
- 矢印の描画

### flow-chart
- フローチャート
- ステップ間の接続
- 分岐対応

### hierarchy
- 階層図・組織図
- 再帰的なノード構造
- 複数レベル対応

### matrix
- 2x2マトリクス
- 象限ラベル
- 項目配置

### timeline
- タイムライン
- イベントの配置
- 期間表示

## Acceptance Criteria

- [ ] 5つの図表テンプレートが定義されている
- [ ] CSSが適切にスタイリングされている
- [ ] レスポンシブ対応（スライドサイズに適応）
