import { z } from 'zod';

/**
 * Source type schema
 * Defines the types of source materials that can be tracked
 */
export const sourceTypeSchema = z.enum([
  'scenario', // Scenario/structure files
  'content', // Content scripts
  'material', // Reference materials
  'data', // Data/numbers
  'conversation', // AI conversation logs
]);

export type SourceType = z.infer<typeof sourceTypeSchema>;

/**
 * Source status schema
 * Defines the status of a source material
 */
export const sourceStatusSchema = z.enum([
  'draft', // Work in progress
  'final', // Finalized
  'reference', // Reference material (not directly used)
  'archived', // Archived/historical
]);

export type SourceStatus = z.infer<typeof sourceStatusSchema>;

/**
 * Audience schema
 * Describes the target audience for the presentation
 */
export const audienceSchema = z.object({
  type: z.string(),
  size: z.string().optional(),
  knowledge_level: z.string().optional(),
  concerns: z.array(z.string()).optional(),
});

export type Audience = z.infer<typeof audienceSchema>;

/**
 * Constraints schema
 * Defines constraints for the presentation
 */
export const constraintsSchema = z.object({
  duration: z.string().optional(),
  format: z.string().optional(),
  style: z.string().optional(),
});

export type Constraints = z.infer<typeof constraintsSchema>;

/**
 * Context schema
 * Contains presentation context information
 */
export const contextSchema = z.object({
  objective: z.string().optional(),
  audience: audienceSchema.optional(),
  key_messages: z.array(z.string()).optional(),
  constraints: constraintsSchema.optional(),
});

export type Context = z.infer<typeof contextSchema>;

/**
 * Source entry schema
 * Represents a single source material entry
 */
export const sourceEntrySchema = z.object({
  id: z.string(),
  type: sourceTypeSchema,
  path: z.string(),
  status: sourceStatusSchema.optional(),
  origin: z.string().optional(),
  description: z.string().optional(),
  notes: z.string().optional(),
  extracted_data: z.array(z.string()).optional(),
  decisions: z.array(z.string()).optional(),
});

export type SourceEntry = z.infer<typeof sourceEntrySchema>;

/**
 * Project schema
 * Contains project metadata
 */
export const projectSchema = z.object({
  name: z.string(),
  purpose: z.string().optional(),
  created: z.string().optional(),
  updated: z.string().optional(),
  setup_pattern: z.enum(['A', 'B', 'C']).optional(),
  original_source: z.string().optional(),
});

export type Project = z.infer<typeof projectSchema>;

/**
 * Dependency schema
 * Tracks which sources a file is derived from
 */
export const dependencySchema = z.object({
  derived_from: z.array(z.string()),
});

export type Dependency = z.infer<typeof dependencySchema>;

/**
 * Missing item schema
 * Tracks missing information needed for the presentation
 */
export const missingItemSchema = z.object({
  item: z.string(),
  needed_for: z.string().optional(),
  status: z.string().optional(),
  notes: z.string().optional(),
});

export type MissingItem = z.infer<typeof missingItemSchema>;

/**
 * Reference item schema
 * Tracks individual reference/citation items in the presentation
 */
export const referenceItemSchema = z.object({
  id: z.string(),
  status: z.enum(['pending', 'added', 'existing']),
  slide: z.number(),
  purpose: z.string(),
  requirement: z.enum(['required', 'recommended']).optional(),
  added_date: z.string().optional(),
  suggested_search: z.array(z.string()).optional(),
  notes: z.string().optional(),
});

export type ReferenceItem = z.infer<typeof referenceItemSchema>;

/**
 * References status schema
 * Summary of reference tracking status
 */
export const referencesStatusSchema = z.object({
  required: z.number().default(0),
  found: z.number().default(0),
  pending: z.number().default(0),
});

export type ReferencesStatus = z.infer<typeof referencesStatusSchema>;

/**
 * References section schema
 * Contains all reference tracking information
 */
export const referencesSectionSchema = z.object({
  status: referencesStatusSchema.optional(),
  items: z.array(referenceItemSchema).default([]),
});

export type ReferencesSection = z.infer<typeof referencesSectionSchema>;

/**
 * Sources YAML schema
 * The main schema for sources.yaml file
 */
export const sourcesYamlSchema = z.object({
  project: projectSchema,
  context: contextSchema.optional(),
  sources: z.array(sourceEntrySchema).optional(),
  dependencies: z.record(dependencySchema).optional(),
  missing: z.array(missingItemSchema).optional(),
  references: referencesSectionSchema.optional(),
});

export type SourcesYaml = z.infer<typeof sourcesYamlSchema>;
