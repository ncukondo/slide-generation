/**
 * slide-generation - A CLI tool to generate Marp-compatible Markdown from YAML source files
 */

declare const __VERSION__: string;
export const VERSION = __VERSION__;

// Core modules
export * from './core';
// export * from './core/transformer';
// export * from './core/renderer';
// export * from './core/pipeline';

// Template system
export * from './templates';
