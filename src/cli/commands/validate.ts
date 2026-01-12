import { Command } from 'commander';
import { access, readFile } from 'fs/promises';
import { dirname } from 'path';
import chalk from 'chalk';
import ora from 'ora';
import { parse as parseYaml, stringify as yamlStringify } from 'yaml';
import { Parser, ParseError, ValidationError, type ParseResultWithLines } from '../../core/parser';
import { TemplateLoader } from '../../templates/loader';
import { IconRegistryLoader } from '../../icons/registry';
import { ConfigLoader } from '../../config/loader';
import { ExitCode } from './convert';
import { ReferenceManager, ReferenceValidator, CitationExtractor } from '../../references';

/**
 * Validation result structure
 */
interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  structuredErrors: StructuredValidationError[];
  slideLines: number[];
  stats: {
    yamlSyntax: boolean;
    metaValid: boolean;
    slideCount: number;
    templatesFound: boolean;
    iconsResolved: boolean;
    referencesCount: number;
    referencesValidated: boolean;
    missingReferences: string[];
  };
}

interface ValidateOptions {
  config?: string;
  strict?: boolean;
  format?: 'text' | 'json' | 'llm';
}

/**
 * Structured validation error for LLM-friendly output
 */
export interface StructuredValidationError {
  slide: number;
  line?: number;
  template: string;
  field?: string;
  message: string;
  errorType: 'missing_field' | 'invalid_type' | 'unknown_template' | 'unknown_icon' | 'schema_error' | 'missing_reference';
  fixExample?: string;
}

/**
 * Get contextual hint based on error type
 */
export function getHintForErrorType(errorType: string): string | null {
  switch (errorType) {
    case 'unknown_template':
      return 'Run `slide-gen templates list --format llm` to see available templates.';
    case 'unknown_icon':
      return 'Run `slide-gen icons search <query>` to find icons.';
    case 'missing_reference':
      return 'Run `ref add --pmid <pmid>` or `ref add "<doi>"` to add the reference.';
    default:
      return null;
  }
}

/**
 * Format validation result for LLM consumption
 */
export function formatLlmValidationResult(
  errors: StructuredValidationError[],
  slideCount: number
): string {
  if (errors.length === 0) {
    return `Validation passed. ${slideCount} slides validated.`;
  }

  const lines: string[] = ['Validation failed.', ''];

  for (let i = 0; i < errors.length; i++) {
    const error = errors[i]!;

    // Error header with line number (if available) and template
    const lineInfo = error.line ? `line ${error.line}, ` : '';
    lines.push(`Error at ${lineInfo}Slide ${error.slide} (${error.template}):`);
    lines.push(`  ${error.message}`);

    // Fix example (if available)
    if (error.fixExample) {
      lines.push('');
      lines.push('Fix:');
      const exampleLines = error.fixExample.split('\n');
      for (const line of exampleLines) {
        lines.push(`  ${line}`);
      }
    }

    // Hint based on error type
    const hint = getHintForErrorType(error.errorType);
    if (hint) {
      lines.push('');
      lines.push(`Hint: ${hint}`);
    }

    // Separator between errors
    if (i < errors.length - 1) {
      lines.push('');
      lines.push('---');
      lines.push('');
    }
  }

  return lines.join('\n');
}

/**
 * Format an example object as YAML string with indentation
 */
function formatExampleAsYaml(example: Record<string, unknown>, indent: number): string {
  const yaml = yamlStringify(example, { indent: 2 });
  const spaces = ' '.repeat(indent);
  return yaml
    .split('\n')
    .filter(line => line.trim() !== '')
    .map(line => spaces + line)
    .join('\n');
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
    .option('--format <fmt>', 'Output format (text/json/llm)', 'text')
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
  const isLlmFormat = options.format === 'llm';
  const spinner = (isJsonFormat || isLlmFormat) ? null : ora();

  const result: ValidationResult = {
    valid: true,
    errors: [],
    warnings: [],
    structuredErrors: [],
    slideLines: [],
    stats: {
      yamlSyntax: false,
      metaValid: false,
      slideCount: 0,
      templatesFound: false,
      iconsResolved: false,
      referencesCount: 0,
      referencesValidated: false,
      missingReferences: [],
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

    // Step 2: Schema validation with line info
    const parser = new Parser();
    let presentation: ParseResultWithLines;
    try {
      presentation = parser.parseWithLineInfo(content);
      result.stats.metaValid = true;
      result.stats.slideCount = presentation.slides.length;
      result.slideLines = presentation.slideLines;
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
      const slideNumber = i + 1;
      const slideLine = result.slideLines[i];
      const template = templateLoader.get(slide.template);

      if (!template) {
        missingTemplates.push(`Slide ${slideNumber}: Template "${slide.template}" not found`);
        const structuredError: StructuredValidationError = {
          slide: slideNumber,
          template: slide.template,
          message: `Template "${slide.template}" not found`,
          errorType: 'unknown_template',
        };
        if (slideLine !== undefined) {
          structuredError.line = slideLine;
        }
        result.structuredErrors.push(structuredError);
      } else {
        // Validate slide content against template schema
        const validationResult = templateLoader.validateContent(
          slide.template,
          slide.content
        );
        if (!validationResult.valid) {
          for (const err of validationResult.errors) {
            result.errors.push(`Slide ${slideNumber} (${slide.template}): ${err}`);

            // Determine error type and extract field from error message
            const isMissingField = err.toLowerCase().includes('required') || err.toLowerCase().includes('missing');
            const isInvalidType = err.toLowerCase().includes('type') || err.toLowerCase().includes('invalid');

            // Try to extract field name from error message
            const fieldMatch = err.match(/(?:field|property)\s+['"]?(\w+)['"]?/i) ||
                               err.match(/^(\w+)\s+is\s+required/i);
            const field = fieldMatch?.[1];

            // Get fix example from template
            const fixExample = template.example ?
              `content:\n${formatExampleAsYaml(template.example, 2)}` : undefined;

            const structuredError: StructuredValidationError = {
              slide: slideNumber,
              template: slide.template,
              message: err,
              errorType: isMissingField ? 'missing_field' : isInvalidType ? 'invalid_type' : 'schema_error',
            };
            if (slideLine !== undefined) {
              structuredError.line = slideLine;
            }
            if (field !== undefined) {
              structuredError.field = field;
            }
            if (fixExample !== undefined) {
              structuredError.fixExample = fixExample;
            }
            result.structuredErrors.push(structuredError);
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
      const slideNumber = i + 1;
      const slideLine = result.slideLines[i];
      const contentStr = JSON.stringify(slide.content);
      for (const match of contentStr.matchAll(iconPattern)) {
        const iconRef = match[1]!;
        // Try to resolve the icon
        const resolved = iconRegistry.resolveAlias(iconRef);
        const parsed = iconRegistry.parseIconReference(resolved);
        if (parsed) {
          const source = iconRegistry.getSource(parsed.prefix);
          if (!source) {
            result.warnings.push(
              `Slide ${slideNumber}: Unknown icon source "${parsed.prefix}" in "${iconRef}"`
            );
            const structuredError: StructuredValidationError = {
              slide: slideNumber,
              template: slide.template,
              message: `Unknown icon source "${parsed.prefix}" in "${iconRef}"`,
              errorType: 'unknown_icon',
            };
            if (slideLine !== undefined) {
              structuredError.line = slideLine;
            }
            result.structuredErrors.push(structuredError);
          }
        } else if (!iconRegistry.resolveAlias(iconRef)) {
          result.warnings.push(`Slide ${slideNumber}: Unknown icon "${iconRef}"`);
          const structuredError: StructuredValidationError = {
            slide: slideNumber,
            template: slide.template,
            message: `Unknown icon "${iconRef}"`,
            errorType: 'unknown_icon',
          };
          if (slideLine !== undefined) {
            structuredError.line = slideLine;
          }
          result.structuredErrors.push(structuredError);
        }
      }
    }

    // Step 5: Reference extraction
    const citationExtractor = new CitationExtractor();
    const extractedCitations = citationExtractor.extractFromPresentation(presentation);
    const citationIds = citationExtractor.getUniqueIds(extractedCitations);
    result.stats.referencesCount = citationIds.length;

    // Step 6: Reference validation against reference-manager
    if (config.references?.enabled && citationIds.length > 0) {
      const refManager = new ReferenceManager();
      const refValidator = new ReferenceValidator(refManager);
      const refValidationResult = await refValidator.validateWithLocations(
        presentation.slides
      );

      if (refValidationResult.skipped) {
        result.warnings.push(
          `Reference validation skipped: ${refValidationResult.reason}`
        );
      } else {
        result.stats.referencesValidated = true;
        result.stats.missingReferences = refValidationResult.missing;

        if (!refValidationResult.valid) {
          for (const missingDetail of refValidationResult.missingDetails) {
            // Report each location where the missing citation is used
            for (const location of missingDetail.locations) {
              const slideLine = result.slideLines[location.slide - 1];
              result.warnings.push(
                `Citation not found in library: @${missingDetail.id} (Slide ${location.slide})`
              );
              const structuredError: StructuredValidationError = {
                slide: location.slide,
                template:
                  presentation.slides[location.slide - 1]?.template || 'unknown',
                message: `Citation not found in library: @${missingDetail.id}`,
                errorType: 'missing_reference',
              };
              if (slideLine !== undefined) {
                structuredError.line = slideLine;
              }
              result.structuredErrors.push(structuredError);
            }
          }
        }
      }
    }

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
          stats: {
            yamlSyntax: result.stats.yamlSyntax,
            metaValid: result.stats.metaValid,
            slideCount: result.stats.slideCount,
            templatesFound: result.stats.templatesFound,
            iconsResolved: result.stats.iconsResolved,
            referencesCount: result.stats.referencesCount,
            referencesValidated: result.stats.referencesValidated,
            missingReferences: result.stats.missingReferences,
          },
        },
        null,
        2
      )
    );
    return;
  }

  if (options.format === 'llm') {
    // LLM-friendly output format
    const llmOutput = formatLlmValidationResult(
      result.structuredErrors,
      result.stats.slideCount
    );
    console.log(llmOutput);
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

  if (result.stats.referencesValidated) {
    if (result.stats.missingReferences.length === 0) {
      console.log(chalk.green('✓') + ' All references validated');
    } else {
      console.log(
        chalk.yellow('⚠') +
          ` ${result.stats.missingReferences.length} reference(s) not found in library`
      );
    }
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
