# Claude Code Context

## Project Overview

Marp スライド生成支援システム - 人間とAIの両方が作成しやすいYAMLソースファイルから、HTMLを含んだMarp対応Markdownを生成するCLIツール。

## Work Guidelines

### Starting Point

必ず `spec/README.md` から読み始めてください。仕様書一覧:

- `spec/source-format.md` - ソースファイル形式
- `spec/templates.md` - テンプレートシステム
- `spec/icons.md` - アイコン・ピクトグラム管理
- `spec/references.md` - 文献引用連携
- `spec/architecture.md` - システムアーキテクチャ
- `spec/cli.md` - CLIインターフェース

### Development Commands

```bash
# Install dependencies
pnpm install

# Development mode (watch)
pnpm dev

# Build
pnpm build

# Run tests
pnpm test

# Type check
pnpm typecheck

# Lint
pnpm lint

# Format
pnpm format
```

### Commit Guidelines

- 頻繁に、論理的な単位でコミットしてください
- コミットメッセージは変更内容を明確に記述
- 大きな変更は小さなコミットに分割

### Code Style

- TypeScript strict mode
- ESM (ES Modules) format
- Functional programming preferred where appropriate
- Zod for schema validation
- Nunjucks for templating

### Architecture

```
src/
├── core/          # Parser, Transformer, Renderer, Pipeline
├── templates/     # Template engine, loader, validators
├── icons/         # Icon registry and resolver
├── references/    # Citation management
├── cli/           # CLI entry point and commands
└── config/        # Configuration loader
```

### Testing

- Vitest for unit and integration tests
- Tests in `tests/` directory
- Run `pnpm test` before committing

### Context Management

重要な情報を失わないよう、長いセッションでは定期的にコンテキストを要約してください。
