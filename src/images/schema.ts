import { z } from "zod";
import { imageProcessingArraySchema } from "./processing-schema";

/**
 * Permission status for images
 */
export const permissionStatusSchema = z.enum([
  "approved",
  "pending",
  "restricted",
  "rejected",
]);

export type PermissionStatus = z.infer<typeof permissionStatusSchema>;

/**
 * Permission information for images
 */
export const permissionsSchema = z.object({
  status: permissionStatusSchema,
  approved_by: z.string().optional(),
  approved_date: z.string().optional(),
  expires: z.string().nullable().optional(),
  conditions: z.array(z.string()).optional(),
  document: z.string().optional(),
  pending_contact: z.string().optional(),
});

export type Permissions = z.infer<typeof permissionsSchema>;

/**
 * Credit/attribution information
 */
export const creditsSchema = z.object({
  required: z.boolean().optional(),
  text: z.string().optional(),
});

export type Credits = z.infer<typeof creditsSchema>;

/**
 * Individual image metadata schema
 * Used for .meta.yaml files attached to individual images
 */
export const individualMetadataSchema = z.object({
  // Basic information
  description: z.string().optional(),
  captured_date: z.string().optional(),
  captured_by: z.string().optional(),
  location: z.string().optional(),

  // Subject information - can be string or array of strings
  subject: z.union([z.string(), z.array(z.string())]).optional(),

  // Permission information
  permissions: permissionsSchema.optional(),

  // Usage restrictions
  restrictions: z.array(z.string()).optional(),

  // Notes (supplementary information for AI)
  notes: z.string().optional(),

  // Credits
  credits: creditsSchema.optional(),

  // Tags for search/filtering
  tags: z.array(z.string()).optional(),

  // Image processing instructions (crop, blur, etc.)
  processing: imageProcessingArraySchema.optional(),
});

export type ImageMetadata = z.infer<typeof individualMetadataSchema>;

/**
 * Directory-level defaults schema
 */
export const directoryDefaultsSchema = z.object({
  permissions: permissionsSchema.optional(),
  credits: creditsSchema.optional(),
  tags: z.array(z.string()).optional(),
});

export type DirectoryDefaults = z.infer<typeof directoryDefaultsSchema>;

/**
 * Directory metadata entry schema
 * Can be either defaults or individual file metadata
 */
export const directoryMetadataEntrySchema = individualMetadataSchema;

/**
 * Directory metadata schema (images.yaml)
 * Contains _defaults for directory-level settings and individual file entries
 * Uses a more permissive record type to allow any entry
 */
export const directoryMetadataSchema = z.record(
  z.string(),
  individualMetadataSchema.passthrough()
);

export type DirectoryMetadata = z.infer<typeof directoryMetadataSchema>;

/**
 * Merged metadata result (after applying defaults)
 */
export interface ResolvedImageMetadata extends ImageMetadata {
  // Path to the image file (relative to project root)
  path?: string;
  // Source of metadata (individual | directory | defaults)
  metadataSource?: "individual" | "directory" | "defaults" | "none";
}
