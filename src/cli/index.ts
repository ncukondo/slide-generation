#!/usr/bin/env node

import { Command } from "commander";
import { VERSION } from "../index.js";

const program = new Command();

program
  .name("slide-gen")
  .description("Generate Marp-compatible Markdown from YAML source files")
  .version(VERSION);

program
  .command("convert <input>")
  .description("Convert YAML source to Marp Markdown")
  .option("-o, --output <path>", "Output file path")
  .option("-w, --watch", "Watch for changes")
  .action((input, options) => {
    console.log(`Converting ${input}...`);
    console.log("Options:", options);
    // Implementation will be added
  });

program
  .command("preview <input>")
  .description("Preview the generated slides")
  .action((input) => {
    console.log(`Previewing ${input}...`);
    // Implementation will be added
  });

program
  .command("templates")
  .description("List available templates")
  .action(() => {
    console.log("Available templates:");
    // Implementation will be added
  });

program.parse();
