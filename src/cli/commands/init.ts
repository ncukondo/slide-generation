import { Command } from 'commander';
import { mkdir, writeFile, access, readdir } from 'fs/promises';
import { join, resolve } from 'path';
import chalk from 'chalk';
import ora from 'ora';
import { ExitCode } from './convert';
import {
  generateSkillMd,
  generateClaudeMd,
  generateAgentsMd,
  generateOpenCodeAgent,
  generateTemplatesRef,
  generateWorkflowsRef,
  generateSlideCreateCommand,
  generateSlideValidateCommand,
  generateSlidePreviewCommand,
  generateSlideScreenshotCommand,
  generateSlideThemeCommand,
} from '../templates/ai';

export interface InitOptions {
  template?: string;
  examples?: boolean;
  aiConfig?: boolean;
  skipMarpInstall?: boolean;
}

/**
 * Create the init command
 */
export function createInitCommand(): Command {
  return new Command('init')
    .description('Initialize a new project')
    .argument('[directory]', 'Target directory', '.')
    .option('--template <name>', 'Initial template')
    .option('--no-examples', 'Do not create sample files')
    .option('--no-ai-config', 'Do not create AI assistant config files')
    .option('--skip-marp-install', 'Skip Marp CLI installation prompt')
    .action(async (directory: string, options: InitOptions) => {
      await executeInit(directory, options);
    });
}

/**
 * Execute the init command
 */
export async function executeInit(
  directory: string,
  options: InitOptions
): Promise<void> {
  const spinner = ora();
  const targetDir = resolve(directory);
  const includeExamples = options.examples !== false;
  const includeAiConfig = options.aiConfig !== false;

  try {
    spinner.start(`Initializing project in ${targetDir}...`);

    // Check if directory exists and has content
    try {
      await access(targetDir);
      const entries = await readdir(targetDir);
      if (entries.length > 0) {
        spinner.info(`Directory ${targetDir} already exists, adding files...`);
      }
    } catch {
      // Directory doesn't exist, will be created
    }

    // Create directory structure
    await mkdir(targetDir, { recursive: true });
    await mkdir(join(targetDir, 'themes'), { recursive: true });
    await mkdir(join(targetDir, 'icons', 'custom'), { recursive: true });

    // Create config.yaml
    const configContent = generateConfigContent();
    await writeFileIfNotExists(join(targetDir, 'config.yaml'), configContent);

    // Create themes/custom.css
    const customCssContent = generateCustomCssContent();
    await writeFileIfNotExists(join(targetDir, 'themes', 'custom.css'), customCssContent);

    // Create sample files if examples are enabled
    if (includeExamples) {
      const presentationContent = generatePresentationContent(options.template);
      await writeFileIfNotExists(join(targetDir, 'presentation.yaml'), presentationContent);
    }

    // Create AI config files
    if (includeAiConfig) {
      await generateAiConfig(targetDir);
    }

    spinner.succeed(`Project initialized in ${targetDir}`);

    // Print summary
    console.log('');
    console.log(chalk.green('Created files:'));
    console.log(`  ${chalk.cyan('config.yaml')} - Project configuration`);
    console.log(`  ${chalk.cyan('themes/custom.css')} - Custom theme styles`);
    console.log(`  ${chalk.cyan('icons/custom/')} - Custom icons directory`);
    if (includeExamples) {
      console.log(`  ${chalk.cyan('presentation.yaml')} - Sample presentation`);
    }
    if (includeAiConfig) {
      console.log(`  ${chalk.cyan('.skills/')} - AgentSkills configuration`);
      console.log(`  ${chalk.cyan('CLAUDE.md')} - Claude Code configuration`);
      console.log(`  ${chalk.cyan('AGENTS.md')} - OpenCode configuration`);
      console.log(`  ${chalk.cyan('.cursorrules')} - Cursor configuration`);
      console.log(`  ${chalk.cyan('.claude/commands/')} - Claude Code slash commands`);
      console.log(`  ${chalk.cyan('.opencode/agent/')} - OpenCode agent configuration`);
    }
    console.log('');
    console.log(chalk.blue('Next steps:'));
    console.log(`  1. Edit ${chalk.yellow('presentation.yaml')} to add your slides`);
    console.log(`  2. Run ${chalk.yellow('slide-gen convert presentation.yaml')} to generate markdown`);
  } catch (error) {
    spinner.fail('Failed to initialize project');
    console.error(
      chalk.red(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    );
    process.exitCode = ExitCode.GeneralError;
  }
}

/**
 * Write file only if it doesn't exist
 */
async function writeFileIfNotExists(filePath: string, content: string): Promise<void> {
  try {
    await access(filePath);
    // File exists, skip
  } catch {
    // File doesn't exist, create it
    await writeFile(filePath, content, 'utf-8');
  }
}

/**
 * Generate AI configuration files
 */
async function generateAiConfig(targetDir: string): Promise<void> {
  // Create directories
  await mkdir(join(targetDir, '.skills', 'slide-assistant', 'references'), { recursive: true });
  await mkdir(join(targetDir, '.skills', 'slide-assistant', 'scripts'), { recursive: true });
  await mkdir(join(targetDir, '.claude', 'commands'), { recursive: true });
  await mkdir(join(targetDir, '.opencode', 'agent'), { recursive: true });

  // Generate AgentSkills (common)
  await writeFileIfNotExists(
    join(targetDir, '.skills', 'slide-assistant', 'SKILL.md'),
    generateSkillMd()
  );
  await writeFileIfNotExists(
    join(targetDir, '.skills', 'slide-assistant', 'references', 'templates.md'),
    generateTemplatesRef()
  );
  await writeFileIfNotExists(
    join(targetDir, '.skills', 'slide-assistant', 'references', 'workflows.md'),
    generateWorkflowsRef()
  );

  // Generate Claude Code files
  await writeFileIfNotExists(join(targetDir, 'CLAUDE.md'), generateClaudeMd());

  // Generate commands
  const commandGenerators: Record<string, () => string> = {
    'slide-create': generateSlideCreateCommand,
    'slide-validate': generateSlideValidateCommand,
    'slide-preview': generateSlidePreviewCommand,
    'slide-screenshot': generateSlideScreenshotCommand,
    'slide-theme': generateSlideThemeCommand,
  };
  for (const [name, generator] of Object.entries(commandGenerators)) {
    await writeFileIfNotExists(
      join(targetDir, '.claude', 'commands', `${name}.md`),
      generator()
    );
  }

  // Generate OpenCode files
  await writeFileIfNotExists(join(targetDir, 'AGENTS.md'), generateAgentsMd());
  await writeFileIfNotExists(
    join(targetDir, '.opencode', 'agent', 'slide.md'),
    generateOpenCodeAgent()
  );

  // Generate Cursor files (same as AGENTS.md)
  await writeFileIfNotExists(join(targetDir, '.cursorrules'), generateAgentsMd());
}

/**
 * Generate config.yaml content
 */
function generateConfigContent(): string {
  return `# slide-gen configuration
# See https://github.com/example/slide-generation for documentation

templates:
  # Path to built-in templates (relative to project root)
  builtin: ./templates
  # Path to custom templates (optional)
  # custom: ./my-templates

icons:
  # Path to icon registry file
  registry: ./icons/registry.yaml
  cache:
    enabled: true
    directory: .cache/icons
    ttl: 86400

references:
  enabled: true
  connection:
    type: cli
    command: ref
  format:
    locale: ja-JP

output:
  theme: default
  inlineStyles: false
`;
}

/**
 * Generate custom CSS content
 */
function generateCustomCssContent(): string {
  return `/* Custom Marp theme styles */
/* See https://marpit.marp.app/theme-css for documentation */

/*
section {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
}

h1 {
  color: #fff;
  text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
}
*/
`;
}

/**
 * Generate sample presentation content
 */
function generatePresentationContent(_template?: string): string {
  const baseContent = `# Sample Presentation
# Generated by slide-gen init

meta:
  title: My Presentation
  author: Your Name
  date: "${new Date().toISOString().split('T')[0]}"
  theme: default

slides:
  - template: title
    content:
      title: My Presentation
      subtitle: A sample slide deck
      author: Your Name

  - template: content
    content:
      title: Introduction
      body: |
        Welcome to this presentation!

        - Point one
        - Point two
        - Point three

  - template: section
    content:
      title: Section Title
      subtitle: Section description

  - template: content
    content:
      title: Main Content
      body: |
        Here's the main content of your presentation.

        You can use **markdown** formatting in the body text.

  - template: end
    content:
      title: Thank You
      subtitle: Questions?
`;

  return baseContent;
}
