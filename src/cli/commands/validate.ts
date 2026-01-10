import { Command } from 'commander';
import { access, readFile } from 'fs/promises';
import { dirname } from 'path';
import chalk from 'chalk';
import ora from 'ora';
import { parse as parseYaml } from 'yaml';
import { Parser, ParseError, ValidationError } from '../../core/parser';
import { TemplateLoader } from '../../templates/loader';
import { IconRegistryLoader } from '../../icons/registry';
import { ConfigLoader } from '../../config/loader';
import { ExitCode } from './convert';

/**
 * Validation result structure
 */
interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  stats: {
    yamlSyntax: boolean;
    metaValid: boolean;
    slideCount: number;
    templatesFound: boolean;
    iconsResolved: boolean;
    referencesCount: number;
  };
}

interface ValidateOptions {
  config?: string;
  strict?: boolean;
  format?: 'text' | 'json';
}

/**
 * Create the validate command
 */
export function createValidateCommand(): Command {
  return new Command('validate')
    .description('Validate source file without conversion')
    .argument('<input>', 'Input YAML file')
    .option('-c, --config <path>', 'Config file path')
    .option('--strict', 'Treat warnings as errors')
    .option('--format <fmt>', 'Output format (text/json)', 'text')
    .action(async (input: string, options: ValidateOptions) => {
      await executeValidate(input, options);
    });
}

/**
 * Execute the validate command
 */
async function executeValidate(
  inputPath: string,
  options: ValidateOptions
): Promise<void> {
  const isJsonFormat = options.format === 'json';
  const spinner = isJsonFormat ? null : ora();

  const result: ValidationResult = {
    valid: true,
    errors: [],
    warnings: [],
    stats: {
      yamlSyntax: false,
      metaValid: false,
      slideCount: 0,
      templatesFound: false,
      iconsResolved: false,
      referencesCount: 0,
    },
  };

  try {
    // Check file exists
    spinner?.start(`Validating ${inputPath}...`);
    try {
      await access(inputPath);
    } catch {
      spinner?.fail(`File not found: ${inputPath}`);
      result.errors.push(`File not found: ${inputPath}`);
      result.valid = false;
      outputResult(result, options);
      process.exitCode = ExitCode.FileReadError;
      return;
    }

    // Read file content
    const content = await readFile(inputPath, 'utf-8');

    // Step 1: YAML syntax check
    try {
      parseYaml(content);
      result.stats.yamlSyntax = true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      result.errors.push(`YAML syntax error: ${message}`);
      result.valid = false;
      spinner?.fail('YAML syntax invalid');
      outputResult(result, options);
      process.exitCode = ExitCode.ValidationError;
      return;
    }

    // Step 2: Schema validation
    const parser = new Parser();
    let presentation;
    try {
      presentation = parser.parse(content);
      result.stats.metaValid = true;
      result.stats.slideCount = presentation.slides.length;
    } catch (error) {
      if (error instanceof ParseError) {
        result.errors.push(`Parse error: ${error.message}`);
      } else if (error instanceof ValidationError) {
        result.errors.push(`Schema validation error: ${error.message}`);
      } else {
        const message = error instanceof Error ? error.message : 'Unknown error';
        result.errors.push(`Schema error: ${message}`);
      }
      result.valid = false;
      spinner?.fail('Schema validation failed');
      outputResult(result, options);
      process.exitCode = ExitCode.ValidationError;
      return;
    }

    // Load configuration
    const configLoader = new ConfigLoader();
    let configPath = options.config;

    if (!configPath) {
      configPath = await configLoader.findConfig(dirname(inputPath));
    }

    const config = await configLoader.load(configPath);

    // Step 3: Template validation
    const templateLoader = new TemplateLoader();
    try {
      await templateLoader.loadBuiltIn(config.templates.builtin);
      if (config.templates.custom) {
        try {
          await templateLoader.loadCustom(config.templates.custom);
        } catch {
          // Custom templates directory may not exist
        }
      }
    } catch (error) {
      result.warnings.push(
        `Could not load templates: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }

    // Check all templates exist
    const missingTemplates: string[] = [];
    for (let i = 0; i < presentation.slides.length; i++) {
      const slide = presentation.slides[i]!;
      const template = templateLoader.get(slide.template);
      if (!template) {
        missingTemplates.push(`Slide ${i + 1}: Template "${slide.template}" not found`);
      } else {
        // Validate slide content against template schema
        const validationResult = templateLoader.validateContent(
          slide.template,
          slide.content
        );
        if (!validationResult.valid) {
          for (const err of validationResult.errors) {
            result.errors.push(`Slide ${i + 1} (${slide.template}): ${err}`);
          }
        }
      }
    }

    if (missingTemplates.length > 0) {
      for (const msg of missingTemplates) {
        result.errors.push(msg);
      }
      result.valid = false;
    } else {
      result.stats.templatesFound = true;
    }

    // Step 4: Icon validation (check for icon references in content)
    const iconRegistry = new IconRegistryLoader();
    try {
      await iconRegistry.load(config.icons.registry);
      result.stats.iconsResolved = true;
    } catch (error) {
      result.warnings.push(
        `Could not load icon registry: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }

    // Check icon references in slide content (simple pattern matching)
    const iconPattern = /icon\(['"]([^'"]+)['"]\)/g;
    for (let i = 0; i < presentation.slides.length; i++) {
      const slide = presentation.slides[i]!;
      const contentStr = JSON.stringify(slide.content);
      let match;
      while ((match = iconPattern.exec(contentStr)) !== null) {
        const iconRef = match[1]!;
        // Try to resolve the icon
        const resolved = iconRegistry.resolveAlias(iconRef);
        const parsed = iconRegistry.parseIconReference(resolved);
        if (parsed) {
          const source = iconRegistry.getSource(parsed.prefix);
          if (!source) {
            result.warnings.push(
              `Slide ${i + 1}: Unknown icon source "${parsed.prefix}" in "${iconRef}"`
            );
          }
        } else if (!iconRegistry.resolveAlias(iconRef)) {
          result.warnings.push(`Slide ${i + 1}: Unknown icon "${iconRef}"`);
        }
      }
    }

    // Step 5: Reference validation
    const citationPattern = /@([a-zA-Z0-9_-]+)/g;
    const references: Set<string> = new Set();
    for (const slide of presentation.slides) {
      const contentStr = JSON.stringify(slide.content);
      let match;
      while ((match = citationPattern.exec(contentStr)) !== null) {
        references.add(match[1]!);
      }
    }
    result.stats.referencesCount = references.size;

    // Final validation result
    if (result.errors.length > 0) {
      result.valid = false;
    }

    // Strict mode: warnings become errors
    if (options.strict && result.warnings.length > 0) {
      result.valid = false;
      result.errors.push(...result.warnings);
      result.warnings = [];
    }

    // Output result
    if (result.valid) {
      spinner?.succeed(`Validated ${inputPath}`);
    } else {
      spinner?.fail(`Validation failed for ${inputPath}`);
    }

    outputResult(result, options);

    if (!result.valid) {
      process.exitCode = ExitCode.ValidationError;
    }
  } catch (error) {
    spinner?.fail('Validation failed');
    result.errors.push(
      `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
    result.valid = false;
    outputResult(result, options);
    process.exitCode = ExitCode.GeneralError;
  }
}

/**
 * Output validation result in the specified format
 */
function outputResult(result: ValidationResult, options: ValidateOptions): void {
  if (options.format === 'json') {
    console.log(
      JSON.stringify(
        {
          valid: result.valid,
          errors: result.errors,
          warnings: result.warnings,
          stats: result.stats,
        },
        null,
        2
      )
    );
    return;
  }

  // Text format output
  console.log('');

  // Stats
  if (result.stats.yamlSyntax) {
    console.log(chalk.green('✓') + ' YAML syntax valid');
  } else {
    console.log(chalk.red('✗') + ' YAML syntax invalid');
  }

  if (result.stats.metaValid) {
    console.log(chalk.green('✓') + ' Meta section valid');
  }

  if (result.stats.slideCount > 0) {
    console.log(chalk.green('✓') + ` ${result.stats.slideCount} slides validated`);
  }

  if (result.stats.templatesFound) {
    console.log(chalk.green('✓') + ' All templates found');
  }

  if (result.stats.iconsResolved) {
    console.log(chalk.green('✓') + ' All icons resolved');
  }

  if (result.stats.referencesCount > 0) {
    console.log(chalk.green('✓') + ` ${result.stats.referencesCount} references found`);
  }

  // Errors
  for (const error of result.errors) {
    console.log(chalk.red('✗') + ` ${error}`);
  }

  // Warnings
  for (const warning of result.warnings) {
    console.log(chalk.yellow('⚠') + ` ${warning}`);
  }

  // Summary
  console.log('');
  if (result.valid) {
    console.log(chalk.green('Validation passed!'));
  } else {
    const errorCount = result.errors.length;
    const warningCount = result.warnings.length;
    let summary = `Validation failed with ${errorCount} error${errorCount !== 1 ? 's' : ''}`;
    if (warningCount > 0) {
      summary += ` and ${warningCount} warning${warningCount !== 1 ? 's' : ''}`;
    }
    console.log(chalk.red(summary));
  }
}
