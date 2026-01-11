/**
 * Image management module
 * Provides metadata loading and validation for presentation images
 */

// Constants exports
export {
  IMAGE_EXTENSIONS,
  isImageFile,
  DEFAULT_MIN_RESOLUTION,
} from "./constants";

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
export {
  ImageMetadataLoader,
  getAndClearMetadataWarnings,
  type MetadataWarning,
} from "./metadata-loader";

// Validator exports
export {
  ImageValidator,
  type ImageValidationResult,
  type ValidatePresentationOptions,
  type ImageStats,
  type ImageDimensions,
} from "./validator";
