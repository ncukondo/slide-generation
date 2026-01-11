/**
 * Source Material Management Module
 *
 * This module provides functionality for managing source materials
 * for slide presentations, including:
 * - Schema definitions for sources.yaml
 * - SourcesManager for CRUD operations on sources
 * - SourceExplorer for directory scanning and classification
 * - SourceImporter for importing external files
 * - ConversationLogger for AI interaction logs
 */

export * from './schema.js';
export * from './manager.js';
export * from './explorer.js';
export * from './importer.js';
export * from './conversation.js';
