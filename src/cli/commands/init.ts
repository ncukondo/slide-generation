import { Command } from 'commander';
import { mkdir, writeFile, access, readdir, cp } from 'fs/promises';
import { existsSync } from 'fs';
import { execSync, spawnSync } from 'child_process';
import { createInterface } from 'readline';
import { basename, dirname, join, resolve, sep } from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import ora from 'ora';
import { ExitCode } from './convert.js';
import { SourcesManager } from '../../sources/manager.js';
import { SourceImporter } from '../../sources/importer.js';
import {
  generateSkillMd,
  generateClaudeMd,
  generateAgentsMd,
  generateOpenCodeAgent,
  generateTemplatesRef,
  generateWorkflowsRef,
  generateReferenceSkillMd,
  generateSlideCreateCommand,
  generateSlideValidateCommand,
  generateSlidePreviewCommand,
  generateSlideScreenshotCommand,
  generateSlideThemeCommand,
  generateSlideReferencesCommand,
} from '../templates/ai';

export interface InitOptions {
  template?: string;
  examples?: boolean;
  aiConfig?: boolean;
  sources?: boolean;
  fromDirectory?: string;
  skipMarpInstall?: boolean;
}

/**
 * Get the package root directory
 * Works for both bundled (dist/cli/index.js) and source (src/cli/commands/init.ts)
 */
function getPackageRoot(): string {
  const __dirname = dirname(fileURLToPath(import.meta.url));

  // Check if we're in source (src/) or bundled (dist/)
  // Use path separator agnostic check for Windows compatibility
  if (__dirname.includes(`${sep}src${sep}`) || __dirname.includes('/src/')) {
    // Source: go up from src/cli/commands to package root
    return join(__dirname, '..', '..', '..');
  }
  // Bundled: go up from dist/cli to package root
  return join(__dirname, '..', '..');
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
    .option('--no-sources', 'Do not create sources directory')
    .option('--from-directory <path>', 'Import materials from directory')
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
  const includeSources = options.sources !== false;

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

    // Copy built-in templates and icons registry from package
    const packageRoot = getPackageRoot();

    // Copy templates
    const sourceTemplatesDir = join(packageRoot, 'templates');
    const targetTemplatesDir = join(targetDir, 'templates');

    try {
      await access(targetTemplatesDir);
      // Templates directory already exists, skip copying
    } catch {
      // Templates directory doesn't exist, copy from package
      await cp(sourceTemplatesDir, targetTemplatesDir, { recursive: true });
    }

    // Copy icons registry
    const sourceIconsRegistry = join(packageRoot, 'icons', 'registry.yaml');
    const targetIconsRegistry = join(targetDir, 'icons', 'registry.yaml');
    await copyFileIfNotExists(sourceIconsRegistry, targetIconsRegistry);

    // Copy default theme
    const sourceDefaultTheme = join(packageRoot, 'themes', 'default.css');
    const targetDefaultTheme = join(targetDir, 'themes', 'default.css');
    await copyFileIfNotExists(sourceDefaultTheme, targetDefaultTheme);

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

    // Create sources directory
    let sourcesImported = 0;
    if (includeSources) {
      const sourcesManager = new SourcesManager(targetDir);
      if (!(await sourcesManager.exists())) {
        await sourcesManager.init({
          name: 'Untitled Project',
          setup_pattern: options.fromDirectory ? 'A' : undefined,
          original_source: options.fromDirectory ? resolve(options.fromDirectory) : undefined,
        });

        // Import from directory if specified
        if (options.fromDirectory) {
          const importer = new SourceImporter(targetDir, sourcesManager);
          const result = await importer.importDirectory(resolve(options.fromDirectory), {
            recursive: true,
          });
          sourcesImported = result.imported;
        }
      }
    }

    spinner.succeed(`Project initialized in ${targetDir}`);

    // Print summary
    console.log('');
    console.log(chalk.green('Created files:'));
    console.log(`  ${chalk.cyan('config.yaml')} - Project configuration`);
    console.log(`  ${chalk.cyan('templates/')} - Slide templates`);
    console.log(`  ${chalk.cyan('themes/default.css')} - Default theme`);
    console.log(`  ${chalk.cyan('themes/custom.css')} - Custom theme styles`);
    console.log(`  ${chalk.cyan('icons/registry.yaml')} - Icon registry`);
    console.log(`  ${chalk.cyan('icons/custom/')} - Custom icons directory`);
    if (includeExamples) {
      console.log(`  ${chalk.cyan('presentation.yaml')} - Sample presentation`);
    }
    if (includeAiConfig) {
      console.log(`  ${chalk.cyan('.skills/')} - AgentSkills configuration`);
      console.log(`  ${chalk.cyan('.claude/skills/')} - Claude Code skills`);
      console.log(`  ${chalk.cyan('CLAUDE.md')} - Claude Code configuration`);
      console.log(`  ${chalk.cyan('AGENTS.md')} - OpenCode configuration`);
      console.log(`  ${chalk.cyan('.cursorrules')} - Cursor configuration`);
      console.log(`  ${chalk.cyan('.claude/commands/')} - Claude Code slash commands`);
      console.log(`  ${chalk.cyan('.opencode/agent/')} - OpenCode agent configuration`);
    }
    if (includeSources) {
      let sourcesMsg = `  ${chalk.cyan('sources/')} - Source materials directory`;
      if (sourcesImported > 0) {
        sourcesMsg += ` (${sourcesImported} files imported)`;
      }
      console.log(sourcesMsg);
    }
    console.log('');
    console.log(chalk.blue('Next steps:'));
    console.log(`  1. Edit ${chalk.yellow('presentation.yaml')} to add your slides`);
    console.log(`  2. Run ${chalk.yellow('slide-gen convert presentation.yaml')} to generate markdown`);

    // Show Marp CLI installation info if not skipped
    if (options.skipMarpInstall !== true) {
      await showMarpCliInfo(targetDir);
    }
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
 * Copy file only if destination doesn't exist
 */
async function copyFileIfNotExists(source: string, dest: string): Promise<void> {
  try {
    await access(dest);
    // File exists, skip
  } catch {
    // File doesn't exist, copy from source
    await cp(source, dest);
  }
}

/**
 * Check if Marp CLI is installed globally
 * Uses 'marp --version' directly
 */
export function isMarpCliInstalledGlobally(): boolean {
  try {
    execSync('marp --version', { stdio: 'pipe', timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if Marp CLI is installed locally in the project
 * Checks node_modules/.bin/marp
 */
export function isMarpCliInstalledLocally(targetDir?: string): boolean {
  const dir = targetDir ?? process.cwd();
  const marpBinPath = join(dir, 'node_modules', '.bin', 'marp');
  return existsSync(marpBinPath);
}

/**
 * Check if Marp CLI is available (either globally or locally)
 * @deprecated Use isMarpCliInstalledGlobally() or isMarpCliInstalledLocally() for specific checks
 */
export function isMarpCliInstalled(): boolean {
  return isMarpCliInstalledGlobally();
}

/**
 * Detect package manager from lock files
 */
export function detectPackageManager(targetDir?: string): 'pnpm' | 'yarn' | 'npm' {
  const dir = targetDir ?? process.cwd();
  if (existsSync(join(dir, 'pnpm-lock.yaml'))) return 'pnpm';
  if (existsSync(join(dir, 'yarn.lock'))) return 'yarn';
  return 'npm';
}

/**
 * Get the install command for Marp CLI based on package manager
 */
export function getMarpInstallCommand(pm: 'pnpm' | 'yarn' | 'npm'): string {
  switch (pm) {
    case 'pnpm':
      return 'pnpm add -D @marp-team/marp-cli';
    case 'yarn':
      return 'yarn add -D @marp-team/marp-cli';
    default:
      return 'npm install -D @marp-team/marp-cli';
  }
}

/**
 * Installation choice for Marp CLI
 */
export type MarpInstallChoice = 'global' | 'local' | 'skip';

/**
 * Prompt user for Marp CLI installation choice
 * Returns 'global', 'local', or 'skip'
 */
export async function promptMarpInstallChoice(): Promise<MarpInstallChoice> {
  // Check if running in non-interactive mode (CI, piped input, etc.)
  if (!process.stdin.isTTY) {
    return 'skip';
  }

  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  console.log('How would you like to install Marp CLI?');
  console.log(`  ${chalk.cyan('1)')} Global install ${chalk.dim('(recommended - works everywhere)')}`);
  console.log(`  ${chalk.cyan('2)')} Local install ${chalk.dim('(creates package.json)')}`);
  console.log(`  ${chalk.cyan('3)')} Skip ${chalk.dim("(I'll install it later)")}`);
  console.log('');

  return new Promise((resolve) => {
    rl.question('Choice [1]: ', (answer) => {
      rl.close();
      const normalized = answer.trim();
      if (normalized === '' || normalized === '1') {
        resolve('global');
      } else if (normalized === '2') {
        resolve('local');
      } else {
        resolve('skip');
      }
    });
  });
}

/**
 * Install Marp CLI globally
 * Returns true if installation succeeded
 */
export function installMarpCliGlobally(): boolean {
  const spinner = ora('Installing Marp CLI globally...').start();

  try {
    const result = spawnSync('npm', ['install', '-g', '@marp-team/marp-cli'], {
      stdio: 'pipe',
      shell: true,
      timeout: 120000, // 2 minutes timeout
    });

    if (result.status === 0) {
      spinner.succeed('Marp CLI installed globally');
      return true;
    } else {
      const stderr = result.stderr?.toString() || 'Unknown error';
      spinner.fail(`Failed to install Marp CLI: ${stderr}`);
      console.log(chalk.dim('You can install it manually with: npm install -g @marp-team/marp-cli'));
      return false;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    spinner.fail(`Failed to install Marp CLI: ${message}`);
    console.log(chalk.dim('You can install it manually with: npm install -g @marp-team/marp-cli'));
    return false;
  }
}

/**
 * Install Marp CLI locally (creates package.json if needed)
 * Returns true if installation succeeded
 */
export async function installMarpCliLocally(targetDir: string): Promise<boolean> {
  const pm = detectPackageManager(targetDir);
  const installCmd = getMarpInstallCommand(pm);

  // Create package.json if it doesn't exist
  const packageJsonPath = join(targetDir, 'package.json');
  if (!existsSync(packageJsonPath)) {
    const packageJsonContent = generatePackageJsonContent(targetDir);
    await writeFile(packageJsonPath, packageJsonContent, 'utf-8');
  }

  const spinner = ora(`Installing Marp CLI locally with ${pm}...`).start();

  try {
    const result = spawnSync(pm, ['add', '-D', '@marp-team/marp-cli'], {
      cwd: targetDir,
      stdio: 'pipe',
      shell: true,
      timeout: 120000, // 2 minutes timeout
    });

    if (result.status === 0) {
      spinner.succeed('Marp CLI installed locally');
      return true;
    } else {
      const stderr = result.stderr?.toString() || 'Unknown error';
      spinner.fail(`Failed to install Marp CLI: ${stderr}`);
      console.log(chalk.dim(`You can install it manually with: ${installCmd}`));
      return false;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    spinner.fail(`Failed to install Marp CLI: ${message}`);
    console.log(chalk.dim(`You can install it manually with: ${installCmd}`));
    return false;
  }
}

/**
 * Generate minimal package.json content for the project
 */
function generatePackageJsonContent(targetDir: string): string {
  const projectName = basename(targetDir) || 'my-presentation';
  return JSON.stringify(
    {
      name: projectName,
      version: '1.0.0',
      private: true,
      description: 'Presentation project created with slide-gen',
      scripts: {
        preview: 'slide-gen preview presentation.yaml',
        build: 'slide-gen convert presentation.yaml',
      },
    },
    null,
    2
  );
}

/**
 * Show Marp CLI installation information and optionally install
 * Returns true if Marp CLI is available after this function completes
 */
async function showMarpCliInfo(targetDir: string): Promise<boolean> {
  // Check if already installed (globally or locally)
  if (isMarpCliInstalledGlobally() || isMarpCliInstalledLocally(targetDir)) {
    console.log('');
    console.log(chalk.green('✓') + ' Marp CLI is available');
    return true;
  }

  console.log('');
  console.log(chalk.dim('─'.repeat(45)));
  console.log(chalk.yellow('Marp CLI is recommended for full features:'));
  console.log('  • Preview slides in browser');
  console.log('  • Take screenshots for AI review');
  console.log('  • Export to PDF/HTML/PPTX');
  console.log('');
  console.log(chalk.dim('Marp CLI is not currently installed.'));
  console.log(chalk.dim('─'.repeat(45)));
  console.log('');

  // Prompt for installation choice
  const choice = await promptMarpInstallChoice();

  switch (choice) {
    case 'global':
      return installMarpCliGlobally();
    case 'local':
      return await installMarpCliLocally(targetDir);
    case 'skip':
    default:
      console.log('');
      console.log(chalk.dim('You can install Marp CLI later with:'));
      console.log(`  ${chalk.cyan('npm install -g @marp-team/marp-cli')} ${chalk.dim('(global)')}`);
      console.log(`  ${chalk.cyan('npm install -D @marp-team/marp-cli')} ${chalk.dim('(local)')}`);
      return false;
  }
}

/**
 * Generate AI configuration files
 */
async function generateAiConfig(targetDir: string): Promise<void> {
  // Create directories
  await mkdir(join(targetDir, '.skills', 'slide-assistant', 'references'), { recursive: true });
  await mkdir(join(targetDir, '.skills', 'slide-assistant', 'scripts'), { recursive: true });
  await mkdir(join(targetDir, '.claude', 'skills', 'slide-assistant', 'references'), { recursive: true });
  await mkdir(join(targetDir, '.claude', 'commands'), { recursive: true });
  await mkdir(join(targetDir, '.opencode', 'agent'), { recursive: true });

  // Generate AgentSkills (common) - both .skills/ and .claude/skills/
  const skillDirs = [
    join(targetDir, '.skills', 'slide-assistant'),
    join(targetDir, '.claude', 'skills', 'slide-assistant'),
  ];

  for (const skillDir of skillDirs) {
    await writeFileIfNotExists(join(skillDir, 'SKILL.md'), generateSkillMd());
    await writeFileIfNotExists(
      join(skillDir, 'references', 'templates.md'),
      generateTemplatesRef()
    );
    await writeFileIfNotExists(
      join(skillDir, 'references', 'workflows.md'),
      generateWorkflowsRef()
    );
    await writeFileIfNotExists(
      join(skillDir, 'references', 'skill.md'),
      generateReferenceSkillMd()
    );
  }

  // Generate Claude Code files
  await writeFileIfNotExists(join(targetDir, 'CLAUDE.md'), generateClaudeMd());

  // Generate commands
  const commandGenerators: Record<string, () => string> = {
    'slide-create': generateSlideCreateCommand,
    'slide-validate': generateSlideValidateCommand,
    'slide-preview': generateSlidePreviewCommand,
    'slide-screenshot': generateSlideScreenshotCommand,
    'slide-theme': generateSlideThemeCommand,
    'slide-references': generateSlideReferencesCommand,
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

  - template: bullet-list
    content:
      title: Introduction
      items:
        - Welcome to this presentation!
        - Point one
        - Point two
        - Point three

  - template: section
    content:
      title: Section Title
      subtitle: Section description

  - template: bullet-list
    content:
      title: Main Content
      items:
        - Here's the main content of your presentation.
        - You can use **markdown** formatting in the body text.

  - template: section
    content:
      title: Thank You
      subtitle: Questions?
`;

  return baseContent;
}
