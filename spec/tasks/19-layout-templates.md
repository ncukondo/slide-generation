# Task: Layout Templates

## Purpose

レイアウト系テンプレート（two-column, three-column, image-text, gallery）を実装する。

## Context

- **関連仕様**: [spec/templates.md](../templates.md) - レイアウト (layouts/)
- **依存タスク**: [06-basic-templates](./06-basic-templates.md)
- **関連ソース**: `templates/layouts/`

## Templates

### two-column
- 2カラムレイアウト
- 左右のコンテンツ
- 幅比率の調整

### three-column
- 3カラムレイアウト
- 均等分割

### image-text
- 画像＋テキスト
- 画像位置（左/右）
- キャプション

### gallery
- 画像ギャラリー
- グリッドレイアウト
- キャプション

## Acceptance Criteria

- [ ] 各レイアウトが正しく表示される
- [ ] 画像の配置が適切
- [ ] レスポンシブ対応
