/**
 * Image management module
 * Provides metadata loading and validation for presentation images
 */

// Schema exports
export {
  permissionStatusSchema,
  permissionsSchema,
  creditsSchema,
  individualMetadataSchema,
  directoryDefaultsSchema,
  directoryMetadataEntrySchema,
  directoryMetadataSchema,
  type PermissionStatus,
  type Permissions,
  type Credits,
  type ImageMetadata,
  type DirectoryDefaults,
  type DirectoryMetadata,
  type ResolvedImageMetadata,
} from "./schema";

// Loader exports
export { ImageMetadataLoader } from "./metadata-loader";
