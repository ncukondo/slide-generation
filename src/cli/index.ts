#!/usr/bin/env node

import { Command } from 'commander';
import { VERSION } from '../index.js';
import { createConvertCommand } from './commands/convert.js';
import { createValidateCommand } from './commands/validate.js';

const program = new Command();

program
  .name('slide-gen')
  .description('Generate Marp-compatible Markdown from YAML source files')
  .version(VERSION);

// Add convert command
program.addCommand(createConvertCommand());

// Add validate command
program.addCommand(createValidateCommand());

// Placeholder commands - will be implemented in later tasks
program
  .command('preview <input>')
  .description('Preview the generated slides')
  .action((input) => {
    console.log(`Previewing ${input}...`);
    console.log('Note: preview command not yet implemented');
  });

program
  .command('templates')
  .description('List available templates')
  .action(() => {
    console.log('Available templates:');
    console.log('Note: templates command not yet implemented');
  });

program
  .command('icons')
  .description('Manage icons')
  .action(() => {
    console.log('Icons management:');
    console.log('Note: icons command not yet implemented');
  });

program
  .command('init [directory]')
  .description('Initialize a new project')
  .action((directory) => {
    console.log(`Initializing in ${directory ?? '.'}...`);
    console.log('Note: init command not yet implemented');
  });

program.parse();
