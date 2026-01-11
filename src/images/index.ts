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

// Processor exports
export {
  ImageProcessor,
  type CropOptions,
  type EdgeCropOptions,
  type BlurRegionOptions,
  type ProcessResult,
  type ImageMetadataInfo,
} from "./processor";

// Processing schema exports
export {
  cropInstructionSchema,
  blurInstructionSchema,
  imageProcessingSchema,
  imageProcessingArraySchema,
  edgeCropOptionsSchema,
  regionSchema,
  type CropInstruction,
  type BlurInstruction,
  type ImageProcessingInstruction,
  type ImageProcessingInstructions,
  type Region,
} from "./processing-schema";

// Processing pipeline exports
export {
  ImageProcessingPipeline,
  type ProcessImageResult,
  type ProcessDirectoryResult,
  type ProcessingPipelineOptions,
} from "./processing-pipeline";
