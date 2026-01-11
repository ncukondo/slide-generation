#!/usr/bin/env node

import { Command } from 'commander';
import { VERSION } from '../index.js';
import { createConvertCommand } from './commands/convert.js';
import { createValidateCommand } from './commands/validate.js';
import { createTemplatesCommand } from './commands/templates.js';
import { createIconsCommand } from './commands/icons.js';
import { createInitCommand } from './commands/init.js';
import { createWatchCommand } from './commands/watch.js';
import { createPreviewCommand } from './commands/preview.js';
import { createImagesCommand } from './commands/images.js';

const program = new Command();

program
  .name('slide-gen')
  .description('Generate Marp-compatible Markdown from YAML source files')
  .version(VERSION);

// Add convert command
program.addCommand(createConvertCommand());

// Add validate command
program.addCommand(createValidateCommand());

// Add templates command
program.addCommand(createTemplatesCommand());

// Add icons command
program.addCommand(createIconsCommand());

// Add init command
program.addCommand(createInitCommand());

// Add watch command
program.addCommand(createWatchCommand());

// Add preview command
program.addCommand(createPreviewCommand());

// Add images command
program.addCommand(createImagesCommand());

program.parse();
