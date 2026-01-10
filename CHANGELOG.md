# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2024-03-15

### Added

#### Core Features
- YAML-based source file format for presentations
- Template system with Nunjucks engine
- Zod-based schema validation for templates
- Pipeline architecture (Parser -> Transformer -> Renderer)

#### Templates
- **Basic templates**: title, section, bullet-list, numbered-list
- **Diagram templates**: flow-chart, cycle-diagram, hierarchy, matrix, timeline
- **Data templates**: table, comparison-table
- **Layout templates**: two-column, three-column, image-text, gallery
- **Special templates**: quote, code-block, bibliography, custom

#### CLI Commands
- `convert` - Convert YAML source to Marp Markdown
- `validate` - Validate source files
- `watch` - Watch files for changes and auto-convert
- `preview` - Preview with Marp CLI
- `templates list/info/example` - Template management
- `icons list/search/preview` - Icon management
- `init` - Initialize new project

#### Icon System
- Icon registry with aliases
- Support for Material Icons and Heroicons (CDN)
- Custom icon support
- Icon caching with TTL

#### Reference System
- Integration with reference-manager CLI
- Citation key extraction from YAML
- Multiple citation styles support
- Fallback handling when reference-manager unavailable

#### Documentation
- README with installation and usage instructions
- Example presentations (basic, academic, corporate)
- Specification documents in `spec/` directory

### Technical Details
- TypeScript with strict mode
- ESM modules
- Node.js >= 22.0.0 requirement
- Vitest for testing (500+ tests)
- oxlint for linting
