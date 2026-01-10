# Task: CLI Validate Command

## Purpose

`slide-gen validate` コマンドを実装し、ソースファイルの検証（変換なし）を可能にする。

## Context

- **関連仕様**: [spec/cli.md](../cli.md) - validateセクション
- **依存タスク**: [03-yaml-parser](./03-yaml-parser.md), [05-template-loader](./05-template-loader.md)
- **関連ソース**: `src/cli/commands/`

## Implementation

```typescript
// src/cli/commands/validate.ts
export function createValidateCommand(): Command {
  return new Command('validate')
    .description('Validate source file without conversion')
    .argument('<input>', 'Input YAML file')
    .option('--strict', 'Treat warnings as errors')
    .option('--format <fmt>', 'Output format (text/json)')
    .action(async (input, options) => {
      // Validation logic
    });
}
```

## Output Format

```
Validating presentation.yaml...

✓ YAML syntax valid
✓ Meta section valid
✓ 8 slides validated
✓ All templates found
✓ All icons resolved
✓ 5 references found

Validation passed!
```

## Acceptance Criteria

- [ ] YAML構文チェック
- [ ] スキーマ検証
- [ ] テンプレート存在確認
- [ ] アイコン参照確認
- [ ] 引用キー確認
