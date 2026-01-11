import * as fs from "node:fs/promises";
import * as path from "node:path";
import imageSize from "image-size";
import { ImageMetadataLoader } from "./metadata-loader";
import { IMAGE_EXTENSIONS, DEFAULT_MIN_RESOLUTION } from "./constants";

/**
 * Validation result for a single check
 */
export interface ImageValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Image dimensions info
 */
export interface ImageDimensions {
  width: number;
  height: number;
  type?: string;
}

/**
 * Options for presentation validation
 */
export interface ValidatePresentationOptions {
  checkImages?: boolean;
  checkResolution?: boolean;
  minResolution?: {
    width: number;
    height: number;
  };
}

/**
 * Image statistics by permission status
 */
export interface ImageStats {
  total: number;
  approved: number;
  pending: number;
  restricted: number;
  rejected: number;
  unknown: number;
}

/**
 * Slide content type (simplified for validation)
 */
interface SlideContent {
  template: string;
  content: Record<string, unknown>;
}

/**
 * Validator for images referenced in presentations
 */
export class ImageValidator {
  private metadataLoader: ImageMetadataLoader;

  constructor(private baseDir: string = ".") {
    this.metadataLoader = new ImageMetadataLoader(baseDir);
  }

  /**
   * Validate that an image file exists and is a supported format
   */
  async validateImageExists(imagePath: string): Promise<ImageValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    const fullPath = path.join(this.baseDir, imagePath);
    const ext = path.extname(imagePath).toLowerCase();

    // Check file extension
    if (!IMAGE_EXTENSIONS.has(ext)) {
      errors.push(`Unsupported image format: ${imagePath}`);
      return { valid: false, errors, warnings };
    }

    // Check file exists
    try {
      await fs.access(fullPath);
    } catch {
      errors.push(`Image not found: ${imagePath}`);
      return { valid: false, errors, warnings };
    }

    return { valid: true, errors, warnings };
  }

  /**
   * Get image dimensions
   */
  async getImageDimensions(imagePath: string): Promise<ImageDimensions | null> {
    const fullPath = path.join(this.baseDir, imagePath);

    try {
      const buffer = await fs.readFile(fullPath);
      const dimensions = imageSize(buffer);

      if (dimensions.width && dimensions.height) {
        return {
          width: dimensions.width,
          height: dimensions.height,
          ...(dimensions.type ? { type: dimensions.type } : {}),
        };
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Validate image resolution
   */
  async validateImageResolution(
    imagePath: string,
    minResolution: { width: number; height: number } = DEFAULT_MIN_RESOLUTION
  ): Promise<ImageValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    const dimensions = await this.getImageDimensions(imagePath);

    if (!dimensions) {
      // Can't read dimensions - not an error, might be SVG or unsupported
      return { valid: true, errors, warnings };
    }

    const { width, height, type } = dimensions;
    const typeStr = type ? type.toUpperCase() : "unknown";

    if (width < minResolution.width || height < minResolution.height) {
      warnings.push(
        `Low resolution: ${imagePath} (${width}x${height}, ${typeStr}) - minimum recommended: ${minResolution.width}x${minResolution.height}`
      );
    }

    return { valid: true, errors, warnings };
  }

  /**
   * Extract all image references from slide content
   */
  extractImageReferences(slides: SlideContent[]): string[] {
    const images = new Set<string>();

    for (const slide of slides) {
      const content = slide.content;

      // Direct image field (image-text, image-full, image-caption)
      if (typeof content["image"] === "string") {
        images.add(content["image"]);
      }

      // Images array (gallery)
      const contentImages = content["images"];
      if (Array.isArray(contentImages)) {
        for (const img of contentImages) {
          if (typeof img === "object" && img !== null && "src" in img) {
            images.add(img.src as string);
          }
        }
      }

      // Before/after images
      const beforeObj = content["before"];
      if (typeof beforeObj === "object" && beforeObj !== null) {
        const before = beforeObj as Record<string, unknown>;
        if (typeof before["image"] === "string") {
          images.add(before["image"]);
        }
      }
      const afterObj = content["after"];
      if (typeof afterObj === "object" && afterObj !== null) {
        const after = afterObj as Record<string, unknown>;
        if (typeof after["image"] === "string") {
          images.add(after["image"]);
        }
      }
    }

    return Array.from(images);
  }

  /**
   * Validate all images in a presentation
   */
  async validatePresentation(
    slides: SlideContent[],
    options: ValidatePresentationOptions = {}
  ): Promise<ImageValidationResult> {
    const {
      checkImages = false,
      checkResolution = false,
      minResolution = DEFAULT_MIN_RESOLUTION,
    } = options;
    const errors: string[] = [];
    const warnings: string[] = [];

    const imageRefs = this.extractImageReferences(slides);

    for (const imagePath of imageRefs) {
      // Check file exists
      const existsResult = await this.validateImageExists(imagePath);
      errors.push(...existsResult.errors);
      warnings.push(...existsResult.warnings);

      if (existsResult.valid) {
        // Check resolution if requested
        if (checkResolution) {
          const resResult = await this.validateImageResolution(
            imagePath,
            minResolution
          );
          warnings.push(...resResult.warnings);
        }

        // Check permissions if requested
        if (checkImages) {
          const permResult = await this.validateImagePermissions(imagePath);
          errors.push(...permResult.errors);
          warnings.push(...permResult.warnings);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate image permissions from metadata
   */
  private async validateImagePermissions(
    imagePath: string
  ): Promise<ImageValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    const status = await this.metadataLoader.getPermissionStatus(imagePath);

    if (status === null) {
      // No permission info - not an error by default
      return { valid: true, errors, warnings };
    }

    switch (status) {
      case "approved":
        // All good
        break;
      case "pending":
        warnings.push(`Pending permission: ${imagePath}`);
        break;
      case "restricted":
        warnings.push(`Restricted: ${imagePath}`);
        break;
      case "rejected":
        errors.push(`Rejected: ${imagePath}`);
        break;
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Get statistics about images by permission status
   */
  async getImageStats(slides: SlideContent[]): Promise<ImageStats> {
    const imageRefs = this.extractImageReferences(slides);

    const stats: ImageStats = {
      total: imageRefs.length,
      approved: 0,
      pending: 0,
      restricted: 0,
      rejected: 0,
      unknown: 0,
    };

    for (const imagePath of imageRefs) {
      const status = await this.metadataLoader.getPermissionStatus(imagePath);

      if (status === null) {
        stats.unknown++;
      } else {
        switch (status) {
          case "approved":
            stats.approved++;
            break;
          case "pending":
            stats.pending++;
            break;
          case "restricted":
            stats.restricted++;
            break;
          case "rejected":
            stats.rejected++;
            break;
        }
      }
    }

    return stats;
  }

  /**
   * Get list of missing images
   */
  async getMissingImages(slides: SlideContent[]): Promise<string[]> {
    const missing: string[] = [];
    const imageRefs = this.extractImageReferences(slides);

    for (const imagePath of imageRefs) {
      const result = await this.validateImageExists(imagePath);
      if (!result.valid) {
        missing.push(imagePath);
      }
    }

    return missing;
  }
}
