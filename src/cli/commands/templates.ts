import { Command } from 'commander';
import chalk from 'chalk';
import * as yaml from 'yaml';
import { mkdir, writeFile, rm, readFile } from 'fs/promises';
import { join, basename, extname } from 'path';
import * as path from 'path';
import { tmpdir } from 'os';
import { execSync, execFileSync } from 'child_process';
import { createServer, Server } from 'http';
import { TemplateLoader, type TemplateDefinition } from '../../templates';
import { ConfigLoader } from '../../config/loader';
import { Pipeline, PipelineError } from '../../core/pipeline';
import { ExitCode } from './convert';
import { generateGalleryHtml, collectSlideInfo, type SlideInfo } from './preview';

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
 * Start a simple HTTP server to serve template preview files
 */
function startTemplatePreviewServer(
  previewDir: string,
  port: number
): Promise<Server> {
  return new Promise((resolve, reject) => {
    const mimeTypes: Record<string, string> = {
      '.html': 'text/html',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.css': 'text/css',
      '.js': 'application/javascript',
    };

    const server = createServer(async (req, res) => {
      try {
        // Parse URL and get pathname only (ignore query strings)
        const urlPath = new URL(req.url || '/', `http://localhost`).pathname;
        const requestedPath = urlPath === '/' ? '/index.html' : urlPath;

        // Resolve to absolute path and normalize (handles .. and .)
        const resolvedPreviewDir = path.resolve(previewDir);
        const filePath = path.resolve(previewDir, '.' + requestedPath);

        // Security: Ensure the resolved path is within previewDir (prevent path traversal)
        if (!filePath.startsWith(resolvedPreviewDir + '/') && filePath !== resolvedPreviewDir) {
          res.writeHead(403);
          res.end('Forbidden');
          return;
        }

        const ext = extname(filePath);
        const contentType = mimeTypes[ext] || 'application/octet-stream';

        const data = await readFile(filePath);
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(data);
      } catch {
        res.writeHead(404);
        res.end('Not found');
      }
    });

    server.on('error', reject);
    server.listen(port, () => {
      console.log(`Template preview server running at ${chalk.cyan(`http://localhost:${port}`)}`);
      resolve(server);
    });
  });
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
  try {
    execSync('marp --version', { stdio: 'ignore', timeout: 5000 });
  } catch {
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
  const allSlides: SlideInfo[] = [];

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
      execFileSync('npx', ['marp', '--images', 'png', '-o', previewDir, mdPath], {
        stdio: 'pipe',
      });
    } catch {
      console.warn(chalk.yellow(`  Warning: Failed to generate screenshot for ${template.name}`));
      continue;
    }

    // Collect slide info for this template
    const templateSlides = await collectSlideInfo(previewDir, template.name, 'png');
    for (const slide of templateSlides) {
      allSlides.push({
        ...slide,
        path: basename(slide.path),
        title: `${template.name} - ${template.description}`,
      });
    }

    console.log(chalk.green('  ✓') + ` ${template.name}`);
  }

  if (allSlides.length === 0) {
    console.error(chalk.red('Error: No template previews generated'));
    process.exitCode = ExitCode.GeneralError;
    await rm(previewDir, { recursive: true, force: true });
    return;
  }

  // Generate gallery HTML
  const galleryHtml = generateGalleryHtml(allSlides);
  await writeFile(join(previewDir, 'index.html'), galleryHtml);

  // Start preview server
  console.log(`\nStarting preview server on port ${chalk.cyan(port)}...`);

  let server: Server;
  try {
    server = await startTemplatePreviewServer(previewDir, port);
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

  console.log(`\nShowing ${allSlides.length} template preview(s)`);
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
 * Create the templates command with subcommands
 */
export function createTemplatesCommand(): Command {
  const cmd = new Command('templates')
    .description('Manage and list templates');

  cmd.addCommand(createListCommand());
  cmd.addCommand(createInfoCommand());
  cmd.addCommand(createExampleCommand());
  cmd.addCommand(createPreviewSubcommand());

  return cmd;
}
