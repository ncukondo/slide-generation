# Marp スライド生成支援システム - 仕様書

## 概要

本システムは、人間とAIの両方が作成しやすいソースファイルから、HTMLを含んだMarp対応Markdownを生成するツールです。

### 背景と目的

既存のスライド作成ツールには以下の課題があります：

- **Manus等の自動生成サービス**: レイアウトが自動化されすぎ、組織のテーマに合わせにくい、作成後の編集が困難
- **Marp**: 編集しやすいがCSSのみでは再現が難しいレイアウトがある

本システムは、これらの課題を解決するために：

1. 人間もAIも作成しやすい構造化ソースファイル形式を定義
2. 再利用可能なテンプレートシステムを提供
3. HTMLを含んだMarpソースへの変換を自動化
4. アイコン・ピクトグラムの管理と再利用を容易化
5. 文献引用との連携を実現

### システム構成図

```
[ソースファイル (.yaml)]
        │
        ▼
   ┌─────────────┐
   │  変換エンジン  │◀── [テンプレート定義]
   └─────────────┘◀── [アイコンレジストリ]
        │          ◀── [reference-manager (CLI)]
        ▼
[Marp Markdown (.md)]
        │
        ▼ (Marp CLI)
[PDF / HTML / PPTX]
```

## 仕様書一覧

| ファイル | 内容 |
|---------|------|
| [source-format.md](./source-format.md) | ソースファイル形式（YAML） |
| [sources.md](./sources.md) | ソース資料管理・AI協働フロー |
| [templates.md](./templates.md) | テンプレートシステム |
| [icons.md](./icons.md) | アイコン・ピクトグラム管理 |
| [images.md](./images.md) | 画像管理・AI協働フロー |
| [references.md](./references.md) | 文献引用連携 |
| [architecture.md](./architecture.md) | システムアーキテクチャ |
| [cli.md](./cli.md) | CLIインターフェース |
| [ai-integration.md](./ai-integration.md) | AI Agent連携 |

## 技術スタック

| 項目 | 選択 |
|------|------|
| 言語 | TypeScript |
| ソースファイル形式 | YAML |
| テンプレートエンジン | Nunjucks |
| スキーマ検証 | Zod |
| CLI フレームワーク | Commander.js |
| ビルドツール | tsup |
| テストフレームワーク | Vitest |
| 文献管理連携 | reference-manager (CLI) |

## 設計原則

1. **AI親和性**: LLMが生成・解釈しやすい明確な構造
2. **人間可読性**: 手動編集も容易なYAML形式
3. **拡張性**: カスタムテンプレートの追加が容易
4. **Marp互換**: 出力はそのままMarp CLIで処理可能
5. **単一責任**: 変換のみに集中し、レンダリングはMarpに委譲
