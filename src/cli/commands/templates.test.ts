import { describe, it, expect } from 'vitest';
import { Command } from 'commander';
import { createTemplatesCommand, formatTemplateList, formatTemplateInfo, formatTemplateExample } from './templates';
import type { TemplateDefinition } from '../../templates';

describe('templates command', () => {
  const mockTemplates: TemplateDefinition[] = [
    {
      name: 'title',
      description: 'タイトルスライド',
      category: 'basic',
      schema: {
        type: 'object',
        required: ['title'],
        properties: {
          title: { type: 'string', description: 'メインタイトル' },
          subtitle: { type: 'string', description: 'サブタイトル' },
        },
      },
      example: {
        title: 'プレゼンテーションタイトル',
        subtitle: 'サブタイトル',
      },
      output: '# {{ content.title }}',
    },
    {
      name: 'bullet-list',
      description: '箇条書きリスト',
      category: 'basic',
      schema: {
        type: 'object',
        required: ['title', 'items'],
        properties: {
          title: { type: 'string' },
          items: { type: 'array', items: { type: 'string' } },
        },
      },
      example: {
        title: 'ポイント',
        items: ['項目1', '項目2', '項目3'],
      },
      output: '# {{ content.title }}\n{% for item in content.items %}\n- {{ item }}\n{% endfor %}',
    },
    {
      name: 'cycle-diagram',
      description: '循環図（3〜6要素対応）',
      category: 'diagrams',
      schema: {
        type: 'object',
        required: ['title', 'nodes'],
        properties: {
          title: { type: 'string', description: 'スライドタイトル' },
          nodes: {
            type: 'array',
            minItems: 3,
            maxItems: 6,
            description: '循環図のノード',
            items: {
              type: 'object',
              properties: {
                label: { type: 'string', description: 'ノードのラベル' },
                icon: { type: 'string', description: 'アイコン参照' },
                color: { type: 'string', description: 'ノードの色' },
              },
            },
          },
        },
      },
      example: {
        title: 'PDCAサイクル',
        nodes: [
          { label: 'Plan', icon: 'planning', color: '#4CAF50' },
          { label: 'Do', icon: 'action', color: '#2196F3' },
          { label: 'Check', icon: 'analysis', color: '#FF9800' },
          { label: 'Act', icon: 'improvement', color: '#9C27B0' },
        ],
      },
      output: '<div class="cycle">...</div>',
      css: '.cycle { display: flex; }',
    },
  ];

  describe('createTemplatesCommand', () => {
    it('should create a command with proper name and description', () => {
      const cmd = createTemplatesCommand();
      expect(cmd.name()).toBe('templates');
      expect(cmd.description()).toBe('Manage and list templates');
    });

    it('should have list subcommand', () => {
      const cmd = createTemplatesCommand();
      const listCmd = cmd.commands.find((c: Command) => c.name() === 'list');
      expect(listCmd).toBeDefined();
    });

    it('should have info subcommand', () => {
      const cmd = createTemplatesCommand();
      const infoCmd = cmd.commands.find((c: Command) => c.name() === 'info');
      expect(infoCmd).toBeDefined();
    });

    it('should have example subcommand', () => {
      const cmd = createTemplatesCommand();
      const exampleCmd = cmd.commands.find((c: Command) => c.name() === 'example');
      expect(exampleCmd).toBeDefined();
    });
  });

  describe('formatTemplateList', () => {
    describe('table format', () => {
      it('should group templates by category', () => {
        const output = formatTemplateList(mockTemplates, 'table');
        expect(output).toContain('basic/');
        expect(output).toContain('diagrams/');
      });

      it('should list template names and descriptions', () => {
        const output = formatTemplateList(mockTemplates, 'table');
        expect(output).toContain('title');
        expect(output).toContain('タイトルスライド');
        expect(output).toContain('bullet-list');
        expect(output).toContain('cycle-diagram');
      });

      it('should filter by category', () => {
        const basicOnly = mockTemplates.filter((t) => t.category === 'basic');
        const output = formatTemplateList(basicOnly, 'table');
        expect(output).toContain('basic/');
        expect(output).not.toContain('diagrams/');
      });
    });

    describe('json format', () => {
      it('should output valid JSON', () => {
        const output = formatTemplateList(mockTemplates, 'json');
        const parsed = JSON.parse(output);
        expect(Array.isArray(parsed)).toBe(true);
      });

      it('should include all template fields', () => {
        const output = formatTemplateList(mockTemplates, 'json');
        const parsed = JSON.parse(output);
        expect(parsed[0]).toHaveProperty('name');
        expect(parsed[0]).toHaveProperty('description');
        expect(parsed[0]).toHaveProperty('category');
      });
    });

    describe('llm format', () => {
      it('should output concise format for AI', () => {
        const output = formatTemplateList(mockTemplates, 'llm');
        // LLM format should be concise: name: description
        expect(output).toMatch(/title:\s+タイトルスライド/);
        expect(output).toMatch(/bullet-list:\s+箇条書きリスト/);
      });

      it('should group by category', () => {
        const output = formatTemplateList(mockTemplates, 'llm');
        expect(output).toContain('[basic]');
        expect(output).toContain('[diagrams]');
      });
    });
  });

  describe('formatTemplateInfo', () => {
    const template = mockTemplates[2]!; // cycle-diagram

    describe('text format', () => {
      it('should show template name and description', () => {
        const output = formatTemplateInfo(template, 'text');
        expect(output).toContain('Template: cycle-diagram');
        expect(output).toContain('Description: 循環図（3〜6要素対応）');
      });

      it('should show category', () => {
        const output = formatTemplateInfo(template, 'text');
        expect(output).toContain('Category: diagrams');
      });

      it('should show schema information', () => {
        const output = formatTemplateInfo(template, 'text');
        expect(output).toContain('Schema:');
        expect(output).toContain('title');
        expect(output).toContain('nodes');
      });

      it('should indicate required fields', () => {
        const output = formatTemplateInfo(template, 'text');
        expect(output).toMatch(/title.*required/i);
        expect(output).toMatch(/nodes.*required/i);
      });
    });

    describe('json format', () => {
      it('should output valid JSON', () => {
        const output = formatTemplateInfo(template, 'json');
        const parsed = JSON.parse(output);
        expect(parsed.name).toBe('cycle-diagram');
      });

      it('should include schema', () => {
        const output = formatTemplateInfo(template, 'json');
        const parsed = JSON.parse(output);
        expect(parsed.schema).toBeDefined();
      });
    });

    describe('llm format', () => {
      it('should output AI-friendly format', () => {
        const output = formatTemplateInfo(template, 'llm');
        expect(output).toContain('cycle-diagram');
        expect(output).toContain('title (string, required)');
        expect(output).toContain('nodes (array, required)');
      });

      it('should include example', () => {
        const output = formatTemplateInfo(template, 'llm');
        expect(output).toContain('Example:');
        expect(output).toContain('PDCAサイクル');
      });
    });
  });

  describe('formatTemplateExample', () => {
    const template = mockTemplates[0]!; // title

    it('should output valid YAML', () => {
      const output = formatTemplateExample(template);
      expect(output).toContain('template: title');
      expect(output).toContain('content:');
    });

    it('should include example content', () => {
      const output = formatTemplateExample(template);
      expect(output).toContain('title: プレゼンテーションタイトル');
      expect(output).toContain('subtitle: サブタイトル');
    });

    it('should be properly formatted as slide YAML', () => {
      const output = formatTemplateExample(template);
      expect(output).toMatch(/^- template: /m);
    });
  });
});
