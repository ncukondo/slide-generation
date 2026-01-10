import { Command } from 'commander';
import chalk from 'chalk';
import * as yaml from 'yaml';
import { TemplateLoader, type TemplateDefinition } from '../../templates';
import { ConfigLoader } from '../../config/loader';
import { ExitCode } from './convert';

type OutputFormat = 'table' | 'json' | 'llm';
type InfoFormat = 'text' | 'json' | 'llm';

interface ListOptions {
  category?: string;
  format?: OutputFormat;
  config?: string;
}

interface InfoOptions {
  format?: InfoFormat;
  config?: string;
}

interface ExampleOptions {
  config?: string;
}

/**
 * Format template list for table output
 */
function formatTableList(templates: TemplateDefinition[]): string {
  const byCategory = new Map<string, TemplateDefinition[]>();

  for (const template of templates) {
    const cat = template.category;
    if (!byCategory.has(cat)) {
      byCategory.set(cat, []);
    }
    byCategory.get(cat)!.push(template);
  }

  const lines: string[] = ['Templates:', ''];

  // Sort categories alphabetically
  const sortedCategories = Array.from(byCategory.keys()).sort();

  for (const category of sortedCategories) {
    lines.push(`${category}/`);
    const categoryTemplates = byCategory.get(category)!;

    // Sort templates by name within category
    categoryTemplates.sort((a, b) => a.name.localeCompare(b.name));

    for (const template of categoryTemplates) {
      // Pad name to align descriptions
      const paddedName = template.name.padEnd(16);
      lines.push(`  ${paddedName}${template.description}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Format template list for JSON output
 */
function formatJsonList(templates: TemplateDefinition[]): string {
  const output = templates.map((t) => ({
    name: t.name,
    description: t.description,
    category: t.category,
  }));
  return JSON.stringify(output, null, 2);
}

/**
 * Format template list for LLM output
 */
function formatLlmList(templates: TemplateDefinition[]): string {
  const byCategory = new Map<string, TemplateDefinition[]>();

  for (const template of templates) {
    const cat = template.category;
    if (!byCategory.has(cat)) {
      byCategory.set(cat, []);
    }
    byCategory.get(cat)!.push(template);
  }

  const lines: string[] = [];

  // Sort categories alphabetically
  const sortedCategories = Array.from(byCategory.keys()).sort();

  for (const category of sortedCategories) {
    lines.push(`[${category}]`);
    const categoryTemplates = byCategory.get(category)!;

    // Sort templates by name within category
    categoryTemplates.sort((a, b) => a.name.localeCompare(b.name));

    for (const template of categoryTemplates) {
      lines.push(`${template.name}: ${template.description}`);
    }
    lines.push('');
  }

  return lines.join('\n').trim();
}

/**
 * Format template list in the specified format
 */
export function formatTemplateList(
  templates: TemplateDefinition[],
  format: OutputFormat
): string {
  switch (format) {
    case 'json':
      return formatJsonList(templates);
    case 'llm':
      return formatLlmList(templates);
    case 'table':
    default:
      return formatTableList(templates);
  }
}

/**
 * Format schema property for text output
 */
function formatSchemaProperty(
  name: string,
  prop: Record<string, unknown>,
  required: boolean,
  indent: string
): string[] {
  const lines: string[] = [];
  const type = (prop['type'] as string) ?? 'unknown';
  const requiredStr = required ? ', required' : '';
  const description = prop['description'] as string | undefined;

  lines.push(`${indent}${name} (${type}${requiredStr})`);
  if (description) {
    lines.push(`${indent}  ${description}`);
  }

  // Handle nested objects
  if (type === 'object' && prop['properties']) {
    const nestedRequired = (prop['required'] as string[]) ?? [];
    const properties = prop['properties'] as Record<string, Record<string, unknown>>;
    for (const [propName, propDef] of Object.entries(properties)) {
      lines.push(
        ...formatSchemaProperty(propName, propDef, nestedRequired.includes(propName), indent + '  ')
      );
    }
  }

  // Handle array items
  if (type === 'array' && prop['items']) {
    const items = prop['items'] as Record<string, unknown>;
    if (items['type'] === 'object' && items['properties']) {
      const itemRequired = (items['required'] as string[]) ?? [];
      const itemProps = items['properties'] as Record<string, Record<string, unknown>>;
      lines.push(`${indent}  Items:`);
      for (const [propName, propDef] of Object.entries(itemProps)) {
        lines.push(
          ...formatSchemaProperty(propName, propDef, itemRequired.includes(propName), indent + '    ')
        );
      }
    }
  }

  return lines;
}

/**
 * Format template info for text output
 */
function formatTextInfo(template: TemplateDefinition): string {
  const lines: string[] = [
    `Template: ${template.name}`,
    `Description: ${template.description}`,
    `Category: ${template.category}`,
    '',
    'Schema:',
  ];

  const schema = template.schema as {
    type?: string;
    required?: string[];
    properties?: Record<string, Record<string, unknown>>;
  };

  if (schema.properties) {
    const required = schema.required ?? [];
    for (const [name, prop] of Object.entries(schema.properties)) {
      lines.push(...formatSchemaProperty(name, prop, required.includes(name), '  '));
    }
  }

  if (template.example) {
    lines.push('', 'Example:');
    const exampleYaml = yaml.stringify(template.example, { indent: 2 });
    lines.push(
      ...exampleYaml
        .split('\n')
        .filter((l) => l.trim())
        .map((l) => `  ${l}`)
    );
  }

  return lines.join('\n');
}

/**
 * Format template info for JSON output
 */
function formatJsonInfo(template: TemplateDefinition): string {
  return JSON.stringify(
    {
      name: template.name,
      description: template.description,
      category: template.category,
      schema: template.schema,
      example: template.example,
    },
    null,
    2
  );
}

/**
 * Format template info for LLM output
 */
function formatLlmInfo(template: TemplateDefinition): string {
  const lines: string[] = [
    `Template: ${template.name}`,
    `Description: ${template.description}`,
    `Category: ${template.category}`,
    '',
    'Schema:',
  ];

  const schema = template.schema as {
    type?: string;
    required?: string[];
    properties?: Record<string, Record<string, unknown>>;
  };

  if (schema.properties) {
    const required = schema.required ?? [];
    for (const [name, prop] of Object.entries(schema.properties)) {
      const type = (prop['type'] as string) ?? 'unknown';
      const reqStr = required.includes(name) ? ', required' : '';
      lines.push(`  ${name} (${type}${reqStr})`);

      const description = prop['description'] as string | undefined;
      if (description) {
        lines.push(`    ${description}`);
      }
    }
  }

  if (template.example) {
    lines.push('', 'Example:');
    const exampleYaml = yaml.stringify(
      { template: template.name, content: template.example },
      { indent: 2 }
    );
    lines.push(
      ...exampleYaml
        .split('\n')
        .filter((l) => l.trim())
        .map((l) => `  ${l}`)
    );
  }

  return lines.join('\n');
}

/**
 * Format template info in the specified format
 */
export function formatTemplateInfo(
  template: TemplateDefinition,
  format: InfoFormat
): string {
  switch (format) {
    case 'json':
      return formatJsonInfo(template);
    case 'llm':
      return formatLlmInfo(template);
    case 'text':
    default:
      return formatTextInfo(template);
  }
}

/**
 * Format template example as slide YAML
 */
export function formatTemplateExample(template: TemplateDefinition): string {
  const slideYaml = yaml.stringify(
    [{ template: template.name, content: template.example ?? {} }],
    { indent: 2 }
  );
  return slideYaml;
}

/**
 * Load templates from config
 */
async function loadTemplates(configPath?: string): Promise<TemplateLoader> {
  const configLoader = new ConfigLoader();

  if (!configPath) {
    configPath = await configLoader.findConfig(process.cwd());
  }

  const config = await configLoader.load(configPath);
  const templateLoader = new TemplateLoader();

  try {
    await templateLoader.loadBuiltIn(config.templates.builtin);
  } catch {
    // Built-in templates may not exist in some environments
  }

  if (config.templates.custom) {
    try {
      await templateLoader.loadCustom(config.templates.custom);
    } catch {
      // Custom templates directory may not exist
    }
  }

  return templateLoader;
}

/**
 * Create the templates list subcommand
 */
function createListCommand(): Command {
  return new Command('list')
    .description('List available templates')
    .option('--category <cat>', 'Filter by category')
    .option('--format <fmt>', 'Output format (table/json/llm)', 'table')
    .option('-c, --config <path>', 'Config file path')
    .action(async (options: ListOptions) => {
      try {
        const templateLoader = await loadTemplates(options.config);

        let templates = templateLoader.list();

        if (options.category) {
          templates = templateLoader.listByCategory(options.category);
        }

        if (templates.length === 0) {
          if (options.format === 'json') {
            console.log('[]');
          } else {
            console.log('No templates found.');
          }
          return;
        }

        const format = (options.format ?? 'table') as OutputFormat;
        const output = formatTemplateList(templates, format);
        console.log(output);
      } catch (error) {
        console.error(
          chalk.red(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
        );
        process.exitCode = ExitCode.GeneralError;
      }
    });
}

/**
 * Create the templates info subcommand
 */
function createInfoCommand(): Command {
  return new Command('info')
    .description('Show template details')
    .argument('<name>', 'Template name')
    .option('--format <fmt>', 'Output format (text/json/llm)', 'text')
    .option('-c, --config <path>', 'Config file path')
    .action(async (name: string, options: InfoOptions) => {
      try {
        const templateLoader = await loadTemplates(options.config);
        const template = templateLoader.get(name);

        if (!template) {
          console.error(chalk.red(`Error: Template "${name}" not found`));
          process.exitCode = ExitCode.GeneralError;
          return;
        }

        const format = (options.format ?? 'text') as InfoFormat;
        const output = formatTemplateInfo(template, format);
        console.log(output);
      } catch (error) {
        console.error(
          chalk.red(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
        );
        process.exitCode = ExitCode.GeneralError;
      }
    });
}

/**
 * Create the templates example subcommand
 */
function createExampleCommand(): Command {
  return new Command('example')
    .description('Output example YAML for a template')
    .argument('<name>', 'Template name')
    .option('-c, --config <path>', 'Config file path')
    .action(async (name: string, options: ExampleOptions) => {
      try {
        const templateLoader = await loadTemplates(options.config);
        const template = templateLoader.get(name);

        if (!template) {
          console.error(chalk.red(`Error: Template "${name}" not found`));
          process.exitCode = ExitCode.GeneralError;
          return;
        }

        const output = formatTemplateExample(template);
        console.log(output);
      } catch (error) {
        console.error(
          chalk.red(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
        );
        process.exitCode = ExitCode.GeneralError;
      }
    });
}

/**
 * Create the templates command with subcommands
 */
export function createTemplatesCommand(): Command {
  const cmd = new Command('templates')
    .description('Manage and list templates');

  cmd.addCommand(createListCommand());
  cmd.addCommand(createInfoCommand());
  cmd.addCommand(createExampleCommand());

  return cmd;
}
