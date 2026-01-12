import { Command } from 'commander';
import chalk from 'chalk';
import * as yaml from 'yaml';
import { mkdir, writeFile, rm, readdir } from 'fs/promises';
import { join, basename } from 'path';
import { tmpdir } from 'os';
import type { Server } from 'http';
import { TemplateLoader, type TemplateDefinition } from '../../templates';
import { ConfigLoader } from '../../config/loader';
import { Pipeline, PipelineError } from '../../core/pipeline';
import { ExitCode } from './convert';
import { collectSlideInfo, startStaticServer, checkMarpCliAvailable } from './preview';
import { runMarp } from '../utils/marp-runner';

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

interface PreviewOptions {
  all?: boolean;
  category?: string;
  port?: number;
  config?: string;
}

export interface TemplateScreenshotOptions {
  all?: boolean;
  category?: string;
  output?: string;
  format?: 'png' | 'jpeg' | 'ai';
  width?: number;
  quality?: number;
  contactSheet?: boolean;
  columns?: number;
  config?: string;
  verbose?: boolean;
}

export interface TemplateScreenshotResult {
  success: boolean;
  errors: string[];
  outputDir?: string;
  files?: string[];
}

/**
 * Create the templates preview subcommand
 */
function createPreviewSubcommand(): Command {
  return new Command('preview')
    .description('Preview template in browser')
    .argument('[name]', 'Template name')
    .option('--all', 'Show all templates')
    .option('--category <cat>', 'Filter by category')
    .option('-p, --port <number>', 'Preview server port', '8080')
    .option('-c, --config <path>', 'Config file path')
    .action(async (name: string | undefined, options: PreviewOptions) => {
      try {
        await executeTemplatePreview(name, options);
      } catch (error) {
        console.error(
          chalk.red(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
        );
        process.exitCode = ExitCode.GeneralError;
      }
    });
}

/**
 * Template preview information with schema details
 */
interface TemplatePreviewInfo {
  template: TemplateDefinition;
  imagePath: string;
}

/**
 * Escape HTML special characters to prevent XSS
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Format schema property for HTML display
 */
function formatSchemaPropertyHtml(
  name: string,
  prop: Record<string, unknown>,
  required: boolean
): string {
  const type = (prop['type'] as string) ?? 'unknown';
  const description = prop['description'] as string | undefined;
  const requiredBadge = required
    ? '<span class="badge required">required</span>'
    : '<span class="badge optional">optional</span>';

  return `
    <div class="param">
      <div class="param-header">
        <code class="param-name">${escapeHtml(name)}</code>
        <span class="param-type">${escapeHtml(type)}</span>
        ${requiredBadge}
      </div>
      ${description ? `<div class="param-desc">${escapeHtml(description)}</div>` : ''}
    </div>
  `;
}

/**
 * Generate HTML for template preview with parameter information
 */
function generateTemplatePreviewHtml(previews: TemplatePreviewInfo[]): string {
  const templateCards = previews
    .map((p) => {
      const schema = p.template.schema as {
        type?: string;
        required?: string[];
        properties?: Record<string, Record<string, unknown>>;
      };

      const requiredFields = schema.required ?? [];
      const properties = schema.properties ?? {};

      const paramsHtml = Object.entries(properties)
        .map(([name, prop]) =>
          formatSchemaPropertyHtml(name, prop, requiredFields.includes(name))
        )
        .join('');

      return `
        <div class="template-card">
          <div class="template-preview">
            <img src="${escapeHtml(p.imagePath)}" alt="${escapeHtml(p.template.name)}" class="template-img" data-template="${escapeHtml(p.template.name)}">
          </div>
          <div class="template-info">
            <h2 class="template-name">${escapeHtml(p.template.name)}</h2>
            <p class="template-desc">${escapeHtml(p.template.description)}</p>
            <div class="template-category">Category: <code>${escapeHtml(p.template.category)}</code></div>
            <div class="template-params">
              <h3>Parameters</h3>
              ${paramsHtml || '<p class="no-params">No parameters</p>'}
            </div>
          </div>
        </div>
      `;
    })
    .join('');

  return `<!DOCTYPE html>
<html>
<head>
  <title>Template Preview</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; color: #333; }
    h1 { text-align: center; padding: 24px; background: #fff; border-bottom: 1px solid #ddd; }
    .container { max-width: 1200px; margin: 0 auto; padding: 24px; }
    .template-card { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; background: #fff; border-radius: 12px; padding: 24px; margin-bottom: 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .template-preview { display: flex; align-items: center; justify-content: center; }
    .template-img { max-width: 100%; height: auto; border: 1px solid #ddd; border-radius: 8px; cursor: pointer; transition: transform 0.2s; }
    .template-img:hover { transform: scale(1.02); }
    .template-info { padding: 12px 0; }
    .template-name { font-size: 24px; margin-bottom: 8px; color: #1a1a1a; }
    .template-desc { color: #666; margin-bottom: 16px; font-size: 16px; }
    .template-category { margin-bottom: 16px; font-size: 14px; color: #888; }
    .template-category code { background: #e8e8e8; padding: 2px 8px; border-radius: 4px; }
    .template-params h3 { font-size: 16px; margin-bottom: 12px; color: #444; border-bottom: 1px solid #eee; padding-bottom: 8px; }
    .param { margin-bottom: 12px; padding: 8px; background: #fafafa; border-radius: 6px; }
    .param-header { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .param-name { font-size: 14px; font-weight: 600; color: #0066cc; }
    .param-type { font-size: 12px; color: #666; background: #e8e8e8; padding: 2px 6px; border-radius: 4px; }
    .badge { font-size: 11px; padding: 2px 6px; border-radius: 4px; text-transform: uppercase; }
    .badge.required { background: #fee2e2; color: #dc2626; }
    .badge.optional { background: #e0f2fe; color: #0284c7; }
    .param-desc { font-size: 13px; color: #666; margin-top: 4px; padding-left: 4px; }
    .no-params { color: #999; font-style: italic; }
    .modal { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.9); z-index: 1000; align-items: center; justify-content: center; }
    .modal.active { display: flex; }
    .modal img { max-width: 90%; max-height: 90%; object-fit: contain; }
    .modal-close { position: absolute; top: 20px; right: 30px; color: white; font-size: 40px; cursor: pointer; }
    @media (max-width: 768px) {
      .template-card { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <h1>Template Preview</h1>
  <div class="container">
    ${templateCards || '<p>No templates to preview</p>'}
  </div>
  <div class="modal" id="modal">
    <span class="modal-close">&times;</span>
    <img id="modal-img" src="">
  </div>
  <script>
    // Click on image to show modal
    document.querySelectorAll('.template-img').forEach(img => {
      img.addEventListener('click', () => {
        document.getElementById('modal-img').src = img.src;
        document.getElementById('modal').classList.add('active');
      });
    });
    // Close modal
    document.getElementById('modal').addEventListener('click', (e) => {
      if (e.target.classList.contains('modal') || e.target.classList.contains('modal-close')) {
        document.getElementById('modal').classList.remove('active');
      }
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        document.getElementById('modal').classList.remove('active');
      }
    });
  </script>
</body>
</html>`;
}

/**
 * Generate sample YAML for a template
 */
function generateSampleYaml(template: TemplateDefinition): string {
  const slide = {
    template: template.name,
    content: template.example ?? {},
  };
  return yaml.stringify({ slides: [slide] });
}

/**
 * Execute template preview
 */
export async function executeTemplatePreview(
  name: string | undefined,
  options: PreviewOptions
): Promise<void> {
  // Validate: either name or --all must be specified
  if (!name && !options.all) {
    console.error(chalk.red('Error: Specify a template name or use --all'));
    process.exitCode = ExitCode.GeneralError;
    return;
  }

  const port = Number(options.port) || 8080;
  const previewDir = join(tmpdir(), `slide-gen-template-preview-${Date.now()}`);

  // Check marp-cli availability
  console.log('Checking for Marp CLI...');
  const marpAvailable = await checkMarpCliAvailable();
  if (!marpAvailable) {
    console.error(
      chalk.red(
        'Error: Marp CLI not found. Install it with: npm install -g @marp-team/marp-cli'
      )
    );
    process.exitCode = ExitCode.GeneralError;
    return;
  }
  console.log(chalk.green('✓') + ' Marp CLI found');

  // Load configuration and templates
  const configLoader = new ConfigLoader();
  let configPath = options.config;

  if (!configPath) {
    configPath = await configLoader.findConfig(process.cwd());
  }

  const config = await configLoader.load(configPath);
  const templateLoader = await loadTemplates(options.config);

  // Get templates to preview
  let templates = templateLoader.list();
  if (name) {
    const template = templateLoader.get(name);
    if (!template) {
      console.error(chalk.red(`Error: Template "${name}" not found`));
      process.exitCode = ExitCode.GeneralError;
      return;
    }
    templates = [template];
  } else if (options.category) {
    templates = templateLoader.listByCategory(options.category);
  }

  if (templates.length === 0) {
    console.log('No templates found.');
    return;
  }

  console.log(`Found ${templates.length} template(s) to preview`);

  // Create preview directory
  await mkdir(previewDir, { recursive: true });

  // Initialize pipeline
  console.log('Initializing pipeline...');
  const pipeline = new Pipeline(config);

  try {
    await pipeline.initialize();
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown initialization error';
    console.error(chalk.red(`Error: Failed to initialize pipeline: ${message}`));
    process.exitCode = ExitCode.GeneralError;
    await rm(previewDir, { recursive: true, force: true });
    return;
  }

  // Generate screenshots for each template
  const templatePreviews: TemplatePreviewInfo[] = [];

  for (const template of templates) {
    console.log(`Processing template: ${chalk.cyan(template.name)}...`);

    // Generate sample YAML
    const sampleYaml = generateSampleYaml(template);
    const yamlPath = join(previewDir, `${template.name}.yaml`);
    await writeFile(yamlPath, sampleYaml);

    // Convert to markdown
    const mdPath = join(previewDir, `${template.name}.md`);
    try {
      await pipeline.runWithResult(yamlPath, { outputPath: mdPath });
    } catch (error) {
      const message =
        error instanceof PipelineError
          ? `${error.stage}: ${error.message}`
          : error instanceof Error
            ? error.message
            : 'Unknown error';
      console.warn(chalk.yellow(`  Warning: Failed to convert ${template.name}: ${message}`));
      continue;
    }

    // Generate screenshot
    try {
      runMarp(['--images', 'png', '-o', previewDir, mdPath], {
        projectDir: process.cwd(),
        stdio: 'pipe',
      });
    } catch {
      console.warn(chalk.yellow(`  Warning: Failed to generate screenshot for ${template.name}`));
      continue;
    }

    // Collect slide info for this template (use first slide as preview)
    const templateSlides = await collectSlideInfo(previewDir, template.name, 'png');
    if (templateSlides.length > 0) {
      templatePreviews.push({
        template,
        imagePath: basename(templateSlides[0]!.path),
      });
    }

    console.log(chalk.green('  ✓') + ` ${template.name}`);
  }

  if (templatePreviews.length === 0) {
    console.error(chalk.red('Error: No template previews generated'));
    process.exitCode = ExitCode.GeneralError;
    await rm(previewDir, { recursive: true, force: true });
    return;
  }

  // Generate template preview HTML with parameter info
  const previewHtml = generateTemplatePreviewHtml(templatePreviews);
  await writeFile(join(previewDir, 'index.html'), previewHtml);

  // Start preview server
  console.log(`\nStarting preview server on port ${chalk.cyan(port)}...`);

  let server: Server;
  try {
    server = await startStaticServer(previewDir, port, {
      messagePrefix: 'Template preview server',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to start server';
    console.error(chalk.red(`Error: ${message}`));
    process.exitCode = ExitCode.GeneralError;
    await rm(previewDir, { recursive: true, force: true });
    return;
  }

  // Open browser
  const url = `http://localhost:${port}`;
  try {
    // Dynamic import for optional 'open' package (ESM)
    // Use variable to prevent TypeScript from checking module existence at compile time
    const moduleName = 'open';
    const openModule = (await import(moduleName)) as { default: (target: string) => Promise<unknown> };
    await openModule.default(url);
  } catch {
    console.log(`Open ${chalk.cyan(url)} in your browser`);
  }

  console.log(`\nShowing ${templatePreviews.length} template preview(s)`);
  console.log('Press Ctrl+C to stop the server');

  // Cleanup on exit
  const cleanup = async () => {
    server.close();
    await rm(previewDir, { recursive: true, force: true });
  };

  const signalHandler = async () => {
    console.log('\n' + chalk.yellow('Template preview server stopped.'));
    await cleanup();
    process.exit(0);
  };

  process.on('SIGINT', signalHandler);
  process.on('SIGTERM', signalHandler);

  // Wait for server to close
  await new Promise<void>((resolve) => {
    server.on('close', () => resolve());
  });
}

/**
 * Create the templates screenshot subcommand
 */
function createScreenshotSubcommand(): Command {
  return new Command('screenshot')
    .description('Take screenshots of templates')
    .argument('[name]', 'Template name')
    .option('-a, --all', 'Screenshot all templates')
    .option('--category <cat>', 'Filter by category')
    .option('-o, --output <path>', 'Output directory', './template-screenshots')
    .option('-f, --format <fmt>', 'Output format (png/jpeg/ai)', 'png')
    .option('-w, --width <pixels>', 'Image width', parseInt, 1280)
    .option('-q, --quality <num>', 'JPEG quality (1-100)', parseInt, 80)
    .option('--contact-sheet', 'Generate contact sheet')
    .option('--columns <num>', 'Contact sheet columns', parseInt, 3)
    .option('-c, --config <path>', 'Config file path')
    .option('-v, --verbose', 'Verbose output')
    .action(async (name: string | undefined, options: TemplateScreenshotOptions) => {
      await executeTemplateScreenshot(name, options);
    });
}

/**
 * Execute template screenshot command
 */
export async function executeTemplateScreenshot(
  name: string | undefined,
  options: TemplateScreenshotOptions
): Promise<TemplateScreenshotResult> {
  const errors: string[] = [];

  // Validation
  if (!name && !options.all) {
    console.error(chalk.red('Error: Specify a template name or use --all'));
    process.exitCode = ExitCode.GeneralError;
    return {
      success: false,
      errors: ['Specify a template name or use --all'],
    };
  }

  // Check marp-cli availability
  const marpAvailable = await checkMarpCliAvailable();
  if (!marpAvailable) {
    const message = 'Marp CLI not found. Install it with: npm install -D @marp-team/marp-cli';
    console.error(chalk.red(`Error: ${message}`));
    process.exitCode = ExitCode.GeneralError;
    return { success: false, errors: [message] };
  }

  // Load templates
  const templateLoader = await loadTemplates(options.config);

  // Get templates to screenshot
  let templates = templateLoader.list();
  if (name) {
    const template = templateLoader.get(name);
    if (!template) {
      const message = `Template "${name}" not found`;
      console.error(chalk.red(`Error: ${message}`));
      process.exitCode = ExitCode.GeneralError;
      return { success: false, errors: [message] };
    }
    templates = [template];
  } else if (options.category) {
    templates = templateLoader.listByCategory(options.category);
  }

  if (templates.length === 0) {
    console.log('No templates found.');
    return { success: true, errors: [], files: [] };
  }

  // Setup output directory
  const outputDir = options.output || './template-screenshots';
  await mkdir(outputDir, { recursive: true });

  // Initialize pipeline
  const configLoader = new ConfigLoader();
  const configPath = options.config || (await configLoader.findConfig(process.cwd()));
  const config = await configLoader.load(configPath);
  const pipeline = new Pipeline(config);

  try {
    await pipeline.initialize();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to initialize pipeline';
    console.error(chalk.red(`Error: ${message}`));
    process.exitCode = ExitCode.GeneralError;
    return { success: false, errors: [message] };
  }

  // Create temp directory for intermediate files
  const tempDir = join(tmpdir(), `slide-gen-template-screenshot-${Date.now()}`);
  await mkdir(tempDir, { recursive: true });

  // Determine format settings
  const isAiFormat = options.format === 'ai';
  const imageFormat = isAiFormat ? 'jpeg' : (options.format || 'png');
  const imageWidth = isAiFormat ? 640 : (options.width || 1280);

  const generatedFiles: string[] = [];
  console.log(`Taking screenshots of ${templates.length} template(s)...`);

  for (const template of templates) {
    if (options.verbose) {
      console.log(`Processing: ${template.name}`);
    }

    // Generate sample YAML
    const sampleYaml = generateSampleYaml(template);
    const yamlPath = join(tempDir, `${template.name}.yaml`);
    await writeFile(yamlPath, sampleYaml);

    // Convert to markdown
    const mdPath = join(tempDir, `${template.name}.md`);
    try {
      await pipeline.runWithResult(yamlPath, { outputPath: mdPath });
    } catch (error) {
      const message =
        error instanceof PipelineError
          ? `${error.stage}: ${error.message}`
          : error instanceof Error
            ? error.message
            : 'Unknown error';
      console.warn(chalk.yellow(`  Warning: Failed to convert ${template.name}: ${message}`));
      errors.push(`${template.name}: ${message}`);
      continue;
    }

    // Build marp command args
    const marpArgs = ['--images', imageFormat];

    if (imageWidth !== 1280) {
      const scale = imageWidth / 1280;
      marpArgs.push('--image-scale', String(scale));
    }

    if (imageFormat === 'jpeg') {
      marpArgs.push('--jpeg-quality', String(options.quality || 80));
    }

    // Marp outputs to the same directory as the markdown file
    marpArgs.push('-o', tempDir);
    marpArgs.push(mdPath);

    // Generate screenshot
    try {
      runMarp(marpArgs, {
        projectDir: process.cwd(),
        stdio: options.verbose ? 'inherit' : 'pipe',
      });
    } catch {
      console.warn(chalk.yellow(`  Warning: Failed to generate screenshot for ${template.name}`));
      errors.push(`${template.name}: Marp CLI failed`);
      continue;
    }

    // Find generated image files and rename to template name
    const tempFiles = await readdir(tempDir);
    const slideFiles = tempFiles.filter(
      (f) => f.startsWith(template.name) && f.endsWith(`.${imageFormat}`)
    );

    // For single-slide templates, just use template name; for multi-slide keep numbering
    for (const slideFile of slideFiles) {
      const sourceFile = join(tempDir, slideFile);
      // Extract slide number if present
      const match = slideFile.match(/\.(\d{3})\.\w+$/);
      let targetName: string;
      if (slideFiles.length === 1 || !match) {
        targetName = `${template.name}.${imageFormat}`;
      } else {
        targetName = slideFile;
      }
      const targetFile = join(outputDir, targetName);

      // Copy file to output directory
      const { copyFile: fsCopyFile } = await import('fs/promises');
      await fsCopyFile(sourceFile, targetFile);
      generatedFiles.push(targetName);
    }

    console.log(chalk.green('✓') + ` ${template.name}`);
  }

  // Cleanup temp directory
  await rm(tempDir, { recursive: true, force: true });

  // Generate contact sheet if requested
  if (options.contactSheet && generatedFiles.length > 0) {
    console.log('Generating contact sheet...');

    const { generateContactSheet: genContactSheet } = await import('./screenshot');

    // Build slides array with template names as labels
    const slides = generatedFiles.map((file, index) => ({
      path: join(outputDir, file),
      index: index + 1,
    }));

    const contactSheetPath = join(outputDir, `templates-contact.${imageFormat === 'jpeg' ? 'jpeg' : 'png'}`);

    const contactResult = await genContactSheet(slides, {
      outputPath: contactSheetPath,
      columns: options.columns || 3,
      slideWidth: 320,
      slideHeight: 180,
    });

    if (contactResult.success) {
      generatedFiles.push(basename(contactSheetPath));
      console.log(chalk.green('✓') + ' Contact sheet generated');
    } else {
      console.warn(chalk.yellow(`Warning: ${contactResult.error}`));
      errors.push(contactResult.error || 'Contact sheet generation failed');
    }
  }

  // Output summary
  console.log('');
  if (isAiFormat && generatedFiles.length > 0) {
    // AI-optimized output
    const { estimateTokens: estTokens } = await import('./screenshot');
    const tokensPerImage = estTokens(imageWidth, Math.round(imageWidth * 9 / 16));
    const totalTokens = tokensPerImage * generatedFiles.length;

    console.log('Screenshots saved (AI-optimized):');
    console.log('');
    for (const file of generatedFiles) {
      console.log(`  ${join(outputDir, file)}`);
    }
    console.log('');
    console.log(`Estimated tokens: ~${totalTokens} (${generatedFiles.length} images)`);
  } else {
    console.log(`Output: ${chalk.cyan(outputDir)}`);
    console.log(`Files: ${generatedFiles.length} screenshot(s)`);
  }

  return {
    success: errors.length === 0,
    errors,
    outputDir,
    files: generatedFiles,
  };
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
  cmd.addCommand(createPreviewSubcommand());
  cmd.addCommand(createScreenshotSubcommand());

  return cmd;
}
